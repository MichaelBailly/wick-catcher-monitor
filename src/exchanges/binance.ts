export async function getUsdtPairs(): Promise<string[]> {
  const url = 'https://api.binance.com/api/v3/exchangeInfo';
  const response = await fetch(url);
  const data = await response.json();
  const pairs = data.symbols.filter(
    (symbol: any) =>
      symbol.quoteAsset === 'USDT' &&
      symbol.baseAsset !== 'USDT' &&
      symbol.baseAsset !== 'BTC' &&
      symbol.baseAsset !== 'ETH' &&
      symbol.isSpotTradingAllowed
  );
  return pairs.map((pair: any) => pair.symbol);
}
