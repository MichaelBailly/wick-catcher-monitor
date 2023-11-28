import { FixedPriceMarketWatcherOpts } from './FixedPriceMarketWatcherOpts';
import { PriceMarketWatcherOpts } from './PriceMarketWatcherOpts';
import { TradeDriverOpts } from './TradeDriverOpts';
import { VolumeMarketWatcherOpts } from './VolumeMarketWatcherOpts';

export type MarketProfile = {
  type: string;
  opts:
    | PriceMarketWatcherOpts
    | VolumeMarketWatcherOpts
    | FixedPriceMarketWatcherOpts;
  tradeDriverOpts: TradeDriverOpts;
};
