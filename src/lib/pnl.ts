import { BuyTradeInfo } from '../types/BuyTradeInfo';
import { TradeDriver } from './tradeDriver';

type PnlSummary = {
  success: number;
  failed: number;
  pnl: number;
};

export class Pnl {
  types: Record<string, PnlSummary> = {};

  onEndOfTrade(
    trade: TradeDriver,
    tradeinfos: BuyTradeInfo,
    amount: number,
    price: number
  ) {
    const watcherType = trade.confLine.split('-').shift();
    const pnl = price * amount - tradeinfos.price * tradeinfos.amount;

    if (!watcherType) {
      return;
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

  getSummary(): string {
    const total = {
      success: 0,
      failed: 0,
      pnl: 0,
    };

    const lines: string[] = [];
    for (const [type, summary] of Object.entries(this.types)) {
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
}
