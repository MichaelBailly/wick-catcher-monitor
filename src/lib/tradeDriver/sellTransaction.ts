import { format } from 'date-fns';
import debug from 'debug';
import { writeFile } from 'fs/promises';
import { RECORDER_FILE_PATH } from '../../config';

import { getSymbol, sell as binanceSell } from '../../exchanges/binance';
import { BinanceTransactionError } from '../../types/BinanceTransactionError';
import { TradeDriver } from '../tradeDriver';
import { onTransactionError, recordBinanceTransactionResponse } from './shared';

const log = debug('lib:tradeDriver:sellTransaction');
const MAX_SELL_ATTEMPTS = 3;

export async function sell(driver: TradeDriver) {
  let attempts = 1;
  let lastError;
  while (attempts <= MAX_SELL_ATTEMPTS) {
    try {
      return await sellTentative(driver);
    } catch (e) {
      log(`Error: %s sell attempt ${attempts} failed: %o`, driver.pair, e);
      lastError = e;
      attempts++;
    }
  }
  if (lastError instanceof BinanceTransactionError && lastError.body) {
    let errorBody;
    try {
      errorBody = JSON.parse(lastError.body);
    } catch (e) {
      log('Failed to JSON.parse Binance error');
    }
    if (errorBody?.code === -1013) {
      log('-1013 LOT_SIZE error detected. Trying "decrease by one" strategy');
      if (!driver.binanceBuyTransaction) {
        throw new Error('No buy transaction found');
      }
      const newAmount = decreaseByOne(
        driver.binanceBuyTransaction?.executedQty
      );
      log('forced amount: %d', newAmount);
      try {
        return await sellTentative(driver, newAmount);
      } catch (e) {
        log(`Error: %s sell attempt failed: %o`, driver.pair, e);
        lastError = e;
      }
    }
  }

  throw new Error(`Failed to sell after ${MAX_SELL_ATTEMPTS} attempts`);
}

export async function sellTentative(
  driver: TradeDriver,
  forcedAmount: number | undefined = undefined
) {
  if (!driver.binanceBuyTransaction) {
    throw new Error('No buy transaction found');
  }

  const amount =
    forcedAmount !== undefined
      ? forcedAmount
      : getSellAmount(
          parseFloat(driver.binanceBuyTransaction.executedQty),
          driver.pair
        );

  recordTransactionArgs(
    driver.pair,
    driver.binanceBuyTransaction.executedQty,
    forcedAmount !== undefined
      ? forcedAmount
      : parseFloat(driver.binanceBuyTransaction.executedQty),
    amount
  );

  let response;
  try {
    response = await binanceSell(driver.pair, amount);
  } catch (e) {
    if (e instanceof BinanceTransactionError || e instanceof Error) {
      onTransactionError(e);
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

function getSellAmount(qty: number, pair: string) {
  const symbol = getSymbol(pair);
  const power = symbol?.baseAssetPrecision || 8;
  const factor = 10 ** power;
  return Math.floor(qty * factor) / factor;
}

export async function recordTransactionArgs(
  pair: string,
  qty: string,
  executedQty: number,
  amount: number
) {
  const filename = `${RECORDER_FILE_PATH}/binance-transaction-args-${format(
    new Date(),
    'yyyyMMddHHmm'
  )}.txt`;
  const fileContents = [
    `pair: ${pair}`,
    `executedQty: ${qty}`,
    `executedQty (float): ${executedQty}`,
    `amount: ${amount}`,
  ];
  writeFile(filename, fileContents.join('\n'), 'utf8');
}

function decreaseByOne(amount: string) {
  if (amount.indexOf('.') >= 0) {
    let newAmount = amount;
    const lastZeroIndex = amount.lastIndexOf('0');
    if (lastZeroIndex === -1 || lastZeroIndex < amount.length - 1) {
      newAmount =
        newAmount.substring(0, newAmount.length - 1) +
        `${parseFloat(newAmount[newAmount.length - 1]) - 1}`;
    }
    return parseFloat(newAmount);
  } else {
    let newAmount = parseFloat(amount);
    newAmount--;
    return newAmount;
  }
}
