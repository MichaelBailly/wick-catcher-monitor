import { IKline } from './IKline';

export type MarketWatcher = {
  pair: string;
  d: debug.Debugger;
  e: debug.Debugger;
  minutes: IKline[];
  historySize: number;
  onKlineMessage: (msg: IKline) => void;
  detectFlashWick: () => boolean;
  getHistory: () => IKline[];
  getConfLine: () => string;
};
