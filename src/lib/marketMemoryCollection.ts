import { MarketWatcher } from '../types/MarketWatcher';
import { PriceMarketWatcher } from './marketWatchers/priceMarketWatcher';
import { VolumeMarketWatcher } from './marketWatchers/volumeMarketWatcher';

export class MarketMemoryCollection {
  private marketWatchers: Map<string, MarketWatcher[]> = new Map();
  private marketMemoryOpts = {
    flashWickRatio: 1.1,
    historySize: 5,
  };
  private volumeWatcherMemoryOpts = {
    historySize: 45,
    volumeThreasoldRatio: 40,
  };

  constructor(opts?: {
    flashWickRatio?: number;
    historySize?: number;
    volumeHistorySize?: number;
    volumeThreasoldRatio?: number;
  }) {
    if (opts?.flashWickRatio) {
      this.marketMemoryOpts.flashWickRatio = opts.flashWickRatio;
    }
    if (opts?.historySize) {
      this.marketMemoryOpts.historySize = opts.historySize;
    }

    if (opts?.volumeHistorySize) {
      this.volumeWatcherMemoryOpts.historySize = opts.volumeHistorySize;
    }
    if (opts?.volumeThreasoldRatio) {
      this.volumeWatcherMemoryOpts.volumeThreasoldRatio =
        opts.volumeThreasoldRatio;
    }
  }

  get(pair: string): MarketWatcher[] {
    if (!this.marketWatchers.has(pair)) {
      this.marketWatchers.set(pair, [
        new PriceMarketWatcher(pair, { ...this.marketMemoryOpts }),
        new VolumeMarketWatcher(pair, { ...this.volumeWatcherMemoryOpts }),
      ]);
    }
    const marketMemory = this.marketWatchers.get(pair);
    // to satisfy TS...
    if (marketMemory === undefined) {
      throw new Error('MarketMemoryCollection.get() returned undefined');
    }
    return marketMemory;
  }
}
