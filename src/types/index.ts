export type AssetType = 'STOCK' | 'CRYPTO' | 'ETF' | 'BOND' | 'COMMODITY';
export type TransactionType = 'BUY' | 'SELL';
export type Currency =
  | 'PLN' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'CZK'
  | 'DKK' | 'SEK' | 'NOK' | 'AUD' | 'CAD' | 'HKD' | 'SGD'
  | 'NZD' | 'MXN' | 'ZAR' | 'TRY' | 'HUF' | 'ILS' | 'INR'
  | 'BRL' | 'KRW' | 'CNY' | 'TWD' | 'THB' | 'MYR' | 'IDR';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  base_currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  ticker: string;
  isin?: string;
  asset_type: AssetType;
  asset_name?: string;
  transaction_type: TransactionType;
  quantity: number;
  price_per_share: number;
  currency: Currency;
  exchange_rate_to_pln: number;
  fees: number;
  notes?: string;
  transaction_date: string;
  is_closed?: boolean;
  broker?: string;
  price_multiplier?: number;
  created_at: string;
  updated_at: string;
}

export interface ClosedPosition {
  id: string;
  user_id: string;
  ticker: string;
  isin?: string;
  asset_type: AssetType;
  asset_name?: string;
  quantity_sold: number;
  avg_buy_price_original: number;
  avg_buy_exchange_rate: number;
  sell_price: number;
  sell_exchange_rate: number;
  sell_transaction_id?: string;
  realized_profit_pln: number;
  closed_date: string;
  broker?: string;
  created_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value_pln: number;
  total_invested_pln: number;
  total_profit_pln: number;
  assets_breakdown?: AssetBreakdown[];
  created_at: string;
}

export interface AssetBreakdown {
  ticker: string;
  value_pln: number;
  percentage: number;
}

/** Aggregated holding computed from multiple BUY/SELL transactions. */
export interface Holding {
  ticker: string;
  asset_name: string;
  asset_type: AssetType;
  total_quantity: number;
  /** Weighted average buy price in original currency. */
  avg_buy_price: number;
  original_currency: Currency;
  /** Weighted average exchange rate at time of purchase. */
  avg_exchange_rate: number;
  /** Total invested in PLN (cost basis). */
  total_invested_pln: number;
  current_price?: number;
  current_exchange_rate?: number;
  /** Current total value in PLN. */
  current_value_pln?: number;
  day_change_percent?: number;
  /** Unrealized P/L in PLN. */
  total_return_pln?: number;
  /** Unrealized P/L as percentage. */
  total_return_percent?: number;
  transactions: Transaction[];
  last_updated?: string;
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  exchange: string;
}

export interface AddTransactionForm {
  ticker: string;
  isin?: string;
  asset_name: string;
  asset_type: AssetType;
  transaction_type: TransactionType;
  quantity: number;
  price_per_share: number;
  currency: Currency;
  exchange_rate_to_pln: number;
  fees?: number;
  notes?: string;
  transaction_date: Date;
  broker?: string;
  price_multiplier?: number;
}


