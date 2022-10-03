export const RECORDER_FILE_PATH = process.env.RECORDER_FILE_PATH || '/tmp';
export const XX_REALTIME_PRICE_WATCH =
  process.env.XX_REALTIME_PRICE_WATCH === 'true' ? true : false;
export const XX_FOLLOW_BTC_TREND =
  process.env.XX_FOLLOW_BTC_TREND === 'true' ? true : false;
export const MONGO_DB =
  process.env.MONGO_DB || 'mongodb://localhost:27017/wicks';
export const MONGO_TRADE_COLLECTION =
  process.env.MONGO_TRADE_COLLECTION || 'trades';
export const STOPLOSS_RATIO = parseFloat(process.env.STOPLOSS_RATIO || '0.85');
export const TRAILING_RATIO = parseFloat(process.env.TRAILING_RATIO || '1.05');
export const MAX_CONCURRENT_TRADES = parseInt(
  process.env.MAX_CONCURRENT_TRADES || '0'
);

const dsl = (
  process.env.DYNAMIC_STOP_LOSS && process.env.DYNAMIC_STOP_LOSS.length
    ? process.env.DYNAMIC_STOP_LOSS.split(' ')
    : ['0']
).map((s) => parseFloat(s));
if (dsl.length === 0) {
  dsl.push(0);
}
if (dsl.length === 1) {
  dsl.push(0.9);
}

export const DYNAMIC_STOP_LOSS = dsl[0];
export const DYNAMIC_STOP_LOSS_RATIO = dsl[1];

export const BINANCE_KEY = process.env.BINANCE_KEY || null;
export const BINANCE_SECRET = process.env.BINANCE_SECRET || null;
