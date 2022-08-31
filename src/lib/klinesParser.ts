import { BinanceWebSocketKlineMessage } from '../types/BinanceWebSocketKlineMessage';

export function binanceKlineMessageToITick(
  message: BinanceWebSocketKlineMessage
) {
  return {
    start: message.data.k.t,
    end: message.data.k.T,
    open: parseFloat(message.data.k.o),
    close: parseFloat(message.data.k.c),
    high: parseFloat(message.data.k.h),
    low: parseFloat(message.data.k.l),
    volume: parseFloat(message.data.k.v),
  };
}
