'use server';

// ===========================================
// Transaction Server Actions
// ===========================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Transaction, AddTransactionForm, ClosedPosition } from '@/types';
import { calculateHoldings, calculateRealizedProfit } from '@/lib/calculations';

// ===========================================
// GET TRANSACTIONS
// ===========================================

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

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

// ===========================================
// ADD TRANSACTION
// ===========================================

export async function addTransaction(formData: AddTransactionForm): Promise<Transaction> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // If it's a SELL transaction, calculate realized profit
  if (formData.transaction_type === 'SELL') {
    await handleSellTransaction(supabase, user.id, formData);
  }

  // Insert the transaction
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      ticker: formData.ticker,
      asset_type: formData.asset_type,
      asset_name: formData.asset_name,
      transaction_type: formData.transaction_type,
      quantity: formData.quantity,
      price_per_share: formData.price_per_share,
      currency: formData.currency,
      exchange_rate_to_pln: formData.exchange_rate_to_pln,
      fees: formData.fees || 0,
      notes: formData.notes,
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

// ===========================================
// HANDLE SELL TRANSACTION
// ===========================================
// Calculates and records realized profit when selling

async function handleSellTransaction(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  formData: AddTransactionForm
) {
  // Get all existing transactions for this ticker
  const { data: existingTransactions, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', formData.ticker);

  if (fetchError) {
    console.error('Error fetching existing transactions:', fetchError);
    return;
  }

  // Calculate current holdings to get average buy price
  const holdings = calculateHoldings(existingTransactions as Transaction[]);
  const holding = holdings.find((h) => h.ticker === formData.ticker);

  if (!holding) {
    console.warn('No existing holding found for ticker:', formData.ticker);
    return;
  }

  // Calculate realized profit
  const realizedProfit = calculateRealizedProfit(
    holding.avg_buy_price,
    holding.avg_exchange_rate,
    formData.price_per_share,
    formData.exchange_rate_to_pln,
    formData.quantity
  );

  // Record the closed position
  const { error: insertError } = await supabase
    .from('closed_positions')
    .insert({
      user_id: userId,
      ticker: formData.ticker,
      asset_type: formData.asset_type,
      quantity_sold: formData.quantity,
      avg_buy_price_original: holding.avg_buy_price,
      avg_buy_exchange_rate: holding.avg_exchange_rate,
      sell_price: formData.price_per_share,
      sell_exchange_rate: formData.exchange_rate_to_pln,
      realized_profit_pln: realizedProfit,
      closed_date: formData.transaction_date.toISOString(),
    });

  if (insertError) {
    console.error('Error recording closed position:', insertError);
  }
}

// ===========================================
// DELETE TRANSACTION
// ===========================================

export async function deleteTransaction(transactionId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

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

// ===========================================
// DELETE ALL TRANSACTIONS FOR TICKER
// ===========================================

export async function deleteAllTransactionsForTicker(ticker: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('ticker', ticker)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting transactions:', error);
    throw new Error('Failed to delete transactions');
  }

  revalidatePath('/dashboard');
}

// ===========================================
// GET CLOSED POSITIONS
// ===========================================

export async function getClosedPositions(): Promise<ClosedPosition[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('closed_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('closed_date', { ascending: false });

  if (error) {
    console.error('Error fetching closed positions:', error);
    throw new Error('Failed to fetch closed positions');
  }

  return data as ClosedPosition[];
}
