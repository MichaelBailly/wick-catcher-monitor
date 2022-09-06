import { format } from 'date-fns';
import debug from 'debug';
import { writeFile } from 'fs/promises';
import { RECORDER_FILE_PATH } from '../config';
import { BuyTradeInfo } from '../types/BuyTradeInfo';
import { IKline } from '../types/IKline';
import { MarketFlashWickRecorder } from './marketFlashWickRecorder';
import { MarketMemoryCollection } from './marketMemoryCollection';
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
  constructor(private marketMemoryCollections: MarketMemoryCollection[]) {
    this.collections = marketMemoryCollections;
    this.log = debug('marketOrchestrator');
    this.aliveCount = 0;
    this.aliveTimestamp = Date.now() + ALIVE_TTL;
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
      for (const marketMemory of marketMemories) {
        marketMemory.onKlineMessage(msg);
        if (marketMemory.detectFlashWick()) {
          this.log('%o flash wick detected on %s', new Date(), pair);
          let collectionRecorders = this.recorders.get(collection);
          if (!collectionRecorders) {
            collectionRecorders = new Map<string, MarketFlashWickRecorder>();
            this.recorders.set(collection, collectionRecorders);
          }
          const recorder = collectionRecorders.get(pair);
          if (!recorder) {
            collectionRecorders.set(
              pair,
              new MarketFlashWickRecorder(
                marketMemory,
                () => {
                  collectionRecorders?.delete(pair);
                },
                { filePath: RECORDER_FILE_PATH }
              )
            );

            const tradeDriver = new TradeDriver(
              marketMemory,
              (trade: BuyTradeInfo, amount: number, price: number) => {
                const tradeDrivers = this.tradeDrivers.get(pair);
                if (tradeDrivers) {
                  tradeDrivers.delete(tradeDriver);
                  this.recordTradeSummary(tradeDriver, amount, price);
                }
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
}
