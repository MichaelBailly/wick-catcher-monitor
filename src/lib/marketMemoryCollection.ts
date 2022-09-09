import { MarketWatcher } from '../types/MarketWatcher';
import { PriceMarketWatcherOpts } from '../types/PriceMarketWatcherOpts';
import { VolumeMarketWatcherOpts } from '../types/VolumeMarketWatcherOpts';
import { PriceMarketWatcher } from './marketWatchers/priceMarketWatcher';
import { VolumeMarketWatcher } from './marketWatchers/volumeMarketWatcher';

type MarketWatcherType = {
  type: string;
  opts: PriceMarketWatcherOpts | VolumeMarketWatcherOpts;
};

export class MarketMemoryCollection {
  private marketWatcherTypes: Set<MarketWatcherType> = new Set();
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
      const watchers = [];
      watchers.push(
        new PriceMarketWatcher(pair, { ...this.priceMarketWatcherOpts })
      );
      watchers.push(
        new VolumeMarketWatcher(pair, { ...this.volumeMarketWatcherOpts })
      );

      for (const marketWatcherType of this.marketWatcherTypes) {
        if (marketWatcherType.type === 'price') {
          watchers.push(
            new PriceMarketWatcher(pair, { ...marketWatcherType.opts })
          );
        } else if (marketWatcherType.type === 'volume') {
          watchers.push(
            new VolumeMarketWatcher(pair, { ...marketWatcherType.opts })
          );
        }
      }
      this.marketWatchers.set(pair, watchers);
    }
    const marketMemory = this.marketWatchers.get(pair);
    // to satisfy TS...
    if (marketMemory === undefined) {
      throw new Error('MarketMemoryCollection.get() returned undefined');
    }
    return marketMemory;
  }

  addPriceMarketWatcher(opts: PriceMarketWatcherOpts) {
    this.marketWatcherTypes.add({
      type: 'price',
      opts: { ...opts },
    });
  }

  addVolumeMarketWatcher(opts: VolumeMarketWatcherOpts) {
    this.marketWatcherTypes.add({
      type: 'volume',
      opts: { ...opts },
    });
  }
}
