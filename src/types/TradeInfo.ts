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
    'id' in object &&
    'amount' in object &&
    'quoteAmount' in object &&
    'price' in object &&
    'buyTimestamp' in object &&
    'boughtTimestamp' in object &&
    'sellTimestamp' in object &&
    'low' in object
  );
}
