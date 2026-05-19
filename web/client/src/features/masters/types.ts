/**
 * Master domain types. Mirror the FastAPI Pydantic models in
 * api/app/models/masters.py. Single source of truth for the frontend.
 */

export interface MasterSummary {
  id: string;
  slug: string;
  name: string;
  firm: string | null;
  country_code: string | null;
  style: string | null;
  aum: number | null;
  aum_currency: string | null;
  photo_url: string | null;
}

export interface MasterPrinciple {
  ordinal: number;
  title: string;
  body: string | null;
}

export interface MasterBook {
  id: string;
  ordinal: number;
  title: string;
  url: string | null;
  year: number | null;
}

export interface MasterStrategy {
  ordinal: number;
  title: string;
  body: string | null;
}

export interface MasterDetail extends MasterSummary {
  description: string | null;
  homepage_url: string | null;
  filer_cik: string | null;
  birth_year: number | null;
  principles: MasterPrinciple[];
  books: MasterBook[];
  strategies: MasterStrategy[];
}

export interface MasterHolding {
  instrument_id: string;
  symbol: string | null;
  name: string | null;
  exchange: string | null;
  shares: number;
  market_value: number | null;
  weight_pct: number | null;
  position_kind: "long" | "short" | string;
}

export interface MasterHoldingsResponse {
  slug: string;
  period_end: string | null;
  filed_at: string | null;
  holdings: MasterHolding[];
}
