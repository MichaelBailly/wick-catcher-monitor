import { MarketMemory } from './marketMemory';

export class MarketMemoryCollection {
  private marketMemories: Map<string, MarketMemory> = new Map();
  private marketMemoryOpts = {
    flashWickRatio: 1.1,
    historySize: 5,
  };

  constructor(opts?: { flashWickRatio?: number; historySize?: number }) {
    if (opts?.flashWickRatio) {
      this.marketMemoryOpts.flashWickRatio = opts.flashWickRatio;
    }
    if (opts?.historySize) {
      this.marketMemoryOpts.historySize = opts.historySize;
    }
  }

  get(pair: string): MarketMemory {
    if (!this.marketMemories.has(pair)) {
      this.marketMemories.set(
        pair,
        new MarketMemory(pair, { ...this.marketMemoryOpts })
      );
    }
    const marketMemory = this.marketMemories.get(pair);
    // to satisfy TS...
    if (marketMemory === undefined) {
      throw new Error('MarketMemoryCollection.get() returned undefined');
    }
    return marketMemory;
  }
}
