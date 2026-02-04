// ===========================================
// Portfolio Calculation Utilities
// ===========================================
// Contains all the math logic for portfolio calculations
// ===========================================

import type { Transaction, Holding, Currency } from '@/types';

// ===========================================
// CORE CALCULATION: Transform Transactions to Holdings
// ===========================================

/**
 * Groups transactions by ticker and calculates aggregated holdings
 * This is the "brain" of the portfolio tracker
 * 
 * @param transactions - Array of all user transactions
 * @returns Array of Holdings with calculated values
 */
export function calculateHoldings(transactions: Transaction[]): Holding[] {
  // Group transactions by ticker
  const transactionsByTicker = groupByTicker(transactions);
  
  const holdings: Holding[] = [];

  for (const [ticker, tickerTransactions] of transactionsByTicker) {
    const holding = calculateSingleHolding(ticker, tickerTransactions);
    
    // Only include holdings with positive quantity (not fully sold)
    if (holding && holding.total_quantity > 0) {
      holdings.push(holding);
    }
  }

  return holdings;
}

/**
 * Calculate a single holding from its transactions
 * Uses FIFO-like averaging for simplicity
 */
function calculateSingleHolding(
  ticker: string,
  transactions: Transaction[]
): Holding | null {
  if (transactions.length === 0) return null;

  // Separate BUY and SELL transactions
  const buyTransactions = transactions.filter((t) => t.transaction_type === 'BUY');
  const sellTransactions = transactions.filter((t) => t.transaction_type === 'SELL');

  // Calculate total bought and sold quantities
  const totalBought = buyTransactions.reduce((sum, t) => sum + t.quantity, 0);
  const totalSold = sellTransactions.reduce((sum, t) => sum + t.quantity, 0);
  const currentQuantity = totalBought - totalSold;

  // If fully sold, return null (will be in closed positions)
  if (currentQuantity <= 0) return null;

  // ===========================================
  // WEIGHTED AVERAGE BUY PRICE CALCULATION
  // ===========================================
  // Formula: Sum(price_i * quantity_i) / Sum(quantity_i)
  // 
  // Example:
  // Buy 10 shares @ $100 = $1000
  // Buy 5 shares @ $120 = $600
  // Total: 15 shares, $1600
  // Avg Price = $1600 / 15 = $106.67
  // ===========================================

  let totalCostOriginal = 0; // In original currency
  let totalCostPLN = 0;      // In PLN
  let weightedExchangeRateSum = 0;

  for (const t of buyTransactions) {
    const transactionCostOriginal = t.quantity * t.price_per_share;
    const transactionCostPLN = transactionCostOriginal * t.exchange_rate_to_pln;
    
    totalCostOriginal += transactionCostOriginal;
    totalCostPLN += transactionCostPLN;
    
    // Weight the exchange rate by quantity
    weightedExchangeRateSum += t.exchange_rate_to_pln * t.quantity;
  }

  // Calculate averages
  const avgBuyPrice = totalCostOriginal / totalBought;
  const avgExchangeRate = weightedExchangeRateSum / totalBought;

  // Adjust for sold shares (proportional reduction of cost basis)
  // If 30% of shares sold, reduce cost basis by 30%
  const costBasisRatio = currentQuantity / totalBought;
  const adjustedInvestedPLN = totalCostPLN * costBasisRatio;

  // Get metadata from first transaction
  const firstTransaction = transactions[0];

  return {
    ticker,
    asset_name: firstTransaction.asset_name || ticker,
    asset_type: firstTransaction.asset_type,
    total_quantity: currentQuantity,
    avg_buy_price: avgBuyPrice,
    original_currency: firstTransaction.currency,
    avg_exchange_rate: avgExchangeRate,
    total_invested_pln: adjustedInvestedPLN,
    transactions: transactions.sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    ),
  };
}

// ===========================================
// LIVE VALUE CALCULATIONS
// ===========================================

/**
 * Update holding with live price data
 * 
 * @param holding - The holding to update
 * @param currentPrice - Current market price in original currency
 * @param currentExchangeRate - Current exchange rate to PLN
 * @param dayChangePercent - Day change percentage from market data
 */
export function updateHoldingWithLiveData(
  holding: Holding,
  currentPrice: number,
  currentExchangeRate: number,
  dayChangePercent: number
): Holding {
  // ===========================================
  // CURRENT VALUE CALCULATION
  // ===========================================
  // Formula: quantity * current_price * current_exchange_rate
  // 
  // Example:
  // Holding: 15 shares of AAPL
  // Current Price: $180 USD
  // Current USD/PLN: 4.20
  // Current Value = 15 * 180 * 4.20 = 11,340 PLN
  // ===========================================

  const currentValuePLN = holding.total_quantity * currentPrice * currentExchangeRate;

  // ===========================================
  // TOTAL RETURN CALCULATION
  // ===========================================
  // Formula: current_value - invested_amount
  // 
  // Example:
  // Current Value: 11,340 PLN
  // Invested: 6,720 PLN (15 * 106.67 * 4.20)
  // Total Return = 11,340 - 6,720 = 4,620 PLN (+68.75%)
  // ===========================================

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

// ===========================================
// REALIZED PROFIT CALCULATION (for SELL transactions)
// ===========================================

/**
 * Calculate realized profit/loss when selling
 * 
 * @param avgBuyPrice - Average buy price in original currency
 * @param avgBuyExchangeRate - Weighted average exchange rate at purchase
 * @param sellPrice - Sell price in original currency
 * @param sellExchangeRate - Exchange rate at time of sale
 * @param quantity - Quantity sold
 * @returns Realized profit/loss in PLN
 */
export function calculateRealizedProfit(
  avgBuyPrice: number,
  avgBuyExchangeRate: number,
  sellPrice: number,
  sellExchangeRate: number,
  quantity: number
): number {
  // ===========================================
  // REALIZED PROFIT FORMULA
  // ===========================================
  // Cost Basis (PLN) = quantity * avg_buy_price * avg_exchange_rate
  // Sale Value (PLN) = quantity * sell_price * sell_exchange_rate
  // Realized Profit = Sale Value - Cost Basis
  // 
  // Example:
  // Selling 5 AAPL shares
  // Avg Buy: $106.67 @ 4.10 PLN/USD = 437.35 PLN/share
  // Sell: $180 @ 4.20 PLN/USD = 756 PLN/share
  // Cost Basis: 5 * 437.35 = 2,186.75 PLN
  // Sale Value: 5 * 756 = 3,780 PLN
  // Realized Profit: 3,780 - 2,186.75 = 1,593.25 PLN
  // ===========================================

  const costBasisPLN = quantity * avgBuyPrice * avgBuyExchangeRate;
  const saleValuePLN = quantity * sellPrice * sellExchangeRate;
  
  return saleValuePLN - costBasisPLN;
}

// ===========================================
// PORTFOLIO SUMMARY CALCULATIONS
// ===========================================

export interface PortfolioSummary {
  totalValuePLN: number;
  totalInvestedPLN: number;
  totalReturnPLN: number;
  totalReturnPercent: number;
  dayChangePLN: number;
  dayChangePercent: number;
  assetCount: number;
}

/**
 * Calculate overall portfolio summary from holdings
 */
export function calculatePortfolioSummary(holdings: Holding[]): PortfolioSummary {
  let totalValuePLN = 0;
  let totalInvestedPLN = 0;
  let previousDayValuePLN = 0;

  for (const holding of holdings) {
    totalInvestedPLN += holding.total_invested_pln;
    
    if (holding.current_value_pln !== undefined) {
      totalValuePLN += holding.current_value_pln;
      
      // Calculate previous day value for day change
      // Previous value = current value / (1 + day_change_percent/100)
      if (holding.day_change_percent !== undefined) {
        const prevValue = holding.current_value_pln / (1 + holding.day_change_percent / 100);
        previousDayValuePLN += prevValue;
      } else {
        previousDayValuePLN += holding.current_value_pln;
      }
    } else {
      // If no live data, use invested as current value
      totalValuePLN += holding.total_invested_pln;
      previousDayValuePLN += holding.total_invested_pln;
    }
  }

  const totalReturnPLN = totalValuePLN - totalInvestedPLN;
  const totalReturnPercent = totalInvestedPLN > 0 
    ? (totalReturnPLN / totalInvestedPLN) * 100 
    : 0;
  
  const dayChangePLN = totalValuePLN - previousDayValuePLN;
  const dayChangePercent = previousDayValuePLN > 0 
    ? (dayChangePLN / previousDayValuePLN) * 100 
    : 0;

  return {
    totalValuePLN,
    totalInvestedPLN,
    totalReturnPLN,
    totalReturnPercent,
    dayChangePLN,
    dayChangePercent,
    assetCount: holdings.length,
  };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Group transactions by ticker symbol
 */
function groupByTicker(transactions: Transaction[]): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const existing = grouped.get(transaction.ticker) || [];
    existing.push(transaction);
    grouped.set(transaction.ticker, existing);
  }

  return grouped;
}

/**
 * Format currency value for display
 */
export function formatCurrency(
  value: number,
  currency: Currency = 'PLN',
  options: Intl.NumberFormatOptions = {}
): string {
  const formatter = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });

  return formatter.format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format quantity (supports fractional shares)
 */
export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(8).replace(/\.?0+$/, '');
}
