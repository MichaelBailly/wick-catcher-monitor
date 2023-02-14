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
    isTradeInfo(object) &&
    typeof (object as TradeResult).pair === 'string' &&
    typeof (object as TradeResult).soldTimestamp === 'number' &&
    typeof (object as TradeResult).soldAmount === 'number' &&
    typeof (object as TradeResult).soldPrice === 'number'
  );
}
