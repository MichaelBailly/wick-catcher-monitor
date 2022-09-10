import debug from 'debug';
import { getUsdtPairs } from './exchanges/binance';
import { MarketMemoryCollection } from './lib/marketMemoryCollection';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { TradeDriverOpts } from './types/TradeDriverOpts';
import { start } from './ws';

const tradeDriverOpts: TradeDriverOpts = {
  stopInhibitDelay: 1000 * 60 * 15,
  sellAfter: 1000 * 60 * 60,
};

const orchestrators: MarketOrchestrator[] = [];

let realtimePriceWatch = false;
if (process.env.XX_REALTIME_PRICE_WATCH === 'true') {
  realtimePriceWatch = true;
}

const collection = new MarketMemoryCollection();
collection.addPriceMarketWatcher({
  flashWickRatio: 1.1,
  realtimeDetection: realtimePriceWatch,
});
collection.addPriceMarketWatcher({
  flashWickRatio: 1.075,
  realtimeDetection: realtimePriceWatch,
});
collection.addPriceMarketWatcher({
  flashWickRatio: 1.055,
  realtimeDetection: realtimePriceWatch,
});
collection.addVolumeMarketWatcher({});
collection.addVolumeMarketWatcher({
  volumeThresholdRatio: 60,
});
collection.addVolumeMarketWatcher({
  volumeThresholdRatio: 90,
});

const orchestrator = new MarketOrchestrator(collection, tradeDriverOpts);

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
