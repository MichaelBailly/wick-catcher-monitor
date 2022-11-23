import { TradeDriverBuyError } from './TradeDriverBuyError';
import { TradeDriverSellError } from './TradeDriverSellError';

export type TradeDriverTransactionError =
  | TradeDriverBuyError
  | TradeDriverSellError;

export function isATradeDriverTransactionError(
  err: unknown
): err is TradeDriverTransactionError {
  return (
    err instanceof TradeDriverBuyError || err instanceof TradeDriverSellError
  );
}
