// ===========================================
// Type Definitions for Finance Assets Tracker
// ===========================================

// ===========================================
// DATABASE TYPES
// ===========================================

export type AssetType = 'STOCK' | 'CRYPTO' | 'ETF' | 'BOND' | 'COMMODITY';
export type TransactionType = 'BUY' | 'SELL';
export type Currency = 'PLN' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY' | 'CZK';

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
  created_at: string;
  updated_at: string;
}

export interface ClosedPosition {
  id: string;
  user_id: string;
  ticker: string;
  asset_type: AssetType;
  quantity_sold: number;
  avg_buy_price_original: number;
  avg_buy_exchange_rate: number;
  sell_price: number;
  sell_exchange_rate: number;
  sell_transaction_id?: string;
  realized_profit_pln: number;
  closed_date: string;
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

export interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  asset_name?: string;
  target_price?: number;
  notes?: string;
  created_at: string;
}

// ===========================================
// AGGREGATED/CALCULATED TYPES
// ===========================================

/**
 * Represents a grouped holding (aggregated from multiple BUY transactions)
 * This is what gets displayed in the dashboard
 */
export interface Holding {
  ticker: string;
  asset_name: string;
  asset_type: AssetType;
  
  // Quantity & Pricing
  total_quantity: number;
  
  /**
   * Weighted Average Buy Price in ORIGINAL currency
   * Formula: Sum(buy_price * qty) / total_qty
   */
  avg_buy_price: number;
  original_currency: Currency;
  
  /**
   * Weighted Average Exchange Rate at time of purchase
   * Used for calculating cost basis in PLN
   */
  avg_exchange_rate: number;
  
  /**
   * Total invested in PLN (cost basis)
   * Formula: Sum(qty * price * exchange_rate)
   */
  total_invested_pln: number;
  
  // Live Data (fetched from Yahoo Finance)
  current_price?: number;
  current_exchange_rate?: number;
  
  /**
   * Current total value in PLN
   * Formula: total_quantity * current_price * current_exchange_rate
   */
  current_value_pln?: number;
  
  /**
   * Day change percentage
   */
  day_change_percent?: number;
  
  /**
   * Total return in PLN (unrealized P/L)
   * Formula: current_value_pln - total_invested_pln
   */
  total_return_pln?: number;
  
  /**
   * Total return percentage
   * Formula: (total_return_pln / total_invested_pln) * 100
   */
  total_return_percent?: number;
  
  // Transaction history
  transactions: Transaction[];
  
  // Metadata
  last_updated?: string;
}

// ===========================================
// YAHOO FINANCE API TYPES
// ===========================================

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

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  exchDisp?: string;
}

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: string;
}

// ===========================================
// FORM TYPES
// ===========================================

export interface AddTransactionForm {
  ticker: string;
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
}

// ===========================================
// UI STATE TYPES
// ===========================================

export interface RefreshState {
  lastRefresh: Date | null;
  isRefreshing: boolean;
  cooldownRemaining: number; // seconds
}

export interface DashboardFilters {
  assetType?: AssetType;
  sortBy: 'ticker' | 'value' | 'return' | 'day_change';
  sortOrder: 'asc' | 'desc';
  searchQuery?: string;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PriceRefreshResponse {
  holdings: Holding[];
  exchangeRates: Record<string, number>;
  timestamp: string;
}
