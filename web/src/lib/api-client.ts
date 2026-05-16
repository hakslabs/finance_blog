import { env } from "./env";
import { supabase } from "./supabase";

export type ApiErrorBody = {
  error: { code: string; message: string; details?: Record<string, unknown> };
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

export type WatchlistItem = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  last_price: number | null;
  last_price_at: string | null;
  note: string | null;
};

export type Watchlist = {
  id: string;
  name: string;
  updated_at: string;
  items: WatchlistItem[];
};

export type WatchlistResponse = { watchlist: Watchlist };

export type QuoteBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Quote = {
  symbol: string;
  currency: string;
  last: number;
  change: number;
  change_pct: number;
  as_of: string;
  bars: QuoteBar[];
  last_refreshed_at: string;
  stale: boolean;
};

export type QuoteRange = "1mo" | "3mo" | "6mo" | "1y" | "5y";

export type PortfolioHolding = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  quantity: number;
  average_cost: number;
  cost_basis: number;
};

export type PortfolioTransactionType = "buy" | "sell" | "dividend" | "deposit";

export type PortfolioTransaction = {
  id: string;
  occurred_at: string;
  type: PortfolioTransactionType;
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  currency: string;
  note: string | null;
};

export type Portfolio = {
  id: string;
  name: string;
  currency: string;
  updated_at: string;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
};

export type PortfolioResponse = { portfolio: Portfolio };

export type MasterSummary = {
  id: string;
  slug: string;
  name: string;
  firm: string | null;
  country_code: string | null;
  style: string | null;
  aum: number | null;
  aum_currency: string | null;
  photo_url: string | null;
};

export type MasterPrinciple = { ordinal: number; title: string; body: string | null };
export type MasterBook = { id: string; ordinal: number; title: string; url: string | null; year: number | null };
export type MasterStrategy = { ordinal: number; title: string; body: string | null };

export type Master = MasterSummary & {
  description: string | null;
  homepage_url: string | null;
  filer_cik: string | null;
  birth_year: number | null;
  principles: MasterPrinciple[];
  books: MasterBook[];
  strategies: MasterStrategy[];
};

export type MasterListResponse = { masters: MasterSummary[] };
export type MasterResponse = { master: Master };

export type ReportSummary = {
  id: string;
  source: string;
  title: string;
  category: string | null;
  published_at: string;
  language: string;
  importance: number | null;
};

export type Report = ReportSummary & {
  summary: string | null;
  body_url: string | null;
};

export type ReportListResponse = { reports: ReportSummary[] };
export type ReportResponse = { report: Report };

export type StockNewsItem = {
  id: string;
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  category: string | null;
  datetime: string | null;
  image: string | null;
};
export type StockNewsResponse = { symbol: string; items: StockNewsItem[] };

export type StockCompanyProfile = {
  name: string | null;
  country: string | null;
  currency: string | null;
  exchange: string | null;
  industry: string | null;
  ipo: string | null;
  market_cap: number | null;
  share_outstanding: number | null;
  logo: string | null;
  weburl: string | null;
  phone: string | null;
};
export type StockProfileResponse = {
  symbol: string;
  profile: StockCompanyProfile | null;
  metrics: Record<string, number | null | undefined>;
};

export type RecommendationBucket = {
  period: string | null;
  strong_buy: number;
  buy: number;
  hold: number;
  sell: number;
  strong_sell: number;
};
export type PriceTarget = {
  target_high: number | null;
  target_low: number | null;
  target_mean: number | null;
  target_median: number | null;
  last_updated: string | null;
  number_of_analysts: number | null;
};
export type StockConsensusResponse = {
  symbol: string;
  recommendations: RecommendationBucket[];
  price_target: PriceTarget | null;
};

export type StockFilingItem = {
  accession: string;
  form: string;
  filed_at: string | null;
  description: string | null;
  url: string | null;
};
export type StockFilingsResponse = {
  symbol: string;
  cik: string | null;
  items: StockFilingItem[];
};

export type FinancialLine = { concept?: string; label?: string; unit?: string; value?: number };
export type FinancialPeriod = {
  year: number | null;
  quarter: number | null;
  period: string | null;
  form: string | null;
  income_statement: FinancialLine[];
  balance_sheet: FinancialLine[];
  cash_flow: FinancialLine[];
};
export type StockFinancialsResponse = {
  symbol: string;
  freq: string;
  periods: FinancialPeriod[];
};

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: { ...(await buildHeaders()), ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let body: ApiErrorBody;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = {
        error: { code: "error", message: `HTTP ${response.status}` },
      };
    }
    throw new ApiError(response.status, body);
  }
  return (await response.json()) as T;
}

export const apiClient = {
  getMyWatchlist(): Promise<WatchlistResponse> {
    return request<WatchlistResponse>("/v1/watchlists/me");
  },
  getQuote(symbol: string, range: QuoteRange = "6mo"): Promise<Quote> {
    const search = new URLSearchParams({ range });
    return request<Quote>(
      `/v1/quotes/${encodeURIComponent(symbol)}?${search.toString()}`,
    );
  },
  getMyPortfolio(): Promise<PortfolioResponse> {
    return request<PortfolioResponse>("/v1/portfolios/me");
  },
  listMasters(): Promise<MasterListResponse> {
    return request<MasterListResponse>("/v1/masters");
  },
  getMaster(slug: string): Promise<MasterResponse> {
    return request<MasterResponse>(`/v1/masters/${encodeURIComponent(slug)}`);
  },
  listReports(limit = 50): Promise<ReportListResponse> {
    return request<ReportListResponse>(`/v1/reports?limit=${limit}`);
  },
  getReport(id: string): Promise<ReportResponse> {
    return request<ReportResponse>(`/v1/reports/${encodeURIComponent(id)}`);
  },
  getStockNews(symbol: string, days = 14): Promise<StockNewsResponse> {
    return request<StockNewsResponse>(
      `/v1/stocks/${encodeURIComponent(symbol)}/news?days=${days}`,
    );
  },
  getStockProfile(symbol: string): Promise<StockProfileResponse> {
    return request<StockProfileResponse>(
      `/v1/stocks/${encodeURIComponent(symbol)}/profile`,
    );
  },
  getStockConsensus(symbol: string): Promise<StockConsensusResponse> {
    return request<StockConsensusResponse>(
      `/v1/stocks/${encodeURIComponent(symbol)}/consensus`,
    );
  },
  getStockFilings(symbol: string, limit = 20): Promise<StockFilingsResponse> {
    return request<StockFilingsResponse>(
      `/v1/stocks/${encodeURIComponent(symbol)}/filings?limit=${limit}`,
    );
  },
  getStockFinancials(
    symbol: string,
    freq: "annual" | "quarterly" = "annual",
  ): Promise<StockFinancialsResponse> {
    return request<StockFinancialsResponse>(
      `/v1/stocks/${encodeURIComponent(symbol)}/financials?freq=${freq}`,
    );
  },
};
