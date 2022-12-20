import { MarketProfile } from '../../types/MarketProfile';
import { TradeDriverOpts } from '../../types/TradeDriverOpts';

export function confLine(opts: TradeDriverOpts): string {
  return `${opts.priceRatio},${opts.stopLossRatio},${opts.dynamicStopLoss},${opts.dynamicStopLossRatio}`;
}

export function confLineToConfigObject(type: string, confLine: string) {
  if (type === 'price') {
    return priceConfLineToConfigObject(confLine);
  } else if (type === 'volume') {
    return volumeConfLineToConfigObject(confLine);
  }
  throw new Error(`Unknown type ${type}`);
}

export function priceConfLineToConfigObject(confLine: string): MarketProfile {
  const [
    realtimeDetection,
    followBtcTrend,
    flashWickRatio,
    historySize,
    priceRatio,
    stopLossRatio,
    dynamicStopLoss,
    dynamicStopLossRatio,
  ] = confLine.split(',');
  return {
    type: 'price',
    opts: {
      realtimeDetection: realtimeDetection === 'true',
      followBtcTrend:
        followBtcTrend === 'true'
          ? true
          : followBtcTrend === 'false'
          ? false
          : Number(followBtcTrend),
      flashWickRatio: Number(flashWickRatio),
      historySize: Number(historySize),
    },
    tradeDriverOpts: {
      priceRatio: Number(priceRatio),
      stopLossRatio: Number(stopLossRatio),
      dynamicStopLoss: Number(dynamicStopLoss),
      dynamicStopLossRatio: Number(dynamicStopLossRatio),
    },
  };
}

export function volumeConfLineToConfigObject(confLine: string): MarketProfile {
  const [
    realtimeDetection,
    followBtcTrend,
    volumeThresholdRatio,
    historySize,
    priceRatio,
    stopLossRatio,
    dynamicStopLoss,
    dynamicStopLossRatio,
  ] = confLine.split(',');
  return {
    type: 'volume',
    opts: {
      realtimeDetection: realtimeDetection === 'true',
      followBtcTrend:
        followBtcTrend === 'true'
          ? true
          : followBtcTrend === 'false'
          ? false
          : Number(followBtcTrend),
      volumeThresholdRatio: Number(volumeThresholdRatio),
      historySize: Number(historySize),
    },
    tradeDriverOpts: {
      priceRatio: Number(priceRatio),
      stopLossRatio: Number(stopLossRatio),
      dynamicStopLoss: Number(dynamicStopLoss),
      dynamicStopLossRatio: Number(dynamicStopLossRatio),
    },
  };
}
