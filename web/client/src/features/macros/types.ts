export interface MacroIndicator {
  series_id: string;
  label: string;
  country_code: string;
  unit: string | null;
  date: string;
  value: number | null;
  previous_value: number | null;
  change: number | null;
}

export interface MacroIndicatorsResponse {
  indicators: MacroIndicator[];
}
