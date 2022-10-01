import { BinanceOrderFill, isBinanceOrderFill } from './BinanceOrderFill';

export type BinanceOrderResponse = {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  fills: BinanceOrderFill[];
};

export function isBinanceOrderResponse(
  obj: unknown
): obj is BinanceOrderResponse {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof (obj as BinanceOrderResponse).symbol === 'string' &&
    typeof (obj as BinanceOrderResponse).orderId === 'number' &&
    typeof (obj as BinanceOrderResponse).orderListId === 'number' &&
    typeof (obj as BinanceOrderResponse).clientOrderId === 'string' &&
    typeof (obj as BinanceOrderResponse).transactTime === 'number' &&
    typeof (obj as BinanceOrderResponse).price === 'string' &&
    typeof (obj as BinanceOrderResponse).origQty === 'string' &&
    typeof (obj as BinanceOrderResponse).executedQty === 'string' &&
    typeof (obj as BinanceOrderResponse).cummulativeQuoteQty === 'string' &&
    typeof (obj as BinanceOrderResponse).status === 'string' &&
    typeof (obj as BinanceOrderResponse).timeInForce === 'string' &&
    typeof (obj as BinanceOrderResponse).type === 'string' &&
    typeof (obj as BinanceOrderResponse).side === 'string' &&
    Array.isArray((obj as BinanceOrderResponse).fills) &&
    (obj as BinanceOrderResponse).fills.every(isBinanceOrderFill)
  );
}
