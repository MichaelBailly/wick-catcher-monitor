import { TradeInfo } from './TradeInfo';

export type TradeResult = TradeInfo & {
  pair: string;
  soldTimestamp: number;
  soldAmount: number;
  soldPrice: number;
};
