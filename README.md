## Automatic trading tool

```bash
DEBUG="*,-*:debug" npm run dev
```

## Environment variables

### Watchers

- XX_REALTIME_PRICE_WATCH="true" : PriceMarketWatcher will look at the data in real time, not once every minute
- XX_FOLLOW_BTC_TREND="true" : No trade will be opened if BTC trend is down

### Trade driver

- STOPLOSS_RATIO="0.85" : percentage down triggering sell
- TRAILING_RATIO="0.05" : percentage up enabling the sell trailing limit
- MAX_CONCURRENT_TRADES="3" : maximum number of concurrent trades. 0 for no limit
- DYNAMIC_STOP_LOSS="1.03 0.9" : if price ratio reaches first number, set stop loss to second number

### Files & Database (updater)

- RECORDER_FILE_PATH="/tmp" : folder to write trade and daily summary files
- MONGO_DB="mongodb://localhost:27017/wicks" : MongoDB connection URI -> https://www.mongodb.com/docs/manual/reference/connection-string/
- MONGO_TRADE_COLLECTION="trades" : name of MongoDB collection to store trades
- MONGO_SUMMARY_COLLECTION="summaries" : name of MongoDB collection to store daily summaries

## Magic files

- **prevent_trade** : do not take any new trade. Checked every 30 minutes
