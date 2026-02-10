'use client';

// ===========================================
// Asset Card Component (Mobile View)
// ===========================================

import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp,
  MoreVertical,
  Trash2,
  History,
  Pencil
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  formatCurrency, 
  formatPercentage, 
  formatQuantity 
} from '@/lib/calculations';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import type { Holding } from '@/types';
import { format } from 'date-fns';

interface AssetCardProps {
  holding: Holding;
  onDelete?: (ticker: string) => void;
  onEdit?: (holding: Holding, transactionId: string) => void;
  index: number;
}

export function AssetCard({ holding, onDelete, onEdit, index }: AssetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isProfit = (holding.total_return_pln ?? 0) >= 0;
  const isDayPositive = (holding.day_change_percent ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Main Content */}
          <div
            className="p-4 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Ticker Badge */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {holding.ticker.slice(0, 4)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{holding.ticker}</h3>
                  <p className="text-sm text-white/60 truncate max-w-[150px]">
                    {holding.asset_name}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className="text-xs border-white/10 text-white/50"
                >
                  {holding.asset_type}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4 text-white/40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="bg-[#0a0a0a] border-white/10"
                  >
                    <DropdownMenuItem 
                      className="text-white/80 focus:text-white focus:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </DropdownMenuItem>
                    {onDelete && (
                      <DropdownMenuItem 
                        className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(holding.ticker);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Quantity & Avg Price */}
              <div className="space-y-1">
                <p className="text-xs text-white/40 uppercase tracking-wide">
                  Quantity
                </p>
                <p className="font-mono text-white">
                  {formatQuantity(holding.total_quantity)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-white/40 uppercase tracking-wide">
                  Avg Price
                </p>
                <p className="font-mono text-white">
                  {CURRENCY_SYMBOLS[holding.original_currency]}
                  {holding.avg_buy_price.toFixed(2)}
                </p>
              </div>

              {/* Current Price & Day Change */}
              <div className="space-y-1">
                <p className="text-xs text-white/40 uppercase tracking-wide">
                  Current Price
                </p>
                <p className="font-mono text-white">
                  {holding.current_price !== undefined
                    ? `${CURRENCY_SYMBOLS[holding.original_currency]}${holding.current_price.toFixed(2)}`
                    : '—'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-white/40 uppercase tracking-wide">
                  Day Change
                </p>
                <p
                  className={`font-mono flex items-center gap-1 ${
                    isDayPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isDayPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {holding.day_change_percent !== undefined
                    ? formatPercentage(holding.day_change_percent)
                    : '—'}
                </p>
              </div>
            </div>

            {/* Value & Return Row */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">
                    Total Value
                  </p>
                  <p className="font-mono text-lg font-semibold text-white">
                    {holding.current_value_pln !== undefined
                      ? formatCurrency(holding.current_value_pln)
                      : formatCurrency(holding.total_invested_pln)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">
                    Total Return
                  </p>
                  <div
                    className={`flex items-center justify-end gap-1 ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isProfit ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="font-mono font-semibold">
                      {holding.total_return_pln !== undefined
                        ? formatCurrency(Math.abs(holding.total_return_pln))
                        : '—'}
                    </span>
                    <span className="text-sm">
                      ({holding.total_return_percent !== undefined
                        ? formatPercentage(holding.total_return_percent)
                        : '—'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expand Indicator */}
            <div className="flex justify-center mt-3">
              <button className="text-white/40 hover:text-white/60 transition-colors">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded Transaction History */}
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/5"
            >
              <div className="p-4 bg-black/20">
                <h4 className="text-sm font-medium text-white/60 mb-3">
                  Transaction History
                </h4>
                <div className="space-y-2">
                  {holding.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 group"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs ${
                            tx.transaction_type === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {tx.transaction_type}
                        </Badge>
                        <span className="text-sm text-white/80">
                          {formatQuantity(tx.quantity)} @ {CURRENCY_SYMBOLS[tx.currency]}
                          {tx.price_per_share.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-white/50">
                            {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-white/30">
                            Rate: {tx.exchange_rate_to_pln.toFixed(4)}
                          </p>
                        </div>
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(holding, tx.id);
                            }}
                          >
                            <Pencil className="h-3 w-3 text-white/60 hover:text-white" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
