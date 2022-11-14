import debug from 'debug';
import { readFile } from 'node:fs/promises';
import { MarketMemoryCollection } from './lib/marketMemoryCollection';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import {
  enableDailyUpdates,
  updateVolumeReference,
} from './lib/volume/volumeReferenceUpdater';
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
  enableDailyUpdates();
  start(orchestrators);
  for (const orchestrator of orchestrators) {
    orchestrator.enableTradePrevent();
    orchestrator.enableMaxConcurrentTradesFileChecker();
  }
}

setupEnv().then(run);
