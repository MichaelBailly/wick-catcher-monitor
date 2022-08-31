import BinanceWebSocketKlineEvent from './BinanceWebSocketKlineEvent';

type BinanceWebSocketKlineMessage = {
  stream: string;
  data: BinanceWebSocketKlineEvent;
};

export default BinanceWebSocketKlineMessage;
