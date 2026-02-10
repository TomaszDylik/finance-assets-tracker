'use client';

// ===========================================
// Portfolio Summary Component
// ===========================================

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, PieChart, Activity, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/calculations';
import type { PortfolioSummary as PortfolioSummaryType } from '@/lib/calculations';
import type { LucideIcon } from 'lucide-react';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
  lastUpdated?: Date;
}

interface StatItem {
  label: string;
  value: string;
  subValue?: string;
  tooltip?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export function PortfolioSummary({ summary, lastUpdated }: PortfolioSummaryProps) {
  const isProfit = summary.totalReturnPLN >= 0;
  const isDayPositive = summary.dayChangePLN >= 0;
  const hasRealizedProfit = summary.realizedProfitPLN !== 0;

  const stats: StatItem[] = [
    {
      label: 'Total Value',
      value: formatCurrency(summary.totalValuePLN),
      icon: Wallet,
      color: 'text-white',
      bgColor: 'from-white/10 to-white/5',
    },
    {
      label: 'Invested',
      value: formatCurrency(summary.totalInvestedPLN),
      icon: PieChart,
      color: 'text-white/80',
      bgColor: 'from-indigo-500/20 to-indigo-500/5',
    },
    {
      label: 'Total Return',
      value: formatCurrency(Math.abs(summary.totalReturnPLN)),
      subValue: formatPercentage(summary.totalReturnPercent),
      tooltip: hasRealizedProfit 
        ? `Unrealized: ${formatCurrency(summary.unrealizedReturnPLN)} | Realized: ${formatCurrency(summary.realizedProfitPLN)}`
        : undefined,
      icon: isProfit ? TrendingUp : TrendingDown,
      color: isProfit ? 'text-emerald-400' : 'text-rose-400',
      bgColor: isProfit ? 'from-emerald-500/20 to-emerald-500/5' : 'from-rose-500/20 to-rose-500/5',
    },
    {
      label: 'Day Change',
      value: formatCurrency(Math.abs(summary.dayChangePLN)),
      subValue: formatPercentage(summary.dayChangePercent),
      icon: Activity,
      color: isDayPositive ? 'text-emerald-400' : 'text-rose-400',
      bgColor: isDayPositive ? 'from-emerald-500/10 to-emerald-500/5' : 'from-rose-500/10 to-rose-500/5',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl overflow-hidden relative">
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-50`} />
              
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    {stat.label}
                  </p>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className={`text-xl lg:text-2xl font-bold font-mono ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.subValue && (
                  <p className={`text-sm font-mono mt-1 ${stat.color}`}>
                    {stat.subValue}
                  </p>
                )}
                {stat.tooltip && (
                  <p className="text-[10px] text-white/30 mt-1" title={stat.tooltip}>
                    {stat.tooltip}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Asset Count & Last Updated */}
      <div className="flex items-center justify-between text-sm text-white/40">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4" />
          <span>{summary.assetCount} assets in portfolio</span>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
