import debug from 'debug';
import { readFile } from 'node:fs/promises';
import { init as initBinance } from './exchanges/binance';
import { MarketMemoryCollection } from './lib/marketMemoryCollection';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { updateVolumeReference } from './lib/volume/volumeReferenceUpdater';
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

  for (const watcher of config.watchers) {
    if (watcher.type === 'price') {
      collection.addPriceMarketWatcher(watcher.opts, watcher.tradeDriverOpts);
    }
    if (watcher.type === 'volume') {
      collection.addVolumeMarketWatcher(watcher.opts, watcher.tradeDriverOpts);
    }
  }

  const orchestrator = new MarketOrchestrator(collection);
  orchestrators.push(orchestrator);
}

async function run() {
  await updateVolumeReference();
  const pairs = await initBinance();
  d('%d pairs', pairs.length);
  const streams = pairs.map((pair) => `${pair.toLowerCase()}@kline_1m`);
  const streamName = `stream?streams=${streams.join('/')}`;
  start(streamName, orchestrators);
  for (const orchestrator of orchestrators) {
    orchestrator.enableTradePrevent();
  }
}

setupEnv().then(run);
