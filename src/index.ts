import { getUsdtPairs } from './exchanges/binance';
import { binanceKlineMessageToITick } from './lib/klinesParser';
import { MarketMemoryCollection } from './lib/marketMemory';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import BinanceWebsocketMessage from './types/BinanceWebSocketMessage';
import IKline from './types/IKline.type';
import { start } from './ws';
import SocketClient from './ws/client';
import debug from 'debug';

const marketMemoryCollection = new MarketMemoryCollection();
const orchestrator = new MarketOrchestrator(marketMemoryCollection);

// const streamName = 'stream?streams=maticusdt@kline_1m/dotusdt@kline_1m';

const d = debug('index');

async function run() {
  const pairs = await getUsdtPairs();
  d('%d pairs', pairs.length);
  const streams = pairs.map((pair) => `${pair.toLowerCase()}@kline_1m`);
  const streamName = `stream?streams=${streams.join('/')}`;
  start(streamName, orchestrator);
}

run();
