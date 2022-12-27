import { ObjectId } from 'mongodb';

export type TradeRecord = {
  _id: ObjectId;
  id: string;
  amount: number;
  quoteAmount: number;
  price: number;
  buyTimestamp: Date;
  boughtTimestamp: Date;
  sellTimestamp: Date;
  soldTimestamp: Date;
  low: number;
  pair: string;
  volumeFamily: string;
  cmcFamily: string;
  soldAmount: number;
  soldPrice: number;
  pnl: number;
  watcher: {
    type: string;
    config: string;
  };
};
