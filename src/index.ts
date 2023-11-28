import debug from 'debug';
import { readFile } from 'node:fs/promises';
import { PREDICTION_MODEL, USE_ADAPTATIVE_INVESTMENT } from './config';
import {
  enableDailyUpdates as enableCMCDailyUpdates,
  updateCMCReference,
} from './lib/cmc';
import { startFixedPricesConfigUpdates } from './lib/fixedPrice';
import { start as startInvestmentUpdater } from './lib/investment';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { MarketWatcherCollection } from './lib/marketWatcherCollection';
import { start as startFreeSms } from './lib/notifications/freeSmsApi';
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
    if (watcher.type === 'fixedPrice') {
      collection.addFixedPriceMarketWatcher(
        watcher.opts,
        watcher.tradeDriverOpts
      );
    }
  }

  const orchestrator = new MarketOrchestrator(collection);
  orchestrators.push(orchestrator);
}

async function run() {
  startFreeSms();
  if (USE_ADAPTATIVE_INVESTMENT) {
    await startInvestmentUpdater();
  }
  await updateVolumeReference();
  enableDailyUpdates();
  await updateCMCReference();
  enableCMCDailyUpdates();

  startFixedPricesConfigUpdates();

  start(orchestrators);
  for (const orchestrator of orchestrators) {
    orchestrator.enableTradePrevent();
    orchestrator.enableMaxConcurrentTradesFileChecker();
  }
}

setupEnv().then(run);
