export class TradeDriverBuyError extends Error {
  parent: Error;
  constructor(message: string, parent: Error) {
    super(message);
    Object.setPrototypeOf(this, TradeDriverBuyError.prototype);

    this.name = 'TradeDriverBuyError';
    this.parent = parent;
  }
}
