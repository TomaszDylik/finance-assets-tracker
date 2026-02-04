'use client';

// ===========================================
// Add Transaction Modal Component
// ===========================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, TrendingDown, X, AlertCircle } from 'lucide-react';
import { searchTickers } from '@/lib/yahoo';
import { useDebounce } from '@/hooks';
import { CURRENCIES, SEARCH_DEBOUNCE_MS, VALIDATION } from '@/lib/constants';
import type { SearchResult, AssetType, Currency, AddTransactionForm } from '@/types';

// ===========================================
// FORM VALIDATION SCHEMA
// ===========================================

const transactionSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required'),
  asset_name: z.string().min(1, 'Asset name is required'),
  asset_type: z.enum(['STOCK', 'CRYPTO', 'ETF', 'BOND', 'COMMODITY']),
  transaction_type: z.enum(['BUY', 'SELL']),
  quantity: z.number()
    .min(VALIDATION.MIN_QUANTITY, 'Quantity must be greater than 0')
    .max(VALIDATION.MAX_QUANTITY, 'Quantity is too large'),
  price_per_share: z.number()
    .min(VALIDATION.MIN_PRICE, 'Price must be greater than 0')
    .max(VALIDATION.MAX_PRICE, 'Price is too large'),
  currency: z.enum(['PLN', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CZK']),
  exchange_rate_to_pln: z.number()
    .min(VALIDATION.MIN_EXCHANGE_RATE, 'Exchange rate must be greater than 0')
    .max(VALIDATION.MAX_EXCHANGE_RATE, 'Exchange rate is too large'),
  fees: z.number().min(0).optional(),
  notes: z.string().max(VALIDATION.MAX_NOTES_LENGTH).optional(),
  transaction_date: z.string().min(1, 'Date is required'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddTransactionForm) => Promise<void>;
  defaultTicker?: string;
}

export function AddTransactionModal({
  open,
  onClose,
  onSubmit,
  defaultTicker,
}: AddTransactionModalProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState(defaultTicker || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SearchResult | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      ticker: '',
      asset_name: '',
      asset_type: 'STOCK',
      transaction_type: 'BUY',
      quantity: 1,
      price_per_share: 0,
      currency: 'USD',
      exchange_rate_to_pln: 1,
      fees: 0,
      notes: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const currency = watch('currency');
  const transactionType = watch('transaction_type');
  const transactionDate = watch('transaction_date');

  // ===========================================
  // DEBOUNCED TICKER SEARCH
  // ===========================================

  useEffect(() => {
    if (debouncedSearch.length < 1) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      try {
        const results = await searchTickers(debouncedSearch);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedSearch]);

  // ===========================================
  // AUTO-FETCH EXCHANGE RATE BASED ON DATE AND CURRENCY
  // ===========================================

  useEffect(() => {
    const fetchRate = async () => {
      if (currency === 'PLN') {
        setValue('exchange_rate_to_pln', 1);
        return;
      }

      if (!transactionDate) {
        return;
      }

      setIsLoadingRate(true);
      try {
        // Import the historical rate function
        const { getHistoricalExchangeRate } = await import('@/lib/yahoo');
        const rate = await getHistoricalExchangeRate(currency as Currency, new Date(transactionDate));
        setValue('exchange_rate_to_pln', rate);
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
      } finally {
        setIsLoadingRate(false);
      }
    };

    fetchRate();
  }, [currency, transactionDate, setValue]);

  // ===========================================
  // SELECT ASSET FROM SEARCH
  // ===========================================

  const handleSelectAsset = (result: SearchResult) => {
    setSelectedAsset(result);
    setSearchQuery(result.symbol);
    setShowResults(false);
    
    setValue('ticker', result.symbol);
    setValue('asset_name', result.name);
    setValue('asset_type', result.type as AssetType);
  };

  // ===========================================
  // FORM SUBMISSION
  // ===========================================

  const handleFormSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      // Convert transaction_date string to Date object
      const formData: AddTransactionForm = {
        ...data,
        transaction_date: new Date(data.transaction_date),
      };
      await onSubmit(formData);
      reset();
      setSearchQuery('');
      setSelectedAsset(null);
      onClose();
    } catch (error) {
      console.error('Error submitting transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setSearchQuery('');
      setSelectedAsset(null);
      setSearchResults([]);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {transactionType === 'BUY' ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-rose-500" />
            )}
            Add Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={transactionType === 'BUY' ? 'default' : 'outline'}
              className={`flex-1 ${
                transactionType === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'border-white/10 text-white/60 hover:text-white'
              }`}
              onClick={() => setValue('transaction_type', 'BUY')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy
            </Button>
            <Button
              type="button"
              variant={transactionType === 'SELL' ? 'default' : 'outline'}
              className={`flex-1 ${
                transactionType === 'SELL'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30'
                  : 'border-white/10 text-white/60 hover:text-white'
              }`}
              onClick={() => setValue('transaction_type', 'SELL')}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell
            </Button>
          </div>

          {/* Transaction Date - MOVED TO TOP */}
          <div className="space-y-2">
            <Label htmlFor="date">Transaction Date</Label>
            <Input
              id="date"
              type="date"
              {...register('transaction_date')}
              className="bg-white/5 border-white/10 text-white"
            />
            {errors.transaction_date && (
              <p className="text-rose-400 text-xs">{errors.transaction_date.message}</p>
            )}
          </div>

          {/* Ticker Search */}
          <div className="space-y-2">
            <Label htmlFor="ticker">Search Ticker</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                id="ticker"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                placeholder="Search for AAPL, PKO.WA, BTC-USD..."
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-white/40" />
              )}
              {selectedAsset && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    setSelectedAsset(null);
                    setSearchQuery('');
                    setValue('ticker', '');
                    setValue('asset_name', '');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showResults && !selectedAsset && searchQuery.length >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-1"
                >
                  <div className="rounded-md border border-white/10 bg-[#0a0a0a] max-h-[250px] overflow-hidden">
                    {isSearching ? (
                      <div className="px-4 py-8 text-center text-white/60">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        <p>Searching...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        {searchResults.map((result, index) => (
                          <button
                            key={`${result.symbol}-${result.exchange}-${index}`}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0"
                            onClick={() => handleSelectAsset(result)}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-mono font-semibold text-white">
                                {result.symbol}
                              </span>
                              <span className="text-white/60 ml-2 text-sm truncate block">
                                {result.name}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs border-white/20 text-white/60 ml-2">
                              {result.exchange}
                            </Badge>
                          </button>
                        ))}
                      </ScrollArea>
                    ) : (
                      <div className="px-4 py-6">
                        <div className="text-center text-white/60 mb-3">
                          <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                          <p className="text-sm">No results found for &quot;{searchQuery}&quot;</p>
                        </div>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/30 transition-colors"
                          onClick={() => handleSelectAsset({
                            symbol: searchQuery.toUpperCase(),
                            name: searchQuery.toUpperCase(),
                            exchange: 'Manual Entry',
                            type: 'STOCK',
                            exchDisp: 'Manual',
                          })}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-sm">→</span>
                            <div>
                              <span className="font-mono font-semibold text-emerald-400 block">
                                {searchQuery.toUpperCase()}
                              </span>
                              <span className="text-white/60 text-xs">
                                Add manually (enter details yourself)
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {errors.ticker && (
              <p className="text-rose-400 text-sm flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.ticker.message}
              </p>
            )}
          </div>

          {/* Selected Asset Badge */}
          {selectedAsset && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-white">
                    {selectedAsset.symbol}
                  </span>
                  <p className="text-sm text-white/60">{selectedAsset.name}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {selectedAsset.type}
                </Badge>
              </div>
            </motion.div>
          )}

          {/* Quantity and Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                {...register('quantity', { valueAsNumber: true })}
                className="bg-white/5 border-white/10 text-white"
              />
              {errors.quantity && (
                <p className="text-rose-400 text-xs">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price per Share</Label>
              <Input
                id="price"
                type="number"
                step="any"
                {...register('price_per_share', { valueAsNumber: true })}
                className="bg-white/5 border-white/10 text-white"
              />
              {errors.price_per_share && (
                <p className="text-rose-400 text-xs">{errors.price_per_share.message}</p>
              )}
            </div>
          </div>

          {/* Currency and Exchange Rate Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(val) => setValue('currency', val as Currency)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-white">
                      {c.symbol} {c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchange_rate" className="flex items-center gap-2">
                Exchange Rate to PLN
                {isLoadingRate && <Loader2 className="h-3 w-3 animate-spin" />}
              </Label>
              <Input
                id="exchange_rate"
                type="number"
                step="any"
                {...register('exchange_rate_to_pln', { valueAsNumber: true })}
                className="bg-white/5 border-white/10 text-white"
                disabled={currency === 'PLN'}
              />
              {errors.exchange_rate_to_pln && (
                <p className="text-rose-400 text-xs">{errors.exchange_rate_to_pln.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Add any notes..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !selectedAsset}
            className={`w-full ${
              transactionType === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {transactionType === 'BUY' ? (
                  <TrendingUp className="h-4 w-4 mr-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-2" />
                )}
                {transactionType === 'BUY' ? 'Add Buy Transaction' : 'Add Sell Transaction'}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
