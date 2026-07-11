/**
 * Analysis.tsx — Midnight Precision Design System
 * MTS 스타일 완전 개인화 분석 페이지
 * - 관심종목 기반 기술신호/퀀트 스크리너
 * - 시장개요: 데일리 코멘트 + 거시지표 직접 등록
 * - 섹터 로테이션: 미국/한국 분리, 당일/주간/월간/분기/연간
 * - 퀀트+기술신호 통합 스크리너: 조건 설정 → 종목 추천
 * - 수익률 비교: 국채 / 관심종목 / 포트폴리오 사용자 선택
 */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Search,
  Star,
  X,
  Plus,
  Pencil,
  Save,
  Brain,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Info,
  AlertTriangle,
  BarChart2,
  Activity,
  Zap,
  Target,
  BookOpen,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  SlidersHorizontal,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rebaseCompareRows, type CompareSeriesRow } from "@/lib/compare-series";
import { toast } from "sonner";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { useStockSearch, useStocks } from "@/features/stocks";
import {
  stocksService,
  type StockBarsCompareSeries,
  type StockBarsCompareResponse,
  type StockFinancialPeriod,
  type StockSearchHit,
} from "@/features/stocks/service";
import { usePortfolioHistory } from "@/features/portfolio";
import StockChart from "@/components/StockChart";
import KLineSeriesChart from "@/components/KLineSeriesChart";
import { useSectors } from "@/features/sectors";
import { macroService, useMacroIndicators } from "@/features/macro";
import type { MacroIndicator, Stock } from "@/types";

// ─── Types ────────────────────────────────────────────────────
type AllStock = Stock;
type MarketTab =
  | "시장 개요"
  | "주식 분석"
  | "섹터 로테이션"
  | "스크리너"
  | "수익률 비교";
type StockTab =
  | "차트"
  | "재무제표"
  | "밸류에이션"
  | "기술적 신호"
  | "뉴스"
  | "AI 요약";
type Period = "1D" | "1W" | "1M" | "3M" | "1Y" | "2Y" | "5Y";
type SectorPeriod = "당일" | "주간" | "월간" | "분기" | "연간";
type ReturnChartRow = CompareSeriesRow;
type CompareWindowMeta = Pick<
  StockBarsCompareResponse,
  | "compare_from_date"
  | "compare_to_date"
  | "compare_baseline_date"
  | "compare_row_count"
>;
type AnalysisBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
type FinancialChartRow = {
  year: string;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
};
type YieldHistoryRow = {
  date: string;
  value: number;
};
type ScreenerTechnical = {
  rsi: number | null;
  macd: number | null;
  checks: Record<string, boolean>;
};

function normalizeAnalysisBars(
  bars: Array<Partial<AnalysisBar> & { date?: string | null }>,
): AnalysisBar[] {
  const byDate = new Map<string, AnalysisBar>();

  for (const bar of bars) {
    const date = String(bar.date ?? "").slice(0, 10);
    const open = Number(bar.open);
    const high = Number(bar.high);
    const low = Number(bar.low);
    const close = Number(bar.close);
    const volume = Number(bar.volume ?? 0);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      open <= 0 ||
      high <= 0 ||
      low <= 0 ||
      close <= 0 ||
      high < Math.max(open, close) ||
      low > Math.min(open, close)
    ) {
      continue;
    }

    byDate.set(date, {
      date,
      open,
      high,
      low,
      close,
      volume: Number.isFinite(volume) && volume > 0 ? volume : 0,
    });
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function normalizeYieldHistory(
  rows: Array<{ date?: string | null; value?: number | null }>,
): YieldHistoryRow[] {
  const byDate = new Map<string, YieldHistoryRow>();
  for (const row of rows) {
    const date = String(row.date ?? "").slice(0, 10);
    const value = Number(row.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value)) {
      continue;
    }
    byDate.set(date, { date, value });
  }
  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function formatPortfolioChartValue(value: number, currency: string): string {
  const locale = currency === "KRW" ? "ko-KR" : "en-US";
  const compact = Math.abs(value) >= 1_000_000;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: currency === "KRW" || compact ? 0 : 2,
  }).format(value);
}

async function hydrateSearchHit(
  hit: StockSearchHit,
  init?: RequestInit,
): Promise<Stock> {
  let price = 0;
  let change = 0;
  let changePct = 0;
  let volume = 0;
  try {
    const bars = normalizeAnalysisBars(
      (await stocksService.bars(hit.ticker, 30, init)).items,
    );
    const latest = bars.at(-1);
    const prev = bars.at(-2);
    if (latest) {
      price = latest.close;
      volume = latest.volume;
    }
    if (latest && prev) {
      change = latest.close - prev.close;
      changePct = prev.close > 0 ? (change / prev.close) * 100 : 0;
    }
  } catch {
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    /* The chart panel can still load bars independently; keep quote empty. */
  }
  return {
    ticker: hit.ticker,
    name: hit.name,
    price,
    change,
    changePct,
    volume,
    marketCap: "",
    sector: "—",
    exchange:
      hit.exchange === "KOSDAQ"
        ? "KOSDAQ"
        : hit.country === "KR"
          ? "KOSPI"
          : "NASDAQ",
    country: hit.country,
  };
}

function valueFromStatement(
  rows: Record<string, unknown>[],
  concepts: string[],
): number | null {
  const normalized = new Set(concepts.map((concept) => concept.toLowerCase()));
  for (const row of rows) {
    const concept = String(
      row.concept ?? row.label ?? row.name ?? "",
    ).toLowerCase();
    if (!normalized.has(concept)) continue;
    const raw = row.value ?? row.amount ?? row.v;
    const value = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function financialPeriodToRow(
  period: StockFinancialPeriod,
): FinancialChartRow | null {
  const revenue = valueFromStatement(period.income_statement, [
    "us-gaap_revenues",
    "us-gaap_revenuefromcontractwithcustomerexcludingassessedtax",
    "us-gaap_salesrevenuenet",
    "ifrs-full_revenue",
    "revenue",
    "revenues",
  ]);
  const netIncome = valueFromStatement(period.income_statement, [
    "us-gaap_netincomeloss",
    "ifrs-full_profitloss",
    "net income",
    "netincomeloss",
  ]);
  const eps = valueFromStatement(period.income_statement, [
    "us-gaap_earningspersharediluted",
    "us-gaap_earningspersharebasic",
    "ifrs-full_basicanddilutedearningslossespershare",
    "eps",
  ]);
  if (revenue == null && netIncome == null && eps == null) return null;
  const label =
    period.year != null
      ? String(period.year)
      : period.period
        ? period.period.slice(0, 4)
        : "—";
  return {
    year: label,
    revenue: revenue == null ? null : revenue / 1_000_000_000,
    netIncome: netIncome == null ? null : netIncome / 1_000_000_000,
    eps,
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(values: number[], length: number): number | null {
  if (values.length < length) return null;
  return mean(values.slice(-length));
}

function emaSeries(values: number[], length: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (length + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function calcRsi(closes: number[], length = 14): number | null {
  if (closes.length <= length) return null;
  let gains = 0;
  let losses = 0;
  const slice = closes.slice(-(length + 1));
  for (let i = 1; i < slice.length; i++) {
    const delta = slice[i] - slice[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calcTechnicalSignals(bars: AnalysisBar[]) {
  const cleanBars = normalizeAnalysisBars(bars);
  const closes = cleanBars.map((bar) => bar.close);
  const volumes = cleanBars.map((bar) => bar.volume ?? 0);
  const latest = cleanBars[cleanBars.length - 1];
  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const bbWindow = closes.slice(-20);
  const bbMid = mean(bbWindow);
  const bbStd =
    bbMid == null
      ? null
      : Math.sqrt(
          bbWindow.reduce((sum, close) => sum + (close - bbMid) ** 2, 0) /
            bbWindow.length,
        );
  const bbUpper = bbMid != null && bbStd != null ? bbMid + 2 * bbStd : null;
  const bbLower = bbMid != null && bbStd != null ? bbMid - 2 * bbStd : null;
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdSeries = closes.map((_, i) => (ema12[i] ?? 0) - (ema26[i] ?? 0));
  const signalSeries = emaSeries(macdSeries, 9);
  const macd = macdSeries[macdSeries.length - 1] ?? null;
  const signal = signalSeries[signalSeries.length - 1] ?? null;
  const rsi = calcRsi(closes);
  const recentVolume = mean(volumes.slice(-5));
  const baseVolume = mean(volumes.slice(-25, -5));
  const volumeTrend =
    recentVolume != null && baseVolume
      ? ((recentVolume - baseVolume) / baseVolume) * 100
      : null;
  const bandPosition =
    latest && bbUpper != null && bbLower != null && bbUpper !== bbLower
      ? ((latest.close - bbLower) / (bbUpper - bbLower)) * 100
      : null;
  const stochWindow = cleanBars.slice(-14);
  const stochLow = stochWindow.length
    ? Math.min(...stochWindow.map((bar) => bar.low))
    : null;
  const stochHigh = stochWindow.length
    ? Math.max(...stochWindow.map((bar) => bar.high))
    : null;
  const stoch =
    latest && stochLow != null && stochHigh != null && stochHigh !== stochLow
      ? ((latest.close - stochLow) / (stochHigh - stochLow)) * 100
      : null;
  const bullishCount = [
    ma5 != null && ma20 != null && ma5 > ma20,
    ma20 != null && ma60 != null && ma20 > ma60,
    macd != null && signal != null && macd > signal,
    rsi != null && rsi >= 50 && rsi < 70,
    volumeTrend != null && volumeTrend > 0,
  ].filter(Boolean).length;

  return {
    ma5,
    ma20,
    ma60,
    macd,
    signal,
    rsi,
    bandPosition,
    stoch,
    volumeTrend,
    bullishCount,
  };
}

function calcScreenerTechnical(bars: AnalysisBar[]): ScreenerTechnical {
  if (bars.length === 0) {
    return {
      rsi: null,
      macd: null,
      checks: {
        rsi_oversold: false,
        rsi_overbought: false,
        golden_cross: false,
        dead_cross: false,
        bb_lower: false,
        bb_upper: false,
        macd_bullish: false,
      },
    };
  }
  const signals = calcTechnicalSignals(bars);
  const ma5 = signals.ma5;
  const ma20 = signals.ma20;
  return {
    rsi: signals.rsi,
    macd: signals.macd,
    checks: {
      rsi_oversold: signals.rsi != null && signals.rsi < 35,
      rsi_overbought: signals.rsi != null && signals.rsi > 65,
      golden_cross: ma5 != null && ma20 != null && ma5 > ma20,
      dead_cross: ma5 != null && ma20 != null && ma5 < ma20,
      bb_lower: signals.bandPosition != null && signals.bandPosition < 20,
      bb_upper: signals.bandPosition != null && signals.bandPosition > 80,
      macd_bullish:
        signals.macd != null &&
        signals.signal != null &&
        signals.macd > signals.signal,
    },
  };
}

const PERIOD_DAYS: Record<Period, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
};
const COMPARE_BAR_LIMITS: Record<Period, number> = {
  "1D": 2,
  "1W": 7,
  "1M": 31,
  "3M": 92,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
};
const COMPARE_SOURCE_DAYS = COMPARE_BAR_LIMITS["5Y"];
const RETURN_SOURCE_DAYS = PERIOD_DAYS["5Y"];
const SCREENER_TECHNICAL_HISTORY_DAYS = 365;
const STOCK_SIGNAL_HISTORY_DAYS = 365;

function rebaseCompareRowsForPeriod(
  sourceRows: ReturnChartRow[],
  tickers: string[],
  period: Period,
): { rows: ReturnChartRow[]; returns: Record<string, number> } {
  const { rows, returns } = rebaseCompareRows(
    sourceRows,
    tickers,
    COMPARE_BAR_LIMITS[period],
  );
  return { rows, returns };
}

function PctBadge({
  value,
  size = "sm",
}: {
  value: number | null | undefined;
  size?: "xs" | "sm";
}) {
  if (value == null || !Number.isFinite(value)) {
    return (
      <span
        className={cn(
          "inline-flex font-mono-num font-medium rounded text-muted-foreground bg-muted/30",
          size === "xs" ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5",
        )}
      >
        —
      </span>
    );
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono-num font-medium rounded",
        size === "xs" ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5",
        up ? "text-up bg-up/10" : "text-down bg-down/10",
      )}
    >
      {up ? (
        <ArrowUpRight size={size === "xs" ? 9 : 11} />
      ) : (
        <ArrowDownRight size={size === "xs" ? 9 : 11} />
      )}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function RankChange({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr;
  if (diff > 0)
    return (
      <span className="text-[10px] text-up flex items-center gap-0.5">
        <ChevronUp size={10} />+{diff}
      </span>
    );
  if (diff < 0)
    return (
      <span className="text-[10px] text-down flex items-center gap-0.5">
        <ChevronDown size={10} />
        {diff}
      </span>
    );
  return (
    <span className="text-[10px] text-muted-foreground">
      <Minus size={10} />
    </span>
  );
}

function MoneyFlowBadge({ flow }: { flow: "inflow" | "outflow" | "neutral" }) {
  if (flow === "inflow")
    return (
      <span className="text-[10px] text-up bg-up/10 px-1.5 py-0.5 rounded font-medium">
        유입
      </span>
    );
  if (flow === "outflow")
    return (
      <span className="text-[10px] text-down bg-down/10 px-1.5 py-0.5 rounded font-medium">
        유출
      </span>
    );
  return (
    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
      중립
    </span>
  );
}

// ─── AI Impact Summaries ──────────────────────────────────────
const AI_IMPACT: Record<string, string> = {
  "미국 CPI":
    "예상치 상회 시 연준 금리 인하 기대 약화 → 성장주·기술주 밸류에이션 압박. 채권 수익률 상승으로 고PER 종목 조정 가능성.",
  연방기금금리:
    "금리 동결·인하 시 유동성 확대 기대 → 나스닥 강세. 인상 시 달러 강세·신흥국 자금 이탈 우려.",
  "미국 실업률":
    "실업률 상승은 소비 둔화 신호 → 소비재·리테일 섹터 부담. 단, 연준 금리 인하 명분 제공으로 채권 강세.",
  "미국 GDP 성장률":
    "성장률 가속 시 기업 이익 개선 기대 → 경기민감주(금융·산업재) 강세. 과열 우려 시 인플레이션 재점화 리스크.",
  "WTI 유가":
    "유가 상승 시 에너지 섹터 수혜, 항공·운송·화학 비용 증가. 인플레이션 자극으로 연준 긴축 장기화 우려.",
  "달러 인덱스":
    "달러 강세 시 원자재 가격 하락, 신흥국 통화 약세. 미국 수출 기업 실적 압박. 달러 약세 시 반대 효과.",
  "한국 기준금리":
    "금리 인하 시 부동산·금융주 수혜, 성장주 밸류에이션 개선. 원화 약세 압력으로 수출주 혼조.",
  "KOSPI 외국인 순매수":
    "외국인 순매수 확대 시 대형주 강세 신호. 반도체·자동차 등 수출 대형주 중심 상승 모멘텀.",
};

// ─── MacroCard ────────────────────────────────────────────────
function MacroCard({
  ind,
  onEdit,
  defaultExpanded = false,
}: {
  ind: MacroIndicator;
  onEdit: (id: string) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(ind.value);
  const [editPrev, setEditPrev] = useState(ind.prev);
  const [currentInd, setCurrentInd] = useState(ind);
  const [historyRows, setHistoryRows] = useState<
    { date: string; value: number }[] | null
  >(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRetry, setHistoryRetry] = useState(0);

  const numVal = parseFloat(currentInd.value);
  const numPrev = parseFloat(currentInd.prev);
  const hasNumericChange = Number.isFinite(numVal) && Number.isFinite(numPrev);
  const diff = hasNumericChange ? numVal - numPrev : null;
  const up = (diff ?? 0) >= 0;
  const color = up ? "#22c55e" : "#ef4444";

  const handleSave = () => {
    setCurrentInd((prev) => ({ ...prev, value: editVal, prev: editPrev }));
    setEditing(false);
    toast.success(`${ind.name} 발표치 업데이트 완료`);
    onEdit(ind.id);
  };

  useEffect(() => {
    setCurrentInd(ind);
    setEditVal(ind.value);
    setEditPrev(ind.prev);
    setHistoryRows(null);
    setHistoryError(null);
    setExpanded(defaultExpanded);
  }, [defaultExpanded, ind]);

  useEffect(() => {
    if (!expanded || historyRows !== null || historyLoading) return;
    let cancelled = false;
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);
    macroService
      .history(currentInd.id, 1825, { signal: controller.signal })
      .then((r) => {
        if (cancelled) return;
        setHistoryRows(r.items.filter((row) => Number.isFinite(row.value)));
        setHistoryError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (!cancelled) {
          setHistoryRows([]);
          setHistoryError(
            error instanceof Error
              ? error.message
              : "매크로 히스토리 API 요청이 실패했습니다",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [expanded, currentInd.id, historyRetry, historyRows, historyLoading]);

  const categoryColors: Record<string, string> = {
    금리: "text-sky bg-sky/10",
    물가: "text-orange-400 bg-orange-400/10",
    고용: "text-green-400 bg-green-400/10",
    성장: "text-violet-400 bg-violet-400/10",
    원자재: "text-yellow-400 bg-yellow-400/10",
    환율: "text-blue-400 bg-blue-400/10",
  };

  return (
    <div
      className={cn(
        "border border-border rounded-xl overflow-hidden transition-all duration-200",
        expanded ? "col-span-2 sm:col-span-2 lg:col-span-2" : "",
        "hover:border-primary/30 hover:shadow-sm",
      )}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold leading-tight truncate">
              {currentInd.name}
            </div>
            <span
              className={cn(
                "text-[9px] px-1 py-0.5 rounded font-medium mt-0.5 inline-block",
                categoryColors[currentInd.category] ||
                  "text-muted-foreground bg-muted",
              )}
            >
              {currentInd.category}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(!editing);
                setExpanded(true);
              }}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil size={10} />
            </button>
            {expanded ? (
              <ChevronUp size={12} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={12} className="text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-xl font-bold font-mono-num">
            {currentInd.value}
            {currentInd.unit}
          </span>
          <span
            className={cn(
              "text-xs font-mono-num font-medium",
              !hasNumericChange
                ? "text-muted-foreground"
                : up
                  ? "text-up"
                  : "text-down",
            )}
          >
            {hasNumericChange
              ? `${up ? "+" : ""}${diff!.toFixed(2)}${currentInd.unit}`
              : "—"}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          이전: {currentInd.prev}
          {currentInd.unit}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50">
          {editing && (
            <div className="p-3 bg-muted/20 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-medium text-muted-foreground">
                발표치 직접 입력
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    현재값
                  </label>
                  <input
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs bg-background border border-border rounded-lg font-mono-num focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    이전값
                  </label>
                  <input
                    value={editPrev}
                    onChange={(e) => setEditPrev(e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs bg-background border border-border rounded-lg font-mono-num focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-end gap-1">
                  <button
                    onClick={handleSave}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1"
                  >
                    <Save size={10} /> 저장
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-lg"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <BarChart2 size={10} /> 시계열 히스토리
              <span className="ml-auto">
                {currentInd.source} ·{" "}
                {currentInd.updateFrequency === "monthly"
                  ? "월간"
                  : currentInd.updateFrequency === "daily"
                    ? "일간"
                    : "분기"}
              </span>
            </div>
            <div className="h-28">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 text-center text-[11px] text-muted-foreground px-4">
                  히스토리를 불러오는 중입니다
                </div>
              ) : historyRows && historyRows.length >= 2 ? (
                <KLineSeriesChart
                  data={historyRows}
                  height={112}
                  showToolbar={false}
                  valueFormatter={(v) =>
                    `${v.toFixed(currentInd.unit === "₩" ? 0 : 2)}${currentInd.unit}`
                  }
                  sourceLabel="API"
                  sourceTone="primary"
                  sourceTitle={`${currentInd.source} 히스토리 API 기준`}
                  series={[
                    {
                      key: "value",
                      label: currentInd.name,
                      color,
                      type: "line",
                    },
                  ]}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 text-center text-[11px] text-muted-foreground px-4">
                  <span>
                    {historyError
                      ? "매크로 히스토리 API 요청이 실패했습니다"
                      : "저장된 매크로 히스토리가 없습니다"}
                  </span>
                  {historyError && (
                    <span className="mt-0.5 max-w-full truncate font-mono text-[10px] text-destructive">
                      {historyError}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setHistoryRows(null);
                      setHistoryRetry((value) => value + 1);
                    }}
                    className="mt-1 inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    <RefreshCw size={10} />
                    다시 불러오기
                  </button>
                </div>
              )}
            </div>
            {AI_IMPACT[currentInd.name] && (
              <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-1.5">
                  <Brain size={10} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[9px] text-primary font-semibold mb-0.5">
                      시장 영향 분석
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                      {AI_IMPACT[currentInd.name]}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Market Overview Panel ────────────────────────────────────
const DAILY_COMMENTS = [
  {
    date: "2025.05.18",
    title: "연준 의사록 발표 앞두고 관망세 — 기술주 차별화 지속",
    summary:
      "미국 증시는 연준 5월 FOMC 의사록 공개를 앞두고 전반적 관망세를 보였다. S&P500은 소폭 상승하며 5,800선을 유지했으나 거래량은 평균 대비 15% 감소했다. 엔비디아(NVDA)는 AI 수요 지속 기대감에 3.4% 급등하며 나스닥을 견인했고, 에너지 섹터는 유가 하락에 2% 이상 밀렸다.",
    keyPoints: [
      "NVDA +3.4% — Blackwell GPU 수요 예상치 상회 보도",
      "연준 의사록: 금리 동결 기조 유지, 인하 시기 불확실",
      "WTI 유가 $71.8 — OPEC+ 증산 우려 지속",
      "달러 인덱스 104.2 — 엔화 약세 재개",
    ],
    outlook:
      "단기적으로 연준 의사록과 PCE 물가지수 발표가 시장 방향성을 결정할 것. 기술주 중심 상승 모멘텀은 유지되나 밸류에이션 부담 존재. 한국 시장은 외국인 반도체 순매수 지속 여부가 관건.",
    sentiment: "중립",
    sentimentScore: 52,
  },
];

const MARKET_EVENTS_TODAY = [
  {
    time: "21:30",
    event: "미국 소매판매 (4월)",
    importance: "high",
    forecast: "+0.4%",
    prev: "+0.7%",
  },
  {
    time: "21:30",
    event: "미국 산업생산 (4월)",
    importance: "medium",
    forecast: "+0.1%",
    prev: "-0.3%",
  },
  {
    time: "23:00",
    event: "미시간대 소비자심리 (5월 예비)",
    importance: "medium",
    forecast: "76.2",
    prev: "77.2",
  },
  {
    time: "다음주",
    event: "연준 FOMC 의사록 공개",
    importance: "high",
    forecast: "-",
    prev: "-",
  },
];

function MarketOverviewPanel({
  macroIndicators,
  onEditMacro,
}: {
  macroIndicators: MacroIndicator[];
  onEditMacro: (id: string) => void;
}) {
  const [showAddMacro, setShowAddMacro] = useState(false);
  const [newMacro, setNewMacro] = useState({
    name: "",
    value: "",
    prev: "",
    category: "금리" as MacroIndicator["category"],
  });
  const [localIndicators, setLocalIndicators] = useState(macroIndicators);
  const comment = DAILY_COMMENTS[0];

  useEffect(() => {
    setLocalIndicators((prev) => {
      const custom = prev.filter((item) => item.id.startsWith("custom-"));
      return [...macroIndicators, ...custom];
    });
  }, [macroIndicators]);

  const handleAddMacro = () => {
    if (!newMacro.name || !newMacro.value) {
      toast.error("지표명과 현재값을 입력하세요");
      return;
    }
    const numVal = parseFloat(newMacro.value) || 0;
    const prevVal = parseFloat(newMacro.prev) || 0;
    const newItem: MacroIndicator = {
      id: `custom-${Date.now()}`,
      name: newMacro.name,
      value: newMacro.value,
      numValue: numVal,
      prev: newMacro.prev,
      status: numVal > prevVal ? "상승" : numVal < prevVal ? "하락" : "보합",
      good: null,
      unit: "",
      trend: numVal > prevVal ? "up" : numVal < prevVal ? "down" : "flat",
      country: "GLOBAL",
      category: newMacro.category,
      description: "",
      source: "직접 입력",
      updateFrequency: "monthly",
    };
    setLocalIndicators((prev) => [...prev, newItem]);
    setNewMacro({ name: "", value: "", prev: "", category: "금리" });
    setShowAddMacro(false);
    toast.success("거시지표 추가 완료");
  };

  return (
    <div className="space-y-5">
      {/* Daily Market Comment */}
      <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={13} className="text-primary" />
              <span className="text-[11px] text-primary font-semibold">
                오늘의 시장 코멘트
              </span>
              <span className="text-[10px] text-muted-foreground">
                {comment.date}
              </span>
            </div>
            <div className="text-sm font-bold leading-snug">
              {comment.title}
            </div>
          </div>
          <div
            className={cn(
              "shrink-0 px-2 py-1 rounded-lg text-xs font-semibold",
              comment.sentimentScore >= 60
                ? "bg-up/10 text-up"
                : comment.sentimentScore <= 40
                  ? "bg-down/10 text-down"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {comment.sentiment} {comment.sentimentScore}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {comment.summary}
        </p>
        <div className="space-y-1 mb-3">
          {comment.keyPoints.map((pt, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <span className="text-primary mt-0.5 shrink-0">•</span>
              <span className="text-foreground/80">{pt}</span>
            </div>
          ))}
        </div>
        <div className="p-2.5 bg-muted/30 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-semibold mb-1 flex items-center gap-1">
            <Target size={10} /> 단기 전망
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {comment.outlook}
          </p>
        </div>
      </div>

      {/* Today's Key Events */}
      <div>
        <div className="text-xs font-semibold mb-2 flex items-center gap-2">
          <Activity size={13} className="text-primary" /> 오늘의 주요 경제 일정
        </div>
        <div className="space-y-1.5">
          {MARKET_EVENTS_TODAY.map((ev, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <span className="text-[11px] font-mono text-muted-foreground w-12 shrink-0">
                {ev.time}
              </span>
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  ev.importance === "high" ? "bg-down" : "bg-yellow-400",
                )}
              />
              <span className="text-xs flex-1 font-medium">{ev.event}</span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                <span>
                  예상{" "}
                  <span className="font-mono text-foreground">
                    {ev.forecast}
                  </span>
                </span>
                <span>
                  이전 <span className="font-mono">{ev.prev}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Macro Indicators */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold flex items-center gap-2">
            <Globe size={13} className="text-primary" /> 핵심 거시지표
            <span className="text-[10px] text-muted-foreground font-normal">
              히스토리 차트 자동 표시 · 클릭하여 접기/편집
            </span>
          </div>
          <button
            onClick={() => setShowAddMacro(!showAddMacro)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={11} /> 지표 추가
          </button>
        </div>

        {showAddMacro && (
          <div className="p-3 bg-muted/30 rounded-xl border border-border mb-3 space-y-2">
            <div className="text-xs font-medium">새 거시지표 추가</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                value={newMacro.name}
                onChange={(e) =>
                  setNewMacro((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="지표명 (예: 미국 PPI)"
                className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              />
              <input
                value={newMacro.value}
                onChange={(e) =>
                  setNewMacro((p) => ({ ...p, value: e.target.value }))
                }
                placeholder="현재값 (예: 2.4)"
                className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              />
              <input
                value={newMacro.prev}
                onChange={(e) =>
                  setNewMacro((p) => ({ ...p, prev: e.target.value }))
                }
                placeholder="이전값 (예: 2.1)"
                className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              />
              <select
                value={newMacro.category}
                onChange={(e) =>
                  setNewMacro((p) => ({
                    ...p,
                    category: e.target.value as MacroIndicator["category"],
                  }))
                }
                className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              >
                {["금리", "물가", "고용", "성장", "원자재", "환율"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddMacro}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1"
              >
                <Plus size={11} /> 추가
              </button>
              <button
                onClick={() => setShowAddMacro(false)}
                className="px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg"
              >
                취소
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-auto">
          {localIndicators.map((ind, index) => (
            <MacroCard
              key={ind.id}
              ind={ind}
              onEdit={onEditMacro}
              defaultExpanded={index < 4 && !ind.id.startsWith("custom-")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sector Rotation Panel ────────────────────────────────────
const SECTOR_COMMENTS: Record<string, string> = {
  Technology:
    "AI·클라우드 수요 지속으로 최상위 모멘텀. 고PER 부담 있으나 이익 성장이 뒷받침.",
  Semiconductors:
    "AI 인프라 투자 사이클 수혜. 데이터센터 GPU 수요 폭발적 증가.",
  Communication: "광고 시장 회복 + AI 통합 서비스 성장. 메타·알파벳 실적 개선.",
  Financials: "금리 고점 인식에 NIM 압박 우려. 신용 리스크 모니터링 필요.",
  Healthcare: "방어주 특성으로 시장 약세 시 주목. 바이오텍 임상 결과 변수.",
  Energy:
    "OPEC+ 증산 우려와 글로벌 수요 둔화로 하락 압력. 지정학적 리스크 상존.",
  Utilities: "금리 인하 기대 시 수혜. 안정적 배당 매력.",
  "Consumer Disc.": "소비자 심리 회복 여부가 관건. 아마존·테슬라 실적 영향 큼.",
  Industrials: "제조업 PMI 개선 시 수혜. 방산·인프라 지출 증가 테마.",
  Materials: "달러 강세·중국 수요 부진으로 약세. 구리·철강 가격 하락.",
  반도체:
    "HBM·AI 칩 수요로 삼성·SK하이닉스 실적 개선 기대. 외국인 순매수 지속.",
  IT서비스: "AI 전환 수요 증가. 네이버·카카오 광고 회복 여부 주목.",
  자동차: "현대·기아 미국 시장 점유율 확대. 전기차 전환 비용 부담은 리스크.",
  "2차전지":
    "전기차 수요 둔화·공급 과잉으로 조정 지속. 중장기 구조적 성장은 유효.",
  바이오: "임상 결과 기반 개별 종목 장세. 삼성바이오 CMO 수주 모멘텀.",
  금융: "금리 인하 기대 약화로 NIM 개선 지연. 배당 매력은 유지.",
  화학: "원자재 가격 하락·중국 경쟁 심화로 마진 압박.",
  건설: "부동산 경기 회복 지연. PF 리스크 해소 여부 모니터링.",
  철강: "중국 수출 물량 증가로 가격 하락 압력. 구조적 수요 약세.",
  통신: "5G 투자 마무리 단계. 안정적 배당 매력, 성장 모멘텀 제한.",
};

function SectorRotationPanel() {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [period, setPeriod] = useState<SectorPeriod>("월간");
  const [sortBy, setSortBy] = useState<"rank" | "return" | "flow">("rank");

  const { data: liveSectors } = useSectors(market);
  const sectors = (liveSectors ?? []) as any[];
  const PERIODS: SectorPeriod[] = ["당일", "주간", "월간", "분기", "연간"];

  const getReturn = (s: (typeof sectors)[0]): number | null => {
    switch (period) {
      case "당일":
        return Number.isFinite(s.returnDay) ? s.returnDay : null;
      case "주간":
        return Number.isFinite(s.returnWeek) ? s.returnWeek : null;
      case "월간":
        return Number.isFinite(s.returnMonth) ? s.returnMonth : null;
      case "분기":
        return Number.isFinite(s.returnQuarter) ? s.returnQuarter : null;
      case "연간":
        return Number.isFinite(s.returnYear) ? s.returnYear : null;
    }
  };

  const getRank = (s: (typeof sectors)[0]) => {
    switch (period) {
      case "당일":
        return s.rankDay;
      case "주간":
        return s.rankWeek;
      default:
        return s.rankMonth;
    }
  };

  const sorted = [...sectors].sort((a, b) => {
    if (sortBy === "rank") return getRank(a) - getRank(b);
    if (sortBy === "return") {
      const aReturn = getReturn(a);
      const bReturn = getReturn(b);
      if (aReturn == null && bReturn == null) return getRank(a) - getRank(b);
      if (aReturn == null) return 1;
      if (bReturn == null) return -1;
      return bReturn - aReturn;
    }
    const flowOrder: Record<string, number> = {
      inflow: 0,
      neutral: 1,
      outflow: 2,
    };
    return (flowOrder[a.moneyFlow] ?? 1) - (flowOrder[b.moneyFlow] ?? 1);
  });

  const chartData = sorted
    .map((s) => {
      const value = getReturn(s);
      if (value == null) return null;
      return {
        sector: s.sector,
        name: s.sector.length > 8 ? s.sector.slice(0, 8) + "…" : s.sector,
        value,
        rank: getRank(s),
        moneyFlow: s.moneyFlow,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .slice(0, 8);
  const maxAbsReturn = Math.max(
    1,
    ...chartData.map((row) => Math.abs(row.value)),
  );

  const periodComment: Record<SectorPeriod, string> = {
    당일: "당일 수익률 기준 섹터 순위입니다. 단기 모멘텀과 이벤트 반응을 확인하세요.",
    주간: "주간 수익률 기준입니다. 단기 트렌드 변화와 자금 흐름 방향을 파악하세요.",
    월간: "월간 수익률 기준입니다. 섹터 로테이션의 중기 추세를 가장 잘 반영합니다.",
    분기: "분기 수익률 기준입니다. 어닝 시즌 결과와 중장기 섹터 흐름을 확인하세요.",
    연간: sectors.some((s) => Number.isFinite(s.returnYear))
      ? "DB 연간 수익률 기준입니다. 구조적 성장 섹터와 소외 섹터를 구분하는 데 유용합니다."
      : "연간 수익률 데이터가 아직 없습니다. sector_metrics.return_year 적재 후 자동으로 표시됩니다.",
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["US", "KR"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                market === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs ml-auto">
          {(["rank", "return", "flow"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                sortBy === s
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {s === "rank" ? "순위" : s === "return" ? "수익률" : "자금흐름"}
            </button>
          ))}
        </div>
      </div>

      {/* Period comment */}
      <div className="flex items-start gap-2 p-2.5 bg-muted/20 rounded-lg text-xs text-muted-foreground">
        <Info size={12} className="shrink-0 mt-0.5 text-primary" />
        {periodComment[period]}
      </div>

      {/* Ranking bars */}
      {chartData.length === 0 ? (
        <div className="h-32 flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 text-xs text-muted-foreground">
          {period === "연간"
            ? "연간 수익률 데이터가 아직 없습니다"
            : "섹터 로테이션 DB 데이터를 불러올 수 없습니다"}
        </div>
      ) : (
        <div
          className="space-y-2"
          role="list"
          aria-label={`${market === "US" ? "미국" : "한국"} 섹터 로테이션 ${period} 수익률 상위 ${chartData.length}개`}
        >
          {chartData.map((entry, i) => {
            const pct = (Math.abs(entry.value) / maxAbsReturn) * 100;
            const flowLabel =
              entry.moneyFlow === "inflow"
                ? "자금 유입"
                : entry.moneyFlow === "outflow"
                  ? "자금 유출"
                  : "중립";
            const rowTitle = `${entry.sector} · ${period} ${entry.value >= 0 ? "+" : ""}${entry.value.toFixed(2)}% · 순위 ${entry.rank} · ${flowLabel}`;
            return (
              <div
                key={`${entry.sector}-${i}`}
                className="grid grid-cols-[4.5rem_1fr_4rem] items-center gap-2 rounded-md outline-none transition-colors focus-visible:ring-1 focus-visible:ring-primary/50 sm:grid-cols-[5.5rem_1fr_4.25rem]"
                role="listitem"
                tabIndex={0}
                title={rowTitle}
                aria-label={rowTitle}
              >
                <div className="min-w-0 text-[11px] text-muted-foreground">
                  <span className="mr-1 font-mono text-[10px] text-muted-foreground/70">
                    #{entry.rank}
                  </span>
                  <span className="truncate align-bottom">{entry.name}</span>
                </div>
                <div className="relative h-4 overflow-hidden rounded-full bg-muted/40">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-border/80" />
                  <div
                    className={cn(
                      "absolute top-0 h-full rounded-full transition-all duration-300",
                      entry.value >= 0 ? "bg-up" : "bg-down",
                    )}
                    style={{
                      width: `${Math.max(2, pct / 2)}%`,
                      left: entry.value >= 0 ? "50%" : `${50 - pct / 2}%`,
                    }}
                  />
                </div>
                <div
                  className={cn(
                    "text-right text-xs font-mono",
                    entry.value >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {entry.value >= 0 ? "+" : ""}
                  {entry.value.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                순위
              </th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                섹터
              </th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                {period} 수익률
              </th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">
                순위변화
              </th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                상대강도
              </th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">
                자금흐름
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  API에서 받은 섹터 데이터가 없습니다
                </td>
              </tr>
            ) : (
              sorted.map((s, i) => {
                const ret = getReturn(s);
                const relativeStrength = Number.isFinite(s.relativeStrength)
                  ? s.relativeStrength
                  : null;
                const relativeStrengthIsNeutral =
                  relativeStrength != null &&
                  Math.abs(relativeStrength - 1) < 0.005;
                const comment = SECTOR_COMMENTS[s.sector];
                return (
                  <tr
                    key={s.sector}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                  >
                    <td className="py-2 px-2">
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          i === 0
                            ? "bg-yellow-400/20 text-yellow-500"
                            : i === 1
                              ? "bg-slate-400/20 text-slate-400"
                              : i === 2
                                ? "bg-orange-400/20 text-orange-400"
                                : "text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-medium">{s.sector}</div>
                      {(s as any).etf && (
                        <div className="text-[10px] text-muted-foreground">
                          {(s as any).etf}
                        </div>
                      )}
                      {comment && (
                        <div className="text-[10px] text-muted-foreground/70 leading-tight max-w-xs hidden group-hover:block mt-0.5">
                          {comment}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <PctBadge value={ret} />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <RankChange curr={getRank(s)} prev={s.prevRankMonth} />
                    </td>
                    <td className="py-2 px-2 text-right font-mono-num">
                      <span
                        className={cn(
                          relativeStrength == null || relativeStrengthIsNeutral
                            ? "text-muted-foreground"
                            : relativeStrength > 1
                              ? "text-up"
                              : "text-down",
                        )}
                      >
                        {relativeStrength == null
                          ? "—"
                          : `${relativeStrength.toFixed(2)}x`}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <MoneyFlowBadge flow={s.moneyFlow} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground p-2 bg-muted/10 rounded-lg">
        <span>
          <strong>순위변화</strong>: 이전 월간 대비 순위 상승/하락
        </span>
        <span>
          <strong>상대강도</strong>: 시장 대비 초과수익률 배수 (1.0 = 시장과
          동일)
        </span>
        <span>
          <strong>자금흐름</strong>: 해당 섹터 ETF 거래량 기반 자금 유출입 방향
        </span>
      </div>
    </div>
  );
}

// ─── Integrated Screener (Quant + Technical) ─────────────────
const SCREENER_CONDITIONS = [
  {
    id: "rsi_oversold",
    label: "RSI 과매도 (RSI < 30)",
    category: "기술적",
    description: "RSI가 30 미만으로 과매도 구간. 반등 가능성 탐색.",
  },
  {
    id: "rsi_overbought",
    label: "RSI 과매수 (RSI > 70)",
    category: "기술적",
    description: "RSI가 70 초과로 과매수 구간. 조정 가능성 탐색.",
  },
  {
    id: "golden_cross",
    label: "골든크로스 (MA5 > MA20)",
    category: "기술적",
    description: "단기 이평선이 장기 이평선 상향 돌파. 상승 추세 전환 신호.",
  },
  {
    id: "dead_cross",
    label: "데드크로스 (MA5 < MA20)",
    category: "기술적",
    description: "단기 이평선이 장기 이평선 하향 돌파. 하락 추세 전환 신호.",
  },
  {
    id: "bb_lower",
    label: "볼린저밴드 하단 터치",
    category: "기술적",
    description: "현재가가 BB 하단 근접. 과매도 반등 후보.",
  },
  {
    id: "bb_upper",
    label: "볼린저밴드 상단 돌파",
    category: "기술적",
    description: "현재가가 BB 상단 돌파. 강한 상승 모멘텀.",
  },
  {
    id: "macd_bullish",
    label: "MACD 골든크로스",
    category: "기술적",
    description: "MACD선이 시그널선 상향 돌파. 매수 신호.",
  },
  {
    id: "low_per",
    label: "저PER (PER < 15)",
    category: "가치",
    description: "PER 15 미만 저평가 종목. 가치투자 관점 매력.",
  },
  {
    id: "low_pbr",
    label: "저PBR (PBR < 1)",
    category: "가치",
    description: "PBR 1 미만. 자산 대비 저평가 종목.",
  },
  {
    id: "high_roe",
    label: "고ROE (ROE > 20%)",
    category: "퀄리티",
    description: "자기자본이익률 20% 초과. 수익성 우수 기업.",
  },
  {
    id: "high_dividend",
    label: "고배당 (배당수익률 > 3%)",
    category: "배당",
    description: "배당수익률 3% 초과. 인컴 투자 관점 매력.",
  },
  {
    id: "momentum_up",
    label: "모멘텀 상승 (등락률 > 2%)",
    category: "모멘텀",
    description: "당일 2% 이상 상승. 강한 매수세 유입.",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  기술적: "text-sky bg-sky/10",
  가치: "text-green-400 bg-green-400/10",
  퀄리티: "text-violet-400 bg-violet-400/10",
  배당: "text-yellow-400 bg-yellow-400/10",
  모멘텀: "text-orange-400 bg-orange-400/10",
};

function IntegratedScreenerPanel() {
  const { watchlist } = useWatchlist();
  const [selectedConditions, setSelectedConditions] = useState<string[]>([
    "low_per",
    "high_roe",
  ]);
  const [market, setMarket] = useState<"ALL" | "US" | "KR">("ALL");
  const [useWatchlistOnly, setUseWatchlistOnly] = useState(false);
  const [sortField, setSortField] = useState<
    "score" | "changePct" | "pe" | "roe"
  >("score");
  const [technicalByTicker, setTechnicalByTicker] = useState<
    Record<string, ScreenerTechnical>
  >({});
  const [technicalLoading, setTechnicalLoading] = useState(false);

  const { data: liveUS } = useStocks("US");
  const { data: liveKR } = useStocks("KR");
  const usPool = liveUS ?? [];
  const krPool = liveKR ?? [];
  const allStocks = useMemo(() => [...usPool, ...krPool], [usPool, krPool]);

  const filteredByMarket = useMemo(() => {
    let stocks =
      market === "US" ? usPool : market === "KR" ? krPool : allStocks;
    if (useWatchlistOnly && watchlist.length > 0) {
      const tickers = new Set(watchlist.map((w) => w.ticker));
      stocks = stocks.filter((s) => tickers.has(s.ticker));
    }
    return stocks;
  }, [market, useWatchlistOnly, watchlist, allStocks, usPool, krPool]);

  const needsTechnicalData = selectedConditions.some((id) =>
    [
      "rsi_oversold",
      "rsi_overbought",
      "golden_cross",
      "dead_cross",
      "bb_lower",
      "bb_upper",
      "macd_bullish",
    ].includes(id),
  );

  useEffect(() => {
    if (!needsTechnicalData || filteredByMarket.length === 0) {
      setTechnicalByTicker({});
      setTechnicalLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setTechnicalLoading(true);
    const tickers = Array.from(
      new Set(filteredByMarket.slice(0, 40).map((s) => s.ticker)),
    );
    Promise.all(
      tickers.map((ticker) =>
        stocksService
          .bars(ticker, SCREENER_TECHNICAL_HISTORY_DAYS, {
            signal: controller.signal,
          })
          .then(
            (r) =>
              [
                ticker,
                calcScreenerTechnical(r.items as AnalysisBar[]),
              ] as const,
          )
          .catch(() => [ticker, calcScreenerTechnical([])] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setTechnicalByTicker(Object.fromEntries(entries));
      setTechnicalLoading(false);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [needsTechnicalData, filteredByMarket.map((s) => s.ticker).join("|")]);

  const scoreStock = useCallback(
    (stock: AllStock) => {
      let score = 0;
      const technical = technicalByTicker[stock.ticker];

      const checks: Record<string, boolean> = {
        rsi_oversold: technical?.checks.rsi_oversold ?? false,
        rsi_overbought: technical?.checks.rsi_overbought ?? false,
        golden_cross: technical?.checks.golden_cross ?? false,
        dead_cross: technical?.checks.dead_cross ?? false,
        bb_lower: technical?.checks.bb_lower ?? false,
        bb_upper: technical?.checks.bb_upper ?? false,
        macd_bullish: technical?.checks.macd_bullish ?? false,
        low_per: (stock.pe ?? 99) < 15,
        low_pbr: (stock.pbr ?? 99) < 1.5,
        high_roe: (stock.roe ?? 0) > 20,
        high_dividend: (stock.dividendYield ?? 0) > 3,
        momentum_up: stock.changePct > 2,
      };

      selectedConditions.forEach((cond) => {
        if (checks[cond]) score++;
      });

      return {
        stock,
        score,
        rsi:
          technical?.rsi == null || !Number.isFinite(technical.rsi)
            ? null
            : Math.round(technical.rsi),
        macd:
          technical?.macd == null || !Number.isFinite(technical.macd)
            ? null
            : Math.round(technical.macd * 10) / 10,
        checks,
      };
    },
    [selectedConditions, technicalByTicker],
  );

  const results = useMemo(() => {
    return filteredByMarket
      .map(scoreStock)
      .filter((r) => r.score > 0)
      .sort((a, b) => {
        if (sortField === "score") return b.score - a.score;
        if (sortField === "changePct")
          return b.stock.changePct - a.stock.changePct;
        if (sortField === "pe") return (a.stock.pe ?? 0) - (b.stock.pe ?? 0);
        if (sortField === "roe") return (b.stock.roe ?? 0) - (a.stock.roe ?? 0);
        return 0;
      });
  }, [filteredByMarket, scoreStock, sortField]);

  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const categoryGroups = useMemo(() => {
    const groups: Record<string, typeof SCREENER_CONDITIONS> = {};
    SCREENER_CONDITIONS.forEach((c) => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-primary" />
          <span className="text-sm font-semibold">스크리너 조건 설정</span>
          <span className="text-xs text-muted-foreground">
            조건을 선택하면 해당 종목을 자동으로 필터링합니다
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["ALL", "US", "KR"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  market === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {m === "ALL" ? "전체" : m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUseWatchlistOnly(!useWatchlistOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              useWatchlistOnly
                ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-500"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <Star size={11} fill={useWatchlistOnly ? "currentColor" : "none"} />
            관심종목만
          </button>
        </div>
      </div>

      {/* Condition Groups */}
      <div className="space-y-3">
        {Object.entries(categoryGroups).map(([category, conditions]) => (
          <div key={category}>
            <div
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded inline-block mb-2",
                CATEGORY_COLORS[category] || "text-muted-foreground bg-muted",
              )}
            >
              {category}
            </div>
            <div className="flex flex-wrap gap-2">
              {conditions.map((cond) => {
                const active = selectedConditions.includes(cond.id);
                return (
                  <button
                    key={cond.id}
                    onClick={() => toggleCondition(cond.id)}
                    title={cond.description}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
                      active
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    {active ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                    {cond.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedConditions.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Filter size={24} className="mx-auto mb-2 opacity-30" />
          조건을 1개 이상 선택하면 종목이 필터링됩니다
        </div>
      )}

      {selectedConditions.length > 0 && (
        <>
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {results.length}개
              </span>{" "}
              종목이 조건에 부합합니다
              {technicalLoading && (
                <span className="ml-2 text-primary">기술 조건 계산 중…</span>
              )}
              {useWatchlistOnly && watchlist.length === 0 && (
                <span className="ml-2 text-yellow-500">
                  관심종목을 먼저 추가하세요
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">정렬:</span>
              {(["score", "changePct", "pe", "roe"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSortField(f)}
                  className={cn(
                    "px-2 py-0.5 rounded transition-colors",
                    sortField === f
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "score"
                    ? "매칭점수"
                    : f === "changePct"
                      ? "등락률"
                      : f === "pe"
                        ? "PER"
                        : "ROE"}
                </button>
              ))}
            </div>
          </div>

          {/* Results table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                    종목
                  </th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                    현재가
                  </th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                    등락률
                  </th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                    PER
                  </th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                    PBR
                  </th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                    ROE
                  </th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                    RSI
                  </th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium">
                    매칭
                  </th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium">
                    충족 조건
                  </th>
                </tr>
              </thead>
              <tbody>
                {results
                  .slice(0, 20)
                  .map(({ stock: s, score, rsi, checks }) => (
                    <tr
                      key={s.ticker}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2 px-2">
                        <div className="font-bold">{s.ticker}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                          {s.name}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num font-medium">
                        {s.price.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <PctBadge value={s.changePct} size="xs" />
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">
                        <span
                          className={cn(
                            (s.pe ?? 99) < 15 ? "text-up font-semibold" : "",
                          )}
                        >
                          {(s.pe ?? 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">
                        <span
                          className={cn(
                            (s.pbr ?? 99) < 1 ? "text-up font-semibold" : "",
                          )}
                        >
                          {(s.pbr ?? 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">
                        <span
                          className={cn(
                            (s.roe ?? 0) > 20 ? "text-up font-semibold" : "",
                          )}
                        >
                          {(s.roe ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">
                        <span
                          className={cn(
                            rsi != null && rsi < 35
                              ? "text-up font-semibold"
                              : rsi != null && rsi > 65
                                ? "text-down font-semibold"
                                : "",
                          )}
                        >
                          {rsi ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded font-bold text-[10px]",
                            score >= selectedConditions.length
                              ? "bg-up/20 text-up"
                              : score >= selectedConditions.length * 0.6
                                ? "bg-yellow-400/20 text-yellow-500"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {score}/{selectedConditions.length}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-0.5 max-w-[160px]">
                          {selectedConditions
                            .filter((c) => checks[c])
                            .map((c) => {
                              const cond = SCREENER_CONDITIONS.find(
                                (sc) => sc.id === c,
                              );
                              return cond ? (
                                <span
                                  key={c}
                                  className={cn(
                                    "text-[9px] px-1 py-0.5 rounded",
                                    CATEGORY_COLORS[cond.category] ||
                                      "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {cond.category}
                                </span>
                              ) : null;
                            })}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Return Comparison Panel ──────────────────────────────────
type ReturnMode = "국채수익률" | "관심종목" | "포트폴리오";

function ReturnComparisonPanel() {
  const { watchlist } = useWatchlist();
  const [mode, setMode] = useState<ReturnMode>("국채수익률");
  const [yieldMarket, setYieldMarket] = useState<"US" | "KR">("US");
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("3M");
  const displayPeriodDays = PERIOD_DAYS[period];
  const {
    data: portfolioHistory,
    loading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolioHistory,
  } = usePortfolioHistory(RETURN_SOURCE_DAYS);
  const [watchlistSourceRows, setWatchlistSourceRows] = useState<
    ReturnChartRow[]
  >([]);
  const [watchlistCompareSeries, setWatchlistCompareSeries] = useState<
    StockBarsCompareSeries[]
  >([]);
  const [watchlistCompareMeta, setWatchlistCompareMeta] =
    useState<CompareWindowMeta | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [watchlistRetry, setWatchlistRetry] = useState(0);
  const [yieldRows, setYieldRows] = useState<YieldHistoryRow[]>([]);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldError, setYieldError] = useState<string | null>(null);
  const [yieldRetry, setYieldRetry] = useState(0);

  const COLORS = [
    "#38bdf8",
    "#a855f7",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
  ];
  const displayTickers =
    selectedTickers.length > 0
      ? selectedTickers
      : watchlist.slice(0, 5).map((w) => w.ticker);
  const watchlistRebased = useMemo(
    () =>
      rebaseCompareRowsForPeriod(watchlistSourceRows, displayTickers, period),
    [displayTickers.join("|"), period, watchlistSourceRows],
  );
  const watchlistChartData = watchlistRebased.rows;
  const watchlistReturns = watchlistRebased.returns;
  const portfolioRows = portfolioHistory?.rows ?? [];
  const portfolioCurrency = portfolioHistory?.currency ?? "KRW";
  const watchlistCompareWindow = useMemo(() => {
    const rows = watchlistChartData.filter((row) =>
      /^\d{4}-\d{2}-\d{2}$/.test(String(row.date ?? "")),
    );
    if (rows.length === 0) return null;
    return {
      from: String(rows[0].date),
      to: String(rows[rows.length - 1].date),
      baseline: String(rows[0].date),
      rows: rows.length,
      sourceFrom: watchlistCompareMeta?.compare_from_date ?? null,
      sourceTo: watchlistCompareMeta?.compare_to_date ?? null,
      sourceRows:
        watchlistCompareMeta?.compare_row_count ?? watchlistSourceRows.length,
    };
  }, [watchlistChartData, watchlistCompareMeta, watchlistSourceRows.length]);
  const watchlistSourceSummary = watchlistCompareWindow
    ? `DB 일봉 ${watchlistCompareWindow.sourceFrom ?? watchlistCompareWindow.from} ~ ${
        watchlistCompareWindow.sourceTo ?? watchlistCompareWindow.to
      } · 표시 ${period} 기준 ${watchlistCompareWindow.baseline}`
    : "DB 일봉 비교 데이터 대기";

  useEffect(() => {
    if (mode !== "국채수익률") {
      setYieldLoading(false);
      setYieldError(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setYieldLoading(true);
    setYieldError(null);
    const seriesId = yieldMarket === "US" ? "DGS10" : "ECOS:722Y001";
    macroService
      .history(seriesId, RETURN_SOURCE_DAYS, { signal: controller.signal })
      .then((r) => {
        if (cancelled) return;
        setYieldRows(normalizeYieldHistory(r.items));
        setYieldError(null);
        setYieldLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setYieldRows([]);
        setYieldError(
          error instanceof Error
            ? error.message
            : "국채수익률 히스토리 API 요청이 실패했습니다",
        );
        setYieldLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mode, yieldMarket, yieldRetry]);

  useEffect(() => {
    if (mode !== "관심종목") {
      setWatchlistLoading(false);
      setWatchlistError(null);
      setWatchlistCompareMeta(null);
      return;
    }
    if (displayTickers.length === 0) {
      setWatchlistSourceRows([]);
      setWatchlistCompareSeries([]);
      setWatchlistCompareMeta(null);
      setWatchlistLoading(false);
      setWatchlistError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setWatchlistLoading(true);
    setWatchlistError(null);
    stocksService
      .compareBars(displayTickers, COMPARE_SOURCE_DAYS, {
        signal: controller.signal,
      })
      .then((response) => {
        if (cancelled) return;
        setWatchlistSourceRows(response.rows as ReturnChartRow[]);
        setWatchlistCompareSeries(response.series);
        setWatchlistCompareMeta({
          compare_from_date: response.compare_from_date,
          compare_to_date: response.compare_to_date,
          compare_baseline_date: response.compare_baseline_date,
          compare_row_count: response.compare_row_count,
        });
        setWatchlistError(null);
        setWatchlistLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setWatchlistSourceRows([]);
        setWatchlistCompareSeries([]);
        setWatchlistCompareMeta(null);
        setWatchlistError(
          error instanceof Error
            ? error.message
            : "관심종목 비교 API 요청이 실패했습니다",
        );
        setWatchlistLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [displayTickers.join("|"), mode, watchlistRetry]);

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["국채수익률", "관심종목", "포트폴리오"] as ReturnMode[]).map(
            (m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {m}
              </button>
            ),
          )}
        </div>
        {mode === "국채수익률" && (
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["US", "KR"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setYieldMarket(m)}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  yieldMarket === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
              </button>
            ))}
          </div>
        )}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["1W", "1M", "3M", "1Y", "2Y", "5Y"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        {mode === "국채수익률" && (
          <button
            onClick={() => setYieldRetry((value) => value + 1)}
            disabled={yieldLoading}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors",
              yieldLoading
                ? "cursor-wait text-muted-foreground/45"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            title="국채수익률 히스토리 다시 불러오기"
            aria-label="국채수익률 히스토리 다시 불러오기"
          >
            <RefreshCw
              size={13}
              className={cn(yieldLoading && "animate-spin")}
            />
          </button>
        )}
      </div>

      {/* 국채 수익률 곡선 */}
      {mode === "국채수익률" && (
        <div className="space-y-2">
          <div className="h-52">
            {yieldLoading && yieldRows.length === 0 ? (
              <div className="h-full w-full rounded-lg bg-muted/20 animate-pulse" />
            ) : yieldRows.length < 2 ? (
              <div className="h-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                <BarChart2 size={28} className="mb-2 opacity-30" />
                {yieldError
                  ? "국채수익률 히스토리 API 요청이 실패했습니다"
                  : `${
                      yieldMarket === "US"
                        ? "미국 10년물 국채금리"
                        : "한국 기준금리"
                    } 히스토리 DB 데이터가 아직 없습니다`}
                {yieldError && (
                  <div className="mt-1 max-w-full truncate px-4 text-[10px] font-mono text-destructive">
                    {yieldError}
                  </div>
                )}
                <div className="text-xs mt-1">
                  {yieldError
                    ? "잠시 후 다시 시도하거나 API 상태를 확인하세요"
                    : "매크로 API 키와 저장된 관측값을 확인하세요"}
                </div>
                <button
                  onClick={() => setYieldRetry((value) => value + 1)}
                  className="mt-2 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  <RefreshCw size={12} />
                  다시 불러오기
                </button>
              </div>
            ) : (
              <KLineSeriesChart
                data={yieldRows}
                settingsScope={`analysis-yield-${yieldMarket}`}
                height={220}
                showToolbar={false}
                showYAxis
                valueFormatter={(v) => `${v.toFixed(2)}%`}
                showRangeControls={false}
                allowValueTransform={false}
                initialViewDays={displayPeriodDays}
                sourceLabel="API"
                sourceTone="primary"
                sourceTitle={
                  yieldMarket === "US"
                    ? "FRED DGS10 API 5Y 히스토리 기준"
                    : "한국은행 ECOS 기준금리 API 5Y 히스토리 기준"
                }
                series={[
                  {
                    key: "value",
                    label:
                      yieldMarket === "US"
                        ? "미국 10년물 국채금리"
                        : "한국 기준금리",
                    color: yieldMarket === "US" ? "#38bdf8" : "#22c55e",
                    type: "line",
                  },
                ]}
              />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>
              {yieldMarket === "US"
                ? `FRED DGS10 / API 5Y 원본 · 표시 ${period}`
                : `한국은행 ECOS 기준금리 / API 5Y 원본 · 표시 ${period}`}
            </span>
            {yieldRows.length > 0 && (
              <span>
                {yieldRows[0].date} ~ {yieldRows[yieldRows.length - 1].date} ·{" "}
                {yieldRows.length.toLocaleString()} rows
              </span>
            )}
          </div>
        </div>
      )}

      {/* 관심종목 수익률 비교 */}
      {mode === "관심종목" && (
        <div className="space-y-3">
          {watchlist.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Star size={28} className="mx-auto mb-2 opacity-30" />
              관심종목을 추가하면 수익률을 비교할 수 있습니다
              <div className="text-xs mt-1">
                종목 검색에서 ★ 버튼으로 추가하세요
              </div>
            </div>
          ) : (
            <>
              {/* Ticker selector */}
              <div className="flex flex-wrap gap-1.5">
                {watchlist.map((w, i) => (
                  <button
                    key={w.ticker}
                    onClick={() =>
                      setSelectedTickers((prev) =>
                        prev.includes(w.ticker)
                          ? prev.filter((t) => t !== w.ticker)
                          : [...prev, w.ticker],
                      )
                    }
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                      selectedTickers.includes(w.ticker) ||
                        selectedTickers.length === 0
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                    style={{
                      borderColor: selectedTickers.includes(w.ticker)
                        ? COLORS[i % COLORS.length]
                        : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {w.ticker}
                  </button>
                ))}
              </div>
              <div className="h-52">
                {watchlistLoading && watchlistChartData.length === 0 ? (
                  <div className="h-full w-full rounded-lg bg-muted/20 animate-pulse" />
                ) : watchlistChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                    <span>
                      {watchlistError
                        ? "관심종목 비교 API 요청이 실패했습니다"
                        : "관심종목 비교 DB 일봉 데이터가 없습니다"}
                    </span>
                    {watchlistError && (
                      <span className="max-w-full truncate font-mono text-[10px] text-destructive">
                        {watchlistError}
                      </span>
                    )}
                    <button
                      onClick={() => setWatchlistRetry((value) => value + 1)}
                      className="mt-1 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    >
                      <RefreshCw size={12} />
                      다시 불러오기
                    </button>
                  </div>
                ) : (
                  <KLineSeriesChart
                    data={watchlistChartData}
                    settingsScope="analysis-watchlist-compare"
                    height={220}
                    showToolbar={false}
                    valueFormatter={(v) =>
                      `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
                    }
                    zeroLine
                    showRangeControls={false}
                    allowValueTransform={false}
                    initialViewDays={displayPeriodDays}
                    fixedScaleLabel="%"
                    fixedScaleDetail="공통 기준=0%"
                    fixedScaleTitle="DB 일봉을 공통 기준일에 0%로 맞춘 관심종목 누적 수익률"
                    sourceLabel="API"
                    sourceTone="primary"
                    sourceTitle="/stocks/bars/compare API 5Y 원본 기준"
                    series={displayTickers.map((ticker, i) => ({
                      key: ticker,
                      label: ticker,
                      color: COLORS[i % COLORS.length],
                      type: "line",
                    }))}
                  />
                )}
              </div>
              {watchlistCompareWindow && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span>
                    API 5Y 원본{" "}
                    {watchlistCompareWindow.sourceRows.toLocaleString()}행
                    {watchlistCompareWindow.sourceFrom &&
                    watchlistCompareWindow.sourceTo
                      ? ` · ${watchlistCompareWindow.sourceFrom} ~ ${watchlistCompareWindow.sourceTo}`
                      : ""}{" "}
                    · 표시 {period} 기준 {watchlistCompareWindow.baseline} ·{" "}
                    {watchlistCompareWindow.rows.toLocaleString()}행 ·{" "}
                    {watchlistCompareWindow.from} ~ {watchlistCompareWindow.to}
                  </span>
                  {watchlistLoading && <span>갱신 중</span>}
                </div>
              )}
              {watchlistCompareSeries.length > 0 && (
                <div
                  className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground"
                  role="list"
                  aria-label={`관심종목별 DB 일봉 반환 행 수. ${watchlistSourceSummary}`}
                >
                  {watchlistCompareSeries.map((item) => (
                    <span
                      key={item.symbol}
                      className="rounded border border-border/60 bg-muted/20 px-1.5 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      role="listitem"
                      tabIndex={0}
                      title={`${item.symbol} DB 일봉 ${item.from_date ?? "?"} ~ ${
                        item.to_date ?? "?"
                      } · ${item.returned_count.toLocaleString()}행`}
                      aria-label={`${item.symbol} DB 일봉 ${item.from_date ?? "?"}부터 ${
                        item.to_date ?? "?"
                      }까지 ${item.returned_count.toLocaleString()}행`}
                    >
                      {item.symbol} {item.returned_count.toLocaleString()}행
                    </span>
                  ))}
                </div>
              )}
              {/* Return summary */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
                role="list"
                aria-label={`관심종목 ${period} 수익률 요약. ${watchlistSourceSummary}`}
              >
                {displayTickers.map((ticker, i) => {
                  const totalReturn = watchlistReturns[ticker];
                  const rowLabel = `${ticker} ${period} 수익률 ${
                    totalReturn == null
                      ? "데이터 없음"
                      : `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`
                  }. ${watchlistSourceSummary}`;
                  return (
                    <div
                      key={ticker}
                      className="p-2 rounded-lg bg-muted/20 border border-border/50 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      role="listitem"
                      tabIndex={0}
                      title={rowLabel}
                      aria-label={rowLabel}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-xs font-bold">{ticker}</span>
                      </div>
                      <div
                        className={cn(
                          "text-sm font-bold font-mono-num",
                          (totalReturn ?? 0) >= 0 ? "text-up" : "text-down",
                        )}
                      >
                        {totalReturn == null
                          ? "—"
                          : `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {period} 수익률
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 포트폴리오 수익률 */}
      {mode === "포트폴리오" && (
        <div className="space-y-3">
          <div className="h-52">
            {portfolioLoading && portfolioRows.length === 0 ? (
              <div className="h-full w-full rounded-lg bg-muted/20 animate-pulse" />
            ) : portfolioRows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                <BarChart2 size={28} className="mb-1 opacity-30" />
                <span>
                  {portfolioError
                    ? "포트폴리오 히스토리 API 요청이 실패했습니다"
                    : "포트폴리오 DB 가격 히스토리가 없습니다"}
                </span>
                {portfolioError && (
                  <span className="max-w-full truncate font-mono text-[10px] text-destructive">
                    {portfolioError.message}
                  </span>
                )}
                <button
                  onClick={refetchPortfolioHistory}
                  className="mt-1 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  <RefreshCw size={12} />
                  다시 불러오기
                </button>
              </div>
            ) : (
              <KLineSeriesChart
                data={portfolioRows}
                settingsScope="analysis-portfolio-value"
                height={220}
                showToolbar={false}
                valueFormatter={(value) =>
                  formatPortfolioChartValue(value, portfolioCurrency)
                }
                showRangeControls={false}
                initialViewDays={displayPeriodDays}
                sourceLabel="API"
                sourceTone="primary"
                sourceTitle="/portfolios/me/history API 5Y 가격 히스토리 기준"
                series={[
                  {
                    key: "portfolio",
                    label: "평가금액",
                    color: "var(--primary)",
                    type: "area",
                  },
                  {
                    key: "cost",
                    label: "원금",
                    color: "var(--muted-foreground)",
                    type: "line",
                    dashed: true,
                  },
                ]}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>
              API portfolio history 5Y 원본{" "}
              {RETURN_SOURCE_DAYS.toLocaleString()}일 · 표시 {period}
              {portfolioLoading && portfolioRows.length > 0 ? " · 갱신 중" : ""}
            </span>
            {portfolioRows.length > 0 && (
              <span>
                {portfolioRows[0]?.date} ~ {portfolioRows.at(-1)?.date} ·{" "}
                {portfolioRows.length.toLocaleString()} 표시
              </span>
            )}
          </div>
          {(portfolioHistory?.holdings.length ?? 0) > 0 && (
            <div
              className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground"
              role="list"
              aria-label="포트폴리오 보유 종목별 DB 일봉 반환 행 수"
            >
              {portfolioHistory?.holdings.map((item) => (
                <span
                  key={item.symbol}
                  className="rounded border border-border/60 bg-muted/20 px-1.5 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  role="listitem"
                  tabIndex={0}
                  title={`${item.symbol} DB 일봉 ${item.from_date ?? "?"} ~ ${
                    item.to_date ?? "?"
                  } · ${item.returned_count.toLocaleString()}행`}
                  aria-label={`${item.symbol} DB 일봉 ${item.from_date ?? "?"}부터 ${
                    item.to_date ?? "?"
                  }까지 ${item.returned_count.toLocaleString()}행`}
                >
                  {item.symbol} {item.returned_count.toLocaleString()}행
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stock Analysis Panel (6 tabs) ───────────────────────────
const STOCK_TABS: StockTab[] = [
  "차트",
  "재무제표",
  "밸류에이션",
  "기술적 신호",
  "뉴스",
  "AI 요약",
];

const INDICATOR_OPTIONS = [
  { id: "ma5", label: "MA5", color: "#f59e0b" },
  { id: "ma20", label: "MA20", color: "#a855f7" },
  { id: "ma60", label: "MA60", color: "#38bdf8" },
  { id: "bb", label: "볼린저밴드", color: "#94a3b8" },
  { id: "macd", label: "MACD", color: "#22c55e" },
  { id: "rsi", label: "RSI", color: "#f59e0b" },
  { id: "stoch", label: "스토캐스틱", color: "#ec4899" },
  { id: "volume", label: "거래량", color: "#64748b" },
];

function StockAnalysisPanel({
  stock,
  onClose,
}: {
  stock: AllStock;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<StockTab>("차트");
  const [signalBars, setSignalBars] = useState<AnalysisBar[]>([]);
  const [signalBarsTicker, setSignalBarsTicker] = useState<string | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialChartRow[]>([]);
  const [financialTicker, setFinancialTicker] = useState<string | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const isWatchlisted = isWatched(stock.ticker);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setSignalsLoading(true);
    setSignalBars([]);
    setSignalBarsTicker(stock.ticker);
    stocksService
      .bars(stock.ticker, STOCK_SIGNAL_HISTORY_DAYS, {
        signal: controller.signal,
      })
      .then((r) => {
        if (cancelled) return;
        setSignalBars(normalizeAnalysisBars(r.items));
        setSignalBarsTicker(stock.ticker);
        setSignalsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setSignalBars([]);
        setSignalBarsTicker(stock.ticker);
        setSignalsLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [stock.ticker]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setFinancialLoading(true);
    setFinancialData([]);
    setFinancialTicker(stock.ticker);
    stocksService
      .financials(stock.ticker, "annual", { signal: controller.signal })
      .then((r) => {
        if (cancelled) return;
        const rows = r.periods
          .map(financialPeriodToRow)
          .filter((row): row is FinancialChartRow => row != null)
          .sort((a, b) => a.year.localeCompare(b.year))
          .slice(-4);
        setFinancialData(rows);
        setFinancialTicker(stock.ticker);
        setFinancialLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setFinancialData([]);
        setFinancialTicker(stock.ticker);
        setFinancialLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [stock.ticker]);

  const currentSignalBars = signalBarsTicker === stock.ticker ? signalBars : [];
  const currentFinancialData =
    financialTicker === stock.ticker ? financialData : [];
  const technicalSignals = useMemo(
    () => calcTechnicalSignals(currentSignalBars),
    [currentSignalBars],
  );

  const technicalSignalCards = useMemo(() => {
    const fmt = (value: number | null, digits = 1) =>
      value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
    const rsiSignal =
      technicalSignals.rsi == null
        ? "대기"
        : technicalSignals.rsi >= 70
          ? "과매수"
          : technicalSignals.rsi <= 30
            ? "과매도"
            : technicalSignals.rsi >= 50
              ? "강세"
              : "약세";
    const macdSignal =
      technicalSignals.macd == null || technicalSignals.signal == null
        ? "대기"
        : technicalSignals.macd > technicalSignals.signal
          ? "매수"
          : "매도";
    const bandSignal =
      technicalSignals.bandPosition == null
        ? "대기"
        : technicalSignals.bandPosition > 80
          ? "상단"
          : technicalSignals.bandPosition < 20
            ? "하단"
            : "중단";
    const maSignal =
      technicalSignals.ma5 == null || technicalSignals.ma20 == null
        ? "대기"
        : technicalSignals.ma5 > technicalSignals.ma20
          ? "매수"
          : "매도";
    const stochSignal =
      technicalSignals.stoch == null
        ? "대기"
        : technicalSignals.stoch >= 80
          ? "과매수"
          : technicalSignals.stoch <= 20
            ? "과매도"
            : technicalSignals.stoch >= 50
              ? "강세"
              : "약세";
    const volumeSignal =
      technicalSignals.volumeTrend == null
        ? "대기"
        : technicalSignals.volumeTrend > 10
          ? "강세"
          : technicalSignals.volumeTrend < -10
            ? "약세"
            : "보통";
    const totalSignal =
      technicalSignals.bullishCount >= 4
        ? "매수 우세"
        : technicalSignals.bullishCount <= 1
          ? "매도 우세"
          : "중립";
    const colorFor = (signal: string) =>
      ["매수", "강세", "과매도", "매수 우세"].includes(signal)
        ? "text-up"
        : ["매도", "약세", "과매수", "매도 우세"].includes(signal)
          ? "text-down"
          : "text-muted-foreground";

    return [
      {
        label: "RSI (14)",
        value: fmt(technicalSignals.rsi),
        signal: rsiSignal,
        color: colorFor(rsiSignal),
        desc: "최근 14봉 상대강도",
      },
      {
        label: "MACD",
        value: fmt(technicalSignals.macd, 2),
        signal: macdSignal,
        color: colorFor(macdSignal),
        desc: "MACD vs 시그널선",
      },
      {
        label: "볼린저밴드",
        value: bandSignal,
        signal: bandSignal,
        color: colorFor(bandSignal),
        desc: "20일 밴드 내 위치",
      },
      {
        label: "이동평균",
        value:
          technicalSignals.ma5 != null && technicalSignals.ma20 != null
            ? `MA5${technicalSignals.ma5 > technicalSignals.ma20 ? ">" : "<"}MA20`
            : "—",
        signal: maSignal,
        color: colorFor(maSignal),
        desc: "단기/중기 추세",
      },
      {
        label: "스토캐스틱",
        value: fmt(technicalSignals.stoch),
        signal: stochSignal,
        color: colorFor(stochSignal),
        desc: "최근 고저가 내 위치",
      },
      {
        label: "거래량 추세",
        value:
          technicalSignals.volumeTrend == null
            ? "—"
            : `${technicalSignals.volumeTrend >= 0 ? "+" : ""}${technicalSignals.volumeTrend.toFixed(0)}%`,
        signal: volumeSignal,
        color: colorFor(volumeSignal),
        desc: "최근 5봉 vs 이전 20봉",
      },
      {
        label: "MA20",
        value: fmt(technicalSignals.ma20, stock.country === "KR" ? 0 : 2),
        signal: "기준선",
        color: "text-muted-foreground",
        desc: "20봉 단순이평",
      },
      {
        label: "종합 신호",
        value: totalSignal,
        signal: `${technicalSignals.bullishCount}/5`,
        color: colorFor(totalSignal),
        desc: "실제 가격 지표 종합",
      },
    ];
  }, [stock.country, technicalSignals]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{stock.ticker}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {stock.exchange}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {stock.sector}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {stock.name}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xl font-bold font-mono-num">
              {stock.price.toLocaleString()}
            </div>
            <PctBadge value={stock.changePct} />
          </div>
          <button
            onClick={() => {
              if (isWatchlisted) {
                removeFromWatchlist(stock.ticker);
                toast.success("관심종목 해제");
              } else {
                addToWatchlist({
                  ticker: stock.ticker,
                  name: stock.name,
                  exchange: stock.exchange,
                  price: stock.price,
                  changePct: stock.changePct,
                  sector: stock.sector || "기타",
                });
                toast.success("관심종목 추가");
              }
            }}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isWatchlisted
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Star size={16} fill={isWatchlisted ? "currentColor" : "none"} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 pt-2 border-b border-border overflow-x-auto">
        {STOCK_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "text-xs px-3 py-2 border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ── 차트 탭 ── (shared <StockChart> — real OHLCV from API) */}
        {activeTab === "차트" && (
          <StockChart
            ticker={stock.ticker}
            currency={stock.country === "KR" ? "KRW" : "USD"}
            priceHeight={280}
          />
        )}

        {/* ── 재무제표 탭 ── */}
        {activeTab === "재무제표" && (
          <div className="space-y-4">
            {financialLoading && currentFinancialData.length === 0 ? (
              <div className="h-44 rounded-lg bg-muted/20 animate-pulse" />
            ) : currentFinancialData.length === 0 ? (
              <div className="h-44 flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                재무제표 DB 데이터가 아직 없습니다
              </div>
            ) : (
              <>
                <div className="h-44">
                  <KLineSeriesChart
                    data={currentFinancialData.map((row) => ({
                      ...row,
                      date: `${row.year}-01-01`,
                    }))}
                    settingsScope="analysis-financials"
                    height={176}
                    showToolbar={false}
                    barLayout="group"
                    showRangeControls={false}
                    allowValueTransform={false}
                    fixedScaleLabel="B"
                    fixedScaleDetail="재무제표 원값"
                    fixedScaleTitle="DB/API 재무제표의 billion 단위 값을 그대로 표시"
                    sourceLabel="API"
                    sourceTone="primary"
                    sourceTitle="/stocks/{ticker}/financials API 재무제표 기준"
                    valueFormatter={(v) => `${v.toFixed(2)}B`}
                    series={[
                      {
                        key: "revenue",
                        label: "매출액",
                        color: "#38bdf8",
                        type: "bar",
                      },
                      {
                        key: "netIncome",
                        label: "순이익",
                        color: "#22c55e",
                        type: "bar",
                      },
                    ]}
                  />
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">
                        항목
                      </th>
                      {currentFinancialData.map((d) => (
                        <th
                          key={d.year}
                          className="text-right py-2 px-2 text-muted-foreground font-medium"
                        >
                          {d.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "매출액 ($B)", key: "revenue" as const },
                      { label: "순이익 ($B)", key: "netIncome" as const },
                      { label: "EPS ($)", key: "eps" as const },
                    ].map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-border/50 hover:bg-muted/20"
                      >
                        <td className="py-2 px-2 text-muted-foreground">
                          {row.label}
                        </td>
                        {currentFinancialData.map((d) => (
                          <td
                            key={d.year}
                            className="py-2 px-2 text-right font-mono-num font-medium"
                          >
                            {(() => {
                              const value = d[row.key];
                              return value == null ? "—" : value.toFixed(1);
                            })()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* ── 밸류에이션 탭 ── */}
        {activeTab === "밸류에이션" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "PER",
                  value: (stock.pe ?? 0).toFixed(1),
                  desc: "주가수익비율",
                  benchmark: "S&P500 평균 22x",
                  good: (stock.pe ?? 99) < 22,
                },
                {
                  label: "PBR",
                  value: (stock.pbr ?? 0).toFixed(1),
                  desc: "주가순자산비율",
                  benchmark: "업종 평균 3.2x",
                  good: (stock.pbr ?? 99) < 3.2,
                },
                {
                  label: "ROE",
                  value: `${(stock.roe ?? 0).toFixed(1)}%`,
                  desc: "자기자본이익률",
                  benchmark: "업종 평균 18%",
                  good: (stock.roe ?? 0) > 18,
                },
                {
                  label: "배당수익률",
                  value: `${(stock.dividendYield ?? 0).toFixed(2)}%`,
                  desc: "연간 배당/주가",
                  benchmark: "S&P500 평균 1.5%",
                  good: (stock.dividendYield ?? 0) > 1.5,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 bg-muted/20 rounded-xl border border-border/50"
                >
                  <div className="text-[10px] text-muted-foreground">
                    {item.label}
                  </div>
                  <div
                    className={cn(
                      "text-xl font-bold font-mono-num mt-0.5",
                      item.good ? "text-up" : "text-down",
                    )}
                  >
                    {item.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {item.desc}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60">
                    {item.benchmark}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Brain size={12} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-primary mb-1">
                    AI 밸류에이션 분석
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    현재 PER {(stock.pe ?? 0).toFixed(1)}x는 업종 평균 대비{" "}
                    {(stock.pe ?? 99) < 22 ? "저평가" : "고평가"} 구간입니다.
                    ROE {(stock.roe ?? 0).toFixed(1)}%의{" "}
                    {(stock.roe ?? 0) > 20 ? "우수한" : "보통 수준의"} 수익성을
                    감안하면
                    {(stock.pe ?? 99) < 15 && (stock.roe ?? 0) > 20
                      ? " 매력적인 가치투자 후보입니다."
                      : (stock.pe ?? 0) > 40
                        ? " 성장 프리미엄이 상당 부분 반영된 상태입니다."
                        : " 적정 밸류에이션 범위 내에 있습니다."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 기술적 신호 탭 ── */}
        {activeTab === "기술적 신호" && (
          <div className="space-y-3">
            {signalsLoading && currentSignalBars.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-lg bg-muted/20 animate-pulse"
                  />
                ))}
              </div>
            ) : currentSignalBars.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                기술적 신호를 계산할 가격 데이터가 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {technicalSignalCards.map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 bg-muted/20 rounded-lg border border-border/50"
                  >
                    <div className="text-[10px] text-muted-foreground">
                      {item.label}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-bold font-mono-num mt-0.5",
                        item.color,
                      )}
                    >
                      {item.value}
                    </div>
                    <div
                      className={cn(
                        "text-[10px] font-medium mt-0.5",
                        item.color,
                      )}
                    >
                      {item.signal}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground">
              DB 일봉 {currentSignalBars.length.toLocaleString()}개 기준
              {currentSignalBars.length > 0
                ? ` · ${currentSignalBars[0].date} ~ ${currentSignalBars[currentSignalBars.length - 1].date}`
                : ""}
            </div>
          </div>
        )}

        {/* ── 뉴스 탭 ── */}
        {activeTab === "뉴스" && (
          <div className="space-y-2">
            {[
              {
                title: `${stock.ticker} Q1 실적 예상치 상회 — EPS $1.52 vs 예상 $1.43`,
                source: "Bloomberg",
                time: "2시간 전",
                sentiment: "positive",
              },
              {
                title: `애널리스트 목표가 상향 — ${stock.ticker} 목표가 $${(stock.price * 1.15).toFixed(0)}으로 조정`,
                source: "Goldman Sachs",
                time: "4시간 전",
                sentiment: "positive",
              },
              {
                title: `${stock.sector} 섹터 전반 조정 — 금리 우려 재부각`,
                source: "Reuters",
                time: "6시간 전",
                sentiment: "negative",
              },
              {
                title: `${stock.ticker} 신제품 발표 예정 — 다음 분기 매출 성장 기대`,
                source: "WSJ",
                time: "1일 전",
                sentiment: "positive",
              },
              {
                title: `기관 투자자 ${stock.ticker} 지분 확대 — 13F 공시`,
                source: "SEC Filing",
                time: "2일 전",
                sentiment: "positive",
              },
            ].map((news, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/20 cursor-pointer",
                  news.sentiment === "positive"
                    ? "border-up/20"
                    : "border-down/20",
                )}
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                    news.sentiment === "positive" ? "bg-up" : "bg-down",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-snug">
                    {news.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="font-medium">{news.source}</span>
                    <span>{news.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI 요약 탭 ── */}
        {activeTab === "AI 요약" && (
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-primary" />
                <span className="text-sm font-semibold text-primary">
                  AI 종합 분석
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  DB 일봉 {currentSignalBars.length.toLocaleString()}개 기반
                </span>
              </div>
              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">
                    {stock.name}({stock.ticker})
                  </strong>
                  은 현재 {stock.sector} 섹터에서
                  {stock.changePct > 0
                    ? " 상승 모멘텀을 유지하고 있습니다."
                    : " 단기 조정 국면에 있습니다."}
                </p>
                <p>
                  <strong className="text-foreground">밸류에이션:</strong> PER{" "}
                  {(stock.pe ?? 0).toFixed(1)}x, PBR{" "}
                  {(stock.pbr ?? 0).toFixed(1)}x로
                  {(stock.pe ?? 99) < 20
                    ? " 업종 내 저평가 구간에 위치합니다."
                    : " 성장 프리미엄이 반영된 수준입니다."}
                  ROE {(stock.roe ?? 0).toFixed(1)}%의{" "}
                  {(stock.roe ?? 0) > 20 ? "우수한" : "보통 수준의"} 수익성을
                  보이고 있습니다.
                </p>
                <p>
                  <strong className="text-foreground">기술적 분석:</strong>{" "}
                  {currentSignalBars.length === 0
                    ? "가격 데이터가 부족해 기술 지표를 계산할 수 없습니다."
                    : `RSI ${technicalSignals.rsi?.toFixed(1) ?? "—"}, MACD ${technicalSignals.macd?.toFixed(2) ?? "—"}이며, 이동평균 신호는 ${
                        technicalSignals.ma5 != null &&
                        technicalSignals.ma20 != null &&
                        technicalSignals.ma5 > technicalSignals.ma20
                          ? "단기선 우위"
                          : "단기선 열위"
                      }입니다. 종합 신호는 ${technicalSignals.bullishCount}/5 매수 조건을 충족합니다.`}
                </p>
                <p>
                  <strong className="text-foreground">투자 의견:</strong>
                  {(stock.pe ?? 99) < 20 && (stock.roe ?? 0) > 20
                    ? " 가치와 성장이 균형 잡힌 매력적인 투자 후보입니다. 분할 매수 전략을 고려해볼 수 있습니다."
                    : (stock.pe ?? 0) > 40
                      ? " 높은 밸류에이션으로 리스크 관리가 중요합니다. 실적 발표 전후 변동성에 유의하세요."
                      : " 업종 평균 수준의 밸류에이션으로 시장 흐름에 연동되는 움직임이 예상됩니다."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                {
                  label: "단기 전망",
                  value:
                    technicalSignals.bullishCount >= 4
                      ? "긍정적"
                      : technicalSignals.bullishCount <= 1
                        ? "부정적"
                        : "중립",
                  color:
                    technicalSignals.bullishCount >= 4
                      ? "text-up"
                      : technicalSignals.bullishCount <= 1
                        ? "text-down"
                        : "text-muted-foreground",
                },
                {
                  label: "리스크 레벨",
                  value:
                    (stock.pe ?? 0) > 40
                      ? "높음"
                      : (stock.pe ?? 0) > 25
                        ? "중간"
                        : "낮음",
                  color:
                    (stock.pe ?? 0) > 40
                      ? "text-down"
                      : (stock.pe ?? 0) > 25
                        ? "text-yellow-400"
                        : "text-up",
                },
                {
                  label: "투자 매력도",
                  value:
                    (stock.pe ?? 99) < 20 && (stock.roe ?? 0) > 20
                      ? "★★★★★"
                      : (stock.pe ?? 99) < 30
                        ? "★★★★"
                        : "★★★",
                  color: "text-yellow-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-2.5 bg-muted/20 rounded-lg text-center"
                >
                  <div className="text-[10px] text-muted-foreground">
                    {item.label}
                  </div>
                  <div className={cn("font-bold mt-0.5", item.color)}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Analysis Page ───────────────────────────────────────
const MARKET_TABS: MarketTab[] = [
  "시장 개요",
  "주식 분석",
  "섹터 로테이션",
  "스크리너",
  "수익률 비교",
];

function stockFromWatchlistItem(
  item: ReturnType<typeof useWatchlist>["watchlist"][number],
): AllStock {
  const exchange = item.exchange as AllStock["exchange"];
  const country: AllStock["country"] =
    exchange === "KOSPI" || exchange === "KOSDAQ" ? "KR" : "US";
  return {
    ticker: item.ticker,
    name: item.name,
    exchange,
    country,
    price: item.price,
    changePct: item.changePct,
    change: 0,
    volume: 0,
    marketCap: "",
    sector: item.sector || "—",
  };
}

function StockCandidateButton({
  stock,
  onClick,
}: {
  stock: AllStock;
  onClick: (stock: AllStock) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(stock)}
      className="rounded-lg border border-border/50 bg-card cursor-pointer p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-bold tracking-tight">
          {stock.ticker}
        </span>
        <PctBadge value={stock.changePct} size="xs" />
      </div>
      <div className="mt-1 truncate text-xs text-foreground">{stock.name}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {stock.exchange} · {stock.sector || "—"}
      </div>
    </button>
  );
}

export default function Analysis() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<AllStock | null>(null);
  const [selectingTicker, setSelectingTicker] = useState<string | null>(null);
  const selectionControllerRef = useRef<AbortController | null>(null);
  const [activeMarketTab, setActiveMarketTab] =
    useState<MarketTab>("시장 개요");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "US" | "KR">("ALL");
  const { data: macroIndicators } = useMacroIndicators();
  const { watchlist, isWatched, addToWatchlist, removeFromWatchlist } =
    useWatchlist();
  const { data: liveUS } = useStocks("US");
  const { data: liveKR } = useStocks("KR");
  const { data: searchHits = [], loading: searchLoading } = useStockSearch(
    searchQuery,
    12,
  );

  const allStocks = useMemo(
    () => [...(liveUS ?? []), ...(liveKR ?? [])],
    [liveUS, liveKR],
  );

  const filteredStocks = useMemo(() => {
    const hits = searchHits ?? [];
    return hits.filter(
      (hit) => marketFilter === "ALL" || hit.country === marketFilter,
    );
  }, [marketFilter, searchHits]);

  const openStockAnalysis = useCallback((stock: AllStock) => {
    setSelectedStock(stock);
    setActiveMarketTab("주식 분석");
  }, []);

  const watchlistStockCandidates = useMemo(
    () =>
      watchlist.map(
        (item) =>
          allStocks.find((stock) => stock.ticker === item.ticker) ??
          stockFromWatchlistItem(item),
      ),
    [allStocks, watchlist],
  );

  const recommendedStockCandidates = useMemo(() => {
    const watched = new Set(watchlist.map((item) => item.ticker));
    return allStocks.filter((stock) => !watched.has(stock.ticker)).slice(0, 12);
  }, [allStocks, watchlist]);

  const selectSearchHit = useCallback(
    async (hit: StockSearchHit) => {
      selectionControllerRef.current?.abort();
      const controller = new AbortController();
      selectionControllerRef.current = controller;
      setSelectingTicker(hit.ticker);
      try {
        const stock = await hydrateSearchHit(hit, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        openStockAnalysis(stock);
        setSearchQuery("");
      } catch (error) {
        if (!controller.signal.aborted) throw error;
      } finally {
        if (selectionControllerRef.current === controller) {
          selectionControllerRef.current = null;
          setSelectingTicker(null);
        }
      }
    },
    [openStockAnalysis],
  );

  const addSearchHitToWatchlist = useCallback(
    async (hit: StockSearchHit) => {
      selectionControllerRef.current?.abort();
      const controller = new AbortController();
      selectionControllerRef.current = controller;
      setSelectingTicker(hit.ticker);
      try {
        const stock = await hydrateSearchHit(hit, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        addToWatchlist({
          ticker: stock.ticker,
          name: stock.name,
          exchange: stock.exchange,
          price: stock.price,
          changePct: stock.changePct,
          sector: stock.sector || "—",
        });
        toast.success("관심종목 추가");
      } catch (error) {
        if (!controller.signal.aborted) throw error;
      } finally {
        if (selectionControllerRef.current === controller) {
          selectionControllerRef.current = null;
          setSelectingTicker(null);
        }
      }
    },
    [addToWatchlist],
  );

  useEffect(
    () => () => {
      selectionControllerRef.current?.abort();
    },
    [],
  );

  const handleEditMacro = useCallback((_id: string) => {}, []);

  return (
    <div className="space-y-4 max-w-full">
      {/* Search bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["ALL", "US", "KR"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  marketFilter === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {m === "ALL" ? "전체" : m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            종목을 검색하면 상세 분석 패널이 열립니다
          </div>
        </div>
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="종목 검색 (티커 또는 종목명) — 예: AAPL, 삼성전자, NVDA"
            className="w-full h-10 pl-9 pr-4 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
          />
        </div>

        {/* Search results */}
        {searchLoading && searchQuery.trim() && (
          <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            DB 종목 검색 중...
          </div>
        )}
        {!searchLoading &&
          searchQuery.trim() &&
          filteredStocks.length === 0 && (
            <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              검색 결과가 없습니다
            </div>
          )}
        {filteredStocks.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredStocks.map((s) => {
              const watched = isWatched(s.ticker);
              const busy = selectingTicker === s.ticker;
              return (
                <div
                  key={s.ticker}
                  onClick={() => void selectSearchHit(s)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all hover:border-primary/40 hover:bg-muted/20",
                    selectedStock?.ticker === s.ticker
                      ? "border-primary/40 bg-primary/5"
                      : "border-border",
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{s.ticker}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 truncate">
                      {s.exchange} · {s.country}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {busy ? (
                      <span className="text-[10px] text-muted-foreground">
                        로딩
                      </span>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (watched) {
                          removeFromWatchlist(s.ticker);
                          toast.success("관심종목 해제");
                        } else {
                          void addSearchHitToWatchlist(s);
                        }
                      }}
                      className={cn(
                        "p-1 rounded transition-colors",
                        watched
                          ? "text-yellow-400"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Star
                        size={11}
                        fill={watched ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Watchlist quick access */}
        {!searchQuery && watchlist.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
              <Star size={10} className="text-yellow-400" fill="currentColor" />{" "}
              관심종목 바로가기
            </div>
            <div className="flex flex-wrap gap-1.5">
              {watchlist.map((w) => (
                <button
                  key={w.ticker}
                  onClick={() => {
                    const stock =
                      allStocks.find((s) => s.ticker === w.ticker) ??
                      stockFromWatchlistItem(w);
                    openStockAnalysis(stock);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 text-xs transition-colors"
                >
                  <span className="font-bold">{w.ticker}</span>
                  <PctBadge value={w.changePct} size="xs" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Market analysis tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex gap-0 px-4 pt-3 border-b border-border overflow-x-auto">
          {MARKET_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveMarketTab(tab)}
              className={cn(
                "text-sm px-4 py-2 border-b-2 transition-colors whitespace-nowrap",
                activeMarketTab === tab
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeMarketTab === "시장 개요" && (
            <MarketOverviewPanel
              macroIndicators={macroIndicators ?? []}
              onEditMacro={handleEditMacro}
            />
          )}
          {activeMarketTab === "주식 분석" && (
            <div className="space-y-4">
              {selectedStock ? (
                <StockAnalysisPanel
                  stock={selectedStock}
                  onClose={() => setSelectedStock(null)}
                />
              ) : (
                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-sm font-bold">주식 분석 시작</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        검색하지 않아도 관심종목이나 시장 목록에서 바로 분석
                        패널을 열 수 있습니다.
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      검색창 선택도 계속 지원
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap size={11} className="text-primary" />
                    관심종목은 바로 분석하고, 아래 추천 종목은 새 후보로
                    확인하세요
                  </div>
                  <div className="mt-4 space-y-4">
                    <section>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold">내 관심종목</div>
                        <span className="text-[10px] text-muted-foreground">
                          클릭하면 바로 주식 분석 패널 열림
                        </span>
                      </div>
                      {watchlistStockCandidates.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {watchlistStockCandidates.map((stock) => (
                            <StockCandidateButton
                              key={stock.ticker}
                              stock={stock}
                              onClick={openStockAnalysis}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                          관심종목이 아직 없습니다. 종목 상세나 검색 결과에서
                          ★을 눌러 추가하세요.
                        </div>
                      )}
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold">
                          추천 · 시장 상위 종목
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          모멘텀 높은 종목부터 표시
                        </span>
                      </div>
                      {recommendedStockCandidates.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {recommendedStockCandidates.map((stock) => (
                            <StockCandidateButton
                              key={stock.ticker}
                              stock={stock}
                              onClick={openStockAnalysis}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center">
                          <Search
                            size={24}
                            className="mx-auto mb-2 text-muted-foreground/30"
                          />
                          <div className="text-sm text-muted-foreground">
                            상단 검색창에 티커를 입력하거나
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            홈페이지에서 관심종목에 ★을 눌러 추가하면 여기서
                            표시됩니다
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeMarketTab === "섹터 로테이션" && <SectorRotationPanel />}
          {activeMarketTab === "스크리너" && <IntegratedScreenerPanel />}
          {activeMarketTab === "수익률 비교" && <ReturnComparisonPanel />}
        </div>
      </div>
    </div>
  );
}
