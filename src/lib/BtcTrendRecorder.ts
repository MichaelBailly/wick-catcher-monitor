import debug from 'debug';
import { IKline } from '../types/IKline';

const TREND_DURATION_MINUTES = 15;

const RecordersMap: Map<number, BtcTrendRecorder> = new Map();

export function getBtcTrendRecorder(
  durationMinutes: number = TREND_DURATION_MINUTES
): BtcTrendRecorder {
  let recorder = RecordersMap.get(durationMinutes);
  if (!recorder) {
    recorder = new BtcTrendRecorder(durationMinutes);
    RecordersMap.set(durationMinutes, recorder);
  }
  return recorder;
}

export function onBtcKline(msg: IKline) {
  for (const recorder of RecordersMap.values()) {
    recorder.onKline(msg);
  }
}

export class BtcTrendRecorder {
  history: Array<IKline> = [];
  historySize: number;
  trendOk: boolean = false;
  log: debug.Debugger = debug('BtcTrendRecorder');

  constructor(duration: number = TREND_DURATION_MINUTES) {
    this.historySize = duration;
  }

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
    if (!this.history.length) {
      return false;
    }
    const last = this.history[0];
    const first = this.history[this.history.length - 1];
    return last.close > first.close;
  }
}
