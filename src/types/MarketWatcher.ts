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

export function isMarketWatcher(obj: any): obj is MarketWatcher {
  return obj.pair && obj.d && obj.e && obj.minutes && obj.historySize;
}
