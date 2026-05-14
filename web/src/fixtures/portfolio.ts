// Static typed fixtures for the portfolio route.
// Derived from design/wires-v3/wire-portfolio.jsx; no network calls.

// ── Types ───────────────────────────────────────────────────────────────────

export type PortfolioKpi = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  positive?: boolean;
};

export type HoldingMemoStatus = "locked" | "memo" | "none";

export type Holding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: string;
  currentPrice: string;
  marketValue: string;
  pnlPercent: string;
  up: boolean;
  weight: number;
  memoStatus: HoldingMemoStatus;
  memoCount: number;
  tradeCount: number;
  reviewCount: number;
  thesis: string | null;
};

export type TransactionType = "buy" | "sell" | "dividend" | "deposit";

export type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  symbol: string;
  quantity: number | null;
  price: string | null;
  amount: string;
  currency: "USD" | "KRW";
  note: string;
};

export type Benchmark = {
  id: string;
  label: string;
  return: string;
};

export type PerformanceMetric = {
  id: string;
  label: string;
  value: string;
  positive?: boolean;
};

// ── Fixtures ───────────────────────────────────────────────────────────────

export const PORTFOLIO_KPI: PortfolioKpi[] = [
  { id: "kpi-total-value", label: "총 평가금액", value: "\u20A9 48,210,400" },
  { id: "kpi-principal", label: "투자원금", value: "\u20A9 42,890,000" },
  { id: "kpi-unrealized-pnl", label: "평가손익", value: "+\u20A9 5,320,400", detail: "+12.4%", positive: true },
  { id: "kpi-today-pnl", label: "오늘 손익", value: "+\u20A9 184,320", detail: "+0.38%", positive: true },
  { id: "kpi-realized-ytd", label: "실현손익 (YTD)", value: "+\u20A9 1,840,000", positive: true },
  { id: "kpi-cagr", label: "연환산 수익률", value: "+18.2%", detail: "CAGR", positive: true },
];

export const HOLDINGS: Holding[] = [
  {
    id: "hold-aapl",
    symbol: "AAPL",
    name: "Apple",
    quantity: 40,
    averagePrice: "152.00",
    currentPrice: "184.32",
    marketValue: "$7,372",
    pnlPercent: "+21.3%",
    up: true,
    weight: 18.4,
    memoStatus: "locked",
    memoCount: 2,
    tradeCount: 3,
    reviewCount: 1,
    thesis: "AI 디바이스 사이클 + 서비스 매출 확장",
  },
  {
    id: "hold-nvda",
    symbol: "NVDA",
    name: "NVIDIA",
    quantity: 12,
    averagePrice: "420.00",
    currentPrice: "912.18",
    marketValue: "$10,946",
    pnlPercent: "+117.2%",
    up: true,
    weight: 27.3,
    memoStatus: "locked",
    memoCount: 5,
    tradeCount: 2,
    reviewCount: 2,
    thesis: "AI 인프라 수요 지속 \u00B7 DC 매출 YoY+200%",
  },
  {
    id: "hold-msft",
    symbol: "MSFT",
    name: "Microsoft",
    quantity: 18,
    averagePrice: "380.00",
    currentPrice: "424.10",
    marketValue: "$7,634",
    pnlPercent: "+11.6%",
    up: true,
    weight: 19.1,
    memoStatus: "memo",
    memoCount: 1,
    tradeCount: 1,
    reviewCount: 0,
    thesis: null,
  },
  {
    id: "hold-005930",
    symbol: "005930",
    name: "삼성전자",
    quantity: 80,
    averagePrice: "72,400",
    currentPrice: "78,400",
    marketValue: "\u20A96,272,000",
    pnlPercent: "+8.3%",
    up: true,
    weight: 12.4,
    memoStatus: "none",
    memoCount: 0,
    tradeCount: 1,
    reviewCount: 0,
    thesis: null,
  },
  {
    id: "hold-tsla",
    symbol: "TSLA",
    name: "Tesla",
    quantity: 22,
    averagePrice: "245.00",
    currentPrice: "218.40",
    marketValue: "$4,805",
    pnlPercent: "\u221210.9%",
    up: false,
    weight: 12.0,
    memoStatus: "locked",
    memoCount: 3,
    tradeCount: 4,
    reviewCount: 1,
    thesis: "FSD v13 + 에너지 부문 마진 개선",
  },
  {
    id: "hold-000660",
    symbol: "000660",
    name: "SK하이닉스",
    quantity: 25,
    averagePrice: "210,000",
    currentPrice: "198,500",
    marketValue: "\u20A94,962,500",
    pnlPercent: "\u22125.5%",
    up: false,
    weight: 10.8,
    memoStatus: "none",
    memoCount: 0,
    tradeCount: 1,
    reviewCount: 0,
    thesis: null,
  },
];

export const TRANSACTIONS: Transaction[] = [
  {
    id: "tx-001",
    date: "2026-05-02",
    type: "buy",
    symbol: "NVDA",
    quantity: 5,
    price: "$895.20",
    amount: "$4,476.00",
    currency: "USD",
    note: "리밸런싱",
  },
  {
    id: "tx-002",
    date: "2026-04-28",
    type: "sell",
    symbol: "TSLA",
    quantity: 8,
    price: "$220.10",
    amount: "$1,760.80",
    currency: "USD",
    note: "손절",
  },
  {
    id: "tx-003",
    date: "2026-04-15",
    type: "dividend",
    symbol: "AAPL",
    quantity: 40,
    price: "$0.24",
    amount: "$9.60",
    currency: "USD",
    note: "",
  },
  {
    id: "tx-004",
    date: "2026-04-02",
    type: "buy",
    symbol: "005930",
    quantity: 30,
    price: "\u20A978,200",
    amount: "\u20A92,346,000",
    currency: "KRW",
    note: "저평가",
  },
  {
    id: "tx-005",
    date: "2026-03-20",
    type: "deposit",
    symbol: "\u2014",
    quantity: null,
    price: null,
    amount: "\u20A92,000,000",
    currency: "KRW",
    note: "월급",
  },
  {
    id: "tx-006",
    date: "2026-03-15",
    type: "buy",
    symbol: "MSFT",
    quantity: 5,
    price: "$418.50",
    amount: "$2,092.50",
    currency: "USD",
    note: "",
  },
  {
    id: "tx-007",
    date: "2026-02-15",
    type: "buy",
    symbol: "NVDA",
    quantity: 5,
    price: "$810.00",
    amount: "$4,050.00",
    currency: "USD",
    note: "추가매수",
  },
  {
    id: "tx-008",
    date: "2026-02-08",
    type: "sell",
    symbol: "000660",
    quantity: 10,
    price: "\u20A9205,000",
    amount: "\u20A92,050,000",
    currency: "KRW",
    note: "비중조절",
  },
];

export const BENCHMARKS: Benchmark[] = [
  { id: "bench-portfolio", label: "내 포트폴리오", return: "+12.4%" },
  { id: "bench-kospi", label: "KOSPI", return: "+4.1%" },
  { id: "bench-sp500", label: "S&P 500", return: "+8.2%" },
];

export const PERFORMANCE_METRICS: PerformanceMetric[] = [
  { id: "metric-max-drawdown", label: "최대낙폭", value: "\u22128.2%", positive: false },
  { id: "metric-sharpe", label: "샤프 비율", value: "1.42", positive: true },
  { id: "metric-beta", label: "베타 (vs S&P)", value: "1.06" },
];
