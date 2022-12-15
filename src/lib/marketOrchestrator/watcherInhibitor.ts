import { MarketWatcher } from '../../types/MarketWatcher';

export class MarketWatcherInhibitor {
  private inhibitor: Set<string> = new Set();
  private inhibitorTimeout: number = 0;

  constructor(inhibitorTimeout: number) {
    this.inhibitorTimeout = inhibitorTimeout;
  }

  getConfLine(marketWatcher: MarketWatcher): string {
    return `${marketWatcher.pair}/${marketWatcher.getConfLine()}`;
  }

  isInhibited(marketWatcher: MarketWatcher): boolean {
    return this.inhibitor.has(this.getConfLine(marketWatcher));
  }

  inhibit(marketWatcher: MarketWatcher) {
    const confLine = this.getConfLine(marketWatcher);
    if (this.inhibitor.has(confLine)) {
      return false;
    }

    this.inhibitor.add(confLine);
    setTimeout(() => {
      this.inhibitor.delete(confLine);
    }, this.inhibitorTimeout);

    return true;
  }
}
