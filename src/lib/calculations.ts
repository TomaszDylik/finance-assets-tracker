import type { Transaction, Holding, Currency } from '@/types';

/**
 * Groups transactions by ticker and calculates aggregated holdings.
 * Only returns holdings with positive quantity (not fully sold).
 */
export function calculateHoldings(transactions: Transaction[]): Holding[] {
  const grouped = groupByTicker(transactions);
  const holdings: Holding[] = [];

  for (const [ticker, tickerTransactions] of grouped) {
    const holding = calculateSingleHolding(ticker, tickerTransactions);
    if (holding && holding.total_quantity > 0) {
      holdings.push(holding);
    }
  }

  return holdings;
}

function calculateSingleHolding(ticker: string, transactions: Transaction[]): Holding | null {
  if (transactions.length === 0) return null;

  const buys = transactions.filter((t) => t.transaction_type === 'BUY');
  const sells = transactions.filter((t) => t.transaction_type === 'SELL');

  const totalBought = buys.reduce((sum, t) => sum + t.quantity, 0);
  const totalSold = sells.reduce((sum, t) => sum + t.quantity, 0);
  const currentQuantity = totalBought - totalSold;

  if (currentQuantity <= 0) return null;

  let totalCostOriginal = 0;
  let totalCostPLN = 0;
  let weightedExchangeRateSum = 0;

  for (const t of buys) {
    const costOriginal = t.quantity * t.price_per_share;
    totalCostOriginal += costOriginal;
    totalCostPLN += costOriginal * t.exchange_rate_to_pln;
    weightedExchangeRateSum += t.exchange_rate_to_pln * t.quantity;
  }

  const avgBuyPrice = totalCostOriginal / totalBought;
  const avgExchangeRate = weightedExchangeRateSum / totalBought;
  const costBasisRatio = currentQuantity / totalBought;

  return {
    ticker,
    asset_name: transactions[0].asset_name || ticker,
    asset_type: transactions[0].asset_type,
    total_quantity: currentQuantity,
    avg_buy_price: avgBuyPrice,
    original_currency: transactions[0].currency,
    avg_exchange_rate: avgExchangeRate,
    total_invested_pln: totalCostPLN * costBasisRatio,
    transactions: [...transactions].sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime(),
    ),
  };
}

/** Update a holding with live market price data. */
export function updateHoldingWithLiveData(
  holding: Holding,
  currentPrice: number,
  currentExchangeRate: number,
  dayChangePercent: number,
): Holding {
  const currentValuePLN = holding.total_quantity * currentPrice * currentExchangeRate;
  const totalReturnPLN = currentValuePLN - holding.total_invested_pln;
  const totalReturnPercent = (totalReturnPLN / holding.total_invested_pln) * 100;

  return {
    ...holding,
    current_price: currentPrice,
    current_exchange_rate: currentExchangeRate,
    current_value_pln: currentValuePLN,
    day_change_percent: dayChangePercent,
    total_return_pln: totalReturnPLN,
    total_return_percent: totalReturnPercent,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Calculate realized profit/loss in PLN when selling shares.
 *
 * profit = (sellPrice × sellRate − avgBuyPrice × avgBuyRate) × quantity
 */
export function calculateRealizedProfit(
  avgBuyPrice: number,
  avgBuyExchangeRate: number,
  sellPrice: number,
  sellExchangeRate: number,
  quantity: number,
): number {
  const costBasisPLN = quantity * avgBuyPrice * avgBuyExchangeRate;
  const saleValuePLN = quantity * sellPrice * sellExchangeRate;
  return saleValuePLN - costBasisPLN;
}

export interface PortfolioSummary {
  totalValuePLN: number;
  totalInvestedPLN: number;
  totalReturnPLN: number;
  totalReturnPercent: number;
  dayChangePLN: number;
  dayChangePercent: number;
  assetCount: number;
  realizedProfitPLN: number;
  unrealizedReturnPLN: number;
}

/** Calculate overall portfolio summary from open holdings and closed positions. */
export function calculatePortfolioSummary(
  holdings: Holding[],
  closedPositions: Array<{ realized_profit_pln: number }> = [],
): PortfolioSummary {
  let totalValuePLN = 0;
  let totalInvestedPLN = 0;
  let previousDayValuePLN = 0;

  for (const holding of holdings) {
    totalInvestedPLN += holding.total_invested_pln;

    if (holding.current_value_pln !== undefined) {
      totalValuePLN += holding.current_value_pln;

      if (holding.day_change_percent !== undefined) {
        previousDayValuePLN += holding.current_value_pln / (1 + holding.day_change_percent / 100);
      } else {
        previousDayValuePLN += holding.current_value_pln;
      }
    } else {
      totalValuePLN += holding.total_invested_pln;
      previousDayValuePLN += holding.total_invested_pln;
    }
  }

  const unrealizedReturnPLN = totalValuePLN - totalInvestedPLN;
  const dayChangePLN = totalValuePLN - previousDayValuePLN;
  const dayChangePercent = previousDayValuePLN > 0 ? (dayChangePLN / previousDayValuePLN) * 100 : 0;

  const realizedProfitPLN = closedPositions.reduce(
    (sum, p) => sum + (p.realized_profit_pln || 0),
    0,
  );

  const totalReturnPLN = unrealizedReturnPLN + realizedProfitPLN;
  const totalReturnPercent = totalInvestedPLN > 0 ? (totalReturnPLN / totalInvestedPLN) * 100 : 0;

  return {
    totalValuePLN,
    totalInvestedPLN,
    totalReturnPLN,
    totalReturnPercent,
    dayChangePLN,
    dayChangePercent,
    assetCount: holdings.length,
    realizedProfitPLN,
    unrealizedReturnPLN,
  };
}

function groupByTicker(transactions: Transaction[]): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const existing = grouped.get(tx.ticker) || [];
    existing.push(tx);
    grouped.set(tx.ticker, existing);
  }
  return grouped;
}

export function formatCurrency(
  value: number,
  currency: Currency = 'PLN',
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatPercentage(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(8).replace(/\.?0+$/, '');
}
