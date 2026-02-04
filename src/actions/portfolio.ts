'use server';

// ===========================================
// Portfolio Server Actions
// ===========================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PortfolioSnapshot } from '@/types';

// ===========================================
// GET PORTFOLIO SNAPSHOTS
// ===========================================

export async function getPortfolioSnapshots(): Promise<PortfolioSnapshot[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.error('Error fetching portfolio snapshots:', error);
    throw new Error('Failed to fetch portfolio snapshots');
  }

  return data as PortfolioSnapshot[];
}

// ===========================================
// SAVE PORTFOLIO SNAPSHOT
// ===========================================

export async function savePortfolioSnapshot(
  totalValuePLN: number,
  totalInvestedPLN: number,
  totalProfitPLN: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const today = new Date().toISOString().split('T')[0];

  // Upsert to avoid duplicates for the same day
  const { error } = await supabase
    .from('portfolio_snapshots')
    .upsert({
      user_id: user.id,
      snapshot_date: today,
      total_value_pln: totalValuePLN,
      total_invested_pln: totalInvestedPLN,
      total_profit_pln: totalProfitPLN,
    }, {
      onConflict: 'user_id,snapshot_date',
    });

  if (error) {
    console.error('Error saving portfolio snapshot:', error);
    throw new Error('Failed to save portfolio snapshot');
  }
}

// ===========================================
// GENERATE HISTORICAL SNAPSHOTS
// ===========================================

/**
 * Generate historical portfolio snapshots from transactions
 * This should be called once after first transactions or when refreshing history
 */
export async function generateHistoricalSnapshots(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check if we already have historical data
  const { data: existingSnapshots } = await supabase
    .from('portfolio_snapshots')
    .select('snapshot_date')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: true })
    .limit(1);

  // Skip if we already have more than 5 days of data
  const { count } = await supabase
    .from('portfolio_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (count && count > 5) {
    console.log('Historical snapshots already exist, skipping generation');
    return;
  }

  // Get all transactions to determine date range
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: true });

  if (!transactions || transactions.length === 0) {
    return;
  }

  // Import Yahoo Finance functions (will be used server-side)
  const { getMultipleHistoricalPrices } = await import('@/lib/yahoo');
  
  // Get earliest transaction date (use transaction_date from the transaction itself)
  const firstTransactionDate = new Date(transactions[0].transaction_date);
  // Set to start of day to avoid timezone issues
  const startDate = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), firstTransactionDate.getDate());
  const endDate = new Date();
  
  // Get unique tickers
  const tickers = [...new Set(transactions.map((t) => t.ticker))];
  
  // Fetch historical prices for all tickers from first transaction date
  const historicalPrices = await getMultipleHistoricalPrices(tickers, startDate, endDate);
  
  // Generate daily snapshots
  const snapshots: Array<{
    user_id: string;
    snapshot_date: string;
    total_value_pln: number;
    total_invested_pln: number;
    total_profit_pln: number;
  }> = [];

  // Create date array from start to end (all days, including weekends/holidays)
  const dates: Date[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }

  console.log(`Processing ${dates.length} days from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  // Track last known price for each ticker (to handle weekends/holidays per ticker)
  const lastKnownPrices = new Map<string, { price: number; date: string }>();

  // Calculate portfolio value for each day
  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Get transactions up to this date (compare by date string to avoid timezone issues)
    const relevantTransactions = transactions.filter((t) => {
      const txDate = new Date(t.transaction_date).toISOString().split('T')[0];
      return txDate <= dateStr;
    });

    if (relevantTransactions.length === 0) {
      continue;
    }

    // Calculate holdings for this date
    const holdings = new Map<string, { quantity: number; invested: number; currency: string; avgRate: number }>();

    for (const tx of relevantTransactions) {
      const existing = holdings.get(tx.ticker) || { 
        quantity: 0, 
        invested: 0, 
        currency: tx.currency,
        avgRate: tx.exchange_rate_to_pln 
      };

      if (tx.transaction_type === 'BUY') {
        existing.quantity += Number(tx.quantity);
        existing.invested += Number(tx.price_per_share) * Number(tx.quantity) * Number(tx.exchange_rate_to_pln);
      } else if (tx.transaction_type === 'SELL') {
        existing.quantity -= Number(tx.quantity);
        existing.invested -= Number(tx.price_per_share) * Number(tx.quantity) * Number(tx.exchange_rate_to_pln);
      }

      holdings.set(tx.ticker, existing);
    }

    // Calculate total value using historical prices for this specific date
    let totalValuePLN = 0;
    let totalInvestedPLN = 0;

    for (const [ticker, holding] of holdings.entries()) {
      if (holding.quantity <= 0) continue;

      totalInvestedPLN += holding.invested;

      // Get historical price for this ticker
      const tickerHistory = historicalPrices.get(ticker);
      if (tickerHistory && tickerHistory.length > 0) {
        // Try to find price for this exact date
        let priceEntry = tickerHistory.find((p) => p.date === dateStr);

        // If no price for today, use last known price for this ticker
        if (!priceEntry) {
          const lastKnown = lastKnownPrices.get(ticker);
          if (lastKnown) {
            // Use last known price
            priceEntry = { date: lastKnown.date, price: lastKnown.price };
          } else {
            // Find first available price before or on this date
            const pricesUpToDate = tickerHistory
              .filter((p) => p.date <= dateStr)
              .sort((a, b) => b.date.localeCompare(a.date));
            
            if (pricesUpToDate.length > 0) {
              priceEntry = pricesUpToDate[0];
            }
          }
        }

        if (priceEntry) {
          // Update last known price for this ticker
          lastKnownPrices.set(ticker, { price: priceEntry.price, date: priceEntry.date });
          totalValuePLN += priceEntry.price * holding.quantity * holding.avgRate;
        } else {
          // No historical data at all, use invested amount
          totalValuePLN += holding.invested;
        }
      } else {
        totalValuePLN += holding.invested;
      }
    }

    const totalProfitPLN = totalValuePLN - totalInvestedPLN;

    snapshots.push({
      user_id: user.id,
      snapshot_date: dateStr,
      total_value_pln: totalValuePLN,
      total_invested_pln: totalInvestedPLN,
      total_profit_pln: totalProfitPLN,
    });
  }

  console.log(`Generated ${snapshots.length} historical snapshots from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  // Batch insert snapshots (500 at a time to avoid limits)
  const batchSize = 500;
  for (let i = 0; i < snapshots.length; i += batchSize) {
    const batch = snapshots.slice(i, i + batchSize);
    const { error } = await supabase
      .from('portfolio_snapshots')
      .upsert(batch, { onConflict: 'user_id,snapshot_date' });

    if (error) {
      console.error('Error inserting historical snapshots:', error);
    }
  }
}
