import debug from 'debug';
import { randomUUID } from 'node:crypto';
import { BuyTradeInfo } from '../types/BuyTradeInfo';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';
import { MarketWatcherConfData } from '../types/MarketWatcherConfData';
import { TradeDriverOpts } from '../types/TradeDriverOpts';
import { TradeResult } from '../types/TradeResult';

enum TradeState {
  NONE,
  BUY,
  BOUGHT,
  SELL,
  SOLD,
}

export class TradeDriver {
  pair: string;
  history: IKline[];
  confLine: string;
  confData: MarketWatcherConfData;
  state: TradeState = TradeState.NONE;
  lastKline: IKline;
  highestPrice: number = 0;
  trailingActivated: boolean = false;
  buyTradeinfo: BuyTradeInfo = {
    id: randomUUID(),
    amount: 0,
    quoteAmount: 0,
    price: 0,
    buyTimestamp: 0,
    boughtTimestamp: 0,
    sellTimestamp: 0,
    soldTimestamp: 0,
    low: 0,
  };
  soldCallback: (trade: TradeResult) => void;
  info: debug.Debugger;
  debug: debug.Debugger;
  error: debug.Debugger;
  sellTimeoutId: NodeJS.Timeout | null = null;

  quoteAmount: number;
  stopLossRatio: number;
  trailingLimitRatio: number;
  stopInhibitDelay: number;
  sellAfter: number;
  sellDirect: boolean = false;

  constructor(
    marketWatcher: MarketWatcher,
    onSold: (trade: TradeResult) => void,
    opts?: TradeDriverOpts
  ) {
    this.pair = marketWatcher.pair;
    this.soldCallback = onSold;
    this.history = marketWatcher.getHistory();
    this.confLine = marketWatcher.getConfLine();
    this.confData = marketWatcher.getConfData();
    this.quoteAmount = opts?.quoteAmount || 100;
    this.stopLossRatio = opts?.stopLossRatio || 0.98;
    this.trailingLimitRatio = opts?.trailingLimitRatio || 0.85;
    this.stopInhibitDelay = opts?.stopInhibitDelay || 0;
    this.sellAfter = opts?.sellAfter || +Infinity;
    this.sellDirect = opts?.sellDirect || false;
    this.lastKline = this.history[0];
    this.info = debug(`tradeDriver:${this.pair}:info`);
    this.debug = debug(`tradeDriver:${this.pair}:debug`);
    this.error = debug(`tradeDriver:${this.pair}:error`);
  }

  start() {
    if (this.state !== TradeState.NONE) {
      return;
    }
    this.buy();
  }

  buy() {
    if (this.state !== TradeState.NONE) {
      return;
    }
    this.state = TradeState.BUY;
    this.info('%s - buy - %s', new Date().toISOString(), this.confLine);
    this.buyTradeinfo.buyTimestamp = Date.now();
    setTimeout(() => {
      this.state = TradeState.BOUGHT;
      this.onBought(this.quoteAmount, this.lastKline.close);
    }, 3000);
  }

  onBought(quoteAmount: number, price: number) {
    const amount = quoteAmount / price;
    this.info(
      '%s - Bought %s price:%d amount:%d quoteAmount:%d',
      new Date().toISOString(),
      this.pair,
      price,
      amount,
      quoteAmount
    );
    this.buyTradeinfo = {
      ...this.buyTradeinfo,
      amount,
      quoteAmount,
      price,
      boughtTimestamp: Date.now(),
      low: price * this.stopLossRatio,
    };

    this.sellTimeoutId = setTimeout(() => {
      this.info('%s - sell trigger. Reason: timeout', new Date().toISOString());
      this.sell();
    }, 1000 * 60 * 60);
  }

  sell() {
    if (this.state !== TradeState.BOUGHT) {
      return;
    }
    this.state = TradeState.SELL;
    this.info(
      '%s - sell. current price=%d - %s',
      new Date().toISOString(),
      this.lastKline.close,
      this.confLine
    );
    this.buyTradeinfo.sellTimestamp = Date.now();
    setTimeout(() => {
      this.state = TradeState.SOLD;
      this.onSold(this.buyTradeinfo.amount, this.lastKline.close);
    }, 3000);

    if (this.sellTimeoutId !== null) {
      clearTimeout(this.sellTimeoutId);
      this.sellTimeoutId = null;
    }
  }

  onSold(amount: number, price: number) {
    const quoteAmount = amount * price;
    this.info(
      '%s - Sold %s %d %d %d',
      new Date().toISOString(),
      this.pair,
      price,
      amount,
      quoteAmount
    );
    this.buyTradeinfo.soldTimestamp = Date.now();
    const pnl = quoteAmount - this.buyTradeinfo.quoteAmount;
    this.info('trade pnl:', pnl);
    const tradeResult: TradeResult = {
      ...this.buyTradeinfo,
      pair: this.pair,
      soldAmount: amount,
      soldPrice: price,
    };
    this.soldCallback(tradeResult);
  }

  onKlineMessage(msg: IKline) {
    this.lastKline = msg;

    if (this.state !== TradeState.BOUGHT) {
      return;
    }

    if (this.highestPrice < msg.close) {
      this.highestPrice = msg.close;
    }

    if (this.buyTradeinfo.boughtTimestamp + this.sellAfter < Date.now()) {
      this.info('sell trigger. Reason: sellAfter reached');
      return this.sell();
    }

    if (
      this.buyTradeinfo.boughtTimestamp >=
      Date.now() - this.stopInhibitDelay
    ) {
      if (msg.close < this.buyTradeinfo.low) {
        this.info('sell trigger. Reason: price below low (stop loss)');
        return this.sell();
      }
    }

    if (msg.close < this.buyTradeinfo.price) {
      return;
    }

    const priceRatio = msg.close / this.buyTradeinfo.price;

    if (this.trailingActivated) {
      const highestPriceRelative = this.highestPrice / this.buyTradeinfo.price;
      const trailingLimit =
        highestPriceRelative === 0
          ? +Infinity
          : (msg.close - this.buyTradeinfo.price) / highestPriceRelative;
      if (trailingLimit < this.trailingLimitRatio) {
        this.info('sell trigger. Reason: price dropped below trailing limit');
        return this.sell();
      }
      return;
    }

    if (priceRatio >= 1.05) {
      this.info('Price ratio crossed 1.05');
      if (this.sellDirect) {
        this.info('sell trigger. Reason: price ratio crossed 1.05');
        return this.sell();
      } else {
        this.trailingActivated = true;
        this.info('trailing activated');
      }
    }
  }
}
