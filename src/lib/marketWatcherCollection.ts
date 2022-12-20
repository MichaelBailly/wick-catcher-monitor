import { MarketProfile } from '../types/MarketProfile';
import { isMarketWatcher, MarketWatcher } from '../types/MarketWatcher';
import { PriceMarketWatcherOpts } from '../types/PriceMarketWatcherOpts';
import { TradeDriverOpts } from '../types/TradeDriverOpts';
import { VolumeMarketWatcherOpts } from '../types/VolumeMarketWatcherOpts';
import { PriceMarketWatcher } from './marketWatchers/priceMarketWatcher';
import { VolumeMarketWatcher } from './marketWatchers/volumeMarketWatcher';

export class MarketWatcherCollection {
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

  updateWatchers(list: Set<MarketProfile>) {
    this.marketWatcherTypes = list;
    console.log('Updating market watchers,', this.marketWatcherTypes.size);
    const pairMarketWatchers: Map<string, MarketWatcher[]> = new Map();

    const mwtHashes: Map<string, MarketProfile> = new Map();
    for (const type of this.marketWatcherTypes) {
      mwtHashes.set(getHash(type), type);
    }

    for (const [pair, marketWatchers] of this.marketWatchers) {
      const mwHashes: Map<string, MarketWatcher> = new Map();
      for (const marketWatcher of marketWatchers) {
        mwHashes.set(getHash(marketWatcher), marketWatcher);
      }

      const newMarketWatchers: MarketWatcher[] = [];
      //
      for (const [hash, marketWatcher] of mwHashes) {
        if (mwtHashes.has(hash)) {
          newMarketWatchers.push(marketWatcher);
          mwtHashes.delete(hash);
        }
      }
      for (const [hash, type] of mwtHashes) {
        if (type.type === 'price') {
          newMarketWatchers.push(
            new PriceMarketWatcher(
              pair,
              { ...type.opts },
              { ...type.tradeDriverOpts }
            )
          );
        } else if (type.type === 'volume') {
          newMarketWatchers.push(
            new VolumeMarketWatcher(
              pair,
              { ...type.opts },
              { ...type.tradeDriverOpts }
            )
          );
        }
      }
      pairMarketWatchers.set(pair, newMarketWatchers);
    }
    this.marketWatchers = pairMarketWatchers;
  }

  dump() {
    for (const [pair, marketWatchers] of this.marketWatchers) {
      console.log(
        pair,
        marketWatchers.map((mw) => mw.getConfLine())
      );
    }
  }
}

function getHash(market: MarketWatcher | MarketProfile): string {
  if (isMarketWatcher(market)) {
    const type = market instanceof PriceMarketWatcher ? 'price' : 'volume';
    return `${type} ${market.getConfLine()}`;
  } else {
    const followBtcTrend =
      market.opts.followBtcTrend === true
        ? 'true'
        : market.opts.followBtcTrend === false
        ? 'false'
        : market.opts.followBtcTrend;
    const additionalArg =
      market.type === 'price'
        ? (market.opts as PriceMarketWatcherOpts).flashWickRatio
        : (market.opts as VolumeMarketWatcherOpts).volumeThresholdRatio;

    return `${market.type} ${market.opts.realtimeDetection},${followBtcTrend},${additionalArg},${market.opts.historySize},${market.tradeDriverOpts.priceRatio},${market.tradeDriverOpts.stopLossRatio},${market.tradeDriverOpts.dynamicStopLoss},${market.tradeDriverOpts.dynamicStopLossRatio}`;
  }
}
