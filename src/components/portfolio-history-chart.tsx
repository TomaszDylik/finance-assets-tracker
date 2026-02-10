'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import { usePortfolioHistory } from '@/hooks/use-portfolio-history';
import { useBenchmarkData } from '@/hooks/use-benchmark-data';
import { getMultipleHistoricalPrices } from '@/lib/yahoo';
import { formatCurrency } from '@/lib/calculations';
import { format, subDays, subMonths, subYears, isAfter, parseISO } from 'date-fns';
import type { Transaction } from '@/types';

interface PortfolioHistoryChartProps {
  transactions: Transaction[];
  onRefreshComplete?: () => void;
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
type CompareMode = 'cost-basis' | 'sp500';

interface ChartDataPoint {
  date: string;
  fullDate: string;
  invested: number;
  marketValue: number;
  profit: number;
  profitPercent: number;
  benchmark?: number;
  alpha?: number;
}

function CustomTooltip({ active, payload, compareMode }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; payload: ChartDataPoint }>;
  compareMode: CompareMode;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isUp = data.profit >= 0;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 shadow-xl min-w-52">
      <p className="text-white/60 text-xs mb-2">{data.fullDate}</p>

      <div className="space-y-1.5">
        {compareMode === 'cost-basis' && (
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Invested:</span>
            <span className="text-blue-400 font-medium">{formatCurrency(data.invested)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-white/60 text-sm">Value:</span>
          <span className="text-emerald-400 font-medium">{formatCurrency(data.marketValue)}</span>
        </div>

        {compareMode === 'sp500' && data.benchmark !== undefined && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">S&P 500:</span>
              <span className="text-slate-400 font-medium">{formatCurrency(data.benchmark)}</span>
            </div>
            {data.alpha !== undefined && (
              <div className="border-t border-white/10 pt-1.5 mt-1.5">
                <div className={`flex justify-between items-center ${data.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className="text-sm flex items-center gap-1">
                    {data.alpha >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    Alpha:
                  </span>
                  <span className="font-semibold">
                    {data.alpha >= 0 ? '+' : ''}{formatCurrency(data.alpha)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {compareMode === 'cost-basis' && (
          <div className="border-t border-white/10 pt-1.5 mt-1.5">
            <div className={`flex justify-between items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className="text-sm flex items-center gap-1">
                {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                Profit:
              </span>
              <span className="font-semibold">
                {isUp ? '+' : ''}{formatCurrency(data.profit)} ({isUp ? '+' : ''}{data.profitPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomLegend({ compareMode }: { compareMode: CompareMode }) {
  return (
    <div className="flex justify-center gap-6 mt-2">
      {compareMode === 'cost-basis' && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-white/60 text-sm">Invested Capital</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-white/60 text-sm">Market Value</span>
      </div>
      {compareMode === 'sp500' && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" />
          <span className="text-white/60 text-sm">S&P 500 Benchmark</span>
        </div>
      )}
    </div>
  );
}

export function PortfolioHistoryChart({
  transactions,
  onRefreshComplete,
}: PortfolioHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [compareMode, setCompareMode] = useState<CompareMode>('cost-basis');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastTransactionsLength, setLastTransactionsLength] = useState(transactions.length);

  const fetchPrices = useCallback(async (
    tickers: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, Array<{ date: string; price: number }>>> => {
    return getMultipleHistoricalPrices(tickers, startDate, endDate);
  }, []);

  const { data, isLoading, error, refresh, clearCache } = usePortfolioHistory(
    transactions,
    fetchPrices
  );

  const {
    data: benchmarkData,
    isLoading: benchmarkLoading,
    refresh: refreshBenchmark,
    clearCache: clearBenchmarkCache,
  } = useBenchmarkData(transactions, compareMode === 'sp500');

  useEffect(() => {
    if (transactions.length !== lastTransactionsLength) {
      clearCache();
      clearBenchmarkCache();
      refresh();
      if (compareMode === 'sp500') refreshBenchmark();
      setLastTransactionsLength(transactions.length);
    }
  }, [transactions.length, lastTransactionsLength, clearCache, clearBenchmarkCache, refresh, refreshBenchmark, compareMode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      clearCache();
      clearBenchmarkCache();
      await Promise.all([refresh(), compareMode === 'sp500' ? refreshBenchmark() : Promise.resolve()]);
      onRefreshComplete?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const { chartData, stats } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], stats: null };
    }

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1W': startDate = subDays(now, 7); break;
      case '1M': startDate = subMonths(now, 1); break;
      case '3M': startDate = subMonths(now, 3); break;
      case '6M': startDate = subMonths(now, 6); break;
      case '1Y': startDate = subYears(now, 1); break;
      case 'ALL':
      default: startDate = new Date(0);
    }

    const filtered = data.filter((d) => isAfter(parseISO(d.date), startDate));
    if (filtered.length === 0) return { chartData: [], stats: null };

    const benchmarkMap = new Map<string, number>();
    if (benchmarkData.length > 0) {
      for (const bp of benchmarkData) {
        benchmarkMap.set(bp.date, bp.benchmarkValue);
      }
    }

    const chartPoints: ChartDataPoint[] = filtered.map((point) => {
      const benchmarkValue = benchmarkMap.get(point.date);
      return {
        date: format(parseISO(point.date), 'MMM d'),
        fullDate: point.date,
        invested: point.totalCostBasis,
        marketValue: point.totalMarketValue,
        profit: point.profit,
        profitPercent: point.profitPercent,
        benchmark: benchmarkValue,
        alpha: benchmarkValue !== undefined
          ? point.totalMarketValue - benchmarkValue
          : undefined,
      };
    });

    const lastPoint = chartPoints[chartPoints.length - 1];
    const firstPoint = chartPoints[0];

    return {
      chartData: chartPoints,
      stats: {
        periodChange: lastPoint.profitPercent,
        periodAbsoluteChange: lastPoint.profit,
        currentValue: lastPoint.marketValue,
        currentInvested: lastPoint.invested,
        currentBenchmark: lastPoint.benchmark,
        currentAlpha: lastPoint.alpha,
        startDate: firstPoint.fullDate,
        endDate: lastPoint.fullDate,
        daysCount: chartPoints.length,
      },
    };
  }, [data, benchmarkData, timeRange]);

  const isPositive = stats ? stats.periodChange >= 0 : true;

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '1W', label: '1W' },
    { key: '1M', label: '1M' },
    { key: '3M', label: '3M' },
    { key: '6M', label: '6M' },
    { key: '1Y', label: '1Y' },
    { key: 'ALL', label: 'All' },
  ];

  const compareModes: { key: CompareMode; label: string }[] = [
    { key: 'cost-basis', label: 'vs Cost Basis' },
    { key: 'sp500', label: 'vs S&P 500' },
  ];

  if (isLoading && data.length === 0) {
    return (
      <Card className="bg-white/3 border-white/10 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center h-100">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            <p className="text-white/40">Loading portfolio history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/3 border-white/10 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center h-100">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-rose-400">Failed to load chart data</p>
            <p className="text-white/40 text-sm">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="bg-white/3 border-white/10 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center h-100">
          <div className="flex flex-col items-center gap-3 text-center">
            <TrendingUp className="h-12 w-12 text-white/20" />
            <p className="text-white/60">No portfolio data yet</p>
            <p className="text-white/40 text-sm">Add transactions to see your portfolio history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-white/3 border-white/10 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                Portfolio History
                {stats && (
                  <span className={`text-sm font-normal px-2 py-0.5 rounded ${
                    isPositive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {isPositive ? '+' : ''}{stats.periodChange.toFixed(2)}%
                  </span>
                )}
              </CardTitle>
              {stats && (
                <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {stats.startDate} &rarr; {stats.endDate} ({stats.daysCount} days)
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Compare Mode Toggle */}
              <div className="flex bg-white/5 rounded-lg p-1">
                {compareModes.map((mode) => (
                  <Button
                    key={mode.key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompareMode(mode.key)}
                    className={`px-3 py-1 h-7 text-xs font-medium transition-all ${
                      compareMode === mode.key
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {mode.label}
                  </Button>
                ))}
              </div>

              {/* Time Range Buttons */}
              <div className="flex bg-white/5 rounded-lg p-1">
                {timeRanges.map((range) => (
                  <Button
                    key={range.key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimeRange(range.key)}
                    className={`px-3 py-1 h-7 text-xs font-medium transition-all ${
                      timeRange === range.key
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-white/40 hover:text-white"
                title="Refresh historical data"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {compareMode === 'cost-basis' ? (
                <>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">Invested</p>
                    <p className="text-blue-400 font-semibold">
                      {formatCurrency(stats.currentInvested)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">Current Value</p>
                    <p className="text-white font-semibold">
                      {formatCurrency(stats.currentValue)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">Total Profit</p>
                    <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(stats.periodAbsoluteChange)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">Return</p>
                    <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{stats.periodChange.toFixed(2)}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">My Portfolio</p>
                    <p className="text-emerald-400 font-semibold">
                      {formatCurrency(stats.currentValue)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">S&P 500 Benchmark</p>
                    <p className="text-slate-400 font-semibold">
                      {stats.currentBenchmark !== undefined ? formatCurrency(stats.currentBenchmark) : '—'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">Alpha</p>
                    <p className={`font-semibold ${
                      stats.currentAlpha !== undefined && stats.currentAlpha >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {stats.currentAlpha !== undefined
                        ? `${stats.currentAlpha >= 0 ? '+' : ''}${formatCurrency(stats.currentAlpha)}`
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/40 text-xs mb-1">Return</p>
                    <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{stats.periodChange.toFixed(2)}%
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Chart */}
          <div className="h-75 relative">
            {compareMode === 'sp500' && benchmarkLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading S&P 500 data...</span>
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="marketValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                  domain={['auto', 'auto']}
                  width={50}
                />

                <Tooltip content={<CustomTooltip compareMode={compareMode} />} />

                {/* Invested Capital Area — only in cost-basis mode */}
                {compareMode === 'cost-basis' && (
                  <Area
                    type="monotone"
                    dataKey="invested"
                    name="Invested"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#investedGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6' }}
                  />
                )}

                {/* Market Value Area — always shown */}
                <Area
                  type="monotone"
                  dataKey="marketValue"
                  name="Market Value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#marketValueGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />

                {/* Benchmark Dashed Line — only in sp500 mode */}
                {compareMode === 'sp500' && (
                  <Line
                    type="monotone"
                    dataKey="benchmark"
                    name="S&P 500"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    activeDot={{ r: 4, fill: '#94a3b8', stroke: '#94a3b8' }}
                    connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <CustomLegend compareMode={compareMode} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
