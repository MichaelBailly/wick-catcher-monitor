import debug from 'debug';
import {
  DYNAMIC_STOP_LOSS,
  DYNAMIC_STOP_LOSS_RATIO,
  STOPLOSS_RATIO,
  TRAILING_RATIO,
  XX_FOLLOW_BTC_TREND,
  XX_REALTIME_PRICE_WATCH,
} from './config';
import { getUsdtPairs } from './exchanges/binance';
import { MarketMemoryCollection } from './lib/marketMemoryCollection';
import { MarketOrchestrator } from './lib/marketOrchestrator';
import { TradeDriverOpts } from './types/TradeDriverOpts';
import { start } from './ws';

const d = debug('index');

d('Follow btc trend: %s', XX_FOLLOW_BTC_TREND);
d('Realtime price watch: %s', XX_REALTIME_PRICE_WATCH);

const tradeDriverOpts: TradeDriverOpts = {
  sellDirect: false,
  sellAfter: 1000 * 60 * 60,
  priceRatio: TRAILING_RATIO,
  stopLossRatio: STOPLOSS_RATIO,
  dynamicStopLoss: DYNAMIC_STOP_LOSS,
  dynamicStopLossRatio: DYNAMIC_STOP_LOSS_RATIO,
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

async function run() {
  const pairs = await getUsdtPairs();
  d('%d pairs', pairs.length);
  const streams = pairs.map((pair) => `${pair.toLowerCase()}@kline_1m`);
  const streamName = `stream?streams=${streams.join('/')}`;
  start(streamName, orchestrators);
  orchestrators.forEach((orchestrator) => orchestrator.enableTradePrevent());
}

run();
