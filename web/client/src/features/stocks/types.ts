export interface StockProfile {
  name: string;
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
}

export interface StockMetrics {
  pe_ttm: number | null;
  pb: number | null;
  roe_ttm: number | null;
  dividend_yield: number | null;
  beta: number | null;
  week52_high: number | null;
  week52_low: number | null;
  current_ratio: number | null;
  debt_equity: number | null;
  eps_ttm: number | null;
  revenue_per_share_ttm: number | null;
}

export interface ProfileResponse {
  symbol: string;
  profile: StockProfile;
  metrics: StockMetrics;
}

export interface ConsensusRow {
  period: string;
  strong_buy: number;
  buy: number;
  hold: number;
  sell: number;
  strong_sell: number;
}

export interface ConsensusResponse {
  symbol: string;
  recommendations: ConsensusRow[];
}

export interface StockHolder {
  filer_name: string;
  master_slug: string | null;
  filed_at: string;
  shares: number;
  market_value: number | null;
  weight_pct: number | null;
  position_kind: "long" | "short" | string;
}

export interface StockHoldersResponse {
  symbol: string;
  items: StockHolder[];
}

export interface NextEarning {
  date: string;
  hour: "bmo" | "amc" | "dmh" | string | null;
  eps_estimate: number | null;
  revenue_estimate: number | null;
  year: number | null;
  quarter: number | null;
}

export interface NextEarningResponse {
  symbol: string;
  next: NextEarning | null;
}

export interface FilingItem {
  accession: string;
  form: string;
  filed_at: string;
  description: string | null;
  url: string;
}

export interface FilingsResponse {
  symbol: string;
  cik: string | null;
  items: FilingItem[];
}
