import { sub } from 'date-fns';
import debug, { Debugger } from 'debug';
import { IKline } from '../../types/IKline';

export class PriceMarketWatcher {
  pair: string;
  d: Debugger;
  e: Debugger;
  /**
   * Array of 5 last minutes ITicks. 0 is the most recent tick.
   */
  minutes: IKline[] = [];
  staleMinute: IKline | null = null;
  flashWickRatio: number;
  historySize: number;
  minutesUpdated: boolean = false;
  realtimeDetection: boolean = false;

  constructor(
    pair: string,
    opts?: {
      flashWickRatio?: number;
      historySize?: number;
      realtimeDetection?: boolean;
    }
  ) {
    this.pair = pair;
    this.d = debug(`lib:PriceMarketWatcher:${this.pair}`);
    this.e = debug(`lib:PriceMarketWatcher:${this.pair}:error`);
    this.flashWickRatio = opts?.flashWickRatio || 1.1;
    this.historySize = opts?.historySize || 5;
    this.realtimeDetection = opts?.realtimeDetection || false;
  }

  onKlineMessage(msg: IKline) {
    if (msg.interval !== '1m') {
      this.d('Interval not supported "%s"', msg.interval);
      return;
    }
    if (this.staleMinute === null || this.staleMinute.end > msg.start) {
      this.staleMinute = { ...msg };
      this.minutesUpdated = false;
    } else if (this.staleMinute.end < msg.start) {
      this.minutes.unshift({ ...this.staleMinute });
      this.staleMinute = msg;
      this.minutesUpdated = true;
    }

    if (this.minutes.length > this.historySize) {
      this.minutes.pop();
    }
  }

  isConcurrentMinutes() {
    for (let i = 0; i < this.minutes.length - 1; i++) {
      const current = this.minutes[i];
      const previous = this.minutes[i + 1];

      const startDate = new Date(current.start);
      if (sub(startDate, { minutes: 1 }).getTime() !== previous.start) {
        this.e('Minutes are not concurrent');
        return false;
      }
    }
    return true;
  }

  detectFlashWick() {
    return this.realtimeDetection
      ? this.detectFlashWickRealTime()
      : this.detectFlashWickPerMinute();
  }

  detectFlashWickRealTime() {
    if (!this.staleMinute) {
      return false;
    }

    if (this.minutes.length < this.historySize) {
      return false;
    }
    if (!this.isConcurrentMinutes()) {
      return false;
    }

    const current = this.staleMinute;

    const minutes = [current, ...this.minutes];

    for (let i = 0; i < minutes.length; i++) {
      const previous = minutes[i];

      const pctDiff = current.close / previous.open;

      if (pctDiff > this.flashWickRatio) {
        return true;
      }
    }

    return false;
  }

  detectFlashWickPerMinute() {
    let detected = false;

    if (!this.minutesUpdated) {
      return detected;
    }

    if (this.minutes.length < this.historySize) {
      return detected;
    }
    if (!this.isConcurrentMinutes()) {
      return detected;
    }

    const current = this.minutes[0];
    for (let i = 0; i < this.minutes.length; i++) {
      const previous = this.minutes[i];

      const pctDiff = current.close / previous.open;

      if (pctDiff > this.flashWickRatio) {
        this.d(
          'Flash wick detected: %d in %d minutes - %o',
          pctDiff,
          i + 1,
          new Date()
        );
        detected = true;
      }
    }

    return detected;
  }

  getHistory() {
    return this.minutes.map((m) => ({ ...m }));
  }

  getConfLine() {
    return `price-${this.pair}-${this.realtimeDetection ? 'true' : 'false'}-${
      this.flashWickRatio
    }-${this.historySize}`;
  }

  getConfData() {
    return {
      type: 'price',
      pair: this.pair,
      config: `${this.realtimeDetection ? 'true' : 'false'}-${
        this.flashWickRatio
      }-${this.historySize}`,
    };
  }
}
