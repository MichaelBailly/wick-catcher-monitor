import debug from 'debug';
import { BuyTradeInfo } from '../types/BuyTradeInfo';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';

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
  quoteAmount: number;
  state: TradeState = TradeState.NONE;
  lastKline: IKline;
  stopLossRatio: number;
  trailingLimitRatio: number;
  highestPrice: number = 0;
  buyTradeinfo: BuyTradeInfo = {
    amount: 0,
    quoteAmount: 0,
    price: 0,
    timestamp: 0,
    low: 0,
  };
  soldCallback: (trade: BuyTradeInfo, amount: number, price: number) => void;
  info: debug.Debugger;
  debug: debug.Debugger;
  error: debug.Debugger;
  sellTimeoutId: NodeJS.Timeout | null = null;
  stopInhibitDelay: number;
  sellAfter: number;
  constructor(
    marketMemory: MarketWatcher,
    onSold: (trade: BuyTradeInfo, amount: number, price: number) => void,
    opts?: {
      quoteAmount?: number;
      stopLossRatio?: number;
      stopInhibitDelay?: number;
      trailingLimitRatio?: number;
      sellAfter?: number;
    }
  ) {
    this.pair = marketMemory.pair;
    this.soldCallback = onSold;
    this.history = marketMemory.getHistory();
    this.confLine = marketMemory.getConfLine();
    this.quoteAmount = opts?.quoteAmount || 100;
    this.stopLossRatio = opts?.stopLossRatio || 0.98;
    this.trailingLimitRatio = opts?.trailingLimitRatio || 0.85;
    this.stopInhibitDelay = opts?.stopInhibitDelay || 0;
    this.sellAfter = opts?.sellAfter || +Infinity;
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
    this.info('buy');
    setTimeout(() => {
      this.state = TradeState.BOUGHT;
      this.onBought(this.quoteAmount, this.lastKline.close);
    }, 3000);
  }

  onBought(quoteAmount: number, price: number) {
    const amount = quoteAmount / price;
    this.info(
      'Bought %s price:%d amount:%d quoteAmount:%d',
      this.pair,
      price,
      amount,
      quoteAmount
    );
    this.buyTradeinfo = {
      amount,
      quoteAmount,
      price,
      timestamp: Date.now(),
      low: price * this.stopLossRatio,
    };

    this.sellTimeoutId = setTimeout(() => {
      this.info('sell trigger. Reason: timeout');
      this.sell();
    }, 1000 * 60 * 60);
  }

  sell() {
    if (this.state !== TradeState.BOUGHT) {
      return;
    }
    this.state = TradeState.SELL;
    this.info('sell. current price=%d', this.lastKline.close);
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
    this.info('Sold %s %d %d %d', this.pair, price, amount, quoteAmount);
    const pnl = quoteAmount - this.buyTradeinfo.quoteAmount;
    this.info('trade pnl:', pnl);
    this.soldCallback(this.buyTradeinfo, amount, price);
  }

  onKlineMessage(msg: IKline) {
    this.lastKline = msg;

    if (this.state !== TradeState.BOUGHT) {
      return;
    }

    if (this.highestPrice < msg.close) {
      this.highestPrice = msg.close;
    }

    if (this.buyTradeinfo.timestamp + this.sellAfter < Date.now()) {
      this.info('sell trigger. Reason: sellAfter reached');
      return this.sell();
    }

    if (this.buyTradeinfo.timestamp >= Date.now() - this.stopInhibitDelay) {
      if (msg.close < this.buyTradeinfo.low) {
        this.info('sell trigger. Reason: price below low (stop loss)');
        return this.sell();
      }
    }

    if (msg.close < this.buyTradeinfo.price) {
      return;
    }

    const highestPriceRelative = this.highestPrice / this.buyTradeinfo.price;
    if (
      msg.close / this.buyTradeinfo.price >= 1.05 &&
      highestPriceRelative !== 0 &&
      (msg.close - this.buyTradeinfo.price) / highestPriceRelative <
        this.trailingLimitRatio
    ) {
      this.info('sell trigger. Reason: price dropped below trailing limit');
      return this.sell();
    }
  }
}
