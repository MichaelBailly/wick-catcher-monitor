import debug, { Debugger } from 'debug';
import { IKline } from '../../types/IKline';

export class VolumeMarketWatcher {
  pair: string;
  d: Debugger;
  e: Debugger;
  staleMinute: IKline | null = null;
  /**
   * Array of 5 last minutes ITicks. 0 is the most recent tick.
   */
  minutes: IKline[] = [];
  maxVolume: number = 0;
  minutesUpdated: boolean = false;
  historySize: number = 45;
  volumeThresholdRatio: number = 40;

  constructor(
    pair: string,
    opts?: {
      volumeThresholdRatio?: number;
      historySize?: number;
    }
  ) {
    this.pair = pair;
    this.d = debug(`lib:VolumeMarketWatcher:${this.pair}`);
    this.e = debug(`lib:VolumeMarketWatcher:${this.pair}:error`);

    if (opts?.historySize) {
      this.historySize = opts.historySize;
    }
    if (opts?.volumeThresholdRatio) {
      this.volumeThresholdRatio = opts.volumeThresholdRatio;
    }
  }

  onKlineMessage(msg: IKline) {
    if (this.staleMinute === null || this.staleMinute.end > msg.start) {
      this.staleMinute = { ...msg };
      this.minutesUpdated = false;
    } else if (this.staleMinute.end < msg.start) {
      this.minutes.unshift({ ...this.staleMinute });
      this.staleMinute = msg;
      this.maxVolume = Math.max(...this.minutes.map((m) => m.volume));
      this.minutesUpdated = true;
    }

    if (this.minutes.length > this.historySize) {
      this.minutes.pop();
    }
  }

  detectFlashWick(): boolean {
    let detected = false;

    if (this.minutes.length < this.historySize) {
      return detected;
    }

    if (!this.staleMinute) {
      return detected;
    }

    // ensure that current is a positive candle
    if (this.staleMinute.close < this.staleMinute.open) {
      return detected;
    }

    if (this.maxVolume * this.volumeThresholdRatio < this.staleMinute.volume) {
      this.d(
        'Flash Wick detected, average volume: %d, current volume: %d - %s',
        this.maxVolume,
        this.staleMinute.volume,
        new Date().toISOString()
      );
      return true;
    }
    return detected;
  }

  getHistory() {
    return this.minutes.map((m) => ({ ...m }));
  }

  getConfLine() {
    return `volume-${this.pair}-${this.volumeThresholdRatio}-${this.historySize}`;
  }

  getConfData() {
    return {
      type: 'volume',
      pair: this.pair,
      config: `${this.volumeThresholdRatio}-${this.historySize}`,
    };
  }
}