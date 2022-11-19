import { createHmac } from 'crypto';
import debug from 'debug';
import querystring from 'node:querystring';
import pThrottle from 'p-throttle';
import WebSocket from 'ws';
import { BINANCE_KEY, BINANCE_SECRET } from '../config';
import { isBinanceExchangeResponse } from '../types/BinanceExchangeResponse';
import { isBinanceOrderResponse } from '../types/BinanceOrderResponse';
import { BinanceSymbol } from '../types/BinanceSymbol';
import { BinanceTransactionError } from '../types/BinanceTransactionError';
import { IKline } from '../types/IKline';

const throttled = pThrottle({
  limit: 1,
  interval: 3000,
});

const d = debug('binance');

let symbols: BinanceSymbol[] = [];

export async function reloadSymbols(): Promise<string[]> {
  const url = 'https://api.binance.com/api/v3/exchangeInfo';
  const response = await fetch(url);
  const data = await response.json();
  if (!isBinanceExchangeResponse(data)) {
    throw new Error('Invalid response from Binance');
  }

  symbols = data.symbols.filter(
    (symbol: any) =>
      symbol.quoteAsset === 'USDT' &&
      symbol.baseAsset !== 'USDT' &&
      symbol.baseAsset !== 'ETH' &&
      symbol.baseAsset !== 'PUSD' &&
      symbol.baseAsset !== 'USDP' &&
      symbol.baseAsset !== 'BUSD' &&
      symbol.baseAsset !== 'TUSDT' &&
      symbol.baseAsset !== 'TUSD' &&
      symbol.baseAsset !== 'USDC' &&
      symbol.baseAsset !== 'BTTC' &&
      symbol.baseAsset !== 'PERP' &&
      !/\w+UP$/.test(symbol.baseAsset) &&
      !/\w+DOWN$/.test(symbol.baseAsset) &&
      symbol.isSpotTradingAllowed
  );
  d('%d pairs', symbols.length);
  return symbols.map((pair) => pair.symbol);
}

export function getWebsocketChannels() {
  return symbols.map((pair) => `${pair.symbol.toLowerCase()}@kline_1m`);
}

export async function getWebsocket() {
  await reloadSymbols();
  const url = 'wss://stream.binance.com:9443/';
  const ws = new WebSocket(
    `${url}stream?streams=${getWebsocketChannels().join('/')}`
  );
  return ws;
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

function createQueryString(params = {}) {
  if (BINANCE_SECRET === null) {
    throw new Error('Binance secret is not set');
  }
  const params2 = { ...params, timestamp: Date.now(), recvWindow: 5000 };
  const qs = querystring.stringify(params2);

  const signature = createHmac('sha256', BINANCE_SECRET)
    .update(qs)
    .digest('hex');
  const url = `${qs}&signature=${signature}`;
  return url;
}

type CreateOrderOpts = {
  quoteOrderQty?: number;
  quantity?: number;
};

async function createOrder(pair: string, side: string, opts: CreateOrderOpts) {
  let response;
  if (BINANCE_KEY === null) {
    throw new Error('Binance key is not set');
  }
  if (!opts.quoteOrderQty && !opts.quantity) {
    throw new Error('quoteOrderQty or quantity is required');
  }

  const tradeData = createQueryString({
    symbol: pair,
    side: side,
    type: 'MARKET',
    ...opts,
  });

  const tradeRequest = new Request(
    `https://api.binance.com/api/v3/order?${tradeData}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MBX-APIKEY': BINANCE_KEY,
        'User-Agent': `Mozilla/Firefox`,
      },
    }
  );
  response = await fetch(tradeRequest);
  if (!response.ok) {
    throw new BinanceTransactionError(
      `Error creating order: ${response.status} ${response.statusText}`,
      response
    );
  }
  const data = await response.json();
  console.log(data);
  if (!isBinanceOrderResponse(data)) {
    throw new BinanceTransactionError(
      'Invalid response from Binance',
      response
    );
  }
  return data;
}

export async function buy(pair: string, quoteOrderQty: number) {
  return createOrder(pair, 'BUY', { quoteOrderQty });
}

export async function sell(pair: string, quantity: number) {
  return createOrder(pair, 'SELL', { quantity });
}

export function getSymbol(pair: string) {
  return symbols.find((symbol) => symbol.symbol === pair);
}
