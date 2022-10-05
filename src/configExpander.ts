import { readFile, writeFile } from 'node:fs/promises';
import { PriceMarketWatcherOpts } from './types/PriceMarketWatcherOpts';
import { TradeDriverOpts } from './types/TradeDriverOpts';
import { VolumeMarketWatcherOpts } from './types/VolumeMarketWatcherOpts';

type Config = {
  watchers: {
    type: string;
    opts: PriceMarketWatcherOpts | VolumeMarketWatcherOpts;
    tradeDriverOpts: TradeDriverOpts;
  }[];
};

async function run() {
  const watchers: Config['watchers'] = [];
  const configTemplate: Config = JSON.parse(
    await readFile('./config.template.json', 'utf-8')
  );
  configTemplate.watchers.forEach((w) => {
    watchers.push(w);
    const w2 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w2.opts.realtimeDetection = true;
    watchers.push(w2);

    const w3 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w3.tradeDriverOpts.dynamicStopLoss = 1.03;
    w3.tradeDriverOpts.dynamicStopLossRatio = 0.9;
    watchers.push(w3);

    const w4 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w4.opts.realtimeDetection = true;
    w4.tradeDriverOpts.dynamicStopLoss = 1.03;
    w4.tradeDriverOpts.dynamicStopLossRatio = 0.9;
    watchers.push(w4);

    const w5 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w5.opts.realtimeDetection = true;
    w5.opts.followBtcTrend = true;
    w5.tradeDriverOpts.dynamicStopLoss = 1.03;
    w5.tradeDriverOpts.dynamicStopLossRatio = 0.9;
    watchers.push(w5);

    const w6 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w6.opts.followBtcTrend = true;
    w6.tradeDriverOpts.dynamicStopLoss = 1.03;
    w6.tradeDriverOpts.dynamicStopLossRatio = 0.9;
    watchers.push(w6);

    const w7 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w7.opts.followBtcTrend = true;
    watchers.push(w7);

    const w8 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w8.opts.followBtcTrend = 60;
    w8.tradeDriverOpts.dynamicStopLoss = 1.03;
    w8.tradeDriverOpts.dynamicStopLossRatio = 0.9;
    watchers.push(w8);

    const w9 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w9.opts.followBtcTrend = 120;
    w9.tradeDriverOpts.dynamicStopLoss = 1.03;
    w9.tradeDriverOpts.dynamicStopLossRatio = 0.9;
    watchers.push(w9);

    const w10 = {
      type: w.type,
      opts: { ...w.opts },
      tradeDriverOpts: { ...w.tradeDriverOpts },
    };
    w10.opts.followBtcTrend = 240;
    w10.tradeDriverOpts.dynamicStopLoss = 1.03;
    w10.tradeDriverOpts.dynamicStopLossRatio = 0.9;
    watchers.push(w10);
  });

  const config = { ...configTemplate, watchers };
  await writeFile('./config.json', JSON.stringify(config, null, 2));
}

run();
