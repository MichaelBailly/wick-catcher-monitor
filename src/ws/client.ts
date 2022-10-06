import debug from 'debug';
import WebSocket from 'ws';
import { BinanceWebSocketKlineMessage } from '../types/BinanceWebSocketKlineMessage';

const d = debug('ws:client:info');
const deb = debug('ws:client:debug');

class SocketClient {
  baseUrl: string;
  private _path: string;
  private _handlers: Map<string, Function[]>;
  private _ws: WebSocket | null = null;
  constructor(path: string, baseUrl: string) {
    this.baseUrl = baseUrl || 'wss://stream.binance.com/';
    this._path = path;
    this._handlers = new Map();
  }

  start() {
    this._ws = new WebSocket(`${this.baseUrl}${this._path}`);
    const ws = this._ws;

    this._ws.onopen = () => {
      d('ws connected');
    };

    /*    this._ws.on('pong', () => {
      d('receieved pong from server');
    });*/
    this._ws.on('ping', () => {
      //      d('==========receieved ping from server');
      this._ws && this._ws.pong();
    });

    this._ws.onclose = () => {
      d('ws closed');
      if (ws === this._ws) {
        this.start();
      }
    };

    this._ws.onerror = (err) => {
      d('ws error %o', err);
      if (ws === this._ws) {
        try {
          this._ws && this._ws.close();
        } catch (e) {
          d('ws close error %o', e);
        }
        this.start();
      }
    };

    this._ws.onmessage = (msg: any) => {
      deb('message %O', msg.data);
      try {
        const handlerMessage: BinanceWebSocketKlineMessage = JSON.parse(
          msg.data
        );

        if (!handlerMessage.data.e) {
          d('Unknown method');
          return;
        }

        const _handlers = this._handlers.get(handlerMessage.data.e) || [];
        for (const handler of _handlers) {
          handler(handlerMessage);
        }
      } catch (e) {
        d('Parse message failed %O', e);
      }
    };

    this.heartBeat();
  }

  heartBeat() {
    setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.ping();
      }
    }, 50000);
  }

  setHandler(method: string, callback: Function) {
    const handlers = this._handlers.get(method) || [];
    handlers.push(callback);
    this._handlers.set(method, handlers);
  }
}

export default SocketClient;
