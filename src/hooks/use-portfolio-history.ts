'use client';

// ===========================================
// Portfolio History Hook with Caching & Gap Filling
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { format, addDays, isBefore, isAfter, parseISO, startOfDay } from 'date-fns';
import type { Transaction } from '@/types';

// ===========================================
// TYPES
// ===========================================

export interface PortfolioDataPoint {
  date: string;
  totalCostBasis: number;      // Invested capital (only changes on BUY/SELL)
  totalMarketValue: number;    // Current worth (fluctuates with market)
  profit: number;              // totalMarketValue - totalCostBasis
  profitPercent: number;       // (profit / totalCostBasis) * 100
}

interface CacheData {
  lastUpdated: string;
  data: PortfolioDataPoint[];
  priceHistory: Record<string, Record<string, number>>; // ticker -> date -> price
}

const CACHE_KEY = 'portfolio_history_cache';

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function getCache(): CacheData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function saveCache(data: CacheData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save portfolio cache:', error);
  }
}

export function clearPortfolioCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

// ===========================================
// MAIN HOOK
// ===========================================

export function usePortfolioHistory(
  transactions: Transaction[],
  fetchHistoricalPrices: (
    tickers: string[],
    startDate: Date,
    endDate: Date
  ) => Promise<Map<string, Array<{ date: string; price: number }>>>
) {
  const [data, setData] = useState<PortfolioDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get earliest transaction date
  const getEarliestTransactionDate = useCallback((): Date | null => {
    if (!transactions.length) return null;
    
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );
    return startOfDay(new Date(sorted[0].transaction_date));
  }, [transactions]);

  // Get unique tickers from transactions
  const getUniqueTickers = useCallback((): string[] => {
    return [...new Set(transactions.map((t) => t.ticker))];
  }, [transactions]);

  // Build portfolio data with forward-filling
  const buildPortfolioData = useCallback(
    (
      startDate: Date,
      endDate: Date,
      priceHistory: Record<string, Record<string, number>>
    ): PortfolioDataPoint[] => {
      const result: PortfolioDataPoint[] = [];
      const today = startOfDay(new Date());

      // Track holdings and cost basis per ticker
      const holdings = new Map<string, { quantity: number; costBasis: number; avgRate: number }>();
      
      // Track last known prices per ticker (for forward-filling)
      const lastKnownPrices = new Map<string, number>();

      // Sort transactions by date
      const sortedTransactions = [...transactions].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );

      // Iterate through every single day
      let currentDate = startDate;
      let txIndex = 0;

      while (!isAfter(currentDate, endDate) && !isAfter(currentDate, today)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        // Process all transactions for this day
        while (
          txIndex < sortedTransactions.length &&
          format(new Date(sortedTransactions[txIndex].transaction_date), 'yyyy-MM-dd') === dateStr
        ) {
          const tx = sortedTransactions[txIndex];
          const existing = holdings.get(tx.ticker) || { quantity: 0, costBasis: 0, avgRate: tx.exchange_rate_to_pln };

          if (tx.transaction_type === 'BUY') {
            const txCost = Number(tx.quantity) * Number(tx.price_per_share) * Number(tx.exchange_rate_to_pln);
            existing.quantity += Number(tx.quantity);
            existing.costBasis += txCost;
            // Weighted average exchange rate
            existing.avgRate = existing.costBasis > 0 
              ? (existing.avgRate * (existing.costBasis - txCost) + tx.exchange_rate_to_pln * txCost) / existing.costBasis
              : tx.exchange_rate_to_pln;
          } else if (tx.transaction_type === 'SELL') {
            // Reduce cost basis proportionally
            const sellRatio = Number(tx.quantity) / existing.quantity;
            existing.costBasis -= existing.costBasis * sellRatio;
            existing.quantity -= Number(tx.quantity);
          }

          holdings.set(tx.ticker, existing);
          txIndex++;
        }

        // Calculate totals for this day
        let totalCostBasis = 0;
        let totalMarketValue = 0;

        for (const [ticker, holding] of holdings.entries()) {
          if (holding.quantity <= 0) continue;

          totalCostBasis += holding.costBasis;

          // Get price for this day (with forward-filling)
          const tickerPrices = priceHistory[ticker];
          let price: number | undefined;

          if (tickerPrices && tickerPrices[dateStr] !== undefined) {
            price = tickerPrices[dateStr];
            lastKnownPrices.set(ticker, price);
          } else {
            // Forward-fill: use last known price
            price = lastKnownPrices.get(ticker);
          }

          if (price !== undefined) {
            totalMarketValue += price * holding.quantity * holding.avgRate;
          } else {
            // No price data yet, use cost basis
            totalMarketValue += holding.costBasis;
          }
        }

        // Only add data point if we have holdings
        if (totalCostBasis > 0) {
          const profit = totalMarketValue - totalCostBasis;
          const profitPercent = totalCostBasis > 0 ? (profit / totalCostBasis) * 100 : 0;

          result.push({
            date: dateStr,
            totalCostBasis,
            totalMarketValue,
            profit,
            profitPercent,
          });
        }

        currentDate = addDays(currentDate, 1);
      }

      return result;
    },
    [transactions]
  );

  // Convert Map to Record for caching
  const mapToRecord = (
    map: Map<string, Array<{ date: string; price: number }>>
  ): Record<string, Record<string, number>> => {
    const record: Record<string, Record<string, number>> = {};
    for (const [ticker, prices] of map.entries()) {
      record[ticker] = {};
      for (const { date, price } of prices) {
        record[ticker][date] = price;
      }
    }
    return record;
  };

  // Merge price records
  const mergePriceRecords = (
    existing: Record<string, Record<string, number>>,
    newData: Record<string, Record<string, number>>
  ): Record<string, Record<string, number>> => {
    const merged = { ...existing };
    for (const [ticker, prices] of Object.entries(newData)) {
      if (!merged[ticker]) {
        merged[ticker] = {};
      }
      merged[ticker] = { ...merged[ticker], ...prices };
    }
    return merged;
  };

  // Load and update portfolio data
  const loadPortfolioData = useCallback(
    async (forceRefresh = false) => {
      if (!transactions.length) {
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const earliestDate = getEarliestTransactionDate();
        if (!earliestDate) {
          setData([]);
          setIsLoading(false);
          return;
        }

        const today = startOfDay(new Date());
        const tickers = getUniqueTickers();
        const cache = getCache();

        let priceHistory: Record<string, Record<string, number>> = {};
        let fetchStartDate = earliestDate;

        // Check cache
        if (!forceRefresh && cache && cache.priceHistory) {
          const lastUpdatedDate = parseISO(cache.lastUpdated);
          
          // If cache is from today, use it directly
          if (format(lastUpdatedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
            console.log('Using cached portfolio data (up to date)');
            setData(cache.data);
            setIsLoading(false);
            return;
          }

          // Cache exists but needs incremental update
          priceHistory = cache.priceHistory;
          fetchStartDate = addDays(lastUpdatedDate, 1);
          console.log(`Incremental update from ${format(fetchStartDate, 'yyyy-MM-dd')} to ${format(today, 'yyyy-MM-dd')}`);
        } else {
          console.log(`Full fetch from ${format(earliestDate, 'yyyy-MM-dd')} to ${format(today, 'yyyy-MM-dd')}`);
        }

        // Fetch new price data if needed
        if (isBefore(fetchStartDate, today) || format(fetchStartDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
          const newPricesMap = await fetchHistoricalPrices(tickers, fetchStartDate, today);
          const newPricesRecord = mapToRecord(newPricesMap);
          priceHistory = mergePriceRecords(priceHistory, newPricesRecord);
        }

        // Build portfolio data with forward-filling
        const portfolioData = buildPortfolioData(earliestDate, today, priceHistory);

        // Save to cache
        saveCache({
          lastUpdated: format(today, 'yyyy-MM-dd'),
          data: portfolioData,
          priceHistory,
        });

        setData(portfolioData);
      } catch (err) {
        console.error('Failed to load portfolio history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load portfolio history');
      } finally {
        setIsLoading(false);
      }
    },
    [transactions, getEarliestTransactionDate, getUniqueTickers, buildPortfolioData, fetchHistoricalPrices]
  );

  // Initial load
  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  // Refresh function (force update)
  const refresh = useCallback(() => {
    return loadPortfolioData(true);
  }, [loadPortfolioData]);

  return {
    data,
    isLoading,
    error,
    refresh,
    clearCache: clearPortfolioCache,
  };
}
