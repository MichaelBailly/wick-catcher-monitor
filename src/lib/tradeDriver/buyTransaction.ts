import debug from 'debug';
import { buy as binanceBuy } from '../../exchanges/binance';
import { isBinanceOrderFill } from '../../types/BinanceOrderFill';
import { BinanceTransactionError } from '../../types/BinanceTransactionError';
import { TradeDriver } from '../tradeDriver';
import { onTransactionError, recordBinanceTransactionResponse } from './shared';

const log = debug('lib:tradeDriverTransaction');
const MAX_SELL_ATTEMPTS = 3;

export async function buy(driver: TradeDriver) {
  const pair = driver.pair;
  const quoteAmount = driver.quoteAmount;

  let response;
  try {
    response = await binanceBuy(pair, quoteAmount);
  } catch (e) {
    if (e instanceof BinanceTransactionError || e instanceof Error) {
      await onTransactionError(e);
    } else {
      console.log('ERROR: unexpected error type');
      console.log(e);
    }
    throw e;
  }

  recordBinanceTransactionResponse(response);

  let executedQuoteAmount = 0;
  let quantity = 0;
  let price = 0;

  response.fills.forEach((fill) => {
    if (isBinanceOrderFill(fill)) {
      executedQuoteAmount += parseFloat(fill.price) * parseFloat(fill.qty);
      quantity += parseFloat(fill.qty);
    }
  });
  price = quantity === 0 ? 0 : executedQuoteAmount / quantity;
  return {
    response,
    executedQuoteAmount,
    price,
    doneTimestamp: Date.now(),
  };
}
