'use server';

import YahooFinanceAPI from 'yahoo-finance2';

const yahooFinance = new YahooFinanceAPI({ suppressNotices: ['yahooSurvey'] });

export interface AssetSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  assetType: 'STOCK' | 'ETF' | 'CRYPTO' | 'BOND' | 'COMMODITY';
  currency?: string;
  isin?: string;
}

const ISIN_TICKER_MAP: Record<string, { ticker: string; name: string; exchange: string }> = {
  US0378331005: { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  US5949181045: { ticker: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ' },
  US02079K3059: { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  US0231351067: { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
  US67066G1040: { ticker: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ' },
  US30303M1027: { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
  US88160R1014: { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
  DE0007164600: { ticker: 'SAP.DE', name: 'SAP SE', exchange: 'XETRA' },
  DE0007236101: { ticker: 'SIE.DE', name: 'Siemens AG', exchange: 'XETRA' },
  DE000BAY0017: { ticker: 'BAYN.DE', name: 'Bayer AG', exchange: 'XETRA' },
  PLPKO0000016: { ticker: 'PKO.WA', name: 'PKO Bank Polski', exchange: 'WSE' },
  PLPZU0000011: { ticker: 'PZU.WA', name: 'PZU SA', exchange: 'WSE' },
  PLOPTTC00011: { ticker: 'CDR.WA', name: 'CD Projekt', exchange: 'WSE' },
  PLKGHM000017: { ticker: 'KGH.WA', name: 'KGHM Polska Miedź', exchange: 'WSE' },
  PLPKN0000018: { ticker: 'PKN.WA', name: 'PKN Orlen', exchange: 'WSE' },
  GB0007188757: { ticker: 'RIO.L', name: 'Rio Tinto plc', exchange: 'LSE' },
  GB00B03MLX29: { ticker: 'RDSA.L', name: 'Shell plc', exchange: 'LSE' },
  DK0062498333: { ticker: 'NOVO-B.CO', name: 'Novo Nordisk A/S', exchange: 'CPH' },
};

/**
 * Search for assets by query (ticker, company name, or ISIN).
 * Automatically detects ISIN format and routes to ISIN lookup.
 */
export async function searchAssets(query: string): Promise<AssetSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (/^[A-Z]{2}[A-Z0-9]{10}$/i.test(trimmed)) {
    return searchByISIN(trimmed.toUpperCase());
  }

  return searchByKeyword(trimmed);
}

async function searchByKeyword(query: string): Promise<AssetSearchResult[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (yahooFinance as any).search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    if (!results?.quotes || !Array.isArray(results.quotes)) return [];

    const allowedTypes = new Set(['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'MUTUALFUND']);

    return results.quotes
      .filter((q: Record<string, unknown>) => {
        const quoteType = (q.quoteType as string) || '';
        return allowedTypes.has(quoteType) && q.symbol;
      })
      .slice(0, 8)
      .map((q: Record<string, unknown>) => ({
        ticker: q.symbol as string,
        name: (q.shortname || q.longname || q.symbol) as string,
        exchange: (q.exchange || q.exchDisp || '') as string,
        assetType: mapYahooType((q.quoteType as string) || 'EQUITY'),
        currency: undefined,
        isin: undefined,
      }));
  } catch (error) {
    console.error('[searchByKeyword] Yahoo search failed:', error);
    return [];
  }
}

async function searchByISIN(isin: string): Promise<AssetSearchResult[]> {
  const mapped = ISIN_TICKER_MAP[isin];
  if (mapped) {
    return [{ ticker: mapped.ticker, name: mapped.name, exchange: mapped.exchange, assetType: 'STOCK', isin }];
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (yahooFinance as any).search(isin, { quotesCount: 5, newsCount: 0 });

    if (results?.quotes?.length > 0) {
      return results.quotes
        .filter((q: Record<string, unknown>) => q.symbol)
        .slice(0, 5)
        .map((q: Record<string, unknown>) => ({
          ticker: q.symbol as string,
          name: (q.shortname || q.longname || q.symbol) as string,
          exchange: (q.exchange || q.exchDisp || '') as string,
          assetType: mapYahooType((q.quoteType as string) || 'EQUITY'),
          isin,
        }));
    }
  } catch (error) {
    console.error('[searchByISIN] Yahoo ISIN fallback failed:', error);
  }

  return [];
}

/** Fetch current price + currency for a specific ticker. */
export async function getAssetQuote(
  ticker: string,
): Promise<{ price: number; currency: string } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = (await yahooFinance.quote(ticker)) as any;
    if (!quote) return null;
    return { price: quote.regularMarketPrice ?? 0, currency: quote.currency ?? 'USD' };
  } catch (error) {
    console.error(`[getAssetQuote] Failed for ${ticker}:`, error);
    return null;
  }
}

function mapYahooType(yahooType: string): 'STOCK' | 'ETF' | 'CRYPTO' | 'BOND' | 'COMMODITY' {
  switch (yahooType) {
    case 'ETF':
    case 'MUTUALFUND':
      return 'ETF';
    case 'CRYPTOCURRENCY':
      return 'CRYPTO';
    default:
      return 'STOCK';
  }
}
