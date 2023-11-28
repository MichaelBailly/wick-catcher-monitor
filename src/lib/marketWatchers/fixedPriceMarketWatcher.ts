import debug, { Debugger } from 'debug';
import { FixedPriceMarketWatcherOpts } from '../../types/FixedPriceMarketWatcherOpts';
import { IKline } from '../../types/IKline';
import { MarketWatcher } from '../../types/MarketWatcher';
import { TradeDriverOpts } from '../../types/TradeDriverOpts';
import { fixedPriceEvents } from '../fixedPrice';
import { confLine } from './utils';

export class FixedPriceMarketWatcher implements MarketWatcher {
  pair: string;
  d: Debugger;
  e: Debugger;
  minutes: IKline[] = [];
  historySize: number;
  followBtcTrend: boolean = false;
  realtimeDetection: boolean = true;
  tradeDriverOpts: TradeDriverOpts;
  configLine: string;
  buyPrice: number = 0;
  buyOrderSent: boolean = false;

  constructor(
    pair: string,
    opts?: FixedPriceMarketWatcherOpts,
    tradeDriverOpts: TradeDriverOpts = {}
  ) {
    this.pair = pair;
    this.d = debug(`lib:FixedPriceMarketWatcher:${this.pair}`);
    this.e = debug(`lib:FixedPriceMarketWatcher:${this.pair}:error`);
    this.historySize = 0;
    this.tradeDriverOpts = { ...tradeDriverOpts };
    this.configLine = `${this.historySize},${confLine(this.tradeDriverOpts)}`;
    this.startListening();
  }

  startListening() {
    fixedPriceEvents.on(`${this.pair}-fixedPrice-new`, (data) => {
      this.d(`${this.pair}: New fixed price for ${data.symbol}: ${data.price}`);
      if (data.symbol === this.pair) {
        this.d(
          `New fixed price and/or amount for ${data.symbol}: ${data.price} ${data.amount}`
        );
        this.buyPrice = data.price;
        this.tradeDriverOpts.quoteAmount = data.amount;
        this.buyOrderSent = false;
      }
    });
    fixedPriceEvents.on(`${this.pair}-fixedPrice-updated`, (data) => {
      if (data.symbol === this.pair) {
        this.d(
          `Updated fixed price and/or amount for ${data.symbol}: ${data.price} ${data.amount}`
        );
        this.buyPrice = data.price;
        this.tradeDriverOpts.quoteAmount = data.amount;
        this.buyOrderSent = false;
      }
    });
    fixedPriceEvents.on(`${this.pair}-fixedPrice-removed`, (data) => {
      if (data.symbol === this.pair) {
        this.d(`Removed fixed price for ${data.symbol}`);
        this.buyPrice = 0;
      }
    });
  }

  getHistory() {
    return this.minutes;
  }

  getConfLine() {
    return this.configLine;
  }

  getConfData() {
    return {
      type: 'fixedPrice',
      pair: this.pair,
      config: this.configLine,
    };
  }

  getTradeDriverOpts() {
    return this.tradeDriverOpts;
  }

  onKlineMessage(msg: IKline) {
    this.minutes = [msg];
  }

  detectFlashWick() {
    if (this.buyOrderSent) {
      return false;
    }

    const detected =
      this.buyPrice > 0 &&
      this.minutes.length > 0 &&
      this.buyPrice > this.minutes[0].close;

    if (detected) {
      this.buyOrderSent = detected;
    }

    return detected;
  }
}
