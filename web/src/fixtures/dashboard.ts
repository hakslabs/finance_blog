// Static typed fixtures for the dashboard route.
// Derived from design/wires-v3/wire-home.jsx; no network calls.

// ── Types ───────────────────────────────────────────────────────────────────

export type MacroIndicator = {
  id: string;
  label: string;
  localName: string;
  market: "KR" | "US" | "GLOBAL";
  value: string;
  change: string;
  up: boolean;
  detail: string;
  history: number[];
};

export type WatchlistItem = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  maTrend: "up" | "down" | "neutral";
  rsi: number;
  memoCount: number;
  nextEvent: string;
  status: "held" | "review" | "excluded" | "candidate" | "watching";
};

export type TopMover = {
  rank: number;
  symbol: string;
  name: string;
  market: "KR" | "US";
  price: string;
  change: string;
  up: boolean;
  volume: string;
};

export type NewsCategory = "kr" | "us" | "macro";

export type NewsItem = {
  id: string;
  source: string;
  title: string;
  timeAgo: string;
  category: NewsCategory;
  relatedSymbols: string[];
  portfolioImpact: string;
  hasMyNote: boolean;
};

export type EventType = "macro" | "earnings" | "dividend";

export type EconomicEvent = {
  id: string;
  dateLabel: string;
  dayOfWeek: string;
  event: string;
  type: EventType;
  importance: 1 | 2 | 3;
  heldWeight: string | null;
  memoCount: number;
  checklistProgress: string | null;
};

export type TodoSource = "공통" | "알람" | "Thesis";

export type TodoItem = {
  id: string;
  done: boolean;
  task: string;
  meta: string;
  category: string;
  source: TodoSource;
};

export type FearGreedData = {
  id: string;
  market: string;
  marketCode: "KR" | "US";
  value: number;
  label: string;
  subtext: string;
  drivers: string[];
  history: number[];
};

export type PortfolioAsset = {
  label: string;
  percent: number;
  color: string;
  amount: string;
};

export type TopHolding = {
  symbol: string;
  name: string;
  weight: number;
  change: string;
  up: boolean;
};

export type ReturnContributor = {
  symbol: string;
  name: string;
  contribution: string;
  up: boolean;
  reason: string;
};

export type Notice = {
  tag: string;
  title: string;
  description: string;
  date: string;
};

export type PortfolioSummary = {
  totalAssets: string;
  totalAssetsShort: string;
  todayPnl: string;
  todayPnlPercent: string;
  totalReturn: string;
};

export type MarketStatus = {
  date: string;
  day: string;
  time: string;
  krxOpen: boolean;
  nyseOpensIn: string;
};

export type ReturnSeries = {
  period: string;
  portfolioReturn: string;
  kospiReturn: string;
  sp500Return: string;
  contributors: ReturnContributor[];
  learningPoint: string;
};

// ── Fixtures ───────────────────────────────────────────────────────────────

export const GREETING_NAME = "Hak Lee";

export const PORTFOLIO_SUMMARY: PortfolioSummary = {
  totalAssets: "₩ 48,210,400",
  totalAssetsShort: "4,821만",
  todayPnl: "+₩ 184,320",
  todayPnlPercent: "+0.38%",
  totalReturn: "+12.4%",
};

export const MARKET_STATUS: MarketStatus = {
  date: "5월 6일",
  day: "화",
  time: "화 14:32",
  krxOpen: true,
  nyseOpensIn: "6시간 28분",
};

export const NOTICE: Notice = {
  tag: "공지사항",
  title: "v3 출시 — 마이페이지 · Thesis 도입",
  description:
    "매수 시점 thesis와 알람 반응 메모로 복기 흐름이 자연스러워졌습니다.",
  date: "2026-05-10",
};

export const TODOS: TodoItem[] = [
  {
    id: "todo-nvda-pre-earnings",
    done: true,
    task: "NVDA 실적 발표 전 메모 업데이트",
    meta: "D-1 · 보유 12.4%",
    category: "실적",
    source: "공통",
  },
  {
    id: "todo-samsung-foreign",
    done: false,
    task: "삼성전자 외인 순매수 원인 확인",
    meta: "5거래일 연속",
    category: "뉴스",
    source: "공통",
  },
  {
    id: "todo-aapl-dividend",
    done: false,
    task: "AAPL 배당락 전 포지션 점검",
    meta: "D-2 · 보유 9.1%",
    category: "배당",
    source: "공통",
  },
  {
    id: "todo-nvda-thesis-review",
    done: false,
    task: "NVDA −12% — Thesis 청산 조건 검토",
    meta: "알람 트리거 · 반응 메모",
    category: "복기",
    source: "Thesis",
  },
  {
    id: "todo-tsla-alarm",
    done: false,
    task: "TSLA +20% 도달 — 왜 움직였나 기록",
    meta: "알람 트리거 · 미작성",
    category: "복기",
    source: "알람",
  },
];

export const FEAR_GREED: FearGreedData[] = [
  {
    id: "fg-kr",
    market: "한국",
    marketCode: "KR",
    value: 56,
    label: "Neutral",
    subtext: "외인 5거래일 순매수",
    drivers: ["외국인 코스피 5거래일 순매수", "반도체 대형주 거래대금 증가", "원/달러 하락으로 위험선호 회복"],
    history: [44, 48, 51, 53, 56],
  },
  {
    id: "fg-us",
    market: "미국",
    marketCode: "US",
    value: 68,
    label: "Greed",
    subtext: "VIX 14.2 · 안도 과열",
    drivers: ["VIX 14선으로 변동성 완화", "대형 기술주 신고가 비중 확대", "하이일드 스프레드 안정"],
    history: [57, 61, 65, 66, 68],
  },
];

export const MACRO_INDICATORS: MacroIndicator[] = [
  { id: "macro-kospi", label: "KOSPI", localName: "코스피", market: "KR", value: "2,684.32", change: "+0.69%", up: true, detail: "한국 주식시장 대표 지수입니다. 보유 한국 주식의 당일 방향성을 볼 때 우선 확인합니다.", history: [47, 49, 50, 52, 55, 58] },
  { id: "macro-sp500", label: "S&P 500", localName: "미국", market: "US", value: "5,812.44", change: "+0.38%", up: true, detail: "미국 대형주 대표 지수입니다. 글로벌 위험선호와 성장주 분위기를 함께 봅니다.", history: [51, 52, 54, 55, 57, 59] },
  { id: "macro-usdkrw", label: "USD/KRW", localName: "원/달러", market: "KR", value: "1,387.20", change: "−0.22%", up: false, detail: "원화 환율입니다. 해외주식 환산손익과 외국인 수급에 영향을 줍니다.", history: [64, 63, 61, 60, 58, 56] },
  { id: "macro-wti", label: "WTI", localName: "국제유가", market: "GLOBAL", value: "$71.84", change: "+0.59%", up: true, detail: "국제유가입니다. 에너지, 운송, 물가 기대 흐름을 함께 점검합니다.", history: [46, 45, 48, 49, 50, 53] },
  { id: "macro-gold", label: "GOLD", localName: "금", market: "GLOBAL", value: "$2,318.4", change: "+0.41%", up: true, detail: "금 가격입니다. 안전자산 선호와 실질금리 부담을 확인하는 보조 지표입니다.", history: [54, 55, 56, 56, 57, 58] },
  { id: "macro-btc", label: "BTC", localName: "비트코인", market: "GLOBAL", value: "$61,240", change: "−1.32%", up: false, detail: "고위험 자산 선호를 빠르게 보여주는 지표입니다. 주식시장 심리와 함께 봅니다.", history: [68, 66, 64, 62, 60, 57] },
];

export const WATCHLIST: WatchlistItem[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    price: "184.32",
    change: "+1.24%",
    up: true,
    maTrend: "up",
    rsi: 62,
    memoCount: 4,
    nextEvent: "배당락 D-2",
    status: "held",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    price: "912.18",
    change: "+3.42%",
    up: true,
    maTrend: "up",
    rsi: 78,
    memoCount: 9,
    nextEvent: "실적 D-1",
    status: "review",
  },
  {
    symbol: "005930",
    name: "삼성전자",
    price: "78,400",
    change: "+0.51%",
    up: true,
    maTrend: "neutral",
    rsi: 51,
    memoCount: 6,
    nextEvent: "잠정실적 D-16",
    status: "held",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    price: "218.40",
    change: "−2.10%",
    up: false,
    maTrend: "down",
    rsi: 38,
    memoCount: 3,
    nextEvent: "—",
    status: "excluded",
  },
  {
    symbol: "000660",
    name: "SK하이닉스",
    price: "198,500",
    change: "−1.24%",
    up: false,
    maTrend: "up",
    rsi: 28,
    memoCount: 2,
    nextEvent: "—",
    status: "candidate",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    price: "424.10",
    change: "+0.82%",
    up: true,
    maTrend: "up",
    rsi: 58,
    memoCount: 0,
    nextEvent: "—",
    status: "watching",
  },
];

export const TOP_MOVERS_KR: TopMover[] = [
  { rank: 1, symbol: "005930", name: "삼성전자", market: "KR", price: "78,400", change: "+0.51%", up: true, volume: "8.2M" },
  { rank: 2, symbol: "000660", name: "SK하이닉스", market: "KR", price: "198,500", change: "−1.24%", up: false, volume: "3.1M" },
  { rank: 3, symbol: "373220", name: "LG엔솔", market: "KR", price: "362,000", change: "+0.83%", up: true, volume: "0.4M" },
  { rank: 4, symbol: "207940", name: "삼성바이오", market: "KR", price: "821,000", change: "+1.42%", up: true, volume: "0.2M" },
  { rank: 5, symbol: "035420", name: "NAVER", market: "KR", price: "189,400", change: "−0.31%", up: false, volume: "0.9M" },
  { rank: 6, symbol: "005380", name: "현대차", market: "KR", price: "241,500", change: "+2.11%", up: true, volume: "1.2M" },
];

export const TOP_MOVERS_US: TopMover[] = [
  { rank: 1, symbol: "NVDA", name: "NVIDIA", market: "US", price: "912.18", change: "+3.42%", up: true, volume: "42.1M" },
  { rank: 2, symbol: "TSLA", name: "Tesla", market: "US", price: "218.40", change: "−2.10%", up: false, volume: "38.4M" },
  { rank: 3, symbol: "AAPL", name: "Apple", market: "US", price: "184.32", change: "+1.24%", up: true, volume: "31.9M" },
  { rank: 4, symbol: "AMD", name: "AMD", market: "US", price: "156.71", change: "+2.08%", up: true, volume: "29.7M" },
  { rank: 5, symbol: "MSFT", name: "Microsoft", market: "US", price: "424.10", change: "+0.82%", up: true, volume: "18.5M" },
  { rank: 6, symbol: "AMZN", name: "Amazon", market: "US", price: "184.06", change: "−0.44%", up: false, volume: "16.8M" },
];

export const TOP_MOVERS = TOP_MOVERS_KR;

export const NEWS: NewsItem[] = [
  {
    id: "news-fed-sep-cut",
    source: "Bloomberg",
    title: '연준 위원, "9월 인하 가능성 열어둘 것"',
    timeAgo: "12분",
    category: "macro",
    relatedSymbols: ["QQQ", "SPY"],
    portfolioImpact: "+0.18%",
    hasMyNote: false,
  },
  {
    id: "news-kospi-foreign-5d",
    source: "한국경제",
    title: "코스피 외인 순매수 5거래일 연속, 반도체 주도",
    timeAgo: "34분",
    category: "kr",
    relatedSymbols: ["005930", "000660"],
    portfolioImpact: "+0.32%",
    hasMyNote: true,
  },
  {
    id: "news-nvda-inference-chip",
    source: "Reuters",
    title: "엔비디아 추론 칩 발표 후 AI 반도체 일제 상승",
    timeAgo: "1시간",
    category: "us",
    relatedSymbols: ["NVDA", "AMD", "TSM"],
    portfolioImpact: "+0.42%",
    hasMyNote: false,
  },
  {
    id: "news-wti-72",
    source: "WSJ",
    title: "국제유가 WTI 72달러 회복, OPEC+ 감산 연장 관측",
    timeAgo: "2시간",
    category: "macro",
    relatedSymbols: ["XOM", "CVX"],
    portfolioImpact: "—",
    hasMyNote: false,
  },
  {
    id: "news-usdkrw-1387",
    source: "연합뉴스",
    title: "원/달러 1,387원 하락 마감, 위험선호 회복",
    timeAgo: "3시간",
    category: "kr",
    relatedSymbols: ["005930"],
    portfolioImpact: "+0.05%",
    hasMyNote: false,
  },
];

export const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: "event-us-trade-0506",
    dateLabel: "5/06",
    dayOfWeek: "화",
    event: "미 무역수지",
    type: "macro",
    importance: 2,
    heldWeight: null,
    memoCount: 0,
    checklistProgress: null,
  },
  {
    id: "event-nvda-earnings-0507",
    dateLabel: "5/07",
    dayOfWeek: "수",
    event: "NVDA 실적 (장마감 후)",
    type: "earnings",
    importance: 3,
    heldWeight: "12.4%",
    memoCount: 9,
    checklistProgress: "2/4",
  },
  {
    id: "event-aapl-div-0508",
    dateLabel: "5/08",
    dayOfWeek: "목",
    event: "AAPL 분기 배당락",
    type: "dividend",
    importance: 2,
    heldWeight: "9.1%",
    memoCount: 4,
    checklistProgress: null,
  },
  {
    id: "event-fomc-minutes-0508",
    dateLabel: "5/08",
    dayOfWeek: "목",
    event: "FOMC 회의록",
    type: "macro",
    importance: 3,
    heldWeight: null,
    memoCount: 0,
    checklistProgress: null,
  },
  {
    id: "event-wwdc-0513",
    dateLabel: "5/13",
    dayOfWeek: "화",
    event: "AAPL WWDC",
    type: "earnings",
    importance: 2,
    heldWeight: "9.1%",
    memoCount: 4,
    checklistProgress: null,
  },
  {
    id: "event-us-cpi-0515",
    dateLabel: "5/15",
    dayOfWeek: "목",
    event: "미 CPI",
    type: "macro",
    importance: 3,
    heldWeight: null,
    memoCount: 0,
    checklistProgress: null,
  },
  {
    id: "event-samsung-pre-0522",
    dateLabel: "5/22",
    dayOfWeek: "목",
    event: "005930 잠정실적",
    type: "earnings",
    importance: 3,
    heldWeight: "18.2%",
    memoCount: 6,
    checklistProgress: null,
  },
];

export const RETURN_DATA: ReturnSeries = {
  period: "3M",
  portfolioReturn: "+12.4%",
  kospiReturn: "+4.1%",
  sp500Return: "+8.2%",
  contributors: [
    { symbol: "NVDA", name: "NVIDIA", contribution: "+2.1%p", up: true, reason: "AI 인프라 수요 지속" },
    { symbol: "005930", name: "삼성전자", contribution: "+0.8%p", up: true, reason: "HBM 모멘텀" },
    { symbol: "TSLA", name: "Tesla", contribution: "−0.4%p", up: false, reason: "Cybertruck 양산 지연" },
  ],
  learningPoint:
    "AI 섹터 집중도가 수익률을 끌어올렸지만, 반도체 비중이 높아 변동성 리스크가 함께 커졌습니다.",
};

export const PORTFOLIO_COMPOSITION: PortfolioAsset[] = [
  { label: "한국주식", percent: 42, color: "#2c6fa5", amount: "2,024만" },
  { label: "미국주식", percent: 31, color: "#a55b2c", amount: "1,494만" },
  { label: "ETF", percent: 14, color: "#2a6fdb", amount: "675만" },
  { label: "채권", percent: 8, color: "#7aa84a", amount: "386만" },
  { label: "현금", percent: 5, color: "#9da1a5", amount: "241만" },
];

export const TOP_HOLDINGS: TopHolding[] = [
  { symbol: "005930", name: "삼성전자", weight: 18.2, change: "+0.51%", up: true },
  { symbol: "NVDA", name: "NVIDIA", weight: 12.4, change: "+3.42%", up: true },
  { symbol: "AAPL", name: "Apple", weight: 9.1, change: "+1.24%", up: true },
  { symbol: "000660", name: "SK하이닉스", weight: 7.6, change: "−1.24%", up: false },
  { symbol: "QQQ", name: "Invesco QQQ", weight: 6.8, change: "+0.42%", up: true },
];
