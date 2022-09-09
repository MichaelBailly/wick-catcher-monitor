import { MarketWatcher } from '../types/MarketWatcher';
import { PriceMarketWatcher } from './marketWatchers/priceMarketWatcher';
import { VolumeMarketWatcher } from './marketWatchers/volumeMarketWatcher';

export class MarketMemoryCollection {
  private marketWatchers: Map<string, MarketWatcher[]> = new Map();
  private priceMarketWatcherOpts = {
    flashWickRatio: 1.1,
    realtimeDetection: false,
    historySize: 5,
  };
  private volumeMarketWatcherOpts = {
    historySize: 45,
    volumeThreasoldRatio: 40,
  };

  constructor(opts?: {
    flashWickRatio?: number;
    realtimeDetection?: boolean;
    historySize?: number;
    volumeHistorySize?: number;
    volumeThreasoldRatio?: number;
  }) {
    if (opts?.flashWickRatio) {
      this.priceMarketWatcherOpts.flashWickRatio = opts.flashWickRatio;
    }
    if (opts?.realtimeDetection) {
      this.priceMarketWatcherOpts.realtimeDetection = opts.realtimeDetection;
    }
    if (opts?.historySize) {
      this.priceMarketWatcherOpts.historySize = opts.historySize;
    }

    if (opts?.volumeHistorySize) {
      this.volumeMarketWatcherOpts.historySize = opts.volumeHistorySize;
    }
    if (opts?.volumeThreasoldRatio) {
      this.volumeMarketWatcherOpts.volumeThreasoldRatio =
        opts.volumeThreasoldRatio;
    }
  }

  get(pair: string): MarketWatcher[] {
    if (!this.marketWatchers.has(pair)) {
      this.marketWatchers.set(pair, [
        new PriceMarketWatcher(pair, { ...this.priceMarketWatcherOpts }),
        new VolumeMarketWatcher(pair, { ...this.volumeMarketWatcherOpts }),
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
