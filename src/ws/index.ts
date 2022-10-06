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
    for (const orchestrator of orchestrators) {
      orchestrator.onKline(pair, ikline);
    }
  });

  socketClient.start();

  return socketClient;
}
