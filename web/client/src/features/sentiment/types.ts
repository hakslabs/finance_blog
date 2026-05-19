export type FearGreedLabel =
  | "extreme fear"
  | "fear"
  | "neutral"
  | "greed"
  | "extreme greed"
  | string;

export interface FearGreedItem {
  market: string;
  market_code: "US" | "KR" | string;
  value: number;
  label: FearGreedLabel;
  previous_close: number | null;
  previous_1_week: number | null;
  previous_1_month: number | null;
  previous_1_year: number | null;
  timestamp: string;
}

export interface FearGreedResponse {
  items: FearGreedItem[];
}
