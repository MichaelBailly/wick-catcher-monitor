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

  get(pair: string): MarketWatcher[] {
    if (!this.marketWatchers.has(pair)) {
      const watchers = [];

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
