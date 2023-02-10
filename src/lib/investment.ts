import debug from 'debug';
import { readFile, writeFile } from 'fs/promises';
import { USE_ADAPTATIVE_INVESTMENT } from '../config';
import { TradeResult } from '../types/TradeResult';
import { Watcher } from '../types/Watcher';

type InvestmentStatusHash = Record<string, number>;

export const BASE_INVESTMENT = 100;
const d = debug('lib:investment');
const investmentStatusFile = './investment-status.json';
let saveInvestmentStatusInterval: NodeJS.Timeout;

let investmentStatus = {} as InvestmentStatusHash;

async function loadInvestmentStatus() {
  try {
    const investmentStatusString = await readFile(investmentStatusFile, 'utf8');
    investmentStatus = JSON.parse(investmentStatusString);
  } catch (error) {
    investmentStatus = {};
  }
  d('investmentStatus loaded');
}

export function getInvestment(watcher: Watcher): number {
  const watcherHash = getWatcherHash(watcher);
  if (!USE_ADAPTATIVE_INVESTMENT) {
    return BASE_INVESTMENT;
  }
  if (investmentStatus[watcherHash]) {
    return investmentStatus[watcherHash];
  } else {
    investmentStatus[watcherHash] = BASE_INVESTMENT;
    return BASE_INVESTMENT;
  }
}

export function updateInvestment(watcher: Watcher, result: TradeResult) {
  if (!result.details?.buyTransaction || !result.details?.sellTransaction) {
    return;
  }
  const watcherHash = getWatcherHash(watcher);

  const pnl =
    parseInt(result.details.sellTransaction.cummulativeQuoteQty, 10) -
    parseInt(result.details.buyTransaction.cummulativeQuoteQty, 10);
  const investment = getInvestment(watcher);
  investmentStatus[watcherHash] = Math.ceil(investment + pnl / 2);
}

function getWatcherHash(watcher: Watcher) {
  return `${watcher.type} ${watcher.config}`;
}

async function recordInvestmentStatus() {
  return writeFile(investmentStatusFile, JSON.stringify(investmentStatus)).then(
    () => d('investmentStatus saved')
  );
}

export async function start() {
  await loadInvestmentStatus();
  saveInvestmentStatusInterval = setInterval(
    recordInvestmentStatus,
    1000 * 60 * 30
  );
}
