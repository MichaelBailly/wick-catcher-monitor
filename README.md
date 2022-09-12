## Automatic trading tool

```bash
DEBUG="*,-*:debug" npm run dev
```

## Environment variables

- XX_REALTIME_PRICE_WATCH="true" : PriceMarketWatcher will look at the data in real time, not once every minute
- XX_FOLLOW_BTC_TREND="true" : No trade will be opened if BTC trend is down
