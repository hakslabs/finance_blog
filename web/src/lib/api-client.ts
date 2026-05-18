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

export type MasterHoldingDb = {
  instrument_id: string;
  symbol: string | null;
  name: string | null;
  exchange: string | null;
  shares: number;
  market_value: number | null;
  weight_pct: number | null;
  position_kind: string;
};

export type MasterHoldingsResponse = {
  slug: string;
  period_end: string | null;
  filed_at: string | null;
  holdings: MasterHoldingDb[];
};

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

export type MacroIndicatorDb = {
  series_id: string;
  label: string;
  country_code: string;
  unit: string;
  date: string | null;
  value: number | null;
  previous_value: number | null;
  change: number | null;
};
export type MacroIndicatorsResponse = { indicators: MacroIndicatorDb[] };

export type MoverDb = {
  rank: number;
  symbol: string;
  name: string;
  market: string;
  last: number;
  change: number;
  change_pct: number;
  volume: number;
};
export type MoversResponse = { market: string; items: MoverDb[] };

export type DashNewsDb = {
  id: string;
  source: string;
  title: string;
  summary: string | null;
  url: string | null;
  language: string;
  published_at: string;
  related_symbols: string[];
};
export type DashNewsResponse = { items: DashNewsDb[] };

export type FearGreedDb = {
  market: string;
  market_code: string;
  value: number | null;
  label: string | null;
  previous_close: number | null;
  previous_1_week: number | null;
  previous_1_month: number | null;
  previous_1_year: number | null;
  timestamp: string | null;
};
export type FearGreedResponse = { items: FearGreedDb[] };

export type EconomicEventDb = {
  time: string | null;
  country: string | null;
  event: string | null;
  impact: string | null;
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string | null;
};
export type EconomicEventsResponse = { items: EconomicEventDb[] };

export type BreadthCellDb = { symbol: string; name: string; change_pct: number; last: number };
export type BreadthResponse = {
  market: string;
  score: number;
  rising: number;
  falling: number;
  flat: number;
  total: number;
  cells: BreadthCellDb[];
};

export type TodoDb = {
  id: string;
  title: string;
  body: string | null;
  done: boolean;
  due_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type TodosResponse = { items: TodoDb[] };
export type TodoCreate = { title: string; body?: string; due_at?: string };
export type TodoPatch = Partial<{ title: string; body: string; done: boolean; due_at: string }>;

export type NoticeDb = { id: string; tag: string; title: string; description: string | null; published_at: string };
export type NoticesResponse = { items: NoticeDb[] };

export type StockHolderDb = {
  filer_name: string;
  master_slug: string | null;
  filed_at: string | null;
  shares: number;
  market_value: number | null;
  weight_pct: number | null;
  position_kind: string;
};
export type StockHoldersResponse = { symbol: string; items: StockHolderDb[] };

export type PortfolioSnapshotHolding = {
  symbol: string; name: string; exchange: string; currency: string;
  quantity: number; average_cost: number; cost_basis: number;
  last_price: number | null; market_value: number | null;
  today_change: number | null; today_pct: number | null;
  weight_pct: number | null; pnl: number | null; pnl_pct: number | null;
};
export type PortfolioSnapshotTotals = {
  currency: string; total_value: number; total_cost: number;
  today_pnl: number; today_pct: number;
  total_return: number; total_return_pct: number;
};
export type PortfolioSnapshotComp = { label: string; percent: number; amount: number };
export type PortfolioSnapshotResponse = {
  totals: PortfolioSnapshotTotals;
  composition: PortfolioSnapshotComp[];
  top_holdings: PortfolioSnapshotHolding[];
  holdings: PortfolioSnapshotHolding[];
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
  getMasterHoldings(slug: string, limit = 50): Promise<MasterHoldingsResponse> {
    return request<MasterHoldingsResponse>(
      `/v1/masters/${encodeURIComponent(slug)}/holdings?limit=${limit}`,
    );
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
  getMacroIndicators(): Promise<MacroIndicatorsResponse> {
    return request<MacroIndicatorsResponse>("/v1/macros/indicators");
  },
  getMovers(market: "US" | "KR", limit = 6): Promise<MoversResponse> {
    return request<MoversResponse>(`/v1/movers?market=${market}&limit=${limit}`);
  },
  getDashboardNews(limit = 8): Promise<DashNewsResponse> {
    return request<DashNewsResponse>(`/v1/news?limit=${limit}`);
  },
  getFearGreed(): Promise<FearGreedResponse> {
    return request<FearGreedResponse>("/v1/sentiment/fear-greed");
  },
  getEconomicEvents(daysForward = 10): Promise<EconomicEventsResponse> {
    return request<EconomicEventsResponse>(`/v1/events/economic?days_forward=${daysForward}`);
  },
  getBreadth(market: "US" | "KR"): Promise<BreadthResponse> {
    return request<BreadthResponse>(`/v1/market/breadth?market=${market}`);
  },
  getStockFinancials(
    symbol: string,
    freq: "annual" | "quarterly" = "annual",
  ): Promise<StockFinancialsResponse> {
    return request<StockFinancialsResponse>(
      `/v1/stocks/${encodeURIComponent(symbol)}/financials?freq=${freq}`,
    );
  },
  listTodos(): Promise<TodosResponse> {
    return request<TodosResponse>("/v1/todos");
  },
  createTodo(body: TodoCreate): Promise<TodoDb> {
    return request<TodoDb>("/v1/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  patchTodo(id: string, body: TodoPatch): Promise<TodoDb> {
    return request<TodoDb>(`/v1/todos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  deleteTodo(id: string): Promise<unknown> {
    return request(`/v1/todos/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  getNotices(): Promise<NoticesResponse> {
    return request<NoticesResponse>("/v1/notices");
  },
  createNotice(body: { tag?: string; title: string; description?: string }): Promise<NoticeDb> {
    return request<NoticeDb>("/v1/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  getPortfolioSnapshot(): Promise<PortfolioSnapshotResponse> {
    return request<PortfolioSnapshotResponse>("/v1/portfolios/me/snapshot");
  },
  getStockHolders(symbol: string, limit = 20): Promise<StockHoldersResponse> {
    return request<StockHoldersResponse>(`/v1/stocks/${encodeURIComponent(symbol)}/holders?limit=${limit}`);
  },
  getMasterQuarterChanges(slug: string): Promise<MasterQuartersResponse> {
    return request<MasterQuartersResponse>(`/v1/masters/${encodeURIComponent(slug)}/quarter-changes`);
  },
  getStockNextEarning(symbol: string): Promise<NextEarningResponse> {
    return request<NextEarningResponse>(`/v1/stocks/${encodeURIComponent(symbol)}/next-earning`);
  },
  listActivity(): Promise<ActivityResponse> {
    return request<ActivityResponse>("/v1/activity");
  },
  createActivity(body: { kind: string; payload?: Record<string, unknown> }): Promise<ActivityRowDb> {
    return request<ActivityRowDb>("/v1/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
};

export type ActivityRowDb = { id: string; kind: string; payload: Record<string, unknown>; created_at: string };
export type ActivityResponse = { items: ActivityRowDb[] };

export type NextEarningDb = {
  date: string | null;
  hour: string | null;
  eps_estimate: number | null;
  revenue_estimate: number | null;
  year: number | null;
  quarter: number | null;
};
export type NextEarningResponse = { symbol: string; next: NextEarningDb | null };

export type MasterQuarterRowDb = {
  instrument_id: string;
  symbol: string | null;
  name: string | null;
  weights: (number | null)[];
  market_values: (number | null)[];
  latest_weight: number | null;
  prev_weight: number | null;
  change_kind: "up" | "down" | "flat" | "new" | "exit";
};
export type MasterQuartersResponse = {
  slug: string;
  quarters: string[];
  rows: MasterQuarterRowDb[];
};
