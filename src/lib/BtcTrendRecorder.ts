import debug from 'debug';
import { IKline } from '../types/IKline';

const TREND_DURATION_MINUTES = 15;

export class BtcTrendRecorder {
  history: Array<IKline> = [];
  historySize: number = TREND_DURATION_MINUTES;
  trendOk: boolean = false;
  log: debug.Debugger = debug('BtcTrendRecorder');

  onKline(msg: IKline) {
    if (!this.history.length || msg.start === this.history[0].start) {
      this.history[0] = msg;
    } else {
      this.history.unshift(msg);
      if (this.history.length > this.historySize) {
        this.history.pop();
      }
    }

    if (this.history.length === this.historySize) {
      this.trendOk = this.isTrendOk();
    }
  }

  isTrendOk(): boolean {
    const last = this.history[0];
    const first = this.history[this.history.length - 1];
    return last.close > first.close;
  }
}
