## Automatic trading tool

```bash
DEBUG="*,-*:debug" npm run dev
```

## Environment variables

### Trade driver

- MAX_CONCURRENT_TRADES="3" : maximum number of concurrent trades. not set = no limit
- BINANCE_API_KEY="xxx" : binance api key. If set, switch tradeDriver to real mode (will issue orders)
- BINANCE_API_SECRET="xxx" : binance api secret

### Files & Database (daemon & db updater)

- RECORDER_FILE_PATH="/tmp" : folder to write trade and daily summary files
- MONGO_REFERENCES_DB="mongodb://localhost:27017/references" : MongoDB connection URI of references database
- MONGO_VOLUME_COLLECTION="volume" : name of volume collection

### Files & Database (db updater)

- MONGO_DB="mongodb://localhost:27017/wicks" : MongoDB connection URI -> https://www.mongodb.com/docs/manual/reference/connection-string/
- MONGO_TRADE_COLLECTION="trades" : name of MongoDB collection to store trades

## Magic files

- **prevent_trade** : do not take any new trade. Checked every 5 minutes
