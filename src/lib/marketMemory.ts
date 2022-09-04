import { sub } from 'date-fns';
import debug, { Debugger } from 'debug';
import { IKline } from '../types/IKline';

export class MarketMemory {
  pair: string;
  d: Debugger;
  e: Debugger;
  /**
   * Array of 5 last minutes ITicks. 0 is the most recent tick.
   */
  minutes: IKline[] = [];
  staleMinuteEnd: number | null = null;
  flashWickRatio: number;
  historySize: number;

  constructor(
    pair: string,
    opts?: { flashWickRatio?: number; historySize?: number }
  ) {
    this.pair = pair;
    this.d = debug(`lib:marketMemory:${this.pair}`);
    this.e = debug(`lib:marketMemory:${this.pair}:error`);
    this.flashWickRatio = opts?.flashWickRatio || 1.1;
    this.historySize = opts?.historySize || 5;
  }

  onKlineMessage(msg: IKline) {
    if (msg.interval !== '1m') {
      this.d('Interval not supported "%s"', msg.interval);
      return;
    }
    if (this.minutes.length === 0) {
      if (this.staleMinuteEnd === null) {
        this.staleMinuteEnd = msg.end;
      } else if (this.staleMinuteEnd < msg.start) {
        this.minutes.push({ ...msg });
        this.staleMinuteEnd = msg.end;
      }
    } else {
      if (this.minutes[0].end < msg.start) {
        this.minutes.unshift({ ...msg });
        if (this.minutes.length > this.historySize) {
          this.minutes.pop();
        }
      } else {
        this.minutes[0] = { ...msg };
      }
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
    let detected = false;
    if (this.minutes.length < this.historySize) {
      return detected;
    }
    if (!this.isConcurrentMinutes()) {
      return detected;
    }

    for (let i = 0; i < this.minutes.length; i++) {
      const current = this.minutes[0];
      const previous = this.minutes[i];

      const pctDiff = current.close / previous.open;

      if (pctDiff > this.flashWickRatio) {
        this.d(
          'Flash wick detected: *%d in %d minutes - %s',
          pctDiff,
          i + 1,
          new Date().toUTCString()
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
    return `${this.pair}-${this.flashWickRatio}-${this.historySize}`;
  }
}
