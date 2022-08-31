import { BinanceWebSocketKlineEvent } from './BinanceWebSocketKlineEvent';

export type BinanceWebSocketKlineMessage = {
  stream: string;
  data: BinanceWebSocketKlineEvent;
};
