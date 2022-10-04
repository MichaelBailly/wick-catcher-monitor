export type VolumeMarketWatcherOpts = {
  historySize?: number;
  volumeThresholdRatio?: number;
  realtimeDetection?: boolean;
  followBtcTrend?: boolean;
  volumeFamilies?: string[];
};
