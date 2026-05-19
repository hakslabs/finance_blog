export interface ReportSummary {
  id: string;
  source: string;
  title: string;
  category: string | null;
  published_at: string | null;
  language: string | null;
  importance: number | null;
}

export interface ReportDetail extends ReportSummary {
  summary: string | null;
  url: string | null;
  tags: string[];
}

export interface ReportListResponse {
  reports: ReportSummary[];
}

export interface ReportResponse {
  report: ReportDetail;
}
