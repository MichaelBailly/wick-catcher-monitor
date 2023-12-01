import debug from 'debug';
import EventEmitter from 'events';
import fs from 'fs';
import { FIXED_PRICES_FILE_PATH } from '../../config';

export const fixedPriceEvents = new EventEmitter();
export const log = debug('lib:fixedPrice');

const filePath = FIXED_PRICES_FILE_PATH;
let lastPrices: { [symbol: string]: [number, number] } = {};

function parseLine(line: string): [string, number, number] {
  const [symbol, priceStr, amountStr] = line.split(' ');
  const price = Number(priceStr);
  const amount = Number(amountStr);
  if (!symbol.match(/^[a-zA-Z0-9]+$/)) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }
  if (isNaN(price)) {
    throw new Error(`Invalid price: ${priceStr}`);
  }
  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }
  return [symbol.toUpperCase(), price, amount];
}

async function processFile() {
  if (!filePath) {
    return;
  }
  let fileContent: string;
  try {
    fileContent = await fs.promises.readFile(filePath, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return; // File does not exist, end function execution here
    }
    throw error;
  }

  const lines = fileContent.split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    try {
      const [symbol, price, amount] = parseLine(line);
      const lastPrice = lastPrices[symbol];
      if (lastPrice === undefined) {
        fixedPriceEvents.emit(`${symbol}-fixedPrice-new`, {
          symbol,
          price,
          amount,
        });
        log(`New fixed price for ${symbol}: ${price}`);
      } else if (lastPrice[0] !== price || lastPrice[1] !== amount) {
        fixedPriceEvents.emit(`${symbol}-fixedPrice-updated`, {
          symbol,
          price,
          amount,
        });
        log(
          `Updated fixed price or/and amount for ${symbol}: ${price} ${amount}`
        );
      }
      lastPrices[symbol] = [price, amount];
    } catch (error: any) {
      throw new Error(`Error processing line: ${line}\n${error.message}`);
    }
  }
  for (const symbol in lastPrices) {
    if (!lines.some((line) => line.startsWith(symbol))) {
      fixedPriceEvents.emit(`${symbol}-fixedPrice-removed`, { symbol });
      log(`Removed fixed price for ${symbol}`);
      delete lastPrices[symbol];
    }
  }
}

export function startFixedPricesConfigUpdates() {
  if (!filePath) {
    return;
  }
  setInterval(processFile, 60 * 1000);
}
