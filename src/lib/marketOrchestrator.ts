import debug from 'debug';
import { readFile, stat, unlink } from 'fs/promises';
import { MAX_CONCURRENT_TRADES, USE_ADAPTATIVE_INVESTMENT } from '../config';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';
import { TradeResult } from '../types/TradeResult';
import { onBtcKline } from './BtcTrendRecorder';
import { events, TRADE_END_EVENT } from './events';
import { getInvestment } from './investment';
import {
  displayAliveInfos,
  recordTradeFailure,
  recordTradeSummary,
} from './marketOrchestrator/displayers';
import { MarketWatcherInhibitor } from './marketOrchestrator/watcherInhibitor';
import { MarketWatcherCollection } from './marketWatcherCollection';
import { Pnl } from './pnl';
import { TradeDriver } from './tradeDriver';
import { TradeDriverSellError } from './tradeDriver/TradeDriverSellError';
import {
  isATradeDriverTransactionError,
  TradeDriverTransactionError,
} from './tradeDriver/TradeDriverTransactionError';

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
  watcherInhibiter = new MarketWatcherInhibitor(1000 * 60 * 60);
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
      if (
        !this.watcherInhibiter.isInhibited(marketWatcher) &&
        marketWatcher.detectFlashWick()
      ) {
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
      displayAliveInfos(this);
      this.aliveTimestamp = Date.now() + ALIVE_TTL;
      this.aliveCount = 0;
    }
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
    if (!this.watcherInhibiter.inhibit(marketWatcher)) {
      return;
    }

    this.launchTrade(marketWatcher, pair, msg);
  }

  launchTrade(marketWatcher: MarketWatcher, pair: string, msg: IKline) {
    const onEndOfTrade = (
      tradeResult: TradeResult | TradeDriverTransactionError
    ) => {
      this.removeFromTradeDriverSet(pair, tradeDriver);
      if (isATradeDriverTransactionError(tradeResult)) {
        this.onTradeFailure(tradeDriver, tradeResult);
      } else {
        recordTradeSummary(tradeDriver, tradeResult);
        this.pnl.onEndOfTrade(tradeDriver, tradeResult);
      }
      this.log('concurrent trades: %d', this.getConcurrentTradesCount());
      events.emit(TRADE_END_EVENT, { tradeDriver, tradeResult, marketWatcher });
    };

    const opts = marketWatcher.getTradeDriverOpts();
    if (USE_ADAPTATIVE_INVESTMENT) {
      opts.quoteAmount = getInvestment(marketWatcher.getConfData());
    }

    const tradeDriver = new TradeDriver(marketWatcher, onEndOfTrade, opts);
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
    if (tradeResult instanceof TradeDriverSellError) {
      this.maxConcurrentTrades -= 1;
      this.log(
        'Sell error: decreased concurrent trades to %d',
        this.maxConcurrentTrades
      );
    }

    recordTradeFailure(tradeDriver, tradeResult);
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
