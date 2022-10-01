import { TradeInfo } from './TradeInfo';

export type TradeResult = TradeInfo & {
  pair: string;
  soldAmount: number;
  soldPrice: number;
};
