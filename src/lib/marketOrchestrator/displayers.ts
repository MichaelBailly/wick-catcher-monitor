import { writeFile } from 'fs/promises';

import { format } from 'date-fns';
import { RECORDER_FILE_PATH } from '../../config';
import { TradeResult } from '../../types/TradeResult';
import { TradeDriver } from '../tradeDriver';
import { getVolumeFamily } from '../volume/volumeReference';

export function recordTradeSummary(
  trade: TradeDriver,
  tradeResult: TradeResult
) {
  const filename = `${RECORDER_FILE_PATH}/trade-${trade.confLine}-${format(
    new Date(),
    'yyyyMMddHHmm'
  )}.json`;
  const volumeFamily = getVolumeFamily(tradeResult.pair) || 'unknown';
  const data = {
    ...tradeResult,
    volumeFamily,
    watcher: {
      type: trade.confData.type,
      config: trade.confData.config,
    },
  };
  writeFile(filename, JSON.stringify(data));
}
