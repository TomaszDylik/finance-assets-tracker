'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { getBenchmarkHistory } from '@/lib/yahoo';
import type { Transaction } from '@/types';

export interface BenchmarkDataPoint {
  date: string;
  benchmarkValue: number;
}

const BENCHMARK_CACHE_KEY = 'benchmark_history_cache';

interface BenchmarkCache {
  lastUpdated: string;
  prices: Record<string, number>;
}

function getCache(): BenchmarkCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(BENCHMARK_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function saveCache(data: BenchmarkCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BENCHMARK_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save benchmark cache:', error);
  }
}

export function clearBenchmarkCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BENCHMARK_CACHE_KEY);
}

/**
 * Simulates a "phantom portfolio" that buys the benchmark index
 * with the same amounts and on the same dates as the user's real BUY transactions.
 *
 * Algorithm:
 * 1. Fetch S&P 500 daily prices for the entire portfolio lifespan.
 * 2. Walk through each day chronologically.
 * 3. On any day the user made a BUY, calculate phantom units:
 *    NewUnits = InvestmentAmountPLN / BenchmarkPriceOnThatDay
 * 4. For every day: BenchmarkValue = TotalPhantomUnits * BenchmarkPriceOnThatDay
 */
export function useBenchmarkData(
  transactions: Transaction[],
  enabled: boolean,
) {
  const [data, setData] = useState<BenchmarkDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buyTransactions = useMemo(
    () =>
      [...transactions]
        .filter((t) => t.transaction_type === 'BUY')
        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()),
    [transactions],
  );

  const earliestDate = useMemo(() => {
    if (!buyTransactions.length) return null;
    return startOfDay(new Date(buyTransactions[0].transaction_date));
  }, [buyTransactions]);

  const buildBenchmarkSeries = useCallback(
    (startDate: Date, endDate: Date, priceByDate: Record<string, number>): BenchmarkDataPoint[] => {
      const result: BenchmarkDataPoint[] = [];
      const today = startOfDay(new Date());

      const txByDate = new Map<string, { amountPLN: number }[]>();
      for (const tx of buyTransactions) {
        const txDate = format(new Date(tx.transaction_date), 'yyyy-MM-dd');
        const amountPLN =
          Number(tx.quantity) * Number(tx.price_per_share) * Number(tx.exchange_rate_to_pln);
        const existing = txByDate.get(txDate) || [];
        existing.push({ amountPLN });
        txByDate.set(txDate, existing);
      }

      let phantomUnits = 0;
      let lastKnownPrice: number | null = null;
      let currentDate = startDate;

      while (!isAfter(currentDate, endDate) && !isAfter(currentDate, today)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        const dayPrice: number | null = priceByDate[dateStr] !== undefined
          ? priceByDate[dateStr]
          : lastKnownPrice;
        if (dayPrice !== null) {
          lastKnownPrice = dayPrice;
        }

        const dayTxs = txByDate.get(dateStr);
        if (dayTxs && lastKnownPrice && lastKnownPrice > 0) {
          for (const tx of dayTxs) {
            phantomUnits += tx.amountPLN / lastKnownPrice;
          }
        }

        if (phantomUnits > 0 && lastKnownPrice) {
          result.push({
            date: dateStr,
            benchmarkValue: phantomUnits * lastKnownPrice,
          });
        }

        currentDate = addDays(currentDate, 1);
      }

      return result;
    },
    [buyTransactions],
  );

  const loadBenchmarkData = useCallback(
    async (forceRefresh = false) => {
      if (!enabled || !earliestDate || buyTransactions.length === 0) {
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const today = startOfDay(new Date());
        const cache = getCache();
        let priceByDate: Record<string, number> = {};
        let fetchStart = earliestDate;

        if (!forceRefresh && cache?.prices) {
          const lastUpdated = cache.lastUpdated;
          if (lastUpdated === format(today, 'yyyy-MM-dd')) {
            priceByDate = cache.prices;
            const series = buildBenchmarkSeries(earliestDate, today, priceByDate);
            setData(series);
            setIsLoading(false);
            return;
          }

          priceByDate = cache.prices;
          fetchStart = addDays(new Date(lastUpdated), 1);
        }

        if (isBefore(fetchStart, today) || format(fetchStart, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
          const newPrices = await getBenchmarkHistory(fetchStart, today);
          for (const { date, price } of newPrices) {
            priceByDate[date] = price;
          }
        }

        saveCache({ lastUpdated: format(today, 'yyyy-MM-dd'), prices: priceByDate });

        const series = buildBenchmarkSeries(earliestDate, today, priceByDate);
        setData(series);
      } catch (err) {
        console.error('Failed to load benchmark data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load benchmark data');
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, earliestDate, buyTransactions, buildBenchmarkSeries],
  );

  useEffect(() => {
    if (enabled) {
      loadBenchmarkData();
    } else {
      setData([]);
    }
  }, [enabled, loadBenchmarkData]);

  const refresh = useCallback(() => loadBenchmarkData(true), [loadBenchmarkData]);

  return { data, isLoading, error, refresh, clearCache: clearBenchmarkCache };
}
