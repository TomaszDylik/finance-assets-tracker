'use client';

// ===========================================
// Transaction History Component
// ===========================================
// Shows complete history of all transactions including sold positions

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  History,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Calendar,
  Building,
  Search,
  Filter,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import type { Transaction, Currency } from '@/types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}

export function TransactionHistory({ transactions, onEdit, onDelete }: TransactionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterBroker, setFilterBroker] = useState<string>('ALL');

  // Get unique brokers from transactions
  const uniqueBrokers = useMemo(() => {
    const brokers = new Set<string>();
    transactions.forEach(t => {
      if (t.broker) brokers.add(t.broker);
    });
    return Array.from(brokers);
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search filter
      const matchesSearch = !searchQuery || 
        t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.asset_name && t.asset_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.isin && t.isin.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Type filter
      const matchesType = filterType === 'ALL' || t.transaction_type === filterType;
      
      // Broker filter
      const matchesBroker = filterBroker === 'ALL' || t.broker === filterBroker;
      
      return matchesSearch && matchesType && matchesBroker;
    });
  }, [transactions, searchQuery, filterType, filterBroker]);

  // Sort by date (newest first)
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [filteredTransactions]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const buyCount = transactions.filter(t => t.transaction_type === 'BUY').length;
    const sellCount = transactions.filter(t => t.transaction_type === 'SELL').length;
    const totalBuyValue = transactions
      .filter(t => t.transaction_type === 'BUY')
      .reduce((sum, t) => sum + (t.quantity * t.price_per_share * t.exchange_rate_to_pln), 0);
    const totalSellValue = transactions
      .filter(t => t.transaction_type === 'SELL')
      .reduce((sum, t) => sum + (t.quantity * t.price_per_share * t.exchange_rate_to_pln), 0);
    
    return { buyCount, sellCount, totalBuyValue, totalSellValue };
  }, [transactions]);

  if (transactions.length === 0) {
    return null;
  }

  const formatCurrency = (value: number, currency?: string) => {
    const symbol = currency ? CURRENCY_SYMBOLS[currency as Currency] || currency : 'zł';
    return `${value.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`;
  };

  const displayTransactions = isExpanded ? sortedTransactions : sortedTransactions.slice(0, 5);

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center">
            <History className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Transaction History</h2>
            <p className="text-sm text-white/40">
              {stats.buyCount} buys • {stats.sellCount} sells • {transactions.length} total
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-white/40">Total Bought</p>
            <p className="text-sm font-medium text-emerald-400">
              {formatCurrency(stats.totalBuyValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">Total Sold</p>
            <p className="text-sm font-medium text-rose-400">
              {formatCurrency(stats.totalSellValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search by ticker, name, or ISIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
        
        <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
          <SelectTrigger className="w-full sm:w-[120px] bg-white/5 border-white/10 text-white">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="BUY">Buy Only</SelectItem>
            <SelectItem value="SELL">Sell Only</SelectItem>
          </SelectContent>
        </Select>

        {uniqueBrokers.length > 0 && (
          <Select value={filterBroker} onValueChange={setFilterBroker}>
            <SelectTrigger className="w-full sm:w-[140px] bg-white/5 border-white/10 text-white">
              <Building className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="ALL">All Brokers</SelectItem>
              {uniqueBrokers.map(broker => (
                <SelectItem key={broker} value={broker}>{broker}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        <AnimatePresence>
          {displayTransactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/[0.07] transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    transaction.transaction_type === 'BUY' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {transaction.transaction_type === 'BUY' 
                      ? <TrendingUp className="h-4 w-4" /> 
                      : <TrendingDown className="h-4 w-4" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        transaction.transaction_type === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {transaction.transaction_type}
                      </span>
                      <span className="font-mono font-semibold text-white">{transaction.ticker}</span>
                      {transaction.asset_name && transaction.asset_name !== transaction.ticker && (
                        <span className="text-white/40 text-sm hidden sm:inline">
                          {transaction.asset_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                      <span>×{transaction.quantity}</span>
                      <span>@</span>
                      <span>
                        {formatCurrency(transaction.price_per_share, transaction.currency)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                      </span>
                      {transaction.broker && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {transaction.broker}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-white">
                    {formatCurrency(
                      transaction.quantity * transaction.price_per_share * transaction.exchange_rate_to_pln
                    )}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatCurrency(transaction.quantity * transaction.price_per_share, transaction.currency)}
                  </p>
                </div>

                <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(transaction);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(transaction.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No results */}
      {sortedTransactions.length === 0 && (searchQuery || filterType !== 'ALL' || filterBroker !== 'ALL') && (
        <div className="text-center py-8 text-white/40">
          No transactions match your filters
        </div>
      )}

      {/* Show More / Less Button */}
      {sortedTransactions.length > 5 && (
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 text-white/60 hover:text-white hover:bg-white/5"
        >
          <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          {isExpanded ? 'Show Less' : `Show ${sortedTransactions.length - 5} More`}
        </Button>
      )}
    </div>
  );
}
