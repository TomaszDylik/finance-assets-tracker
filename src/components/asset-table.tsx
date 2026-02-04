'use client';

// ===========================================
// Asset Table Component (Desktop View)
// ===========================================

import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  formatCurrency,
  formatPercentage,
  formatQuantity,
} from '@/lib/calculations';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import type { Holding } from '@/types';
import { format } from 'date-fns';

// ===========================================
// Sort Icon Component (declared outside to avoid recreation)
// ===========================================

function SortIcon({ 
  column, 
  sortColumn, 
  sortDirection 
}: { 
  column: string; 
  sortColumn?: string; 
  sortDirection?: 'asc' | 'desc'; 
}) {
  if (sortColumn !== column) return null;
  return sortDirection === 'asc' ? (
    <ChevronUp className="h-3 w-3 ml-1 inline" />
  ) : (
    <ChevronDown className="h-3 w-3 ml-1 inline" />
  );
}

interface AssetTableProps {
  holdings: Holding[];
  onDelete?: (ticker: string) => void;
  onSort?: (column: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export function AssetTable({
  holdings,
  onDelete,
  onSort,
  sortColumn,
  sortDirection,
}: AssetTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleExpand = (ticker: string) => {
    setExpandedRow(expandedRow === ticker ? null : ticker);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead
              className="text-white/60 cursor-pointer hover:text-white transition-colors"
              onClick={() => onSort?.('ticker')}
            >
              Asset <SortIcon column="ticker" sortColumn={sortColumn} sortDirection={sortDirection} />
            </TableHead>
            <TableHead className="text-white/60 text-right">Quantity</TableHead>
            <TableHead
              className="text-white/60 text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => onSort?.('avg_price')}
            >
              Avg Price <SortIcon column="avg_price" sortColumn={sortColumn} sortDirection={sortDirection} />
            </TableHead>
            <TableHead className="text-white/60 text-right">Current</TableHead>
            <TableHead
              className="text-white/60 text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => onSort?.('day_change')}
            >
              Day <SortIcon column="day_change" sortColumn={sortColumn} sortDirection={sortDirection} />
            </TableHead>
            <TableHead
              className="text-white/60 text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => onSort?.('value')}
            >
              Value (PLN) <SortIcon column="value" sortColumn={sortColumn} sortDirection={sortDirection} />
            </TableHead>
            <TableHead
              className="text-white/60 text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => onSort?.('return')}
            >
              Return <SortIcon column="return" sortColumn={sortColumn} sortDirection={sortDirection} />
            </TableHead>
            <TableHead className="text-white/60 text-right w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding, index) => {
            const isProfit = (holding.total_return_pln ?? 0) >= 0;
            const isDayPositive = (holding.day_change_percent ?? 0) >= 0;
            const isExpanded = expandedRow === holding.ticker;

            return (
              <Fragment key={holding.ticker}>
                <TableRow
                  className="border-white/5 hover:bg-white/[0.03] cursor-pointer group"
                  onClick={() => toggleExpand(holding.ticker)}
                >
                  {/* Asset */}
                  <TableCell className="font-medium">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {holding.ticker.slice(0, 3)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{holding.ticker}</p>
                        <p className="text-xs text-white/50 truncate max-w-[120px]">
                          {holding.asset_name}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-white/10 text-white/40"
                      >
                        {holding.asset_type}
                      </Badge>
                    </motion.div>
                  </TableCell>

                  {/* Quantity */}
                  <TableCell className="text-right font-mono text-white/80">
                    {formatQuantity(holding.total_quantity)}
                  </TableCell>

                  {/* Avg Price */}
                  <TableCell className="text-right">
                    <span className="font-mono text-white/80">
                      {CURRENCY_SYMBOLS[holding.original_currency]}
                      {holding.avg_buy_price.toFixed(2)}
                    </span>
                  </TableCell>

                  {/* Current Price */}
                  <TableCell className="text-right">
                    <span className="font-mono text-white">
                      {holding.current_price !== undefined
                        ? `${CURRENCY_SYMBOLS[holding.original_currency]}${holding.current_price.toFixed(2)}`
                        : '—'}
                    </span>
                  </TableCell>

                  {/* Day Change */}
                  <TableCell className="text-right">
                    <span
                      className={`font-mono inline-flex items-center gap-1 ${
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
                    </span>
                  </TableCell>

                  {/* Value */}
                  <TableCell className="text-right">
                    <span className="font-mono font-semibold text-white">
                      {holding.current_value_pln !== undefined
                        ? formatCurrency(holding.current_value_pln)
                        : formatCurrency(holding.total_invested_pln)}
                    </span>
                  </TableCell>

                  {/* Return */}
                  <TableCell className="text-right">
                    <div
                      className={`font-mono flex items-center justify-end gap-1 ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>
                        {holding.total_return_pln !== undefined
                          ? formatCurrency(Math.abs(holding.total_return_pln))
                          : '—'}
                      </span>
                      <span className="text-xs text-white/50">
                        ({holding.total_return_percent !== undefined
                          ? formatPercentage(holding.total_return_percent)
                          : '—'})
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4 text-white/40" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#0a0a0a] border-white/10"
                      >
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(holding.ticker);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete All Transactions
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>

                {/* Expanded Row - Transaction History */}
                <AnimatePresence>
                  {isExpanded && (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={8} className="p-0 bg-black/30">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-6 py-4"
                        >
                          <h4 className="text-sm font-medium text-white/60 mb-3">
                            Transaction History for {holding.ticker}
                          </h4>
                          <div className="grid grid-cols-5 gap-4 text-xs text-white/40 mb-2 px-3">
                            <span>Date</span>
                            <span>Type</span>
                            <span className="text-right">Quantity</span>
                            <span className="text-right">Price</span>
                            <span className="text-right">Exchange Rate</span>
                          </div>
                          <div className="space-y-1">
                            {holding.transactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="grid grid-cols-5 gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-sm"
                              >
                                <span className="text-white/70">
                                  {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                                </span>
                                <span>
                                  <Badge
                                    className={`text-xs ${
                                      tx.transaction_type === 'BUY'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                    }`}
                                  >
                                    {tx.transaction_type}
                                  </Badge>
                                </span>
                                <span className="text-right font-mono text-white/80">
                                  {formatQuantity(tx.quantity)}
                                </span>
                                <span className="text-right font-mono text-white/80">
                                  {CURRENCY_SYMBOLS[tx.currency]}
                                  {tx.price_per_share.toFixed(2)}
                                </span>
                                <span className="text-right font-mono text-white/50">
                                  {tx.exchange_rate_to_pln.toFixed(4)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
