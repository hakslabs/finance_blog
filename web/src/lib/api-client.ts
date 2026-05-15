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
};
