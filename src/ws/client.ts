import WebSocket from 'ws';
import debug from 'debug';
import BinanceWebSocketKlineMessage from '../types/BinanceWebSocketKlineMessage';

const d = debug('ws:client');

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

    this._ws.onopen = () => {
      d('ws connected');
    };

    this._ws.on('pong', () => {
      d('receieved pong from server');
    });
    this._ws.on('ping', () => {
      d('==========receieved ping from server');
      this._ws && this._ws.pong();
    });

    this._ws.onclose = () => {
      d('ws closed');
    };

    this._ws.onerror = (err) => {
      d('ws error', err);
      this.start();
    };

    this._ws.onmessage = (msg: any) => {
      d('message %O', msg.data);
      try {
        const handlerMessage: BinanceWebSocketKlineMessage = JSON.parse(
          msg.data
        );
        if (
          handlerMessage.data.e &&
          this._handlers.has(handlerMessage.data.e)
        ) {
          const _handlers = this._handlers.get(handlerMessage.data.e);
          if (Array.isArray(_handlers)) {
            _handlers.forEach((cb: Function) => {
              cb(handlerMessage);
            });
          }
        } else {
          d('Unknown method');
        }
      } catch (e) {
        d('Parse message failed %O', e);
      }
    };

    this.heartBeat();
  }

  isMultiStream(message: any) {
    return message.stream && this._handlers.has(message.stream);
  }

  heartBeat() {
    setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.ping();
        d('ping server');
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
