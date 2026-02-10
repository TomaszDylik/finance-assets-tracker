'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Transaction, AddTransactionForm, ClosedPosition } from '@/types';
import { calculateHoldings, calculateRealizedProfit } from '@/lib/calculations';

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error('Failed to fetch transactions');
  }

  return data as Transaction[];
}

export async function addTransaction(formData: AddTransactionForm): Promise<Transaction> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (formData.transaction_type === 'SELL') {
    await handleSellTransaction(supabase, user.id, formData);
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      ticker: formData.ticker,
      isin: formData.isin || null,
      asset_type: formData.asset_type,
      asset_name: formData.asset_name,
      transaction_type: formData.transaction_type,
      quantity: formData.quantity,
      price_per_share: formData.price_per_share,
      currency: formData.currency,
      exchange_rate_to_pln: formData.exchange_rate_to_pln,
      fees: formData.fees || 0,
      notes: formData.notes,
      broker: formData.broker || null,
      price_multiplier: formData.price_multiplier || 1.0,
      transaction_date: formData.transaction_date.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding transaction:', error);
    throw new Error('Failed to add transaction');
  }

  revalidatePath('/dashboard');
  return data as Transaction;
}

async function handleSellTransaction(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  formData: AddTransactionForm,
) {
  const { data: existingTransactions, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', formData.ticker);

  if (fetchError) {
    console.error('Error fetching existing transactions:', fetchError);
    return;
  }

  const holdings = calculateHoldings(existingTransactions as Transaction[]);
  const holding = holdings.find((h) => h.ticker === formData.ticker);
  if (!holding) return;

  const realizedProfit = calculateRealizedProfit(
    holding.avg_buy_price,
    holding.avg_exchange_rate,
    formData.price_per_share,
    formData.exchange_rate_to_pln,
    formData.quantity,
  );

  const { error: insertError } = await supabase.from('closed_positions').insert({
    user_id: userId,
    ticker: formData.ticker,
    isin: formData.isin || null,
    asset_type: formData.asset_type,
    asset_name: formData.asset_name || null,
    quantity_sold: formData.quantity,
    avg_buy_price_original: holding.avg_buy_price,
    avg_buy_exchange_rate: holding.avg_exchange_rate,
    sell_price: formData.price_per_share,
    sell_exchange_rate: formData.exchange_rate_to_pln,
    realized_profit_pln: realizedProfit,
    broker: formData.broker || null,
    closed_date: formData.transaction_date.toISOString(),
  });

  if (insertError) {
    console.error('Error recording closed position:', insertError);
  }
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('Failed to delete transaction');
  }

  revalidatePath('/dashboard');
}

export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<AddTransactionForm, 'transaction_date'> & { transaction_date: Date }>,
): Promise<Transaction> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updateData: Record<string, unknown> = {};
  if (updates.ticker !== undefined) updateData.ticker = updates.ticker;
  if (updates.isin !== undefined) updateData.isin = updates.isin;
  if (updates.asset_name !== undefined) updateData.asset_name = updates.asset_name;
  if (updates.asset_type !== undefined) updateData.asset_type = updates.asset_type;
  if (updates.transaction_type !== undefined) updateData.transaction_type = updates.transaction_type;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.price_per_share !== undefined) updateData.price_per_share = updates.price_per_share;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.exchange_rate_to_pln !== undefined) updateData.exchange_rate_to_pln = updates.exchange_rate_to_pln;
  if (updates.fees !== undefined) updateData.fees = updates.fees;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.broker !== undefined) updateData.broker = updates.broker;
  if (updates.transaction_date !== undefined) updateData.transaction_date = updates.transaction_date.toISOString();

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    throw new Error('Failed to update transaction');
  }

  revalidatePath('/dashboard');
  return data as Transaction;
}

export async function deleteAllTransactionsForTicker(ticker: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error: closedError } = await supabase
    .from('closed_positions').delete().eq('ticker', ticker).eq('user_id', user.id);
  if (closedError) console.error('Error deleting closed positions for ticker:', closedError);

  const { error } = await supabase
    .from('transactions').delete().eq('ticker', ticker).eq('user_id', user.id);
  if (error) throw new Error('Failed to delete transactions');

  revalidatePath('/dashboard');
}

export async function deleteAllTransactions(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error: closedError } = await supabase
    .from('closed_positions').delete().eq('user_id', user.id);
  if (closedError) throw new Error('Failed to delete closed positions');

  const { error } = await supabase
    .from('transactions').delete().eq('user_id', user.id);
  if (error) throw new Error('Failed to delete all transactions');

  await supabase.from('portfolio_snapshots').delete().eq('user_id', user.id);
  await supabase.from('cash_operations').delete().eq('user_id', user.id);

  revalidatePath('/dashboard');
}

export async function deleteAllClosedPositions(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('closed_positions').delete().eq('user_id', user.id);
  if (error) throw new Error('Failed to delete closed positions');

  revalidatePath('/dashboard');
}

export async function getClosedPositions(): Promise<ClosedPosition[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('closed_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('closed_date', { ascending: false });

  if (error) throw new Error('Failed to fetch closed positions');
  return data as ClosedPosition[];
}
