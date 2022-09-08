import debug from 'debug';
import { getUsdtPairs } from './exchanges/binance';
import { MarketMemoryCollection } from './lib/marketMemoryCollection';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { start } from './ws';

const orchestrators: MarketOrchestrator[] = [];

const marketMemoryCollections = [];
marketMemoryCollections.push(new MarketMemoryCollection());
marketMemoryCollections.push(
  new MarketMemoryCollection({
    flashWickRatio: 1.075,
    volumeThreasoldRatio: 60,
  }),
  new MarketMemoryCollection({
    flashWickRatio: 1.055,
    volumeThreasoldRatio: 90,
  })
);
const orchestrator = new MarketOrchestrator(marketMemoryCollections);

orchestrators.push(orchestrator);
// const streamName = 'stream?streams=maticusdt@kline_1m/dotusdt@kline_1m';

const d = debug('index');

async function run() {
  const pairs = await getUsdtPairs();
  d('%d pairs', pairs.length);
  const streams = pairs.map((pair) => `${pair.toLowerCase()}@kline_1m`);
  const streamName = `stream?streams=${streams.join('/')}`;
  start(streamName, orchestrators);
}

run();
