import { MarketProfile } from '../types/MarketProfile';
import { MarketWatcher } from '../types/MarketWatcher';
import { PriceMarketWatcherOpts } from '../types/PriceMarketWatcherOpts';
import { TradeDriverOpts } from '../types/TradeDriverOpts';
import { VolumeMarketWatcherOpts } from '../types/VolumeMarketWatcherOpts';
import { PriceMarketWatcher } from './marketWatchers/priceMarketWatcher';
import { VolumeMarketWatcher } from './marketWatchers/volumeMarketWatcher';

export class MarketMemoryCollection {
  private marketWatcherTypes: Set<MarketProfile> = new Set();
  private marketWatchers: Map<string, MarketWatcher[]> = new Map();

  get(pair: string): MarketWatcher[] {
    let marketWatchers = this.marketWatchers.get(pair);
    if (!marketWatchers) {
      marketWatchers = [];

      for (const marketWatcherType of this.marketWatcherTypes) {
        if (marketWatcherType.type === 'price') {
          marketWatchers.push(
            new PriceMarketWatcher(
              pair,
              { ...marketWatcherType.opts },
              { ...marketWatcherType.tradeDriverOpts }
            )
          );
        } else if (marketWatcherType.type === 'volume') {
          marketWatchers.push(
            new VolumeMarketWatcher(
              pair,
              { ...marketWatcherType.opts },
              { ...marketWatcherType.tradeDriverOpts }
            )
          );
        }
      }
      this.marketWatchers.set(pair, marketWatchers);
    }

    return marketWatchers;
  }

  addPriceMarketWatcher(
    opts: PriceMarketWatcherOpts,
    tradeDriverOpts: TradeDriverOpts = {}
  ) {
    this.marketWatcherTypes.add({
      type: 'price',
      opts: { ...opts },
      tradeDriverOpts,
    });
  }

  addVolumeMarketWatcher(
    opts: VolumeMarketWatcherOpts,
    tradeDriverOpts: TradeDriverOpts = {}
  ) {
    this.marketWatcherTypes.add({
      type: 'volume',
      opts: { ...opts },
      tradeDriverOpts,
    });
  }
}
