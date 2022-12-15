import { writeFile } from 'fs/promises';

import { format } from 'date-fns';
import { RECORDER_FILE_PATH } from '../../config';
import { TradeResult } from '../../types/TradeResult';
import { MarketOrchestrator } from '../marketOrchestrator';
import { TradeDriver } from '../tradeDriver';
import { TradeDriverTransactionError } from '../tradeDriver/TradeDriverTransactionError';
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

export function recordTradeFailure(
  tradeDriver: TradeDriver,
  tradeResult: TradeDriverTransactionError
) {
  const errorFilename = `${RECORDER_FILE_PATH}/trade-transaction-${format(
    new Date(),
    'yyyyMMddHHmm'
  )}.err`;

  const message = [
    `Trade failure: ${tradeResult.message}`,
    `Pair: ${tradeDriver.pair}`,
    `Watcher: ${tradeDriver.confLine}`,
  ];
  writeFile(errorFilename, message.join('\n'));
}

export function displayAliveInfos(orchestrator: MarketOrchestrator) {
  const summaryString = orchestrator.pnl.getSummary();

  orchestrator.log(
    '%so - Still alive, %d messages processed',
    new Date(),
    orchestrator.aliveCount
  );
  orchestrator.log(
    '%d max concurrent trades, concurrent trades: %d',
    orchestrator.maxConcurrentTrades,
    orchestrator.getConcurrentTradesCount()
  );
  orchestrator.log(summaryString);
  orchestrator.log('------------------------------------------------------');
}
