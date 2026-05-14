export type ReportRegion = "KR" | "US" | "GLOBAL";
export type ReportCategory = "거시" | "13F" | "리서치" | "공시" | "산업";
export type ReportStatus = "complete" | "processing";

export type ReportListItem = {
  id: string;
  source: string;
  region: ReportRegion;
  category: ReportCategory;
  subtype: string;
  title: string;
  date: string;
  pages: number;
  language: "ko" | "en";
  summary: string;
  tags: string[];
  status: ReportStatus;
  views: string;
  bookmarks: string;
};

export type ReportKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  trend?: string;
};

export type ReportTocItem = {
  id: string;
  title: string;
  page: number;
  active: boolean;
};

export type ReportKeyPoint = {
  id: string;
  text: string;
};

export type ReportBodySection = {
  id: string;
  title: string;
  body: string;
};

export type InflationRow = {
  id: string;
  label: string;
  dec2024: string;
  jun2025: string;
  aug2025: string;
};

export type RelatedTicker = {
  id: string;
  symbol: string;
  name: string;
};

export type RelatedReport = {
  id: string;
  title: string;
  date: string;
};

export type ReportDetail = ReportListItem & {
  department: string;
  model: string;
  tokenCount: string;
  processingTime: string;
  aiSummary: string;
  keyPoints: ReportKeyPoint[];
  toc: ReportTocItem[];
  bodySections: ReportBodySection[];
  inflationRows: InflationRow[];
  relatedTickers: RelatedTicker[];
  relatedReports: RelatedReport[];
  memoPrompt: string;
};

export const REPORTS: ReportListItem[] = [
  {
    id: "bok-monetary-2025-09",
    source: "한국은행",
    region: "KR",
    category: "거시",
    subtype: "통화신용정책보고서",
    title: "2025년 9월 통화신용정책보고서",
    date: "2025.09.26",
    pages: 124,
    language: "ko",
    summary: "물가 안정세 지속, 가계부채 점진적 둔화. 기준금리 동결 시사.",
    tags: ["금리", "부동산", "가계부채"],
    status: "complete",
    views: "1,247",
    bookmarks: "89",
  },
  {
    id: "berkshire-13f-2025-q3",
    source: "SEC EDGAR",
    region: "US",
    category: "13F",
    subtype: "13F-HR",
    title: "Berkshire Hathaway · Q3 2025 13F-HR",
    date: "2025.11.14",
    pages: 32,
    language: "en",
    summary: "AAPL 비중 추가 축소, OXY 신규 매수 350M. 현금 비중 사상 최고.",
    tags: ["Buffett", "13F", "대형주"],
    status: "complete",
    views: "982",
    bookmarks: "76",
  },
  {
    id: "imf-weo-2025-10",
    source: "IMF",
    region: "GLOBAL",
    category: "거시",
    subtype: "World Economic Outlook",
    title: "World Economic Outlook · October 2025",
    date: "2025.10.15",
    pages: 218,
    language: "en",
    summary: "글로벌 GDP 성장률 3.2% 전망. 미국 견조, 중국 둔화, 유럽 회복 지연.",
    tags: ["글로벌GDP", "연준", "달러"],
    status: "complete",
    views: "744",
    bookmarks: "41",
  },
  {
    id: "kdi-outlook-2025-h2",
    source: "KDI",
    region: "KR",
    category: "거시",
    subtype: "경제전망",
    title: "2025년 하반기 경제전망",
    date: "2025.11.05",
    pages: 96,
    language: "ko",
    summary: "2025년 성장률 2.0%, 2026년 1.9% 전망. 반도체 회복이 견인.",
    tags: ["반도체", "수출", "내수"],
    status: "complete",
    views: "623",
    bookmarks: "38",
  },
  {
    id: "blackrock-ai-capex-2026",
    source: "BlackRock",
    region: "US",
    category: "리서치",
    subtype: "Investment Institute",
    title: "2026 Outlook: AI Capex Cycle",
    date: "2025.11.20",
    pages: 18,
    language: "en",
    summary: "AI 인프라 투자 사이클 본격화, 데이터센터·전력·반도체 멀티 사이클.",
    tags: ["AI", "반도체", "전력"],
    status: "complete",
    views: "589",
    bookmarks: "55",
  },
  {
    id: "dart-samsung-buyback-2025",
    source: "DART",
    region: "KR",
    category: "공시",
    subtype: "8-K급 주요공시",
    title: "삼성전자 · 자기주식 취득 신탁계약 체결",
    date: "2025.11.18",
    pages: 4,
    language: "ko",
    summary: "Docling 본문 추출 진행 중입니다. 곧 요약을 제공합니다.",
    tags: ["삼성전자", "자사주"],
    status: "processing",
    views: "331",
    bookmarks: "12",
  },
  {
    id: "oecd-outlook-118",
    source: "OECD",
    region: "GLOBAL",
    category: "거시",
    subtype: "Economic Outlook",
    title: "OECD Economic Outlook 118",
    date: "2025.11.12",
    pages: 282,
    language: "en",
    summary: "회원국 평균 성장률 1.6%. 한국 1.9% 전망. 인플레 안정화 진입.",
    tags: ["OECD", "인플레", "금리"],
    status: "complete",
    views: "418",
    bookmarks: "29",
  },
  {
    id: "kpmg-ai-semiconductor-2025",
    source: "삼정KPMG",
    region: "KR",
    category: "산업",
    subtype: "인사이트",
    title: "AI 반도체 산업 동향과 투자 기회",
    date: "2025.11.10",
    pages: 42,
    language: "ko",
    summary: "HBM·CXL 수요 급증. 국내 메모리 3사 수혜 전망.",
    tags: ["반도체", "HBM", "SK하이닉스"],
    status: "complete",
    views: "507",
    bookmarks: "44",
  },
];

export const REPORT_KPIS: ReportKpi[] = [
  { id: "total", label: "총 보고서", value: "2,847", detail: "30개 소스" },
  { id: "new", label: "이번 주 신규", value: "+47", detail: "전주 대비", trend: "+12%" },
  { id: "sources", label: "활성 소스", value: "30", detail: "공공·SEC·IB" },
  { id: "ai", label: "AI 처리 완료", value: "94%", detail: "Docling + 요약" },
];

export const REPORT_DETAIL: ReportDetail = {
  ...REPORTS[0],
  department: "통화정책국",
  model: "Gemini 1.5 Flash",
  tokenCount: "1,238",
  processingTime: "4.2초",
  aiSummary:
    "한국 경제는 물가 안정세가 이어지는 가운데 가계부채 증가세도 점진적으로 둔화되고 있다. 소비자물가 상승률은 2% 내외로 안정적이며, 가계부채 증가율은 분기 대비 0.4%p 하락했다. 대외적으로는 미국 연준의 금리 인하 사이클이 시작되며 원/달러 환율 압력이 완화될 전망이다. 한국은행은 현재 기준금리 3.25%를 동결할 가능성이 높으며, 향후 인하 시점은 2026년 상반기로 예상된다.",
  keyPoints: [
    { id: "cpi", text: "소비자물가 상승률 2.0%로 목표치에 부합" },
    { id: "debt", text: "가계부채 증가율 둔화, 전기 +1.2%에서 +0.8%" },
    { id: "housing", text: "주택가격 안정세 진입, 일부 수도권은 상승 압력 유지" },
    { id: "external", text: "대외 경상수지 흑자 지속, 외환보유액 4,200억 달러" },
    { id: "rate", text: "기준금리 동결 시사, 인하는 빨라야 2026년 상반기" },
  ],
  toc: [
    { id: "overview", title: "I. 총평", page: 4, active: true },
    { id: "inflation", title: "II. 물가", page: 12, active: false },
    { id: "core", title: "· 소비자물가", page: 14, active: false },
    { id: "base", title: "· 근원물가", page: 22, active: false },
    { id: "debt", title: "III. 가계부채", page: 38, active: false },
    { id: "real-estate", title: "IV. 부동산 시장", page: 56, active: false },
    { id: "external", title: "V. 대외 환경", page: 78, active: false },
    { id: "outlook", title: "VI. 향후 전망", page: 102, active: false },
    { id: "appendix", title: "VII. 부록 · 통계", page: 118, active: false },
  ],
  bodySections: [
    {
      id: "overview",
      title: "I. 총평",
      body:
        "2025년 9월 현재 한국 경제는 물가 안정세가 이어지는 가운데 가계부채 증가세도 점진적으로 둔화되고 있다. 다만 일부 수도권 부동산 시장에서는 여전히 가격 상승 압력이 남아 있으며, 대외적으로는 미국 연준의 금리 정책 변화가 향후 통화정책 운용에 중요한 변수로 작용할 전망이다.",
    },
    {
      id: "inflation",
      title: "II. 물가",
      body:
        "소비자물가 상승률은 2025년 8월 기준 전년 동월 대비 2.0%로 한국은행의 물가 안정 목표에 부합하는 수준을 유지하고 있다. 이는 국제 유가 안정과 식료품 가격 하락에 힘입은 결과로 분석된다.",
    },
    {
      id: "debt",
      title: "III. 가계부채",
      body:
        "가계부채 증가율은 2분기 대비 0.4%p 하락한 0.8%를 기록했다. 정부의 DSR 규제 강화와 금리 인상 누적 효과가 점진적으로 나타나고 있는 것으로 평가된다.",
    },
  ],
  inflationRows: [
    { id: "cpi", label: "소비자물가", dec2024: "2.4", jun2025: "2.1", aug2025: "2.0" },
    { id: "core", label: "근원물가", dec2024: "2.0", jun2025: "1.9", aug2025: "1.8" },
    { id: "living", label: "생활물가", dec2024: "3.1", jun2025: "2.4", aug2025: "2.2" },
    { id: "fresh", label: "신선식품", dec2024: "8.2", jun2025: "3.4", aug2025: "2.8" },
  ],
  relatedTickers: [
    { id: "samsung", symbol: "005930", name: "삼성전자" },
    { id: "shinhan", symbol: "055550", name: "신한지주" },
    { id: "hana", symbol: "086790", name: "하나금융지주" },
    { id: "sk", symbol: "034730", name: "SK" },
  ],
  relatedReports: [
    { id: "kdi", title: "KDI · 경제전망 25H2", date: "2025.11.05" },
    { id: "household", title: "BOK 이슈노트 · 가계부채", date: "2025.10.18" },
    { id: "imf", title: "IMF · WEO Oct 2025", date: "2025.10.15" },
  ],
  memoPrompt: "메모 작성 - 인용, 하이라이트, 내 생각 기록",
};

export function getReport(id: string | undefined): ReportDetail | undefined {
  if (!id) {
    return undefined;
  }

  if (id === REPORT_DETAIL.id) {
    return REPORT_DETAIL;
  }

  const listItem = REPORTS.find((report) => report.id === id);
  if (!listItem) {
    return undefined;
  }

  return {
    ...REPORT_DETAIL,
    ...listItem,
    department: listItem.source,
    aiSummary: listItem.summary,
    keyPoints:
      listItem.status === "complete"
        ? REPORT_DETAIL.keyPoints
        : [{ id: "pending", text: "본문 추출과 요약 처리가 진행 중입니다." }],
  };
}
