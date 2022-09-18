import debug from 'debug';
import { readFile } from 'node:fs/promises';
import { getUsdtPairs } from './exchanges/binance';
import { MarketMemoryCollection } from './lib/marketMemoryCollection';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { MarketProfile } from './types/MarketProfile';
import { start } from './ws';

const d = debug('index');
const orchestrators: MarketOrchestrator[] = [];

type Configuration = {
  watchers: MarketProfile[];
};

async function setupEnv() {
  const collection = new MarketMemoryCollection();

  const configFile = await readFile('config.json', 'utf-8');
  const config: Configuration = JSON.parse(configFile);
  config.watchers.forEach((watcher) => {
    if (watcher.type === 'price') {
      collection.addPriceMarketWatcher(watcher.opts, watcher.tradeDriverOpts);
    }
    if (watcher.type === 'volume') {
      collection.addVolumeMarketWatcher(watcher.opts, watcher.tradeDriverOpts);
    }
  });

  /*
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
  collection.addPriceMarketWatcher({
    historySize: 0,
    flashWickRatio: 1.03,
    realtimeDetection: XX_REALTIME_PRICE_WATCH,
  });
  collection.addPriceMarketWatcher({
    historySize: 3,
    flashWickRatio: 1.05,
    realtimeDetection: XX_REALTIME_PRICE_WATCH,
  });
  collection.addPriceMarketWatcher({
    historySize: 4,
    flashWickRatio: 1.05,
    realtimeDetection: XX_REALTIME_PRICE_WATCH,
  });

  collection.addPriceMarketWatcher({
    historySize: 3,
    flashWickRatio: 1.04,
    realtimeDetection: XX_REALTIME_PRICE_WATCH,
  });
  collection.addPriceMarketWatcher({
    historySize: 3,
    flashWickRatio: 0.95,
    realtimeDetection: XX_REALTIME_PRICE_WATCH,
  });
  collection.addPriceMarketWatcher({
    historySize: 3,
    flashWickRatio: 0.96,
    realtimeDetection: XX_REALTIME_PRICE_WATCH,
  });
  collection.addPriceMarketWatcher({
    historySize: 3,
    flashWickRatio: 0.97,
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
*/
  const orchestrator = new MarketOrchestrator(collection);

  orchestrators.push(orchestrator);
}

async function run() {
  const pairs = await getUsdtPairs();
  d('%d pairs', pairs.length);
  const streams = pairs.map((pair) => `${pair.toLowerCase()}@kline_1m`);
  const streamName = `stream?streams=${streams.join('/')}`;
  start(streamName, orchestrators);
  orchestrators.forEach((orchestrator) => orchestrator.enableTradePrevent());
}

setupEnv().then(run);
