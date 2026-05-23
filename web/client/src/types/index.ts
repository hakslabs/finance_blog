/**
 * FinanceLab Pro - 공유 타입 정의
 * 모든 데이터 타입을 여기서 중앙 관리합니다.
 * 백엔드 API 연동 시 이 타입들이 API 응답 스키마와 일치해야 합니다.
 */

// ── 시장 지수 ──────────────────────────────────────────────────
export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePct: number;
  market: "KR" | "US" | "FX" | "COMM" | "VOL" | "CRYPTO";
  source?: "live" | "mock";
  trend?: "up" | "down" | "flat";
}

// ── 종목 ──────────────────────────────────────────────────────
export interface Stock {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  change: number;
  volume: number;
  marketCap: string;
  sector: string;
  exchange: "NYSE" | "NASDAQ" | "KOSPI" | "KOSDAQ";
  country: "US" | "KR";
  pe?: number;
  pbr?: number;
  roe?: number;
  dividendYield?: number;
}

// ── 섹터 로테이션 ──────────────────────────────────────────────
export interface SectorData {
  sector: string;
  etf?: string; // 미국: XLK, XLF 등
  code?: string; // 한국: 업종 코드
  returnDay: number; // 당일 수익률 %
  returnWeek: number; // 주간 수익률 %
  returnMonth: number; // 월간 수익률 %
  returnQuarter: number; // 분기 수익률 %
  rankDay: number; // 당일 순위
  rankWeek: number; // 주간 순위
  rankMonth: number; // 월간 순위
  prevRankMonth: number; // 전월 순위 (순위 변화 계산용)
  moneyFlow: "inflow" | "outflow" | "neutral"; // 자금 흐름
  relativeStrength: number; // 시장 대비 상대강도 (1.0 = 시장과 동일)
}

// ── 거시 지표 ──────────────────────────────────────────────────
export interface MacroIndicator {
  id: string;
  name: string;
  value: string;
  numValue: number;
  prev: string;
  status: string;
  good: boolean | null;
  unit: string;
  trend: "up" | "down" | "flat";
  country: "US" | "KR" | "GLOBAL";
  category: "금리" | "물가" | "고용" | "성장" | "원자재" | "환율";
  description: string;
  source: string;
  updateFrequency: "daily" | "weekly" | "monthly" | "quarterly";
}

// ── 뉴스 ──────────────────────────────────────────────────────
export interface NewsItem {
  id: number;
  title: string;
  summary: string; // 요약 (2-3문장)
  content?: string; // 본문 (선택)
  source: string;
  sourceUrl?: string;
  time: string; // "12분 전" 형식
  publishedAt: string; // ISO string
  category: "매크로" | "한국" | "미국" | "섹터" | "종목";
  tickers: string[];
  impact?: string | null; // 내 포지션 영향
  sentiment: "positive" | "negative" | "neutral";
  imageUrl?: string;
}

// ── 캘린더 이벤트 ──────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  date: string; // "YYYY-MM-DD"
  day: string; // "월화수목금토일"
  title: string;
  type: "실적" | "배당" | "매크로" | "개인" | "IPO";
  country?: "US" | "KR" | "GLOBAL";
  ticker?: string;
  holding?: string | null; // 보유 비중
  memo?: string;
  importance: "high" | "medium" | "low";
  expectedValue?: string; // 예상치
  previousValue?: string; // 이전치
  actualValue?: string; // 발표치 (발표 후)
  alertEnabled?: boolean;
}

// ── 거장 투자자 ────────────────────────────────────────────────
export interface CareerItem {
  year: string;
  event: string;
  detail?: string;
}
export interface InvestmentThesis {
  ticker: string;
  name: string;
  reason: string;
  entryDate: string;
  targetReturn?: string;
  status: "보유" | "매도" | "축소";
}
export interface MasterUpdate {
  date: string;
  type: "13F" | "포트폴리오" | "인터뷰" | "공시";
  title: string;
  detail: string;
}
export interface Master {
  id: string;
  name: string;
  nameKo: string;
  title: string;
  fund: string;
  firm?: string;
  aum: string;
  strategy: string;
  strategyDetail?: string;
  returnYtd: number;
  return5y: number;
  returnAll: number;
  cagr5y?: number | null;
  holdings?: number;
  lastFiling?: string;
  topHoldings: MasterHolding[];
  philosophy: string[];
  bio: string;
  reportDate: string;
  // 확장 필드
  career?: CareerItem[];
  story?: string;
  investmentThesis?: InvestmentThesis[];
  sectors?: string[];
  style?: string[];
  nationality?: string;
  birthYear?: number;
  education?: string;
  updates?: MasterUpdate[];
}

export interface MasterHolding {
  ticker: string;
  name: string;
  weight: number;
  shares: string;
  value: string;
  change: "new" | "increased" | "decreased" | "unchanged" | "sold";
  changePct?: number;
}

// ── 리포트 ────────────────────────────────────────────────────
export interface Report {
  id: string;
  title: string;
  institution: string;
  date: string;
  category: "거시경제" | "산업분석" | "종목분석" | "13F" | "채권" | "퀀트";
  summary: string;
  content?: string;
  tickers?: string[];
  rating?: "매수" | "중립" | "매도";
  targetPrice?: string;
  tags: string[];
  isBookmarked?: boolean;
  downloadUrl?: string;
  sourceUrl?: string;
}

// ── 포트폴리오 ────────────────────────────────────────────────
export interface PortfolioHolding {
  ticker: string;
  name: string;
  exchange: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPct: number;
  weight: number;
  sector: string;
  country: "US" | "KR";
}

export interface Trade {
  id: string;
  ticker: string;
  name: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  date: string;
  fee?: number;
  note?: string;
  reason?: string; // 매수/매도 이유
  targetPrice?: number; // 목표가
  stopLoss?: number; // 손절가
}

export interface Alert {
  id: string;
  ticker: string;
  name: string;
  type: "target" | "stoploss" | "volume" | "news" | "earnings";
  condition: string;
  targetValue: number;
  currentValue: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
}

// ── 공포탐욕지수 ──────────────────────────────────────────────
export interface FearGreedData {
  market: "US" | "KR";
  value: number; // 0-100
  label: "극도의 공포" | "공포" | "중립" | "탐욕" | "극도의 탐욕";
  vix?: number; // 미국: VIX
  adr?: number; // 한국: ADR (등락비율)
  updatedAt: string;
  history: { date: string; value: number; vix?: number; adr?: number }[];
}

// ── 학습 콘텐츠 ───────────────────────────────────────────────
export interface LearnGuide {
  id: string;
  title: string;
  description: string;
  category: "기초" | "기술적분석" | "가치투자" | "퀀트" | "매크로" | "심화";
  level: "입문" | "초급" | "중급" | "고급";
  readTime: number; // 분
  content?: string;
  tags: string[];
  isBookmarked?: boolean;
}
