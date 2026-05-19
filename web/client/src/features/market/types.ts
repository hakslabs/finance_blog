export interface BreadthCell {
  symbol: string;
  name: string;
  change_pct: number;
  last: number;
}

export interface BreadthResponse {
  market: "US" | "KR" | string;
  score: number; // 0-100
  rising: number;
  falling: number;
  flat: number;
  total: number;
  cells: BreadthCell[];
}
