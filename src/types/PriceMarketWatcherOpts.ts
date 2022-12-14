export type PriceMarketWatcherOpts = {
  flashWickRatio?: number;
  historySize?: number;
  realtimeDetection?: boolean;
  followBtcTrend?: boolean | number;
  volumeFamilies?: string[];
};
