export type BinanceSymbol = {
  symbol: string;
  status: string;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quotePrecision: number;
  quoteAssetPrecision: number;
  baseCommissionPrecision: number;
  quoteCommissionPrecision: number;
  orderTypes: string[];
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  quoteOrderQtyMarketAllowed: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: {
    filterType: string;
    minPrice: string;
    maxPrice: string;
    tickSize: string;
  }[];
  permissions: string[];
};

export function isBinanceSymbol(obj: unknown): obj is BinanceSymbol {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof (obj as BinanceSymbol).symbol === 'string' &&
    typeof (obj as BinanceSymbol).status === 'string' &&
    typeof (obj as BinanceSymbol).baseAsset === 'string' &&
    typeof (obj as BinanceSymbol).baseAssetPrecision === 'number' &&
    typeof (obj as BinanceSymbol).quoteAsset === 'string' &&
    typeof (obj as BinanceSymbol).quotePrecision === 'number' &&
    typeof (obj as BinanceSymbol).quoteAssetPrecision === 'number' &&
    typeof (obj as BinanceSymbol).baseCommissionPrecision === 'number' &&
    typeof (obj as BinanceSymbol).quoteCommissionPrecision === 'number' &&
    Array.isArray((obj as BinanceSymbol).orderTypes) &&
    typeof (obj as BinanceSymbol).icebergAllowed === 'boolean' &&
    typeof (obj as BinanceSymbol).ocoAllowed === 'boolean' &&
    typeof (obj as BinanceSymbol).quoteOrderQtyMarketAllowed === 'boolean' &&
    typeof (obj as BinanceSymbol).isSpotTradingAllowed === 'boolean' &&
    typeof (obj as BinanceSymbol).isMarginTradingAllowed === 'boolean' &&
    Array.isArray((obj as BinanceSymbol).filters) &&
    Array.isArray((obj as BinanceSymbol).permissions)
  );
}
