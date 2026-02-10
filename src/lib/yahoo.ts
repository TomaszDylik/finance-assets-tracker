'use server';

import YahooFinanceAPI from 'yahoo-finance2';
import type { StockQuote, Currency } from '@/types';

const yahooFinance = new YahooFinanceAPI({ suppressNotices: ['yahooSurvey'] });

const CURRENCY_PAIRS: Record<Currency, string> = {
  PLN: '', USD: 'USDPLN=X', EUR: 'EURPLN=X', GBP: 'GBPPLN=X',
  CHF: 'CHFPLN=X', JPY: 'JPYPLN=X', DKK: 'DKKPLN=X', SEK: 'SEKPLN=X',
  NOK: 'NOKPLN=X', CZK: 'CZKPLN=X', HUF: 'HUFPLN=X', TRY: 'TRYPLN=X',
  CAD: 'CADPLN=X', MXN: 'MXNPLN=X', BRL: 'BRLPLN=X', AUD: 'AUDPLN=X',
  NZD: 'NZDPLN=X', HKD: 'HKDPLN=X', SGD: 'SGDPLN=X', CNY: 'CNYPLN=X',
  KRW: 'KRWPLN=X', TWD: 'TWDPLN=X', THB: 'THBPLN=X', MYR: 'MYRPLN=X',
  IDR: 'IDRPLN=X', INR: 'INRPLN=X', ILS: 'ILSPLN=X', ZAR: 'ZARPLN=X',
};

/** Fetch quotes for multiple tickers in parallel. */
export async function getMultipleQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
  const quotesMap = new Map<string, StockQuote>();
  if (tickers.length === 0) return quotesMap;

  try {
    const results = await Promise.allSettled(
      tickers.map((ticker) => yahooFinance.quote(ticker)),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = result.value as any;
        quotesMap.set(tickers[index], {
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
        });
      }
    });

    return quotesMap;
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
    return quotesMap;
  }
}

/** Get current exchange rate from a currency to PLN. */
export async function getExchangeRate(fromCurrency: Currency): Promise<number> {
  if (fromCurrency === 'PLN') return 1;

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

/** Get historical exchange rate for a specific date (±3 days to handle weekends). */
export async function getHistoricalExchangeRate(fromCurrency: Currency, date: Date): Promise<number> {
  if (fromCurrency === 'PLN') return 1;

  const pair = CURRENCY_PAIRS[fromCurrency];
  if (!pair) return 1;

  try {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const history = await yahooFinance.historical(pair, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    if (history?.length) {
      const sorted = history.sort(
        (a, b) =>
          Math.abs(new Date(a.date).getTime() - date.getTime()) -
          Math.abs(new Date(b.date).getTime() - date.getTime()),
      );
      return sorted[0].close || 1;
    }

    return await getExchangeRate(fromCurrency);
  } catch (error) {
    console.error(`Error fetching historical exchange rate for ${fromCurrency}:`, error);
    return await getExchangeRate(fromCurrency);
  }
}

/** Fetch exchange rates for multiple currencies in parallel. */
export async function getMultipleExchangeRates(currencies: Currency[]): Promise<Map<Currency, number>> {
  const ratesMap = new Map<Currency, number>();
  ratesMap.set('PLN', 1);

  const unique = [...new Set(currencies.filter((c) => c !== 'PLN'))];
  if (unique.length === 0) return ratesMap;

  const pairs = unique.map((c) => CURRENCY_PAIRS[c]).filter(Boolean);

  try {
    const results = await Promise.allSettled(pairs.map((pair) => yahooFinance.quote(pair)));

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rate = (result.value as any).regularMarketPrice || 1;
        ratesMap.set(unique[index], rate);
      } else {
        ratesMap.set(unique[index], 1);
      }
    });

    return ratesMap;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return ratesMap;
  }
}

/** Get historical daily closing prices for a ticker. */
export async function getHistoricalPrices(
  ticker: string,
  startDate: Date,
  endDate: Date = new Date(),
): Promise<Array<{ date: string; price: number }>> {
  try {
    const result = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    if (!result?.length) return [];

    return result.map((q) => ({
      date: q.date.toISOString().split('T')[0],
      price: q.close,
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error);
    return [];
  }
}

/** Get historical prices for multiple tickers in parallel. */
export async function getMultipleHistoricalPrices(
  tickers: string[],
  startDate: Date,
  endDate: Date = new Date(),
): Promise<Map<string, Array<{ date: string; price: number }>>> {
  const historicalMap = new Map<string, Array<{ date: string; price: number }>>();
  if (tickers.length === 0) return historicalMap;

  const results = await Promise.allSettled(
    tickers.map((ticker) => getHistoricalPrices(ticker, startDate, endDate)),
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      historicalMap.set(tickers[index], result.value);
    }
  });

  return historicalMap;
}

/** Fetch daily closing prices for a benchmark index (default: S&P 500). */
export async function getBenchmarkHistory(
  startDate: Date,
  endDate: Date = new Date(),
  ticker = '^GSPC',
): Promise<Array<{ date: string; price: number }>> {
  return getHistoricalPrices(ticker, startDate, endDate);
}
