export type TradeDriverOpts = {
  quoteAmount?: number;
  stopLossRatio?: number;
  stopInhibitDelay?: number;
  trailingLimitRatio?: number;
  sellAfter?: number;
  sellDirect?: boolean;
};