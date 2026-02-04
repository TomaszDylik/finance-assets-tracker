// ===========================================
// Yahoo Finance API Utilities (Server-Side)
// ===========================================
// These functions run on the server to avoid CORS issues
// and to protect the API from abuse
// ===========================================

'use server';

import YahooFinanceAPI from 'yahoo-finance2';
import type { SearchResult, StockQuote, Currency } from '@/types';

// Initialize Yahoo Finance v2 instance and suppress survey notice
const yahooFinance = new YahooFinanceAPI({ suppressNotices: ['yahooSurvey'] });

// ===========================================
// STOCK SEARCH
// ===========================================

/**
 * Search for stocks/assets by query string
 * Used in the debounced ticker search input
 */
export async function searchTickers(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  try {
    const results = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    // Filter and map results to our SearchResult type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes = (results as any).quotes || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchResults: SearchResult[] = quotes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((quote: any) => {
        // Only include results with symbol AND from Yahoo Finance
        return quote.symbol && quote.isYahooFinance !== false;
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.name || quote.symbol,
        exchange: quote.exchDisp || quote.exchange || 'N/A',
        type: mapQuoteType(quote.quoteType || 'EQUITY'),
        exchDisp: quote.exchDisp || quote.exchange,
      }));
    
    // Always add manual entry option at the end
    searchResults.push({
      symbol: query.toUpperCase(),
      name: `${query.toUpperCase()} - Enter manually`,
      exchange: 'Manual',
      type: 'STOCK',
      exchDisp: 'Manual',
    });
    
    return searchResults;
  } catch (error) {
    // Return manual input option as fallback when API fails
    return [{
      symbol: query.toUpperCase(),
      name: `${query.toUpperCase()} - Enter manually (Search unavailable)`,
      exchange: 'Manual Entry',
      type: 'STOCK',
      exchDisp: 'Manual',
    }];
  }
}

// ===========================================
// STOCK QUOTE
// ===========================================

/**
 * Get current quote for a single ticker
 */
export async function getStockQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = quote as any;
    return {
      ticker: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice || 0,
      currency: q.currency || 'USD',
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      previousClose: q.regularMarketPreviousClose || 0,
      open: q.regularMarketOpen || 0,
      dayHigh: q.regularMarketDayHigh || 0,
      dayLow: q.regularMarketDayLow || 0,
      volume: q.regularMarketVolume || 0,
      marketCap: q.marketCap,
      exchange: q.exchange || '',
    };
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
    return null;
  }
}

/**
 * Get quotes for multiple tickers at once
 * More efficient than calling getStockQuote multiple times
 */
export async function getMultipleQuotes(
  tickers: string[]
): Promise<Map<string, StockQuote>> {
  const quotesMap = new Map<string, StockQuote>();

  if (tickers.length === 0) {
    return quotesMap;
  }

  try {
    // Yahoo Finance allows batch requests
    const results = await Promise.allSettled(
      tickers.map((ticker) => yahooFinance.quote(ticker))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quote = result.value as any;
        quotesMap.set(tickers[index], {
          ticker: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          price: quote.regularMarketPrice || 0,
          currency: quote.currency || 'USD',
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          previousClose: quote.regularMarketPreviousClose || 0,
          open: quote.regularMarketOpen || 0,
          dayHigh: quote.regularMarketDayHigh || 0,
          dayLow: quote.regularMarketDayLow || 0,
          volume: quote.regularMarketVolume || 0,
          marketCap: quote.marketCap,
          exchange: quote.exchange || '',
        });
      }
    });

    return quotesMap;
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
    return quotesMap;
  }
}

// ===========================================
// EXCHANGE RATES
// ===========================================

/**
 * Currency pairs for Yahoo Finance
 * Format: XXXYYY=X where XXX is source, YYY is target
 */
const CURRENCY_PAIRS: Record<Currency, string> = {
  USD: 'USDPLN=X',
  EUR: 'EURPLN=X',
  GBP: 'GBPPLN=X',
  CHF: 'CHFPLN=X',
  JPY: 'JPYPLN=X',
  CZK: 'CZKPLN=X',
  PLN: '', // No conversion needed for PLN
};

/**
 * Get current exchange rate from a currency to PLN
 */
export async function getExchangeRate(
  fromCurrency: Currency
): Promise<number> {
  // PLN to PLN is always 1
  if (fromCurrency === 'PLN') {
    return 1;
  }

  const pair = CURRENCY_PAIRS[fromCurrency];
  if (!pair) {
    console.warn(`Unknown currency: ${fromCurrency}`);
    return 1;
  }

  try {
    const quote = await yahooFinance.quote(pair);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (quote as any)?.regularMarketPrice || 1;
  } catch (error) {
    console.error(`Error fetching exchange rate for ${fromCurrency}:`, error);
    return 1;
  }
}

/**
 * Get historical exchange rate from a currency to PLN for a specific date
 */
export async function getHistoricalExchangeRate(
  fromCurrency: Currency,
  date: Date
): Promise<number> {
  // PLN to PLN is always 1
  if (fromCurrency === 'PLN') {
    return 1;
  }

  const pair = CURRENCY_PAIRS[fromCurrency];
  if (!pair) {
    console.warn(`Unknown currency: ${fromCurrency}`);
    return 1;
  }

  try {
    // Get historical data for the date (± 3 days to handle weekends)
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const history = await yahooFinance.historical(pair, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    if (history && history.length > 0) {
      // Find closest date
      const targetDateStr = date.toISOString().split('T')[0];
      const sortedHistory = history.sort((a, b) => 
        Math.abs(new Date(a.date).getTime() - date.getTime()) - 
        Math.abs(new Date(b.date).getTime() - date.getTime())
      );
      
      return sortedHistory[0].close || 1;
    }

    // Fallback to current rate
    return await getExchangeRate(fromCurrency);
  } catch (error) {
    console.error(`Error fetching historical exchange rate for ${fromCurrency}:`, error);
    // Fallback to current rate
    return await getExchangeRate(fromCurrency);
  }
}

/**
 * Get multiple exchange rates at once
 * Returns a map of currency -> PLN rate
 */
export async function getMultipleExchangeRates(
  currencies: Currency[]
): Promise<Map<Currency, number>> {
  const ratesMap = new Map<Currency, number>();
  
  // Always set PLN to 1
  ratesMap.set('PLN', 1);

  // Filter out PLN and get unique currencies
  const uniqueCurrencies = [...new Set(currencies.filter((c) => c !== 'PLN'))];

  if (uniqueCurrencies.length === 0) {
    return ratesMap;
  }

  // Build pairs to fetch
  const pairs = uniqueCurrencies
    .map((currency) => CURRENCY_PAIRS[currency])
    .filter(Boolean);

  try {
    const results = await Promise.allSettled(
      pairs.map((pair) => yahooFinance.quote(pair))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rate = (result.value as any).regularMarketPrice || 1;
        ratesMap.set(uniqueCurrencies[index], rate);
      } else {
        // Fallback to 1 if fetch fails
        ratesMap.set(uniqueCurrencies[index], 1);
      }
    });

    return ratesMap;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return ratesMap;
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Map Yahoo Finance quote type to our AssetType
 */
function mapQuoteType(yahooType: string): string {
  const typeMap: Record<string, string> = {
    EQUITY: 'STOCK',
    ETF: 'ETF',
    CRYPTOCURRENCY: 'CRYPTO',
    CURRENCY: 'CURRENCY',
    FUTURE: 'COMMODITY',
    INDEX: 'INDEX',
  };
  return typeMap[yahooType] || 'STOCK';
}

/**
 * Validate if a ticker exists
 */
export async function validateTicker(ticker: string): Promise<boolean> {
  try {
    const quote = await yahooFinance.quote(ticker);
    return !!quote;
  } catch {
    return false;
  }
}

// ===========================================
// HISTORICAL DATA
// ===========================================

/**
 * Get historical prices for a ticker
 * Returns daily closing prices for the specified period
 */
export async function getHistoricalPrices(
  ticker: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<Array<{ date: string; price: number }>> {
  try {
    const result = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    if (!result || result.length === 0) {
      return [];
    }

    return result.map((quote) => ({
      date: quote.date.toISOString().split('T')[0],
      price: quote.close,
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error);
    return [];
  }
}

/**
 * Get historical prices for multiple tickers at once
 */
export async function getMultipleHistoricalPrices(
  tickers: string[],
  startDate: Date,
  endDate: Date = new Date()
): Promise<Map<string, Array<{ date: string; price: number }>>> {
  const historicalMap = new Map<string, Array<{ date: string; price: number }>>();

  if (tickers.length === 0) {
    return historicalMap;
  }

  const results = await Promise.allSettled(
    tickers.map((ticker) => getHistoricalPrices(ticker, startDate, endDate))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      historicalMap.set(tickers[index], result.value);
    }
  });

  return historicalMap;
}
