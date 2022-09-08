import { BuyTradeInfo } from './BuyTradeInfo';

export type TradeResult = BuyTradeInfo & {
  pair: string;
  soldAmount: number;
  soldPrice: number;
};
