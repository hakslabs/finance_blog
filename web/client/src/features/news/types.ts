export interface NewsItem {
  id: string;
  source: string;
  title: string;
  summary: string | null;
  url: string | null;
  language: string | null;
  published_at: string | null;
  related_symbols: string[];
}

export interface NewsResponse {
  items: NewsItem[];
}
