'use client';

// ===========================================
// Portfolio Performance Chart Component
// Like MyFund - shows % gains/losses over time
// ===========================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { PortfolioSnapshot } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { format, subDays, subMonths, subYears, isAfter } from 'date-fns';

interface PortfolioPerformanceChartProps {
  snapshots: PortfolioSnapshot[];
  isLoading?: boolean;
  currentValue?: number;
  totalInvested?: number;
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface ChartDataPoint {
  date: string;
  fullDate: string;
  value: number;
  invested: number;
  percentChange: number;
  absoluteChange: number;
}

// Custom tooltip component - defined outside to avoid recreation during render
function CustomTooltip({ active, payload }: { 
  active?: boolean; 
  payload?: Array<{ value: number; payload: ChartDataPoint }>; 
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isUp = data.percentChange >= 0;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-white/60 text-xs mb-1">{data.fullDate}</p>
      <p className="text-white font-semibold">{formatCurrency(data.value)}</p>
      <div className={`flex items-center gap-1 text-sm ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{isUp ? '+' : ''}{data.percentChange.toFixed(2)}%</span>
        <span className="text-white/40">
          ({isUp ? '+' : ''}{formatCurrency(data.absoluteChange)})
        </span>
      </div>
    </div>
  );
}

export function PortfolioPerformanceChart({ 
  snapshots, 
  isLoading,
  currentValue = 0,
}: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  // Filter and transform data based on time range
  const { chartData, stats } = useMemo(() => {
    if (snapshots.length === 0) {
      return { chartData: [], stats: null };
    }

    // Get date range filter
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1W':
        startDate = subDays(now, 7);
        break;
      case '1M':
        startDate = subMonths(now, 1);
        break;
      case '3M':
        startDate = subMonths(now, 3);
        break;
      case '6M':
        startDate = subMonths(now, 6);
        break;
      case '1Y':
        startDate = subYears(now, 1);
        break;
      case 'ALL':
      default:
        startDate = new Date(0); // Beginning of time
    }

    // Filter snapshots
    const filtered = snapshots.filter((s) => 
      isAfter(new Date(s.snapshot_date), startDate)
    );

    if (filtered.length === 0) {
      return { chartData: [], stats: null };
    }

    // Transform to chart data with percentage change based on invested (profit/loss %)
    const data: ChartDataPoint[] = filtered.map((snapshot) => {
      // Calculate percentage as profit/loss relative to invested amount
      const invested = snapshot.total_invested_pln;
      const profit = snapshot.total_value_pln - invested;
      const percentChange = invested > 0 ? (profit / invested) * 100 : 0;
      
      return {
        date: format(new Date(snapshot.snapshot_date), 'MMM d'),
        fullDate: format(new Date(snapshot.snapshot_date), 'yyyy-MM-dd'),
        value: snapshot.total_value_pln,
        invested: snapshot.total_invested_pln,
        percentChange: Number(percentChange.toFixed(2)),
        absoluteChange: profit,
      };
    });

    // Calculate period stats
    const lastPoint = data[data.length - 1];
    const firstPoint = data[0];
    const periodChange = lastPoint.percentChange;
    const periodAbsoluteChange = lastPoint.absoluteChange;
    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));
    const maxPercent = Math.max(...data.map((d) => d.percentChange));
    const minPercent = Math.min(...data.map((d) => d.percentChange));

    return {
      chartData: data,
      stats: {
        periodChange,
        periodAbsoluteChange,
        maxValue,
        minValue,
        maxPercent,
        minPercent,
        startDate: firstPoint.fullDate,
        endDate: lastPoint.fullDate,
        daysCount: data.length,
      },
    };
  }, [snapshots, timeRange]);

  // Check if overall trend is positive
  const isPositive = stats ? stats.periodChange >= 0 : true;

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '1W', label: '1W' },
    { key: '1M', label: '1M' },
    { key: '3M', label: '3M' },
    { key: '6M', label: '6M' },
    { key: '1Y', label: '1Y' },
    { key: 'ALL', label: 'All' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                Portfolio Performance
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
                  {stats.startDate} → {stats.endDate} ({stats.daysCount} days)
                </p>
              )}
            </div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {timeRanges.map((range) => (
                <Button
                  key={range.key}
                  variant="ghost"
                  size="sm"
                  className={`text-xs px-3 h-7 transition-all ${
                    timeRange === range.key
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setTimeRange(range.key)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs">Period Change</p>
                <p className={`text-lg font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(stats.periodAbsoluteChange)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs">Current Value</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(currentValue || chartData[chartData.length - 1]?.value || 0)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs">Period High</p>
                <p className="text-lg font-semibold text-emerald-400">
                  +{stats.maxPercent.toFixed(2)}%
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs">Period Low</p>
                <p className="text-lg font-semibold text-rose-400">
                  {stats.minPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-white/40">
              <div className="animate-pulse">Loading chart...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-white/40">
              <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
              <p>No historical data available</p>
              <p className="text-xs mt-1">Portfolio snapshots will appear after your first day</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? '#10b981' : '#f43f5e'}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? '#10b981' : '#f43f5e'}
                      stopOpacity={0}
                    />
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
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  domain={['auto', 'auto']}
                />
                <ReferenceLine 
                  y={0} 
                  stroke="rgba(255,255,255,0.2)" 
                  strokeDasharray="5 5" 
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="percentChange"
                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPercent)"
                  dot={false}
                  activeDot={{ r: 4, fill: isPositive ? '#10b981' : '#f43f5e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
