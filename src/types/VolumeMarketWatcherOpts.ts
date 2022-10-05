export type VolumeMarketWatcherOpts = {
  historySize?: number;
  volumeThresholdRatio?: number;
  realtimeDetection?: boolean;
  followBtcTrend?: boolean | number;
  volumeFamilies?: string[];
};
