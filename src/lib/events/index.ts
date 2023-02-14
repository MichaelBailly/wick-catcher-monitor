import { EventEmitter } from 'node:events';

export const events = new EventEmitter();
/*
events.on('error', (err) => {
  console.error('Events: An error occurred:', err);
});
*/
export const TRADE_END_EVENT = 'tradeEnd';
