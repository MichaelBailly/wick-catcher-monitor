export class BinanceTransactionError extends Error {
  response: Response;
  body: string | null = null;
  constructor(message: string, response: Response) {
    super(message);
    Object.setPrototypeOf(this, BinanceTransactionError.prototype);

    this.name = 'BinanceTransactionError';
    this.response = response;
  }
}
