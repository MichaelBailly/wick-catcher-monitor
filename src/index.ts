import debug from 'debug';
import { XX_REALTIME_PRICE_WATCH } from './config';
import { getUsdtPairs } from './exchanges/binance';
import { MarketMemoryCollection } from './lib/marketMemoryCollection';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { TradeDriverOpts } from './types/TradeDriverOpts';
import { start } from './ws';

const tradeDriverOpts: TradeDriverOpts = {
  sellDirect: false,
  sellAfter: 1000 * 60 * 60,
};

const orchestrators: MarketOrchestrator[] = [];

const collection = new MarketMemoryCollection();
collection.addPriceMarketWatcher({
  flashWickRatio: 1.1,
  realtimeDetection: XX_REALTIME_PRICE_WATCH,
});
collection.addPriceMarketWatcher({
  flashWickRatio: 1.075,
  realtimeDetection: XX_REALTIME_PRICE_WATCH,
});
collection.addPriceMarketWatcher({
  flashWickRatio: 1.055,
  realtimeDetection: XX_REALTIME_PRICE_WATCH,
});
collection.addPriceMarketWatcher({
  historySize: 3,
  flashWickRatio: 1.055,
  realtimeDetection: XX_REALTIME_PRICE_WATCH,
});

collection.addVolumeMarketWatcher({});
collection.addVolumeMarketWatcher({
  volumeThresholdRatio: 60,
});
collection.addVolumeMarketWatcher({
  volumeThresholdRatio: 90,
});
collection.addVolumeMarketWatcher({
  volumeThresholdRatio: 30,
});

const orchestrator = new MarketOrchestrator(collection, tradeDriverOpts);

orchestrators.push(orchestrator);

const d = debug('index');

async function run() {
  const pairs = await getUsdtPairs();
  d('%d pairs', pairs.length);
  const streams = pairs.map((pair) => `${pair.toLowerCase()}@kline_1m`);
  const streamName = `stream?streams=${streams.join('/')}`;
  start(streamName, orchestrators);
}

run();
