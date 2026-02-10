'use client';

// ===========================================
// Edit Transaction Modal Component
// ===========================================

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Save, AlertCircle } from 'lucide-react';
import { CURRENCIES, VALIDATION } from '@/lib/constants';
import type { Transaction, AssetType, Currency } from '@/types';

// ===========================================
// FORM VALIDATION SCHEMA
// ===========================================

const editTransactionSchema = z.object({
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

type EditTransactionFormData = z.infer<typeof editTransactionSchema>;

interface EditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<EditTransactionFormData>) => Promise<void>;
  transaction: Transaction | null;
}

export function EditTransactionModal({
  open,
  onClose,
  onSave,
  transaction,
}: EditTransactionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditTransactionFormData>({
    resolver: zodResolver(editTransactionSchema),
  });

  const currency = watch('currency');
  const transactionType = watch('transaction_type');
  const transactionDate = watch('transaction_date');

  // Initialize form with transaction data
  useEffect(() => {
    if (transaction && open) {
      reset({
        ticker: transaction.ticker,
        isin: transaction.isin || '',
        asset_name: transaction.asset_name || '',
        asset_type: transaction.asset_type,
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        price_per_share: transaction.price_per_share,
        currency: transaction.currency,
        exchange_rate_to_pln: transaction.exchange_rate_to_pln,
        fees: transaction.fees || 0,
        notes: transaction.notes || '',
        broker: transaction.broker || '',
        transaction_date: format(new Date(transaction.transaction_date), 'yyyy-MM-dd'),
      });
    }
  }, [transaction, open, reset]);

  // Auto-fetch exchange rate when currency or date changes
  useEffect(() => {
    const fetchRate = async () => {
      if (currency === 'PLN') {
        setValue('exchange_rate_to_pln', 1);
        return;
      }

      if (!transactionDate) {
        return;
      }

      // Only fetch if currency changed from the original
      if (transaction && currency === transaction.currency) {
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
  }, [currency, transactionDate, setValue, transaction]);

  // ===========================================
  // FORM SUBMISSION
  // ===========================================

  const handleFormSubmit = async (data: EditTransactionFormData) => {
    if (!transaction) return;
    
    setIsSubmitting(true);
    try {
      await onSave(transaction.id, {
        ...data,
        transaction_date: data.transaction_date,
      });
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

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
            Edit Transaction
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

          {/* Asset Info (Read-only) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-white">
                  {transaction.ticker}
                </span>
                <p className="text-sm text-white/60">{transaction.asset_name}</p>
              </div>
              <Badge className="bg-white/10 text-white/60 border-white/20">
                {transaction.asset_type}
              </Badge>
            </div>
          </motion.div>

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

          {/* Fees and Broker Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                type="number"
                step="any"
                {...register('fees', { valueAsNumber: true })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broker">Broker</Label>
              <Input
                id="broker"
                {...register('broker')}
                placeholder="e.g., XTB, mBank..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
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
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
