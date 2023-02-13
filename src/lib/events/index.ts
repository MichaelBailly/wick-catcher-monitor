import { EventEmitter } from 'node:events';

class MyEmitter extends EventEmitter {}

export const events = new MyEmitter();

events.on('error', (err) => {
  console.error('Events: An error occurred:', err);
});
