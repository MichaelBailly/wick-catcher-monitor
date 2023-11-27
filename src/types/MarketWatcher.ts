import { IKline } from './IKline';
import { MarketWatcherConfData } from './MarketWatcherConfData';
import { TradeDriverOpts } from './TradeDriverOpts';

export type MarketWatcher = {
  pair: string;
  d: debug.Debugger;
  e: debug.Debugger;
  minutes: IKline[];
  historySize: number;
  followBtcTrend: boolean | number;
  onKlineMessage: (msg: IKline) => void;
  detectFlashWick: () => boolean;
  getHistory: () => IKline[];
  getConfLine: () => string;
  getConfData: () => MarketWatcherConfData;
  getTradeDriverOpts: () => TradeDriverOpts;
};

export function isMarketWatcher(obj: unknown): obj is MarketWatcher {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const obj2 = obj as MarketWatcher;

  if (typeof obj2.pair !== 'string') {
    return false;
  }

  if (typeof obj2.d !== 'function') {
    return false;
  }

  if (typeof obj2.e !== 'function') {
    return false;
  }

  if (!Array.isArray(obj2.minutes)) {
    return false;
  }

  if (typeof obj2.historySize !== 'number') {
    return false;
  }

  if (
    typeof obj2.followBtcTrend !== 'boolean' &&
    typeof obj2.followBtcTrend !== 'number'
  ) {
    return false;
  }

  if (typeof obj2.onKlineMessage !== 'function') {
    return false;
  }

  if (typeof obj2.detectFlashWick !== 'function') {
    return false;
  }

  if (typeof obj2.getHistory !== 'function') {
    return false;
  }

  if (typeof obj2.getConfLine !== 'function') {
    return false;
  }

  if (typeof obj2.getConfData !== 'function') {
    return false;
  }

  if (typeof obj2.getTradeDriverOpts !== 'function') {
    return false;
  }

  return true;
}
