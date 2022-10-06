import { format } from 'date-fns';
import debug from 'debug';
import { stat, writeFile } from 'fs/promises';
import { MAX_CONCURRENT_TRADES, RECORDER_FILE_PATH } from '../config';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';
import { TradeResult } from '../types/TradeResult';
import { onBtcKline } from './BtcTrendRecorder';
import { MarketMemoryCollection } from './marketMemoryCollection';
import { Pnl } from './pnl';
import { TradeDriver } from './tradeDriver';
import { getVolumeFamily } from './volume/volumeReference';

const PREVENT_TRADE_FILE = 'prevent_trade';
const ALIVE_TTL = 30 * 60 * 1000;

export class MarketOrchestrator {
  aliveCount: number = 0;
  aliveTimestamp: number = Date.now() + ALIVE_TTL;
  tradeDrivers: Map<string, Set<TradeDriver>> = new Map();
  log: debug.Debugger = debug('marketOrchestrator');
  debug: debug.Debugger = debug('marketOrchestrator:debug');
  pnl: Pnl = new Pnl();
  collection: MarketMemoryCollection;
  watcherInhibiter: Set<string> = new Set();
  tradePreventIntervalId: NodeJS.Timeout | null = null;
  tradePrevented: boolean = false;
  maxConcurrentTrades: number = MAX_CONCURRENT_TRADES;

  constructor(private marketMemoryCollection: MarketMemoryCollection) {
    this.collection = marketMemoryCollection;
  }

  onKline(pair: string, msg: IKline) {
    if (pair === 'BTCUSDT') {
      onBtcKline(msg);
      return;
    }
    this.tradeDriverHook(pair, msg);
    this.marketMemoryHook(pair, msg);
    this.aliveHook();
  }

  marketMemoryHook(pair: string, msg: IKline) {
    const marketWatchers = this.collection.get(pair);
    for (const marketWatcher of marketWatchers) {
      marketWatcher.onKlineMessage(msg);
      if (marketWatcher.detectFlashWick()) {
        const trades = this.tradeDrivers.get(pair);
        if (!trades || trades.size === 0) {
          this.debug(
            '%o flash wick detected on %s',
            new Date(),
            marketWatcher.getConfLine()
          );
        }
        this.onFlashWick(marketWatcher, pair, msg);
      }
    }
  }

  tradeDriverHook(pair: string, msg: IKline) {
    const tradeDrivers = this.tradeDrivers.get(pair);
    if (tradeDrivers) {
      for (const tradeDriver of tradeDrivers) {
        tradeDriver.onKlineMessage(msg);
      }
    }
  }

  aliveHook() {
    this.aliveCount++;
    if (Date.now() > this.aliveTimestamp) {
      const summaryString = this.pnl.getSummary();

      this.log(
        '%so - Still alive, %d messages processed',
        new Date(),
        this.aliveCount
      );
      this.log('concurrent trades: %d', this.getConcurrentTradesCount());
      this.log(summaryString);
      this.log('------------------------------------------------------');
      this.aliveTimestamp = Date.now() + ALIVE_TTL;
      this.aliveCount = 0;
    }
  }

  recordTradeSummary(trade: TradeDriver, tradeResult: TradeResult) {
    const filename = `${RECORDER_FILE_PATH}/trade-${trade.confLine}-${format(
      new Date(),
      'yyyyMMddHHmm'
    )}.json`;
    const volumeFamily = getVolumeFamily(tradeResult.pair) || 'unknown';
    const data = {
      ...tradeResult,
      volumeFamily,
      watcher: {
        type: trade.confData.type,
        config: trade.confData.config,
      },
    };
    writeFile(filename, JSON.stringify(data));
  }

  onFlashWick(marketWatcher: MarketWatcher, pair: string, msg: IKline) {
    if (this.tradePrevented) {
      this.debug('%o - Trade prevented', new Date());
      return;
    }
    if (this.getConcurrentTradesCount() >= this.maxConcurrentTrades) {
      this.log('%o - Max concurrent trades reached', new Date());
      return;
    }
    if (!this.setWatcherInhibiter(marketWatcher)) {
      return;
    }

    this.launchTrade(marketWatcher, pair, msg);
  }

  setWatcherInhibiter(marketWatcher: MarketWatcher) {
    const confLine = marketWatcher.getConfLine();
    if (this.watcherInhibiter.has(confLine)) {
      return false;
    }

    this.watcherInhibiter.add(confLine);
    setTimeout(() => {
      this.watcherInhibiter.delete(confLine);
    }, 1000 * 60 * 60);

    return true;
  }

  launchTrade(marketWatcher: MarketWatcher, pair: string, msg: IKline) {
    const onEndOfTrade = (tradeResult: TradeResult) => {
      this.removeFromTradeDriverSet(pair, tradeDriver);
      this.recordTradeSummary(tradeDriver, tradeResult);
      this.pnl.onEndOfTrade(tradeDriver, tradeResult);
      this.log('concurrent trades: %d', this.getConcurrentTradesCount());
    };

    const tradeDriver = new TradeDriver(
      marketWatcher,
      onEndOfTrade,
      marketWatcher.getTradeDriverOpts()
    );
    tradeDriver.start();

    this.addToTradeDriverSet(pair, tradeDriver);
    this.log('concurrent trades: %d', this.getConcurrentTradesCount());
  }

  removeFromTradeDriverSet(pair: string, tradeDriver: TradeDriver) {
    const tradeDrivers = this.tradeDrivers.get(pair);
    if (tradeDrivers) {
      tradeDrivers.delete(tradeDriver);
    }
  }

  addToTradeDriverSet(pair: string, tradeDriver: TradeDriver) {
    let set = this.tradeDrivers.get(pair);
    if (!set) {
      set = new Set<TradeDriver>();
      this.tradeDrivers.set(pair, set);
    }
    set.add(tradeDriver);
  }

  getConcurrentTradesCount() {
    let count = 0;
    for (const [_, tradeDrivers] of this.tradeDrivers) {
      count += tradeDrivers.size;
    }
    return count;
  }

  async checkForTradesPrevented() {
    try {
      await stat(`./${PREVENT_TRADE_FILE}`);
    } catch (e) {
      return false;
    }
    return true;
  }

  enableTradePrevent() {
    if (this.tradePreventIntervalId) {
      clearInterval(this.tradePreventIntervalId);
    }
    this.tradePreventIntervalId = setInterval(async () => {
      this.tradePrevented = await this.checkForTradesPrevented();
    }, 1000 * 60 * 5);
  }
}
