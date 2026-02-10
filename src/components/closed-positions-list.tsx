'use client';

// ===========================================
// Closed Positions List Component
// ===========================================
// Shows realized profit/loss from closed positions

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  DollarSign,
  Calendar,
  Building,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import type { ClosedPosition, Currency } from '@/types';

interface ClosedPositionsListProps {
  positions: ClosedPosition[];
  isLoading?: boolean;
  onDeleteAll?: () => void;
  isDeleting?: boolean;
}

export function ClosedPositionsList({ positions, onDeleteAll, isDeleting }: ClosedPositionsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate summary stats
  const totalRealizedPLN = positions.reduce((sum, p) => sum + p.realized_profit_pln, 0);
  const profitableCount = positions.filter(p => p.realized_profit_pln > 0).length;
  const losingCount = positions.filter(p => p.realized_profit_pln < 0).length;

  if (positions.length === 0) {
    return null;
  }

  const formatCurrency = (value: number, currency?: string) => {
    const symbol = currency ? CURRENCY_SYMBOLS[currency as Currency] || currency : 'zł';
    return `${value >= 0 ? '+' : ''}${value.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`;
  };

  const displayPositions = isExpanded ? positions : positions.slice(0, 5);

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Closed Positions</h2>
            <p className="text-sm text-white/40">{positions.length} realized trades</p>
          </div>
        </div>

        {/* Delete All + Summary */}
        <div className="flex items-center gap-3">
          {onDeleteAll && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteAll}
              disabled={isDeleting}
              title="Delete all closed positions"
              className="text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        <div className="text-right">
          <p className={`text-xl font-bold ${totalRealizedPLN >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalRealizedPLN)}
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="text-emerald-400">{profitableCount} profitable</span>
            <span>•</span>
            <span className="text-rose-400">{losingCount} losing</span>
          </div>
        </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="space-y-2">
        <AnimatePresence>
          {displayPositions.map((position) => (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    position.realized_profit_pln >= 0 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {position.realized_profit_pln >= 0 
                      ? <TrendingUp className="h-4 w-4" /> 
                      : <TrendingDown className="h-4 w-4" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white">{position.ticker}</span>
                      {position.asset_name && (
                        <span className="text-white/40 text-sm hidden sm:inline">
                          {position.asset_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>×{position.quantity_sold}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(position.closed_date), 'dd MMM yyyy')}
                      </span>
                      {position.broker && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {position.broker}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold ${
                    position.realized_profit_pln >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatCurrency(position.realized_profit_pln)}
                  </p>
                  <p className="text-xs text-white/40">
                    {position.avg_buy_price_original.toFixed(2)} → {position.sell_price.toFixed(2)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show More / Less Button */}
      {positions.length > 5 && (
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 text-white/60 hover:text-white hover:bg-white/5"
        >
          <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          {isExpanded ? 'Show Less' : `Show ${positions.length - 5} More`}
        </Button>
      )}
    </div>
  );
}
