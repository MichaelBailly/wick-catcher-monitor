export type BinanceOrderFill = {
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  tradeId: number;
};

export function isBinanceOrderFill(obj: unknown): obj is BinanceOrderFill {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof (obj as BinanceOrderFill).price === 'string' &&
    typeof (obj as BinanceOrderFill).qty === 'string' &&
    typeof (obj as BinanceOrderFill).commission === 'string' &&
    typeof (obj as BinanceOrderFill).commissionAsset === 'string' &&
    typeof (obj as BinanceOrderFill).tradeId === 'number'
  );
}
