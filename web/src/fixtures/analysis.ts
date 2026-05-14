// Static fixtures for /analysis (PR-06a).

export const ANALYSIS_TABS = [
  "시장 한눈에",
  "시장 심리",
  "기술적 분석",
  "재무 분석",
  "퀀트 팩터",
  "적정주가 계산",
  "섹터 흐름",
  "신호 알림",
] as const;
export type AnalysisTab = (typeof ANALYSIS_TABS)[number];

// ── 시장 한눈에 (Overview) ──────────────────────────────

export type MarketIndex = {
  id: string;
  label: string;
  value: string;
  change: string;
  up: boolean;
};

export const MARKET_INDICES: MarketIndex[] = [
  { id: "mi-spx", label: "S&P 500", value: "5,124.6", change: "+0.38%", up: true },
  { id: "mi-kospi", label: "KOSPI", value: "2,684.2", change: "+0.69%", up: true },
  { id: "mi-vix", label: "VIX", value: "14.2", change: "-0.4", up: true },
];

export type SectorReturn = {
  id: string;
  sector: string;
  return: number;
  up: boolean;
};

export const SECTOR_ROTATION: SectorReturn[] = [
  { id: "sec-it", sector: "IT", return: 4.2, up: true },
  { id: "sec-semi", sector: "반도체", return: 6.8, up: true },
  { id: "sec-comm", sector: "커뮤니케이션", return: 2.1, up: true },
  { id: "sec-fin", sector: "금융", return: 0.4, up: true },
  { id: "sec-health", sector: "헬스케어", return: -1.2, up: false },
  { id: "sec-energy", sector: "에너지", return: -3.4, up: false },
  { id: "sec-util", sector: "유틸리티", return: -0.8, up: false },
];

export type StyleCell = {
  id: string;
  size: "대형" | "소형";
  style: "그로스" | "밸류";
  value: string;
  up: boolean;
};

export const STYLE_ROTATION: StyleCell[] = [
  { id: "st-lg-growth", size: "대형", style: "그로스", value: "+8.4%", up: true },
  { id: "st-sm-growth", size: "소형", style: "그로스", value: "+2.1%", up: true },
  { id: "st-lg-value", size: "대형", style: "밸류", value: "+0.4%", up: true },
  { id: "st-sm-value", size: "소형", style: "밸류", value: "-1.8%", up: false },
];

export type AnalysisTool = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export const ANALYSIS_TOOLS: AnalysisTool[] = [
  { id: "tool-chart", icon: "📈", title: "실시간 차트", description: "TradingView급 캔들·이평·볼린저·RSI·MACD" },
  { id: "tool-financial", icon: "📊", title: "재무제표 시각화", description: "BS / IS / CF — 5년 추이 & 동종업계 비교" },
  { id: "tool-screener", icon: "🔍", title: "퀀트 스크리너", description: "PER · PBR · ROE · 모멘텀 · 퀄리티 팩터 필터" },
  { id: "tool-dcf", icon: "💰", title: "DCF 밸류에이션 계산기", description: "가정 슬라이더로 적정주가 추정" },
  { id: "tool-signal", icon: "🔔", title: "기술적 신호 알림", description: "골든크로스 · RSI 과매수 · 거래량 급증" },
  { id: "tool-ratio", icon: "⚖️", title: "재무 비율 비교", description: "동종업계 / 섹터 평균 대비 백분위" },
  { id: "tool-heat", icon: "🟩", title: "히트맵", description: "시총 가중 트리맵 · S&P 500 / KOSPI" },
  { id: "tool-sentiment", icon: "🎯", title: "시장 심리", description: "VIX · F&G · V-KOSPI · ADR · 9개 지표" },
];

export type RecentSignal = {
  id: string;
  ticker: string;
  signal: string;
  time: string;
  direction: "up" | "down" | "neutral";
};

export const RECENT_SIGNALS: RecentSignal[] = [
  { id: "sig-nvda", ticker: "NVDA", signal: "골든크로스 (MA20/60)", time: "오늘 09:42", direction: "up" },
  { id: "sig-aapl", ticker: "AAPL", signal: "RSI 과매수 (78)", time: "오늘 11:15", direction: "neutral" },
  { id: "sig-samsung", ticker: "005930", signal: "거래량 +320% 급증", time: "어제", direction: "up" },
  { id: "sig-tsla", ticker: "TSLA", signal: "MACD 데드크로스", time: "5/04", direction: "down" },
  { id: "sig-hynix", ticker: "000660", signal: "52주 신저가", time: "5/03", direction: "down" },
];

export type SavedScreen = {
  id: string;
  name: string;
  description: string;
  matches: number;
};

export const SAVED_SCREENS: SavedScreen[] = [
  { id: "scr-low-per-high-roe", name: "저PER 고ROE", description: "PER<15 · ROE>15 · 부채<50%", matches: 28 },
  { id: "scr-momentum-50", name: "모멘텀 50", description: "6M 수익률 > 섹터 +10%p", matches: 50 },
  { id: "scr-dividend-growth", name: "배당 그로스", description: "5Y 배당성장률 > 8%", matches: 42 },
  { id: "scr-small-quality", name: "소형 퀄리티", description: "시총<$2B · 영업이익률>20%", matches: 17 },
];

// ── 시장 심리 (Sentiment) ────────────────────────────────

export type SentimentStatus =
  | "calm"
  | "stable"
  | "neutral"
  | "caution"
  | "stress"
  | "panic";

export type SentimentIndicator = {
  id: string;
  region: "US" | "KR" | "Global";
  label: string;
  description: string;
  value: string;
  status: SentimentStatus;
  statusLabel: string;
};

export const SENTIMENT_INDICATORS: SentimentIndicator[] = [
  { id: "sn-vix", region: "US", label: "VIX", description: "S&P 500 옵션 30일 예상 변동성", value: "14.2", status: "calm", statusLabel: "Calm" },
  { id: "sn-fg", region: "US", label: "Fear & Greed", description: "CNN · 0–100 합성 지표", value: "62", status: "stable", statusLabel: "Greed" },
  { id: "sn-aaii", region: "US", label: "AAII Bull/Bear", description: "개인 투자자 심리 · 주간", value: "42", status: "caution", statusLabel: "Cautious" },
  { id: "sn-vkospi", region: "KR", label: "V-KOSPI", description: "KOSPI 200 옵션 변동성", value: "18.4", status: "stable", statusLabel: "Stable" },
  { id: "sn-adr", region: "KR", label: "ADR", description: "상승 ÷ 하락 종목 비율", value: "0.96", status: "neutral", statusLabel: "균형" },
  { id: "sn-credit", region: "KR", label: "신용잔고", description: "개인 빚투 규모", value: "72", status: "caution", statusLabel: "과열" },
  { id: "sn-pc", region: "Global", label: "Put / Call", description: "옵션 풋콜 비율 · 미국", value: "0.78", status: "stable", statusLabel: "Neutral+" },
  { id: "sn-buffett", region: "Global", label: "Buffett Indicator", description: "美 시총 / GDP", value: "188", status: "stress", statusLabel: "Overvalued" },
  { id: "sn-dxy", region: "Global", label: "DXY", description: "달러 인덱스", value: "104.2", status: "neutral", statusLabel: "평균" },
];

export type IndicatorGlossary = {
  id: string;
  term: string;
  description: string;
};

export const INDICATOR_GLOSSARY: IndicatorGlossary[] = [
  { id: "gl-vix", term: "VIX", description: "S&P 500 옵션의 향후 30일 예상 변동성. 20+ = 불안." },
  { id: "gl-fg", term: "CNN F&G", description: "7개 시장 지표를 0–100으로 합성. 25 이하 극공포." },
  { id: "gl-aaii", term: "AAII", description: "미국 개인 투자자 강세/약세 응답 비율 (주간)." },
  { id: "gl-vkospi", term: "V-KOSPI", description: "KOSPI 200 옵션의 변동성 지수. 한국판 VIX." },
  { id: "gl-adr", term: "ADR", description: "상승 종목 수 ÷ 하락 종목 수. 1.0 = 균형." },
  { id: "gl-credit", term: "신용잔고", description: "개인 빚투 규모. 과열 = 시장 정점 근처 신호." },
  { id: "gl-pc", term: "Put/Call", description: "풋옵션 / 콜옵션 거래량. 1.0+ = 헤지 수요 증가." },
  { id: "gl-buffett", term: "Buffett Indicator", description: "美 시총 / GDP. 130%+ = 고평가." },
  { id: "gl-dxy", term: "DXY", description: "달러 강도. 강달러 = 신흥국·원자재 약세." },
];

// ── 기술적 분석 (Technical) ──────────────────────────────

export type TechnicalSignalKind = "buy" | "sell" | "hold";

export type TechnicalIndicator = {
  id: string;
  symbol: string;
  indicator: string;
  value: string;
  signal: TechnicalSignalKind;
  signalLabel: string;
};

export const TECHNICAL_INDICATORS: TechnicalIndicator[] = [
  { id: "ti-nvda-rsi", symbol: "NVDA", indicator: "RSI(14)", value: "67.4", signal: "hold", signalLabel: "중립" },
  { id: "ti-nvda-macd", symbol: "NVDA", indicator: "MACD", value: "+2.3", signal: "buy", signalLabel: "매수" },
  { id: "ti-aapl-rsi", symbol: "AAPL", indicator: "RSI(14)", value: "78.1", signal: "sell", signalLabel: "과매수" },
  { id: "ti-tsla-macd", symbol: "TSLA", indicator: "MACD", value: "-1.8", signal: "sell", signalLabel: "데드크로스" },
  { id: "ti-msft-ma", symbol: "MSFT", indicator: "MA(20/60)", value: "↑", signal: "buy", signalLabel: "골든크로스" },
  { id: "ti-005930-bb", symbol: "005930", indicator: "Bollinger", value: "상단 돌파", signal: "buy", signalLabel: "상단" },
];

// ── 재무 분석 (Financials) ──────────────────────────────

export type FinancialGrade = "A" | "B" | "C" | "D";

export type FinancialScore = {
  id: string;
  symbol: string;
  per: string;
  pbr: string;
  roe: string;
  netMargin: string;
  debtRatio: string;
  score: FinancialGrade;
};

export const FINANCIAL_SCORES: FinancialScore[] = [
  { id: "fs-aapl", symbol: "AAPL", per: "28.4", pbr: "44.2", roe: "147.0%", netMargin: "25.3%", debtRatio: "82%", score: "A" },
  { id: "fs-nvda", symbol: "NVDA", per: "62.1", pbr: "28.7", roe: "98.2%", netMargin: "48.9%", debtRatio: "21%", score: "A" },
  { id: "fs-msft", symbol: "MSFT", per: "34.8", pbr: "12.3", roe: "39.4%", netMargin: "36.7%", debtRatio: "41%", score: "A" },
  { id: "fs-tsla", symbol: "TSLA", per: "61.2", pbr: "9.8", roe: "23.1%", netMargin: "9.2%", debtRatio: "18%", score: "B" },
  { id: "fs-005930", symbol: "005930", per: "12.4", pbr: "1.4", roe: "11.8%", netMargin: "13.2%", debtRatio: "32%", score: "B" },
];

// ── 퀀트 팩터 (Quant) ───────────────────────────────────

export type QuantFactor = {
  id: string;
  factor: string;
  description: string;
  topReturn: string;
  bottomReturn: string;
  spread: string;
  spreadPositive: boolean;
};

export const QUANT_FACTORS: QuantFactor[] = [
  { id: "qf-value", factor: "Value", description: "저PER · 저PBR · 고배당", topReturn: "+18.4%", bottomReturn: "+3.2%", spread: "+15.2%", spreadPositive: true },
  { id: "qf-momentum", factor: "Momentum", description: "12M-1M 수익률", topReturn: "+24.6%", bottomReturn: "-2.1%", spread: "+26.7%", spreadPositive: true },
  { id: "qf-quality", factor: "Quality", description: "고ROE · 저부채", topReturn: "+14.8%", bottomReturn: "+4.7%", spread: "+10.1%", spreadPositive: true },
  { id: "qf-size", factor: "Size", description: "소형주 vs 대형주", topReturn: "+9.4%", bottomReturn: "+12.1%", spread: "-2.7%", spreadPositive: false },
  { id: "qf-vol", factor: "Low Vol", description: "저변동성 종목", topReturn: "+7.2%", bottomReturn: "+11.8%", spread: "-4.6%", spreadPositive: false },
];

// ── 적정주가 (DCF) ──────────────────────────────────────

export type DcfAssumption = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export const DCF_ASSUMPTIONS: DcfAssumption[] = [
  { id: "dcf-growth", label: "성장률 (Y1-5)", value: "12%", detail: "과거 5년 평균" },
  { id: "dcf-terminal", label: "영구 성장률", value: "2.5%", detail: "GDP 성장률 근사" },
  { id: "dcf-wacc", label: "WACC", value: "8.4%", detail: "자본비용" },
  { id: "dcf-fair", label: "적정주가", value: "$214", detail: "현재 $187 · +14%" },
];

// ── 신호 알림 (Signals) ─────────────────────────────────

export type SignalDirection = "up" | "down" | "neutral";

export type SignalAlert = {
  id: string;
  ticker: string;
  type: string;
  trigger: string;
  time: string;
  direction: SignalDirection;
};

export const SIGNAL_ALERTS: SignalAlert[] = [
  { id: "sa-1", ticker: "NVDA", type: "골든크로스", trigger: "MA20 > MA60", time: "오늘 09:42", direction: "up" },
  { id: "sa-2", ticker: "AAPL", type: "RSI 과매수", trigger: "RSI 78", time: "오늘 11:15", direction: "neutral" },
  { id: "sa-3", ticker: "005930", type: "거래량 급증", trigger: "평균 +320%", time: "어제", direction: "up" },
  { id: "sa-4", ticker: "TSLA", type: "데드크로스", trigger: "MA20 < MA60", time: "5/04", direction: "down" },
  { id: "sa-5", ticker: "000660", type: "52주 신저가", trigger: "신저가 갱신", time: "5/03", direction: "down" },
  { id: "sa-6", ticker: "MSFT", type: "52주 신고가", trigger: "신고가 갱신", time: "5/02", direction: "up" },
  { id: "sa-7", ticker: "AMD", type: "RSI 과매도", trigger: "RSI 28", time: "5/01", direction: "neutral" },
];

// ── 섹터 흐름 ────────────────────────────────────────────

export type SectorMomentumTrend = "improving" | "deteriorating" | "stable";

export type SectorMomentum = {
  id: string;
  sector: string;
  oneMonth: string;
  threeMonth: string;
  sixMonth: string;
  trend: SectorMomentumTrend;
  trendLabel: string;
};

export const SECTOR_MOMENTUM: SectorMomentum[] = [
  { id: "sm-it", sector: "IT", oneMonth: "+4.2%", threeMonth: "+12.6%", sixMonth: "+24.1%", trend: "improving", trendLabel: "강세 지속" },
  { id: "sm-semi", sector: "반도체", oneMonth: "+6.8%", threeMonth: "+18.4%", sixMonth: "+38.2%", trend: "improving", trendLabel: "강세 지속" },
  { id: "sm-health", sector: "헬스케어", oneMonth: "-1.2%", threeMonth: "-3.8%", sixMonth: "+2.4%", trend: "deteriorating", trendLabel: "약세 전환" },
  { id: "sm-energy", sector: "에너지", oneMonth: "-3.4%", threeMonth: "-8.1%", sixMonth: "-4.7%", trend: "deteriorating", trendLabel: "하락" },
  { id: "sm-fin", sector: "금융", oneMonth: "+0.4%", threeMonth: "+2.1%", sixMonth: "+6.8%", trend: "stable", trendLabel: "안정" },
  { id: "sm-util", sector: "유틸리티", oneMonth: "-0.8%", threeMonth: "+1.2%", sixMonth: "+3.4%", trend: "stable", trendLabel: "안정" },
];
