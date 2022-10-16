import { format } from 'date-fns';
import debug from 'debug';
import { writeFile } from 'fs/promises';
import { RECORDER_FILE_PATH } from '../config';
import {
  BinanceTransactionError,
  buy as binanceBuy,
  getSymbol,
  sell as binanceSell,
} from '../exchanges/binance';
import { isBinanceOrderFill } from '../types/BinanceOrderFill';
import { BinanceOrderResponse } from '../types/BinanceOrderResponse';
import { TradeDriver } from './tradeDriver';

const log = debug('lib:tradeDriverTransaction');
const MAX_SELL_ATTEMPTS = 3;

export async function sell(driver: TradeDriver) {
  let attempts = 1;
  while (attempts <= MAX_SELL_ATTEMPTS) {
    try {
      return await sellTentative(driver);
    } catch (e) {
      log(`Error: %s sell attempt ${attempts} failed: %o`, driver.pair, e);
      attempts++;
    }
  }
  throw new Error(`Failed to sell after ${MAX_SELL_ATTEMPTS} attempts`);
}

export async function sellTentative(driver: TradeDriver) {
  if (!driver.binanceBuyTransaction) {
    throw new Error('No buy transaction found');
  }

  const amount = getSellAmount(
    parseFloat(driver.binanceBuyTransaction.executedQty),
    driver.pair
  );

  recordTransactionArgs(
    driver.pair,
    driver.binanceBuyTransaction.executedQty,
    parseFloat(driver.binanceBuyTransaction.executedQty),
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

async function recordBinanceTransactionResponse(
  response: BinanceOrderResponse
) {
  const filename = `${RECORDER_FILE_PATH}/binance-transaction-${format(
    new Date(),
    'yyyyMMdd-HHmmss'
  )}.json`;
  try {
    await writeFile(filename, JSON.stringify(response, null, 2), 'utf8');
  } catch (e) {
    console.log('ERROR: failed to record binance transaction response');
    console.log(e);
  }
}

async function onTransactionError(error: BinanceTransactionError | Error) {
  const errorFilename = `${RECORDER_FILE_PATH}/binance-transaction-${format(
    new Date(),
    'yyyyMMddHHmmssSS'
  )}.err`;
  const fileContents = [];
  if (error instanceof BinanceTransactionError && error.response) {
    fileContents.push(`response.ok: ${error.response.ok}`);
    fileContents.push(`response.status: ${error.response.status}`);
    fileContents.push(`response.statusText: ${error.response.statusText}`);
    fileContents.push(`response.bodyUsed: ${error.response.bodyUsed}`);
    try {
      fileContents.push(`response.body: ${await error.response.text()}`);
    } catch (e) {
      fileContents.push(`response.body: Unable to read response.body: ${e}`);
    }
  }
  fileContents.push(`error.message: ${error.message}`);

  await writeFile(errorFilename, fileContents.join('\n'), 'utf8');
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
