import { BinanceSymbol, isBinanceSymbol } from './BinanceSymbol';

export type BinanceExchangeResponse = {
  timezone: string;
  serverTime: number;
  rateLimits: {
    rateLimitType: string;
    interval: string;
    intervalNum: number;
    limit: number;
  }[];
  exchangeFilters: unknown[];
  symbols: BinanceSymbol[];
};

export function isBinanceExchangeResponse(
  obj: unknown
): obj is BinanceExchangeResponse {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof (obj as BinanceExchangeResponse).timezone === 'string' &&
    typeof (obj as BinanceExchangeResponse).serverTime === 'number' &&
    Array.isArray((obj as BinanceExchangeResponse).rateLimits) &&
    Array.isArray((obj as BinanceExchangeResponse).symbols) &&
    (obj as BinanceExchangeResponse).symbols.every(isBinanceSymbol)
  );
}
