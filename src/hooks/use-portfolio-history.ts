'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addDays, isBefore, isAfter, parseISO, startOfDay } from 'date-fns';
import type { Transaction } from '@/types';

export interface PortfolioDataPoint {
  date: string;
  totalCostBasis: number;
  totalMarketValue: number;
  profit: number;
  profitPercent: number;
}

interface CacheData {
  lastUpdated: string;
  data: PortfolioDataPoint[];
  priceHistory: Record<string, Record<string, number>>;
}

const CACHE_KEY = 'portfolio_history_cache';

function getCache(): CacheData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
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

type FetchHistoricalFn = (
  tickers: string[],
  startDate: Date,
  endDate: Date,
) => Promise<Map<string, Array<{ date: string; price: number }>>>;

export function usePortfolioHistory(
  transactions: Transaction[],
  fetchHistoricalPrices: FetchHistoricalFn,
) {
  const [data, setData] = useState<PortfolioDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getEarliestTransactionDate = useCallback((): Date | null => {
    if (!transactions.length) return null;
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(),
    );
    return startOfDay(new Date(sorted[0].transaction_date));
  }, [transactions]);

  const getUniqueTickers = useCallback(
    (): string[] => [...new Set(transactions.map((t) => t.ticker))],
    [transactions],
  );

  const buildPortfolioData = useCallback(
    (startDate: Date, endDate: Date, priceHistory: Record<string, Record<string, number>>): PortfolioDataPoint[] => {
      const result: PortfolioDataPoint[] = [];
      const today = startOfDay(new Date());

      const holdings = new Map<string, { quantity: number; costBasis: number; avgRate: number }>();
      const lastKnownPrices = new Map<string, number>();

      const sortedTx = [...transactions].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(),
      );

      let currentDate = startDate;
      let txIndex = 0;

      while (!isAfter(currentDate, endDate) && !isAfter(currentDate, today)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        while (
          txIndex < sortedTx.length &&
          format(new Date(sortedTx[txIndex].transaction_date), 'yyyy-MM-dd') === dateStr
        ) {
          const tx = sortedTx[txIndex];
          const existing = holdings.get(tx.ticker) || { quantity: 0, costBasis: 0, avgRate: tx.exchange_rate_to_pln };

          if (tx.transaction_type === 'BUY') {
            const txCost = Number(tx.quantity) * Number(tx.price_per_share) * Number(tx.exchange_rate_to_pln);
            existing.quantity += Number(tx.quantity);
            existing.costBasis += txCost;
            existing.avgRate =
              existing.costBasis > 0
                ? (existing.avgRate * (existing.costBasis - txCost) + tx.exchange_rate_to_pln * txCost) / existing.costBasis
                : tx.exchange_rate_to_pln;
          } else if (tx.transaction_type === 'SELL') {
            const sellRatio = Number(tx.quantity) / existing.quantity;
            existing.costBasis -= existing.costBasis * sellRatio;
            existing.quantity -= Number(tx.quantity);
          }

          holdings.set(tx.ticker, existing);
          txIndex++;
        }

        let totalCostBasis = 0;
        let totalMarketValue = 0;

        for (const [ticker, holding] of holdings.entries()) {
          if (holding.quantity <= 0) continue;
          totalCostBasis += holding.costBasis;

          const tickerPrices = priceHistory[ticker];
          let price: number | undefined;

          if (tickerPrices?.[dateStr] !== undefined) {
            price = tickerPrices[dateStr];
            lastKnownPrices.set(ticker, price);
          } else {
            price = lastKnownPrices.get(ticker);
          }

          totalMarketValue += price !== undefined
            ? price * holding.quantity * holding.avgRate
            : holding.costBasis;
        }

        if (totalCostBasis > 0) {
          const profit = totalMarketValue - totalCostBasis;
          result.push({
            date: dateStr,
            totalCostBasis,
            totalMarketValue,
            profit,
            profitPercent: totalCostBasis > 0 ? (profit / totalCostBasis) * 100 : 0,
          });
        }

        currentDate = addDays(currentDate, 1);
      }

      return result;
    },
    [transactions],
  );

  const mapToRecord = (
    map: Map<string, Array<{ date: string; price: number }>>,
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

  const mergePriceRecords = (
    existing: Record<string, Record<string, number>>,
    newData: Record<string, Record<string, number>>,
  ): Record<string, Record<string, number>> => {
    const merged = { ...existing };
    for (const [ticker, prices] of Object.entries(newData)) {
      merged[ticker] = { ...merged[ticker], ...prices };
    }
    return merged;
  };

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

        if (!forceRefresh && cache?.priceHistory) {
          const lastUpdatedDate = parseISO(cache.lastUpdated);

          if (format(lastUpdatedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
            setData(cache.data);
            setIsLoading(false);
            return;
          }

          priceHistory = cache.priceHistory;
          fetchStartDate = addDays(lastUpdatedDate, 1);
        }

        if (isBefore(fetchStartDate, today) || format(fetchStartDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
          const newPricesMap = await fetchHistoricalPrices(tickers, fetchStartDate, today);
          priceHistory = mergePriceRecords(priceHistory, mapToRecord(newPricesMap));
        }

        const portfolioData = buildPortfolioData(earliestDate, today, priceHistory);

        saveCache({ lastUpdated: format(today, 'yyyy-MM-dd'), data: portfolioData, priceHistory });
        setData(portfolioData);
      } catch (err) {
        console.error('Failed to load portfolio history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load portfolio history');
      } finally {
        setIsLoading(false);
      }
    },
    [transactions, getEarliestTransactionDate, getUniqueTickers, buildPortfolioData, fetchHistoricalPrices],
  );

  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  const refresh = useCallback(() => loadPortfolioData(true), [loadPortfolioData]);

  return { data, isLoading, error, refresh, clearCache: clearPortfolioCache };
}
