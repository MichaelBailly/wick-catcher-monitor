import debug from 'debug';
import { randomUUID } from 'node:crypto';
import { BINANCE_KEY, BINANCE_SECRET } from '../config';
import { BinanceOrderResponse } from '../types/BinanceOrderResponse';
import { IKline } from '../types/IKline';
import { MarketWatcher } from '../types/MarketWatcher';
import { MarketWatcherConfData } from '../types/MarketWatcherConfData';
import { SimulationResponse } from '../types/SimulationResponse';
import { TradeDriverOpts } from '../types/TradeDriverOpts';
import { TradeInfo } from '../types/TradeInfo';
import { TradeResult } from '../types/TradeResult';
import { TradeDriverBuyError } from './tradeDriver/TradeDriverBuyError';
import { TradeDriverSellError } from './tradeDriver/TradeDriverSellError';
import { TradeDriverTransactionError } from './tradeDriver/TradeDriverTransactionError';
import { buy } from './tradeDriver/buyTransaction';
import { sell } from './tradeDriver/sellTransaction';

enum TradeState {
  NONE,
  BUY,
  BOUGHT,
  SELL,
  SOLD,
}

const simulationPromise = async (
  driver: TradeDriver
): Promise<{
  price: number;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        price: driver.lastKline.close,
      });
    }, 3000);
  });
};

export class TradeDriver {
  pair: string;
  history: IKline[];
  confLine: string;
  confData: MarketWatcherConfData;
  state: TradeState = TradeState.NONE;
  /**
   * @description Most recent kline entry. Also used by tradeDriverTransaction
   */
  lastKline: IKline;
  highestPrice: number = 0;
  trailingActivated: boolean = false;
  tradeInfo: TradeInfo = {
    id: randomUUID(),
    amount: 0,
    quoteAmount: 0,
    price: 0,
    buyTimestamp: 0,
    boughtTimestamp: 0,
    sellTimestamp: 0,
    low: 0,
  };
  soldCallback: (response: TradeResult | TradeDriverTransactionError) => void;
  info: debug.Debugger;
  debug: debug.Debugger;
  error: debug.Debugger;
  sellTimeoutId: NodeJS.Timeout | null = null;
  isProduction: boolean = BINANCE_KEY && BINANCE_SECRET ? true : false;
  simulation: SimulationResponse = {
    quoteAmount: 0,
    price: 0,
    soldAmount: 0,
    soldPrice: 0,
  };
  binanceBuyTransaction: BinanceOrderResponse | null = null;
  binanceSellTransaction: BinanceOrderResponse | null = null;

  /**
   * @description number of $ to buy. Used by tradeDriverTransaction
   */
  quoteAmount: number;
  stopLossRatio: number;
  trailingLimitRatio: number;
  stopInhibitDelay: number;
  sellAfter: number;
  sellDirect: boolean = false;
  priceRatio: any;
  dynamicStopLoss: number;
  dynamicStopLossRatio: number;

  /**
   * @description If true, the trade driver will only buy and never sell
   */
  buyOnly: boolean = false;

  constructor(
    marketWatcher: MarketWatcher,
    onSold: (trade: TradeResult | TradeDriverTransactionError) => void,
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
    this.sellAfter = opts?.sellAfter || 1000 * 60 * 60;
    this.sellDirect = opts?.sellDirect || false;
    this.priceRatio = opts?.priceRatio || 1.05;
    this.dynamicStopLoss = opts?.dynamicStopLoss || 0;
    this.dynamicStopLossRatio = opts?.dynamicStopLossRatio || 0.9;
    this.buyOnly = opts?.buyOnly || false;
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

  async buy() {
    if (this.state !== TradeState.NONE) {
      return;
    }

    this.state = TradeState.BUY;
    this.info('%o - buy - %s', new Date(), this.confLine);
    this.tradeInfo.buyTimestamp = Date.now();

    if (!this.isProduction) {
      await this.buyUsingSimulation();
    } else {
      await this.buyUsingExchange();
    }
  }

  async buyUsingSimulation() {
    const { price } = await simulationPromise(this);
    this.onBought(this.quoteAmount, price, Date.now());
  }

  async buyUsingExchange() {
    const [exchangeResponse, simulationResponse] = await Promise.allSettled([
      buy(this),
      simulationPromise(this),
    ]);

    if (exchangeResponse.status === 'rejected') {
      return this.soldCallback(
        new TradeDriverBuyError('buy error', exchangeResponse.reason)
      );
    } else if (simulationResponse.status === 'rejected') {
      return this.soldCallback(
        new TradeDriverBuyError('buy error', simulationResponse.reason)
      );
    }

    this.simulation.quoteAmount = this.quoteAmount;
    this.simulation.price = simulationResponse.value.price;
    this.binanceBuyTransaction = exchangeResponse.value.response;
    this.onBought(
      exchangeResponse.value.executedQuoteAmount,
      exchangeResponse.value.price,
      exchangeResponse.value.doneTimestamp
    );
  }

  onBought(
    quoteAmount: number,
    price: number,
    boughtTimestamp: number = Date.now()
  ) {
    if (this.state !== TradeState.BUY) {
      return;
    }
    this.state = TradeState.BOUGHT;
    const amount = quoteAmount / price;
    this.info(
      '%o - Bought %s price:%d amount:%d quoteAmount:%d',
      new Date(),
      this.pair,
      price,
      amount,
      quoteAmount
    );
    this.tradeInfo = {
      ...this.tradeInfo,
      amount,
      quoteAmount,
      price,
      boughtTimestamp,
      low: price * this.stopLossRatio,
    };

    if (this.buyOnly) {
      this.state = TradeState.SELL;
      this.onSold(this.tradeInfo.amount, price, Date.now(), 'buyOnly');
      return;
    }

    this.sellTimeoutId = setTimeout(() => {
      this.info('%o - sell trigger. Reason: timeout', new Date());
      this.sell();
    }, 1000 * 60 * 60);
  }

  async sell() {
    if (this.state !== TradeState.BOUGHT) {
      return;
    }
    this.state = TradeState.SELL;
    this.info(
      '%o - sell. current price=%d - %s',
      new Date(),
      this.lastKline.close,
      this.confLine
    );
    this.tradeInfo.sellTimestamp = Date.now();

    if (!this.isProduction) {
      await this.sellUsingSimulation();
    } else {
      await this.sellUsingExchange();
    }

    if (this.sellTimeoutId !== null) {
      clearTimeout(this.sellTimeoutId);
      this.sellTimeoutId = null;
    }
  }

  async sellUsingSimulation() {
    const { price } = await simulationPromise(this);
    this.onSold(this.tradeInfo.amount, price, Date.now());
  }

  async sellUsingExchange() {
    const [exchangeResponse, simulationResponse] = await Promise.allSettled([
      sell(this),
      simulationPromise(this),
    ]);

    if (exchangeResponse.status === 'rejected') {
      return this.soldCallback(
        new TradeDriverSellError('sell error', exchangeResponse.reason)
      );
    } else if (simulationResponse.status === 'rejected') {
      return this.soldCallback(
        new TradeDriverSellError('sell error', simulationResponse.reason)
      );
    }

    this.simulation.soldAmount = this.tradeInfo.amount;
    this.simulation.soldPrice = simulationResponse.value.price;
    this.binanceSellTransaction = exchangeResponse.value.response;
    this.onSold(
      exchangeResponse.value.amount,
      exchangeResponse.value.price,
      exchangeResponse.value.doneTimestamp
    );
  }

  onSold(
    amount: number,
    price: number,
    soldTimestamp: number = Date.now(),
    strategy: string | undefined = undefined
  ) {
    if (this.state !== TradeState.SELL) {
      return;
    }
    this.state = TradeState.SOLD;
    const quoteAmount = amount * price;
    this.info(
      '%o - Sold %s %d %d %d',
      new Date(),
      this.pair,
      price,
      amount,
      quoteAmount
    );
    const pnl = quoteAmount - this.tradeInfo.quoteAmount;
    this.info('trade pnl:', pnl);
    const tradeResult: TradeResult = {
      ...this.tradeInfo,
      pair: this.pair,
      soldAmount: amount,
      soldPrice: price,
      soldTimestamp,
      sellStrategy: strategy,
    };
    if (
      this.isProduction &&
      this.binanceBuyTransaction &&
      this.binanceSellTransaction
    ) {
      tradeResult.details = {
        simulation: this.simulation,
        buyTransaction: this.binanceBuyTransaction,
        sellTransaction: this.binanceSellTransaction,
      };
    }
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

    if (this.tradeInfo.boughtTimestamp + this.sellAfter < Date.now()) {
      this.info('sell trigger. Reason: sellAfter reached');
      return this.sell();
    }

    if (this.tradeInfo.boughtTimestamp >= Date.now() - this.stopInhibitDelay) {
      if (msg.close < this.tradeInfo.low) {
        this.info('sell trigger. Reason: price below low (stop loss)');
        return this.sell();
      }
    }

    if (msg.close < this.tradeInfo.price) {
      return;
    }

    const priceRatio = msg.close / this.tradeInfo.price;

    if (this.dynamicStopLoss > 0 && priceRatio > this.dynamicStopLoss) {
      const newLow = this.tradeInfo.price * this.dynamicStopLossRatio;
      if (newLow > this.tradeInfo.low) {
        this.tradeInfo.low = this.tradeInfo.price * this.dynamicStopLossRatio;
        this.info(
          'dynamic stop loss: adjust stop loss to %d',
          this.tradeInfo.low
        );
      }
    }

    if (this.trailingActivated) {
      const highestPriceRelative = this.highestPrice / this.tradeInfo.price;
      const trailingLimit =
        highestPriceRelative === 0
          ? +Infinity
          : (msg.close - this.tradeInfo.price) / highestPriceRelative;
      if (trailingLimit < this.trailingLimitRatio) {
        this.info('sell trigger. Reason: price dropped below trailing limit');
        return this.sell();
      }
      return;
    }

    if (priceRatio >= this.priceRatio) {
      this.info(`Price ratio crossed ${this.priceRatio}`);
      if (this.sellDirect) {
        this.info(
          `sell trigger. Reason: price ratio crossed ${this.priceRatio}`
        );
        return this.sell();
      } else {
        this.trailingActivated = true;
        this.info('trailing activated');
      }
    }
  }
}
