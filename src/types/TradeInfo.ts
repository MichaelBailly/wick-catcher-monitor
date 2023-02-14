export type TradeInfo = {
  id: string;
  amount: number;
  quoteAmount: number;
  price: number;
  buyTimestamp: number;
  boughtTimestamp: number;
  sellTimestamp: number;
  low: number;
};

export function isTradeInfo(object: unknown): object is TradeInfo {
  return (
    typeof object === 'object' &&
    object !== null &&
    typeof (object as TradeInfo).id === 'string' &&
    typeof (object as TradeInfo).amount === 'number' &&
    typeof (object as TradeInfo).quoteAmount === 'number' &&
    typeof (object as TradeInfo).price === 'number' &&
    typeof (object as TradeInfo).buyTimestamp === 'number' &&
    typeof (object as TradeInfo).boughtTimestamp === 'number' &&
    typeof (object as TradeInfo).sellTimestamp === 'number' &&
    typeof (object as TradeInfo).low === 'number'
  );
}
