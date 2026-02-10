'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PortfolioSnapshot } from '@/types';

export async function getPortfolioSnapshots(): Promise<PortfolioSnapshot[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

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

export async function savePortfolioSnapshot(
  totalValuePLN: number,
  totalInvestedPLN: number,
  totalProfitPLN: number,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('portfolio_snapshots')
    .upsert(
      {
        user_id: user.id,
        snapshot_date: today,
        total_value_pln: totalValuePLN,
        total_invested_pln: totalInvestedPLN,
        total_profit_pln: totalProfitPLN,
      },
      { onConflict: 'user_id,snapshot_date' },
    );

  if (error) {
    console.error('Error saving portfolio snapshot:', error);
    throw new Error('Failed to save portfolio snapshot');
  }
}

