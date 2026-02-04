// ===========================================
// Constants & Configuration
// ===========================================

import type { AssetType, Currency } from '@/types';

// ===========================================
// CURRENCY CONFIGURATION
// ===========================================

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'PLN', label: 'Polish Zloty', symbol: 'zł' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CZK', label: 'Czech Koruna', symbol: 'Kč' },
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PLN: 'zł',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'CHF',
  JPY: '¥',
  CZK: 'Kč',
};

// ===========================================
// ASSET TYPE CONFIGURATION
// ===========================================

export const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'STOCK', label: 'Stock', icon: '📈' },
  { value: 'ETF', label: 'ETF', icon: '📊' },
  { value: 'CRYPTO', label: 'Cryptocurrency', icon: '₿' },
  { value: 'BOND', label: 'Bond', icon: '📃' },
  { value: 'COMMODITY', label: 'Commodity', icon: '🥇' },
];

// ===========================================
// REFRESH CONFIGURATION
// ===========================================

// Cooldown period in seconds (30 minutes)
export const REFRESH_COOLDOWN_SECONDS = 30 * 60;

// Local storage key for last refresh timestamp
export const LAST_REFRESH_KEY = 'portfolio_last_refresh';

// ===========================================
// API CONFIGURATION
// ===========================================

// Debounce delay for ticker search (ms)
export const SEARCH_DEBOUNCE_MS = 500;

// Maximum results to show in ticker search
export const MAX_SEARCH_RESULTS = 10;

// ===========================================
// UI CONFIGURATION
// ===========================================

// Breakpoint for mobile/desktop view switch
export const MOBILE_BREAKPOINT = 768;

// Animation durations (ms)
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// ===========================================
// COLORS (matching Tailwind config)
// ===========================================

export const COLORS = {
  // Background
  background: '#050505',
  backgroundSecondary: '#0a0a0a',
  
  // Profit/Loss
  profit: '#10b981', // emerald-500
  profitDark: '#059669', // emerald-600
  profitLight: '#34d399', // emerald-400
  
  loss: '#f43f5e', // rose-500
  lossDark: '#e11d48', // rose-600
  lossLight: '#fb7185', // rose-400
  
  // Accents
  accent: '#10b981', // emerald-500
  accentSecondary: '#6366f1', // indigo-500
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a3a3a3',
  textMuted: '#525252',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderHover: 'rgba(255, 255, 255, 0.2)',
  
  // Chart colors
  chart: [
    '#10b981', // emerald
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#ec4899', // pink
  ],
};

// ===========================================
// POPULAR TICKERS (for quick access)
// ===========================================

export const POPULAR_TICKERS = {
  US: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'],
  PL: ['PKO.WA', 'PZU.WA', 'CDR.WA', 'KGH.WA', 'PKN.WA', 'PEO.WA'],
  CRYPTO: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD'],
  ETF: ['SPY', 'QQQ', 'VOO', 'VTI', 'VXUS'],
};

// ===========================================
// VALIDATION
// ===========================================

export const VALIDATION = {
  MIN_QUANTITY: 0.00000001,
  MAX_QUANTITY: 1000000000,
  MIN_PRICE: 0.00000001,
  MAX_PRICE: 10000000,
  MIN_EXCHANGE_RATE: 0.0001,
  MAX_EXCHANGE_RATE: 100000,
  MAX_NOTES_LENGTH: 500,
};
