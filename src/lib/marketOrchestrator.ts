import { format } from 'date-fns';
import debug from 'debug';
import { readFile, stat, unlink, writeFile } from 'fs/promises';
import { MAX_CONCURRENT_TRADES, RECORDER_FILE_PATH } from '../config';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';
import { TradeResult } from '../types/TradeResult';
import { onBtcKline } from './BtcTrendRecorder';
import { MarketWatcherCollection } from './marketWatcherCollection';
import {
  sendBuyFailureNotification,
  sendSellFailureNotification,
  sendTradeResultNotification,
} from './notifications/freeSmsApi';
import { Pnl } from './pnl';
import { TradeDriver } from './tradeDriver';
import { TradeDriverSellError } from './tradeDriver/TradeDriverSellError';
import {
  isATradeDriverTransactionError,
  TradeDriverTransactionError,
} from './tradeDriver/TradeDriverTransactionError';
import { getVolumeFamily } from './volume/volumeReference';

const PREVENT_TRADE_FILE = 'prevent_trade';
const MAX_CONCURRENT_TRADES_FILE = 'max_concurrent_trades';
const ALIVE_TTL = 30 * 60 * 1000;

export class MarketOrchestrator {
  aliveCount: number = 0;
  aliveTimestamp: number = Date.now() + ALIVE_TTL;
  tradeDrivers: Map<string, Set<TradeDriver>> = new Map();
  log: debug.Debugger = debug('marketOrchestrator');
  debug: debug.Debugger = debug('marketOrchestrator:debug');
  pnl: Pnl = new Pnl();
  collection: MarketWatcherCollection;
  watcherInhibiter: Set<string> = new Set();
  tradePreventIntervalId: NodeJS.Timeout | null = null;
  tradePrevented: boolean = false;
  maxConcurrentTrades: number = MAX_CONCURRENT_TRADES;
  maxConcurrentTradesIntervalId: NodeJS.Timeout | null = null;

  constructor(private marketWatcherCollection: MarketWatcherCollection) {
    this.collection = marketWatcherCollection;
  }

  onKline(pair: string, msg: IKline) {
    if (pair === 'BTCUSDT') {
      onBtcKline(msg);
      return;
    }
    this.tradeDriverHook(pair, msg);
    this.marketWatcherHook(pair, msg);
    this.aliveHook();
  }

  marketWatcherHook(pair: string, msg: IKline) {
    const marketWatchers = this.collection.get(pair);
    for (const marketWatcher of marketWatchers) {
      marketWatcher.onKlineMessage(msg);
      if (marketWatcher.detectFlashWick()) {
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
      this.log(
        '%d max concurrent trades, concurrent trades: %d',
        this.maxConcurrentTrades,
        this.getConcurrentTradesCount()
      );
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
    const confLine = `${marketWatcher.pair}/${marketWatcher.getConfLine()}`;
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
    const onEndOfTrade = (
      tradeResult: TradeResult | TradeDriverTransactionError
    ) => {
      this.removeFromTradeDriverSet(pair, tradeDriver);
      if (isATradeDriverTransactionError(tradeResult)) {
        this.onTradeFailure(tradeDriver, tradeResult);
      } else {
        this.recordTradeSummary(tradeDriver, tradeResult);
        this.pnl.onEndOfTrade(tradeDriver, tradeResult);
        sendTradeResultNotification(tradeResult);
      }
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

  onTradeFailure(
    tradeDriver: TradeDriver,
    tradeResult: TradeDriverTransactionError
  ) {
    this.log(
      'Trade failure: %s - %s',
      tradeResult.parent.message,
      tradeResult.message
    );
    let transactionType = 'Buy';
    if (tradeResult instanceof TradeDriverSellError) {
      transactionType = 'Sell';
      this.maxConcurrentTrades -= 1;
      this.log(
        'Sell error: decreased concurrent trades to %d',
        this.maxConcurrentTrades
      );
    }
    const errorFilename = `${RECORDER_FILE_PATH}/trade-transaction-${format(
      new Date(),
      'yyyyMMddHHmm'
    )}.err`;

    const message = [
      `Trade failure: ${tradeResult.message}`,
      `Pair: ${tradeDriver.pair}`,
      `Watcher: ${tradeDriver.confLine}`,
    ];
    writeFile(errorFilename, message.join('\n'));

    if (transactionType === 'Buy') {
      sendBuyFailureNotification(tradeDriver, tradeResult);
    } else {
      sendSellFailureNotification(tradeDriver, tradeResult);
    }
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

  async checkMaxConcurrentTradesFile() {
    const file = `./${MAX_CONCURRENT_TRADES_FILE}`;
    try {
      await stat(file);
    } catch (e) {
      return;
    }

    const content = await readFile(file, 'utf8');
    const maxConcurrentTrades = parseInt(content.trim(), 10);
    if (maxConcurrentTrades && !isNaN(maxConcurrentTrades)) {
      this.maxConcurrentTrades = maxConcurrentTrades;
      this.log(
        'Max concurrent trades set from file: %d',
        this.maxConcurrentTrades
      );
      try {
        await unlink(file);
      } catch (e) {
        this.log('Failed to delete %s', file);
      }
    }
  }

  enableMaxConcurrentTradesFileChecker() {
    if (this.maxConcurrentTradesIntervalId) {
      clearInterval(this.maxConcurrentTradesIntervalId);
    }
    this.maxConcurrentTradesIntervalId = setInterval(
      () => this.checkMaxConcurrentTradesFile(),
      1000 * 60 * 5
    );
  }
}
