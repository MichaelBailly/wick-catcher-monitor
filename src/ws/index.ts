import { binanceKlineMessageToITick } from '../lib/klinesParser';
import { MarketOrchestrator } from '../lib/marketOrchestrator';
import { BinanceWebSocketMessage } from '../types/BinanceWebSocketMessage';
import { IKline } from '../types/IKline';
import SocketClient from './client';

export function start(streamName: string, orchestrators: MarketOrchestrator[]) {
  const socketClient = new SocketClient(
    `${streamName}`,
    'wss://stream.binance.com:9443/'
  );

  socketClient.setHandler('kline', (params: BinanceWebSocketMessage) => {
    const pair = params.data.s;
    const interval = params.stream.split('_').pop() || 'unknown';
    const ikline: IKline = { ...binanceKlineMessageToITick(params), interval };
    // console.log(params.stream, params.data.e, params.data.s, params.data.k.c);
    orchestrators.forEach((orchestrator) => {
      orchestrator.onKline(pair, ikline);
    });
  });

  socketClient.start();

  return socketClient;
}
