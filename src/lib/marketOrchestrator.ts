import { format, sub } from 'date-fns';
import debug from 'debug';
import { writeFile } from 'fs/promises';
import { RECORDER_FILE_PATH, XX_FOLLOW_BTC_TREND } from '../config';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';
import { TradeDriverOpts } from '../types/TradeDriverOpts';
import { TradeResult } from '../types/TradeResult';
import { BtcTrendRecorder } from './BtcTrendRecorder';
import { MarketMemoryCollection } from './marketMemoryCollection';
import { Pnl } from './pnl';
import { TradeDriver } from './tradeDriver';

const ALIVE_TTL = 30 * 60 * 1000;

export class MarketOrchestrator {
  aliveCount: number = 0;
  aliveTimestamp: number = Date.now() + ALIVE_TTL;
  tradeDrivers: Map<string, Set<TradeDriver>> = new Map();
  log: debug.Debugger = debug('marketOrchestrator');
  pnl: Pnl = new Pnl();
  collection: MarketMemoryCollection;
  watcherInhibiter: Set<string> = new Set();
  tradeOpts: TradeDriverOpts;
  btcTrendRecorder = new BtcTrendRecorder();

  constructor(
    private marketMemoryCollection: MarketMemoryCollection,
    tradeOpts: TradeDriverOpts = {}
  ) {
    this.collection = marketMemoryCollection;
    this.tradeOpts = tradeOpts;
  }

  onKline(pair: string, msg: IKline) {
    if (XX_FOLLOW_BTC_TREND && pair === 'BTCUSDT') {
      this.btcTrendRecorder.onKline(msg);
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
          this.log(
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
      const hour = format(new Date(), 'H');
      this.log(
        '%so - Still alive, %d messages processed',
        new Date(),
        this.aliveCount
      );
      this.log('%d concurrent trades', this.getConcurrentTradesCount());
      let summaryString = '';
      if (hour === '0') {
        summaryString = this.pnl.getFullSummary();
        this.recordDailySummary(summaryString);
      } else {
        summaryString = this.pnl.getSummary();
      }
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
    )}.csv`;
    const data = {
      ...tradeResult,
    };
    writeFile(filename, JSON.stringify(data));
  }

  recordDailySummary(summary: string) {
    const filename = `${RECORDER_FILE_PATH}/summary.txt`;
    writeFile(filename, summary);

    const yesterday = format(sub(new Date(), { days: 1 }), 'yyyy-MM-dd');

    const filename2 = `${RECORDER_FILE_PATH}/summary-${yesterday}.json`;
    const body = {
      date: yesterday,
      summary: this.pnl.getDailySummary(yesterday),
    };
    writeFile(filename2, JSON.stringify(body));
  }

  onFlashWick(marketWatcher: MarketWatcher, pair: string, msg: IKline) {
    if (!this.watcherInhibiter.has(marketWatcher.getConfLine())) {
      this.watcherInhibiter.add(marketWatcher.getConfLine());
      setTimeout(() => {
        this.watcherInhibiter.delete(marketWatcher.getConfLine());
      }, 1000 * 60 * 60);
      this.onNewFlashWick(marketWatcher, pair, msg);
    }
  }

  onNewFlashWick(marketWatcher: MarketWatcher, pair: string, msg: IKline) {
    if (XX_FOLLOW_BTC_TREND && !this.btcTrendRecorder.trendOk) {
      this.log('%o - BTC trend not ok', new Date());
      return;
    }
    const tradeDriver = new TradeDriver(
      marketWatcher,
      (tradeResult: TradeResult) => {
        const tradeDrivers = this.tradeDrivers.get(pair);
        if (tradeDrivers) {
          tradeDrivers.delete(tradeDriver);
          this.recordTradeSummary(tradeDriver, tradeResult);
        }
        this.pnl.onEndOfTrade(tradeDriver, tradeResult);
        this.log('concurrent trades: %d', this.getConcurrentTradesCount());
      },
      this.tradeOpts
    );
    tradeDriver.start();

    let set = this.tradeDrivers.get(pair);
    if (!set) {
      set = new Set<TradeDriver>();
      this.tradeDrivers.set(pair, set);
    }
    set.add(tradeDriver);

    this.log('concurrent trades: %d', this.getConcurrentTradesCount());
  }

  getConcurrentTradesCount() {
    let count = 0;
    for (const [_, tradeDrivers] of this.tradeDrivers) {
      count += tradeDrivers.size;
    }
    return count;
  }
}
