'use client';

// ===========================================
// Portfolio Chart Component
// ===========================================

import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { PortfolioSnapshot } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';

interface PortfolioChartProps {
  snapshots: PortfolioSnapshot[];
  isLoading?: boolean;
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export function PortfolioChart({ snapshots, isLoading }: PortfolioChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  // Filter snapshots based on time range
  const filteredSnapshots = filterByTimeRange(snapshots, timeRange);

  // Transform data for Recharts
  const chartData = filteredSnapshots.map((snapshot) => ({
    date: format(new Date(snapshot.snapshot_date), 'MMM d'),
    value: snapshot.total_value_pln,
    invested: snapshot.total_invested_pln,
    profit: snapshot.total_profit_pln,
  }));

  // Calculate if overall trend is positive
  const isPositive = chartData.length > 1 
    ? chartData[chartData.length - 1].value >= chartData[0].value 
    : true;

  const timeRanges: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white">
              Portfolio Performance
            </CardTitle>
            <div className="flex gap-1">
              {timeRanges.map((range) => (
                <Button
                  key={range}
                  variant="ghost"
                  size="sm"
                  className={`text-xs px-2 h-7 ${
                    timeRange === range
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white'
                  }`}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading || chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-white/40">
              {isLoading ? 'Loading chart...' : 'No historical data available'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? '#10b981' : '#f43f5e'}
                      stopOpacity={0.3}
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
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  formatter={(value) => [formatCurrency(value as number), 'Value']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Helper function to filter snapshots by time range
function filterByTimeRange(
  snapshots: PortfolioSnapshot[],
  range: TimeRange
): PortfolioSnapshot[] {
  if (range === 'ALL' || snapshots.length === 0) {
    return snapshots;
  }

  const now = new Date();
  let startDate: Date;

  switch (range) {
    case '1W':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1M':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3M':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6M':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1Y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return snapshots;
  }

  return snapshots.filter(
    (snapshot) => new Date(snapshot.snapshot_date) >= startDate
  );
}
