import { readFile } from 'fs/promises';
import { PREDICTION_MODEL } from '../../config';
import { MarketWatcher } from '../../types/MarketWatcher';
import { PredictionModel } from '../../types/PredictionModel';
import { MarketWatcherCollection } from '../marketWatcherCollection';
import { PriceMarketWatcher } from '../marketWatchers/priceMarketWatcher';
import { confLineToConfigObject } from '../marketWatchers/utils';

let model: PredictionModel | undefined;
let runtimeInterval: NodeJS.Timeout | undefined;

async function updateModel(collection: MarketWatcherCollection) {
  if (!PREDICTION_MODEL) {
    return;
  }

  let newModel: PredictionModel;
  try {
    const file = await readFile(PREDICTION_MODEL, 'utf-8');
    newModel = JSON.parse(file);
  } catch (e) {
    console.error('Error reading prediction model config', e);
    throw e;
  }
  if (model && model.hash === newModel.hash) {
    return;
  }
  model = newModel;
  const watcherProfiles = model.watchers.map((w) => {
    return confLineToConfigObject(w.type, w.config);
  });

  collection.updateWatchers(new Set(watcherProfiles));
}

export function canTakeTrade(marketWatcher: MarketWatcher) {
  if (!model) {
    return false;
  }

  const type = marketWatcher instanceof PriceMarketWatcher ? 'price' : 'volume';

  if (
    model.model?.[marketWatcher.pair]?.[type]?.[marketWatcher.getConfLine()] ===
    true
  ) {
    return true;
  }
  return false;
}

export async function start(collection: MarketWatcherCollection) {
  if (PREDICTION_MODEL) {
    await updateModel(collection);
    runtimeInterval = setInterval(() => {
      updateModel(collection);
    }, 1000 * 60 * 60);
  }
}
