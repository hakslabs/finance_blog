export interface EconomicEvent {
  time: string; // "YYYY-MM-DD HH:MM:SS"
  country: string;
  event: string;
  impact: "low" | "medium" | "high" | string;
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string | null;
}

export interface EconomicEventsResponse {
  items: EconomicEvent[];
}
