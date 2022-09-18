import { IKline } from './IKline';
import { MarketWatcherConfData } from './MarketWatcherConfData';
import { TradeDriverOpts } from './TradeDriverOpts';

export type MarketWatcher = {
  pair: string;
  d: debug.Debugger;
  e: debug.Debugger;
  minutes: IKline[];
  historySize: number;
  followBtcTrend: boolean;
  onKlineMessage: (msg: IKline) => void;
  detectFlashWick: () => boolean;
  getHistory: () => IKline[];
  getConfLine: () => string;
  getConfData: () => MarketWatcherConfData;
  getTradeDriverOpts: () => TradeDriverOpts;
};
