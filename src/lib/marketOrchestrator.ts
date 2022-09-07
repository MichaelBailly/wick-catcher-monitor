import { format } from 'date-fns';
import debug from 'debug';
import { writeFile } from 'fs/promises';
import { RECORDER_FILE_PATH } from '../config';
import { BuyTradeInfo } from '../types/BuyTradeInfo';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';
import { MarketFlashWickRecorder } from './marketFlashWickRecorder';
import { MarketMemoryCollection } from './marketMemoryCollection';
import { Pnl } from './pnl';
import { TradeDriver } from './tradeDriver';

const ALIVE_TTL = 30 * 60 * 1000;

export class MarketOrchestrator {
  collections: MarketMemoryCollection[];
  aliveCount: number;
  aliveTimestamp: number;
  recorders: Map<MarketMemoryCollection, Map<string, MarketFlashWickRecorder>> =
    new Map();
  tradeDrivers: Map<string, Set<TradeDriver>> = new Map();
  log: debug.Debugger;
  pnl: Pnl;
  constructor(private marketMemoryCollections: MarketMemoryCollection[]) {
    this.collections = marketMemoryCollections;
    this.log = debug('marketOrchestrator');
    this.aliveCount = 0;
    this.aliveTimestamp = Date.now() + ALIVE_TTL;
    this.pnl = new Pnl();
  }

  onKline(pair: string, msg: IKline) {
    this.tradeDriverHook(pair, msg);
    this.marketMemoryHook(pair, msg);
    this.marketRecorderHook(pair, msg);
    this.aliveHook();
  }

  marketMemoryHook(pair: string, msg: IKline) {
    for (const collection of this.collections) {
      const marketMemories = collection.get(pair);
      for (const marketWatcher of marketMemories) {
        marketWatcher.onKlineMessage(msg);
        if (marketWatcher.detectFlashWick()) {
          this.log('%o flash wick detected on %s', new Date(), pair);
          this.onFlashWick(collection, marketWatcher, pair, msg);
        }
      }
    }
  }

  marketRecorderHook(pair: string, msg: IKline) {
    for (const [_, recorders] of this.recorders) {
      const recorder = recorders.get(pair);
      if (recorder) {
        recorder.onKlineMessage(msg);
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
      this.log('Still alive, %d messages processed', this.aliveCount);
      this.aliveTimestamp = Date.now() + ALIVE_TTL;
      this.aliveCount = 0;
      this.log(this.pnl.getSummary());
      console.log(this.pnl.getSummary());
      this.log('------------------------------------------------------');
    }
  }

  recordTradeSummary(trade: TradeDriver, amount: number, price: number) {
    const filename = `${RECORDER_FILE_PATH}/trade-${trade.confLine}-${format(
      new Date(),
      'yyyyMMddHHmm'
    )}.csv`;
    const data = {
      ...trade.buyTradeinfo,
      soldAmount: amount,
      soldPrice: price,
    };
    writeFile(filename, JSON.stringify(data));
  }

  onFlashWick(
    collection: MarketMemoryCollection,
    marketWatcher: MarketWatcher,
    pair: string,
    msg: IKline
  ) {
    let collectionRecorders = this.recorders.get(collection);
    if (!collectionRecorders) {
      collectionRecorders = new Map<string, MarketFlashWickRecorder>();
      this.recorders.set(collection, collectionRecorders);
    }
    const recorder = collectionRecorders.get(pair);
    if (!recorder) {
      this.onNewFlashWick(collectionRecorders, marketWatcher, pair, msg);
    }
  }

  onNewFlashWick(
    collectionRecorders: Map<string, MarketFlashWickRecorder>,
    marketWatcher: MarketWatcher,
    pair: string,
    msg: IKline
  ) {
    collectionRecorders.set(
      pair,
      new MarketFlashWickRecorder(
        marketWatcher,
        () => {
          collectionRecorders?.delete(pair);
        },
        { filePath: RECORDER_FILE_PATH }
      )
    );

    const tradeDriver = new TradeDriver(
      marketWatcher,
      (trade: BuyTradeInfo, amount: number, price: number) => {
        const tradeDrivers = this.tradeDrivers.get(pair);
        if (tradeDrivers) {
          tradeDrivers.delete(tradeDriver);
          this.recordTradeSummary(tradeDriver, amount, price);
        }
        this.pnl.onEndOfTrade(tradeDriver, trade, amount, price);
      },
      {
        stopInhibitDelay: 1000 * 60 * 15,
        sellAfter: 1000 * 60 * 60,
      }
    );
    tradeDriver.start();

    let set = this.tradeDrivers.get(pair);
    if (!set) {
      set = new Set<TradeDriver>();
      this.tradeDrivers.set(pair, set);
    }
    set.add(tradeDriver);
  }
}
