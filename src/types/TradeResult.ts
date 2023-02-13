import { BinanceOrderResponse } from './BinanceOrderResponse';
import { SimulationResponse } from './SimulationResponse';
import { isTradeInfo, TradeInfo } from './TradeInfo';

export type TradeResult = TradeInfo & {
  pair: string;
  soldTimestamp: number;
  soldAmount: number;
  soldPrice: number;
  sellStrategy?: string;
  details?: {
    simulation: SimulationResponse;
    buyTransaction: BinanceOrderResponse;
    sellTransaction: BinanceOrderResponse;
  };
};

export function isTradeResult(object: unknown): object is TradeResult {
  return (
    typeof object === 'object' &&
    object !== null &&
    isTradeInfo(object as TradeInfo) &&
    'pair' in object &&
    'soldTimestamp' in object &&
    'soldAmount' in object &&
    'soldPrice' in object &&
    'buyTimestamp' in object &&
    'buyAmount' in object &&
    'buyPrice' in object
  );
}
