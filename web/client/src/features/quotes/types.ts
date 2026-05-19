export type QuoteRange = "1mo" | "3mo" | "6mo" | "1y" | "5y";

export interface QuoteBar {
  t: string; // ISO
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Quote {
  symbol: string;
  currency: string;
  last: number;
  change: number;
  change_pct: number;
  as_of: string;
  bars: QuoteBar[];
  last_refreshed_at?: string;
  stale?: boolean;
}
