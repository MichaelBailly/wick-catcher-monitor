export const RECORDER_FILE_PATH = process.env.RECORDER_FILE_PATH || '/tmp';

export const MONGO_DB =
  process.env.MONGO_DB || 'mongodb://localhost:27017/wicks';
export const MONGO_TRADE_COLLECTION =
  process.env.MONGO_TRADE_COLLECTION || 'trades';
export const MONGO_REFERENCES_DB =
  process.env.MONGO_REFERENCES_DB || 'mongodb://localhost:27017/references';
export const MONGO_VOLUME_COLLECTION =
  process.env.MONGO_VOLUME_COLLECTION || 'volume';
export const MONGO_CMC_COLLECTION = process.env.MONGO_CMC_COLLECTION || 'cmc';

let maxConcurrentTrades;
if (process.env.MAX_CONCURRENT_TRADES) {
  maxConcurrentTrades = parseInt(process.env.MAX_CONCURRENT_TRADES);
} else {
  maxConcurrentTrades = +Infinity;
}
export const MAX_CONCURRENT_TRADES = maxConcurrentTrades;

export const BINANCE_KEY = process.env.BINANCE_KEY || null;
export const BINANCE_SECRET = process.env.BINANCE_SECRET || null;

export const FREE_SMS_API_USER = process.env.FREE_SMS_API_USER || null;
export const FREE_SMS_API_PASSWORD = process.env.FREE_SMS_API_PASSWORD || null;

export const PREDICTION_MODEL = process.env.PREDICTION_MODEL || null;
