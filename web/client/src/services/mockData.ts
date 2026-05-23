/**
 * FinanceLab Pro - Mock Data Service
 *
 * 이 파일은 백엔드 API 연동 전까지 사용하는 목업 데이터입니다.
 * API 연동 시 각 함수를 실제 fetch() 호출로 교체하면 됩니다.
 * 타입은 src/types/index.ts를 참조합니다.
 *
 * ⚠️ 실제 API 연동 시 교체할 함수 목록:
 *   - getMarketIndices()    → GET /api/market/indices
 *   - getStocks()           → GET /api/stocks?market=US|KR
 *   - getSectorRotation()   → GET /api/market/sectors?market=US|KR&period=day|week|month|quarter
 *   - getMacroIndicators()  → GET /api/macro/indicators
 *   - getNews()             → GET /api/news?category=&limit=
 *   - getCalendarEvents()   → GET /api/calendar?from=&to=
 *   - getMasters()          → GET /api/masters
 *   - getFearGreed()        → GET /api/market/fear-greed?market=US|KR
 *   - getReports()          → GET /api/reports?category=&page=
 */

import type {
  MarketIndex, Stock, SectorData, MacroIndicator,
  NewsItem, CalendarEvent, Master, FearGreedData, Report, LearnGuide
} from "@/types";

// ── 시장 지수 ──────────────────────────────────────────────────
export const MARKET_INDICES: MarketIndex[] = [
  { symbol: "KOSPI",   name: "코스피",       value: 2684.32, change: 18.42, changePct: 0.69,  market: "KR", source: "mock", trend: "up" },
  { symbol: "KOSDAQ",  name: "코스닥",       value: 872.14,  change: 4.28,  changePct: 0.49,  market: "KR", source: "mock", trend: "up" },
  { symbol: "S&P 500", name: "S&P 500",      value: 5812.44, change: 21.92, changePct: 0.38,  market: "US", source: "mock", trend: "up" },
  { symbol: "NASDAQ",  name: "나스닥",       value: 18024.1, change: 128.4, changePct: 0.72,  market: "US", source: "mock", trend: "up" },
  { symbol: "DOW",     name: "다우",         value: 39142.2, change: -88.4, changePct: -0.22, market: "US", source: "mock", trend: "down" },
  { symbol: "USD/KRW", name: "원/달러",      value: 1387.2,  change: -3.1,  changePct: -0.22, market: "FX", source: "mock", trend: "down" },
];

// ── 미국 종목 ──────────────────────────────────────────────────
export const US_STOCKS: Stock[] = [
  { ticker: "AAPL", name: "Apple Inc.", price: 189.84, changePct: 1.24, change: 2.32, volume: 54820000, marketCap: "$2.94T", sector: "Technology", exchange: "NASDAQ", country: "US", pe: 28.4, pbr: 46.2, roe: 147.6, dividendYield: 0.54 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 924.79, changePct: 3.42, change: 30.58, volume: 42180000, marketCap: "$2.28T", sector: "Semiconductors", exchange: "NASDAQ", country: "US", pe: 65.2, pbr: 38.4, roe: 91.2, dividendYield: 0.03 },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 420.21, changePct: 0.88, change: 3.67, volume: 22340000, marketCap: "$3.12T", sector: "Technology", exchange: "NASDAQ", country: "US", pe: 36.8, pbr: 12.4, roe: 38.5, dividendYield: 0.72 },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 175.42, changePct: 1.12, change: 1.94, volume: 18920000, marketCap: "$2.18T", sector: "Communication", exchange: "NASDAQ", country: "US", pe: 24.2, pbr: 6.8, roe: 28.4, dividendYield: 0.0 },
  { ticker: "META", name: "Meta Platforms", price: 512.38, changePct: 2.14, change: 10.74, volume: 16480000, marketCap: "$1.31T", sector: "Communication", exchange: "NASDAQ", country: "US", pe: 26.4, pbr: 7.2, roe: 34.8, dividendYield: 0.4 },
  { ticker: "AMZN", name: "Amazon.com Inc.", price: 192.46, changePct: 0.64, change: 1.22, volume: 28740000, marketCap: "$2.02T", sector: "Consumer Disc.", exchange: "NASDAQ", country: "US", pe: 42.8, pbr: 8.4, roe: 22.4, dividendYield: 0.0 },
  { ticker: "TSLA", name: "Tesla Inc.", price: 177.82, changePct: -1.84, change: -3.34, volume: 82640000, marketCap: "$567B", sector: "Automotive", exchange: "NASDAQ", country: "US", pe: 48.2, pbr: 9.8, roe: 18.2, dividendYield: 0.0 },
  { ticker: "TSM", name: "TSMC", price: 168.24, changePct: 2.84, change: 4.64, volume: 12480000, marketCap: "$873B", sector: "Semiconductors", exchange: "NYSE", country: "US", pe: 22.4, pbr: 5.8, roe: 28.4, dividendYield: 1.42 },
  { ticker: "AMD", name: "Advanced Micro Devices", price: 162.48, changePct: 4.12, change: 6.42, volume: 38420000, marketCap: "$263B", sector: "Semiconductors", exchange: "NASDAQ", country: "US", pe: 84.2, pbr: 3.8, roe: 4.8, dividendYield: 0.0 },
  { ticker: "AVGO", name: "Broadcom Inc.", price: 1482.4, changePct: 1.84, change: 26.82, volume: 4820000, marketCap: "$693B", sector: "Semiconductors", exchange: "NASDAQ", country: "US", pe: 32.4, pbr: 12.8, roe: 42.8, dividendYield: 1.28 },
];

// ── 한국 종목 ──────────────────────────────────────────────────
export const KR_STOCKS: Stock[] = [
  { ticker: "005930", name: "삼성전자", price: 76400, changePct: 0.51, change: 390, volume: 18420000, marketCap: "456조", sector: "반도체", exchange: "KOSPI", country: "KR", pe: 14.2, pbr: 1.4, roe: 10.2, dividendYield: 2.84 },
  { ticker: "000660", name: "SK하이닉스", price: 198500, changePct: -1.24, change: -2500, volume: 4820000, marketCap: "144조", sector: "반도체", exchange: "KOSPI", country: "KR", pe: 18.4, pbr: 2.8, roe: 16.4, dividendYield: 0.84 },
  { ticker: "035420", name: "NAVER", price: 214500, changePct: 0.94, change: 2000, volume: 1240000, marketCap: "35조", sector: "IT서비스", exchange: "KOSPI", country: "KR", pe: 28.4, pbr: 2.4, roe: 8.4, dividendYield: 0.42 },
  { ticker: "051910", name: "LG화학", price: 312000, changePct: -2.18, change: -6900, volume: 842000, marketCap: "22조", sector: "2차전지", exchange: "KOSPI", country: "KR", pe: 42.8, pbr: 1.8, roe: 4.2, dividendYield: 1.24 },
  { ticker: "373220", name: "LG에너지솔루션", price: 384000, changePct: -1.84, change: -7200, volume: 624000, marketCap: "90조", sector: "2차전지", exchange: "KOSPI", country: "KR", pe: 84.2, pbr: 4.8, roe: 5.8, dividendYield: 0.0 },
  { ticker: "207940", name: "삼성바이오로직스", price: 842000, changePct: 1.44, change: 12000, volume: 284000, marketCap: "60조", sector: "바이오", exchange: "KOSPI", country: "KR", pe: 68.4, pbr: 8.4, roe: 12.4, dividendYield: 0.0 },
  { ticker: "005380", name: "현대차", price: 248500, changePct: 0.81, change: 2000, volume: 1420000, marketCap: "53조", sector: "자동차", exchange: "KOSPI", country: "KR", pe: 6.8, pbr: 0.82, roe: 12.8, dividendYield: 3.84 },
  { ticker: "000270", name: "기아", price: 98400, changePct: 1.24, change: 1200, volume: 2840000, marketCap: "40조", sector: "자동차", exchange: "KOSPI", country: "KR", pe: 5.4, pbr: 0.94, roe: 18.4, dividendYield: 4.82 },
];

// ── 섹터 로테이션 - 미국 ──────────────────────────────────────
export const US_SECTORS: SectorData[] = [
  { sector: "Technology", etf: "XLK", returnDay: 1.42, returnWeek: 3.84, returnMonth: 8.42, returnQuarter: 18.4, rankDay: 1, rankWeek: 1, rankMonth: 1, prevRankMonth: 2, moneyFlow: "inflow", relativeStrength: 1.38 },
  { sector: "Semiconductors", etf: "SOXX", returnDay: 2.84, returnWeek: 6.42, returnMonth: 12.8, returnQuarter: 28.4, rankDay: 1, rankWeek: 1, rankMonth: 1, prevRankMonth: 1, moneyFlow: "inflow", relativeStrength: 1.82 },
  { sector: "Communication", etf: "XLC", returnDay: 0.84, returnWeek: 2.14, returnMonth: 4.82, returnQuarter: 12.4, rankDay: 3, rankWeek: 3, rankMonth: 3, prevRankMonth: 4, moneyFlow: "inflow", relativeStrength: 1.12 },
  { sector: "Financials", etf: "XLF", returnDay: 0.24, returnWeek: 0.84, returnMonth: 2.14, returnQuarter: 8.4, rankDay: 5, rankWeek: 5, rankMonth: 5, prevRankMonth: 3, moneyFlow: "neutral", relativeStrength: 0.88 },
  { sector: "Healthcare", etf: "XLV", returnDay: -0.42, returnWeek: -1.24, returnMonth: -2.14, returnQuarter: 2.84, rankDay: 7, rankWeek: 7, rankMonth: 7, prevRankMonth: 6, moneyFlow: "outflow", relativeStrength: 0.72 },
  { sector: "Energy", etf: "XLE", returnDay: -1.84, returnWeek: -3.42, returnMonth: -6.84, returnQuarter: -12.4, rankDay: 9, rankWeek: 9, rankMonth: 9, prevRankMonth: 8, moneyFlow: "outflow", relativeStrength: 0.48 },
  { sector: "Utilities", etf: "XLU", returnDay: -0.24, returnWeek: 0.42, returnMonth: 0.84, returnQuarter: 4.84, rankDay: 6, rankWeek: 6, rankMonth: 6, prevRankMonth: 7, moneyFlow: "neutral", relativeStrength: 0.82 },
  { sector: "Consumer Disc.", etf: "XLY", returnDay: 0.64, returnWeek: 1.84, returnMonth: 3.42, returnQuarter: 10.4, rankDay: 4, rankWeek: 4, rankMonth: 4, prevRankMonth: 5, moneyFlow: "neutral", relativeStrength: 0.94 },
  { sector: "Industrials", etf: "XLI", returnDay: 0.14, returnWeek: 0.64, returnMonth: 1.84, returnQuarter: 6.84, rankDay: 6, rankWeek: 6, rankMonth: 6, prevRankMonth: 6, moneyFlow: "neutral", relativeStrength: 0.84 },
  { sector: "Materials", etf: "XLB", returnDay: -0.84, returnWeek: -2.14, returnMonth: -4.24, returnQuarter: -6.84, rankDay: 8, rankWeek: 8, rankMonth: 8, prevRankMonth: 9, moneyFlow: "outflow", relativeStrength: 0.62 },
];

// ── 섹터 로테이션 - 한국 ──────────────────────────────────────
export const KR_SECTORS: SectorData[] = [
  { sector: "반도체", code: "KRX:반도체", returnDay: 1.84, returnWeek: 4.24, returnMonth: 8.84, returnQuarter: 22.4, rankDay: 1, rankWeek: 1, rankMonth: 1, prevRankMonth: 2, moneyFlow: "inflow", relativeStrength: 1.64 },
  { sector: "IT서비스", code: "KRX:IT서비스", returnDay: 0.64, returnWeek: 1.84, returnMonth: 3.84, returnQuarter: 10.4, rankDay: 3, rankWeek: 3, rankMonth: 3, prevRankMonth: 4, moneyFlow: "inflow", relativeStrength: 1.08 },
  { sector: "자동차", code: "KRX:자동차", returnDay: 0.94, returnWeek: 2.14, returnMonth: 4.84, returnQuarter: 12.4, rankDay: 2, rankWeek: 2, rankMonth: 2, prevRankMonth: 3, moneyFlow: "inflow", relativeStrength: 1.14 },
  { sector: "2차전지", code: "KRX:2차전지", returnDay: -1.84, returnWeek: -4.24, returnMonth: -8.84, returnQuarter: -18.4, rankDay: 9, rankWeek: 9, rankMonth: 9, prevRankMonth: 7, moneyFlow: "outflow", relativeStrength: 0.42 },
  { sector: "바이오", code: "KRX:바이오", returnDay: 1.24, returnWeek: 2.84, returnMonth: 5.84, returnQuarter: 14.4, rankDay: 2, rankWeek: 2, rankMonth: 2, prevRankMonth: 5, moneyFlow: "inflow", relativeStrength: 1.24 },
  { sector: "금융", code: "KRX:금융", returnDay: 0.24, returnWeek: 0.64, returnMonth: 1.84, returnQuarter: 6.4, rankDay: 5, rankWeek: 5, rankMonth: 5, prevRankMonth: 4, moneyFlow: "neutral", relativeStrength: 0.84 },
  { sector: "화학", code: "KRX:화학", returnDay: -0.84, returnWeek: -2.14, returnMonth: -4.84, returnQuarter: -10.4, rankDay: 8, rankWeek: 8, rankMonth: 8, prevRankMonth: 8, moneyFlow: "outflow", relativeStrength: 0.58 },
  { sector: "건설", code: "KRX:건설", returnDay: -0.42, returnWeek: -0.84, returnMonth: -1.84, returnQuarter: 2.4, rankDay: 7, rankWeek: 7, rankMonth: 7, prevRankMonth: 6, moneyFlow: "neutral", relativeStrength: 0.72 },
  { sector: "철강", code: "KRX:철강", returnDay: -1.24, returnWeek: -2.84, returnMonth: -5.84, returnQuarter: -8.4, rankDay: 8, rankWeek: 8, rankMonth: 8, prevRankMonth: 9, moneyFlow: "outflow", relativeStrength: 0.54 },
  { sector: "통신", code: "KRX:통신", returnDay: 0.14, returnWeek: 0.42, returnMonth: 1.24, returnQuarter: 4.84, rankDay: 6, rankWeek: 6, rankMonth: 6, prevRankMonth: 6, moneyFlow: "neutral", relativeStrength: 0.88 },
];

// ── 거시 지표 ──────────────────────────────────────────────────
export const MACRO_INDICATORS: MacroIndicator[] = [
  { id: "us_cpi", name: "미국 CPI (YoY)", value: "3.2%", numValue: 3.2, prev: "3.5%", status: "하락", good: true, unit: "%", trend: "down", country: "US", category: "물가", description: "미국 소비자물가지수. 연준의 목표치는 2%이며 하락 추세는 금리 인하 가능성을 높입니다.", source: "BLS", updateFrequency: "monthly" },
  { id: "us_unemployment", name: "미국 실업률", value: "3.9%", numValue: 3.9, prev: "3.8%", status: "상승", good: false, unit: "%", trend: "up", country: "US", category: "고용", description: "미국 실업률. 낮을수록 경기 호황이나 과열 우려도 있습니다.", source: "BLS", updateFrequency: "monthly" },
  { id: "fed_rate", name: "연준 기준금리", value: "5.25%", numValue: 5.25, prev: "5.25%", status: "동결", good: null, unit: "%", trend: "flat", country: "US", category: "금리", description: "미국 연방준비제도 기준금리. 2024년 이후 동결 중이며 시장은 인하 시점에 주목합니다.", source: "Federal Reserve", updateFrequency: "quarterly" },
  { id: "us_10y", name: "미국 10Y 국채", value: "4.42%", numValue: 4.42, prev: "4.58%", status: "하락", good: true, unit: "%", trend: "down", country: "US", category: "금리", description: "미국 10년물 국채 수익률. 주식 밸류에이션과 역의 관계이며 글로벌 금리의 기준점입니다.", source: "US Treasury", updateFrequency: "daily" },
  { id: "kr_rate", name: "한국 기준금리", value: "3.50%", numValue: 3.50, prev: "3.50%", status: "동결", good: null, unit: "%", trend: "flat", country: "KR", category: "금리", description: "한국은행 기준금리. 현재 동결 중이며 연내 인하 기대감이 있습니다.", source: "한국은행", updateFrequency: "quarterly" },
  { id: "kr_cpi", name: "한국 CPI (YoY)", value: "2.8%", numValue: 2.8, prev: "3.1%", status: "하락", good: true, unit: "%", trend: "down", country: "KR", category: "물가", description: "한국 소비자물가지수. 한국은행 목표치 2%에 근접하며 금리 인하 여건이 형성되고 있습니다.", source: "통계청", updateFrequency: "monthly" },
  { id: "wti", name: "WTI 유가", value: "$71.84", numValue: 71.84, prev: "$74.20", status: "하락", good: true, unit: "$", trend: "down", country: "GLOBAL", category: "원자재", description: "서부텍사스산 원유 가격. 에너지 비용과 인플레이션에 직접적 영향을 미칩니다.", source: "NYMEX", updateFrequency: "daily" },
  { id: "dxy", name: "달러 인덱스 (DXY)", value: "104.2", numValue: 104.2, prev: "105.8", status: "하락", good: true, unit: "", trend: "down", country: "GLOBAL", category: "환율", description: "주요 6개국 통화 대비 달러 강세를 나타내는 지수. 하락 시 신흥국 자산에 유리합니다.", source: "ICE", updateFrequency: "daily" },
];

// ── 뉴스 ──────────────────────────────────────────────────────
export const MARKET_NEWS: NewsItem[] = [
  { id: 1, title: "연준 위원, \"9월 인하 가능성 열어둘 것\"", summary: "연준 위원이 인플레이션 둔화 추세를 확인하며 9월 금리 인하 가능성을 시사했습니다. 시장은 연내 2회 인하를 기대하며 국채 수익률이 하락했습니다. S&P500과 나스닥은 이 소식에 상승 마감했습니다.", source: "Bloomberg", sourceUrl: "https://bloomberg.com", time: "12분", publishedAt: "2026-05-18T09:00:00Z", category: "매크로", tickers: ["QQQ", "SPY"], impact: "+0.18%", sentiment: "positive" },
  { id: 2, title: "코스피 외인 순매수 5거래일 연속, 반도체 주도", summary: "외국인 투자자가 코스피에서 5거래일 연속 순매수를 기록했습니다. 삼성전자와 SK하이닉스 등 반도체 대형주 중심으로 매수세가 집중되며 코스피는 2,680선을 회복했습니다. HBM 수요 증가 기대감이 주요 요인으로 분석됩니다.", source: "한국경제", sourceUrl: "https://hankyung.com", time: "34분", publishedAt: "2026-05-18T08:38:00Z", category: "한국", tickers: ["005930", "000660"], impact: "+0.32%", sentiment: "positive" },
  { id: 3, title: "엔비디아 추론 칩 발표 후 AI 반도체 일제 상승", summary: "엔비디아가 차세대 AI 추론 전용 칩 'Blackwell Ultra'를 공개하며 AI 반도체 섹터 전반이 강세를 보였습니다. AMD와 TSMC도 동반 상승했으며, 국내 HBM 공급사인 SK하이닉스도 수혜 기대감에 상승했습니다.", source: "Reuters", sourceUrl: "https://reuters.com", time: "1시간", publishedAt: "2026-05-18T08:12:00Z", category: "미국", tickers: ["NVDA", "AMD", "TSM"], impact: "+0.42%", sentiment: "positive" },
  { id: 4, title: "국제유가 WTI 72달러 회복, OPEC+ 감산 연장 관측", summary: "OPEC+가 현행 감산 정책을 3분기까지 연장할 가능성이 높다는 보도에 WTI 유가가 배럴당 72달러를 회복했습니다. 에너지 섹터 ETF(XLE)는 소폭 반등했으나 달러 강세 완화로 상승폭은 제한됐습니다.", source: "WSJ", sourceUrl: "https://wsj.com", time: "2시간", publishedAt: "2026-05-18T07:12:00Z", category: "매크로", tickers: ["XOM", "CVX"], impact: null, sentiment: "neutral" },
  { id: 5, title: "원/달러 1,387원 하락 마감, 위험선호 회복", summary: "달러 약세와 외국인 주식 순매수가 맞물리며 원/달러 환율이 1,387원으로 하락 마감했습니다. 연준 금리 인하 기대감이 달러 약세를 이끌었으며, 원화 강세는 수입 물가 안정에 기여할 것으로 보입니다.", source: "연합뉴스", sourceUrl: "https://yna.co.kr", time: "3시간", publishedAt: "2026-05-18T06:12:00Z", category: "한국", tickers: ["005930"], impact: "+0.05%", sentiment: "positive" },
  { id: 6, title: "애플, WWDC서 AI 기능 대폭 강화된 iOS 20 공개 예정", summary: "애플이 6월 WWDC에서 AI 기능이 대폭 강화된 iOS 20을 공개할 예정입니다. 온디바이스 AI와 ChatGPT 통합이 핵심이며, 아이폰 교체 수요를 자극할 것으로 기대됩니다. 애플 주가는 이 소식에 1% 이상 상승했습니다.", source: "Bloomberg", sourceUrl: "https://bloomberg.com", time: "4시간", publishedAt: "2026-05-18T05:12:00Z", category: "미국", tickers: ["AAPL", "MSFT"], impact: "+0.24%", sentiment: "positive" },
  { id: 7, title: "삼성전자, 2분기 HBM3E 공급 본격화...엔비디아 납품 확정", summary: "삼성전자가 2분기부터 엔비디아에 HBM3E 메모리를 본격 납품하기 시작했습니다. 이는 SK하이닉스의 독점 공급 구조를 깨는 것으로 삼성전자 반도체 부문의 수익성 개선이 기대됩니다.", source: "한국경제", sourceUrl: "https://hankyung.com", time: "5시간", publishedAt: "2026-05-18T04:12:00Z", category: "한국", tickers: ["005930", "NVDA"], impact: "+0.51%", sentiment: "positive" },
];

// ── 캘린더 이벤트 ──────────────────────────────────────────────
export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "ev1", date: "2026-05-20", day: "수", title: "미 무역수지", type: "매크로", country: "US", importance: "medium", expectedValue: "-$68.5B", previousValue: "-$71.4B" },
  { id: "ev2", date: "2026-05-21", day: "목", title: "NVDA 실적 발표 (장마감 후)", type: "실적", country: "US", ticker: "NVDA", holding: "12.4%", memo: "AI 데이터센터 매출 가이던스 주목. 목표가 $1,100", importance: "high", expectedValue: "EPS $5.58", previousValue: "EPS $5.16" },
  { id: "ev3", date: "2026-05-22", day: "금", title: "AAPL 분기 배당락", type: "배당", country: "US", ticker: "AAPL", holding: "9.1%", importance: "medium", expectedValue: "$0.25/주" },
  { id: "ev4", date: "2026-05-22", day: "금", title: "FOMC 회의록 공개", type: "매크로", country: "US", importance: "high", previousValue: "동결" },
  { id: "ev5", date: "2026-06-02", day: "화", title: "미 ISM 제조업 PMI", type: "매크로", country: "US", importance: "medium", expectedValue: "49.8", previousValue: "49.2" },
  { id: "ev6", date: "2026-06-06", day: "토", title: "AAPL WWDC 2026", type: "실적", country: "US", ticker: "AAPL", holding: "9.1%", memo: "iOS 20 AI 기능 발표 예정", importance: "high" },
  { id: "ev7", date: "2026-06-11", day: "목", title: "미 CPI (5월)", type: "매크로", country: "US", importance: "high", expectedValue: "3.0%", previousValue: "3.2%" },
  { id: "ev8", date: "2026-06-18", day: "목", title: "삼성전자 잠정실적", type: "실적", country: "KR", ticker: "005930", holding: "18.2%", importance: "high", expectedValue: "영업이익 6.5조", previousValue: "6.6조" },
];

// ── 공포탐욕지수 ──────────────────────────────────────────────
function generateFearGreedHistory(baseValue: number, days = 30) {
  let v = baseValue;
  return Array.from({ length: days }, (_, i) => {
    v += (Math.random() - 0.5) * 8;
    v = Math.max(5, Math.min(95, v));
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
      value: Math.round(v),
      vix: parseFloat((20 - (v / 100) * 10 + Math.random() * 2).toFixed(1)),
      adr: parseFloat((100 + (v / 100) * 40 - 20 + Math.random() * 10).toFixed(1)),
    };
  });
}

export const FEAR_GREED_US: FearGreedData = {
  market: "US",
  value: 62,
  label: "탐욕",
  vix: 14.8,
  updatedAt: "2026-05-18T09:00:00Z",
  history: generateFearGreedHistory(62, 90),
};

export const FEAR_GREED_KR: FearGreedData = {
  market: "KR",
  value: 58,
  label: "탐욕",
  adr: 124.8,
  updatedAt: "2026-05-18T09:00:00Z",
  history: generateFearGreedHistory(58, 90),
};

// ── 거장 투자자 ────────────────────────────────────────────────
export const MASTERS: Master[] = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    nameKo: "워런 버핏",
    title: "오마하의 현인",
    fund: "Berkshire Hathaway",
    aum: "$3,640억",
    strategy: "가치투자 / 장기보유",
    returnYtd: 18.4,
    return5y: 142.8,
    returnAll: 4284200,
    reportDate: "2026-02-14",
    philosophy: [
      "훌륭한 기업을 공정한 가격에 사는 것이 공정한 기업을 훌륭한 가격에 사는 것보다 낫다.",
      "10년 보유할 생각이 없다면 10분도 보유하지 마라.",
      "다른 사람들이 탐욕스러울 때 두려워하고, 두려워할 때 탐욕스러워라.",
      "리스크는 자신이 무엇을 하는지 모를 때 발생한다.",
    ],
    bio: "1930년생. 11세에 첫 주식 투자. 컬럼비아대에서 벤저민 그레이엄에게 가치투자를 배웠다. 버크셔 해서웨이를 통해 60년 이상 연평균 20%의 수익률을 달성했다.",
    topHoldings: [
      { ticker: "AAPL", name: "Apple Inc.", weight: 42.8, shares: "9억 주", value: "$1,708억", change: "decreased", changePct: -12.4 },
      { ticker: "BAC", name: "Bank of America", weight: 9.4, shares: "10.3억 주", value: "$374억", change: "unchanged" },
      { ticker: "AXP", name: "American Express", weight: 8.2, shares: "1.52억 주", value: "$326억", change: "unchanged" },
      { ticker: "KO", name: "Coca-Cola", weight: 7.8, shares: "4억 주", value: "$310억", change: "unchanged" },
      { ticker: "CVX", name: "Chevron", weight: 5.4, shares: "1.18억 주", value: "$215억", change: "decreased", changePct: -8.2 },
    ],
    firm: "Berkshire Hathaway Inc.",
    strategyDetail: "낮은 PER, 강한 해자(경제적 경쟁우위), 지속가능한 경영진을 갖춘 기업을 장기 보유. 단기 시세 무시.",
    cagr5y: 19.8,
    holdings: 47,
    lastFiling: "2026-02-14",
    nationality: "미국",
    birthYear: 1930,
    education: "컬럼비아대학교 경제학석사 (Benjamin Graham 지도)",
    sectors: ["금융", "소비재", "테크", "에너지"],
    style: ["가치투자", "장기보유", "해자분석", "집중투자"],
    story: "워런 버핏은 1930년 네브래스카주 오마하에서 태어났다. 아버지는 주식 중개인이었고, 버핏은 11세때 Cities Service 우선주 3주를 매수하며 투자의 세계에 눈떴다. 컬럼비아 경영대학원에서 벤저민 그레이엄 교수를 만나 가치투자의 체계를 정립했다. 1965년 망해가는 직물 회사인 버크셔 해서웨이를 인수해 투자 지주사로 변환했다. 코카콜라, 아메리칸 익스프레스, GEICO 보험 등 지속가능한 사업 모델을 가진 기업들을 집중 매수했다. 2008년 금융위기 때는 골드만삭스에 50억 달러를 투자해 시장에 신뢰를 불어넣으며 엄청난 수익을 올렸다. 애플 투자는 2016년 시작된 가장 눈에 띄는 사례로, 기술 기업에 대한 편견을 버리고 소비자 프랜차이즈로서의 애플을 인식한 결과였다.",
    career: [
      { year: "1930", event: "네브래스카주 오마하 출생" },
      { year: "1941", event: "첫 주식 매수 (11세)", detail: "Cities Service 우선주 3주 @ $38" },
      { year: "1951", event: "컬럼비아 경영대학원 입학", detail: "Benjamin Graham 교수에게 가치투자 학습" },
      { year: "1956", event: "Buffett Partnership Ltd. 설립", detail: "7명의 파트너로 시작, $105,000 운용" },
      { year: "1965", event: "Berkshire Hathaway 인수", detail: "망해가는 직물 회사를 투자 지주사로 변환" },
      { year: "1988", event: "Coca-Cola 대량 매수", detail: "$10억 투자, 현재 $310억으로 성장" },
      { year: "2008", event: "Goldman Sachs $50억 투자", detail: "금융위기 시 역발상 투자, 연 10% 우선주 매수" },
      { year: "2016", event: "Apple 매수 시작", detail: "IT 기업 아닌 소비자 프랜차이즈로 인식" },
      { year: "2023", event: "Apple 일부 매도", detail: "세금 이슈 및 밸류에이션 부담으로 12.4% 축소" },
    ],
    investmentThesis: [
      { ticker: "AAPL", name: "Apple Inc.", reason: "소비자 프랜차이즈 강도, 생태계 잠금, 지속적 주주환원. 스마트폰은 단순 하드웨어가 아닌 생활의 허브.", entryDate: "2016-Q1", targetReturn: "+200%", status: "보유" },
      { ticker: "KO", name: "Coca-Cola", reason: "1886년부터 지속된 브랜드 가치. 전 세계 유통망과 가격 결정력. 배당 성장 지속성.", entryDate: "1988-Q2", status: "보유" },
      { ticker: "BAC", name: "Bank of America", reason: "2011년 금융위기 후 저평가 시 매수. 미국 경제 회복과 함께 성장하는 미국 최대 소매 은행.", entryDate: "2011-Q3", status: "보유" },
    ],
    updates: [
      { date: "2026-05-15", type: "13F", title: "Q1 2026 13F 제출", detail: "Apple 지분 12.4% 추가 매도. 전체 포트폴리오에서의 비중은 여전히 42.8%로 최대 보유 종목." },
      { date: "2026-05-04", type: "인터뷰", title: "주주 연례 미팅 발언", detail: "AI는 새로운 도구이지만 우리는 여전히 기업의 수익력을 본다 - 주주 연례 미팅 연설" },
      { date: "2026-02-14", type: "13F", title: "Q4 2025 13F 제출", detail: "Chevron 추가 매도. 신규 종목 없음. 현금 보유량 사상 최대." },
    ],
  },
  {
    id: "ray-dalio",
    name: "Ray Dalio",
    nameKo: "레이 달리오",
    title: "올웨더 전략의 창시자",
    fund: "Bridgewater Associates",
    aum: "$1,240억",
    strategy: "매크로 / 리스크 패리티",
    returnYtd: 12.8,
    return5y: 84.2,
    returnAll: 2840,
    reportDate: "2026-02-14",
    philosophy: [
      "원칙을 가져라. 원칙은 반복되는 상황에서 어떻게 행동할지를 알려준다.",
      "고통 + 반성 = 발전. 실수를 두려워하지 말고 그로부터 배워라.",
      "분산투자는 투자의 성배다. 상관관계가 낮은 자산들로 포트폴리오를 구성하라.",
      "경제는 기계처럼 작동한다. 사이클을 이해하면 기회를 잡을 수 있다.",
    ],
    bio: "1949년생. 26세에 Bridgewater Associates 설립. 올웨더 포트폴리오와 리스크 패리티 전략을 창안했다. 2008년 금융위기를 예측하고 수익을 낸 것으로 유명하다.",
    topHoldings: [
      { ticker: "SPY", name: "SPDR S&P 500 ETF", weight: 18.4, shares: "420만 주", value: "$228억", change: "increased", changePct: 8.4 },
      { ticker: "GLD", name: "SPDR Gold Trust", weight: 14.2, shares: "1,240만 주", value: "$176억", change: "increased", changePct: 12.8 },
      { ticker: "EEM", name: "iShares MSCI EM ETF", weight: 8.4, shares: "2,840만 주", value: "$104억", change: "unchanged" },
      { ticker: "VWO", name: "Vanguard FTSE EM ETF", weight: 6.8, shares: "1,840만 주", value: "$84억", change: "new" },
      { ticker: "TLT", name: "iShares 20Y Treasury", weight: 5.4, shares: "840만 주", value: "$67억", change: "decreased", changePct: -4.2 },
    ],
    firm: "Bridgewater Associates",
    strategyDetail: "올웨더 포트폴리오: 주식/채권/금/원자재를 리스크 기여도 기준으로 균등 배분. 경기 사이클 4분면 대응.",
    cagr5y: 8.4,
    holdings: 284,
    lastFiling: "2026-02-14",
    nationality: "미국",
    birthYear: 1949,
    education: "하버드 경영대학원 MBA",
    sectors: ["ETF", "금/원자재", "신흥국", "채권"],
    style: ["매크로", "리스크패리티", "분산투자", "올웨더"],
    story: "레이 달리오는 1949년 뉴욕 퀸즈에서 태어났다. 12세에 Northeast Airlines 주식을 매수하며 투자를 시작했다. 1975년 26세의 나이에 맨해튼 아파트에서 Bridgewater Associates를 설립했다. 초기에는 기업들에게 환율과 금리 리스크를 자문하는 컨설팅 회사였다. 1987년 블랙먼데이를 예측하고 수익을 올리며 명성을 얻었다. 2008년 금융위기 역시 사전에 예측해 플러스 수익을 기록했다. 올웨더 포트폴리오는 어떤 경제 환경에서도 안정적 수익을 추구하는 그의 핵심 전략으로, 경기 사이클을 성장/침체, 인플레이션/디플레이션 4분면으로 나눠 각 환경에서 강한 자산을 균등 배분한다.",
    career: [
      { year: "1949", event: "뉴욕 퀸즈 출생" },
      { year: "1961", event: "첫 주식 매수 (12세)", detail: "Northeast Airlines @ $5, 3배 수익" },
      { year: "1972", event: "하버드 경영대학원 졸업" },
      { year: "1975", event: "Bridgewater Associates 설립", detail: "맨해튼 아파트에서 시작한 매크로 헤지펀드" },
      { year: "1987", event: "블랙먼데이 예측 성공", detail: "시장 붕괴 전 포지션 조정으로 수익" },
      { year: "1996", event: "올웨더 포트폴리오 개발", detail: "경기 4분면 기반 리스크 패리티 전략 완성" },
      { year: "2008", event: "금융위기 예측 및 수익", detail: "Pure Alpha 펀드 +9.5% 달성" },
      { year: "2017", event: "Bridgewater 공동 CIO 체제 전환", detail: "점진적 경영 승계 시작" },
    ],
    investmentThesis: [
      { ticker: "GLD", name: "SPDR Gold Trust", reason: "인플레이션 헤지 및 달러 약세 대응. 올웨더 포트폴리오에서 인플레이션 상승 환경의 핵심 자산.", entryDate: "2020-Q1", status: "보유" },
      { ticker: "EEM", name: "신흥국 ETF", reason: "달러 약세 사이클에서 신흥국 자산의 상대적 매력도 상승. 중국 경제 회복 수혜.", entryDate: "2021-Q2", status: "보유" },
    ],
    updates: [
      { date: "2026-05-10", type: "인터뷰", title: "링크드인 포스팅: 부채 사이클 경고", detail: "미국의 부채 수준이 역사적 임계점에 근접. 달러 패권 약화 가능성 경고." },
      { date: "2026-02-14", type: "13F", title: "Q4 2025 13F 제출", detail: "신흥국 ETF 비중 확대. 금 보유량 증가. 미국 주식 비중 소폭 축소." },
    ],
  },
  {
    id: "michael-burry",
    name: "Michael Burry",
    nameKo: "마이클 버리",
    title: "빅쇼트의 주인공",
    fund: "Scion Asset Management",
    aum: "$1.6억",
    strategy: "역발상 / 가치투자",
    returnYtd: 28.4,
    return5y: 284.2,
    returnAll: 1842,
    reportDate: "2026-02-14",
    philosophy: [
      "시장이 틀렸을 때 그 반대편에 서는 것이 진정한 투자다.",
      "모든 버블은 결국 터진다. 문제는 언제인가이다.",
      "데이터를 직접 읽어라. 남의 분석을 맹신하지 마라.",
      "인내심은 투자의 가장 중요한 덕목이다.",
    ],
    bio: "1971년생. 의사 출신 투자자. 2005년 서브프라임 모기지 붕괴를 예측하고 CDS를 통해 수억 달러의 수익을 올렸다. 영화 '빅쇼트'의 실제 주인공.",
    topHoldings: [
      { ticker: "JD", name: "JD.com", weight: 24.8, shares: "50만 주", value: "$3,968만", change: "increased", changePct: 42.8 },
      { ticker: "BABA", name: "Alibaba Group", weight: 18.4, shares: "20만 주", value: "$2,944만", change: "new" },
      { ticker: "REAL", name: "RealReal Inc.", weight: 12.4, shares: "280만 주", value: "$1,984만", change: "increased", changePct: 28.4 },
      { ticker: "HCA", name: "HCA Healthcare", weight: 8.4, shares: "4.2만 주", value: "$1,344만", change: "unchanged" },
      { ticker: "MGM", name: "MGM Resorts", weight: 6.8, shares: "28만 주", value: "$1,088만", change: "decreased", changePct: -18.4 },
    ],
    firm: "Scion Asset Management",
    strategyDetail: "극도의 역발상 투자. 시장이 간과한 저평가 자산 발굴. 소규모 집중 포트폴리오. 단기 변동성 감수.",
    cagr5y: 42.8,
    holdings: 12,
    lastFiling: "2026-02-14",
    nationality: "미국",
    birthYear: 1971,
    education: "밴더빌트대 의과대학 (의학박사), 투자는 독학",
    sectors: ["중국 기술주", "헬스케어", "소비재", "엔터테인먼트"],
    style: ["역발상", "가치투자", "집중투자", "숏셀링"],
    story: "마이클 버리는 1971년 캘리포니아에서 태어났다. 의과대학을 졸업하고 레지던트 과정 중 밤새 투자 분석을 하며 실력을 키웠다. 2000년 Scion Capital을 설립하고 닷컴 버블 붕괴 시 공매도로 큰 수익을 올렸다. 2005년 서브프라임 모기지의 붕괴를 예측하고 CDS를 통해 수억 달러의 수익을 올렸다. 이 이야기는 마이클 루이스의 책 빅쇼트와 동명의 영화로 제작됐다. 현재는 중국 기술주와 저평가 소비재 주식에 집중 투자하며, X(구 트위터)를 통한 시장 경고 발언으로도 유명하다.",
    career: [
      { year: "1971", event: "캘리포니아 출생" },
      { year: "1996", event: "밴더빌트대 의과대학 졸업" },
      { year: "2000", event: "Scion Capital 설립", detail: "레지던트 중 독학으로 쌓은 투자 실력으로 창업" },
      { year: "2001-2004", event: "닷컴 버블 공매도 성공", detail: "S&P500 -11.9% 시기 +55% 수익" },
      { year: "2005", event: "서브프라임 CDS 매수 시작", detail: "모기지 채권 붕괴 예측, 수억 달러 베팅" },
      { year: "2008", event: "빅쇼트 수익 실현", detail: "서브프라임 붕괴로 약 $7억 수익" },
      { year: "2013", event: "Scion Asset Management 재설립" },
      { year: "2021", event: "테슬라 공매도 및 인덱스펀드 버블 경고", detail: "X(트위터)를 통한 시장 경고 발언" },
    ],
    investmentThesis: [
      { ticker: "JD", name: "JD.com", reason: "중국 정부의 빅테크 규제 완화 기대. 극도의 저평가 상태. 물류 인프라 경쟁력.", entryDate: "2023-Q3", targetReturn: "+150%", status: "보유" },
      { ticker: "BABA", name: "Alibaba Group", reason: "규제 리스크 반영 후 PER 8배 수준의 극단적 저평가. 중국 소비 회복 수혜.", entryDate: "2024-Q1", status: "보유" },
    ],
    updates: [
      { date: "2026-05-12", type: "포트폴리오", title: "X 포스팅: 중국 기술주 추가 매수", detail: "시장이 중국 리스크를 과대평가하고 있다. JD.com은 현재 PER 6배다." },
      { date: "2026-02-14", type: "13F", title: "Q4 2025 13F 제출", detail: "알리바바 신규 편입. JD.com 비중 확대. MGM 일부 매도." },
    ],
  },
  {
    id: "cathie-wood",
    name: "Cathie Wood",
    nameKo: "캐시 우드",
    title: "혁신 투자의 아이콘",
    fund: "ARK Invest",
    aum: "$142억",
    strategy: "혁신 기술 / 성장주",
    returnYtd: -8.4,
    return5y: -42.8,
    returnAll: 284,
    reportDate: "2026-02-14",
    philosophy: [
      "혁신은 기하급수적으로 성장한다. 단기 변동성에 흔들리지 마라.",
      "5년 후를 보라. 오늘의 고평가는 내일의 저평가가 될 수 있다.",
      "AI, 로봇, 유전체학, 에너지저장, 블록체인이 미래를 바꾼다.",
    ],
    bio: "1955년생. ARK Invest 설립자. 2020년 TSLA 등 혁신 기술주 투자로 큰 수익을 올렸으나 이후 금리 인상 사이클에서 큰 손실을 기록했다.",
    topHoldings: [
      { ticker: "TSLA", name: "Tesla Inc.", weight: 12.4, shares: "1,240만 주", value: "$17.6억", change: "unchanged" },
      { ticker: "COIN", name: "Coinbase Global", weight: 8.4, shares: "840만 주", value: "$11.9억", change: "increased", changePct: 24.8 },
      { ticker: "ROKU", name: "Roku Inc.", weight: 6.8, shares: "1,680만 주", value: "$9.6억", change: "unchanged" },
      { ticker: "PATH", name: "UiPath Inc.", weight: 5.4, shares: "2,840만 주", value: "$7.7억", change: "new" },
      { ticker: "EXAS", name: "Exact Sciences", weight: 4.8, shares: "1,240만 주", value: "$6.8억", change: "decreased", changePct: -8.4 },
    ],
    firm: "ARK Investment Management",
    strategyDetail: "5대 혁신 플랫폼(AI, 로봇, 에너지저장, DNA시퀀싱, 블록체인) 집중 투자. 5년 이상 장기 성장 베팅.",
    cagr5y: -12.4,
    holdings: 38,
    lastFiling: "2026-02-14",
    nationality: "미국",
    birthYear: 1955,
    education: "서던캘리포니아대 경제학/금융학 학사",
    sectors: ["AI/테크", "전기차", "바이오", "핀테크", "블록체인"],
    style: ["성장투자", "혁신테마", "장기보유", "고변동성"],
    story: "캐시 우드는 1955년 로스앤젤레스에서 태어났다. USC에서 경제학을 전공하고 Capital Group, Jennison Associates 등 전통 자산운용사에서 경력을 쌓았다. 2014년 ARK Invest를 설립하며 혁신 기술 집중 투자 전략을 선보였다. 2020년 코로나 팬데믹 이후 테슬라, 줌, 스퀘어 등 혁신 기술주가 폭등하며 ARK 펀드는 연간 +150% 수익률을 기록했다. 그러나 2022년 금리 인상 사이클에서 성장주가 급락하며 큰 손실을 기록했다. 테슬라 목표주가 $2,000 등 파격적인 전망으로 논란의 중심에 서기도 한다. 여전히 AI와 로봇공학이 세상을 바꿀 것이라는 신념을 유지하고 있다.",
    career: [
      { year: "1955", event: "로스앤젤레스 출생" },
      { year: "1977", event: "USC 경제학/금융학 졸업" },
      { year: "1977-2001", event: "Capital Group, Jennison 등 근무" },
      { year: "2001", event: "AllianceBernstein 입사", detail: "글로벌 테마 전략 책임자" },
      { year: "2014", event: "ARK Invest 설립", detail: "혁신 기술 집중 ETF 운용사 창업" },
      { year: "2020", event: "ARK Innovation ETF +152% 달성", detail: "테슬라, 줌, 스퀘어 등 폭등" },
      { year: "2022", event: "금리 인상으로 대규모 손실", detail: "ARKK -67%, 성장주 전반 급락" },
      { year: "2024", event: "AI 테마 재편", detail: "AI 관련 종목 비중 확대" },
    ],
    investmentThesis: [
      { ticker: "TSLA", name: "Tesla Inc.", reason: "자율주행 로보택시 플랫폼으로의 전환. 에너지 사업 성장. 목표주가 $2,000.", entryDate: "2014-Q4", targetReturn: "+500%", status: "보유" },
      { ticker: "COIN", name: "Coinbase Global", reason: "암호화폐 인프라 플레이. 규제 명확화 수혜. 블록체인 금융 생태계의 핵심.", entryDate: "2021-Q2", status: "보유" },
    ],
    updates: [
      { date: "2026-05-08", type: "인터뷰", title: "CNBC 인터뷰: AI 혁명 2단계 시작", detail: "AI 추론 비용 급감으로 기업 도입 가속화. ARK는 AI 수혜주 비중 확대 중." },
      { date: "2026-02-14", type: "13F", title: "Q4 2025 13F 제출", detail: "UiPath 신규 편입. Coinbase 비중 확대. Zoom 완전 매도." },
    ],
  },
];

// ── 리포트 ────────────────────────────────────────────────────
export const REPORTS: Report[] = [
  { id: "r1", title: "2026년 하반기 글로벌 매크로 전망", institution: "Goldman Sachs", date: "2026-05-15", category: "거시경제", summary: "연준의 9월 금리 인하를 기점으로 글로벌 유동성이 개선될 전망입니다. 미국 경제는 연착륙 시나리오가 유력하며, 신흥국 자산의 상대적 매력도가 높아질 것으로 예상됩니다. S&P500 연말 목표치를 6,200으로 상향 조정합니다.", tickers: ["SPY", "EEM"], tags: ["매크로", "금리", "연준"], rating: undefined },
  { id: "r2", title: "AI 반도체 섹터 심층 분석: HBM 수요 폭증의 수혜주", institution: "Morgan Stanley", date: "2026-05-12", category: "산업분석", summary: "2026-2028년 HBM 수요는 연평균 85% 성장이 예상됩니다. SK하이닉스는 HBM3E 시장 점유율 55%로 최대 수혜주이며, 삼성전자도 엔비디아 납품 확정으로 2분기부터 실적 개선이 기대됩니다.", tickers: ["000660", "005930", "NVDA"], tags: ["반도체", "HBM", "AI"], rating: "매수" },
  { id: "r3", title: "버크셔 해서웨이 13F 분석: 버핏의 애플 매도 의미", institution: "JP Morgan", date: "2026-05-10", category: "13F", summary: "버핏이 애플 지분을 12.4% 추가 매도했습니다. 이는 세금 이슈와 밸류에이션 부담이 복합적으로 작용한 것으로 분석됩니다. 그러나 여전히 포트폴리오의 42.8%를 차지하는 최대 보유 종목입니다.", tickers: ["AAPL", "BRK.B"], tags: ["13F", "버핏", "가치투자"], rating: "중립" },
  { id: "r4", title: "2차전지 섹터 투자 전략: 바닥 확인 후 선별적 접근", institution: "삼성증권", date: "2026-05-08", category: "산업분석", summary: "전기차 수요 둔화로 2차전지 섹터가 조정을 받았으나 2026년 하반기부터 회복이 예상됩니다. LG에너지솔루션은 북미 공장 가동률 상승으로 수익성이 개선될 전망이며, 목표주가를 42만원으로 유지합니다.", tickers: ["373220", "051910"], tags: ["2차전지", "전기차", "LG에너지"], rating: "매수" },
  { id: "r5", title: "퀀트 팩터 분석: 2026년 모멘텀 팩터 부활", institution: "BlackRock", date: "2026-05-05", category: "퀀트", summary: "2025년 부진했던 모멘텀 팩터가 2026년 들어 강한 회복세를 보이고 있습니다. AI 관련 성장주와 반도체 섹터를 중심으로 모멘텀 전략의 초과수익이 확인됩니다.", tickers: ["NVDA", "META", "MSFT"], tags: ["퀀트", "팩터", "모멘텀"], rating: undefined },
  { id: "r6", title: "원/달러 환율 전망: 하반기 1,350원대 회귀 가능성", institution: "KB증권", date: "2026-05-03", category: "거시경제", summary: "연준 금리 인하 기대감과 한국 수출 호조로 원/달러 환율이 하반기 1,350원대까지 하락할 가능성이 있습니다. 외국인 주식 순매수 지속이 원화 강세를 지지하는 주요 요인입니다.", tickers: [], tags: ["환율", "원달러", "매크로"], rating: undefined },
];

// ── 학습 콘텐츠 ───────────────────────────────────────────────
export const LEARN_GUIDES: LearnGuide[] = [
  // 기초
  { id: "l1", title: "주식 투자 시작하기: 계좌 개설부터 첫 매수까지", description: "주식 투자를 처음 시작하는 분들을 위한 완전 가이드", category: "기초", level: "입문", readTime: 8, tags: ["입문", "계좌", "HTS"] },
  { id: "l2", title: "재무제표 읽는 법: 손익계산서, 재무상태표, 현금흐름표", description: "기업의 재무 건전성을 파악하는 핵심 도구", category: "기초", level: "초급", readTime: 15, tags: ["재무제표", "기초분석"] },
  { id: "l3", title: "PER, PBR, ROE 완전 정복", description: "가장 많이 쓰이는 밸류에이션 지표를 쉽게 이해하기", category: "기초", level: "초급", readTime: 10, tags: ["밸류에이션", "PER", "PBR"] },
  // 기술적 분석
  { id: "l4", title: "이동평균선(MA) 완전 가이드: 5일선부터 200일선까지", description: "추세 파악의 기본 도구인 이동평균선 활용법", category: "기술적분석", level: "초급", readTime: 12, tags: ["이동평균", "MA", "골든크로스"] },
  { id: "l5", title: "RSI로 과매수/과매도 구간 포착하기", description: "RSI 지표의 원리와 실전 매매 신호 해석법", category: "기술적분석", level: "초급", readTime: 10, tags: ["RSI", "보조지표", "과매수"] },
  { id: "l6", title: "볼린저밴드: 변동성을 이용한 매매 전략", description: "볼린저밴드의 수축과 확장을 이용한 실전 전략", category: "기술적분석", level: "중급", readTime: 14, tags: ["볼린저밴드", "변동성"] },
  { id: "l7", title: "MACD 심층 분석: 추세 전환 신호 포착", description: "MACD 히스토그램과 시그널선을 활용한 매매 타이밍", category: "기술적분석", level: "중급", readTime: 12, tags: ["MACD", "추세전환"] },
  // 가치투자
  { id: "l8", title: "워런 버핏의 투자 원칙 10가지", description: "버핏이 60년간 지켜온 투자 철학과 원칙", category: "가치투자", level: "초급", readTime: 15, tags: ["버핏", "가치투자", "장기투자"] },
  { id: "l9", title: "DCF 밸류에이션: 기업의 내재가치 계산하기", description: "현금흐름 할인법으로 적정 주가를 계산하는 방법", category: "가치투자", level: "중급", readTime: 20, tags: ["DCF", "내재가치", "밸류에이션"] },
  { id: "l10", title: "해자(Moat) 분석: 지속 가능한 경쟁우위 찾기", description: "버핏이 강조하는 경제적 해자의 종류와 분석 방법", category: "가치투자", level: "중급", readTime: 18, tags: ["해자", "경쟁우위", "버핏"] },
  // 퀀트
  { id: "l11", title: "팩터 투자 입문: 가치, 모멘텀, 퀄리티 팩터", description: "학술적으로 검증된 팩터 투자 전략의 기초", category: "퀀트", level: "중급", readTime: 16, tags: ["팩터", "퀀트", "스마트베타"] },
  { id: "l12", title: "파이썬으로 백테스팅 구현하기", description: "투자 전략을 코드로 검증하는 실전 가이드", category: "퀀트", level: "고급", readTime: 30, tags: ["파이썬", "백테스팅", "퀀트"] },
  // 매크로
  { id: "l13", title: "금리와 주식시장의 관계: 완전 가이드", description: "금리 변화가 주식, 채권, 환율에 미치는 영향", category: "매크로", level: "초급", readTime: 14, tags: ["금리", "연준", "매크로"] },
  { id: "l14", title: "경기 사이클과 섹터 로테이션 전략", description: "경기 국면별 강세 섹터와 투자 전략", category: "매크로", level: "중급", readTime: 18, tags: ["경기사이클", "섹터로테이션"] },
  // 심화
  { id: "l15", title: "13F 보고서 분석: 기관 투자자의 포트폴리오 읽기", description: "미국 기관 투자자의 포트폴리오 공시 활용법", category: "심화", level: "중급", readTime: 12, tags: ["13F", "기관투자자", "포트폴리오"] },
  { id: "l16", title: "옵션 전략 기초: 커버드콜과 풋옵션 헤지", description: "리스크 관리를 위한 기본 옵션 전략", category: "심화", level: "고급", readTime: 25, tags: ["옵션", "헤지", "커버드콜"] },
];

// ── 유틸리티 함수 ──────────────────────────────────────────────
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

export function generatePortfolioChart(days = 30) {
  let portfolio = 100, kospi = 100, sp500 = 100;
  return Array.from({ length: days }, (_, i) => {
    portfolio += (Math.random() - 0.42) * 2.5;
    kospi += (Math.random() - 0.46) * 1.8;
    sp500 += (Math.random() - 0.44) * 2.0;
    return {
      day: i + 1,
      portfolio: Math.max(85, portfolio),
      kospi: Math.max(85, kospi),
      sp500: Math.max(85, sp500),
    };
  });
}
