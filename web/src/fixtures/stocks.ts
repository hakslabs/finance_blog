// Static typed fixtures for the stocks route.
// Derived from design/wires-v3/wire-stock.jsx, wire-stock-tabs-a.jsx, wire-stock-tabs-b.jsx.
// No network calls.

// ── Types ───────────────────────────────────────────────────────────────────

export type StockListItem = {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  price: string;
  change: string;
  up: boolean;
  marketCap: string;
  volume: string;
};

export type StockKeyStats = {
  marketCap: string;
  volume: string;
  week52Range: string;
  per: string;
  pbr: string;
  roe: string;
  dividendYield: string;
  beta: string;
};

export type CompanyOverview = {
  description: string;
  headquarters: string;
  founded: number;
  ceo: string;
  employees: string;
  fiscalYearEnd: string;
  website: string;
};

export type SectorPosition = {
  label: string;
  value: string;
};

export type TechnicalSignal = {
  id: string;
  label: string;
  value: string;
  tone: "positive" | "neutral" | "negative";
};

export type FinancialRow = {
  id: string;
  item: string;
  values: (string | number)[];
  bold?: boolean;
};

export type FinancialTable = {
  id: string;
  title: string;
  hint: string;
  headers: string[];
  rows: FinancialRow[];
};

export type PeerComparison = {
  id: string;
  symbol: string;
  name: string;
  marketCap: string;
  per: string;
  pbr: string;
  roe: string;
  revenueGrowth: string;
  opMargin: string;
  isHighlight?: boolean;
  isMedian?: boolean;
};

export type ValuationMetric = {
  id: string;
  label: string;
  value: string;
  context: string;
  tone: "positive" | "neutral" | "negative";
};

export type FairValueEstimate = {
  id: string;
  method: string;
  fairPrice: string;
  premium: string;
  tone: "positive" | "neutral" | "negative";
};

export type FilingItem = {
  id: string;
  date: string;
  formType: string;
  title: string;
  priceImpact: string;
  tone: "up" | "down" | "neutral";
};

export type EarningsEvent = {
  id: string;
  date: string;
  quarter: string;
  timing: string;
  consensusRevenue: string;
  consensusEps: string;
  consensusOpMargin: string;
};

export type NewsItem = {
  id: string;
  timeAgo: string;
  source: string;
  title: string;
  summary: string;
};

export type SupplyDemandKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "neutral" | "negative";
};

export type InstitutionalHolder = {
  id: string;
  name: string;
  shares: string;
  value: string;
  weight: string;
  qoqChange: string;
  activity: string;
};

export type InsiderTrade = {
  id: string;
  name: string;
  action: string;
  detail: string;
};

export type ConsensusSummary = {
  rating: string;
  analystCount: string;
  targetMean: string;
  upsidePotential: string;
};

export type AnalystReport = {
  id: string;
  date: string;
  firm: string;
  opinionChange: string;
  prevTarget: string;
  newTarget: string;
  comment: string;
};

export type GuruHolding = {
  id: string;
  name: string;
  firm: string;
  weight: string;
  activity: string;
  tone: "positive" | "neutral" | "negative";
};

export type SimilarStock = {
  id: string;
  symbol: string;
  sector: string;
  correlation: string;
  change: string;
  up: boolean;
};

// ── Tab list ────────────────────────────────────────────────────────────────

export const STOCK_TABS = [
  "개요",
  "차트",
  "재무",
  "밸류에이션",
  "공시·실적",
  "뉴스",
  "수급",
  "컨센서스",
] as const;

export type StockTab = (typeof STOCK_TABS)[number];

// ── Stock detail aggregate ─────────────────────────────────────────────────

export type StockDetail = {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  price: string;
  change: string;
  changePercent: string;
  up: boolean;
  lastUpdated: string;
  keyStats: StockKeyStats;
  companyOverview: CompanyOverview;
  sectorPosition: SectorPosition[];
  technicalSignals: TechnicalSignal[];
  incomeStatement: FinancialTable;
  balanceSheet: FinancialTable;
  cashFlow: FinancialTable;
  keyRatios: FinancialTable;
  valuationMetrics: ValuationMetric[];
  peerComparison: PeerComparison[];
  fairValueEstimates: FairValueEstimate[];
  filings: FilingItem[];
  nextEarnings: EarningsEvent;
  news: NewsItem[];
  supplyKpis: SupplyDemandKpi[];
  institutionalHolders: InstitutionalHolder[];
  insiderTrades: InsiderTrade[];
  consensus: ConsensusSummary;
  analystReports: AnalystReport[];
  guruHoldings: GuruHolding[];
  similarStocks: SimilarStock[];
};

// ── Stock list fixture ─────────────────────────────────────────────────────

export const STOCK_LIST: StockListItem[] = [
  {
    id: "stock-aapl",
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    sector: "기술",
    price: "184.32",
    change: "+1.24%",
    up: true,
    marketCap: "$2.87T",
    volume: "58.2M",
  },
  {
    id: "stock-nvda",
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    sector: "반도체",
    price: "912.18",
    change: "+3.42%",
    up: true,
    marketCap: "$2.24T",
    volume: "48.2M",
  },
  {
    id: "stock-msft",
    symbol: "MSFT",
    name: "Microsoft Corporation",
    exchange: "NASDAQ",
    sector: "기술",
    price: "424.10",
    change: "+0.82%",
    up: true,
    marketCap: "$3.15T",
    volume: "22.1M",
  },
  {
    id: "stock-tsla",
    symbol: "TSLA",
    name: "Tesla Inc.",
    exchange: "NASDAQ",
    sector: "자동차",
    price: "218.40",
    change: "-2.10%",
    up: false,
    marketCap: "$694B",
    volume: "98.5M",
  },
  {
    id: "stock-goog",
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    exchange: "NASDAQ",
    sector: "기술",
    price: "174.50",
    change: "+0.56%",
    up: true,
    marketCap: "$2.16T",
    volume: "31.4M",
  },
  {
    id: "stock-amzn",
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    exchange: "NASDAQ",
    sector: "소매/클라우드",
    price: "186.80",
    change: "+1.78%",
    up: true,
    marketCap: "$1.94T",
    volume: "42.7M",
  },
  {
    id: "stock-meta",
    symbol: "META",
    name: "Meta Platforms Inc.",
    exchange: "NASDAQ",
    sector: "기술",
    price: "489.20",
    change: "+2.34%",
    up: true,
    marketCap: "$1.23T",
    volume: "18.9M",
  },
  {
    id: "stock-005930",
    symbol: "005930",
    name: "삼성전자",
    exchange: "KRX",
    sector: "반도체/전자",
    price: "78,400",
    change: "+0.51%",
    up: true,
    marketCap: "₩ 468조",
    volume: "8.2M",
  },
  {
    id: "stock-000660",
    symbol: "000660",
    name: "SK하이닉스",
    exchange: "KRX",
    sector: "반도체",
    price: "198,500",
    change: "-1.24%",
    up: false,
    marketCap: "₩ 144조",
    volume: "3.1M",
  },
  {
    id: "stock-373220",
    symbol: "373220",
    name: "LG에너지솔루션",
    exchange: "KRX",
    sector: "배터리",
    price: "362,000",
    change: "+0.83%",
    up: true,
    marketCap: "₩ 165조",
    volume: "0.4M",
  },
  {
    id: "stock-avgo",
    symbol: "AVGO",
    name: "Broadcom Inc.",
    exchange: "NASDAQ",
    sector: "반도체",
    price: "1,420.00",
    change: "+1.92%",
    up: true,
    marketCap: "$656B",
    volume: "2.8M",
  },
  {
    id: "stock-amd",
    symbol: "AMD",
    name: "Advanced Micro Devices",
    exchange: "NASDAQ",
    sector: "반도체",
    price: "158.40",
    change: "-0.68%",
    up: false,
    marketCap: "$256B",
    volume: "45.6M",
  },
];

// ── AAPL detail fixture ─────────────────────────────────────────────────────

export const AAPL_DETAIL: StockDetail = {
  symbol: "AAPL",
  name: "Apple Inc.",
  exchange: "NASDAQ",
  sector: "기술 (소비자 전자 / 서비스)",
  price: "184.32",
  change: "+$2.26",
  changePercent: "+1.24%",
  up: true,
  lastUpdated: "2026-05-06 14:32 ET · 15분 지연",

  keyStats: {
    marketCap: "$2.87T",
    volume: "58.2M",
    week52Range: "$142 / $199",
    per: "28.4",
    pbr: "48.2",
    roe: "147.6%",
    dividendYield: "0.51%",
    beta: "1.22",
  },

  companyOverview: {
    description:
      "애플은 iPhone, Mac, iPad, Wearable, 서비스로 구성된 하드웨어·소프트웨어 생태계 기업. 모바일·PC·워치블·서비스(앱스토어, iCloud, Apple Music, Apple TV+) 4개 사업부 운영 중. 높은 브랜드 충성도와 폐쇄형 생태계가 경쟁 우위.",
    headquarters: "Cupertino, CA",
    founded: 1976,
    ceo: "Tim Cook",
    employees: "164,000명",
    fiscalYearEnd: "9월 말",
    website: "apple.com",
  },

  sectorPosition: [
    { label: "시가총액 순위", value: "2위 / 기술 섹터" },
    { label: "YTD 수익률", value: "+8.4% (섹터 +12%)" },
    { label: "PER (섹터 평균)", value: "28.4 (34.2)" },
    { label: "ROE (섹터 평균)", value: "147.6% (42.8%)" },
  ],

  technicalSignals: [
    { id: "ts-gc", label: "골든크로스 (MA20/60)", value: "확인됨 · 3주 전", tone: "positive" },
    { id: "ts-rsi", label: "RSI(14)", value: "58.6 · 중립", tone: "neutral" },
    { id: "ts-macd", label: "MACD", value: "상승 추세 강화", tone: "positive" },
    { id: "ts-bb", label: "볼린저밴드", value: "중간대 근접", tone: "neutral" },
    { id: "ts-52h", label: "52주 신고가 대비", value: "-7.4%", tone: "neutral" },
    { id: "ts-vol", label: "거래량 (20일 평균)", value: "+8%", tone: "neutral" },
  ],

  incomeStatement: {
    id: "fin-income",
    title: "손익계산서 ($B)",
    hint: "EDGAR · 연간",
    headers: ["항목", "FY21", "FY22", "FY23", "FY24", "FY25"],
    rows: [
      { id: "fi-rev", item: "매출", values: [365.8, 394.3, 383.3, 391.0, 432.9], bold: true },
      { id: "fi-cogs", item: "매출원가", values: [212.9, 223.5, 214.1, 210.2, 240.1] },
      { id: "fi-gp", item: "매출총이익", values: [152.9, 170.8, 169.2, 180.8, 192.8], bold: true },
      { id: "fi-sga", item: "판관비", values: [25.1, 27.8, 28.5, 29.0, 30.2] },
      { id: "fi-op", item: "영업이익", values: [109.0, 119.4, 114.3, 123.5, 138.4], bold: true },
      { id: "fi-net", item: "순이익", values: [94.7, 99.8, 97.0, 93.7, 112.4], bold: true },
      { id: "fi-eps", item: "EPS (희석)", values: [5.67, 6.15, 5.94, 5.72, 6.88] },
    ],
  },

  balanceSheet: {
    id: "fin-bs",
    title: "재무상태표 ($B)",
    hint: "요약",
    headers: ["항목", "FY21", "FY22", "FY23", "FY24", "FY25"],
    rows: [
      { id: "bs-ta", item: "총자산", values: [351.0, 352.8, 352.6, 364.9, 381.2] },
      { id: "bs-tl", item: "총부채", values: [287.9, 302.1, 290.4, 269.7, 275.3] },
      { id: "bs-eq", item: "자본총계", values: [63.1, 50.7, 62.1, 95.2, 105.9] },
      { id: "bs-cash", item: "현금 및 단기투자", values: [62.5, 48.3, 57.2, 81.4, 88.2] },
      { id: "bs-debt", item: "장기부채", values: [109.1, 120.2, 109.5, 99.3, 96.8] },
    ],
  },

  cashFlow: {
    id: "fin-cf",
    title: "현금흐름표 ($B)",
    hint: "요약",
    headers: ["항목", "FY21", "FY22", "FY23", "FY24", "FY25"],
    rows: [
      { id: "cf-ocf", item: "영업활동 CF", values: [104.0, 122.2, 110.5, 118.9, 132.4] },
      { id: "cf-icf", item: "투자활동 CF", values: [-46.3, -51.2, -41.8, -38.5, -44.1] },
      { id: "cf-fcf", item: "자유현금흐름", values: [93.0, 111.0, 99.5, 106.2, 118.0] },
      { id: "cf-div", item: "주주환원 (배당+자사주)", values: [-33.2, -37.8, -36.1, -40.5, -44.2] },
    ],
  },

  keyRatios: {
    id: "fin-ratios",
    title: "주요 비율 추이",
    hint: "",
    headers: ["지표", "FY21", "FY22", "FY23", "FY24", "FY25"],
    rows: [
      { id: "kr-gm", item: "매출총이익률 (%)", values: [41.8, 43.3, 44.1, 46.2, 44.5] },
      { id: "kr-om", item: "영업이익률 (%)", values: [29.8, 30.3, 29.8, 31.6, 32.0] },
      { id: "kr-nm", item: "순이익률 (%)", values: [25.9, 25.3, 25.3, 24.0, 26.0] },
      { id: "kr-roe", item: "ROE (%)", values: [150.0, 196.9, 156.2, 98.4, 106.1] },
      { id: "kr-roa", item: "ROA (%)", values: [27.0, 28.3, 27.5, 25.7, 29.5] },
      { id: "kr-dr", item: "부채비율 (%)", values: [82, 86, 82, 74, 72] },
    ],
  },

  valuationMetrics: [
    { id: "vm-per", label: "PER", value: "28.4", context: "업계 32 · 5Y 평균 26", tone: "neutral" },
    { id: "vm-pbr", label: "PBR", value: "48.2", context: "업계 14", tone: "negative" },
    { id: "vm-ev", label: "EV/EBITDA", value: "22.1", context: "업계 20", tone: "neutral" },
    { id: "vm-dy", label: "배당수익률", value: "0.51%", context: "업계 1.2%", tone: "neutral" },
  ],

  peerComparison: [
    { id: "peer-aapl", symbol: "AAPL", name: "Apple", marketCap: "$2.87T", per: "28.4", pbr: "48.2", roe: "147.6%", revenueGrowth: "+10.7%", opMargin: "32.0%", isHighlight: true },
    { id: "peer-msft", symbol: "MSFT", name: "Microsoft", marketCap: "$3.15T", per: "34.2", pbr: "12.4", roe: "42.8%", revenueGrowth: "+14.2%", opMargin: "44.8%" },
    { id: "peer-goog", symbol: "GOOGL", name: "Alphabet", marketCap: "$2.16T", per: "21.4", pbr: "6.8", roe: "31.2%", revenueGrowth: "+13.8%", opMargin: "30.4%" },
    { id: "peer-meta", symbol: "META", name: "Meta", marketCap: "$1.23T", per: "24.8", pbr: "8.2", roe: "36.4%", revenueGrowth: "+18.6%", opMargin: "42.1%" },
    { id: "peer-amd", symbol: "AMD", name: "AMD", marketCap: "$256B", per: "168.0", pbr: "4.2", roe: "12.4%", revenueGrowth: "+18.2%", opMargin: "6.8%" },
    { id: "peer-median", symbol: "", name: "업계 중간값", marketCap: "—", per: "28.4", pbr: "8.2", roe: "31.2%", revenueGrowth: "+13.8%", opMargin: "30.4%", isMedian: true },
  ],

  fairValueEstimates: [
    { id: "fv-dcf", method: "DCF (5Y FCF 할인)", fairPrice: "$196.20", premium: "+6.5%", tone: "positive" },
    { id: "fv-per", method: "PER 멀티플 (28배 적용)", fairPrice: "$192.80", premium: "+4.6%", tone: "positive" },
    { id: "fv-ev", method: "EV/EBITDA (업계 평균)", fairPrice: "$172.40", premium: "-6.4%", tone: "negative" },
    { id: "fv-wa", method: "평균 (가중)", fairPrice: "$188.40", premium: "+2.2%", tone: "neutral" },
  ],

  filings: [
    { id: "fil-1", date: "2026-04-28", formType: "8-K", title: "신제품 발표 (iPad Pro M5)", priceImpact: "+2.1%", tone: "up" },
    { id: "fil-2", date: "2026-02-21", formType: "10-Q", title: "Q1 FY26 실적 발표", priceImpact: "+3.4%", tone: "up" },
    { id: "fil-3", date: "2026-01-15", formType: "Form 4", title: "임원 매수 공시", priceImpact: "+0.3%", tone: "neutral" },
    { id: "fil-4", date: "2025-11-08", formType: "10-Q", title: "Q4 FY25 실적 발표", priceImpact: "+1.8%", tone: "up" },
    { id: "fil-5", date: "2025-09-12", formType: "8-K", title: "자사주 매입 $110B 추가 승인", priceImpact: "+2.8%", tone: "up" },
    { id: "fil-6", date: "2025-07-31", formType: "10-K", title: "FY25 연간 보고서", priceImpact: "-0.5%", tone: "neutral" },
    { id: "fil-7", date: "2025-05-02", formType: "8-K", title: "분기 배당 $0.25 인상 발표", priceImpact: "+0.8%", tone: "up" },
  ],

  nextEarnings: {
    id: "earn-next",
    date: "2026-05-22 (D-16)",
    quarter: "FY26 Q2",
    timing: "장 마감 후 (After Hours)",
    consensusRevenue: "$95.2B",
    consensusEps: "$1.62",
    consensusOpMargin: "28.4%",
  },

  news: [
    { id: "news-1", timeAgo: "12분 전", source: "Bloomberg", title: "Apple Vision Pro 3 출시 임박, 공급망 주목", summary: "마이크로OLED 패널 양산 준비 완료. 2H26 출시 예상." },
    { id: "news-2", timeAgo: "1시간 전", source: "Reuters", title: "AAPL 자사주 매입 속도 유지, 분기 $24B 소각", summary: "프로그램 종료 없이 지속적 환원 정책 유지." },
    { id: "news-3", timeAgo: "3시간 전", source: "WSJ", title: "Apple Intelligence 구독 매출 전망 상향", summary: "AI 서비스 부문 FY27 $80B 달성 가능성 제기." },
    { id: "news-4", timeAgo: "어제", source: "한국경제", title: "아이폰 17 시리즈 한국 출하량 전년 대비 +8%", summary: "프리미엄 라인 강세로 ASP 상승." },
    { id: "news-5", timeAgo: "2일 전", source: "CNBC", title: "EU DMA 벌금 영향 제한적 — 애널리스트 의견", summary: "규제 리스크는 이미 가격에 반영, 장기적으로 무영향." },
  ],

  supplyKpis: [
    { id: "sd-1", label: "외국인 보유율", value: "61.2%", detail: "+0.1%p · 7일", tone: "positive" },
    { id: "sd-2", label: "기관 보유율", value: "32.4%", detail: "−0.2%p · 7일", tone: "negative" },
    { id: "sd-3", label: "공매도 잔고", value: "0.68%", detail: "낮은 수준", tone: "neutral" },
    { id: "sd-4", label: "공매도 일평균", value: "$380M", detail: "−5% · 30일", tone: "positive" },
  ],

  institutionalHolders: [
    { id: "ih-1", name: "Vanguard", shares: "1.8B", value: "$332B", weight: "11.6%", qoqChange: "+0.1%", activity: "소폭 매수" },
    { id: "ih-2", name: "BlackRock", shares: "1.5B", value: "$276B", weight: "9.6%", qoqChange: "+0.2%", activity: "소폭 매수" },
    { id: "ih-3", name: "State Street", shares: "0.8B", value: "$147B", weight: "5.1%", qoqChange: "0.0%", activity: "유지" },
    { id: "ih-4", name: "Fidelity", shares: "0.5B", value: "$92B", weight: "3.2%", qoqChange: "−0.1%", activity: "매도" },
    { id: "ih-5", name: "Geode Capital", shares: "0.3B", value: "$55B", weight: "1.9%", qoqChange: "+0.05%", activity: "매수" },
  ],

  insiderTrades: [
    { id: "it-1", name: "Tim Cook", action: "매수", detail: "100K @ $178" },
    { id: "it-2", name: "CFO (Luca Maestri)", action: "매도", detail: "30K @ $186" },
  ],

  consensus: {
    rating: "매수",
    analystCount: "48명",
    targetMean: "$206.00",
    upsidePotential: "+11.8%",
  },

  analystReports: [
    { id: "ar-1", date: "12-18", firm: "Morgan Stanley · E. Woodring", opinionChange: "매수 → 매수", prevTarget: "$195", newTarget: "$220", comment: "AI 서비스 매출 기여도 확대 전망" },
    { id: "ar-2", date: "12-12", firm: "Goldman Sachs · M. Ng", opinionChange: "매수 → 매수", prevTarget: "$190", newTarget: "$205", comment: "iPhone 17 사이클 견조" },
    { id: "ar-3", date: "12-08", firm: "Bank of America · W. Ramaswamy", opinionChange: "매수 → 매수", prevTarget: "$200", newTarget: "$215", comment: "자사주 + 배당 복합 수익률 개선" },
    { id: "ar-4", date: "12-01", firm: "Wedbush · D. Ives", opinionChange: "강력매수 → 강력매수", prevTarget: "$250", newTarget: "$280", comment: "Vision Pro 3 + AI 에코시스템" },
    { id: "ar-5", date: "11-20", firm: "JPMorgan · T. Choubey", opinionChange: "매수 → 매수", prevTarget: "$185", newTarget: "$195", comment: "중국 시장 점유율 안정화" },
    { id: "ar-6", date: "11-08", firm: "Morningstar · J. Delcourt", opinionChange: "보유 → 보유", prevTarget: "$160", newTarget: "$168", comment: "고PBR 부담 — 적정주가 보수적" },
  ],

  guruHoldings: [
    { id: "gh-1", name: "Warren Buffett", firm: "Berkshire Hathaway", weight: "5.8%", activity: "유지", tone: "neutral" },
    { id: "gh-2", name: "Stanley Druckenmiller", firm: "Duquesne Family Office", weight: "2.1%", activity: "+ 매수 Q3", tone: "positive" },
    { id: "gh-3", name: "Bill Ackman", firm: "Pershing Square", weight: "3.4%", activity: "신규 매수", tone: "positive" },
    { id: "gh-4", name: "Cathie Wood", firm: "ARK Invest", weight: "1.2%", activity: "− 4% Q3", tone: "negative" },
    { id: "gh-5", name: "David Tepper", firm: "Appaloosa LP", weight: "2.8%", activity: "+0.5%", tone: "positive" },
  ],

  similarStocks: [
    { id: "sim-msft", symbol: "MSFT", sector: "기술", correlation: "0.72", change: "+0.82%", up: true },
    { id: "sim-goog", symbol: "GOOGL", sector: "기술", correlation: "0.68", change: "+0.56%", up: true },
    { id: "sim-meta", symbol: "META", sector: "기술", correlation: "0.54", change: "+2.34%", up: true },
    { id: "sim-nvda", symbol: "NVDA", sector: "반도체", correlation: "0.48", change: "+3.42%", up: true },
    { id: "sim-amd", symbol: "AMD", sector: "반도체", correlation: "0.42", change: "-0.68%", up: false },
  ],
};

// ── Lookup helper ───────────────────────────────────────────────────────────

const DETAIL_MAP: Record<string, StockDetail> = {
  AAPL: AAPL_DETAIL,
};

/** Detail-shell helper: when a symbol isn't in DETAIL_MAP, build a fixture
 * skeleton off AAPL_DETAIL with the symbol/name/exchange swapped. Live
 * data (quote, news, filings, financials, consensus) is loaded by the
 * page hooks at runtime and overlays this shell — the shell only feeds
 * the static text that isn't yet wired to a backend. */
function buildShell(symbol: string): StockDetail {
  const upper = symbol.toUpperCase();
  const isKr = /\.K[SQ]$/i.test(upper);
  const listed = STOCK_LIST.find((s) => s.symbol.toUpperCase() === upper);
  return {
    ...AAPL_DETAIL,
    symbol: upper,
    name: listed?.name ?? upper,
    exchange: listed?.exchange ?? (isKr ? "KRX" : "NASDAQ"),
    sector: listed?.sector ?? "—",
    price: listed?.price ?? "—",
    change: listed?.change ?? "—",
    changePercent: "",
    up: listed?.up ?? true,
    lastUpdated: "—",
  };
}

/** Case-insensitive lookup for stock detail by symbol. Falls back to a
 *  generated shell so the detail page renders for any symbol. */
export function getStockDetail(symbol: string): StockDetail {
  const upper = symbol.toUpperCase();
  return DETAIL_MAP[upper] ?? buildShell(upper);
}
