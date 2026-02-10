'use client';

// ===========================================
// Add Transaction Modal Component
// ===========================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { Loader2, TrendingUp, TrendingDown, Plus, AlertTriangle, Zap } from 'lucide-react';
import { AssetSearchInput } from '@/components/asset-search-input';
import { getAssetQuote, type AssetSearchResult } from '@/actions/asset-search';
import { detectPriceMultiplier, applyMultiplier, type PriceAnomalyResult } from '@/lib/price-multiplier';
import { CURRENCIES, VALIDATION } from '@/lib/constants';
import type { AddTransactionForm, Currency } from '@/types';

// ===========================================
// FORM VALIDATION SCHEMA
// ===========================================

const addTransactionSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required'),
  isin: z.string().optional(),
  asset_name: z.string().min(1, 'Asset name is required'),
  asset_type: z.enum(['STOCK', 'CRYPTO', 'ETF', 'BOND', 'COMMODITY']),
  transaction_type: z.enum(['BUY', 'SELL']),
  quantity: z.number()
    .min(VALIDATION.MIN_QUANTITY, 'Quantity must be greater than 0')
    .max(VALIDATION.MAX_QUANTITY, 'Quantity is too large'),
  price_per_share: z.number()
    .min(VALIDATION.MIN_PRICE, 'Price must be greater than 0')
    .max(VALIDATION.MAX_PRICE, 'Price is too large'),
  currency: z.enum([
    'PLN', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CZK',
    'DKK', 'SEK', 'NOK', 'AUD', 'CAD', 'HKD', 'SGD',
    'NZD', 'MXN', 'ZAR', 'TRY', 'HUF', 'ILS', 'INR',
    'BRL', 'KRW', 'CNY', 'TWD', 'THB', 'MYR', 'IDR',
  ]),
  exchange_rate_to_pln: z.number()
    .min(VALIDATION.MIN_EXCHANGE_RATE, 'Exchange rate must be greater than 0')
    .max(VALIDATION.MAX_EXCHANGE_RATE, 'Exchange rate is too large'),
  fees: z.number().min(0).optional(),
  notes: z.string().max(VALIDATION.MAX_NOTES_LENGTH).optional(),
  broker: z.string().optional(),
  transaction_date: z.string().min(1, 'Date is required'),
});

type AddTransactionFormData = z.infer<typeof addTransactionSchema>;

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddTransactionForm) => Promise<void>;
}

export function AddTransactionModal({
  open,
  onClose,
  onSubmit,
}: AddTransactionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [anomaly, setAnomaly] = useState<PriceAnomalyResult | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [liveCurrency, setLiveCurrency] = useState<string | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddTransactionFormData>({
    resolver: zodResolver(addTransactionSchema),
    defaultValues: {
      transaction_type: 'BUY',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      fees: 0,
      exchange_rate_to_pln: 1,
    },
  });

  const currency = watch('currency');
  const transactionType = watch('transaction_type');
  const transactionDate = watch('transaction_date');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      reset({
        transaction_type: 'BUY',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        fees: 0,
        exchange_rate_to_pln: 1,
        currency: 'PLN',
      });
      setSelectedAsset(null);
      setAnomaly(null);
      setLivePrice(null);
      setLiveCurrency(null);
    }
  }, [open, reset]);

  // Handle asset selection from search
  const handleAssetSelect = async (result: AssetSearchResult) => {
    setSelectedAsset(result);
    setValue('ticker', result.ticker);
    setValue('asset_name', result.name);
    setValue('asset_type', result.assetType);
    if (result.isin) {
      setValue('isin', result.isin);
    }

    // Try to fetch current quote to prefill price/currency
    setIsLoadingQuote(true);
    setAnomaly(null);
    setLivePrice(null);
    setLiveCurrency(null);
    try {
      const quote = await getAssetQuote(result.ticker);
      if (quote) {
        setValue('price_per_share', quote.price);
        setValue('currency', quote.currency as Currency);
        setLivePrice(quote.price);
        setLiveCurrency(quote.currency);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Clear asset selection
  const handleAssetClear = () => {
    setSelectedAsset(null);
    setValue('ticker', '');
    setValue('asset_name', '');
    setValue('isin', '');
    setAnomaly(null);
    setLivePrice(null);
    setLiveCurrency(null);
  };

  // Auto-fetch exchange rate when currency or date changes
  useEffect(() => {
    const fetchRate = async () => {
      if (currency === 'PLN') {
        setValue('exchange_rate_to_pln', 1);
        return;
      }

      if (!currency || !transactionDate) {
        return;
      }

      setIsLoadingRate(true);
      try {
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
  // PRICE ANOMALY DETECTION
  // ===========================================
  // Runs whenever the user changes price manually AND we have a live quote

  const pricePerShare = watch('price_per_share');

  useEffect(() => {
    if (livePrice && pricePerShare && pricePerShare > 0) {
      const result = detectPriceMultiplier(pricePerShare, livePrice, liveCurrency || undefined);
      setAnomaly(result.detected ? result : null);
    } else {
      setAnomaly(null);
    }
  }, [pricePerShare, livePrice, liveCurrency]);

  // Apply suggested multiplier fix
  const handleApplyMultiplier = () => {
    if (!anomaly || !pricePerShare) return;
    const adjusted = applyMultiplier(pricePerShare, anomaly.suggestedMultiplier);
    setValue('price_per_share', adjusted);
    setAnomaly(null);
  };

  // ===========================================
  // FORM SUBMISSION
  // ===========================================

  const handleFormSubmit = async (data: AddTransactionFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        transaction_date: new Date(data.transaction_date),
        fees: data.fees || 0,
      });
      onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125 bg-[#0a0a0a] border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-500" />
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

          {/* Asset Search */}
          <div className="space-y-2">
            <Label>Search Asset</Label>
            <AssetSearchInput
              onSelect={handleAssetSelect}
              onClear={handleAssetClear}
              selectedAsset={selectedAsset}
              disabled={isSubmitting}
            />
            {errors.ticker && (
              <p className="text-rose-400 text-xs">{errors.ticker.message}</p>
            )}
            {isLoadingQuote && (
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading quote...
              </p>
            )}
          </div>

          {/* Transaction Date */}
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

          {/* Price Anomaly Alert */}
          {anomaly && (
            <div className={`rounded-lg p-3 flex items-start gap-3 ${
              anomaly.severity === 'auto' 
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'bg-rose-500/10 border border-rose-500/30'
            }`}>
              <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${
                anomaly.severity === 'auto' ? 'text-amber-400' : 'text-rose-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  anomaly.severity === 'auto' ? 'text-amber-300' : 'text-rose-300'
                }`}>
                  {anomaly.label}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Your price: {pricePerShare?.toFixed(2)} • Live: {livePrice?.toFixed(2)} • Ratio: {anomaly.ratio.toFixed(2)}×
                </p>
              </div>
              {anomaly.suggestedMultiplier !== 1 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyMultiplier}
                  className={`shrink-0 gap-1 ${
                    anomaly.severity === 'auto'
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border-rose-500/40'
                  }`}
                  variant="outline"
                >
                  <Zap className="h-3 w-3" />
                  Fix (×{anomaly.suggestedMultiplier})
                </Button>
              )}
            </div>
          )}

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
              {errors.currency && (
                <p className="text-rose-400 text-xs">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">
                Exchange Rate to PLN
                {isLoadingRate && (
                  <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
                )}
              </Label>
              <Input
                id="rate"
                type="number"
                step="any"
                {...register('exchange_rate_to_pln', { valueAsNumber: true })}
                className="bg-white/5 border-white/10 text-white"
              />
              {errors.exchange_rate_to_pln && (
                <p className="text-rose-400 text-xs">{errors.exchange_rate_to_pln.message}</p>
              )}
            </div>
          </div>

          {/* Fees */}
          <div className="space-y-2">
            <Label htmlFor="fees">Fees (optional)</Label>
            <Input
              id="fees"
              type="number"
              step="any"
              {...register('fees', { valueAsNumber: true })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="0.00"
            />
            {errors.fees && (
              <p className="text-rose-400 text-xs">{errors.fees.message}</p>
            )}
          </div>

          {/* Broker */}
          <div className="space-y-2">
            <Label htmlFor="broker">Broker (optional)</Label>
            <Input
              id="broker"
              type="text"
              {...register('broker')}
              className="bg-white/5 border-white/10 text-white"
              placeholder="e.g., XTB, Interactive Brokers"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              type="text"
              {...register('notes')}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Any additional notes..."
            />
            {errors.notes && (
              <p className="text-rose-400 text-xs">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedAsset}
              className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
