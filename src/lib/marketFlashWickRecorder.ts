import { format } from 'date-fns';
import { appendFile } from 'node:fs/promises';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';

const ONE_HOUR = 60 * 60 * 1000;

export class MarketFlashWickRecorder {
  pair: string;
  history: IKline[];
  recordLength: number;
  recordUntil: number;
  klineRecords: IKline[] = [];
  close: () => void;
  fileName: string;
  marketMemoryConfLine: string;

  constructor(
    private marketMemory: MarketWatcher,
    closeCallback: () => void,
    opts?: { recordLength?: number; filePath?: string }
  ) {
    this.pair = marketMemory.pair;
    this.close = closeCallback;
    this.history = marketMemory.getHistory();
    this.recordLength = opts?.recordLength || ONE_HOUR;
    this.recordUntil = Date.now() + this.recordLength;
    this.marketMemoryConfLine = marketMemory.getConfLine();

    const filePath = opts?.filePath || `/tmp`;
    this.fileName = `${filePath}/${this.marketMemoryConfLine}-${format(
      new Date(),
      'yyyyMMdd-HHmm'
    )}.json`;
  }

  onKlineMessage(msg: IKline) {
    if (Date.now() > this.recordUntil) {
      appendFile(
        this.fileName,
        JSON.stringify({
          pair: this.pair,
          history: this.history,
          record: this.klineRecords,
        })
      );
      this.close();
    } else {
      this.klineRecords.push(msg);
    }
  }
}
