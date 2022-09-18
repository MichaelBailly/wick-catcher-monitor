import { sub } from 'date-fns';
import debug, { Debugger } from 'debug';
import { IKline } from '../../types/IKline';
import { PriceMarketWatcherOpts } from '../../types/PriceMarketWatcherOpts';
import { TradeDriverOpts } from '../../types/TradeDriverOpts';
import { confLine } from './utils';

export class PriceMarketWatcher {
  pair: string;
  d: Debugger;
  e: Debugger;
  /**
   * @description Array of 5 last minutes ITicks. 0 is the most recent tick.
   */
  minutes: IKline[] = [];
  staleMinute: IKline | null = null;
  /**
   * @description Ratio of the candle body to the wick. If the ratio is higher than this value, the candle is considered a flash wick. Ratio can be less than 1, in which case we track wicks going down.
   * @default 1.1
   * @example 1.1
   */
  flashWickRatio: number;
  /**
   * @description number of minutes that are buffered
   */
  historySize: number;
  minutesUpdated: boolean = false;
  realtimeDetection: boolean = false;
  tradeDriverOpts: TradeDriverOpts;
  followBtcTrend: boolean = false;

  constructor(
    pair: string,
    opts?: PriceMarketWatcherOpts,
    tradeDriverOpts: TradeDriverOpts = {}
  ) {
    this.pair = pair;
    this.d = debug(`lib:PriceMarketWatcher:${this.pair}`);
    this.e = debug(`lib:PriceMarketWatcher:${this.pair}:error`);
    this.flashWickRatio = opts?.flashWickRatio || 1.1;
    this.historySize = opts?.historySize !== undefined ? opts.historySize : 5;
    this.realtimeDetection = opts?.realtimeDetection || false;
    this.followBtcTrend = opts?.followBtcTrend || false;
    this.tradeDriverOpts = tradeDriverOpts;
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

      const detected = this.isFlashWick(pctDiff, i);
      if (detected) {
        return detected;
      }
    }

    return false;
  }

  detectFlashWickPerMinute() {
    let detected = false;

    if (!this.staleMinute) {
      return detected;
    }

    if (!this.minutesUpdated) {
      return detected;
    }

    if (this.minutes.length < this.historySize) {
      return detected;
    }
    if (!this.isConcurrentMinutes()) {
      return detected;
    }

    const minutes = [...this.minutes];
    if (!minutes.length) {
      minutes.push(this.staleMinute);
    }
    const current = minutes[0];
    for (let i = 0; i < minutes.length; i++) {
      const previous = minutes[i];

      const pctDiff = current.close / previous.open;

      detected = this.isFlashWick(pctDiff, i);
      if (detected) {
        break;
      }
    }

    return detected;
  }

  isFlashWick(pctDiff: number, minuteCount: number) {
    if (this.flashWickRatio > 1 && pctDiff > this.flashWickRatio) {
      this.d(
        'Flash wick detected: %d in %d minutes - %o',
        pctDiff,
        minuteCount + 1,
        new Date()
      );
      return true;
    }
    if (this.flashWickRatio < 1 && pctDiff < this.flashWickRatio) {
      this.d(
        'Reverse flash wick detected: %d in %d minutes - %o',
        pctDiff,
        minuteCount + 1,
        new Date()
      );
      return true;
    }
    return false;
  }

  getHistory() {
    return this.minutes.map((m) => ({ ...m }));
  }

  getConfLine() {
    const data = this.getConfData();
    return `${data.type}-${data.config}`;
  }

  getConfData() {
    return {
      type: 'price',
      pair: this.pair,
      config: `${this.realtimeDetection ? 'true' : 'false'},${
        this.followBtcTrend ? 'true' : 'false'
      },${this.flashWickRatio},${this.historySize},${confLine(
        this.tradeDriverOpts
      )}`,
    };
  }

  getTradeDriverOpts() {
    return { ...this.tradeDriverOpts };
  }
}
