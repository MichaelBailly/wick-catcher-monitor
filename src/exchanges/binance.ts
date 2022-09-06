import pThrottle from 'p-throttle';
import { IKline } from '../types/IKline';

const throttled = pThrottle({
  limit: 1,
  interval: 3000,
});

export async function getUsdtPairs(): Promise<string[]> {
  const url = 'https://api.binance.com/api/v3/exchangeInfo';
  const response = await fetch(url);
  const data = await response.json();
  const pairs = data.symbols.filter(
    (symbol: any) =>
      symbol.quoteAsset === 'USDT' &&
      symbol.baseAsset !== 'USDT' &&
      symbol.baseAsset !== 'BTC' &&
      symbol.baseAsset !== 'ETH' &&
      symbol.baseAsset !== 'PUSD' &&
      symbol.baseAsset !== 'BUSD' &&
      symbol.baseAsset !== 'USDC' &&
      symbol.isSpotTradingAllowed
  );
  return pairs.map((pair: any) => pair.symbol);
}

export async function getLastDaysCandlesInternal(
  pair: string,
  days: number = 2
): Promise<IKline[]> {
  const url = 'https://api.binance.com/api/v1/klines';
  const candles: IKline[] = [];

  const response = await fetch(
    `${url}?symbol=${pair}&interval=1d&limit=${days + 1}`
  );
  const data = await response.json();
  data.pop();

  for (const candle of data) {
    candles.push({
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
      start: candle[0],
      end: candle[6],
      interval: '1d',
    });
  }
  return candles;
}

export const getLastDaysCandles = throttled(getLastDaysCandlesInternal);
