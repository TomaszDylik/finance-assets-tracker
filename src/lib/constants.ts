import type { AssetType, Currency } from '@/types';

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'PLN', label: 'Polish Zloty', symbol: 'zł' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'DKK', label: 'Danish Krone', symbol: 'kr' },
  { value: 'SEK', label: 'Swedish Krona', symbol: 'kr' },
  { value: 'NOK', label: 'Norwegian Krone', symbol: 'kr' },
  { value: 'CZK', label: 'Czech Koruna', symbol: 'Kč' },
  { value: 'HUF', label: 'Hungarian Forint', symbol: 'Ft' },
  { value: 'TRY', label: 'Turkish Lira', symbol: '₺' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'MXN', label: 'Mexican Peso', symbol: 'MX$' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { value: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { value: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { value: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { value: 'KRW', label: 'South Korean Won', symbol: '₩' },
  { value: 'TWD', label: 'Taiwan Dollar', symbol: 'NT$' },
  { value: 'THB', label: 'Thai Baht', symbol: '฿' },
  { value: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM' },
  { value: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp' },
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'ILS', label: 'Israeli Shekel', symbol: '₪' },
  { value: 'ZAR', label: 'South African Rand', symbol: 'R' },
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PLN: 'zł', USD: '$', EUR: '€', GBP: '£', CHF: 'CHF', JPY: '¥',
  DKK: 'kr', SEK: 'kr', NOK: 'kr', CZK: 'Kč', HUF: 'Ft', TRY: '₺',
  CAD: 'C$', MXN: 'MX$', BRL: 'R$', AUD: 'A$', NZD: 'NZ$', HKD: 'HK$',
  SGD: 'S$', CNY: '¥', KRW: '₩', TWD: 'NT$', THB: '฿', MYR: 'RM',
  IDR: 'Rp', INR: '₹', ILS: '₪', ZAR: 'R',
};

export const ASSET_TYPES: { value: AssetType; label: string; icon: string }[] = [
  { value: 'STOCK', label: 'Stock', icon: '📈' },
  { value: 'ETF', label: 'ETF', icon: '📊' },
  { value: 'CRYPTO', label: 'Cryptocurrency', icon: '₿' },
  { value: 'BOND', label: 'Bond', icon: '📃' },
  { value: 'COMMODITY', label: 'Commodity', icon: '🥇' },
];

/** Cooldown period in seconds (30 minutes). */
export const REFRESH_COOLDOWN_SECONDS = 30 * 60;

/** Local storage key for last refresh timestamp. */
export const LAST_REFRESH_KEY = 'portfolio_last_refresh';

/** Breakpoint for mobile/desktop view switch. */
export const MOBILE_BREAKPOINT = 768;

export const VALIDATION = {
  MIN_QUANTITY: 0.00000001,
  MAX_QUANTITY: 1000000000,
  MIN_PRICE: 0.00000001,
  MAX_PRICE: 10000000,
  MIN_EXCHANGE_RATE: 0.0001,
  MAX_EXCHANGE_RATE: 100000,
  MAX_NOTES_LENGTH: 500,
};
