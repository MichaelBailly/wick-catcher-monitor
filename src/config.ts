export const RECORDER_FILE_PATH = process.env.RECORDER_FILE_PATH || '/tmp';
export const XX_REALTIME_PRICE_WATCH =
  process.env.XX_REALTIME_PRICE_WATCH === 'true' ? true : false;
export const XX_FOLLOW_BTC_TREND =
  process.env.XX_FOLLOW_BTC_TREND === 'true' ? true : false;
export const MONGO_DB =
  process.env.MONGO_DB || 'mongodb://localhost:27017/wicks';
export const MONGO_TRADE_COLLECTION =
  process.env.MONGO_TRADE_COLLECTION || 'trades';
export const MONGO_SUMMARY_COLLECTION =
  process.env.MONGO_SUMMARY_COLLECTION || 'summaries';
