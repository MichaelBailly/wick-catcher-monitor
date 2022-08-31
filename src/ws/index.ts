import { binanceKlineMessageToITick } from '../lib/klinesParser';
import { MarketOrchestrator } from '../lib/marketOrchestrator';
import BinanceWebsocketMessage from '../types/BinanceWebSocketMessage';
import IKline from '../types/IKline.type';
import SocketClient from './client';

export function start(streamName: string, orchestrator: MarketOrchestrator) {
  const socketClient = new SocketClient(
    `${streamName}`,
    'wss://stream.binance.com:9443/'
  );

  socketClient.setHandler('kline', (params: BinanceWebsocketMessage) => {
    const pair = params.data.s;
    const interval = params.stream.split('_').pop() || 'unknown';
    const ikline: IKline = { ...binanceKlineMessageToITick(params), interval };
    // console.log(params.stream, params.data.e, params.data.s, params.data.k.c);
    orchestrator.onKline(pair, ikline);
  });

  socketClient.start();

  return socketClient;
}
