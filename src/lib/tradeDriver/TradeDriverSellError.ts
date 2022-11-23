export class TradeDriverSellError extends Error {
  parent: Error;
  constructor(message: string, parent: Error) {
    super(message);
    Object.setPrototypeOf(this, TradeDriverSellError.prototype);

    this.name = 'TradeDriverSellError';
    this.parent = parent;
  }
}
