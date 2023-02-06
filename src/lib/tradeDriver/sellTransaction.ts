import { format } from 'date-fns';
import debug from 'debug';
import { writeFile } from 'fs/promises';
import { RECORDER_FILE_PATH } from '../../config';

import { sell as binanceSell } from '../../exchanges/binance';
import { BinanceTransactionError } from '../../types/BinanceTransactionError';
import { TradeDriver } from '../tradeDriver';
import { onTransactionError, recordBinanceTransactionResponse } from './shared';

const log = debug('lib:tradeDriver:sellTransaction');
const MAX_SELL_ATTEMPTS = 3;

export async function sell(driver: TradeDriver) {
  let attempts = 0;
  let lastError;
  while (attempts < MAX_SELL_ATTEMPTS) {
    try {
      return await sellTentative(driver);
    } catch (e) {
      log(`Error: %s sell attempt ${attempts} failed: %o`, driver.pair, e);
      lastError = e;
      attempts++;
    }
  }
  throw new Error(`Failed to sell after ${attempts} attempts`);
}

export async function sellTentative(driver: TradeDriver) {
  if (!driver.binanceBuyTransaction) {
    throw new Error('No buy transaction found');
  }

  const amount = driver.binanceBuyTransaction.executedQty;

  recordTransactionArgs(driver.pair, driver.binanceBuyTransaction.executedQty);

  let response;
  try {
    response = await binanceSell(driver.pair, amount);
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

  // number of token sold
  const amountSold = parseFloat(response.executedQty);
  // price of token sold
  const priceTotal = response.fills.reduce((acc, fill) => {
    return acc + parseFloat(fill.price) * parseFloat(fill.qty);
  }, 0);
  const price = priceTotal / amountSold;

  return {
    amount: amountSold,
    price,
    response,
    doneTimestamp: Date.now(),
  };
}

export async function recordTransactionArgs(pair: string, qty: string) {
  const filename = `${RECORDER_FILE_PATH}/binance-transaction-args-${format(
    new Date(),
    'yyyyMMddHHmm'
  )}.txt`;
  const fileContents = [`pair: ${pair}`, `executedQty: ${qty}`];
  writeFile(filename, fileContents.join('\n'), 'utf8');
}
