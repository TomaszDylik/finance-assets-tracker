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
  ReferenceLine,
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

interface ChartDataPoint {
  date: string;
  fullDate: string;
  returnPercent: number;
  invested: number;
  marketValue: number;
  benchmarkReturnPercent?: number;
  benchmarkValue?: number;
}

/**
 * Calculate the SVG gradient offset so the color switches exactly at 0%.
 * Returns a value 0..1 representing where 0% sits between dataMax and dataMin.
 */
function calculateGradientOffset(data: ChartDataPoint[]): number {
  const values = data.map((d) => d.returnPercent);
  const dataMax = Math.max(...values);
  const dataMin = Math.min(...values);

  if (dataMax <= 0) return 0;
  if (dataMin >= 0) return 1;

  return dataMax / (dataMax - dataMin);
}

function CustomTooltip({ active, payload, showBenchmark }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: ChartDataPoint }>;
  showBenchmark: boolean;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isUp = data.returnPercent >= 0;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 shadow-xl min-w-52">
      <p className="text-white/60 text-xs mb-2">{data.fullDate}</p>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-white/60 text-sm">Return:</span>
          <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? '+' : ''}{data.returnPercent.toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/60 text-sm">Current Value:</span>
          <span className="text-white font-medium">{formatCurrency(data.marketValue)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/60 text-sm">Invested:</span>
          <span className="text-blue-400 font-medium">{formatCurrency(data.invested)}</span>
        </div>

        {showBenchmark && data.benchmarkReturnPercent !== undefined && (
          <div className="border-t border-white/10 pt-1.5 mt-1.5">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">S&P 500:</span>
              <span className={`font-semibold ${
                data.benchmarkReturnPercent >= 0 ? 'text-slate-300' : 'text-slate-400'
              }`}>
                {data.benchmarkReturnPercent >= 0 ? '+' : ''}{data.benchmarkReturnPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-white/60 text-sm">Alpha:</span>
              {(() => {
                const alpha = data.returnPercent - data.benchmarkReturnPercent;
                return (
                  <span className={`font-semibold ${alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}pp
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomLegend({ showBenchmark }: { showBenchmark: boolean }) {
  return (
    <div className="flex justify-center gap-6 mt-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-white/60 text-sm">My Return %</span>
      </div>
      {showBenchmark && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" />
          <span className="text-white/60 text-sm">S&P 500 Return %</span>
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
  const [showBenchmark, setShowBenchmark] = useState(false);
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
  } = useBenchmarkData(transactions, showBenchmark);

  useEffect(() => {
    if (transactions.length !== lastTransactionsLength) {
      clearCache();
      clearBenchmarkCache();
      refresh();
      if (showBenchmark) refreshBenchmark();
      setLastTransactionsLength(transactions.length);
    }
  }, [transactions.length, lastTransactionsLength, clearCache, clearBenchmarkCache, refresh, refreshBenchmark, showBenchmark]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      clearCache();
      clearBenchmarkCache();
      await Promise.all([refresh(), showBenchmark ? refreshBenchmark() : Promise.resolve()]);
      onRefreshComplete?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const { chartData, stats, gradientOffset } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], stats: null, gradientOffset: 1 };
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
    if (filtered.length === 0) return { chartData: [], stats: null, gradientOffset: 1 };

    const benchmarkMap = new Map<string, { returnPercent: number; value: number }>();
    if (benchmarkData.length > 0) {
      for (const bp of benchmarkData) {
        benchmarkMap.set(bp.date, {
          returnPercent: bp.benchmarkReturnPercent,
          value: bp.benchmarkValue,
        });
      }
    }

    const chartPoints: ChartDataPoint[] = filtered.map((point) => {
      const bm = benchmarkMap.get(point.date);
      return {
        date: format(parseISO(point.date), 'MMM d'),
        fullDate: point.date,
        returnPercent: point.profitPercent,
        invested: point.totalCostBasis,
        marketValue: point.totalMarketValue,
        benchmarkReturnPercent: bm?.returnPercent,
        benchmarkValue: bm?.value,
      };
    });

    const lastPoint = chartPoints[chartPoints.length - 1];
    const firstPoint = chartPoints[0];

    const bmLast = benchmarkMap.get(lastPoint.fullDate);

    return {
      chartData: chartPoints,
      gradientOffset: calculateGradientOffset(chartPoints),
      stats: {
        currentReturn: lastPoint.returnPercent,
        currentValue: lastPoint.marketValue,
        currentInvested: lastPoint.invested,
        absoluteProfit: lastPoint.marketValue - lastPoint.invested,
        benchmarkReturn: bmLast?.returnPercent,
        benchmarkValue: bmLast?.value,
        alphaPercent: bmLast !== undefined
          ? lastPoint.returnPercent - bmLast.returnPercent
          : undefined,
        startDate: firstPoint.fullDate,
        endDate: lastPoint.fullDate,
        daysCount: chartPoints.length,
      },
    };
  }, [data, benchmarkData, timeRange]);

  const isPositive = stats ? stats.currentReturn >= 0 : true;

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '1W', label: '1W' },
    { key: '1M', label: '1M' },
    { key: '3M', label: '3M' },
    { key: '6M', label: '6M' },
    { key: '1Y', label: '1Y' },
    { key: 'ALL', label: 'All' },
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
                Cumulative Return
                {stats && (
                  <span className={`text-sm font-normal px-2 py-0.5 rounded ${
                    isPositive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {isPositive ? '+' : ''}{stats.currentReturn.toFixed(2)}%
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
              {/* S&P 500 Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBenchmark((prev) => !prev)}
                className={`px-3 py-1 h-7 text-xs font-medium transition-all rounded-lg ${
                  showBenchmark
                    ? 'bg-white/10 text-white'
                    : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                vs S&P 500
              </Button>

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
            <div className={`grid gap-4 mb-6 ${showBenchmark ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs mb-1">Return</p>
                <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{stats.currentReturn.toFixed(2)}%
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs mb-1">Current Value</p>
                <p className="text-white font-semibold">
                  {formatCurrency(stats.currentValue)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs mb-1">Invested</p>
                <p className="text-blue-400 font-semibold">
                  {formatCurrency(stats.currentInvested)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs mb-1">Profit / Loss</p>
                <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.absoluteProfit >= 0 ? '+' : ''}{formatCurrency(stats.absoluteProfit)}
                </p>
              </div>
              {showBenchmark && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/40 text-xs mb-1">Alpha vs S&P</p>
                  <p className={`font-semibold ${
                    stats.alphaPercent !== undefined && stats.alphaPercent >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {stats.alphaPercent !== undefined
                      ? `${stats.alphaPercent >= 0 ? '+' : ''}${stats.alphaPercent.toFixed(2)}pp`
                      : '—'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chart */}
          <div className="h-75 relative">
            {showBenchmark && benchmarkLoading && (
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
                  {/* Split gradient: green above 0%, red below 0% */}
                  <linearGradient id="splitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#10b981" stopOpacity={0.05} />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#f43f5e" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#10b981" />
                    <stop offset={`${gradientOffset * 100}%`} stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f43f5e" />
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
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  domain={['auto', 'auto']}
                  width={55}
                />

                {/* Zero reference line */}
                <ReferenceLine
                  y={0}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />

                <Tooltip content={<CustomTooltip showBenchmark={showBenchmark} />} />

                {/* Portfolio Return % — split-colored area */}
                <Area
                  type="monotone"
                  dataKey="returnPercent"
                  name="Return"
                  stroke="url(#splitStroke)"
                  strokeWidth={2}
                  fill="url(#splitGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />

                {/* Benchmark Return % — dashed gray line */}
                {showBenchmark && (
                  <Line
                    type="monotone"
                    dataKey="benchmarkReturnPercent"
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

          <CustomLegend showBenchmark={showBenchmark} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
