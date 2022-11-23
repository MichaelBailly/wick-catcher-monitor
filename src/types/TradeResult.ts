import { BinanceOrderResponse } from './BinanceOrderResponse';
import { SimulationResponse } from './SimulationResponse';
import { TradeInfo } from './TradeInfo';

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
