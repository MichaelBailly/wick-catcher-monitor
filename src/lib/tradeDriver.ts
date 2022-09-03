import { BuyTradeInfo } from '../types/BuyTradeInfo';
import { IKline } from '../types/IKline';
import { MarketMemory } from './marketMemory';

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
  constructor(
    marketMemory: MarketMemory,
    onSold: (trade: BuyTradeInfo, amount: number, price: number) => void,
    opts?: {
      quoteAmount?: number;
      stopLossRatio?: number;
      trailingLimitRatio?: number;
    }
  ) {
    this.pair = marketMemory.pair;
    this.soldCallback = onSold;
    this.history = marketMemory.getHistory();
    this.confLine = marketMemory.getConfLine();
    this.quoteAmount = opts?.quoteAmount || 100;
    this.stopLossRatio = opts?.stopLossRatio || 0.98;
    this.trailingLimitRatio = opts?.trailingLimitRatio || 0.85;
    this.lastKline = this.history[0];
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
    setTimeout(() => {
      this.state = TradeState.BOUGHT;
      this.onBought(this.quoteAmount, this.lastKline.close);
    }, 3000);
  }

  onBought(quoteAmount: number, price: number) {
    const amount = quoteAmount / price;
    console.log('Bought', this.pair, amount, quoteAmount, price);
    this.buyTradeinfo = {
      amount,
      quoteAmount,
      price,
      timestamp: Date.now(),
      low: price * this.stopLossRatio,
    };
  }

  sell() {
    if (this.state !== TradeState.BOUGHT) {
      return;
    }
    this.state = TradeState.SELL;
    setTimeout(() => {
      this.state = TradeState.SOLD;
      this.onSold(this.buyTradeinfo.amount, this.lastKline.close);
    }, 3000);
  }

  onSold(amount: number, price: number) {
    const quoteAmount = amount * price;
    console.log('Sold', this.pair, amount, quoteAmount, price);
    const pnl = quoteAmount - this.buyTradeinfo.quoteAmount;
    console.log('trade pnl:', pnl);
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

    if (msg.close < this.buyTradeinfo.low) {
      return this.sell();
    }

    if (msg.close < this.buyTradeinfo.price) {
      return;
    }

    const highestPriceRelative = this.highestPrice / this.buyTradeinfo.price;
    if (
      highestPriceRelative !== 0 &&
      (msg.close - this.buyTradeinfo.price) / highestPriceRelative <
        this.trailingLimitRatio
    ) {
      return this.sell();
    }
  }
}
