import debug from 'debug';
import { readFile } from 'node:fs/promises';
import { PREDICTION_MODEL } from './config';
import {
  enableDailyUpdates as enableCMCDailyUpdates,
  updateCMCReference,
} from './lib/cmc';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { MarketWatcherCollection } from './lib/marketWatcherCollection';
import { start as startPredictionRuntime } from './lib/predictionModel/runtime';
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
  if (PREDICTION_MODEL) {
    d('Using prediction model');
    return setupEnvFromPredictionModel();
  } else {
    return setupEnvFromConfig();
  }
}

async function setupEnvFromPredictionModel() {
  const collection = new MarketWatcherCollection();
  startPredictionRuntime(collection);
  const orchestrator = new MarketOrchestrator(collection);
  orchestrators.push(orchestrator);
}

async function setupEnvFromConfig() {
  const collection = new MarketWatcherCollection();

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
  await updateCMCReference();
  enableCMCDailyUpdates();

  start(orchestrators);
  for (const orchestrator of orchestrators) {
    orchestrator.enableTradePrevent();
    orchestrator.enableMaxConcurrentTradesFileChecker();
  }
}

setupEnv().then(run);
