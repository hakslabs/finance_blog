// ============================================================
// Mock financial data for FinanceLab Pro
// ============================================================

export const MARKET_INDICES = [
  { symbol: "KOSPI", name: "코스피", value: 2684.32, change: 18.42, changePct: 0.69, market: "KR" },
  { symbol: "KOSDAQ", name: "코스닥", value: 872.14, change: 4.21, changePct: 0.49, market: "KR" },
  { symbol: "S&P 500", name: "미국", value: 5812.44, change: 21.82, changePct: 0.38, market: "US" },
  { symbol: "NASDAQ", name: "나스닥", value: 18024.1, change: 128.6, changePct: 0.72, market: "US" },
  { symbol: "DOW", name: "다우", value: 39142.2, change: -84.3, changePct: -0.22, market: "US" },
  { symbol: "USD/KRW", name: "원/달러", value: 1387.20, change: -3.10, changePct: -0.22, market: "FX" },
  { symbol: "WTI", name: "국제유가", value: 71.84, change: 0.42, changePct: 0.59, market: "COMM" },
  { symbol: "GOLD", name: "금", value: 2318.4, change: 9.4, changePct: 0.41, market: "COMM" },
  { symbol: "BTC", name: "비트코인", value: 61240, change: -820, changePct: -1.32, market: "CRYPTO" },
  { symbol: "VIX", name: "공포지수", value: 14.2, change: -0.4, changePct: -2.74, market: "VOL" },
];

export const US_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", price: 184.32, changePct: 1.24, marketCap: "$2.87T", sector: "기술", pe: 28.4, roe: 147.6 },
  { ticker: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", price: 912.18, changePct: 3.42, marketCap: "$2.24T", sector: "반도체", pe: 65.2, roe: 91.4 },
  { ticker: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", price: 424.10, changePct: 0.82, marketCap: "$3.15T", sector: "기술", pe: 36.1, roe: 38.5 },
  { ticker: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", price: 218.40, changePct: -2.10, marketCap: "$694B", sector: "자동차", pe: 52.1, roe: 18.2 },
  { ticker: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", price: 174.50, changePct: 0.56, marketCap: "$2.16T", sector: "기술", pe: 24.8, roe: 27.3 },
  { ticker: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", price: 186.80, changePct: 1.78, marketCap: "$1.94T", sector: "소매/클라우드", pe: 41.2, roe: 22.1 },
  { ticker: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", price: 489.20, changePct: 2.34, marketCap: "$1.23T", sector: "기술", pe: 26.4, roe: 34.8 },
  { ticker: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", price: 1420.00, changePct: 1.92, marketCap: "$656B", sector: "반도체", pe: 31.2, roe: 28.4 },
  { ticker: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", price: 158.40, changePct: -0.68, marketCap: "$256B", sector: "반도체", pe: 44.8, roe: 12.1 },
  { ticker: "JPM", name: "JPMorgan Chase", exchange: "NYSE", price: 198.42, changePct: 0.34, marketCap: "$573B", sector: "금융", pe: 11.8, roe: 16.2 },
  { ticker: "XOM", name: "Exxon Mobil", exchange: "NYSE", price: 112.84, changePct: 0.82, marketCap: "$448B", sector: "에너지", pe: 13.4, roe: 18.9 },
  { ticker: "CVX", name: "Chevron Corporation", exchange: "NYSE", price: 154.22, changePct: 0.61, marketCap: "$285B", sector: "에너지", pe: 12.1, roe: 14.8 },
  { ticker: "BAC", name: "Bank of America", exchange: "NYSE", price: 38.42, changePct: -0.28, marketCap: "$302B", sector: "금융", pe: 12.4, roe: 10.8 },
  { ticker: "KO", name: "Coca-Cola Company", exchange: "NYSE", price: 62.18, changePct: 0.14, marketCap: "$268B", sector: "소비재", pe: 22.8, roe: 42.1 },
];

export const KR_STOCKS = [
  { ticker: "005930", name: "삼성전자", exchange: "KRX", price: 78400, changePct: 0.51, marketCap: "₩468조", sector: "반도체/전자", pe: 18.2, roe: 8.4 },
  { ticker: "000660", name: "SK하이닉스", exchange: "KRX", price: 198500, changePct: -1.24, marketCap: "₩144조", sector: "반도체", pe: 24.1, roe: 12.8 },
  { ticker: "373220", name: "LG에너지솔루션", exchange: "KRX", price: 362000, changePct: 0.83, marketCap: "₩165조", sector: "배터리", pe: 42.8, roe: 6.2 },
  { ticker: "207940", name: "삼성바이오로직스", exchange: "KRX", price: 821000, changePct: 1.42, marketCap: "₩58조", sector: "바이오", pe: 68.4, roe: 8.1 },
  { ticker: "035420", name: "NAVER", exchange: "KRX", price: 189400, changePct: -0.31, marketCap: "₩31조", sector: "IT/플랫폼", pe: 28.4, roe: 14.2 },
  { ticker: "005380", name: "현대차", exchange: "KRX", price: 241500, changePct: 2.11, marketCap: "₩51조", sector: "자동차", pe: 6.8, roe: 12.4 },
  { ticker: "051910", name: "LG화학", exchange: "KRX", price: 312000, changePct: -0.64, marketCap: "₩22조", sector: "화학/배터리", pe: 18.4, roe: 6.8 },
  { ticker: "068270", name: "셀트리온", exchange: "KRX", price: 168400, changePct: 0.84, marketCap: "₩22조", sector: "바이오", pe: 34.2, roe: 8.4 },
];

// Ticker → display name lookup. Tickers should only be visible on the
// stock detail page itself; everywhere else (calendar, news modal,
// bookmarks) we display the company name. Falls back to the ticker
// when the symbol isn't in our mock universe — UI should treat the
// fallback as "show the ticker" rather than blank.
export function tickerToName(ticker: string | null | undefined): string {
  if (!ticker) return "";
  const t = ticker.toUpperCase();
  const hit = US_STOCKS.find((s) => s.ticker === t) ?? KR_STOCKS.find((s) => s.ticker === t);
  return hit?.name ?? ticker;
}

export const MASTERS = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    firm: "Berkshire Hathaway",
    strategy: "가치",
    strategyDetail: "가치 · 장기보유",
    aum: "$320B",
    holdings: 47,
    lastFiling: "2026 Q1",
    cagr5y: 13.4,
    description: "오마하의 현인. 내재가치 대비 할인된 우량 기업을 장기 보유하는 가치투자의 대명사.",
    principles: [
      "이해할 수 있는 사업에만 투자한다",
      "경제적 해자가 있는 기업을 우선 검토한다",
      "정직하고 주주친화적인 경영진을 선호한다",
      "안전마진이 확보된 가격에서만 매수한다",
      "가장 좋아하는 보유 기간은 영원이다",
    ],
    topHoldings: [
      { ticker: "AAPL", name: "Apple", weight: 41.2, change: -2.1 },
      { ticker: "BAC", name: "Bank of America", weight: 9.8, change: 0 },
      { ticker: "AXP", name: "American Express", weight: 8.4, change: 0.4 },
      { ticker: "KO", name: "Coca-Cola", weight: 7.1, change: 0 },
      { ticker: "CVX", name: "Chevron", weight: 6.2, change: -1.8 },
      { ticker: "OXY", name: "Occidental", weight: 4.9, change: 1.2 },
    ],
    recentChanges: [
      { type: "신규", ticker: "CB", name: "Chubb" },
      { type: "증가", ticker: "OXY", detail: "+12%" },
      { type: "감소", ticker: "AAPL", detail: "-1%" },
      { type: "청산", ticker: "HPQ", name: "HP Inc." },
    ],
    quarterlyData: [
      { quarter: "2025 Q1", ticker: "AAPL", shares: "915M" },
      { quarter: "2025 Q2", ticker: "AAPL", shares: "905M" },
      { quarter: "2025 Q3", ticker: "AAPL", shares: "905M" },
      { quarter: "2025 Q4", ticker: "AAPL", shares: "300M" },
      { quarter: "2026 Q1", ticker: "AAPL", shares: "295M" },
    ],
  },
  {
    id: "ray-dalio",
    name: "Ray Dalio",
    firm: "Bridgewater Associates",
    strategy: "매크로",
    strategyDetail: "매크로 · 올웨더",
    aum: "$170B",
    holdings: 380,
    lastFiling: "2026 Q1",
    cagr5y: 7.8,
    description: "올웨더 포트폴리오 창시자. 경제 사이클과 매크로 분석을 통한 리스크 패리티 전략.",
    principles: [
      "모든 경제 환경에서 작동하는 포트폴리오를 구성한다",
      "상관관계가 낮은 자산으로 리스크를 분산한다",
      "경제 사이클의 4가지 국면을 이해하고 대응한다",
      "원칙에 기반한 의사결정으로 감정을 배제한다",
    ],
    topHoldings: [
      { ticker: "SPY", name: "S&P 500 ETF", weight: 18.4, change: 1.2 },
      { ticker: "GLD", name: "Gold ETF", weight: 12.8, change: 0.8 },
      { ticker: "TLT", name: "20Y Treasury", weight: 11.2, change: -0.4 },
      { ticker: "VWO", name: "Emerging Markets", weight: 8.4, change: 0.2 },
      { ticker: "IEF", name: "7-10Y Treasury", weight: 7.8, change: -0.2 },
    ],
    recentChanges: [
      { type: "증가", ticker: "GLD", detail: "+8%" },
      { type: "감소", ticker: "TLT", detail: "-5%" },
      { type: "신규", ticker: "IEMG", name: "EM ETF" },
    ],
  },
  {
    id: "cathie-wood",
    name: "Cathie Wood",
    firm: "ARK Invest",
    strategy: "혁신",
    strategyDetail: "파괴적 혁신",
    aum: "$13B",
    holdings: 36,
    lastFiling: "2026 Q1",
    cagr5y: -4.2,
    description: "파괴적 혁신 기업에 집중 투자. AI, 유전체학, 핀테크, 로봇공학 등 미래 기술 테마.",
    principles: [
      "5년 이상 장기 시계에서 파괴적 혁신을 평가한다",
      "단기 변동성을 기회로 활용해 비중을 확대한다",
      "컨버전스 — 여러 혁신이 교차하는 지점에 주목한다",
      "리서치를 공개해 투명성을 유지한다",
    ],
    topHoldings: [
      { ticker: "TSLA", name: "Tesla", weight: 14.2, change: -2.1 },
      { ticker: "COIN", name: "Coinbase", weight: 9.8, change: 1.4 },
      { ticker: "ROKU", name: "Roku", weight: 7.4, change: 0.8 },
      { ticker: "HOOD", name: "Robinhood", weight: 6.2, change: 2.1 },
      { ticker: "PLTR", name: "Palantir", weight: 5.8, change: 1.2 },
    ],
    recentChanges: [
      { type: "증가", ticker: "PLTR", detail: "+24%" },
      { type: "감소", ticker: "TSLA", detail: "-8%" },
      { type: "신규", ticker: "HOOD", name: "Robinhood" },
    ],
  },
  {
    id: "michael-burry",
    name: "Michael Burry",
    firm: "Scion Asset Management",
    strategy: "컨트래리언",
    strategyDetail: "컨트래리언 · 숏",
    aum: "$200M",
    holdings: 11,
    lastFiling: "2026 Q1",
    cagr5y: 9.1,
    description: "빅쇼트의 주인공. 역발상 투자와 숏 포지션으로 시장의 거품을 공략.",
    principles: [
      "군중과 반대 방향에서 기회를 찾는다",
      "철저한 바텀업 리서치로 숨겨진 가치를 발굴한다",
      "시장의 비효율성과 과잉 레버리지에 주목한다",
      "집중 포트폴리오로 확신 있는 아이디어에 베팅한다",
    ],
    topHoldings: [
      { ticker: "JD", name: "JD.com", weight: 22.4, change: 4.2 },
      { ticker: "BABA", name: "Alibaba", weight: 18.8, change: 2.8 },
      { ticker: "GOOG", name: "Alphabet", weight: 14.2, change: 0.6 },
      { ticker: "MGM", name: "MGM Resorts", weight: 12.4, change: -1.2 },
    ],
    recentChanges: [
      { type: "신규", ticker: "JD", name: "JD.com" },
      { type: "증가", ticker: "BABA", detail: "+40%" },
      { type: "청산", ticker: "AAPL", name: "Apple" },
    ],
  },
  {
    id: "peter-lynch",
    name: "Peter Lynch",
    firm: "Magellan Fund (전)",
    strategy: "성장",
    strategyDetail: "성장 · 생활속 발굴",
    aum: "—",
    holdings: 0,
    lastFiling: "히스토리",
    cagr5y: null,
    description: "마젤란 펀드 13년간 연평균 29% 수익. '10배 주식(텐배거)'과 생활 속 투자 아이디어 발굴의 대가.",
    principles: [
      "자신이 잘 아는 분야에서 투자 아이디어를 찾는다",
      "PEG 비율로 성장 대비 밸류에이션을 평가한다",
      "기업 스토리가 변하지 않는 한 보유를 유지한다",
      "분산투자보다 집중투자가 더 나은 결과를 낸다",
    ],
    topHoldings: [],
    recentChanges: [],
  },
  {
    id: "benjamin-graham",
    name: "Benjamin Graham",
    firm: "가치투자 원조",
    strategy: "정량가치",
    strategyDetail: "안전마진 · 정량",
    aum: "—",
    holdings: 0,
    lastFiling: "히스토리",
    cagr5y: null,
    description: "가치투자의 아버지. '현명한 투자자'와 '증권분석' 저자. 안전마진 개념의 창시자.",
    principles: [
      "내재가치보다 충분히 낮은 가격에서만 매수한다 (안전마진)",
      "시장을 Mr. Market으로 의인화해 감정적 반응을 피한다",
      "투자는 원금 보전과 적절한 수익을 목표로 한다",
      "정량적 기준으로 종목을 스크리닝한다",
    ],
    topHoldings: [],
    recentChanges: [],
  },
  {
    id: "charlie-munger",
    name: "Charlie Munger",
    firm: "Daily Journal Corp.",
    strategy: "멘탈모델",
    strategyDetail: "집중투자 · 멘탈모델",
    aum: "—",
    holdings: 0,
    lastFiling: "히스토리",
    cagr5y: null,
    description: "버핏의 파트너. 다학제적 사고와 멘탈 모델로 복잡한 투자 결정을 단순화.",
    principles: [
      "다양한 학문의 멘탈 모델을 투자에 적용한다",
      "역발상 — 실패를 피하는 방법을 먼저 생각한다",
      "좋은 기업을 적정 가격에 사는 것이 싼 기업을 싸게 사는 것보다 낫다",
      "인센티브 구조를 이해하면 행동을 예측할 수 있다",
    ],
    topHoldings: [],
    recentChanges: [],
  },
];

export const REPORTS = [
  // ── 2026-05-18 ──
  {
    id: "r001",
    title: "큐틴 아메리카 (미국주식 Weekly)",
    summary: "미국 주식 시장 주간 동향 요약. S&P500 상승세 지속, AI 섹터 강세 지속.",
    source: "키움증권",
    type: "Weekly",
    pages: 12,
    lang: "KO",
    region: "US",
    category: "리서치",
    tags: ["#미국주식", "#Weekly", "#S&P500"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r002",
    title: "[미국주식] Trump Showtime: AI 슈퍼사이클 모멘텀 & 확장될 리쇼어링",
    summary: "AI 인프라 투자 사이클 본격화. 데이터센터 전력소비 증가와 반도체 수혜 지속.",
    source: "하나증권",
    type: "Thematic",
    pages: 24,
    lang: "KO",
    region: "US",
    category: "리서치",
    tags: ["#AI", "#반도체", "#데이터센터"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r003",
    title: "미국주식 일일 동향",
    summary: "5월 17일 미국 주식 시장 마감. 나스닥 +0.72%, S&P500 +0.38% 상승.",
    source: "대신증권",
    type: "Daily",
    pages: 6,
    lang: "KO",
    region: "US",
    category: "리서치",
    tags: ["#시장동향", "#Daily"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r004",
    title: "[ATI (NYS:ATI)] 대체 불가능한 항공·방산 소재 플랫폼",
    summary: "ATI의 항공우주 소재 독점적 지위 분석. 방산 수요 증가로 수혜 전망. 목표주가 $65.",
    source: "신한투자증권",
    type: "종목분석",
    pages: 18,
    lang: "KO",
    region: "US",
    category: "산업",
    tickers: ["ATI"],
    rating: "매수",
    targetPrice: "$65",
    tags: ["#항공우주", "#방산", "#ATI"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r005",
    title: "[MP 머티리얼스 (NYS:MP)] 달라질 미래 체급에 베팅",
    summary: "희토류 소재 독점 공급자. 전기차·스마트폰 수요 증가로 장기 성장 기대. 목표주가 $28.",
    source: "신한투자증권",
    type: "종목분석",
    pages: 16,
    lang: "KO",
    region: "US",
    category: "산업",
    tickers: ["MP"],
    rating: "매수",
    targetPrice: "$28",
    tags: ["#희토류", "#전기차", "#MP"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r006",
    title: "DB Morning Express",
    summary: "오늘의 주요 시장 이슈 및 주목 종목 요약. 미국 시장 강세, 국내 시장 보합.",
    source: "DB증권",
    type: "Morning",
    pages: 8,
    lang: "KO",
    region: "KR",
    category: "리서치",
    tags: ["#시장동향", "#Morning"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r007",
    title: "[Multi Asset Strategy: 두각(頭角)]-미 10년 국채금리 4.6% VS 실질 정책금리 -0.06%",
    summary: "미국 장기금리 상승과 실질금리 경로 분석. 주식·채권 자산배분 전략 시사점.",
    source: "유안타증권",
    type: "Strategy",
    pages: 14,
    lang: "KO",
    region: "GLOBAL",
    category: "거시",
    tags: ["#금리", "#채권", "#자산배분"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r008",
    title: "미국 고용시장 통계 착시의 한계: 얼음장 밑의 균열",
    summary: "BLS 실업률 데이터 해석 주의. 실제 노동시장 상황은 헤드라인 대비 약화 진행 중.",
    source: "유안타증권",
    type: "Macro",
    pages: 10,
    lang: "KO",
    region: "US",
    category: "거시",
    tags: ["#고용", "#노동시장", "#연준"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r009",
    title: "[HANA US Weekly] 트럼프는 AI를 밀어줄 수 밖에 없습니다",
    summary: "AI 인프라 투자 정책 불가. 트럼프 행정부 AI 정책 방향성 분석.",
    source: "하나증권",
    type: "Weekly",
    pages: 16,
    lang: "KO",
    region: "US",
    category: "리서치",
    tags: ["#AI", "#미국정치", "#투자전략"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  {
    id: "r010",
    title: "Global Market Insight",
    summary: "글로벌 주요 시장 주간 동향 요약. 미국·유럽·아시아 시장 종합 분석.",
    source: "키움증권",
    type: "Weekly",
    pages: 20,
    lang: "KO",
    region: "GLOBAL",
    category: "리서치",
    tags: ["#글로벌", "#주식시장", "#Weekly"],
    date: "2026.05.18",
    status: "AI 요약",
  },
  // ── 2026-05-17 ──
  {
    id: "r011",
    title: "[삼성전자 (005930)] HBM4 양산 일정 확인 - 반도체 사이클 상승 가속화",
    summary: "HBM4 양산 시작 확인. 2026년 메모리 실적 회복 기대. 목표주가 90,000원.",
    source: "삼성증권",
    type: "종목분석",
    pages: 22,
    lang: "KO",
    region: "KR",
    category: "산업",
    tickers: ["005930"],
    rating: "매수",
    targetPrice: "90,000",
    tags: ["#삼성전자", "#HBM", "#반도체"],
    date: "2026.05.17",
    status: "AI 요약",
  },
  {
    id: "r012",
    title: "NVDA Q1 FY2027 실적 분석 - 데이터센터 수요 사상 최대",
    summary: "NVDA Q1 매출 $44.1B, 예상치 대폭 상회. H100/H200 수요 공급 부족 지속.",
    source: "리틀리지연구소",
    type: "실적분석",
    pages: 14,
    lang: "KO",
    region: "US",
    category: "산업",
    tickers: ["NVDA"],
    rating: "매수",
    targetPrice: "$1,200",
    tags: ["#NVDA", "#AI", "#실적"],
    date: "2026.05.17",
    status: "AI 요약",
  },
  {
    id: "r013",
    title: "한국 기준금리 인하 시점 분석",
    summary: "한은 다음 금통위 인하 가능성 평가. 물가 안정화 신호 증가.",
    source: "미래에셋자산운용",
    type: "Macro",
    pages: 10,
    lang: "KO",
    region: "KR",
    category: "거시",
    tags: ["#금리", "#한은", "#통화정책"],
    date: "2026.05.17",
    status: "AI 요약",
  },
  {
    id: "r014",
    title: "Berkshire Hathaway Q1 2026 13F-HR",
    summary: "AAPL 비중 추가 축소, OXY 신규 매수 350M. 현금 비중 사상 최고.",
    source: "SEC EDGAR",
    type: "13F-HR",
    pages: 32,
    lang: "EN",
    region: "US",
    category: "13F",
    tags: ["#Buffett", "#13F", "#대형주"],
    date: "2026.05.15",
    status: "AI 요약",
  },
  {
    id: "r015",
    title: "[SK하이닉스 (000660)] HBM3E 출하 확대 - 엑스포저 최대 편입",
    summary: "HBM3E 16단 양산 시작. NVIDIA 향산 비중 증가. 목표주가 240,000원.",
    source: "KB증권",
    type: "종목분석",
    pages: 20,
    lang: "KO",
    region: "KR",
    category: "산업",
    tickers: ["000660"],
    rating: "매수",
    targetPrice: "240,000",
    tags: ["#SK하이닉스", "#HBM", "#반도체"],
    date: "2026.05.16",
    status: "AI 요약",
  },
  // ── 기존 데이터 유지 ──
  {
    id: "1",
    title: "2025년 9월 통화신용정책보고서",
    summary: "물가 안정세 지속, 가계부채 점진적 둔화. 기준금리 동결 시사.",
    source: "한국은행",
    type: "통화신용정책보고서",
    pages: 124,
    lang: "KO",
    region: "KR",
    category: "거시",
    tags: ["#금리", "#부동산", "#가계부채"],
    date: "2025.09.26",
    status: "AI 요약",
  },
];


export const LEARN_CATEGORIES = [
  { id: "financial-statements", title: "재무제표 읽는 법", count: 12, desc: "손익계산서·재무상태표·현금흐름표를 한 번에 연결" },
  { id: "technical-analysis", title: "기술적 분석 입문", count: 18, desc: "추세·거래량·변동성을 신호가 아니라 확률로 해석" },
  { id: "value-investing", title: "가치투자 기초", count: 9, desc: "안전마진과 이익의 질을 동시에 점검" },
  { id: "quant-factors", title: "퀀트 팩터 입문", count: 14, desc: "가치·모멘텀·퀄리티 팩터를 규칙으로 비교" },
  { id: "options-derivatives", title: "옵션·파생", count: 8, desc: "레버리지 상품의 손익 구조와 위험 한도 이해" },
  { id: "macro-rates", title: "매크로·금리", count: 6, desc: "금리·물가·환율이 밸류에이션과 섹터에 주는 영향" },
];

export const LEARN_GUIDES = [
  { id: "1", title: "DCF 모델, 가정 5개로 끝내기", desc: "매출 성장률, 마진, 재투자, WACC, 터미널 성장률만으로 보수적 가치를 잡습니다.", category: "재무", readTime: 15 },
  { id: "2", title: "골든크로스, 정말 작동할까? 백테스트", desc: "단순 이동평균 신호를 시장 국면별로 나눠 해석합니다.", category: "기술", readTime: 8 },
  { id: "3", title: "Graham의 Net-Net 종목 찾기", desc: "유동자산 기반 안전마진 스크리닝을 실전 후보군으로 연결합니다.", category: "가치", readTime: 12 },
  { id: "4", title: "ROE 분해 - DuPont 5단계", desc: "ROE를 마진, 회전율, 레버리지로 분해해 지속성을 봅니다.", category: "재무", readTime: 10 },
  { id: "5", title: "순이익보다 현금흐름을 먼저 보는 이유", desc: "이익은 나는데 현금이 안 들어오는 기업을 운전자본과 투자현금흐름으로 걸러냅니다.", category: "재무", readTime: 11 },
  { id: "6", title: "초보 투자자의 포지션 크기 정하기", desc: "확신이 아니라 손실 허용폭을 기준으로 종목 비중과 추가매수 한도를 정합니다.", category: "리스크", readTime: 9 },
  { id: "7", title: "금리 사이클이 성장주와 배당주에 미치는 영향", desc: "할인율 변화가 장기 성장 현금흐름과 고배당 자산의 상대 매력을 어떻게 바꾸는지 봅니다.", category: "매크로", readTime: 13 },
  { id: "8", title: "가치·모멘텀·퀄리티 팩터를 같이 쓰는 법", desc: "단일 팩터 쏠림을 줄이고 서로 다른 시장 국면에서 버틸 수 있는 스코어를 만듭니다.", category: "퀀트", readTime: 14 },
];

export const SECTOR_ROTATION = [
  { sector: "IT", return1m: 4.2, return3m: 12.8, return1y: 28.4 },
  { sector: "반도체", return1m: 6.8, return3m: 18.4, return1y: 42.1 },
  { sector: "커뮤니케이션", return1m: 2.1, return3m: 6.4, return1y: 18.2 },
  { sector: "금융", return1m: 0.4, return3m: 2.8, return1y: 12.4 },
  { sector: "헬스케어", return1m: -1.2, return3m: -2.4, return1y: 4.8 },
  { sector: "에너지", return1m: -3.4, return3m: -8.2, return1y: -12.4 },
  { sector: "유틸리티", return1m: -0.8, return3m: 1.2, return1y: 6.8 },
  { sector: "소비재", return1m: 1.8, return3m: 4.2, return1y: 14.2 },
];

export const TECHNICAL_SIGNALS = [
  { ticker: "NVDA", signal: "골든크로스 (MA20/60)", time: "오늘 09:42", type: "bullish" },
  { ticker: "AAPL", signal: "RSI 과매수 (78)", time: "오늘 11:15", type: "warning" },
  { ticker: "005930", signal: "거래량 +320% 급증", time: "어제", type: "bullish" },
  { ticker: "TSLA", signal: "MACD 데드크로스", time: "5/04", type: "bearish" },
  { ticker: "000660", signal: "52주 신저가", time: "5/03", type: "bearish" },
  { ticker: "META", signal: "볼린저밴드 상단 돌파", time: "오늘 14:22", type: "bullish" },
];

export const MARKET_NEWS = [
  {
    id: 1,
    title: "연준 위원, \"9월 인하 가능성 열어둘 것\"",
    source: "Bloomberg",
    time: "12분",
    category: "매크로",
    tickers: ["QQQ", "SPY"],
    impact: "+0.18%",
  },
  {
    id: 2,
    title: "코스피 외인 순매수 5거래일 연속, 반도체 주도",
    source: "한국경제",
    time: "34분",
    category: "한국",
    tickers: ["005930", "000660"],
    impact: "+0.32%",
  },
  {
    id: 3,
    title: "엔비디아 추론 칩 발표 후 AI 반도체 일제 상승",
    source: "Reuters",
    time: "1시간",
    category: "미국",
    tickers: ["NVDA", "AMD", "TSM"],
    impact: "+0.42%",
  },
  {
    id: 4,
    title: "국제유가 WTI 72달러 회복, OPEC+ 감산 연장 관측",
    source: "WSJ",
    time: "2시간",
    category: "매크로",
    tickers: ["XOM", "CVX"],
    impact: null,
  },
  {
    id: 5,
    title: "원/달러 1,387원 하락 마감, 위험선호 회복",
    source: "연합뉴스",
    time: "3시간",
    category: "한국",
    tickers: ["005930"],
    impact: "+0.05%",
  },
];

export const CALENDAR_EVENTS = [
  { date: "06", day: "화", title: "미 무역수지", type: "매크로", holding: null, memo: 0 },
  { date: "07", day: "수", title: "NVDA 실적 (장마감 후)", type: "실적", holding: "12.4%", memo: 9 },
  { date: "08", day: "목", title: "AAPL 분기 배당락", type: "배당", holding: "9.1%", memo: 4 },
  { date: "08", day: "목", title: "FOMC 회의록", type: "매크로", holding: null, memo: 0 },
  { date: "13", day: "화", title: "AAPL WWDC", type: "실적", holding: "9.1%", memo: 4 },
  { date: "15", day: "목", title: "미 CPI", type: "매크로", holding: null, memo: 0 },
  { date: "22", day: "목", title: "005930 잠정실적", type: "실적", holding: "18.2%", memo: 6 },
];

export const PORTFOLIO_HOLDINGS = [
  { ticker: "005930", name: "삼성전자", weight: 18.2, changePct: 0.51, value: "₩877만" },
  { ticker: "NVDA", name: "NVIDIA", weight: 12.4, changePct: 3.42, value: "₩598만" },
  { ticker: "AAPL", name: "Apple", weight: 9.1, changePct: 1.24, value: "₩439만" },
  { ticker: "000660", name: "SK하이닉스", weight: 7.6, changePct: -1.24, value: "₩366만" },
  { ticker: "QQQ", name: "Invesco QQQ", weight: 6.8, changePct: 0.42, value: "₩328만" },
];

export const PORTFOLIO_ALLOCATION = [
  { label: "한국주식", pct: 42, value: "₩2,024만", color: "#38BDF8" },
  { label: "미국주식", pct: 31, value: "₩1,494만", color: "#A78BFA" },
  { label: "ETF", pct: 14, value: "₩675만", color: "#FBBF24" },
  { label: "채권", pct: 8, value: "₩386만", color: "#34D399" },
  { label: "현금", pct: 5, value: "₩241만", color: "#94A3B8" },
];

// Generate sparkline data
export function generateSparkline(points = 20, trend: "up" | "down" | "flat" = "up") {
  const data = [];
  let value = 100;
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * 4;
    const drift = trend === "up" ? 0.5 : trend === "down" ? -0.5 : 0;
    value += noise + drift;
    data.push({ v: Math.max(80, Math.min(130, value)) });
  }
  return data;
}

// Generate chart data for portfolio performance
export function generatePortfolioChart(days = 30) {
  const data = [];
  let portfolio = 100;
  let kospi = 100;
  let sp500 = 100;
  for (let i = 0; i < days; i++) {
    portfolio += (Math.random() - 0.42) * 2.5;
    kospi += (Math.random() - 0.46) * 1.8;
    sp500 += (Math.random() - 0.44) * 2.0;
    data.push({
      day: i + 1,
      portfolio: Math.max(85, portfolio),
      kospi: Math.max(85, kospi),
      sp500: Math.max(85, sp500),
    });
  }
  return data;
}
