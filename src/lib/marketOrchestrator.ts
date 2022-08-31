import { RECORDER_FILE_PATH } from '../config';
import { IKline } from '../types/IKline';
import { MarketFlashWickRecorder } from './marketFlashWickRecorder';
import { MarketMemoryCollection } from './marketMemory';

const ALIVE_TTL = 30 * 60 * 1000;

export class MarketOrchestrator {
  collection: MarketMemoryCollection;
  aliveCount: number;
  aliveTimestamp: number;
  recorders: Map<string, MarketFlashWickRecorder> = new Map();
  constructor(private marketMemoryCollection: MarketMemoryCollection) {
    this.collection = marketMemoryCollection;
    this.aliveCount = 0;
    this.aliveTimestamp = Date.now() + ALIVE_TTL;
  }

  onKline(pair: string, msg: IKline) {
    this.marketMemoryHook(pair, msg);
    this.marketRecorderHook(pair, msg);
    this.aliveHook();
  }

  marketMemoryHook(pair: string, msg: IKline) {
    const marketMemory = this.collection.get(pair);
    marketMemory.onKlineMessage(msg);
    if (marketMemory.detectFlashWick()) {
      console.log('Flash wick detected on ', marketMemory.pair, new Date());
      const recorder = this.recorders.get(pair);
      if (!recorder) {
        this.recorders.set(
          pair,
          new MarketFlashWickRecorder(
            marketMemory,
            () => {
              this.recorders.delete(pair);
            },
            { filePath: RECORDER_FILE_PATH }
          )
        );
      }
    }
  }

  marketRecorderHook(pair: string, msg: IKline) {
    const recorder = this.recorders.get(pair);
    if (recorder) {
      recorder.onKlineMessage(msg);
    }
  }

  aliveHook() {
    this.aliveCount++;
    if (Date.now() > this.aliveTimestamp) {
      console.log('Still alive,', this.aliveCount, 'messages processed');
      this.aliveTimestamp = Date.now() + ALIVE_TTL;
      this.aliveCount = 0;
    }
  }
}
