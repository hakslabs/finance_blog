export interface MoverItem {
  rank: number;
  symbol: string;
  name: string;
  market: "US" | "KR" | string;
  last: number;
  change: number;
  change_pct: number;
  volume: number | null;
}

export interface MoversResponse {
  market: string;
  items: MoverItem[];
}
