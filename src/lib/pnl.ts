import { format } from 'date-fns';
import { MarketWatcherConfData } from '../types/MarketWatcherConfData';
import { TradeResult } from '../types/TradeResult';
import { TradeDriver } from './tradeDriver';

type PnlSummary = {
  success: number;
  failed: number;
  pnl: number;
};

function confDataHash(confData: MarketWatcherConfData): string {
  return `${confData.type} ${confData.config}`;
}

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export class Pnl {
  history: Map<string, Record<string, PnlSummary>> = new Map();
  types: Record<string, PnlSummary> = {};
  today: string = getToday();

  onEndOfTrade(trade: TradeDriver, tradeResult: TradeResult) {
    const watcherType = confDataHash(trade.confData);
    const pnl =
      tradeResult.soldPrice * tradeResult.soldAmount -
      tradeResult.price * tradeResult.amount;

    if (!watcherType) {
      return;
    }

    const today = getToday();
    if (this.today !== today) {
      this.rotateHistory();
      this.today = today;
    }

    if (!this.types[watcherType]) {
      this.types[watcherType] = {
        success: 0,
        failed: 0,
        pnl: 0,
      };
    }

    if (pnl > 0) {
      this.types[watcherType].success++;
    } else {
      this.types[watcherType].failed++;
    }
    this.types[watcherType].pnl += pnl;
  }

  getFullSummary(): string {
    const lines: string[] = [];
    for (const [date, types] of this.history) {
      lines.push(`${date}`);
      lines.push(this.getSummaryFor(types));
    }
    lines.push(this.getSummary());
    return lines.join('\n');
  }

  getSummary(): string {
    return this.getSummaryFor(this.types);
  }

  getSummaryFor(types: Record<string, PnlSummary>): string {
    const total = {
      success: 0,
      failed: 0,
      pnl: 0,
    };

    const lines: string[] = [];
    for (const [type, summary] of Object.entries(types)) {
      total.success += summary.success;
      total.failed += summary.failed;
      total.pnl += summary.pnl;
      lines.push(
        `${type}: ${summary.success} success, ${summary.failed} failed, ${summary.pnl}`
      );
    }

    lines.push(
      `total: ${total.success} success, ${total.failed} failed, ${total.pnl}$`
    );

    return lines.join('\n');
  }

  rotateHistory() {
    this.history.set(this.today, this.types);
    this.types = {};
  }
}
