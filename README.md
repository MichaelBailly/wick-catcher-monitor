## Automatic trading tool

```bash
DEBUG="*,-*:debug" npm run dev
```

## Environment variables

- XX_REALTIME_PRICE_WATCH="true" : PriceMarketWatcher will look at the data in real time, not once every minute
- XX_FOLLOW_BTC_TREND="true" : No trade will be opened if BTC trend is down
- MONGO_DB="mongodb://localhost:27017/wicks" : MongoDB connection URI -> https://www.mongodb.com/docs/manual/reference/connection-string/
- MONGO_TRADE_COLLECTION="trades" : name of MongoDB collection to store trades
- MONGO_SUMMARY_COLLECTION="summaries" : name of MongoDB collection to store daily summaries
