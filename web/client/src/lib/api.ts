/**
 * API client for FastAPI backend (/api/v1/*).
 *
 * Vercel routes `/api/(.*)` → `api/index.py` (FastAPI). Locally, Vite proxies
 * `/api` → `http://127.0.0.1:8000`. All endpoints assume that prefix.
 *
 * Auth: backend reads `Authorization: Bearer <supabase-jwt>`. Until Supabase
 * auth is wired into the frontend, authenticated endpoints will return 401.
 */

const API_PREFIX = "/api/v1";

function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("supabase_jwt")
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let code: string | undefined;
    try {
      const body = await res.json();
      code = body?.error?.code ?? body?.detail;
    } catch {}
    throw new ApiError(res.status, `GET ${path} failed: ${res.status}`, code);
  }
  return res.json() as Promise<T>;
}

/**
 * Try the API; on failure, return the provided fallback. Useful while pages
 * still rely on mock data and the backend isn't fully connected.
 */
export async function apiGetOr<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch {
    return fallback;
  }
}

// ── Typed endpoints ─────────────────────────────────────────────────────────

export interface MasterSummary {
  id: string;
  slug: string;
  name: string;
  firm?: string | null;
  country_code?: string | null;
  style?: string | null;
  aum?: number | null;
  aum_currency?: string | null;
  photo_url?: string | null;
}

export interface NewsItemApi {
  id: string;
  source?: string;
  title: string;
  url?: string;
  published_at?: string;
  summary?: string;
  category?: string;
}

export interface EconomicEventApi {
  id: string;
  title: string;
  starts_at: string;
  region?: string;
  importance?: "low" | "medium" | "high";
}

export interface ReportSummaryApi {
  id: string;
  title: string;
  category?: string;
  published_at?: string;
  source?: string;
  summary?: string;
}

export const api = {
  listMasters: () => apiGet<{ masters: MasterSummary[] }>("/masters"),
  getMaster: (slug: string) => apiGet<{ master: MasterSummary }>(`/masters/${slug}`),
  getMasterHoldings: (slug: string, limit = 50) =>
    apiGet<{ slug: string; period_end?: string; filed_at?: string; holdings: unknown[] }>(
      `/masters/${slug}/holdings?limit=${limit}`,
    ),
  listNews: (limit = 20) => apiGet<{ items: NewsItemApi[] }>(`/news?limit=${limit}`),
  listEconomicEvents: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return apiGet<{ items: EconomicEventApi[] }>(
      `/events/economic${qs.toString() ? `?${qs}` : ""}`,
    );
  },
  listReports: (category?: string, limit = 20) => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    qs.set("limit", String(limit));
    return apiGet<{ items: ReportSummaryApi[] }>(`/reports?${qs}`);
  },
  listMacroIndicators: () => apiGet<{ items: unknown[] }>("/macros/indicators"),
  getQuote: (symbol: string, range: "1mo" | "3mo" | "6mo" | "1y" | "5y" = "6mo") =>
    apiGet<{
      symbol: string;
      currency: string;
      last: number;
      change: number;
      change_pct: number;
      as_of: string;
      bars: { t: string; o: number; h: number; l: number; c: number; v: number }[];
      last_refreshed_at?: string;
      stale?: boolean;
    }>(`/quotes/${symbol}?range=${range}`),
  getMyWatchlist: () => apiGet<{ watchlist: { items: unknown[] } }>("/watchlists/me"),
  getMyPortfolio: () => apiGet<{ portfolio: unknown }>("/portfolios/me"),
};
