import { TradeDriver } from '../lib/tradeDriver';
import { TradeDriverTransactionError } from '../lib/tradeDriver/TradeDriverTransactionError';
import { MarketWatcher } from './MarketWatcher';
import { TradeResult } from './TradeResult';

export type TradeEndEvent = {
  marketWatcher: MarketWatcher;
  tradeResult: TradeResult | TradeDriverTransactionError;
  tradeDriver: TradeDriver;
};
