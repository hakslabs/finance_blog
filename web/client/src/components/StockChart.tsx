/**
 * StockChart — Brokerage-grade price chart powered by klinecharts (Apache-2.0).
 *
 * One source of truth for the price pane + indicator stack used by both
 * /stocks/:ticker (StockDetail) and the slide-out panel on /analysis.
 *
 *  - Real OHLCV from /v1/stocks/:ticker/bars (no mock data)
 *  - Daily / weekly / monthly candles with proper wicks
 *  - Native overlay indicators (MA / EMA / BOLL) on the price pane
 *  - Native sub-panes (VOL / MACD / RSI / KDJ) with synced crosshair
 *  - Theme-aware (dark / light) via ThemeContext
 *  - Period selector 1W..ALL; aggregation switches candle interval
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  init,
  dispose,
  ActionType,
  type Chart,
  type Crosshair,
  type KLineData,
  type OverlayCreate,
  type VisibleRange,
} from "klinecharts";
import {
  CandlestickChart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChartLine,
  Download,
  Eraser,
  Eye,
  EyeOff,
  GripVertical,
  HelpCircle,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  MoveVertical,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Table2,
  TrendingUp,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { rebaseCompareRows } from "@/lib/compare-series";
import { stocksService, useStockBars } from "@/features/stocks";
import { useTheme } from "@/contexts/ThemeContext";

export type IndicatorKey =
  | "ma"
  | "ema"
  | "boll"
  | "sar"
  | "vol"
  | "macd"
  | "rsi"
  | "kdj"
  | "wr"
  | "bias"
  | "cci"
  | "obv"
  | "psy";
export type IndicatorSet = Record<IndicatorKey, boolean>;
export type PeriodKey = "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y" | "ALL";
export type Timeframe = "D" | "W" | "M";
type ChartMode = "candle_solid" | "candle_stroke" | "ohlc" | "area";
type ChartDensity = "compact" | "standard" | "deep";
type PriceScale = "normal" | "log";
type PresetKey = "basic" | "trend" | "momentum" | "full";
type IndicatorParamPresetKey = "intraday" | "swing" | "position";
type IndicatorCategoryKey =
  | "all"
  | "active"
  | "price"
  | "trend"
  | "momentum"
  | "volume";
type IndicatorParams = Record<IndicatorKey, number[]>;
type DrawingToolKey =
  | "segment"
  | "rayLine"
  | "horizontalStraightLine"
  | "verticalStraightLine"
  | "fibonacciLine"
  | "priceLine";
type StockChartSettings = {
  period: PeriodKey;
  timeframe: Timeframe;
  indicators: IndicatorSet;
  indicatorParams: IndicatorParams;
  indicatorOrder: IndicatorKey[];
  activeSavedIndicatorSlot: SavedIndicatorSlotKey;
  chartMode: ChartMode;
  priceScale: PriceScale;
  density: ChartDensity;
  pricePaneScale: number;
  indicatorPaneScale: number;
  showGrid: boolean;
  showCrosshair: boolean;
  showLastPriceLine: boolean;
  compareOpen: boolean;
  compareInput: string;
  compareHiddenSymbols: string[];
  compareEndLabelsVisible: boolean;
  drawingRepeat: boolean;
};
type SavedIndicatorSet = {
  indicators: IndicatorSet;
  indicatorParams: IndicatorParams;
  indicatorOrder: IndicatorKey[];
};
type SavedIndicatorSlotKey = "1" | "2" | "3";
type SavedIndicatorSlots = Partial<
  Record<SavedIndicatorSlotKey, SavedIndicatorSet>
>;
type NormalizeDailyBarsResult = {
  bars: DailyBar[];
  invalidRows: number;
  duplicateRows: number;
};
type IndicatorReadoutGroup = {
  key: IndicatorKey;
  label: string;
  values: Array<{
    key: string;
    label: string;
    value: number;
    formatter?: "price" | "volume" | "plain";
    tone?: "up" | "down" | "neutral";
  }>;
};
type SignalChip = {
  key: string;
  label: string;
  detail: string;
  tone: "up" | "down" | "neutral";
};
type IndicatorTableColumn = {
  key: string;
  label: string;
  formatter: "price" | "volume" | "plain";
  values: number[];
};
type StockCompareRow = Record<string, number | string | null>;
type StockCompareSeriesMeta = {
  symbol: string;
  requested_days: number;
  returned_count: number;
  from_date?: string | null;
  to_date?: string | null;
};
type StockCompareCoverage = StockCompareSeriesMeta & {
  color: string;
  displayCount: number;
  displayFrom: string | null;
  displayTo: string | null;
  sourceDays: number | null;
  displayDays: number | null;
  loaded: boolean;
  hidden: boolean;
};

const STOCK_CHART_SETTINGS_KEY = "financelab_stock_chart_settings_v1";
const STOCK_CHART_SAVED_INDICATORS_KEY =
  "financelab_stock_chart_saved_indicators_v1";
const DRAWING_GROUP_ID = "financelab-stock-drawings";
const SAVED_INDICATOR_SLOT_KEYS: SavedIndicatorSlotKey[] = ["1", "2", "3"];
const COMPARE_COLORS = [
  "var(--primary)",
  "#f59e0b",
  "#38bdf8",
  "#a78bfa",
  "#22c55e",
];
const QUICK_COMPARE_SYMBOLS = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "NASDAQ" },
  { symbol: "DIA", label: "DOW" },
  { symbol: "IWM", label: "Russell" },
  { symbol: "069500.KS", label: "KODEX 200" },
];
const QUICK_COMPARE_PRESETS = [
  { key: "us", label: "US", symbols: ["SPY", "QQQ", "DIA", "IWM"] },
  { key: "growth", label: "TECH", symbols: ["QQQ", "SPY"] },
  { key: "kr", label: "KR", symbols: ["069500.KS", "SPY", "QQQ"] },
];

const PERIOD_LOOKBACK_CALENDAR_DAYS: Record<PeriodKey, number | null> = {
  "1W": 7,
  "1M": 31,
  "3M": 92,
  "6M": 183,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
  ALL: null,
};
const PERIOD_ORDER: PeriodKey[] = [
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "2Y",
  "5Y",
  "ALL",
];

/**
 * How many aggregated bars belong to the selected calendar lookback.
 * Periods must stay date-accurate across D/W/M views; approximating weekly
 * or monthly ranges by dividing daily bar counts makes visible dates drift.
 */
function visibleBarsForPeriod(data: KLineData[], period: PeriodKey): number {
  if (data.length === 0) return 0;
  const lookbackDays = PERIOD_LOOKBACK_CALENDAR_DAYS[period];
  if (lookbackDays == null) return data.length;
  const latest = Number(data[data.length - 1]?.timestamp);
  if (!Number.isFinite(latest)) return data.length;
  const cutoff = latest - Math.max(0, lookbackDays - 1) * 86_400_000;
  const start = data.findIndex((bar) => {
    const timestamp = Number(bar.timestamp);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
  return Math.max(1, data.length - (start >= 0 ? start : 0));
}
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  D: "일봉",
  W: "주봉",
  M: "월봉",
};

const CHART_MODE_LABELS: Record<ChartMode, string> = {
  candle_solid: "캔들",
  candle_stroke: "빈캔들",
  ohlc: "OHLC",
  area: "라인",
};
const CHART_MODE_ORDER: ChartMode[] = [
  "candle_solid",
  "candle_stroke",
  "ohlc",
  "area",
];

const DENSITY_LABELS: Record<ChartDensity, string> = {
  compact: "압축",
  standard: "기본",
  deep: "넓게",
};
const MIN_INDICATOR_PANE_SCALE = 0.7;
const MAX_INDICATOR_PANE_SCALE = 1.65;
const INDICATOR_PANE_SCALE_STEP = 0.05;
const MIN_PRICE_PANE_SCALE = 0.75;
const MAX_PRICE_PANE_SCALE = 1.8;
const PRICE_PANE_SCALE_STEP = 0.05;
const MAX_INDICATOR_PERIOD = 500;
const MAX_INDICATOR_MULTIPLIER = 10;

const PRESETS: Record<
  PresetKey,
  { label: string; description: string; indicators: IndicatorSet }
> = {
  basic: {
    label: "기본",
    description: "가격과 거래량만 빠르게 확인",
    indicators: {
      ma: false,
      ema: false,
      boll: false,
      sar: false,
      vol: true,
      macd: false,
      rsi: false,
      kdj: false,
      wr: false,
      bias: false,
      cci: false,
      obv: false,
      psy: false,
    },
  },
  trend: {
    label: "추세",
    description: "이동평균과 볼린저밴드 중심",
    indicators: {
      ma: true,
      ema: true,
      boll: true,
      sar: true,
      vol: true,
      macd: false,
      rsi: false,
      kdj: false,
      wr: false,
      bias: false,
      cci: false,
      obv: false,
      psy: false,
    },
  },
  momentum: {
    label: "모멘텀",
    description: "MACD, RSI, KDJ 확인",
    indicators: {
      ma: true,
      ema: true,
      boll: false,
      sar: false,
      vol: true,
      macd: true,
      rsi: true,
      kdj: true,
      wr: true,
      bias: true,
      cci: false,
      obv: false,
      psy: true,
    },
  },
  full: {
    label: "풀셋",
    description: "모든 보조지표 표시",
    indicators: {
      ma: true,
      ema: true,
      boll: true,
      sar: true,
      vol: true,
      macd: true,
      rsi: true,
      kdj: true,
      wr: true,
      bias: true,
      cci: true,
      obv: true,
      psy: true,
    },
  },
};

// Default to the minimal brokerage-app baseline: candles + volume only.
const DEFAULT_INDICATORS: IndicatorSet = {
  ma: false,
  ema: false,
  boll: false,
  sar: false,
  vol: true,
  macd: false,
  rsi: false,
  kdj: false,
  wr: false,
  bias: false,
  cci: false,
  obv: false,
  psy: false,
};
const DEFAULT_INDICATOR_PARAMS: IndicatorParams = {
  ma: [5, 10, 30, 60],
  ema: [5, 20, 60, 120],
  boll: [20, 2],
  sar: [2, 2, 20],
  vol: [5, 10, 20],
  macd: [12, 26, 9],
  rsi: [6, 12, 24],
  kdj: [9, 3, 3],
  wr: [6, 10, 14],
  bias: [6, 12, 24],
  cci: [20],
  obv: [30],
  psy: [12, 6],
};

const INDICATOR_PARAM_PRESETS: Record<
  IndicatorParamPresetKey,
  { label: string; description: string; params: IndicatorParams }
> = {
  intraday: {
    label: "단기",
    description: "짧은 추세와 빠른 모멘텀 확인",
    params: {
      ma: [3, 5, 10, 20],
      ema: [3, 8, 21, 55],
      boll: [14, 2],
      sar: [2, 2, 20],
      vol: [3, 5, 10],
      macd: [6, 13, 5],
      rsi: [5, 9, 14],
      kdj: [5, 3, 3],
      wr: [6, 10, 14],
      bias: [6, 12, 24],
      cci: [14],
      obv: [20],
      psy: [10, 5],
    },
  },
  swing: {
    label: "스윙",
    description: "기본 일봉 스윙 분석값",
    params: {
      ma: [5, 10, 30, 60],
      ema: [5, 20, 60, 120],
      boll: [20, 2],
      sar: [2, 2, 20],
      vol: [5, 10, 20],
      macd: [12, 26, 9],
      rsi: [6, 12, 24],
      kdj: [9, 3, 3],
      wr: [6, 10, 14],
      bias: [6, 12, 24],
      cci: [20],
      obv: [30],
      psy: [12, 6],
    },
  },
  position: {
    label: "장기",
    description: "중장기 추세와 큰 변동 구간 확인",
    params: {
      ma: [20, 60, 120, 200],
      ema: [20, 60, 120, 200],
      boll: [60, 2],
      sar: [2, 2, 20],
      vol: [20, 60, 120],
      macd: [19, 39, 9],
      rsi: [14, 28, 56],
      kdj: [14, 3, 3],
      wr: [14, 28, 56],
      bias: [20, 60, 120],
      cci: [60],
      obv: [60],
      psy: [24, 12],
    },
  },
};

const OVERLAY_INDICATORS: IndicatorKey[] = ["ma", "ema", "boll", "sar"];
const PANE_INDICATORS: IndicatorKey[] = [
  "vol",
  "macd",
  "rsi",
  "kdj",
  "wr",
  "bias",
  "cci",
  "obv",
  "psy",
];
const INDICATOR_KEYS: IndicatorKey[] = [
  "ma",
  "ema",
  "boll",
  "sar",
  "vol",
  "macd",
  "rsi",
  "kdj",
  "wr",
  "bias",
  "cci",
  "obv",
  "psy",
];
const INDICATOR_SHORTCUTS: Record<IndicatorKey, string> = {
  ma: "1",
  ema: "2",
  boll: "3",
  sar: "4",
  vol: "5",
  macd: "6",
  rsi: "7",
  kdj: "8",
  wr: "9",
  bias: "B",
  cci: "N",
  obv: "J",
  psy: "Q",
};

const INDICATOR_LABEL: Record<IndicatorKey, string> = {
  ma: "MA",
  ema: "EMA",
  boll: "BOLL",
  sar: "SAR",
  vol: "거래량",
  macd: "MACD",
  rsi: "RSI",
  kdj: "KDJ",
  wr: "WR",
  bias: "BIAS",
  cci: "CCI",
  obv: "OBV",
  psy: "PSY",
};

// Map our keys to klinecharts' built-in indicator names (case-sensitive).
const INDICATOR_NAME: Record<IndicatorKey, string> = {
  ma: "MA",
  ema: "EMA",
  boll: "BOLL",
  sar: "SAR",
  vol: "VOL",
  macd: "MACD",
  rsi: "RSI",
  kdj: "KDJ",
  wr: "WR",
  bias: "BIAS",
  cci: "CCI",
  obv: "OBV",
  psy: "PSY",
};
const INDICATOR_PARAM_LABELS: Record<IndicatorKey, string[]> = {
  ma: ["1", "2", "3", "4"],
  ema: ["1", "2", "3", "4"],
  boll: ["기간", "편차"],
  sar: ["시작", "가속", "최대"],
  vol: ["MA1", "MA2", "MA3"],
  macd: ["단기", "장기", "시그널"],
  rsi: ["RSI1", "RSI2", "RSI3"],
  kdj: ["기간", "K", "D"],
  wr: ["WR1", "WR2", "WR3"],
  bias: ["BIAS1", "BIAS2", "BIAS3"],
  cci: ["기간"],
  obv: ["MA"],
  psy: ["PSY", "MA"],
};
const INDICATOR_DESCRIPTIONS: Record<IndicatorKey, string> = {
  ma: "단순 이동평균",
  ema: "지수 이동평균",
  boll: "볼린저밴드",
  sar: "Parabolic SAR 추세 전환",
  vol: "거래량 이동평균",
  macd: "추세 모멘텀",
  rsi: "상대강도",
  kdj: "스토캐스틱 K/D/J",
  wr: "Williams %R",
  bias: "이격도",
  cci: "상품채널지수",
  obv: "거래량 누적 흐름",
  psy: "투자심리선",
};
const INDICATOR_CATEGORIES: Record<
  IndicatorCategoryKey,
  { label: string; keys: IndicatorKey[] }
> = {
  all: { label: "전체", keys: INDICATOR_KEYS },
  active: { label: "ON", keys: INDICATOR_KEYS },
  price: { label: "가격", keys: ["ma", "ema", "boll", "sar"] },
  trend: { label: "추세", keys: ["ma", "ema", "boll", "sar", "bias"] },
  momentum: {
    label: "모멘텀",
    keys: ["macd", "rsi", "kdj", "wr", "cci", "psy"],
  },
  volume: { label: "거래량", keys: ["vol", "obv"] },
};
const INDICATOR_CATEGORY_ORDER: IndicatorCategoryKey[] = [
  "all",
  "active",
  "price",
  "trend",
  "momentum",
  "volume",
];
const DRAWING_TOOLS: Array<{
  key: DrawingToolKey;
  label: string;
  title: string;
  shortcut: string;
  icon: typeof PencilLine;
}> = [
  {
    key: "segment",
    label: "추세선",
    title: "두 점을 찍어 구간 추세선을 그림",
    shortcut: "T",
    icon: PencilLine,
  },
  {
    key: "rayLine",
    label: "연장선",
    title: "시작점과 방향을 찍어 오른쪽으로 연장되는 선을 그림",
    shortcut: "Y",
    icon: TrendingUp,
  },
  {
    key: "horizontalStraightLine",
    label: "수평선",
    title: "가격 기준선을 그림",
    shortcut: "H",
    icon: MoveHorizontal,
  },
  {
    key: "verticalStraightLine",
    label: "수직선",
    title: "날짜 기준선을 그림",
    shortcut: "V",
    icon: MoveVertical,
  },
  {
    key: "fibonacciLine",
    label: "피보",
    title: "피보나치 되돌림선을 그림",
    shortcut: "I",
    icon: ChartLine,
  },
  {
    key: "priceLine",
    label: "가격선",
    title: "가격 라벨이 있는 기준선을 그림",
    shortcut: "K",
    icon: SlidersHorizontal,
  },
];
const DRAWING_SHORTCUTS: Record<string, DrawingToolKey> = DRAWING_TOOLS.reduce(
  (acc, tool) => ({ ...acc, [tool.shortcut.toLowerCase()]: tool.key }),
  {} as Record<string, DrawingToolKey>,
);

function drawingToolLabel(tool: DrawingToolKey): string {
  return DRAWING_TOOLS.find((item) => item.key === tool)?.label ?? "드로잉";
}

function defaultIndicatorSet(): IndicatorSet {
  return { ...DEFAULT_INDICATORS };
}

function defaultIndicatorParams(): IndicatorParams {
  return INDICATOR_KEYS.reduce<IndicatorParams>(
    (acc, key) => ({
      ...acc,
      [key]: [...DEFAULT_INDICATOR_PARAMS[key]],
    }),
    { ...DEFAULT_INDICATOR_PARAMS },
  );
}

function cloneIndicatorParams(params: IndicatorParams): IndicatorParams {
  return INDICATOR_KEYS.reduce<IndicatorParams>(
    (acc, key) => ({
      ...acc,
      [key]: [...params[key]],
    }),
    { ...params },
  );
}

function sameIndicatorParams(a: IndicatorParams, b: IndicatorParams): boolean {
  return INDICATOR_KEYS.every((key) => {
    const left = a[key] ?? [];
    const right = b[key] ?? [];
    return (
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  });
}

function sameIndicatorSet(a: IndicatorSet, b: IndicatorSet): boolean {
  return INDICATOR_KEYS.every((key) => a[key] === b[key]);
}

type DailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function parseUtcDay(
  value: unknown,
): { date: string; timestamp: number } | null {
  if (value == null || value === "") return null;
  const epochTimestamp = parseEpochTimestamp(value);
  if (epochTimestamp != null) {
    return {
      date: new Date(epochTimestamp).toISOString().slice(0, 10),
      timestamp: epochTimestamp,
    };
  }
  const raw =
    typeof value === "number" ? value : normalizeUtcDateInput(String(value));
  const timestamp = typeof raw === "number" ? raw : Date.parse(raw);
  if (!Number.isFinite(timestamp)) return null;
  return {
    date: new Date(timestamp).toISOString().slice(0, 10),
    timestamp,
  };
}

function parseEpochTimestamp(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") return null;
  if (typeof raw === "string" && !/^\d{10,13}$/.test(raw)) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1_000_000_000) return null;
  return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
}

function normalizeUtcDateInput(value: string): string {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00Z`;
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw) &&
    !/(Z|[+-]\d{2}:?\d{2})$/.test(raw)
  ) {
    return `${raw.replace(" ", "T")}Z`;
  }
  return raw;
}

function staleDayLabel(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return "";
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const ageDays = Math.max(0, Math.floor((todayUtc - timestamp) / 86_400_000));
  return ageDays >= 4 ? ` · 최신 ${ageDays.toLocaleString()}일전` : "";
}

function calendarDaysBetween(
  from: string | null | undefined,
  to: string | null | undefined,
): number | null {
  const fromDay = parseUtcDay(from);
  const toDay = parseUtcDay(to);
  if (!fromDay || !toDay) return null;
  return Math.max(
    0,
    Math.round((toDay.timestamp - fromDay.timestamp) / 86_400_000) + 1,
  );
}

function normalizeDailyBars(rows: DailyBar[]): DailyBar[] {
  return normalizeDailyBarsWithStats(rows).bars;
}

function normalizeDailyBarsWithStats(
  rows: DailyBar[],
): NormalizeDailyBarsResult {
  const byDate = new Map<string, DailyBar>();
  let invalidRows = 0;
  let duplicateRows = 0;

  rows.forEach((row) => {
    const day = parseUtcDay(row.date);
    if (!day) {
      invalidRows += 1;
      return;
    }

    const open = Number(row.open);
    const high = Number(row.high);
    const low = Number(row.low);
    const close = Number(row.close);
    const volume = Number(row.volume);
    if (
      ![open, high, low, close].every(Number.isFinite) ||
      [open, high, low, close].some((value) => value <= 0)
    ) {
      invalidRows += 1;
      return;
    }

    const normalizedHigh = Math.max(open, high, low, close);
    const normalizedLow = Math.min(open, high, low, close);
    if (byDate.has(day.date)) duplicateRows += 1;
    byDate.set(day.date, {
      date: day.date,
      open,
      high: normalizedHigh,
      low: normalizedLow,
      close,
      volume: Number.isFinite(volume) ? volume : 0,
    });
  });

  return {
    bars: Array.from(byDate.values()).sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    ),
    invalidRows,
    duplicateRows,
  };
}

function parseCompareInput(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(/[,\s]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 4);
}

function sanitizeCompareInput(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = parseCompareInput(value);
  return parsed.length > 0 ? parsed.join(" ") : "";
}

function sanitizeCompareHiddenSymbols(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const symbols = value
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter(Boolean)
    .filter((symbol) => {
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .slice(0, 5);
  return symbols.length > 0 ? symbols : undefined;
}

function buildStockComparePath(
  rows: StockCompareRow[],
  key: string,
  yOf: (value: number) => number,
  width: number,
): string {
  let path = "";
  let drawing = false;
  const denom = Math.max(1, rows.length - 1);
  rows.forEach((row, index) => {
    const value = Number(row[key]);
    if (!Number.isFinite(value)) {
      drawing = false;
      return;
    }
    const x = (index / denom) * width;
    const y = yOf(value);
    path += `${drawing ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    drawing = true;
  });
  return path;
}

function klineDataFingerprint(
  bars: KLineData[],
  ticker: string,
  timeframe: Timeframe,
): string {
  if (bars.length === 0) return `${ticker}|${timeframe}|empty`;
  const first = bars[0];
  const last = bars[bars.length - 1];
  let checksum = 0;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    checksum =
      (checksum +
        (i + 1) * ((Number(bar.timestamp) || 0) % 1_000_003) +
        (i + 3) * Math.round((Number(bar.open) || 0) * 1000) +
        (i + 5) * Math.round((Number(bar.high) || 0) * 1000) +
        (i + 7) * Math.round((Number(bar.low) || 0) * 1000) +
        (i + 11) * Math.round((Number(bar.close) || 0) * 1000) +
        (i + 13) * Math.round((Number(bar.volume) || 0) / 1000)) %
      1_000_000_007;
  }
  return [
    ticker,
    timeframe,
    bars.length,
    first?.timestamp ?? "",
    first?.open ?? "",
    first?.close ?? "",
    last?.timestamp ?? "",
    last?.open ?? "",
    last?.close ?? "",
    last?.volume ?? "",
    checksum,
  ].join("|");
}

function aggregate(bars: DailyBar[], tf: Timeframe): DailyBar[] {
  if (tf === "D" || bars.length === 0) return bars;
  const keyOf = (d: string): string => {
    const dt = new Date(d);
    if (tf === "M")
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    const tmp = new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
    );
    const day = (tmp.getUTCDay() + 6) % 7; // 0 = Mon
    tmp.setUTCDate(tmp.getUTCDate() - day);
    return `${tmp.getUTCFullYear()}-${String(tmp.getUTCMonth() + 1).padStart(2, "0")}-${String(tmp.getUTCDate()).padStart(2, "0")}`;
  };
  const groups = new Map<string, DailyBar[]>();
  for (const b of bars) {
    const k = keyOf(b.date);
    const arr = groups.get(k);
    if (arr) arr.push(b);
    else groups.set(k, [b]);
  }
  const out: DailyBar[] = [];
  for (const [, grp] of groups) {
    if (!grp.length) continue;
    out.push({
      date: grp[grp.length - 1].date,
      open: grp[0].open,
      close: grp[grp.length - 1].close,
      high: Math.max(...grp.map((g) => g.high)),
      low: Math.min(...grp.map((g) => g.low)),
      volume: grp.reduce((s, g) => s + g.volume, 0),
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

function toKlineData(bars: DailyBar[]): KLineData[] {
  return bars.map((b) => ({
    timestamp: Date.parse(`${b.date}T00:00:00Z`),
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
  }));
}

// Pull theme tokens from the live CSS so the chart matches the rest of the UI.
function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function buildStyles(
  dark: boolean,
  chartMode: ChartMode,
  priceScale: PriceScale,
  showGrid: boolean,
  showCrosshair: boolean,
  showLastPriceLine: boolean,
) {
  // Brand-aligned up/down palette (matches PALETTE in legacy chart).
  const up = "#22c55e";
  const down = "#ef4444";
  const fg = readToken("--foreground", dark ? "#e5e7eb" : "#111827");
  const muted = readToken("--muted-foreground", dark ? "#9ca3af" : "#6b7280");
  const border = readToken("--border", dark ? "#1f2937" : "#e5e7eb");

  return {
    grid: {
      show: showGrid,
      horizontal: {
        show: showGrid,
        color: border,
        style: "dashed",
        dashedValue: [2, 4],
      },
      vertical: {
        color: border,
        style: "dashed",
        dashedValue: [2, 4],
        show: showGrid,
      },
    },
    candle: {
      type: chartMode,
      bar: {
        upColor: up,
        downColor: down,
        noChangeColor: muted,
        upBorderColor: up,
        downBorderColor: down,
        upWickColor: up,
        downWickColor: down,
      },
      area: {
        lineSize: 1.6,
        lineColor: up,
        value: "close",
        smooth: false,
        backgroundColor: [
          { offset: 0, color: `${up}33` },
          { offset: 1, color: `${up}00` },
        ],
        point: {
          show: false,
          color: up,
          radius: 2,
          rippleRadius: 4,
          rippleColor: up,
        },
      },
      tooltip: {
        showRule: "follow_cross",
        showType: "standard",
        text: {
          color: fg,
          size: 11,
          family: "Helvetica",
          weight: "normal",
          marginLeft: 8,
          marginTop: 4,
          marginRight: 8,
          marginBottom: 4,
        },
      },
      priceMark: {
        last: {
          show: showLastPriceLine,
          upColor: up,
          downColor: down,
          noChangeColor: muted,
          line: {
            show: showLastPriceLine,
            style: "dashed",
            dashedValue: [3, 3],
            size: 1,
          },
          text: {
            show: showLastPriceLine,
            size: 10,
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 2,
            paddingBottom: 2,
          },
        },
        high: { color: muted, textSize: 10 },
        low: { color: muted, textSize: 10 },
      },
    },
    indicator: {
      ohlc: { upColor: up, downColor: down, noChangeColor: muted },
      bars: [
        {
          style: "fill",
          borderStyle: "solid",
          borderSize: 1,
          borderColor: up,
          color: up,
          noChangeColor: muted,
        },
      ],
      lines: [
        { style: "solid", smooth: false, size: 1, color: "#FBBF24" },
        { style: "solid", smooth: false, size: 1, color: "#A78BFA" },
        { style: "solid", smooth: false, size: 1, color: "#F87171" },
        { style: "solid", smooth: false, size: 1, color: "#38BDF8" },
      ],
      tooltip: {
        showRule: "follow_cross",
        showType: "standard",
        text: {
          color: fg,
          size: 11,
          family: "Helvetica",
          weight: "normal",
          marginLeft: 8,
          marginTop: 4,
          marginRight: 8,
          marginBottom: 4,
        },
      },
      lastValueMark: { show: false },
    },
    xAxis: {
      axisLine: { color: border },
      tickLine: { color: border },
      tickText: { color: muted, size: 10 },
    },
    yAxis: {
      type: priceScale,
      position: "right",
      axisLine: { color: border, show: false },
      tickLine: { color: border, show: false },
      tickText: { color: muted, size: 10 },
    },
    crosshair: {
      show: showCrosshair,
      horizontal: {
        show: showCrosshair,
        line: { color: muted, style: "dashed", dashedValue: [3, 3] },
        text: { color: fg, backgroundColor: border },
      },
      vertical: {
        show: showCrosshair,
        line: { color: muted, style: "dashed", dashedValue: [3, 3] },
        text: { color: fg, backgroundColor: border },
      },
    },
    separator: { color: border, size: 1 },
  } as const;
}

function formatUtcDate(timestamp: number, format: string): string {
  const d = new Date(timestamp);
  const yyyy = String(d.getUTCFullYear());
  const yy = yyyy.slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");

  return format
    .replace("YYYY", yyyy)
    .replace("YY", yy)
    .replace("MM", mm)
    .replace("DD", dd)
    .replace("HH", hh)
    .replace("mm", mi);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "A" ||
    target.tagName === "BUTTON" ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function isPeriodKey(value: unknown): value is PeriodKey {
  return typeof value === "string" && PERIOD_ORDER.includes(value as PeriodKey);
}

function isTimeframe(value: unknown): value is Timeframe {
  return value === "D" || value === "W" || value === "M";
}

function isChartMode(value: unknown): value is ChartMode {
  return (
    value === "candle_solid" ||
    value === "candle_stroke" ||
    value === "ohlc" ||
    value === "area"
  );
}

function isChartDensity(value: unknown): value is ChartDensity {
  return value === "compact" || value === "standard" || value === "deep";
}

function isPriceScale(value: unknown): value is PriceScale {
  return value === "normal" || value === "log";
}

function clampIndicatorPaneScale(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(
    MAX_INDICATOR_PANE_SCALE,
    Math.max(MIN_INDICATOR_PANE_SCALE, parsed),
  );
}

function clampPricePaneScale(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(MAX_PRICE_PANE_SCALE, Math.max(MIN_PRICE_PANE_SCALE, parsed));
}

function sanitizeIndicatorParams(value: unknown): IndicatorParams {
  const raw = value && typeof value === "object" ? value : {};
  const out = defaultIndicatorParams();
  for (const key of INDICATOR_KEYS) {
    const candidate = (raw as Partial<IndicatorParams>)[key];
    if (!Array.isArray(candidate)) continue;
    const fallback = DEFAULT_INDICATOR_PARAMS[key];
    out[key] = fallback.map((fallbackValue, index) => {
      const parsed = Number(candidate[index]);
      const min = key === "boll" && index === 1 ? 0.1 : 1;
      const max =
        key === "boll" && index === 1
          ? MAX_INDICATOR_MULTIPLIER
          : MAX_INDICATOR_PERIOD;
      if (!Number.isFinite(parsed)) return fallbackValue;
      const clamped = Math.min(max, Math.max(min, parsed));
      return Number(clamped.toFixed(key === "boll" && index === 1 ? 1 : 0));
    });
  }
  return out;
}

function sanitizeIndicatorSet(value: unknown): IndicatorSet | undefined {
  if (!value || typeof value !== "object") return undefined;
  return INDICATOR_KEYS.reduce<IndicatorSet>(
    (acc, key) => ({
      ...acc,
      [key]:
        typeof (value as Partial<IndicatorSet>)[key] === "boolean"
          ? Boolean((value as Partial<IndicatorSet>)[key])
          : DEFAULT_INDICATORS[key],
    }),
    { ...DEFAULT_INDICATORS },
  );
}

function sanitizeIndicatorOrder(value: unknown): IndicatorKey[] {
  const seen = new Set<IndicatorKey>();
  const ordered: IndicatorKey[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (
        typeof item === "string" &&
        INDICATOR_KEYS.includes(item as IndicatorKey) &&
        !seen.has(item as IndicatorKey)
      ) {
        seen.add(item as IndicatorKey);
        ordered.push(item as IndicatorKey);
      }
    }
  }
  for (const key of INDICATOR_KEYS) {
    if (!seen.has(key)) ordered.push(key);
  }
  return ordered;
}

function isSavedIndicatorSlotKey(
  value: unknown,
): value is SavedIndicatorSlotKey {
  return (
    typeof value === "string" &&
    SAVED_INDICATOR_SLOT_KEYS.includes(value as SavedIndicatorSlotKey)
  );
}

function readStockChartSettings(): Partial<StockChartSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STOCK_CHART_SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StockChartSettings>;
    return {
      period: isPeriodKey(parsed.period) ? parsed.period : undefined,
      timeframe: isTimeframe(parsed.timeframe) ? parsed.timeframe : undefined,
      chartMode: isChartMode(parsed.chartMode) ? parsed.chartMode : undefined,
      priceScale: isPriceScale(parsed.priceScale)
        ? parsed.priceScale
        : undefined,
      density: isChartDensity(parsed.density) ? parsed.density : undefined,
      pricePaneScale: clampPricePaneScale(parsed.pricePaneScale),
      indicatorPaneScale: clampIndicatorPaneScale(parsed.indicatorPaneScale),
      showGrid:
        typeof parsed.showGrid === "boolean" ? parsed.showGrid : undefined,
      showCrosshair:
        typeof parsed.showCrosshair === "boolean"
          ? parsed.showCrosshair
          : undefined,
      showLastPriceLine:
        typeof parsed.showLastPriceLine === "boolean"
          ? parsed.showLastPriceLine
          : undefined,
      drawingRepeat:
        typeof parsed.drawingRepeat === "boolean"
          ? parsed.drawingRepeat
          : undefined,
      compareOpen:
        typeof parsed.compareOpen === "boolean"
          ? parsed.compareOpen
          : undefined,
      compareInput: sanitizeCompareInput(parsed.compareInput),
      compareHiddenSymbols: sanitizeCompareHiddenSymbols(
        parsed.compareHiddenSymbols,
      ),
      compareEndLabelsVisible:
        typeof parsed.compareEndLabelsVisible === "boolean"
          ? parsed.compareEndLabelsVisible
          : undefined,
      indicators: sanitizeIndicatorSet(parsed.indicators),
      indicatorParams: sanitizeIndicatorParams(parsed.indicatorParams),
      indicatorOrder: sanitizeIndicatorOrder(parsed.indicatorOrder),
      activeSavedIndicatorSlot: isSavedIndicatorSlotKey(
        parsed.activeSavedIndicatorSlot,
      )
        ? parsed.activeSavedIndicatorSlot
        : undefined,
    };
  } catch {
    return {};
  }
}

function writeStockChartSettings(settings: StockChartSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STOCK_CHART_SETTINGS_KEY,
      JSON.stringify(settings),
    );
  } catch {
    /* localStorage can be disabled; chart still works with in-memory state. */
  }
}

function parseSavedIndicatorSet(value: unknown): SavedIndicatorSet | null {
  const parsed = value as Partial<SavedIndicatorSet> | null | undefined;
  const indicators = sanitizeIndicatorSet(parsed?.indicators);
  if (!indicators) return null;
  return {
    indicators,
    indicatorParams: sanitizeIndicatorParams(parsed?.indicatorParams),
    indicatorOrder: sanitizeIndicatorOrder(parsed?.indicatorOrder),
  };
}

function readSavedIndicatorSlots(): SavedIndicatorSlots {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STOCK_CHART_SAVED_INDICATORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    const legacy = parseSavedIndicatorSet(parsed);
    if (legacy) return { "1": legacy };

    const source =
      parsed && typeof parsed === "object" && "slots" in parsed
        ? (parsed as { slots?: unknown }).slots
        : parsed;
    if (!source || typeof source !== "object") return {};

    return SAVED_INDICATOR_SLOT_KEYS.reduce<SavedIndicatorSlots>(
      (acc, slot) => {
        const saved = parseSavedIndicatorSet(
          (source as Partial<Record<SavedIndicatorSlotKey, unknown>>)[slot],
        );
        if (saved) acc[slot] = saved;
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeSavedIndicatorSlots(slots: SavedIndicatorSlots): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      STOCK_CHART_SAVED_INDICATORS_KEY,
      JSON.stringify({ slots }),
    );
    return true;
  } catch {
    return false;
  }
}

function writeSavedIndicatorSet(
  settings: SavedIndicatorSet,
  slot: SavedIndicatorSlotKey = "1",
): SavedIndicatorSlots | null {
  const slots = { ...readSavedIndicatorSlots(), [slot]: settings };
  return writeSavedIndicatorSlots(slots) ? slots : null;
}

function downloadUrl(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: unknown[][], filename: string): void {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    downloadUrl(url, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function formatCompactNumber(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatVolume(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function rollingAverageAt(
  data: KLineData[],
  index: number,
  period: number,
  pick: (bar: KLineData) => number,
): number | null {
  if (period <= 0 || index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const value = pick(data[i]);
    if (!Number.isFinite(value)) return null;
    sum += value;
  }
  return sum / period;
}

function rollingStdAt(
  data: KLineData[],
  index: number,
  period: number,
  pick: (bar: KLineData) => number,
  average: number,
): number | null {
  if (period <= 0 || index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const value = pick(data[i]);
    if (!Number.isFinite(value)) return null;
    sum += (value - average) ** 2;
  }
  return Math.sqrt(sum / period);
}

function emaSeries(values: number[], period: number): number[] {
  const result = Array<number>(values.length).fill(Number.NaN);
  if (period <= 0) return result;
  const alpha = 2 / (period + 1);
  let previous = Number.NaN;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!Number.isFinite(value)) continue;
    previous = Number.isFinite(previous)
      ? value * alpha + previous * (1 - alpha)
      : value;
    result[i] = previous;
  }
  return result;
}

function rsiAt(
  data: KLineData[],
  index: number,
  period: number,
): number | null {
  if (period <= 0 || index < period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const change = data[i].close - data[i - 1].close;
    if (!Number.isFinite(change)) return null;
    if (change >= 0) gain += change;
    else loss -= change;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

function kdjAt(
  data: KLineData[],
  index: number,
  period: number,
  kSmoothing: number,
  dSmoothing: number,
): { k: number; d: number; j: number } | null {
  if (period <= 0 || index < period - 1) return null;
  let k = 50;
  let d = 50;
  for (let i = period - 1; i <= index; i++) {
    const window = data.slice(i - period + 1, i + 1);
    const high = Math.max(...window.map((bar) => bar.high));
    const low = Math.min(...window.map((bar) => bar.low));
    if (!Number.isFinite(high) || !Number.isFinite(low) || high === low)
      continue;
    const rsv = ((data[i].close - low) / (high - low)) * 100;
    k = ((kSmoothing - 1) * k + rsv) / kSmoothing;
    d = ((dSmoothing - 1) * d + k) / dSmoothing;
  }
  const j = 3 * k - 2 * d;
  return [k, d, j].every(Number.isFinite) ? { k, d, j } : null;
}

function biasAt(
  data: KLineData[],
  index: number,
  period: number,
): number | null {
  const ma = rollingAverageAt(data, index, period, (bar) => bar.close);
  const close = data[index]?.close;
  if (ma == null || ma === 0 || !Number.isFinite(close)) return null;
  return ((close - ma) / ma) * 100;
}

function wrAt(data: KLineData[], index: number, period: number): number | null {
  if (period <= 0 || index < period - 1) return null;
  const window = data.slice(index - period + 1, index + 1);
  const high = Math.max(...window.map((bar) => bar.high));
  const low = Math.min(...window.map((bar) => bar.low));
  const close = data[index]?.close;
  if (
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(close)
  ) {
    return null;
  }
  const range = high - low;
  return range === 0 ? 0 : ((close - high) / range) * 100;
}

function cciAt(
  data: KLineData[],
  index: number,
  period: number,
): number | null {
  if (period <= 0 || index < period - 1) return null;
  const window = data.slice(index - period + 1, index + 1);
  const typicalPrices = window.map(
    (bar) => (bar.high + bar.low + bar.close) / 3,
  );
  if (!typicalPrices.every(Number.isFinite)) return null;
  const ma =
    typicalPrices.reduce((sum, value) => sum + value, 0) / typicalPrices.length;
  const meanDeviation =
    typicalPrices.reduce((sum, value) => sum + Math.abs(value - ma), 0) /
    typicalPrices.length;
  if (meanDeviation === 0) return 0;
  return (typicalPrices[typicalPrices.length - 1] - ma) / meanDeviation / 0.015;
}

function obvSeries(data: KLineData[]): number[] {
  const result = Array<number>(data.length).fill(Number.NaN);
  let obv = 0;
  for (let i = 0; i < data.length; i++) {
    const volume = Number(data[i]?.volume) || 0;
    if (i > 0) {
      if (data[i].close > data[i - 1].close) obv += volume;
      else if (data[i].close < data[i - 1].close) obv -= volume;
    }
    result[i] = obv;
  }
  return result;
}

function psyAt(
  data: KLineData[],
  index: number,
  period: number,
  maPeriod: number,
): { psy: number; maPsy: number | null } | null {
  if (period <= 0 || index < period) return null;
  const psyValues: number[] = [];
  for (let i = Math.max(period, index - maPeriod + 1); i <= index; i++) {
    let upCount = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].close > data[j - 1].close) upCount += 1;
    }
    psyValues.push((upCount / period) * 100);
  }
  const psy = psyValues[psyValues.length - 1];
  const maPsy =
    maPeriod > 0 && psyValues.length >= maPeriod
      ? psyValues.slice(-maPeriod).reduce((sum, value) => sum + value, 0) /
        maPeriod
      : null;
  return Number.isFinite(psy) ? { psy, maPsy } : null;
}

function Chip({
  on,
  label,
  onClick,
  title,
}: {
  on: boolean;
  label: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={cn(
        "text-[11px] px-2 py-0.5 rounded border transition-all font-medium whitespace-nowrap shrink-0",
        on
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
      )}
    >
      {label}
    </button>
  );
}

export interface StockChartProps {
  ticker: string;
  currency?: "USD" | "KRW";
  initialPeriod?: PeriodKey;
  initialTimeframe?: Timeframe;
  initialIndicators?: Partial<IndicatorSet>;
  /** Optional override for the price pane height (default 360) */
  priceHeight?: number;
}

export default function StockChart({
  ticker,
  currency,
  initialPeriod = "3M",
  initialTimeframe = "D",
  initialIndicators,
  priceHeight = 360,
}: StockChartProps) {
  const storedSettings = useMemo(() => readStockChartSettings(), []);
  const [period, setPeriod] = useState<PeriodKey>(
    storedSettings.period ?? initialPeriod,
  );
  const [timeframe, setTimeframe] = useState<Timeframe>(
    storedSettings.timeframe ?? initialTimeframe,
  );
  const [indicators, setIndicators] = useState<IndicatorSet>({
    ...DEFAULT_INDICATORS,
    ...(initialIndicators ?? {}),
    ...(storedSettings.indicators ?? {}),
  });
  const [indicatorParams, setIndicatorParams] = useState<IndicatorParams>(
    storedSettings.indicatorParams ?? defaultIndicatorParams(),
  );
  const [indicatorOrder, setIndicatorOrder] = useState<IndicatorKey[]>(
    () => storedSettings.indicatorOrder ?? [...INDICATOR_KEYS],
  );
  const [chartMode, setChartMode] = useState<ChartMode>(
    storedSettings.chartMode ?? "candle_solid",
  );
  const [priceScale, setPriceScale] = useState<PriceScale>(
    storedSettings.priceScale ?? "normal",
  );
  const [density, setDensity] = useState<ChartDensity>(
    storedSettings.density ?? "standard",
  );
  const [pricePaneScale, setPricePaneScale] = useState(
    storedSettings.pricePaneScale ?? 1,
  );
  const [indicatorPaneScale, setIndicatorPaneScale] = useState(
    storedSettings.indicatorPaneScale ?? 1,
  );
  const [showGrid, setShowGrid] = useState(storedSettings.showGrid ?? true);
  const [showCrosshair, setShowCrosshair] = useState(
    storedSettings.showCrosshair ?? true,
  );
  const [showLastPriceLine, setShowLastPriceLine] = useState(
    storedSettings.showLastPriceLine ?? true,
  );
  const [expanded, setExpanded] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [dataTableOpen, setDataTableOpen] = useState(false);
  const [showAllIndicatorParams, setShowAllIndicatorParams] = useState(false);
  const [indicatorCategory, setIndicatorCategory] =
    useState<IndicatorCategoryKey>("all");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [draggedIndicator, setDraggedIndicator] = useState<IndicatorKey | null>(
    null,
  );
  const [dragOverIndicator, setDragOverIndicator] =
    useState<IndicatorKey | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeDrawing, setActiveDrawing] = useState<DrawingToolKey | null>(
    null,
  );
  const [drawingRepeat, setDrawingRepeat] = useState(
    storedSettings.drawingRepeat ?? false,
  );
  const [pendingRepeatDrawing, setPendingRepeatDrawing] =
    useState<DrawingToolKey | null>(null);
  const [activeBar, setActiveBar] = useState<KLineData | null>(null);
  const [keyboardBarIndex, setKeyboardBarIndex] = useState<number | null>(null);
  const [pinnedBar, setPinnedBar] = useState<KLineData | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  const [activeSavedIndicatorSlot, setActiveSavedIndicatorSlot] =
    useState<SavedIndicatorSlotKey>(
      storedSettings.activeSavedIndicatorSlot ?? "1",
    );
  const [savedIndicatorSlots, setSavedIndicatorSlots] =
    useState<SavedIndicatorSlots>(() => readSavedIndicatorSlots());
  const hasSavedIndicatorSet = Boolean(
    savedIndicatorSlots[activeSavedIndicatorSlot],
  );
  const [indicatorSetStatus, setIndicatorSetStatus] = useState<string | null>(
    null,
  );
  const [compareOpen, setCompareOpen] = useState(
    storedSettings.compareOpen ?? false,
  );
  const [compareDataTableOpen, setCompareDataTableOpen] = useState(false);
  const [compareEndLabelsVisible, setCompareEndLabelsVisible] = useState(
    storedSettings.compareEndLabelsVisible ?? true,
  );
  const [compareInput, setCompareInput] = useState(
    storedSettings.compareInput ?? "SPY QQQ",
  );
  const [compareRows, setCompareRows] = useState<StockCompareRow[]>([]);
  const [compareSeries, setCompareSeries] = useState<StockCompareSeriesMeta[]>(
    [],
  );
  const [compareHiddenSymbols, setCompareHiddenSymbols] = useState<Set<string>>(
    () => new Set(storedSettings.compareHiddenSymbols ?? []),
  );
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareRetry, setCompareRetry] = useState(0);
  const [compareHoverIndex, setCompareHoverIndex] = useState<number | null>(
    null,
  );
  const [comparePinnedIndex, setComparePinnedIndex] = useState<number | null>(
    null,
  );
  const chartHelpId = useId();
  const chartStatusId = useId();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const rootRef = useRef<HTMLDivElement | null>(null);
  const chartWheelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  // Track which pane indicators are currently mounted, so toggling is
  // a precise add/remove rather than a full chart rebuild (no flicker).
  const mountedPanes = useRef<Set<IndicatorKey>>(new Set());
  const mountedOverlays = useRef<Set<IndicatorKey>>(new Set());
  const previousIndicatorOrderRef = useRef<string | null>(null);
  const soloReturnIndicatorsRef = useRef<IndicatorSet | null>(null);
  const layoutRaf = useRef<number | null>(null);
  const visibleRangeRaf = useRef<number | null>(null);
  const visibleRangeTimeout = useRef<number | null>(null);
  const chartPointerRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const activeDrawingId = useRef<string | null>(null);
  const drawingRepeatRef = useRef(false);
  const drawingIds = useRef<string[]>([]);
  const [drawingCount, setDrawingCount] = useState(0);

  useEffect(() => {
    drawingRepeatRef.current = drawingRepeat;
  }, [drawingRepeat]);

  // Always pull the full available history (≤5y) up-front. Period buttons
  // only re-target the visible zoom window; they don't refetch. Without
  // this, mouse-wheel zoom-out would just compress the same N bars and
  // leave the rest of the canvas empty — which is exactly what users hit.
  const FULL_HISTORY_DAYS = 1825; // backend max window for DB daily bars
  const {
    data: barsData,
    meta: barsMeta,
    loading,
    error: barsError,
    refetch: refetchBars,
  } = useStockBars(ticker || undefined, FULL_HISTORY_DAYS);
  const compareInputSymbols = useMemo(
    () => parseCompareInput(compareInput),
    [compareInput],
  );
  const primaryCompareSymbol = ticker.trim().toUpperCase();
  const effectiveCompareInputSymbols = useMemo(
    () =>
      compareInputSymbols.filter((symbol) => symbol !== primaryCompareSymbol),
    [compareInputSymbols, primaryCompareSymbol],
  );
  const compareInputHasCurrentSymbol =
    primaryCompareSymbol.length > 0 &&
    compareInputSymbols.includes(primaryCompareSymbol);
  const compareInputLimitReached = effectiveCompareInputSymbols.length >= 4;
  const activeComparePreset = useMemo(() => {
    const matches = (symbols: readonly string[]) => {
      const presetSymbols = symbols
        .map((symbol) => symbol.toUpperCase())
        .filter((symbol) => symbol !== primaryCompareSymbol)
        .slice(0, 4);
      return (
        presetSymbols.length > 0 &&
        presetSymbols.length === effectiveCompareInputSymbols.length &&
        presetSymbols.every((symbol) =>
          effectiveCompareInputSymbols.includes(symbol),
        )
      );
    };
    return (
      QUICK_COMPARE_PRESETS.find((preset) => matches(preset.symbols)) ?? null
    );
  }, [effectiveCompareInputSymbols, primaryCompareSymbol]);
  const compareSymbols = useMemo(() => {
    const seen = new Set<string>();
    return [primaryCompareSymbol, ...effectiveCompareInputSymbols]
      .filter(Boolean)
      .filter((symbol) => {
        if (seen.has(symbol)) return false;
        seen.add(symbol);
        return true;
      })
      .slice(0, 5);
  }, [effectiveCompareInputSymbols, primaryCompareSymbol]);
  const loadedCompareSymbols = useMemo(
    () =>
      compareSeries
        .filter((item) => item.returned_count > 0)
        .slice(0, 5)
        .map((item) => item.symbol),
    [compareSeries],
  );
  const visibleCompareSymbols = useMemo(
    () =>
      loadedCompareSymbols.filter(
        (symbol) => !compareHiddenSymbols.has(symbol),
      ),
    [compareHiddenSymbols, loadedCompareSymbols],
  );

  const normalizedBarsResult = useMemo(
    () => normalizeDailyBarsWithStats((barsData ?? []) as DailyBar[]),
    [barsData],
  );
  const normalizedBars = normalizedBarsResult.bars;
  const droppedBarCount =
    normalizedBarsResult.invalidRows + normalizedBarsResult.duplicateRows;
  const barGapStats = useMemo(() => {
    if (normalizedBars.length < 2) return null;
    let maxGapDays = 0;
    let largeGapCount = 0;
    for (let i = 1; i < normalizedBars.length; i++) {
      const prev = Date.parse(`${normalizedBars[i - 1].date}T00:00:00Z`);
      const next = Date.parse(`${normalizedBars[i].date}T00:00:00Z`);
      if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
      const gapDays = Math.round((next - prev) / 86_400_000);
      if (gapDays > maxGapDays) maxGapDays = gapDays;
      if (gapDays > 7) largeGapCount += 1;
    }
    return { maxGapDays, largeGapCount };
  }, [normalizedBars]);
  const barStaleLabel = useMemo(() => {
    const last = normalizedBars[normalizedBars.length - 1];
    if (!last) return "";
    return staleDayLabel(Date.parse(`${last.date}T00:00:00Z`));
  }, [normalizedBars]);
  const hasBarQualityWarning =
    Boolean(barStaleLabel) ||
    droppedBarCount > 0 ||
    (barGapStats != null && barGapStats.maxGapDays > 7) ||
    (barsMeta?.duplicate_count != null && barsMeta.duplicate_count > 0);
  const barQualityChips = useMemo(() => {
    const chips: string[] = [];
    if (barStaleLabel) chips.push(barStaleLabel.replace(/^ · /, ""));
    if (barGapStats && barGapStats.maxGapDays > 7) {
      chips.push(`공백 ${barGapStats.largeGapCount.toLocaleString()}개`);
    }
    if (normalizedBarsResult.invalidRows > 0) {
      chips.push(`무효 ${normalizedBarsResult.invalidRows.toLocaleString()}`);
    }
    const duplicateTotal =
      normalizedBarsResult.duplicateRows + (barsMeta?.duplicate_count ?? 0);
    if (duplicateTotal > 0)
      chips.push(`중복 ${duplicateTotal.toLocaleString()}`);
    return chips;
  }, [barGapStats, barStaleLabel, barsMeta, normalizedBarsResult]);

  useEffect(() => {
    if (!compareOpen) return;
    if (compareSymbols.length < 2) {
      setCompareRows([]);
      setCompareSeries([]);
      setCompareError("비교할 종목을 하나 이상 입력하세요");
      setCompareLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setCompareLoading(true);
    setCompareError(null);
    stocksService
      .compareBars(compareSymbols, FULL_HISTORY_DAYS, {
        signal: controller.signal,
      })
      .then((response) => {
        if (cancelled) return;
        setCompareRows(response.rows as StockCompareRow[]);
        setCompareSeries(response.series);
        setCompareError(null);
        setCompareLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted || cancelled) return;
        setCompareRows([]);
        setCompareSeries([]);
        setCompareError(
          error instanceof Error
            ? error.message
            : "비교 차트 API 요청이 실패했습니다",
        );
        setCompareLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [compareOpen, compareRetry, compareSymbols]);

  useEffect(() => {
    if (compareHiddenSymbols.size === 0) return;
    const available = new Set(loadedCompareSymbols);
    setCompareHiddenSymbols((current) => {
      const next = new Set(
        [...current].filter((symbol) => available.has(symbol)),
      );
      return next.size === current.size ? current : next;
    });
  }, [compareHiddenSymbols.size, loadedCompareSymbols]);

  const toggleCompareSeries = useCallback((symbol: string) => {
    setCompareHiddenSymbols((current) => {
      const next = new Set(current);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }, []);

  const toggleQuickCompareSymbol = useCallback(
    (symbol: string) => {
      const normalized = symbol.trim().toUpperCase();
      const primary = ticker.trim().toUpperCase();
      if (!normalized || normalized === primary) return;
      setCompareInput((current) => {
        const currentSymbols = parseCompareInput(current).filter(
          (item) => item !== primary,
        );
        const nextSymbols = currentSymbols.includes(normalized)
          ? currentSymbols.filter((item) => item !== normalized)
          : [...currentSymbols, normalized];
        return nextSymbols.slice(0, 4).join(" ");
      });
      setCompareOpen(true);
      setCompareHiddenSymbols((current) => {
        if (!current.has(normalized)) return current;
        const next = new Set(current);
        next.delete(normalized);
        return next;
      });
    },
    [ticker],
  );

  const clearCompareInputSymbols = useCallback(() => {
    setCompareInput("");
    setCompareHiddenSymbols(new Set());
    setCompareHoverIndex(null);
    setComparePinnedIndex(null);
  }, []);

  const applyQuickComparePreset = useCallback(
    (symbols: readonly string[]) => {
      const primary = ticker.trim().toUpperCase();
      const nextSymbols = symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .filter(
          (symbol, index, list) =>
            symbol !== primary && list.indexOf(symbol) === index,
        )
        .slice(0, 4);
      setCompareInput(nextSymbols.join(" "));
      setCompareOpen(true);
      setCompareHiddenSymbols(new Set());
      setCompareHoverIndex(null);
      setComparePinnedIndex(null);
    },
    [ticker],
  );

  const cycleQuickComparePreset = useCallback(() => {
    const currentIndex = activeComparePreset
      ? QUICK_COMPARE_PRESETS.findIndex(
          (preset) => preset.key === activeComparePreset.key,
        )
      : -1;
    const nextPreset =
      QUICK_COMPARE_PRESETS[(currentIndex + 1) % QUICK_COMPARE_PRESETS.length];
    applyQuickComparePreset(nextPreset.symbols);
  }, [activeComparePreset, applyQuickComparePreset]);

  const soloCompareSeries = useCallback(
    (symbol: string) => {
      const primary = loadedCompareSymbols[0];
      const keep = new Set<string>(
        symbol === primary
          ? loadedCompareSymbols.slice(0, 2)
          : [primary, symbol].filter(Boolean),
      );
      setCompareHiddenSymbols(
        new Set(loadedCompareSymbols.filter((item) => !keep.has(item))),
      );
    },
    [loadedCompareSymbols],
  );

  const showAllCompareSeries = useCallback(() => {
    setCompareHiddenSymbols(new Set());
  }, []);

  const klineData = useMemo<KLineData[]>(() => {
    if (normalizedBars.length === 0) return [];
    const agg = aggregate(normalizedBars, timeframe);
    return toKlineData(agg);
  }, [normalizedBars, timeframe]);
  const klineIndexByTimestamp = useMemo(() => {
    const map = new Map<number, number>();
    klineData.forEach((bar, index) => {
      map.set(Number(bar.timestamp), index);
    });
    return map;
  }, [klineData]);
  const klineDataSignature = useMemo(() => {
    return klineDataFingerprint(klineData, ticker, timeframe);
  }, [klineData, ticker, timeframe]);

  const dataRangeLabel = useMemo(() => {
    if (barsError) return "데이터 오류";
    if (normalizedBars.length === 0) return "데이터 없음";
    const first = normalizedBars[0]?.date ?? "—";
    const last = normalizedBars[normalizedBars.length - 1]?.date ?? "—";
    const dropped =
      droppedBarCount > 0 ? ` · 제외 ${droppedBarCount.toLocaleString()}` : "";
    const invalid =
      normalizedBarsResult.invalidRows > 0
        ? ` · 무효 ${normalizedBarsResult.invalidRows.toLocaleString()}`
        : "";
    const duplicates =
      normalizedBarsResult.duplicateRows > 0
        ? ` · 중복 ${normalizedBarsResult.duplicateRows.toLocaleString()}`
        : "";
    const gaps =
      barGapStats && barGapStats.maxGapDays > 7
        ? ` · 공백 ${barGapStats.largeGapCount.toLocaleString()}개/최대 ${barGapStats.maxGapDays}일`
        : "";
    return `${first} ~ ${last} · ${normalizedBars.length.toLocaleString()} bars${barStaleLabel}${dropped}${invalid}${duplicates}${gaps}`;
  }, [
    barGapStats,
    barStaleLabel,
    barsError,
    droppedBarCount,
    normalizedBars,
    normalizedBarsResult,
  ]);
  const dbStatusLabel = useMemo(() => {
    if (barsError) return "DB 오류";
    if (loading) return "DB 갱신 중";
    if (normalizedBars.length === 0) return "DB 데이터 없음";
    const last = normalizedBars[normalizedBars.length - 1]?.date ?? "—";
    const dropped =
      droppedBarCount > 0 ? ` · 제외 ${droppedBarCount.toLocaleString()}` : "";
    const invalid =
      normalizedBarsResult.invalidRows > 0
        ? ` · 무효 ${normalizedBarsResult.invalidRows.toLocaleString()}`
        : "";
    const localDuplicates =
      normalizedBarsResult.duplicateRows > 0
        ? ` · 로컬중복 ${normalizedBarsResult.duplicateRows.toLocaleString()}`
        : "";
    const raw =
      barsMeta?.raw_count != null &&
      barsMeta.raw_count !== normalizedBars.length
        ? ` · 원천 ${barsMeta.raw_count.toLocaleString()}`
        : "";
    const aliases =
      barsMeta?.instrument_count != null && barsMeta.instrument_count > 1
        ? ` · ${barsMeta.instrument_count}소스`
        : "";
    const duplicates =
      barsMeta?.duplicate_count != null && barsMeta.duplicate_count > 0
        ? ` · 중복 ${barsMeta.duplicate_count.toLocaleString()}`
        : "";
    const gaps =
      barGapStats && barGapStats.maxGapDays > 7
        ? ` · 공백 ${barGapStats.largeGapCount.toLocaleString()}개/최대 ${barGapStats.maxGapDays}일`
        : "";
    return `DB ${last} · ${normalizedBars.length.toLocaleString()}행${barStaleLabel}${raw}${aliases}${duplicates}${dropped}${invalid}${localDuplicates}${gaps}`;
  }, [
    barGapStats,
    barStaleLabel,
    barsError,
    barsMeta,
    droppedBarCount,
    loading,
    normalizedBars,
    normalizedBarsResult,
  ]);
  const dbSourceStatus = useMemo(() => {
    const requestedDays = barsMeta?.requested_days ?? FULL_HISTORY_DAYS;
    const returnedCount = barsMeta?.returned_count ?? normalizedBars.length;
    const from = barsMeta?.from_date ?? normalizedBars[0]?.date ?? null;
    const to =
      barsMeta?.to_date ??
      normalizedBars[normalizedBars.length - 1]?.date ??
      null;
    const rawCount = barsMeta?.raw_count ?? null;
    const instrumentCount = barsMeta?.instrument_count ?? null;
    return {
      label: barsError ? "DB ERROR" : loading ? "DB LOAD" : "DB",
      title: [
        `/stocks/${ticker || "symbol"}/bars?days=${requestedDays}`,
        `${returnedCount.toLocaleString()}행 반환`,
        from && to ? `${from} ~ ${to}` : null,
        rawCount != null ? `원천 ${rawCount.toLocaleString()}행` : null,
        instrumentCount != null && instrumentCount > 1
          ? `${instrumentCount.toLocaleString()}개 instrument 소스`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      requestedDays,
    };
  }, [FULL_HISTORY_DAYS, barsError, barsMeta, loading, normalizedBars, ticker]);
  const visibleRangeLabel = useMemo(() => {
    if (!visibleRange || klineData.length === 0) return dataRangeLabel;
    const from = Math.max(0, Math.floor(visibleRange.realFrom));
    const to = Math.min(klineData.length - 1, Math.ceil(visibleRange.realTo));
    const first = klineData[from];
    const last = klineData[to];
    if (!first || !last) return dataRangeLabel;
    const count = Math.max(0, to - from + 1);
    return `${formatUtcDate(first.timestamp, "YYYY-MM-DD")} ~ ${formatUtcDate(last.timestamp, "YYYY-MM-DD")} · ${count.toLocaleString()} 표시`;
  }, [dataRangeLabel, klineData, visibleRange]);
  const visibleRangeWindow = useMemo(() => {
    if (!visibleRange || klineData.length <= 1) return null;
    const from = Math.max(0, Math.floor(visibleRange.realFrom));
    const to = Math.min(klineData.length - 1, Math.ceil(visibleRange.realTo));
    if (to <= from) return null;
    const span = Math.max(1, to - from);
    const maxStart = Math.max(0, klineData.length - 1 - span);
    return {
      from,
      to,
      span,
      maxStart,
      enabled: maxStart > 0,
    };
  }, [klineData.length, visibleRange]);
  const rangeNavigator = useMemo(() => {
    if (!visibleRangeWindow || klineData.length <= 1) return null;
    const width = 1000;
    const height = 34;
    const step = Math.max(1, Math.ceil(klineData.length / 260));
    const sampled = klineData
      .map((bar, index) => ({ bar, index }))
      .filter(
        ({ index }) =>
          index % step === 0 || index === 0 || index === klineData.length - 1,
      );
    const closes = sampled
      .map(({ bar }) => Number(bar.close))
      .filter(Number.isFinite);
    if (closes.length === 0) return null;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const spread = Math.max(1, max - min);
    const path = sampled
      .map(({ bar, index }, pointIndex) => {
        const x = (index / Math.max(1, klineData.length - 1)) * width;
        const y =
          height - ((Number(bar.close) - min) / spread) * (height - 4) - 2;
        return `${pointIndex === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    const fromPct = (visibleRangeWindow.from / (klineData.length - 1)) * 100;
    const toPct = (visibleRangeWindow.to / (klineData.length - 1)) * 100;
    const first = klineData[0];
    const last = klineData[klineData.length - 1];
    const windowFirst = klineData[visibleRangeWindow.from];
    const windowLast = klineData[visibleRangeWindow.to];
    const change =
      windowFirst?.close > 0 && Number.isFinite(windowLast?.close)
        ? windowLast.close - windowFirst.close
        : null;
    const changePct =
      change != null && windowFirst.close !== 0
        ? (change / Math.abs(windowFirst.close)) * 100
        : null;
    return {
      path,
      viewBox: `0 0 ${width} ${height}`,
      fromPct: Math.max(0, Math.min(100, fromPct)),
      widthPct: Math.max(1.5, Math.min(100, toPct - fromPct)),
      sourceLabel: `${formatUtcDate(first.timestamp, "YY.MM.DD")} - ${formatUtcDate(
        last.timestamp,
        "YY.MM.DD",
      )}`,
      windowLabel: `${formatUtcDate(
        windowFirst.timestamp,
        "YY.MM.DD",
      )} - ${formatUtcDate(windowLast.timestamp, "YY.MM.DD")}`,
      changeLabel:
        changePct == null
          ? null
          : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
      changeTone:
        changePct == null ? "neutral" : changePct >= 0 ? "up" : "down",
    };
  }, [klineData, visibleRangeWindow]);
  const visibleTableRows = useMemo(() => {
    if (klineData.length === 0) return [];
    const from = visibleRangeWindow?.from ?? 0;
    const to = visibleRangeWindow?.to ?? klineData.length - 1;
    const rows = klineData.slice(from, to + 1);
    const maxRows = expanded ? 360 : 160;
    if (rows.length <= maxRows) return rows;
    const step = Math.max(1, Math.ceil(rows.length / maxRows));
    return rows.filter(
      (_, index) => index % step === 0 || index === rows.length - 1,
    );
  }, [expanded, klineData, visibleRangeWindow]);
  const visibleCsvRows = useMemo(() => {
    if (klineData.length === 0) return [];
    const from = visibleRangeWindow?.from ?? 0;
    const to = visibleRangeWindow?.to ?? klineData.length - 1;
    return klineData.slice(from, to + 1);
  }, [klineData, visibleRangeWindow]);
  const indicatorTableColumns = useMemo<IndicatorTableColumn[]>(() => {
    if (klineData.length === 0) return [];
    const columns: IndicatorTableColumn[] = [];
    const closes = klineData.map((bar) => bar.close);
    const pushColumn = (
      key: string,
      label: string,
      formatter: IndicatorTableColumn["formatter"],
      values: number[],
    ) => {
      if (values.some(Number.isFinite)) {
        columns.push({ key, label, formatter, values });
      }
    };

    if (indicators.ma) {
      for (const period of indicatorParams.ma) {
        pushColumn(
          `ma-${period}`,
          `MA ${period}`,
          "price",
          klineData.map(
            (_, index) =>
              rollingAverageAt(klineData, index, period, (bar) => bar.close) ??
              Number.NaN,
          ),
        );
      }
    }
    if (indicators.ema) {
      for (const period of indicatorParams.ema) {
        pushColumn(
          `ema-${period}`,
          `EMA ${period}`,
          "price",
          emaSeries(closes, period),
        );
      }
    }
    if (indicators.boll) {
      const [period, deviation] = indicatorParams.boll;
      const mids = klineData.map(
        (_, index) =>
          rollingAverageAt(klineData, index, period, (bar) => bar.close) ??
          Number.NaN,
      );
      const stds = klineData.map((_, index) =>
        Number.isFinite(mids[index])
          ? (rollingStdAt(
              klineData,
              index,
              period,
              (bar) => bar.close,
              mids[index],
            ) ?? Number.NaN)
          : Number.NaN,
      );
      pushColumn(
        "boll-up",
        "BOLL U",
        "price",
        mids.map((mid, index) => mid + stds[index] * deviation),
      );
      pushColumn("boll-mid", "BOLL M", "price", mids);
      pushColumn(
        "boll-low",
        "BOLL L",
        "price",
        mids.map((mid, index) => mid - stds[index] * deviation),
      );
    }
    if (indicators.vol) {
      for (const period of indicatorParams.vol) {
        pushColumn(
          `vol-${period}`,
          `VOLMA ${period}`,
          "volume",
          klineData.map(
            (_, index) =>
              rollingAverageAt(
                klineData,
                index,
                period,
                (bar) => Number(bar.volume) || 0,
              ) ?? Number.NaN,
          ),
        );
      }
    }
    if (indicators.macd) {
      const [fast, slow, signal] = indicatorParams.macd;
      const fastEma = emaSeries(closes, fast);
      const slowEma = emaSeries(closes, slow);
      const dif = closes.map((_, index) => fastEma[index] - slowEma[index]);
      const dea = emaSeries(dif, signal);
      pushColumn("macd-dif", "MACD DIF", "plain", dif);
      pushColumn("macd-dea", "MACD DEA", "plain", dea);
      pushColumn(
        "macd-hist",
        "MACD H",
        "plain",
        dif.map((value, index) => (value - dea[index]) * 2),
      );
    }
    if (indicators.rsi) {
      for (const period of indicatorParams.rsi) {
        pushColumn(
          `rsi-${period}`,
          `RSI ${period}`,
          "plain",
          klineData.map(
            (_, index) => rsiAt(klineData, index, period) ?? Number.NaN,
          ),
        );
      }
    }
    if (indicators.kdj) {
      const [period, kSmoothing, dSmoothing] = indicatorParams.kdj;
      const values = klineData.map((_, index) =>
        kdjAt(klineData, index, period, kSmoothing, dSmoothing),
      );
      pushColumn(
        "kdj-k",
        "KDJ K",
        "plain",
        values.map((value) => value?.k ?? Number.NaN),
      );
      pushColumn(
        "kdj-d",
        "KDJ D",
        "plain",
        values.map((value) => value?.d ?? Number.NaN),
      );
      pushColumn(
        "kdj-j",
        "KDJ J",
        "plain",
        values.map((value) => value?.j ?? Number.NaN),
      );
    }
    if (indicators.wr) {
      for (const period of indicatorParams.wr) {
        pushColumn(
          `wr-${period}`,
          `WR ${period}`,
          "plain",
          klineData.map(
            (_, index) => wrAt(klineData, index, period) ?? Number.NaN,
          ),
        );
      }
    }
    if (indicators.bias) {
      for (const period of indicatorParams.bias) {
        pushColumn(
          `bias-${period}`,
          `BIAS ${period}`,
          "plain",
          klineData.map(
            (_, index) => biasAt(klineData, index, period) ?? Number.NaN,
          ),
        );
      }
    }
    if (indicators.cci) {
      const [period] = indicatorParams.cci;
      pushColumn(
        "cci",
        `CCI ${period}`,
        "plain",
        klineData.map(
          (_, index) => cciAt(klineData, index, period) ?? Number.NaN,
        ),
      );
    }
    if (indicators.obv) {
      const [period] = indicatorParams.obv;
      const obv = obvSeries(klineData);
      pushColumn("obv", "OBV", "volume", obv);
      pushColumn(
        "obv-ma",
        `OBV MA${period}`,
        "volume",
        obv.map((_, index) =>
          index >= period - 1
            ? obv
                .slice(index - period + 1, index + 1)
                .reduce((sum, value) => sum + value, 0) / period
            : Number.NaN,
        ),
      );
    }
    if (indicators.psy) {
      const [period, maPeriod] = indicatorParams.psy;
      const values = klineData.map((_, index) =>
        psyAt(klineData, index, period, maPeriod),
      );
      pushColumn(
        "psy",
        `PSY ${period}`,
        "plain",
        values.map((value) => value?.psy ?? Number.NaN),
      );
      pushColumn(
        "psy-ma",
        `PSY MA${maPeriod}`,
        "plain",
        values.map((value) => value?.maPsy ?? Number.NaN),
      );
    }
    return columns;
  }, [indicatorParams, indicators, klineData]);
  const visibleTableSampledCount = Math.max(
    0,
    (visibleRangeWindow
      ? visibleRangeWindow.to - visibleRangeWindow.from + 1
      : klineData.length) - visibleTableRows.length,
  );
  const visibleRangeStatus = useMemo(() => {
    if (!visibleRange || klineData.length === 0) return null;
    const from = Math.max(0, Math.floor(visibleRange.realFrom));
    const to = Math.min(klineData.length - 1, Math.ceil(visibleRange.realTo));
    if (to < from) return null;
    const count = to - from + 1;
    const targetCount = Math.min(
      klineData.length,
      visibleBarsForPeriod(klineData, period),
    );
    const nearSelectedPeriod =
      Math.abs(count - targetCount) <=
      Math.max(2, Math.round(targetCount * 0.03));
    const pct = (count / klineData.length) * 100;
    return {
      label:
        count >= klineData.length
          ? "VIEW 전체"
          : nearSelectedPeriod
            ? `VIEW ${period}`
            : "VIEW 사용자",
      detail: `${count.toLocaleString()}/${klineData.length.toLocaleString()} · ${pct.toFixed(
        pct >= 10 ? 0 : 1,
      )}%`,
      title: `${formatUtcDate(klineData[from].timestamp, "YYYY-MM-DD")} ~ ${formatUtcDate(
        klineData[to].timestamp,
        "YYYY-MM-DD",
      )}`,
    };
  }, [klineData, period, visibleRange]);
  const visibleRangeGapStats = useMemo(() => {
    if (klineData.length < 2) return null;
    const from = visibleRangeWindow?.from ?? 0;
    const to = visibleRangeWindow?.to ?? klineData.length - 1;
    if (to <= from) return null;
    let maxGapDays = 0;
    let largeGapCount = 0;
    for (let i = from + 1; i <= to; i++) {
      const prev = Number(klineData[i - 1]?.timestamp);
      const next = Number(klineData[i]?.timestamp);
      if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
      const gapDays = Math.round((next - prev) / 86_400_000);
      if (gapDays > maxGapDays) maxGapDays = gapDays;
      if (gapDays > 7) largeGapCount += 1;
    }
    return largeGapCount > 0 ? { maxGapDays, largeGapCount } : null;
  }, [klineData, visibleRangeWindow]);
  const visibleRangeStats = useMemo(() => {
    if (!visibleRange || klineData.length === 0) return null;
    const from = Math.max(0, Math.floor(visibleRange.realFrom));
    const to = Math.min(klineData.length - 1, Math.ceil(visibleRange.realTo));
    if (to < from) return null;
    const slice = klineData.slice(from, to + 1);
    const first = slice[0];
    const last = slice[slice.length - 1];
    if (!first || !last || first.close <= 0) return null;
    const high = Math.max(...slice.map((bar) => bar.high));
    const low = Math.min(...slice.map((bar) => bar.low));
    const volume = slice.reduce(
      (sum, bar) => sum + Math.max(0, Number(bar.volume) || 0),
      0,
    );
    const typicalValue = slice.reduce((sum, bar) => {
      const v = Math.max(0, Number(bar.volume) || 0);
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      return sum + typicalPrice * v;
    }, 0);
    const change = last.close - first.close;
    const changePct = (change / first.close) * 100;
    const spread = high - low;
    const spreadPct = low > 0 ? (spread / low) * 100 : 0;
    const avgVolume = slice.length > 0 ? volume / slice.length : 0;
    const vwap = volume > 0 ? typicalValue / volume : null;
    let peak = first.high;
    let maxDrawdownPct = 0;
    for (const bar of slice) {
      peak = Math.max(peak, bar.high);
      if (peak > 0) {
        maxDrawdownPct = Math.min(
          maxDrawdownPct,
          ((bar.low - peak) / peak) * 100,
        );
      }
    }
    if (
      ![
        high,
        low,
        change,
        changePct,
        spread,
        spreadPct,
        volume,
        avgVolume,
        maxDrawdownPct,
      ].every(Number.isFinite) ||
      (vwap != null && !Number.isFinite(vwap))
    ) {
      return null;
    }
    return {
      high,
      low,
      change,
      changePct,
      spread,
      spreadPct,
      volume,
      avgVolume,
      vwap,
      maxDrawdownPct,
      up: change >= 0,
    };
  }, [klineData, visibleRange]);
  const latestBar = klineData[klineData.length - 1] ?? null;
  const keyboardBar =
    keyboardBarIndex == null ? null : (klineData[keyboardBarIndex] ?? null);
  const readoutBar = pinnedBar ?? keyboardBar ?? activeBar ?? latestBar;
  const readoutIndex = useMemo(() => {
    if (!readoutBar) return -1;
    return klineData.findIndex((bar) => bar.timestamp === readoutBar.timestamp);
  }, [klineData, readoutBar]);
  const readoutPrevBar = useMemo(() => {
    return readoutIndex > 0 ? klineData[readoutIndex - 1] : null;
  }, [klineData, readoutIndex]);
  useEffect(() => {
    setActiveBar(null);
    setKeyboardBarIndex(null);
    setPinnedBar(null);
  }, [klineDataSignature]);
  useEffect(() => {
    if (!pinnedBar) return;
    if (!klineData.some((bar) => bar.timestamp === pinnedBar.timestamp)) {
      setPinnedBar(null);
    }
  }, [klineData, pinnedBar]);
  useEffect(() => {
    if (keyboardBarIndex == null) return;
    if (keyboardBarIndex < 0 || keyboardBarIndex >= klineData.length) {
      setKeyboardBarIndex(null);
    }
  }, [keyboardBarIndex, klineData.length]);
  const readoutChange = readoutPrevBar
    ? readoutBar!.close - readoutPrevBar.close
    : readoutBar
      ? readoutBar.close - readoutBar.open
      : 0;
  const readoutChangePct = readoutPrevBar
    ? readoutPrevBar.close > 0
      ? (readoutChange / readoutPrevBar.close) * 100
      : 0
    : readoutBar
      ? readoutBar.open > 0
        ? ((readoutBar.close - readoutBar.open) / readoutBar.open) * 100
        : 0
      : 0;
  const readoutUp = readoutChange >= 0;
  const readoutCandleStats = useMemo(() => {
    if (!readoutBar) return null;
    const body = readoutBar.close - readoutBar.open;
    const bodyPct = readoutBar.open > 0 ? (body / readoutBar.open) * 100 : 0;
    const range = readoutBar.high - readoutBar.low;
    const rangePct = readoutBar.low > 0 ? (range / readoutBar.low) * 100 : 0;
    const gap = readoutPrevBar ? readoutBar.open - readoutPrevBar.close : null;
    const gapPct =
      readoutPrevBar && readoutPrevBar.close > 0
        ? ((readoutBar.open - readoutPrevBar.close) / readoutPrevBar.close) *
          100
        : null;
    return {
      body,
      bodyPct,
      bodyUp: body >= 0,
      range,
      rangePct,
      gap,
      gapPct,
      gapUp: (gap ?? 0) >= 0,
    };
  }, [readoutBar, readoutPrevBar]);
  const readoutIndicatorGroups = useMemo<IndicatorReadoutGroup[]>(() => {
    if (readoutIndex < 0 || klineData.length === 0) return [];
    const groups: IndicatorReadoutGroup[] = [];
    const finiteValues = (
      key: IndicatorKey,
      label: string,
      values: IndicatorReadoutGroup["values"],
    ) => {
      const cleaned = values.filter((item) => Number.isFinite(item.value));
      if (cleaned.length > 0) groups.push({ key, label, values: cleaned });
    };

    if (indicators.ma) {
      finiteValues(
        "ma",
        "MA",
        indicatorParams.ma.map((period) => ({
          key: `ma-${period}`,
          label: String(period),
          value:
            rollingAverageAt(
              klineData,
              readoutIndex,
              period,
              (bar) => bar.close,
            ) ?? Number.NaN,
          formatter: "price",
        })),
      );
    }

    if (indicators.ema) {
      const closes = klineData.map((bar) => bar.close);
      finiteValues(
        "ema",
        "EMA",
        indicatorParams.ema.map((period) => {
          const values = emaSeries(closes, period);
          return {
            key: `ema-${period}`,
            label: String(period),
            value: values[readoutIndex] ?? Number.NaN,
            formatter: "price",
          };
        }),
      );
    }

    if (indicators.boll) {
      const [period, deviation] = indicatorParams.boll;
      const mid = rollingAverageAt(
        klineData,
        readoutIndex,
        period,
        (bar) => bar.close,
      );
      const std =
        mid != null
          ? rollingStdAt(
              klineData,
              readoutIndex,
              period,
              (bar) => bar.close,
              mid,
            )
          : null;
      finiteValues("boll", "BOLL", [
        {
          key: "boll-up",
          label: "U",
          value:
            mid != null && std != null ? mid + std * deviation : Number.NaN,
          formatter: "price",
        },
        {
          key: "boll-mid",
          label: "M",
          value: mid ?? Number.NaN,
          formatter: "price",
        },
        {
          key: "boll-low",
          label: "L",
          value:
            mid != null && std != null ? mid - std * deviation : Number.NaN,
          formatter: "price",
        },
      ]);
    }

    if (indicators.vol) {
      finiteValues(
        "vol",
        "VOLMA",
        indicatorParams.vol.map((period) => ({
          key: `vol-${period}`,
          label: String(period),
          value:
            rollingAverageAt(
              klineData,
              readoutIndex,
              period,
              (bar) => Number(bar.volume) || 0,
            ) ?? Number.NaN,
          formatter: "volume",
        })),
      );
    }

    if (indicators.macd) {
      const [fast, slow, signal] = indicatorParams.macd;
      const closes = klineData.map((bar) => bar.close);
      const fastEma = emaSeries(closes, fast);
      const slowEma = emaSeries(closes, slow);
      const dif = closes.map((_, index) => fastEma[index] - slowEma[index]);
      const dea = emaSeries(dif, signal);
      const macd = (dif[readoutIndex] - dea[readoutIndex]) * 2;
      finiteValues("macd", "MACD", [
        {
          key: "dif",
          label: "DIF",
          value: dif[readoutIndex],
          formatter: "plain",
        },
        {
          key: "dea",
          label: "DEA",
          value: dea[readoutIndex],
          formatter: "plain",
        },
        {
          key: "macd",
          label: "H",
          value: macd,
          formatter: "plain",
          tone: macd >= 0 ? "up" : "down",
        },
      ]);
    }

    if (indicators.rsi) {
      finiteValues(
        "rsi",
        "RSI",
        indicatorParams.rsi.map((period) => {
          const value = rsiAt(klineData, readoutIndex, period) ?? Number.NaN;
          return {
            key: `rsi-${period}`,
            label: String(period),
            value,
            formatter: "plain",
            tone: value >= 70 ? "up" : value <= 30 ? "down" : "neutral",
          };
        }),
      );
    }

    if (indicators.kdj) {
      const [period, kSmoothing, dSmoothing] = indicatorParams.kdj;
      const kdj = kdjAt(
        klineData,
        readoutIndex,
        period,
        kSmoothing,
        dSmoothing,
      );
      finiteValues("kdj", "KDJ", [
        {
          key: "k",
          label: "K",
          value: kdj?.k ?? Number.NaN,
          formatter: "plain",
        },
        {
          key: "d",
          label: "D",
          value: kdj?.d ?? Number.NaN,
          formatter: "plain",
        },
        {
          key: "j",
          label: "J",
          value: kdj?.j ?? Number.NaN,
          formatter: "plain",
        },
      ]);
    }

    if (indicators.wr) {
      finiteValues(
        "wr",
        "WR",
        indicatorParams.wr.map((period) => ({
          key: `wr-${period}`,
          label: String(period),
          value: wrAt(klineData, readoutIndex, period) ?? Number.NaN,
          formatter: "plain",
        })),
      );
    }

    if (indicators.bias) {
      finiteValues(
        "bias",
        "BIAS",
        indicatorParams.bias.map((period) => ({
          key: `bias-${period}`,
          label: String(period),
          value: biasAt(klineData, readoutIndex, period) ?? Number.NaN,
          formatter: "plain",
        })),
      );
    }

    if (indicators.cci) {
      const [period] = indicatorParams.cci;
      finiteValues("cci", "CCI", [
        {
          key: "cci",
          label: String(period),
          value: cciAt(klineData, readoutIndex, period) ?? Number.NaN,
          formatter: "plain",
        },
      ]);
    }

    if (indicators.obv) {
      const [period] = indicatorParams.obv;
      const obv = obvSeries(klineData);
      const maObv =
        readoutIndex >= period - 1
          ? obv
              .slice(readoutIndex - period + 1, readoutIndex + 1)
              .reduce((sum, value) => sum + value, 0) / period
          : Number.NaN;
      finiteValues("obv", "OBV", [
        {
          key: "obv",
          label: "OBV",
          value: obv[readoutIndex] ?? Number.NaN,
          formatter: "volume",
        },
        {
          key: "ma-obv",
          label: `MA${period}`,
          value: maObv,
          formatter: "volume",
        },
      ]);
    }

    if (indicators.psy) {
      const [period, maPeriod] = indicatorParams.psy;
      const psy = psyAt(klineData, readoutIndex, period, maPeriod);
      finiteValues("psy", "PSY", [
        {
          key: "psy",
          label: String(period),
          value: psy?.psy ?? Number.NaN,
          formatter: "plain",
        },
        {
          key: "ma-psy",
          label: `MA${maPeriod}`,
          value: psy?.maPsy ?? Number.NaN,
          formatter: "plain",
        },
      ]);
    }

    return groups;
  }, [indicatorParams, indicators, klineData, readoutIndex]);
  const readoutSignalChips = useMemo<SignalChip[]>(() => {
    if (!readoutBar || readoutIndex < 0 || klineData.length === 0) return [];
    const chips: SignalChip[] = [];
    const close = readoutBar.close;

    if (indicators.ema) {
      const emaValues = emaSeries(
        klineData.map((bar) => bar.close),
        indicatorParams.ema[1] ?? indicatorParams.ema[0] ?? 20,
      );
      const value = emaValues[readoutIndex];
      if (Number.isFinite(value)) {
        chips.push({
          key: "ema-trend",
          label: close >= value ? "EMA 상방" : "EMA 하방",
          detail: `종가가 EMA ${indicatorParams.ema[1] ?? indicatorParams.ema[0] ?? 20} ${
            close >= value ? "위" : "아래"
          }`,
          tone: close >= value ? "up" : "down",
        });
      }
    } else if (indicators.ma) {
      const period = indicatorParams.ma[1] ?? indicatorParams.ma[0] ?? 20;
      const value = rollingAverageAt(
        klineData,
        readoutIndex,
        period,
        (bar) => bar.close,
      );
      if (value != null) {
        chips.push({
          key: "ma-trend",
          label: close >= value ? "MA 상방" : "MA 하방",
          detail: `종가가 MA ${period} ${close >= value ? "위" : "아래"}`,
          tone: close >= value ? "up" : "down",
        });
      }
    }

    if (indicators.macd) {
      const [fast, slow, signal] = indicatorParams.macd;
      const closes = klineData.map((bar) => bar.close);
      const fastEma = emaSeries(closes, fast);
      const slowEma = emaSeries(closes, slow);
      const dif = closes.map((_, index) => fastEma[index] - slowEma[index]);
      const dea = emaSeries(dif, signal);
      const hist = (dif[readoutIndex] - dea[readoutIndex]) * 2;
      if (Number.isFinite(hist)) {
        chips.push({
          key: "macd",
          label: hist >= 0 ? "MACD 양전" : "MACD 음전",
          detail: `MACD histogram ${hist >= 0 ? "+" : ""}${hist.toFixed(2)}`,
          tone: hist >= 0 ? "up" : "down",
        });
      }
    }

    if (indicators.rsi) {
      const period = indicatorParams.rsi[1] ?? indicatorParams.rsi[0] ?? 14;
      const value = rsiAt(klineData, readoutIndex, period);
      if (value != null) {
        chips.push({
          key: "rsi",
          label:
            value >= 70 ? "RSI 과열" : value <= 30 ? "RSI 침체" : "RSI 중립",
          detail: `RSI ${period} ${value.toFixed(1)}`,
          tone: value >= 70 ? "up" : value <= 30 ? "down" : "neutral",
        });
      }
    }

    if (indicators.boll) {
      const [period, deviation] = indicatorParams.boll;
      const mid = rollingAverageAt(
        klineData,
        readoutIndex,
        period,
        (bar) => bar.close,
      );
      const std =
        mid != null
          ? rollingStdAt(
              klineData,
              readoutIndex,
              period,
              (bar) => bar.close,
              mid,
            )
          : null;
      if (mid != null && std != null && std > 0) {
        const up = mid + std * deviation;
        const low = mid - std * deviation;
        const position = ((close - low) / Math.max(1e-9, up - low)) * 100;
        chips.push({
          key: "boll",
          label:
            position >= 80
              ? "BOLL 상단"
              : position <= 20
                ? "BOLL 하단"
                : "BOLL 중립",
          detail: `밴드 위치 ${position.toFixed(0)}%`,
          tone: position >= 80 ? "up" : position <= 20 ? "down" : "neutral",
        });
      }
    }

    return chips.slice(0, 4);
  }, [indicatorParams, indicators, klineData, readoutBar, readoutIndex]);
  const inferredCurrency: "USD" | "KRW" =
    currency ?? (/^\d/.test(ticker) ? "KRW" : "USD");
  const pricePrecision = inferredCurrency === "KRW" ? 0 : 2;
  const pinnedMarkerStyle = useMemo(() => {
    const chart = chartRef.current;
    if (!chart || !pinnedBar) return null;
    const coordinate = chart.convertToPixel(
      { timestamp: pinnedBar.timestamp, value: pinnedBar.close },
      { paneId: "candle_pane", absolute: true },
    ) as { x?: number };
    if (!Number.isFinite(coordinate.x)) return null;
    return { left: `${coordinate.x}px` };
  }, [pinnedBar, visibleRange]);
  const keyboardMarkerStyle = useMemo(() => {
    const chart = chartRef.current;
    if (!chart || !keyboardBar || pinnedBar) return null;
    const coordinate = chart.convertToPixel(
      { timestamp: keyboardBar.timestamp, value: keyboardBar.close },
      { paneId: "candle_pane", absolute: true },
    ) as { x?: number };
    if (!Number.isFinite(coordinate.x)) return null;
    return { left: `${coordinate.x}px` };
  }, [keyboardBar, pinnedBar, visibleRange]);
  const readoutPriceMarker = useMemo(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container || !readoutBar) return null;
    const coordinate = chart.convertToPixel(
      { timestamp: readoutBar.timestamp, value: readoutBar.close },
      { paneId: "candle_pane", absolute: true },
    ) as { x?: number; y?: number };
    if (!Number.isFinite(coordinate.x) || !Number.isFinite(coordinate.y)) {
      return null;
    }

    const width = Math.max(160, container.clientWidth || 0);
    const height = Math.max(16, container.clientHeight || 0);
    const y = Math.max(8, Math.min(height - 8, coordinate.y!));
    return {
      x: coordinate.x!,
      y,
      width,
      label: formatCompactNumber(readoutBar.close, pricePrecision),
      tone: readoutUp ? "var(--up)" : "var(--down)",
      badge:
        pinnedBar && readoutBar.timestamp === pinnedBar.timestamp
          ? "PIN"
          : keyboardBar && readoutBar.timestamp === keyboardBar.timestamp
            ? "CUR"
            : activeBar && readoutBar.timestamp === activeBar.timestamp
              ? "CUR"
              : "LAST",
    };
  }, [
    activeBar,
    keyboardBar,
    pinnedBar,
    pricePrecision,
    readoutBar,
    readoutUp,
    visibleRange,
  ]);
  const pinnedComparison = useMemo(() => {
    if (!pinnedBar) return null;
    const target =
      activeBar && activeBar.timestamp !== pinnedBar.timestamp
        ? activeBar
        : keyboardBar && keyboardBar.timestamp !== pinnedBar.timestamp
          ? keyboardBar
          : latestBar && latestBar.timestamp !== pinnedBar.timestamp
            ? latestBar
            : null;
    if (!target || pinnedBar.close <= 0) return null;
    const fromIndex = klineData.findIndex(
      (bar) => bar.timestamp === pinnedBar.timestamp,
    );
    const toIndex = klineData.findIndex(
      (bar) => bar.timestamp === target.timestamp,
    );
    const delta = target.close - pinnedBar.close;
    const pct = (delta / pinnedBar.close) * 100;
    const elapsedDays = Math.max(
      0,
      Math.round(Math.abs(target.timestamp - pinnedBar.timestamp) / 86_400_000),
    );
    const bars =
      fromIndex >= 0 && toIndex >= 0 ? Math.abs(toIndex - fromIndex) : null;
    return {
      target,
      delta,
      pct,
      up: delta >= 0,
      bars,
      elapsedDays,
      elapsedLabel:
        bars != null
          ? `${bars.toLocaleString()}봉 · ${elapsedDays.toLocaleString()}일`
          : `${elapsedDays.toLocaleString()}일`,
    };
  }, [activeBar, keyboardBar, klineData, latestBar, pinnedBar]);
  const pinnedComparisonLine = useMemo(() => {
    const chart = chartRef.current;
    if (!chart || !pinnedBar || !pinnedComparison) return null;
    const from = chart.convertToPixel(
      { timestamp: pinnedBar.timestamp, value: pinnedBar.close },
      { paneId: "candle_pane", absolute: true },
    ) as { x?: number; y?: number };
    const to = chart.convertToPixel(
      {
        timestamp: pinnedComparison.target.timestamp,
        value: pinnedComparison.target.close,
      },
      { paneId: "candle_pane", absolute: true },
    ) as { x?: number; y?: number };
    if (
      !Number.isFinite(from.x) ||
      !Number.isFinite(from.y) ||
      !Number.isFinite(to.x) ||
      !Number.isFinite(to.y)
    ) {
      return null;
    }
    return {
      x1: from.x!,
      y1: from.y!,
      x2: to.x!,
      y2: to.y!,
      up: pinnedComparison.up,
      label: `${pinnedComparison.up ? "+" : ""}${pinnedComparison.pct.toFixed(2)}%`,
    };
  }, [pinnedBar, pinnedComparison, visibleRange]);
  const visibleRangeExtremeMarkers = useMemo(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container || !visibleRange || klineData.length === 0)
      return null;
    const from = Math.max(0, Math.floor(visibleRange.realFrom));
    const to = Math.min(klineData.length - 1, Math.ceil(visibleRange.realTo));
    if (to < from) return null;

    let highBar = klineData[from];
    let lowBar = klineData[from];
    for (let i = from + 1; i <= to; i += 1) {
      const bar = klineData[i];
      if (bar.high > highBar.high) highBar = bar;
      if (bar.low < lowBar.low) lowBar = bar;
    }

    const highPoint = chart.convertToPixel(
      { timestamp: highBar.timestamp, value: highBar.high },
      { paneId: "candle_pane", absolute: true },
    ) as { x?: number; y?: number };
    const lowPoint = chart.convertToPixel(
      { timestamp: lowBar.timestamp, value: lowBar.low },
      { paneId: "candle_pane", absolute: true },
    ) as { x?: number; y?: number };
    if (
      !Number.isFinite(highPoint.x) ||
      !Number.isFinite(highPoint.y) ||
      !Number.isFinite(lowPoint.x) ||
      !Number.isFinite(lowPoint.y)
    ) {
      return null;
    }

    const width = Math.max(120, container.clientWidth || 0);
    const height = Math.max(32, container.clientHeight || 0);
    const labelHalfWidth = 44;
    const labelHalfHeight = 9;
    const clampLabelX = (x: number) =>
      Math.max(labelHalfWidth, Math.min(width - labelHalfWidth, x));
    const clampLabelY = (y: number) =>
      Math.max(labelHalfHeight, Math.min(height - labelHalfHeight, y));
    const sameExtremePoint =
      highBar.timestamp === lowBar.timestamp && highBar.high === lowBar.low;
    return {
      high: {
        x: highPoint.x!,
        y: highPoint.y!,
        labelX: clampLabelX(highPoint.x!),
        labelY: clampLabelY(highPoint.y! - 16),
        label: `H ${formatCompactNumber(highBar.high, pricePrecision)}`,
      },
      low: sameExtremePoint
        ? null
        : {
            x: lowPoint.x!,
            y: lowPoint.y!,
            labelX: clampLabelX(lowPoint.x!),
            labelY: clampLabelY(lowPoint.y! + 16),
            label: `L ${formatCompactNumber(lowBar.low, pricePrecision)}`,
          },
    };
  }, [klineData, pricePrecision, visibleRange]);
  const compareStableDisplayResult = useMemo(() => {
    return rebaseCompareRows<StockCompareRow>(
      compareRows,
      loadedCompareSymbols,
      PERIOD_LOOKBACK_CALENDAR_DAYS[period] ?? FULL_HISTORY_DAYS,
    );
  }, [compareRows, loadedCompareSymbols, period]);
  const compareVisibleFallbackResult = useMemo(() => {
    if (
      compareStableDisplayResult.rows.length > 0 ||
      visibleCompareSymbols.length === loadedCompareSymbols.length
    ) {
      return null;
    }
    return rebaseCompareRows<StockCompareRow>(
      compareRows,
      visibleCompareSymbols,
      PERIOD_LOOKBACK_CALENDAR_DAYS[period] ?? FULL_HISTORY_DAYS,
    );
  }, [
    compareRows,
    compareStableDisplayResult.rows.length,
    loadedCompareSymbols.length,
    period,
    visibleCompareSymbols,
  ]);
  const compareDisplayResult =
    compareStableDisplayResult.rows.length > 0
      ? compareStableDisplayResult
      : (compareVisibleFallbackResult ?? compareStableDisplayResult);
  const compareUsesVisibleBaselineFallback =
    compareStableDisplayResult.rows.length === 0 &&
    (compareVisibleFallbackResult?.rows.length ?? 0) > 0;
  const compareDisplayRows = compareDisplayResult.rows;
  const compareSourceStatus = useMemo(() => {
    if (compareSeries.length === 0) return null;
    const requestedDays = Math.max(
      FULL_HISTORY_DAYS,
      ...compareSeries.map((item) => item.requested_days || 0),
    );
    const loadedSeries = compareSeries.filter(
      (item) => item.returned_count > 0,
    );
    const missingSeries = compareSeries.length - loadedSeries.length;
    const first = compareRows[0]?.date ? String(compareRows[0].date) : null;
    const last = compareRows.at(-1)?.date
      ? String(compareRows.at(-1)?.date)
      : null;
    return {
      requestedDays,
      loadedSeries: loadedSeries.length,
      totalSeries: compareSeries.length,
      missingSeries,
      first,
      last,
      rowCount: compareRows.length,
      baselineDate: compareDisplayResult.baselineDate,
      baselineScope: compareUsesVisibleBaselineFallback ? "visible" : "loaded",
      displayRowCount: compareDisplayRows.length,
    };
  }, [
    compareDisplayResult.baselineDate,
    compareDisplayRows.length,
    compareRows,
    compareSeries,
    compareUsesVisibleBaselineFallback,
  ]);
  const compareCoverage = useMemo<StockCompareCoverage[]>(() => {
    return compareSeries.slice(0, 5).map((series, index) => {
      const hidden = compareHiddenSymbols.has(series.symbol);
      const rowsWithValue = compareDisplayRows.filter((row) =>
        Number.isFinite(Number(row[series.symbol])),
      );
      const displayFrom =
        rowsWithValue.length > 0 ? String(rowsWithValue[0]?.date ?? "") : null;
      const displayTo =
        rowsWithValue.length > 0
          ? String(rowsWithValue[rowsWithValue.length - 1]?.date ?? "")
          : null;
      return {
        ...series,
        color: COMPARE_COLORS[index % COMPARE_COLORS.length],
        displayCount: rowsWithValue.length,
        displayFrom,
        displayTo,
        sourceDays: calendarDaysBetween(series.from_date, series.to_date),
        displayDays: calendarDaysBetween(displayFrom, displayTo),
        loaded:
          !hidden && series.returned_count > 0 && rowsWithValue.length > 0,
        hidden,
      };
    });
  }, [compareDisplayRows, compareHiddenSymbols, compareSeries]);
  const compareDisplayGapStats = useMemo(() => {
    if (compareDisplayRows.length < 2) return null;
    let maxGapDays = 0;
    let largeGapCount = 0;
    for (let i = 1; i < compareDisplayRows.length; i += 1) {
      const current = parseUtcDay(compareDisplayRows[i].date)?.timestamp;
      const previous = parseUtcDay(compareDisplayRows[i - 1].date)?.timestamp;
      if (
        typeof current !== "number" ||
        typeof previous !== "number" ||
        !Number.isFinite(current) ||
        !Number.isFinite(previous)
      ) {
        continue;
      }
      const gapDays = Math.max(
        0,
        Math.round((current - previous) / 86_400_000),
      );
      if (gapDays > maxGapDays) maxGapDays = gapDays;
      if (gapDays > 7) largeGapCount += 1;
    }
    return largeGapCount > 0 ? { maxGapDays, largeGapCount } : null;
  }, [compareDisplayRows]);
  const compareTableRows = useMemo(() => {
    const maxRows = expanded ? 360 : 160;
    if (compareDisplayRows.length <= maxRows) return compareDisplayRows;
    const step = Math.max(1, Math.ceil(compareDisplayRows.length / maxRows));
    return compareDisplayRows.filter(
      (_, index) =>
        index % step === 0 || index === compareDisplayRows.length - 1,
    );
  }, [compareDisplayRows, expanded]);
  const compareTableSampledCount = Math.max(
    0,
    compareDisplayRows.length - compareTableRows.length,
  );

  useEffect(() => {
    setCompareHoverIndex(null);
    setComparePinnedIndex(null);
  }, [compareRows, compareSeries, period]);

  const compareStripModel = useMemo(() => {
    const activeSeries = compareCoverage.filter((item) => item.loaded);
    if (compareDisplayRows.length < 2 || activeSeries.length < 2) return null;
    const values = activeSeries.flatMap((series) =>
      compareDisplayRows
        .map((row) => Number(row[series.symbol]))
        .filter(Number.isFinite),
    );
    if (values.length < 2) return null;
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const spread = max - min || 1;
    const width = 1000;
    const height = 118;
    const yOf = (value: number) =>
      10 + ((max - value) / spread) * (height - 20);
    const zeroY = yOf(0);
    const seriesModels = activeSeries.map((series) => {
      const last = [...compareDisplayRows]
        .reverse()
        .map((row) => Number(row[series.symbol]))
        .find(Number.isFinite);
      return {
        ...series,
        color: series.color,
        path: buildStockComparePath(
          compareDisplayRows,
          series.symbol,
          yOf,
          width,
        ),
        last: last ?? null,
        y: last == null ? null : yOf(last),
      };
    });
    const labelGap = 13;
    const endLabels = seriesModels
      .filter((series) => series.last != null && series.y != null)
      .sort((a, b) => Number(a.y) - Number(b.y))
      .map((series, index, labels) => {
        const rawY = Number(series.y);
        const minY = 12 + index * labelGap;
        const maxY = height - 6 - (labels.length - 1 - index) * labelGap;
        return {
          symbol: series.symbol,
          color: series.color,
          value: Number(series.last),
          y: Math.max(minY, Math.min(maxY, rawY)),
        };
      });
    return {
      width,
      height,
      zeroY,
      yOf,
      min,
      max,
      from: String(compareDisplayRows[0]?.date ?? ""),
      to: String(compareDisplayRows[compareDisplayRows.length - 1]?.date ?? ""),
      series: seriesModels,
      endLabels,
    };
  }, [compareCoverage, compareDisplayRows]);
  const compareReadout = useMemo(() => {
    if (!compareStripModel || compareDisplayRows.length === 0) return null;
    const index = Math.min(
      compareDisplayRows.length - 1,
      Math.max(
        0,
        compareHoverIndex ??
          comparePinnedIndex ??
          compareDisplayRows.length - 1,
      ),
    );
    const row = compareDisplayRows[index];
    if (!row) return null;
    const pinnedRow =
      comparePinnedIndex != null
        ? compareDisplayRows[comparePinnedIndex]
        : null;
    const pinnedDate = String(pinnedRow?.date ?? "");
    const currentDate = String(row.date ?? "");
    const elapsedDays =
      pinnedRow && currentDate && pinnedDate
        ? Math.max(
            0,
            Math.round(
              Math.abs(
                Date.parse(`${currentDate}T00:00:00Z`) -
                  Date.parse(`${pinnedDate}T00:00:00Z`),
              ) / 86_400_000,
            ),
          )
        : null;
    const x =
      compareDisplayRows.length <= 1
        ? 0
        : (index / (compareDisplayRows.length - 1)) * compareStripModel.width;
    const items = compareStripModel.series
      .map((series) => {
        const value = Number(row[series.symbol]);
        if (!Number.isFinite(value)) return null;
        const pinnedValue =
          pinnedRow == null ? Number.NaN : Number(pinnedRow[series.symbol]);
        const delta =
          Number.isFinite(pinnedValue) && comparePinnedIndex !== index
            ? value - pinnedValue
            : null;
        return {
          symbol: series.symbol,
          color: series.color,
          value,
          delta,
          y: compareStripModel.yOf(value),
        };
      })
      .filter(
        (
          item,
        ): item is {
          symbol: string;
          color: string;
          value: number;
          delta: number | null;
          y: number;
        } => item != null,
      );
    return {
      index,
      date: currentDate,
      x,
      pinned: comparePinnedIndex === index,
      pinnedDate,
      comparison:
        comparePinnedIndex != null && comparePinnedIndex !== index
          ? {
              points: Math.abs(index - comparePinnedIndex),
              days: elapsedDays,
            }
          : null,
      items,
    };
  }, [
    compareDisplayRows,
    compareHoverIndex,
    comparePinnedIndex,
    compareStripModel,
  ]);
  const comparePinnedMarker = useMemo(() => {
    if (
      !compareStripModel ||
      comparePinnedIndex == null ||
      comparePinnedIndex < 0 ||
      comparePinnedIndex >= compareDisplayRows.length ||
      compareReadout?.index === comparePinnedIndex
    ) {
      return null;
    }
    const row = compareDisplayRows[comparePinnedIndex];
    if (!row) return null;
    const x =
      compareDisplayRows.length <= 1
        ? 0
        : (comparePinnedIndex / (compareDisplayRows.length - 1)) *
          compareStripModel.width;
    const items = compareStripModel.series
      .map((series) => {
        const value = Number(row[series.symbol]);
        if (!Number.isFinite(value)) return null;
        return {
          symbol: series.symbol,
          color: series.color,
          value,
          y: compareStripModel.yOf(value),
        };
      })
      .filter(
        (
          item,
        ): item is {
          symbol: string;
          color: string;
          value: number;
          y: number;
        } => item != null,
      );
    return {
      index: comparePinnedIndex,
      date: String(row.date ?? ""),
      x,
      items,
    };
  }, [
    compareDisplayRows,
    comparePinnedIndex,
    compareReadout?.index,
    compareStripModel,
  ]);
  const emptyState = useMemo(() => {
    if (loading) {
      return {
        title: "차트 데이터를 불러오는 중…",
        detail: null,
      };
    }
    if (barsError) {
      return {
        title: "차트 데이터를 불러오지 못했습니다",
        detail: "DB/API 응답 상태를 확인하세요",
      };
    }
    if ((barsData?.length ?? 0) > 0 && normalizedBars.length === 0) {
      return {
        title: "차트에 쓸 수 있는 가격 데이터가 없습니다",
        detail: "유효한 날짜와 0보다 큰 OHLC 값이 있는 행이 없습니다",
      };
    }
    return {
      title: "표시할 데이터가 없습니다",
      detail: "선택한 종목의 가격 데이터가 아직 저장되지 않았습니다",
    };
  }, [barsData?.length, barsError, loading, normalizedBars.length]);

  const formatIndicatorReadoutValue = useCallback(
    (item: IndicatorReadoutGroup["values"][number]) => {
      if (item.formatter === "volume") return formatVolume(item.value);
      if (item.formatter === "plain") return formatCompactNumber(item.value, 2);
      return formatCompactNumber(item.value, pricePrecision);
    },
    [pricePrecision],
  );
  const readoutAccessibilityStatus = useMemo(() => {
    if (!readoutBar) {
      return dataRangeLabel;
    }

    const readoutMode =
      pinnedBar && readoutBar.timestamp === pinnedBar.timestamp
        ? "PIN"
        : keyboardBar && readoutBar.timestamp === keyboardBar.timestamp
          ? "CUR"
          : activeBar && readoutBar.timestamp === activeBar.timestamp
            ? "마우스 readout"
            : "최신값";
    const indicatorSummary = readoutIndicatorGroups
      .slice(0, 3)
      .map((group) => {
        const values = group.values
          .slice(0, 3)
          .map((item) => `${item.label} ${formatIndicatorReadoutValue(item)}`)
          .join(", ");
        return `${group.label} ${values}`;
      })
      .join(" · ");

    return `${readoutMode} ${formatUtcDate(
      readoutBar.timestamp,
      "YYYY-MM-DD",
    )} 시가 ${formatCompactNumber(readoutBar.open, pricePrecision)}, 고가 ${formatCompactNumber(
      readoutBar.high,
      pricePrecision,
    )}, 저가 ${formatCompactNumber(readoutBar.low, pricePrecision)}, 종가 ${formatCompactNumber(
      readoutBar.close,
      pricePrecision,
    )}, 변화 ${readoutUp ? "+" : ""}${formatCompactNumber(
      readoutChange,
      pricePrecision,
    )} (${readoutUp ? "+" : ""}${readoutChangePct.toFixed(2)}%), 거래량 ${formatVolume(
      readoutBar.volume,
    )}${indicatorSummary ? `, ${indicatorSummary}` : ""}`;
  }, [
    activeBar,
    dataRangeLabel,
    formatIndicatorReadoutValue,
    keyboardBar,
    pinnedBar,
    pricePrecision,
    readoutBar,
    readoutChange,
    readoutChangePct,
    readoutIndicatorGroups,
    readoutUp,
  ]);
  const activeIndicatorCount = Object.values(indicators).filter(Boolean).length;
  const hiddenIndicatorCount = INDICATOR_KEYS.length - activeIndicatorCount;
  const activeDrawingTool = activeDrawing
    ? DRAWING_TOOLS.find((tool) => tool.key === activeDrawing)
    : null;
  const ActiveDrawingIcon = activeDrawingTool?.icon ?? PencilLine;
  const activePreset = useMemo<PresetKey | null>(() => {
    for (const key of Object.keys(PRESETS) as PresetKey[]) {
      if (sameIndicatorSet(indicators, PRESETS[key].indicators)) return key;
    }
    return null;
  }, [indicators]);
  const orderedIndicatorKeys = useMemo(
    () => sanitizeIndicatorOrder(indicatorOrder),
    [indicatorOrder],
  );
  const indicatorOrderSignature = orderedIndicatorKeys.join("|");
  const orderedOverlayIndicators = useMemo(
    () =>
      orderedIndicatorKeys.filter((key) => OVERLAY_INDICATORS.includes(key)),
    [orderedIndicatorKeys],
  );
  const orderedPaneIndicators = useMemo(
    () => orderedIndicatorKeys.filter((key) => PANE_INDICATORS.includes(key)),
    [orderedIndicatorKeys],
  );
  const activeParamPreset = useMemo<IndicatorParamPresetKey | null>(() => {
    for (const key of Object.keys(
      INDICATOR_PARAM_PRESETS,
    ) as IndicatorParamPresetKey[]) {
      if (
        sameIndicatorParams(
          indicatorParams,
          INDICATOR_PARAM_PRESETS[key].params,
        )
      ) {
        return key;
      }
    }
    return null;
  }, [indicatorParams]);
  const activeIndicatorLabels = useMemo(
    () =>
      orderedIndicatorKeys
        .filter((key) => indicators[key])
        .map((key) => {
          const params = indicatorParams[key] ?? DEFAULT_INDICATOR_PARAMS[key];
          return {
            key,
            label: `${INDICATOR_LABEL[key]}(${params.join("/")})`,
            title: `${INDICATOR_LABEL[key]} ${params
              .map(
                (value, index) =>
                  `${INDICATOR_PARAM_LABELS[key][index] ?? index + 1}: ${value}`,
              )
              .join(" · ")}`,
          };
        }),
    [indicatorParams, indicators, orderedIndicatorKeys],
  );
  const orderedIndicatorParamKeys = useMemo<IndicatorKey[]>(() => {
    const active = orderedIndicatorKeys.filter((key) => indicators[key]);
    const inactive = orderedIndicatorKeys.filter((key) => !indicators[key]);
    if (showAllIndicatorParams || active.length === 0) {
      return [...active, ...inactive];
    }
    return active;
  }, [indicators, orderedIndicatorKeys, showAllIndicatorParams]);
  const filteredIndicatorKeys = useMemo<IndicatorKey[]>(() => {
    const categoryKeys = new Set(INDICATOR_CATEGORIES[indicatorCategory].keys);
    const query = indicatorSearch.trim().toLowerCase();
    const orderedActiveFirst = [
      ...orderedIndicatorKeys.filter((key) => indicators[key]),
      ...orderedIndicatorKeys.filter((key) => !indicators[key]),
    ];
    return orderedActiveFirst.filter((key) => {
      if (indicatorCategory === "active" && !indicators[key]) return false;
      if (!categoryKeys.has(key)) return false;
      if (!query) return true;
      return [
        key,
        INDICATOR_LABEL[key],
        INDICATOR_DESCRIPTIONS[key],
        INDICATOR_SHORTCUTS[key],
        ...INDICATOR_PARAM_LABELS[key],
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [indicatorCategory, indicatorSearch, indicators, orderedIndicatorKeys]);
  const filteredActiveIndicatorCount = useMemo(
    () => filteredIndicatorKeys.filter((key) => indicators[key]).length,
    [filteredIndicatorKeys, indicators],
  );
  const displayedIndicatorParamKeys = useMemo(() => {
    const visible = new Set(filteredIndicatorKeys);
    return orderedIndicatorParamKeys.filter((key) => visible.has(key));
  }, [filteredIndicatorKeys, orderedIndicatorParamKeys]);
  const activePaneCount = PANE_INDICATORS.filter(
    (key) => indicators[key],
  ).length;
  const ultraCompactIndicatorStack =
    !expanded && density === "standard" && activePaneCount >= 6;
  const autoCompactIndicatorStack =
    !expanded &&
    density === "standard" &&
    activePaneCount >= 3 &&
    !ultraCompactIndicatorStack;
  const indicatorStackModeLabel = ultraCompactIndicatorStack
    ? "초압축"
    : autoCompactIndicatorStack
      ? "자동압축"
      : null;
  const basePricePaneHeight = expanded
    ? Math.max(priceHeight, 520)
    : priceHeight;
  const pricePaneHeight = Math.max(
    220,
    Math.round(basePricePaneHeight * pricePaneScale) +
      (density === "deep"
        ? 88
        : density === "compact"
          ? -56
          : ultraCompactIndicatorStack
            ? -52
            : autoCompactIndicatorStack
              ? -32
              : 0),
  );
  const basePaneHeight =
    density === "deep"
      ? 132
      : density === "compact"
        ? 72
        : ultraCompactIndicatorStack
          ? 64
          : autoCompactIndicatorStack
            ? 88
            : 110;
  const baseVolumePaneHeight =
    density === "deep"
      ? 96
      : density === "compact"
        ? 56
        : ultraCompactIndicatorStack
          ? 48
          : autoCompactIndicatorStack
            ? 64
            : 80;
  const paneHeight = Math.round(basePaneHeight * indicatorPaneScale);
  const volumePaneHeight = Math.round(
    baseVolumePaneHeight * indicatorPaneScale,
  );
  const logScaleBlocked = indicators.macd;

  const minimumBarSpaceForFullData = useCallback(() => {
    const el = containerRef.current;
    if (!el || klineData.length <= 0) return 1;
    const plotWidth = Math.max(120, el.clientWidth - 56);
    return Math.max(1, plotWidth / klineData.length);
  }, [klineData.length]);

  const keepZoomInsideData = useCallback(() => {
    const chart = chartRef.current;
    if (!chart || klineData.length <= 0) return;
    const minSpace = minimumBarSpaceForFullData();
    if (chart.getBarSpace() < minSpace) {
      chart.setBarSpace(minSpace);
    }
    chart.setMaxOffsetLeftDistance(0);
    chart.setMaxOffsetRightDistance(0);
    chart.setOffsetRightDistance(0);
    let range = chart.getVisibleRange();
    let visibleBars = Math.max(1, range.realTo - range.realFrom + 1);

    // klinecharts can briefly report a visible window wider than the data
    // after aggressive wheel zoom-out. In that state both sides can expose
    // blank canvas. Grow the bar space from the measured range itself, then
    // anchor to the latest bar so the full dataset fills the plot.
    if (visibleBars > klineData.length + 0.5) {
      const currentSpace = Math.max(chart.getBarSpace(), minSpace);
      chart.setBarSpace(
        Math.max(
          minSpace,
          currentSpace * (visibleBars / klineData.length) * 1.02,
        ),
      );
      chart.scrollToRealTime(0);
      range = chart.getVisibleRange();
      visibleBars = Math.max(1, range.realTo - range.realFrom + 1);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      range = chart.getVisibleRange();
      visibleBars = Math.max(1, range.realTo - range.realFrom + 1);
      const hasLeftBlank = range.realFrom < -0.5;
      const hasRightBlank = range.realTo > klineData.length - 0.5;
      if (!hasLeftBlank && !hasRightBlank) break;

      if (hasLeftBlank && hasRightBlank) {
        chart.scrollToRealTime(0);
      } else if (hasLeftBlank) {
        chart.scrollToDataIndex(
          Math.min(
            klineData.length - 1,
            Math.max(0, Math.ceil(visibleBars) - 1),
          ),
          0,
        );
      } else {
        chart.scrollToRealTime(0);
      }
    }
  }, [klineData.length, minimumBarSpaceForFullData]);

  const syncChartLayout = useCallback(
    (mode: "fit-window" | "resize-only") => {
      if (layoutRaf.current !== null) {
        cancelAnimationFrame(layoutRaf.current);
      }
      layoutRaf.current = requestAnimationFrame(() => {
        layoutRaf.current = requestAnimationFrame(() => {
          layoutRaf.current = null;
          const chart = chartRef.current;
          const el = containerRef.current;
          if (!chart || !el) return;

          if (mode === "fit-window" && klineData.length > 0) {
            const plotWidth = Math.max(120, el.clientWidth - 56);
            const targetBars = Math.min(
              visibleBarsForPeriod(klineData, period),
              klineData.length,
            );
            const space = Math.max(
              1,
              plotWidth / klineData.length,
              plotWidth / targetBars,
            );
            chart.setBarSpace(space);
          }
          // klinecharts uses either pixel-distance limits or min-visible-bar
          // limits. Keep distance mode active so zooming/panning cannot expose
          // large blank areas before the first bar or after the latest bar.
          chart.setMaxOffsetLeftDistance(0);
          chart.setMaxOffsetRightDistance(0);
          chart.setOffsetRightDistance(0);
          if (mode === "fit-window" && klineData.length > 0) {
            chart.scrollToRealTime(0);
          }
          chart.resize();
          keepZoomInsideData();
          setVisibleRange(chart.getVisibleRange());
        });
      });
    },
    [keepZoomInsideData, klineData, period],
  );

  useEffect(
    () => () => {
      if (layoutRaf.current !== null) {
        cancelAnimationFrame(layoutRaf.current);
      }
      if (visibleRangeRaf.current !== null) {
        cancelAnimationFrame(visibleRangeRaf.current);
      }
      if (visibleRangeTimeout.current !== null) {
        window.clearTimeout(visibleRangeTimeout.current);
      }
    },
    [],
  );

  useEffect(() => {
    writeStockChartSettings({
      period,
      timeframe,
      indicators,
      indicatorParams,
      indicatorOrder: orderedIndicatorKeys,
      activeSavedIndicatorSlot,
      chartMode,
      priceScale,
      density,
      pricePaneScale,
      indicatorPaneScale,
      showGrid,
      showCrosshair,
      showLastPriceLine,
      drawingRepeat,
      compareOpen,
      compareInput: sanitizeCompareInput(compareInput) ?? "",
      compareHiddenSymbols: [...compareHiddenSymbols],
      compareEndLabelsVisible,
    });
  }, [
    activeSavedIndicatorSlot,
    chartMode,
    compareEndLabelsVisible,
    compareHiddenSymbols,
    compareInput,
    compareOpen,
    density,
    drawingRepeat,
    indicatorPaneScale,
    indicatorParams,
    orderedIndicatorKeys,
    indicators,
    period,
    pricePaneScale,
    priceScale,
    showCrosshair,
    showGrid,
    showLastPriceLine,
    timeframe,
  ]);

  useEffect(() => {
    if (logScaleBlocked && priceScale === "log") {
      setPriceScale("normal");
    }
  }, [logScaleBlocked, priceScale]);

  useEffect(() => {
    if (!indicatorSetStatus) return;
    const timer = window.setTimeout(() => setIndicatorSetStatus(null), 1800);
    return () => window.clearTimeout(timer);
  }, [indicatorSetStatus]);

  // Mount / unmount the chart instance. Keep style-only controls out of this
  // effect so toggling candle mode/grid/crosshair does not reset the user's
  // current zoom/pan window.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = init(containerRef.current, {
      styles: buildStyles(
        isDark,
        chartMode,
        priceScale,
        showGrid,
        showCrosshair,
        showLastPriceLine,
      ) as any,
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setTimezone("UTC");
    chart.setZoomEnabled(true);
    chart.setScrollEnabled(true);
    chart.setCustomApi({
      formatDate: (_dateTimeFormat, timestamp, format) =>
        formatUtcDate(timestamp, format),
    });
    chart.setPriceVolumePrecision(pricePrecision, 0);
    mountedPanes.current = new Set();
    mountedOverlays.current = new Set();

    // Apply current indicator selection
    for (const k of orderedOverlayIndicators) {
      if (indicators[k]) {
        const paneId = chart.createIndicator(
          {
            name: INDICATOR_NAME[k],
            calcParams: indicatorParams[k],
          },
          true,
          {
            id: "candle_pane",
          },
        );
        if (paneId !== null) mountedOverlays.current.add(k);
      }
    }
    for (const k of orderedPaneIndicators) {
      if (indicators[k]) {
        const paneId = chart.createIndicator(
          {
            name: INDICATOR_NAME[k],
            calcParams: indicatorParams[k],
          },
          false,
          {
            id: `pane_${k}`,
            height: k === "vol" ? volumePaneHeight : paneHeight,
          },
        );
        if (paneId !== null) mountedPanes.current.add(k);
      }
    }

    chart.setPriceVolumePrecision(pricePrecision, 0);
    chart.applyNewData(klineData);
    requestAnimationFrame(() => syncChartLayout("fit-window"));
    setActiveBar(null);
    setKeyboardBarIndex(null);

    const handleCrosshairChange = (crosshair?: Crosshair) => {
      const nextBar = crosshair?.kLineData ?? null;
      setActiveBar(nextBar);
      if (nextBar) setKeyboardBarIndex(null);
    };
    const handleVisibleRangeChange = (range?: VisibleRange) => {
      setVisibleRange(range ?? chart.getVisibleRange());
    };
    chart.subscribeAction(ActionType.OnCrosshairChange, handleCrosshairChange);
    chart.subscribeAction(
      ActionType.OnVisibleRangeChange,
      handleVisibleRangeChange,
    );

    const el = containerRef.current;
    const ro = new ResizeObserver(() => syncChartLayout("resize-only"));
    ro.observe(el);
    syncChartLayout("resize-only");
    return () => {
      chart.unsubscribeAction(
        ActionType.OnCrosshairChange,
        handleCrosshairChange,
      );
      chart.unsubscribeAction(
        ActionType.OnVisibleRangeChange,
        handleVisibleRangeChange,
      );
      ro.disconnect();
      if (el) dispose(el);
      chartRef.current = null;
    };
    // Indicator/data/style changes are handled below without rebuilding the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setStyles(
      buildStyles(
        isDark,
        chartMode,
        priceScale,
        showGrid,
        showCrosshair,
        showLastPriceLine,
      ) as any,
    );
    syncChartLayout("resize-only");
  }, [
    chartMode,
    isDark,
    priceScale,
    showCrosshair,
    showGrid,
    showLastPriceLine,
    syncChartLayout,
  ]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const k of orderedOverlayIndicators) {
      if (!indicators[k] || !mountedOverlays.current.has(k)) continue;
      chart.overrideIndicator(
        { name: INDICATOR_NAME[k], calcParams: indicatorParams[k] },
        "candle_pane",
        () => syncChartLayout("resize-only"),
      );
    }
    for (const k of orderedPaneIndicators) {
      if (!indicators[k] || !mountedPanes.current.has(k)) continue;
      chart.overrideIndicator(
        { name: INDICATOR_NAME[k], calcParams: indicatorParams[k] },
        `pane_${k}`,
        () => syncChartLayout("resize-only"),
      );
    }
  }, [
    indicatorParams,
    indicators,
    orderedOverlayIndicators,
    orderedPaneIndicators,
    syncChartLayout,
  ]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const k of orderedPaneIndicators) {
      if (!mountedPanes.current.has(k)) continue;
      chart.setPaneOptions({
        id: `pane_${k}`,
        height: k === "vol" ? volumePaneHeight : paneHeight,
      });
    }
    syncChartLayout("resize-only");
  }, [orderedPaneIndicators, paneHeight, syncChartLayout, volumePaneHeight]);

  useEffect(() => {
    const previous = previousIndicatorOrderRef.current;
    previousIndicatorOrderRef.current = indicatorOrderSignature;
    if (previous === null || previous === indicatorOrderSignature) return;
    const chart = chartRef.current;
    if (!chart) return;

    for (const k of [...mountedOverlays.current]) {
      chart.removeIndicator("candle_pane", INDICATOR_NAME[k]);
    }
    for (const k of [...mountedPanes.current]) {
      chart.removeIndicator(`pane_${k}`, INDICATOR_NAME[k]);
    }
    mountedOverlays.current = new Set();
    mountedPanes.current = new Set();

    for (const k of orderedOverlayIndicators) {
      if (!indicators[k]) continue;
      const paneId = chart.createIndicator(
        {
          name: INDICATOR_NAME[k],
          calcParams: indicatorParams[k],
        },
        true,
        {
          id: "candle_pane",
        },
      );
      if (paneId !== null) mountedOverlays.current.add(k);
    }
    for (const k of orderedPaneIndicators) {
      if (!indicators[k]) continue;
      const paneId = chart.createIndicator(
        {
          name: INDICATOR_NAME[k],
          calcParams: indicatorParams[k],
        },
        false,
        {
          id: `pane_${k}`,
          height: k === "vol" ? volumePaneHeight : paneHeight,
        },
      );
      if (paneId !== null) mountedPanes.current.add(k);
    }
    syncChartLayout("resize-only");
  }, [
    indicatorOrderSignature,
    indicatorParams,
    indicators,
    orderedOverlayIndicators,
    orderedPaneIndicators,
    paneHeight,
    syncChartLayout,
    volumePaneHeight,
  ]);

  // Push data whenever it changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setPriceVolumePrecision(pricePrecision, 0);
    chart.applyNewData(klineData);
    requestAnimationFrame(() => syncChartLayout("fit-window"));
  }, [klineData, pricePrecision, syncChartLayout]);

  // After data lands OR the period/timeframe changes, defer a layout pass so
  // klinecharts has finished its internal layout, then set the per-bar
  // pixel width to fit the selected window. Without this, long daily ranges
  // collapse to sub-pixel bars and any zoom/pan tears the layout.
  //
  // Doing this in a *separate* effect (rather than chaining inside the
  // data effect) means the chart stays responsive while bars are still
  // refetching — applyNewData updates the bars, this re-targets the zoom.
  useEffect(() => {
    if (klineData.length === 0) return;
    syncChartLayout("fit-window");
  }, [klineData.length, period, timeframe, syncChartLayout]);

  // Window resize hook — ResizeObserver covers most cases but doesn't fire
  // for some viewport/zoom changes on Safari. Belt + suspenders.
  useEffect(() => {
    const onResize = () => syncChartLayout("resize-only");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncChartLayout]);

  useEffect(() => {
    if (!expanded || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (shortcutsOpen) {
          event.preventDefault();
          setShortcutsOpen(false);
          return;
        }
        if (activeDrawingId.current) {
          event.preventDefault();
          chartRef.current?.removeOverlay(activeDrawingId.current);
          activeDrawingId.current = null;
          setActiveDrawing(null);
          return;
        }
        setExpanded(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, shortcutsOpen]);

  // Sync indicator toggles incrementally so the chart never flashes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const k of orderedOverlayIndicators) {
      const have = mountedOverlays.current.has(k);
      if (indicators[k] && !have) {
        const paneId = chart.createIndicator(
          {
            name: INDICATOR_NAME[k],
            calcParams: indicatorParams[k],
          },
          true,
          {
            id: "candle_pane",
          },
        );
        if (paneId !== null) mountedOverlays.current.add(k);
      } else if (!indicators[k] && have) {
        chart.removeIndicator("candle_pane", INDICATOR_NAME[k]);
        mountedOverlays.current.delete(k);
      }
    }
    for (const k of orderedPaneIndicators) {
      const have = mountedPanes.current.has(k);
      if (indicators[k] && !have) {
        const paneId = chart.createIndicator(
          {
            name: INDICATOR_NAME[k],
            calcParams: indicatorParams[k],
          },
          false,
          {
            id: `pane_${k}`,
            height: k === "vol" ? volumePaneHeight : paneHeight,
          },
        );
        if (paneId !== null) mountedPanes.current.add(k);
      } else if (!indicators[k] && have) {
        // Removing the only indicator on a pane removes the pane itself.
        chart.removeIndicator(`pane_${k}`, INDICATOR_NAME[k]);
        mountedPanes.current.delete(k);
      }
    }
    // Indicator panes change the chart's internal canvas stack. Reflow only;
    // don't scroll, so a manual zoom/pan position survives indicator toggles.
    syncChartLayout("resize-only");
  }, [
    indicatorParams,
    indicators,
    orderedOverlayIndicators,
    orderedPaneIndicators,
    paneHeight,
    syncChartLayout,
    volumePaneHeight,
  ]);

  const toggle = useCallback(
    (k: IndicatorKey) => {
      soloReturnIndicatorsRef.current = null;
      setIndicators((prev) => {
        const nextValue = !prev[k];
        if (k === "macd" && nextValue && priceScale === "log") {
          setPriceScale("normal");
        }
        return { ...prev, [k]: nextValue };
      });
    },
    [priceScale],
  );
  const isolateIndicator = useCallback(
    (k: IndicatorKey) => {
      setIndicators((prev) => {
        const isSolo = INDICATOR_KEYS.every((key) => prev[key] === (key === k));
        if (isSolo) {
          const restored =
            soloReturnIndicatorsRef.current ??
            INDICATOR_KEYS.reduce<IndicatorSet>(
              (acc, key) => ({ ...acc, [key]: true }),
              { ...DEFAULT_INDICATORS },
            );
          soloReturnIndicatorsRef.current = null;
          if (restored.macd && priceScale === "log") {
            setPriceScale("normal");
          }
          return restored;
        }
        soloReturnIndicatorsRef.current = prev;
        const next = INDICATOR_KEYS.reduce<IndicatorSet>(
          (acc, key) => ({ ...acc, [key]: key === k }),
          { ...DEFAULT_INDICATORS },
        );
        if ((next.macd || k === "macd") && priceScale === "log") {
          setPriceScale("normal");
        }
        return next;
      });
    },
    [priceScale],
  );
  const handleIndicatorClick = useCallback(
    (k: IndicatorKey, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (event.shiftKey || event.altKey) {
        isolateIndicator(k);
      } else {
        toggle(k);
      }
    },
    [isolateIndicator, toggle],
  );
  const moveIndicatorInOrder = useCallback(
    (key: IndicatorKey, direction: -1 | 1) => {
      setIndicatorOrder((prev) => {
        const order = sanitizeIndicatorOrder(prev);
        const groupKeys = (
          PANE_INDICATORS.includes(key) ? PANE_INDICATORS : OVERLAY_INDICATORS
        ).filter((item) => order.includes(item));
        const groupIndex = groupKeys.indexOf(key);
        const targetKey = groupKeys[groupIndex + direction];
        if (groupIndex < 0 || !targetKey) return order;
        const currentIndex = order.indexOf(key);
        const targetIndex = order.indexOf(targetKey);
        if (currentIndex < 0 || targetIndex < 0) return order;
        const next = [...order];
        [next[currentIndex], next[targetIndex]] = [
          next[targetIndex],
          next[currentIndex],
        ];
        return next;
      });
      setIndicatorSetStatus(
        `${INDICATOR_LABEL[key]} ${direction < 0 ? "위로" : "아래로"} 이동`,
      );
    },
    [],
  );
  const moveIndicatorBefore = useCallback(
    (sourceKey: IndicatorKey, targetKey: IndicatorKey) => {
      if (sourceKey === targetKey) return;
      const sourceGroup = PANE_INDICATORS.includes(sourceKey)
        ? PANE_INDICATORS
        : OVERLAY_INDICATORS;
      const targetGroup = PANE_INDICATORS.includes(targetKey)
        ? PANE_INDICATORS
        : OVERLAY_INDICATORS;
      if (sourceGroup !== targetGroup) {
        setIndicatorSetStatus(
          "가격 오버레이와 패널 지표는 같은 그룹 안에서만 이동됩니다",
        );
        return;
      }

      setIndicatorOrder((prev) => {
        const order = sanitizeIndicatorOrder(prev);
        const sourceIndex = order.indexOf(sourceKey);
        const targetIndex = order.indexOf(targetKey);
        if (sourceIndex < 0 || targetIndex < 0) return order;
        const next = [...order];
        const [moved] = next.splice(sourceIndex, 1);
        const adjustedTargetIndex =
          sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        next.splice(adjustedTargetIndex, 0, moved);
        return next;
      });
      setIndicatorSetStatus(
        `${INDICATOR_LABEL[sourceKey]} → ${INDICATOR_LABEL[targetKey]} 앞`,
      );
    },
    [],
  );
  const indicatorDragAllowed = useCallback(
    (sourceKey: IndicatorKey | null, targetKey: IndicatorKey) => {
      if (!sourceKey || sourceKey === targetKey) return false;
      return (
        PANE_INDICATORS.includes(sourceKey) ===
        PANE_INDICATORS.includes(targetKey)
      );
    },
    [],
  );
  const handleIndicatorDragStart = useCallback(
    (key: IndicatorKey, event: ReactDragEvent<HTMLElement>) => {
      setDraggedIndicator(key);
      setDragOverIndicator(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", key);
    },
    [],
  );
  const handleIndicatorDragOver = useCallback(
    (key: IndicatorKey, event: ReactDragEvent<HTMLElement>) => {
      if (!indicatorDragAllowed(draggedIndicator, key)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverIndicator(key);
    },
    [draggedIndicator, indicatorDragAllowed],
  );
  const handleIndicatorDrop = useCallback(
    (key: IndicatorKey, event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault();
      const sourceKey = draggedIndicator;
      setDraggedIndicator(null);
      setDragOverIndicator(null);
      if (!sourceKey || !indicatorDragAllowed(sourceKey, key)) return;
      moveIndicatorBefore(sourceKey, key);
    },
    [draggedIndicator, indicatorDragAllowed, moveIndicatorBefore],
  );
  const clearIndicatorDrag = useCallback(() => {
    setDraggedIndicator(null);
    setDragOverIndicator(null);
  }, []);

  const applyPreset = (preset: PresetKey) => {
    soloReturnIndicatorsRef.current = null;
    if (PRESETS[preset].indicators.macd && priceScale === "log") {
      setPriceScale("normal");
    }
    setIndicators(PRESETS[preset].indicators);
  };

  const cycleIndicatorPreset = useCallback(() => {
    const presets = Object.keys(PRESETS) as PresetKey[];
    const currentIndex = activePreset ? presets.indexOf(activePreset) : -1;
    const nextPreset = presets[(currentIndex + 1) % presets.length];
    soloReturnIndicatorsRef.current = null;
    if (PRESETS[nextPreset].indicators.macd && priceScale === "log") {
      setPriceScale("normal");
    }
    setIndicators(PRESETS[nextPreset].indicators);
  }, [activePreset, priceScale]);

  const setAllIndicators = useCallback(
    (nextValue: boolean) => {
      soloReturnIndicatorsRef.current = null;
      if (nextValue && priceScale === "log") {
        setPriceScale("normal");
      }
      setIndicators(
        INDICATOR_KEYS.reduce<IndicatorSet>(
          (acc, key) => ({ ...acc, [key]: nextValue }),
          { ...DEFAULT_INDICATORS },
        ),
      );
    },
    [priceScale],
  );
  const setFilteredIndicators = useCallback(
    (nextValue: boolean) => {
      if (filteredIndicatorKeys.length === 0) {
        setIndicatorSetStatus("적용할 필터 지표가 없습니다");
        return;
      }
      soloReturnIndicatorsRef.current = null;
      if (
        nextValue &&
        filteredIndicatorKeys.includes("macd") &&
        priceScale === "log"
      ) {
        setPriceScale("normal");
      }
      setIndicators((prev) => {
        const next = { ...prev };
        for (const key of filteredIndicatorKeys) next[key] = nextValue;
        return next;
      });
      const categoryLabel = INDICATOR_CATEGORIES[indicatorCategory].label;
      const queryLabel = indicatorSearch.trim()
        ? ` · "${indicatorSearch.trim()}"`
        : "";
      setIndicatorSetStatus(
        `${categoryLabel}${queryLabel} ${filteredIndicatorKeys.length.toLocaleString()}개 지표 ${nextValue ? "켜짐" : "꺼짐"}`,
      );
    },
    [filteredIndicatorKeys, indicatorCategory, indicatorSearch, priceScale],
  );

  const saveIndicatorSetToSlot = useCallback(
    (slot: SavedIndicatorSlotKey) => {
      const slots = writeSavedIndicatorSet(
        {
          indicators,
          indicatorParams,
          indicatorOrder: orderedIndicatorKeys,
        },
        slot,
      );
      if (slots) {
        setSavedIndicatorSlots(slots);
        setActiveSavedIndicatorSlot(slot);
        setIndicatorSetStatus(`내 지표 세트 ${slot}번 저장`);
      } else {
        setIndicatorSetStatus("저장할 수 없습니다");
      }
    },
    [indicatorParams, indicators, orderedIndicatorKeys],
  );

  const saveCurrentIndicatorSet = useCallback(() => {
    saveIndicatorSetToSlot(activeSavedIndicatorSlot);
  }, [activeSavedIndicatorSlot, saveIndicatorSetToSlot]);

  const applySavedIndicatorSet = useCallback(() => {
    const saved = savedIndicatorSlots[activeSavedIndicatorSlot] ?? null;
    if (!saved) {
      setIndicatorSetStatus(
        `${activeSavedIndicatorSlot}번에 저장된 지표 세트가 없습니다`,
      );
      return;
    }
    if (saved.indicators.macd && priceScale === "log") {
      setPriceScale("normal");
    }
    soloReturnIndicatorsRef.current = null;
    setIndicators(saved.indicators);
    setIndicatorParams(saved.indicatorParams);
    setIndicatorOrder(saved.indicatorOrder);
    setIndicatorSetStatus(`내 지표 세트 ${activeSavedIndicatorSlot}번 불러옴`);
  }, [activeSavedIndicatorSlot, priceScale, savedIndicatorSlots]);

  const clearSavedIndicatorSet = useCallback(() => {
    if (!savedIndicatorSlots[activeSavedIndicatorSlot]) {
      setIndicatorSetStatus(
        `${activeSavedIndicatorSlot}번에 저장된 지표 세트가 없습니다`,
      );
      return;
    }
    const next = { ...savedIndicatorSlots };
    delete next[activeSavedIndicatorSlot];
    if (writeSavedIndicatorSlots(next)) {
      setSavedIndicatorSlots(next);
      setIndicatorSetStatus(`내 지표 세트 ${activeSavedIndicatorSlot}번 삭제`);
    } else {
      setIndicatorSetStatus("삭제할 수 없습니다");
    }
  }, [activeSavedIndicatorSlot, savedIndicatorSlots]);

  const applyIndicatorParamPreset = (preset: IndicatorParamPresetKey) => {
    setIndicatorParams(
      cloneIndicatorParams(INDICATOR_PARAM_PRESETS[preset].params),
    );
    setIndicatorSetStatus(
      `${INDICATOR_PARAM_PRESETS[preset].label} 지표값 프리셋 적용`,
    );
  };

  const togglePriceScale = useCallback(() => {
    setPriceScale((v) => {
      if (v === "log") return "normal";
      return logScaleBlocked ? "normal" : "log";
    });
  }, [logScaleBlocked]);

  const changeIndicatorPaneScale = useCallback((next: number) => {
    setIndicatorPaneScale(
      Math.min(
        MAX_INDICATOR_PANE_SCALE,
        Math.max(MIN_INDICATOR_PANE_SCALE, next),
      ),
    );
  }, []);

  const changePricePaneScale = useCallback((next: number) => {
    setPricePaneScale(
      Math.min(MAX_PRICE_PANE_SCALE, Math.max(MIN_PRICE_PANE_SCALE, next)),
    );
  }, []);

  const indicatorParamMin = useCallback((key: IndicatorKey, index: number) => {
    return key === "boll" && index === 1 ? 0.1 : 1;
  }, []);

  const indicatorParamMax = useCallback((key: IndicatorKey, index: number) => {
    return key === "boll" && index === 1
      ? MAX_INDICATOR_MULTIPLIER
      : MAX_INDICATOR_PERIOD;
  }, []);

  const indicatorParamStep = useCallback((key: IndicatorKey, index: number) => {
    return key === "boll" && index === 1 ? 0.1 : 1;
  }, []);

  const clampIndicatorParamValue = useCallback(
    (key: IndicatorKey, index: number, value: number) => {
      const min = indicatorParamMin(key, index);
      const max = indicatorParamMax(key, index);
      return Number.isFinite(value)
        ? Number(
            Math.min(max, Math.max(min, value)).toFixed(
              key === "boll" && index === 1 ? 1 : 0,
            ),
          )
        : DEFAULT_INDICATOR_PARAMS[key][index];
    },
    [indicatorParamMax, indicatorParamMin],
  );

  const updateIndicatorParam = (
    key: IndicatorKey,
    index: number,
    value: string,
  ) => {
    setIndicatorParams((prev) => {
      const current = prev[key] ?? DEFAULT_INDICATOR_PARAMS[key];
      const nextValue = Number(value);
      const next = [...current];
      next[index] = clampIndicatorParamValue(key, index, nextValue);
      return { ...prev, [key]: next };
    });
  };

  const adjustIndicatorParam = useCallback(
    (key: IndicatorKey, index: number, direction: -1 | 1) => {
      setIndicatorParams((prev) => {
        const current = prev[key] ?? DEFAULT_INDICATOR_PARAMS[key];
        const next = [...current];
        next[index] = clampIndicatorParamValue(
          key,
          index,
          Number(next[index]) + indicatorParamStep(key, index) * direction,
        );
        return { ...prev, [key]: next };
      });
    },
    [clampIndicatorParamValue, indicatorParamStep],
  );

  const resetIndicatorParam = useCallback((key: IndicatorKey) => {
    setIndicatorParams((prev) => ({
      ...prev,
      [key]: [...DEFAULT_INDICATOR_PARAMS[key]],
    }));
    setIndicatorSetStatus(`${INDICATOR_LABEL[key]} 파라미터 기본값 복귀`);
  }, []);

  const rememberDrawingId = useCallback((id: string) => {
    drawingIds.current = [
      ...drawingIds.current.filter((item) => item !== id),
      id,
    ];
    setDrawingCount(drawingIds.current.length);
  }, []);

  const forgetDrawingId = useCallback((id: string) => {
    drawingIds.current = drawingIds.current.filter((item) => item !== id);
    setDrawingCount(drawingIds.current.length);
  }, []);

  const startDrawing = useCallback(
    (tool: DrawingToolKey) => {
      const chart = chartRef.current;
      if (!chart) return;
      if (activeDrawingId.current) {
        chart.removeOverlay(activeDrawingId.current);
        activeDrawingId.current = null;
      }
      let overlayId: string | null = null;
      const overlay: OverlayCreate = {
        name: tool,
        groupId: DRAWING_GROUP_ID,
        onDrawEnd: () => {
          activeDrawingId.current = null;
          const label = drawingToolLabel(tool);
          const count = drawingIds.current.length;
          if (drawingRepeatRef.current) {
            setPendingRepeatDrawing(tool);
            setIndicatorSetStatus(
              `${label} 완료 · 저장 ${count.toLocaleString()}개 · 연속 대기`,
            );
          } else {
            setActiveDrawing(null);
            setIndicatorSetStatus(
              `${label} 완료 · 저장 ${count.toLocaleString()}개`,
            );
          }
          return true;
        },
        onRemoved: () => {
          if (overlayId) forgetDrawingId(overlayId);
          activeDrawingId.current = null;
          setActiveDrawing((current) => (current === tool ? null : current));
          return true;
        },
      };
      const id = chart.createOverlay(overlay, "candle_pane");
      overlayId = typeof id === "string" ? id : null;
      activeDrawingId.current = overlayId;
      if (overlayId) rememberDrawingId(overlayId);
      setActiveDrawing(id ? tool : null);
      if (id) {
        setIndicatorSetStatus(
          `${drawingToolLabel(tool)} 시작 · 기존 ${Math.max(
            0,
            drawingIds.current.length - 1,
          ).toLocaleString()}개`,
        );
      }
    },
    [forgetDrawingId, rememberDrawingId],
  );

  useEffect(() => {
    if (!pendingRepeatDrawing || activeDrawingId.current) return;
    const tool = pendingRepeatDrawing;
    setPendingRepeatDrawing(null);
    const frame =
      typeof window === "undefined"
        ? null
        : window.requestAnimationFrame(() => startDrawing(tool));
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, [pendingRepeatDrawing, startDrawing]);

  const clearDrawings = useCallback(() => {
    const count = drawingIds.current.length;
    chartRef.current?.removeOverlay({ groupId: DRAWING_GROUP_ID });
    activeDrawingId.current = null;
    drawingIds.current = [];
    setDrawingCount(0);
    setActiveDrawing(null);
    setPendingRepeatDrawing(null);
    setIndicatorSetStatus(
      count > 0
        ? `드로잉 ${count.toLocaleString()}개 삭제`
        : "삭제할 드로잉이 없습니다",
    );
  }, []);

  const cancelActiveDrawing = useCallback(() => {
    if (!activeDrawingId.current) return false;
    const id = activeDrawingId.current;
    chartRef.current?.removeOverlay(id);
    activeDrawingId.current = null;
    forgetDrawingId(id);
    setActiveDrawing(null);
    setPendingRepeatDrawing(null);
    setIndicatorSetStatus(
      `진행 중인 드로잉 취소 · 남은 ${drawingIds.current.length.toLocaleString()}개`,
    );
    return true;
  }, [forgetDrawingId]);

  const undoLastDrawing = useCallback(() => {
    if (cancelActiveDrawing()) return true;
    const last = drawingIds.current.at(-1);
    if (!last) {
      setIndicatorSetStatus("되돌릴 드로잉이 없습니다");
      return false;
    }
    chartRef.current?.removeOverlay(last);
    forgetDrawingId(last);
    setIndicatorSetStatus(
      `마지막 드로잉 되돌림 · 남은 ${drawingIds.current.length.toLocaleString()}개`,
    );
    return true;
  }, [cancelActiveDrawing, forgetDrawingId]);

  const resetChartSettings = useCallback(() => {
    soloReturnIndicatorsRef.current = null;
    setPeriod(initialPeriod);
    setTimeframe(initialTimeframe);
    setIndicators(defaultIndicatorSet());
    setIndicatorParams(defaultIndicatorParams());
    setIndicatorOrder([...INDICATOR_KEYS]);
    setActiveSavedIndicatorSlot("1");
    setChartMode("candle_solid");
    setPriceScale("normal");
    setDensity("standard");
    setPricePaneScale(1);
    setIndicatorPaneScale(1);
    setShowAllIndicatorParams(false);
    setIndicatorCategory("all");
    setIndicatorSearch("");
    setDraggedIndicator(null);
    setDragOverIndicator(null);
    setToolsOpen(false);
    setShortcutsOpen(false);
    setDataTableOpen(false);
    setCompareDataTableOpen(false);
    setShowGrid(true);
    setShowCrosshair(true);
    setShowLastPriceLine(true);
    setCompareOpen(false);
    setCompareInput("SPY QQQ");
    setCompareHiddenSymbols(new Set());
    setCompareEndLabelsVisible(true);
    setCompareHoverIndex(null);
    setComparePinnedIndex(null);
    setActiveBar(null);
    setKeyboardBarIndex(null);
    setPinnedBar(null);
    setDrawingRepeat(false);
    setPendingRepeatDrawing(null);
    setIndicatorSetStatus("차트 기본 상태로 초기화");
    clearDrawings();
    syncChartLayout("fit-window");
  }, [clearDrawings, initialPeriod, initialTimeframe, syncChartLayout]);

  const focusChartRoot = useCallback((target: EventTarget | null) => {
    if (!isTypingTarget(target)) {
      rootRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const syncVisibleRangeAfterMotion = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    setVisibleRange(chart.getVisibleRange());
    if (visibleRangeRaf.current !== null) {
      cancelAnimationFrame(visibleRangeRaf.current);
    }
    if (visibleRangeTimeout.current !== null) {
      window.clearTimeout(visibleRangeTimeout.current);
    }
    visibleRangeRaf.current = requestAnimationFrame(() => {
      visibleRangeRaf.current = requestAnimationFrame(() => {
        visibleRangeRaf.current = null;
        const nextChart = chartRef.current;
        if (nextChart) {
          keepZoomInsideData();
          setVisibleRange(nextChart.getVisibleRange());
        }
      });
    });
    visibleRangeTimeout.current = window.setTimeout(() => {
      visibleRangeTimeout.current = null;
      const nextChart = chartRef.current;
      if (!nextChart) return;
      keepZoomInsideData();
      setVisibleRange(nextChart.getVisibleRange());
    }, 140);
  }, [keepZoomInsideData]);

  const exportChartImage = useCallback(() => {
    const chart = chartRef.current;
    if (!chart || typeof document === "undefined") return;
    const background = readToken("--card", isDark ? "#020617" : "#ffffff");
    const url = chart.getConvertPictureUrl(true, "image/png", background);
    downloadUrl(url, `${ticker || "chart"}-${period}-${timeframe}.png`);
  }, [isDark, period, ticker, timeframe]);

  const exportVisibleDataCsv = useCallback(() => {
    if (visibleCsvRows.length === 0) return;
    const first = visibleCsvRows[0];
    const last = visibleCsvRows[visibleCsvRows.length - 1];
    downloadCsv(
      [
        [
          "date",
          "open",
          "high",
          "low",
          "close",
          "change",
          "change_pct",
          "gap_days",
          "volume",
          ...indicatorTableColumns.map((column) => column.label),
        ],
        ...visibleCsvRows.map((bar) => {
          const globalIndex =
            klineIndexByTimestamp.get(Number(bar.timestamp)) ?? -1;
          const prev = globalIndex > 0 ? klineData[globalIndex - 1] : null;
          const delta = prev ? bar.close - prev.close : bar.close - bar.open;
          const pctBase = prev?.close ?? bar.open;
          const pct = pctBase !== 0 ? (delta / Math.abs(pctBase)) * 100 : 0;
          const gapDays = prev
            ? Math.max(
                0,
                Math.round(
                  (Number(bar.timestamp) - Number(prev.timestamp)) / 86_400_000,
                ),
              )
            : "";
          return [
            formatUtcDate(bar.timestamp, "YYYY-MM-DD"),
            bar.open,
            bar.high,
            bar.low,
            bar.close,
            delta,
            pct,
            gapDays,
            bar.volume ?? "",
            ...indicatorTableColumns.map((column) => {
              const value = column.values[globalIndex];
              return Number.isFinite(value) ? value : "";
            }),
          ];
        }),
      ],
      `${ticker || "chart"}-${formatUtcDate(first.timestamp, "YYYY-MM-DD")}-${formatUtcDate(last.timestamp, "YYYY-MM-DD")}-${timeframe}.csv`,
    );
  }, [
    indicatorTableColumns,
    klineData,
    klineIndexByTimestamp,
    ticker,
    timeframe,
    visibleCsvRows,
  ]);

  const exportCompareDataCsv = useCallback(() => {
    if (!compareStripModel || compareDisplayRows.length === 0) return;
    downloadCsv(
      [
        [
          "date",
          "gap_days",
          ...compareStripModel.series.map((series) => series.symbol),
        ],
        ...compareDisplayRows.map((row, index) => {
          const previous = compareDisplayRows[index - 1];
          const currentTime = parseUtcDay(row.date)?.timestamp;
          const previousTime = previous
            ? parseUtcDay(previous.date)?.timestamp
            : null;
          const gapDays =
            typeof currentTime === "number" &&
            Number.isFinite(currentTime) &&
            typeof previousTime === "number" &&
            Number.isFinite(previousTime)
              ? Math.max(
                  0,
                  Math.round((currentTime - previousTime) / 86_400_000),
                )
              : "";
          return [
            row.date ?? "",
            gapDays,
            ...compareStripModel.series.map((series) => {
              const value = Number(row[series.symbol]);
              return Number.isFinite(value) ? value : "";
            }),
          ];
        }),
      ],
      `${ticker || "chart"}-compare-${compareStripModel.from}-${compareStripModel.to}-${period}.csv`,
    );
  }, [compareDisplayRows, compareStripModel, period, ticker]);

  const togglePinnedReadout = useCallback(() => {
    if (activeDrawing) return;
    const target = readoutBar ?? pinnedBar;
    if (!target) return;
    setPinnedBar((prev) =>
      prev?.timestamp === target.timestamp ? null : target,
    );
    rootRef.current?.focus({ preventScroll: true });
  }, [activeDrawing, pinnedBar, readoutBar]);

  const handleChartPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      focusChartRoot(event.target);
      chartPointerRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
    },
    [focusChartRoot],
  );

  const handleChartPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pointer = chartPointerRef.current;
      if (!pointer || pointer.pointerId !== event.pointerId || pointer.moved)
        return;
      pointer.moved =
        Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4;
    },
    [],
  );

  const handleChartClick = useCallback(() => {
    const pointer = chartPointerRef.current;
    chartPointerRef.current = null;
    if (pointer?.moved) return;
    togglePinnedReadout();
  }, [togglePinnedReadout]);

  const updateCompareHover = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!compareStripModel || compareDisplayRows.length === 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width),
      );
      const index = Math.min(
        compareDisplayRows.length - 1,
        Math.max(0, Math.round(ratio * (compareDisplayRows.length - 1))),
      );
      setCompareHoverIndex(index);
    },
    [compareDisplayRows.length, compareStripModel],
  );

  const toggleComparePin = useCallback(() => {
    const index =
      compareHoverIndex ?? comparePinnedIndex ?? compareDisplayRows.length - 1;
    if (index < 0) return;
    setComparePinnedIndex((current) => (current === index ? null : index));
  }, [compareDisplayRows.length, compareHoverIndex, comparePinnedIndex]);

  const moveCompareReadout = useCallback(
    (
      direction: "left" | "right" | "pageLeft" | "pageRight" | "start" | "end",
    ) => {
      if (compareDisplayRows.length === 0) return;
      setCompareHoverIndex((current) => {
        const fallback = comparePinnedIndex ?? compareDisplayRows.length - 1;
        if (direction === "start") return 0;
        if (direction === "end") return compareDisplayRows.length - 1;
        const step =
          direction === "pageLeft" || direction === "pageRight"
            ? Math.max(5, Math.round(compareDisplayRows.length * 0.08))
            : 1;
        const sign =
          direction === "right" || direction === "pageRight" ? 1 : -1;
        return Math.min(
          compareDisplayRows.length - 1,
          Math.max(0, (current ?? fallback) + sign * step),
        );
      });
    },
    [compareDisplayRows.length, comparePinnedIndex],
  );

  const handleCompareKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCompareReadout(event.shiftKey ? "pageLeft" : "left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCompareReadout(event.shiftKey ? "pageRight" : "right");
      } else if (event.key === "PageUp") {
        event.preventDefault();
        moveCompareReadout("pageLeft");
      } else if (event.key === "PageDown") {
        event.preventDefault();
        moveCompareReadout("pageRight");
      } else if (event.key === "Home") {
        event.preventDefault();
        moveCompareReadout("start");
      } else if (event.key === "End") {
        event.preventDefault();
        moveCompareReadout("end");
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleComparePin();
      } else if (
        event.key.toLowerCase() === "d" ||
        event.key.toLowerCase() === "t"
      ) {
        event.preventDefault();
        setCompareDataTableOpen((value) => !value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (comparePinnedIndex != null || compareHoverIndex != null) {
          setComparePinnedIndex(null);
          setCompareHoverIndex(null);
        } else if (compareDataTableOpen) {
          setCompareDataTableOpen(false);
        }
      }
    },
    [
      compareDataTableOpen,
      compareHoverIndex,
      comparePinnedIndex,
      moveCompareReadout,
      toggleComparePin,
    ],
  );

  const moveKeyboardReadout = useCallback(
    (direction: "left" | "right" | "start" | "end") => {
      const chart = chartRef.current;
      if (klineData.length === 0) return;
      setKeyboardBarIndex((current) => {
        const fallback =
          readoutIndex >= 0 ? readoutIndex : klineData.length - 1;
        const next =
          direction === "start"
            ? 0
            : direction === "end"
              ? klineData.length - 1
              : Math.min(
                  klineData.length - 1,
                  Math.max(
                    0,
                    (current ?? fallback) + (direction === "right" ? 1 : -1),
                  ),
                );
        chart?.scrollToDataIndex(next, 80);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
        return next;
      });
      setActiveBar(null);
      rootRef.current?.focus({ preventScroll: true });
    },
    [
      keepZoomInsideData,
      klineData.length,
      readoutIndex,
      syncVisibleRangeAfterMotion,
    ],
  );

  const panChart = useCallback(
    (direction: "left" | "right") => {
      const chart = chartRef.current;
      if (!chart) return;
      const distance = Math.max(72, chart.getBarSpace() * 8);
      chart.scrollByDistance(direction === "left" ? distance : -distance, 100);
      keepZoomInsideData();
      syncVisibleRangeAfterMotion();
      rootRef.current?.focus({ preventScroll: true });
    },
    [keepZoomInsideData, syncVisibleRangeAfterMotion],
  );

  const zoomChart = useCallback(
    (direction: "in" | "out") => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.zoomAtCoordinate(direction === "in" ? 1.18 : 0.84, undefined, 100);
      keepZoomInsideData();
      syncVisibleRangeAfterMotion();
      rootRef.current?.focus({ preventScroll: true });
    },
    [keepZoomInsideData, syncVisibleRangeAfterMotion],
  );

  const jumpChartEdge = useCallback(
    (edge: "start" | "end") => {
      const chart = chartRef.current;
      if (!chart || klineData.length === 0) return;
      if (edge === "end") {
        chart.scrollToRealTime(120);
      } else {
        const range = chart.getVisibleRange();
        const visibleBars = Math.max(
          1,
          Math.round(range.realTo - range.realFrom + 1),
        );
        chart.scrollToDataIndex(
          Math.min(klineData.length - 1, Math.max(0, visibleBars - 1)),
          120,
        );
      }
      keepZoomInsideData();
      syncVisibleRangeAfterMotion();
      rootRef.current?.focus({ preventScroll: true });
    },
    [keepZoomInsideData, klineData.length, syncVisibleRangeAfterMotion],
  );

  const scrubChartRange = useCallback(
    (start: number) => {
      const chart = chartRef.current;
      if (!chart || !visibleRangeWindow || !visibleRangeWindow.enabled) return;
      const nextStart = Math.min(
        visibleRangeWindow.maxStart,
        Math.max(0, Math.round(start)),
      );
      chart.scrollToDataIndex(nextStart + visibleRangeWindow.span, 80);
      keepZoomInsideData();
      syncVisibleRangeAfterMotion();
      rootRef.current?.focus({ preventScroll: true });
    },
    [keepZoomInsideData, syncVisibleRangeAfterMotion, visibleRangeWindow],
  );

  const scrubChartRangeFromNavigator = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!visibleRangeWindow || klineData.length <= 1) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)),
      );
      const centerIndex = Math.round(ratio * (klineData.length - 1));
      scrubChartRange(centerIndex - visibleRangeWindow.span / 2);
    },
    [klineData.length, scrubChartRange, visibleRangeWindow],
  );

  const fitFullHistory = useCallback(() => {
    setPeriod("ALL");
    setActiveBar(null);
    setKeyboardBarIndex(null);
    rootRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      syncChartLayout("fit-window");
      syncVisibleRangeAfterMotion();
    });
  }, [syncChartLayout, syncVisibleRangeAfterMotion]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (isTypingTarget(event.target)) return;
      const chart = chartRef.current;
      if (!chart) return;
      const currentRange = chart.getVisibleRange();
      const visibleBars = Math.max(
        1,
        Math.round(currentRange.realTo - currentRange.realFrom + 1),
      );
      const baseDistance = event.shiftKey ? 240 : 96;
      const digitShortcut = /^Digit[1-9]$/.test(event.code)
        ? event.code.slice(-1)
        : /^[1-9]$/.test(event.key)
          ? event.key
          : null;
      const slotShortcut = /^Digit[1-3]$/.test(event.code)
        ? (event.code.slice(-1) as SavedIndicatorSlotKey)
        : /^[1-3]$/.test(event.key)
          ? (event.key as SavedIndicatorSlotKey)
          : null;
      const noSystemModifier =
        !event.metaKey && !event.ctrlKey && !event.altKey;
      const plainKey = noSystemModifier ? event.key.toLowerCase() : "";
      const indicatorShortcut = digitShortcut ?? (plainKey || null);
      const indicatorKey = INDICATOR_KEYS.find(
        (key) => INDICATOR_SHORTCUTS[key].toLowerCase() === indicatorShortcut,
      );
      const drawingTool = DRAWING_SHORTCUTS[plainKey];

      if (event.altKey && slotShortcut) {
        event.preventDefault();
        if (event.shiftKey) {
          saveIndicatorSetToSlot(slotShortcut);
        } else {
          setActiveSavedIndicatorSlot(slotShortcut);
          setIndicatorSetStatus(
            savedIndicatorSlots[slotShortcut]
              ? `내 지표 세트 ${slotShortcut}번 선택`
              : `${slotShortcut}번 지표 슬롯 선택`,
          );
        }
      } else if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        undoLastDrawing();
      } else if (event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDataTableOpen((v) => !v);
      } else if (event.altKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        setIndicatorCategory((current) =>
          current === "active" ? "all" : "active",
        );
      } else if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setToolsOpen(true);
      } else if (event.altKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        setDrawingRepeat((value) => !value);
      } else if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        showAllCompareSeries();
      } else if (event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        if (event.shiftKey) clearCompareInputSymbols();
        else cycleQuickComparePreset();
      } else if (event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setCompareEndLabelsVisible((value) => !value);
      } else if (noSystemModifier && indicatorKey) {
        event.preventDefault();
        if (event.shiftKey) {
          isolateIndicator(indicatorKey);
        } else {
          toggle(indicatorKey);
        }
      } else if (drawingTool) {
        event.preventDefault();
        startDrawing(drawingTool);
      } else if (
        noSystemModifier &&
        event.shiftKey &&
        event.key.toLowerCase() === "r"
      ) {
        event.preventDefault();
        resetChartSettings();
      } else if (plainKey === "d" || plainKey === "w" || plainKey === "r") {
        event.preventDefault();
        setTimeframe(plainKey === "d" ? "D" : plainKey === "w" ? "W" : "M");
      } else if (noSystemModifier && (event.key === "[" || event.key === "{")) {
        event.preventDefault();
        setPeriod((current) => {
          const index = PERIOD_ORDER.indexOf(current);
          return PERIOD_ORDER[Math.max(0, index - 1)] ?? current;
        });
      } else if (noSystemModifier && (event.key === "]" || event.key === "}")) {
        event.preventDefault();
        setPeriod((current) => {
          const index = PERIOD_ORDER.indexOf(current);
          return (
            PERIOD_ORDER[Math.min(PERIOD_ORDER.length - 1, index + 1)] ??
            current
          );
        });
      } else if (plainKey === "c") {
        event.preventDefault();
        setChartMode((current) => {
          const index = CHART_MODE_ORDER.indexOf(current);
          return CHART_MODE_ORDER[(index + 1) % CHART_MODE_ORDER.length];
        });
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePinnedReadout();
      } else if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (
        noSystemModifier &&
        event.shiftKey &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault();
        setAllIndicators(false);
      } else if (plainKey === "a") {
        event.preventDefault();
        setAllIndicators(activeIndicatorCount < INDICATOR_KEYS.length);
      } else if (noSystemModifier && event.key.toLowerCase() === "u") {
        event.preventDefault();
        if (event.shiftKey) saveCurrentIndicatorSet();
        else applySavedIndicatorSet();
      } else if (event.key === "Escape") {
        if (pinnedBar) {
          event.preventDefault();
          setPinnedBar(null);
        } else if (keyboardBarIndex != null) {
          event.preventDefault();
          setKeyboardBarIndex(null);
        } else if (shortcutsOpen) {
          event.preventDefault();
          setShortcutsOpen(false);
        } else if (dataTableOpen) {
          event.preventDefault();
          setDataTableOpen(false);
        } else if (cancelActiveDrawing()) {
          event.preventDefault();
        }
      } else if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        moveKeyboardReadout("left");
      } else if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        moveKeyboardReadout("right");
      } else if (event.altKey && event.key === "Home") {
        event.preventDefault();
        moveKeyboardReadout("start");
      } else if (event.altKey && event.key === "End") {
        event.preventDefault();
        moveKeyboardReadout("end");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        chart.scrollByDistance(baseDistance, 80);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        chart.scrollByDistance(-baseDistance, 80);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (event.key === "PageUp") {
        event.preventDefault();
        chart.scrollByDistance(chart.getBarSpace() * visibleBars * 0.8, 120);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (event.key === "PageDown") {
        event.preventDefault();
        chart.scrollByDistance(-chart.getBarSpace() * visibleBars * 0.8, 120);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (event.key === "Home") {
        event.preventDefault();
        if (klineData.length === 0) return;
        const rightEdge = Math.min(
          klineData.length - 1,
          Math.max(0, visibleBars - 1),
        );
        chart.scrollToDataIndex(rightEdge, 120);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (event.key === "End") {
        event.preventDefault();
        chart.scrollToRealTime(120);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (noSystemModifier && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        chart.zoomAtCoordinate(1.18, undefined, 80);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (noSystemModifier && (event.key === "-" || event.key === "_")) {
        event.preventDefault();
        chart.zoomAtCoordinate(0.84, undefined, 80);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
      } else if (noSystemModifier && event.key === "0") {
        event.preventDefault();
        syncChartLayout("fit-window");
        syncVisibleRangeAfterMotion();
      } else if (
        noSystemModifier &&
        event.shiftKey &&
        event.code === "Digit0"
      ) {
        event.preventDefault();
        fitFullHistory();
      } else if (noSystemModifier && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setExpanded((v) => !v);
      } else if (noSystemModifier && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setDensity((current) =>
          current === "compact"
            ? "standard"
            : current === "standard"
              ? "deep"
              : "compact",
        );
      } else if (noSystemModifier && event.shiftKey && event.key === "<") {
        event.preventDefault();
        changePricePaneScale(pricePaneScale - PRICE_PANE_SCALE_STEP);
      } else if (noSystemModifier && event.shiftKey && event.key === ">") {
        event.preventDefault();
        changePricePaneScale(pricePaneScale + PRICE_PANE_SCALE_STEP);
      } else if (noSystemModifier && event.key === ",") {
        event.preventDefault();
        changeIndicatorPaneScale(
          indicatorPaneScale - INDICATOR_PANE_SCALE_STEP,
        );
      } else if (noSystemModifier && event.key === ".") {
        event.preventDefault();
        changeIndicatorPaneScale(
          indicatorPaneScale + INDICATOR_PANE_SCALE_STEP,
        );
      } else if (noSystemModifier && event.key.toLowerCase() === "g") {
        event.preventDefault();
        setShowGrid((v) => !v);
      } else if (noSystemModifier && event.key.toLowerCase() === "x") {
        event.preventDefault();
        setShowCrosshair((v) => !v);
      } else if (noSystemModifier && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setShowLastPriceLine((v) => !v);
      } else if (noSystemModifier && event.key.toLowerCase() === "l") {
        event.preventDefault();
        togglePriceScale();
      } else if (noSystemModifier && event.key.toLowerCase() === "o") {
        event.preventDefault();
        cycleIndicatorPreset();
      } else if (noSystemModifier && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setToolsOpen(true);
        const presets = Object.keys(
          INDICATOR_PARAM_PRESETS,
        ) as IndicatorParamPresetKey[];
        const currentIndex = activeParamPreset
          ? presets.indexOf(activeParamPreset)
          : -1;
        const nextPreset = presets[(currentIndex + 1) % presets.length];
        setIndicatorParams(
          cloneIndicatorParams(INDICATOR_PARAM_PRESETS[nextPreset].params),
        );
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        clearDrawings();
      } else if (noSystemModifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (event.shiftKey) refetchBars();
        else exportChartImage();
      }
    },
    [
      activeParamPreset,
      activeIndicatorCount,
      applySavedIndicatorSet,
      clearDrawings,
      cancelActiveDrawing,
      changeIndicatorPaneScale,
      changePricePaneScale,
      cycleQuickComparePreset,
      cycleIndicatorPreset,
      dataTableOpen,
      exportChartImage,
      fitFullHistory,
      indicatorPaneScale,
      isolateIndicator,
      keepZoomInsideData,
      klineData.length,
      keyboardBarIndex,
      moveKeyboardReadout,
      pinnedBar,
      pricePaneScale,
      refetchBars,
      resetChartSettings,
      saveCurrentIndicatorSet,
      saveIndicatorSetToSlot,
      savedIndicatorSlots,
      setAllIndicators,
      showAllCompareSeries,
      startDrawing,
      syncChartLayout,
      syncVisibleRangeAfterMotion,
      shortcutsOpen,
      togglePinnedReadout,
      togglePriceScale,
      toggle,
      undoLastDrawing,
    ],
  );

  const handleChartWheel = useCallback(
    (event: globalThis.WheelEvent) => {
      const chart = chartRef.current;
      if (!chart) return;
      event.preventDefault();
      const horizontalDominant =
        Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = horizontalDominant ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      if (event.shiftKey || horizontalDominant) {
        chart.scrollByDistance(-delta, 80);
        keepZoomInsideData();
        syncVisibleRangeAfterMotion();
        return;
      }
      const rect = chartWheelRef.current?.getBoundingClientRect();
      if (!rect) return;
      chart.zoomAtCoordinate(
        delta > 0 ? 0.84 : 1.18,
        {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        } as any,
        80,
      );
      keepZoomInsideData();
      syncVisibleRangeAfterMotion();
    },
    [keepZoomInsideData, syncVisibleRangeAfterMotion],
  );

  useEffect(() => {
    const el = chartWheelRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleChartWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleChartWheel);
    };
  }, [handleChartWheel]);

  // Total height = price pane + each active sub-pane (matches klinecharts layout).
  const subPanesHeight = orderedPaneIndicators.reduce(
    (sum, k) =>
      sum + (indicators[k] ? (k === "vol" ? volumePaneHeight : paneHeight) : 0),
    0,
  );
  const totalHeight = pricePaneHeight + subPanesHeight + 24; // 24 = bottom x-axis labels

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => focusChartRoot(event.target)}
      aria-label={`${ticker} 가격 차트`}
      aria-describedby={`${chartHelpId} ${chartStatusId}`}
      aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Alt+ArrowLeft Alt+ArrowRight Alt+Home Alt+End Home End PageUp PageDown 0 Shift+0 Shift+R Enter Space Escape D W R C A Shift+A U Shift+U Alt+D Alt+O Alt+P Alt+B Alt+Shift+B Alt+L Alt+Y Alt+R Alt+1 Alt+2 Alt+3 Alt+Shift+1 Alt+Shift+2 Alt+Shift+3 F E G X M L O P Comma Period Shift+Comma Shift+Period Delete Backspace S Shift+S Control+Z T Y H V I K B N Q J 1 2 3 4 5 6 7 8 9 Shift+1 Shift+2 Shift+3 Shift+4 Shift+5 Shift+6 Shift+7 Shift+8 Shift+9"
      className={cn(
        "bg-card border border-border overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        expanded
          ? "fixed inset-3 sm:inset-5 z-50 rounded-xl shadow-2xl flex flex-col"
          : "rounded-xl",
      )}
    >
      <span id={chartHelpId} className="sr-only">
        방향키로 차트를 이동하고, Alt와 방향키 또는 Home, End로 PIN을 유지한 채
        CUR readout을 이동합니다. Enter 또는 Space로 PIN을 고정하고, Escape로
        PIN 또는 CUR을 해제합니다. Alt+D로 현재 표시 OHLCV 데이터 표를 열고
        닫습니다. 숫자 1부터 9와 B, N, J, Q로 보조지표를 토글하고 Shift와
        단축키로 단독 보기와 이전 조합 복귀를 전환합니다. Alt+O로 켜진
        보조지표만 필터링하고 Alt+P로 지표값 패널을 엽니다. Alt+Y로 드로잉 연속
        모드를 켜고 끕니다. Alt+B로 비교 프리셋을 순환하고, Alt+Shift+B로 비교
        입력을 비우며, Alt+L로 비교 끝값 라벨을 켜고 끄고, Alt+R로 숨긴 비교선을
        모두 다시 표시합니다.
      </span>
      <span id={chartStatusId} className="sr-only" aria-live="polite">
        {readoutAccessibilityStatus}
      </span>
      {/* Toolbar */}
      <div className="border-b border-border">
        <div className="px-3 py-2 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div
              className="flex items-center bg-muted/40 p-0.5 rounded-md shrink-0"
              role="group"
              aria-label="가격 차트 봉 주기 선택"
            >
              {(["D", "W", "M"] as Timeframe[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  title={`${TIMEFRAME_LABELS[t]} (${t === "M" ? "R" : t})`}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap",
                    timeframe === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={timeframe === t}
                >
                  {TIMEFRAME_LABELS[t]}
                </button>
              ))}
            </div>
            <div
              className="flex items-center bg-muted/40 p-0.5 rounded-md overflow-x-auto max-w-full"
              role="group"
              aria-label="가격 차트 기간 선택"
            >
              {PERIOD_ORDER.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  title={`기간 ${p} ([ / ]로 이전·다음 기간)`}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap shrink-0",
                    period === p
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={period === p}
                >
                  {p}
                </button>
              ))}
            </div>
            <div
              className="flex items-center bg-muted/40 p-0.5 rounded-md overflow-x-auto max-w-full"
              role="group"
              aria-label="가격 차트 보기 방식 선택"
            >
              {(
                ["candle_solid", "candle_stroke", "ohlc", "area"] as ChartMode[]
              ).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1",
                    chartMode === mode
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title={`보기 방식: ${CHART_MODE_LABELS[mode]} (C로 순환)`}
                  aria-pressed={chartMode === mode}
                >
                  {mode === "area" ? (
                    <ChartLine size={12} />
                  ) : (
                    <CandlestickChart size={12} />
                  )}
                  {CHART_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <div className="flex max-w-full shrink-0 items-center overflow-x-auto rounded-md bg-muted/40 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => jumpChartEdge("start")}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                title="처음 구간으로 이동 (Home)"
                aria-label="처음 구간으로 이동"
              >
                <ChevronsLeft size={13} />
              </button>
              <button
                onClick={() => panChart("left")}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                title="왼쪽으로 이동 (←)"
                aria-label="왼쪽으로 이동"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => zoomChart("out")}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                title="축소 (-)"
                aria-label="차트 축소"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={() => zoomChart("in")}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                title="확대 (+)"
                aria-label="차트 확대"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => panChart("right")}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                title="오른쪽으로 이동 (→)"
                aria-label="오른쪽으로 이동"
              >
                <ChevronRight size={13} />
              </button>
              <button
                onClick={() => jumpChartEdge("end")}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                title="최신 구간으로 이동 (End)"
                aria-label="최신 구간으로 이동"
              >
                <ChevronsRight size={13} />
              </button>
            </div>
            <button
              onClick={() => {
                syncChartLayout("fit-window");
                syncVisibleRangeAfterMotion();
              }}
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              title="현재 기간을 차트 폭에 맞춤 (0 또는 차트 더블클릭)"
              aria-label="현재 기간을 차트 폭에 맞춤"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={fitFullHistory}
              className="h-7 inline-flex items-center justify-center rounded border border-border px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              title="전체 DB 히스토리를 차트 폭에 맞춤 (Shift+0)"
              aria-label="전체 DB 히스토리를 차트 폭에 맞춤"
            >
              ALL
            </button>
            <button
              onClick={refetchBars}
              disabled={loading}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded border transition-colors",
                loading
                  ? "border-border text-muted-foreground/45 cursor-wait"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
              )}
              title="가격 데이터 다시 불러오기 (Shift+S)"
              aria-label="가격 데이터 다시 불러오기"
            >
              <RefreshCw size={13} className={cn(loading && "animate-spin")} />
            </button>
            <button
              onClick={() => setShowGrid((v) => !v)}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded border transition-colors",
                showGrid
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              title={showGrid ? "그리드 숨김" : "그리드 표시"}
              aria-label={showGrid ? "그리드 숨김" : "그리드 표시"}
              aria-pressed={showGrid}
            >
              {showGrid ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button
              onClick={() => setShowCrosshair((v) => !v)}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded border transition-colors",
                showCrosshair
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              title={showCrosshair ? "십자선 숨김" : "십자선 표시"}
              aria-label={showCrosshair ? "십자선 숨김" : "십자선 표시"}
              aria-pressed={showCrosshair}
            >
              <SlidersHorizontal size={13} />
            </button>
            <button
              onClick={() => setShowLastPriceLine((v) => !v)}
              className={cn(
                "h-7 inline-flex items-center justify-center rounded border px-2 text-[11px] font-medium transition-colors",
                showLastPriceLine
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              title={
                showLastPriceLine
                  ? "현재가 라인 숨김 (M)"
                  : "현재가 라인 표시 (M)"
              }
              aria-pressed={showLastPriceLine}
            >
              <TrendingUp size={12} />
              현재가
            </button>
            <button
              onClick={togglePriceScale}
              disabled={logScaleBlocked && priceScale !== "log"}
              className={cn(
                "h-7 inline-flex items-center justify-center rounded border px-2 text-[11px] font-medium transition-colors",
                priceScale === "log"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : logScaleBlocked
                    ? "border-border text-muted-foreground/45 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-foreground",
              )}
              title={
                priceScale === "log"
                  ? "선형 가격축으로 전환 (L)"
                  : logScaleBlocked
                    ? "MACD 패널은 음수값이 있어 로그 가격축과 동시에 사용할 수 없습니다"
                    : "로그 가격축으로 전환 (L)"
              }
              aria-pressed={priceScale === "log"}
            >
              {priceScale === "log" ? "LOG" : "LIN"}
            </button>
            <button
              onClick={() => setCompareOpen((value) => !value)}
              className={cn(
                "h-7 inline-flex items-center justify-center rounded border px-2 text-[11px] font-medium transition-colors",
                compareOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              title="현재 종목과 벤치마크를 DB 일봉 기준 누적 수익률로 비교"
              aria-pressed={compareOpen}
            >
              <ChartLine size={12} />
              비교
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              title={expanded ? "확장 보기 닫기 (F)" : "확장 보기 (F)"}
              aria-label={expanded ? "확장 보기 닫기" : "확장 보기"}
              aria-pressed={expanded}
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              onClick={() => setToolsOpen((v) => !v)}
              className={cn(
                "h-7 inline-flex items-center gap-1 rounded border px-2 text-[11px] transition-colors",
                toolsOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
              title="프리셋, 지표값, 드로잉 도구 열기"
              aria-pressed={toolsOpen}
            >
              <SlidersHorizontal size={13} />
              도구
              <ChevronDown
                size={12}
                className={cn(
                  "transition-transform",
                  toolsOpen && "rotate-180",
                )}
              />
            </button>
            <button
              onClick={() => setShortcutsOpen((v) => !v)}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded border transition-colors",
                shortcutsOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
              title="차트 단축키 보기 (?)"
              aria-label={
                shortcutsOpen ? "차트 단축키 닫기" : "차트 단축키 보기"
              }
              aria-pressed={shortcutsOpen}
            >
              <HelpCircle size={13} />
            </button>
            <button
              onClick={exportChartImage}
              className="h-7 w-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              title="차트 이미지를 PNG로 저장 (S)"
              aria-label="차트 이미지를 PNG로 저장"
            >
              <Download size={13} />
            </button>
            <button
              onClick={() => setDataTableOpen((v) => !v)}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded border transition-colors",
                dataTableOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
              title={
                dataTableOpen
                  ? "표시 OHLCV 데이터 표 닫기 (Alt+D)"
                  : "표시 OHLCV 데이터 표 열기 (Alt+D)"
              }
              aria-label={
                dataTableOpen
                  ? "표시 OHLCV 데이터 표 닫기"
                  : "표시 OHLCV 데이터 표 열기"
              }
              aria-pressed={dataTableOpen}
            >
              <Table2 size={13} />
            </button>
            <span
              className={cn(
                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono",
                barsError
                  ? "border-destructive/35 bg-destructive/10 text-destructive"
                  : loading
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-500"
                    : "border-primary/30 bg-primary/10 text-primary",
              )}
              title={dbSourceStatus.title}
            >
              {dbSourceStatus.label}{" "}
              {dbSourceStatus.requestedDays.toLocaleString()}d
            </span>
            {visibleRangeStatus && (
              <span
                className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary"
                title={`표시 구간 · ${visibleRangeStatus.title}`}
              >
                {visibleRangeStatus.label}
              </span>
            )}
            {visibleRangeStatus && (
              <span
                className="shrink-0 rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                title="전체 DB 히스토리 대비 현재 표시 비율"
              >
                {visibleRangeStatus.detail}
              </span>
            )}
            {visibleRangeGapStats && (
              <span
                className="shrink-0 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-500"
                title={`현재 표시 구간 안에 7일 초과 날짜 공백 ${visibleRangeGapStats.largeGapCount.toLocaleString()}개, 최대 ${visibleRangeGapStats.maxGapDays.toLocaleString()}일`}
              >
                VIEW 공백 {visibleRangeGapStats.largeGapCount.toLocaleString()}
                개
              </span>
            )}
            <span
              className={cn(
                "basis-full sm:basis-auto text-[10px] font-mono tabular-nums sm:mr-1 min-w-0 truncate",
                hasBarQualityWarning
                  ? "text-amber-500"
                  : "text-muted-foreground",
              )}
              title={`화면 표시 범위 · DB ${dataRangeLabel}`}
            >
              {visibleRangeLabel}
            </span>
            <span
              className={cn(
                "basis-full sm:basis-auto text-[10px] font-mono tabular-nums sm:mr-1 min-w-0 truncate",
                barsError
                  ? "text-destructive"
                  : hasBarQualityWarning
                    ? "text-amber-500"
                    : "text-muted-foreground",
              )}
              title={`DB 전체 범위 · ${dataRangeLabel}`}
            >
              {dbStatusLabel}
            </span>
            <span className="basis-full sm:basis-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-mono">
              {barQualityChips.length === 0 ? (
                <span
                  className="rounded border border-up/30 bg-up/10 px-1.5 py-0.5 text-up"
                  title="데이터 품질 정상"
                >
                  OK
                </span>
              ) : (
                <>
                  <span className="text-muted-foreground">QUALITY</span>
                  {barQualityChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-amber-500"
                    >
                      {chip}
                    </span>
                  ))}
                </>
              )}
            </span>
          </div>
        </div>

        {visibleRangeWindow?.enabled && (
          <div className="mx-3 mb-2 rounded-md border border-border/60 bg-muted/10 px-2 py-1.5 text-[11px]">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-mono text-muted-foreground">
                WINDOW
              </span>
              <button
                type="button"
                onPointerDown={scrubChartRangeFromNavigator}
                onPointerMove={(event) => {
                  if (event.buttons === 1) scrubChartRangeFromNavigator(event);
                }}
                className="relative h-9 min-w-0 flex-1 overflow-hidden rounded border border-border/60 bg-background/70 text-left"
                aria-label="전체 가격 히스토리 미니 내비게이터"
                title="전체 DB 히스토리에서 현재 표시 구간 위치를 확인하고 클릭/드래그로 이동"
              >
                {rangeNavigator && (
                  <>
                    <svg
                      viewBox={rangeNavigator.viewBox}
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      <path
                        d={rangeNavigator.path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        className="text-muted-foreground/50"
                      />
                    </svg>
                    <span
                      className="absolute inset-y-0 rounded-sm border-x border-primary/60 bg-primary/20"
                      style={{
                        left: `${rangeNavigator.fromPct}%`,
                        width: `${rangeNavigator.widthPct}%`,
                      }}
                    />
                    <span className="absolute left-1 top-0.5 font-mono text-[9px] text-muted-foreground">
                      {rangeNavigator.sourceLabel}
                    </span>
                    <span className="absolute bottom-0.5 right-1 font-mono text-[9px] text-primary">
                      {rangeNavigator.windowLabel}
                    </span>
                    {rangeNavigator.changeLabel && (
                      <span
                        className={cn(
                          "absolute right-1 top-0.5 rounded border bg-card/90 px-1 py-0.5 font-mono text-[9px]",
                          rangeNavigator.changeTone === "up"
                            ? "border-up/35 text-up"
                            : rangeNavigator.changeTone === "down"
                              ? "border-down/35 text-down"
                              : "border-border text-muted-foreground",
                        )}
                        title="현재 표시 구간의 시작 종가 대비 끝 종가 변화율"
                      >
                        {rangeNavigator.changeLabel}
                      </span>
                    )}
                  </>
                )}
              </button>
              <span className="shrink-0 font-mono text-muted-foreground">
                {visibleRangeWindow.from + 1}-{visibleRangeWindow.to + 1}/
                {klineData.length.toLocaleString()}
                {visibleRangeStatus
                  ? ` · ${visibleRangeStatus.detail.split(" · ")[1]}`
                  : ""}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={visibleRangeWindow.maxStart}
              step={1}
              value={Math.min(
                visibleRangeWindow.from,
                visibleRangeWindow.maxStart,
              )}
              onChange={(event) =>
                scrubChartRange(Number(event.currentTarget.value))
              }
              className="h-2 w-full accent-primary"
              aria-label="가격 차트 표시 구간 이동"
              title="현재 확대 폭을 유지한 채 전체 가격 히스토리 위에서 표시 구간 이동"
            />
          </div>
        )}

        {readoutBar && (
          <div className="px-3 pb-2 sm:hidden">
            <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border/60 bg-muted/10 px-2 py-1.5 text-[11px] font-mono">
              <span className="truncate text-muted-foreground">
                {formatUtcDate(readoutBar.timestamp, "YYYY-MM-DD")}
              </span>
              <span
                className={cn(
                  "text-right",
                  readoutUp ? "text-up" : "text-down",
                )}
              >
                {readoutUp ? "+" : ""}
                {readoutChangePct.toFixed(2)}%
              </span>
              <span className="truncate text-muted-foreground">
                C{" "}
                <span className="text-foreground">
                  {formatCompactNumber(readoutBar.close, pricePrecision)}
                </span>
              </span>
              <span className="truncate text-right text-muted-foreground">
                VOL{" "}
                <span className="text-foreground">
                  {formatVolume(readoutBar.volume)}
                </span>
              </span>
              {readoutSignalChips.length > 0 && (
                <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1 pt-0.5">
                  {readoutSignalChips.slice(0, 3).map((chip) => (
                    <span
                      key={chip.key}
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[10px]",
                        chip.tone === "up"
                          ? "border-up/35 bg-up/10 text-up"
                          : chip.tone === "down"
                            ? "border-down/35 bg-down/10 text-down"
                            : "border-border bg-muted/20 text-muted-foreground",
                      )}
                      title={chip.detail}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}
              {visibleRangeStats && (
                <>
                  <span className="truncate text-muted-foreground">
                    H{" "}
                    <span className="text-foreground">
                      {formatCompactNumber(
                        visibleRangeStats.high,
                        pricePrecision,
                      )}
                    </span>{" "}
                    L{" "}
                    <span className="text-foreground">
                      {formatCompactNumber(
                        visibleRangeStats.low,
                        pricePrecision,
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "truncate text-right",
                      visibleRangeStats.up ? "text-up" : "text-down",
                    )}
                  >
                    RANGE {visibleRangeStats.up ? "+" : ""}
                    {visibleRangeStats.changePct.toFixed(2)}%
                  </span>
                </>
              )}
              {pinnedComparison && (
                <>
                  <span className="truncate text-muted-foreground">
                    PIN→
                    {formatUtcDate(
                      pinnedComparison.target.timestamp,
                      "MM-DD",
                    )}{" "}
                    <span className="text-foreground">
                      {pinnedComparison.elapsedLabel}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "truncate text-right",
                      pinnedComparison.up ? "text-up" : "text-down",
                    )}
                  >
                    {pinnedComparison.up ? "+" : ""}
                    {formatCompactNumber(
                      pinnedComparison.delta,
                      pricePrecision,
                    )}{" "}
                    ({pinnedComparison.up ? "+" : ""}
                    {pinnedComparison.pct.toFixed(2)}%)
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {readoutBar && (
          <div className="hidden px-3 pb-2 sm:flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px]">
            {pinnedBar && (
              <button
                onClick={() => setPinnedBar(null)}
                className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary transition-colors hover:border-primary/50"
                title="고정한 readout 해제"
              >
                PINNED
              </button>
            )}
            {keyboardBar && !pinnedBar && (
              <button
                onClick={() => setKeyboardBarIndex(null)}
                className="shrink-0 rounded border border-border bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                title="키보드 readout 커서 해제"
              >
                CUR
              </button>
            )}
            <span className="shrink-0 font-mono text-muted-foreground">
              {formatUtcDate(readoutBar.timestamp, "YYYY-MM-DD")}
            </span>
            {[
              ["O", readoutBar.open],
              ["H", readoutBar.high],
              ["L", readoutBar.low],
              ["C", readoutBar.close],
            ].map(([label, value]) => (
              <span
                key={label}
                className="shrink-0 font-mono text-muted-foreground"
              >
                {label}
                <span className="ml-1 text-foreground">
                  {formatCompactNumber(Number(value), pricePrecision)}
                </span>
              </span>
            ))}
            <span
              className={cn(
                "shrink-0 font-mono",
                readoutUp ? "text-up" : "text-down",
              )}
            >
              {readoutUp ? "+" : ""}
              {formatCompactNumber(readoutChange, pricePrecision)} (
              {readoutUp ? "+" : ""}
              {readoutChangePct.toFixed(2)}%)
            </span>
            <span className="shrink-0 font-mono text-muted-foreground">
              VOL{" "}
              <span className="text-foreground">
                {formatVolume(readoutBar.volume)}
              </span>
            </span>
            {readoutSignalChips.length > 0 && (
              <>
                <span className="shrink-0 text-border">|</span>
                {readoutSignalChips.map((chip) => (
                  <span
                    key={chip.key}
                    className={cn(
                      "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]",
                      chip.tone === "up"
                        ? "border-up/35 bg-up/10 text-up"
                        : chip.tone === "down"
                          ? "border-down/35 bg-down/10 text-down"
                          : "border-border bg-muted/20 text-muted-foreground",
                    )}
                    title={chip.detail}
                  >
                    {chip.label}
                  </span>
                ))}
              </>
            )}
            {readoutIndicatorGroups.length > 0 && (
              <>
                <span className="shrink-0 text-border">|</span>
                {readoutIndicatorGroups.map((group) => (
                  <span
                    key={group.key}
                    className="shrink-0 inline-flex items-center gap-1.5 font-mono text-muted-foreground"
                    title={`${group.label} 현재 readout 봉 기준값`}
                  >
                    <span>{group.label}</span>
                    {group.values.map((item) => (
                      <span
                        key={item.key}
                        className="inline-flex items-center gap-0.5"
                      >
                        <span>{item.label}</span>
                        <span
                          className={cn(
                            item.tone === "up"
                              ? "text-up"
                              : item.tone === "down"
                                ? "text-down"
                                : "text-foreground",
                          )}
                        >
                          {formatIndicatorReadoutValue(item)}
                        </span>
                      </span>
                    ))}
                  </span>
                ))}
              </>
            )}
            {pinnedComparison && (
              <>
                <span className="shrink-0 text-border">|</span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  PIN→
                  {formatUtcDate(pinnedComparison.target.timestamp, "MM-DD")}
                </span>
                <span
                  className="shrink-0 font-mono text-muted-foreground"
                  title="PIN에서 비교 대상까지의 봉 수와 달력 일수"
                >
                  {pinnedComparison.elapsedLabel}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono",
                    pinnedComparison.up ? "text-up" : "text-down",
                  )}
                  title={`고정 지점 대비 · ${pinnedComparison.elapsedLabel}`}
                >
                  {pinnedComparison.up ? "+" : ""}
                  {formatCompactNumber(
                    pinnedComparison.delta,
                    pricePrecision,
                  )}{" "}
                  ({pinnedComparison.up ? "+" : ""}
                  {pinnedComparison.pct.toFixed(2)}%)
                </span>
              </>
            )}
            {readoutCandleStats && (
              <>
                <span className="shrink-0 font-mono text-muted-foreground">
                  BODY{" "}
                  <span
                    className={
                      readoutCandleStats.bodyUp ? "text-up" : "text-down"
                    }
                  >
                    {readoutCandleStats.bodyUp ? "+" : ""}
                    {formatCompactNumber(
                      readoutCandleStats.body,
                      pricePrecision,
                    )}{" "}
                    ({readoutCandleStats.bodyUp ? "+" : ""}
                    {readoutCandleStats.bodyPct.toFixed(2)}%)
                  </span>
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  RANGE{" "}
                  <span className="text-foreground">
                    {formatCompactNumber(
                      readoutCandleStats.range,
                      pricePrecision,
                    )}{" "}
                    ({readoutCandleStats.rangePct.toFixed(2)}%)
                  </span>
                </span>
                {readoutCandleStats.gap != null &&
                  readoutCandleStats.gapPct != null && (
                    <span className="shrink-0 font-mono text-muted-foreground">
                      GAP{" "}
                      <span
                        className={
                          readoutCandleStats.gapUp ? "text-up" : "text-down"
                        }
                      >
                        {readoutCandleStats.gapUp ? "+" : ""}
                        {formatCompactNumber(
                          readoutCandleStats.gap,
                          pricePrecision,
                        )}{" "}
                        ({readoutCandleStats.gapUp ? "+" : ""}
                        {readoutCandleStats.gapPct.toFixed(2)}%)
                      </span>
                    </span>
                  )}
              </>
            )}
            {visibleRangeStats && (
              <>
                <span className="shrink-0 text-border">|</span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  RANGE
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono",
                    visibleRangeStats.up ? "text-up" : "text-down",
                  )}
                >
                  {visibleRangeStats.up ? "+" : ""}
                  {formatCompactNumber(
                    visibleRangeStats.change,
                    pricePrecision,
                  )}{" "}
                  ({visibleRangeStats.up ? "+" : ""}
                  {visibleRangeStats.changePct.toFixed(2)}%)
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  H{" "}
                  <span className="text-foreground">
                    {formatCompactNumber(
                      visibleRangeStats.high,
                      pricePrecision,
                    )}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  L{" "}
                  <span className="text-foreground">
                    {formatCompactNumber(visibleRangeStats.low, pricePrecision)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  폭{" "}
                  <span className="text-foreground">
                    {formatCompactNumber(
                      visibleRangeStats.spread,
                      pricePrecision,
                    )}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({visibleRangeStats.spreadPct.toFixed(2)}%)
                  </span>
                </span>
                {visibleRangeStats.vwap != null && (
                  <span className="shrink-0 font-mono text-muted-foreground">
                    VWAP{" "}
                    <span className="text-foreground">
                      {formatCompactNumber(
                        visibleRangeStats.vwap,
                        pricePrecision,
                      )}
                    </span>
                  </span>
                )}
                <span
                  className="shrink-0 font-mono text-muted-foreground"
                  title="현재 화면 구간의 고점 이후 최대 낙폭"
                >
                  MDD{" "}
                  <span className="text-down">
                    {visibleRangeStats.maxDrawdownPct.toFixed(2)}%
                  </span>
                </span>
                <span
                  className="shrink-0 font-mono text-muted-foreground"
                  title={`구간 평균 거래량 ${formatVolume(visibleRangeStats.avgVolume)}`}
                >
                  VOLΣ{" "}
                  <span className="text-foreground">
                    {formatVolume(visibleRangeStats.volume)}
                  </span>
                </span>
              </>
            )}
          </div>
        )}

        <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px]">
          <span className="shrink-0 font-mono text-muted-foreground">
            INDICATORS
          </span>
          <span className="shrink-0 font-mono text-muted-foreground">
            {activePreset ? PRESETS[activePreset].label : "커스텀"}
          </span>
          <span className="shrink-0 font-mono text-muted-foreground">
            {activeIndicatorCount}/{INDICATOR_KEYS.length}
          </span>
          {activeIndicatorCount > 0 && (
            <button
              onClick={() => setAllIndicators(false)}
              className="shrink-0 rounded border border-border/70 bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              title={`현재 켜진 보조지표 ${activeIndicatorCount.toLocaleString()}개를 모두 끕니다 (Shift+A)`}
              aria-label={`현재 켜진 보조지표 ${activeIndicatorCount.toLocaleString()}개 모두 끄기`}
            >
              ON OFF
            </button>
          )}
          {activeIndicatorCount === 1 && (
            <button
              onClick={() => {
                const key = activeIndicatorLabels[0]?.key;
                if (key) isolateIndicator(key);
              }}
              className="shrink-0 rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary transition-colors hover:border-primary/55 hover:bg-primary/15"
              title={`${
                activeIndicatorLabels[0]?.label ?? "보조지표"
              } 단독 보기 상태입니다. 클릭하면 이전 지표 조합으로 돌아갑니다.`}
              aria-label={`${activeIndicatorLabels[0]?.label ?? "보조지표"} 단독 보기 해제, 이전 지표 조합으로 복귀`}
            >
              SOLO {activeIndicatorLabels[0]?.label ?? ""}
            </button>
          )}
          {hiddenIndicatorCount > 0 && activeIndicatorCount !== 1 && (
            <button
              onClick={() => setAllIndicators(true)}
              className="shrink-0 rounded border border-border/70 bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              title={`${hiddenIndicatorCount.toLocaleString()}개 보조지표가 숨겨져 있습니다. 클릭하거나 A로 모두 다시 표시합니다.`}
              aria-label={`숨긴 ${hiddenIndicatorCount.toLocaleString()}개 보조지표 모두 표시`}
            >
              숨김 {hiddenIndicatorCount}
            </button>
          )}
          {indicatorStackModeLabel && (
            <span
              className={cn(
                "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]",
                ultraCompactIndicatorStack
                  ? "border-amber-500/35 bg-amber-500/10 text-amber-500"
                  : "border-border/70 bg-muted/20 text-muted-foreground",
              )}
              title={
                ultraCompactIndicatorStack
                  ? "보조지표 패널이 많아 가격/패널 높이를 더 강하게 압축했습니다. 확장 보기(F)에서는 넓게 볼 수 있습니다."
                  : "보조지표 패널이 많아 가격/패널 높이를 자동으로 압축했습니다."
              }
            >
              {indicatorStackModeLabel}
            </span>
          )}
          {activeIndicatorLabels.length === 0 ? (
            <span className="shrink-0 text-muted-foreground">
              보조지표 없음
            </span>
          ) : (
            activeIndicatorLabels.map((item) => {
              const orderGroup = PANE_INDICATORS.includes(item.key)
                ? orderedPaneIndicators
                : orderedOverlayIndicators;
              const orderIndex = orderGroup.indexOf(item.key);
              const canMoveUp = orderIndex > 0;
              const canMoveDown =
                orderIndex >= 0 && orderIndex < orderGroup.length - 1;
              const dragging = draggedIndicator === item.key;
              const canDropHere = indicatorDragAllowed(
                draggedIndicator,
                item.key,
              );
              const dropTarget = dragOverIndicator === item.key && canDropHere;
              return (
                <span
                  key={item.key}
                  onDragOver={(event) =>
                    handleIndicatorDragOver(item.key, event)
                  }
                  onDragLeave={() => {
                    if (dragOverIndicator === item.key)
                      setDragOverIndicator(null);
                  }}
                  onDrop={(event) => handleIndicatorDrop(item.key, event)}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded border bg-primary/10 text-primary transition-all",
                    dropTarget
                      ? "border-primary shadow-[inset_3px_0_0_var(--primary)]"
                      : "border-primary/30",
                    dragging && "opacity-45",
                  )}
                >
                  <span
                    draggable
                    onDragStart={(event) =>
                      handleIndicatorDragStart(item.key, event)
                    }
                    onDragEnd={clearIndicatorDrag}
                    className="inline-flex h-5 w-5 cursor-grab items-center justify-center border-r border-primary/20 text-primary/70 active:cursor-grabbing"
                    title={`${INDICATOR_LABEL[item.key]} 순서 드래그. 같은 그룹 안에서만 이동됩니다.`}
                    aria-label={`${INDICATOR_LABEL[item.key]} 보조지표 순서 드래그 핸들`}
                  >
                    <GripVertical size={12} />
                  </span>
                  <button
                    onClick={(event) => handleIndicatorClick(item.key, event)}
                    className="px-1.5 py-0.5 font-mono text-[10px] transition-colors hover:bg-primary/10"
                    title={`${item.title} · 클릭하면 숨김 · Shift/Alt 클릭 단독 보기 · 왼쪽 핸들 드래그로 순서 이동`}
                    aria-label={`${item.label} 보조지표 숨김. Shift 또는 Alt를 누른 채 클릭하면 단독 보기`}
                    aria-pressed={true}
                  >
                    {item.label}
                  </button>
                  <button
                    onClick={() => {
                      setToolsOpen(true);
                      setShowAllIndicatorParams(true);
                      setIndicatorCategory("all");
                      setIndicatorSearch(INDICATOR_LABEL[item.key]);
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center border-l border-primary/20 transition-colors hover:bg-primary/10"
                    title={`${INDICATOR_LABEL[item.key]} 파라미터 설정 열기`}
                    aria-label={`${INDICATOR_LABEL[item.key]} 파라미터 설정 열기`}
                  >
                    <SlidersHorizontal size={11} />
                  </button>
                  <button
                    onClick={() => resetIndicatorParam(item.key)}
                    className="inline-flex h-5 w-5 items-center justify-center border-l border-primary/20 transition-colors hover:bg-primary/10"
                    title={`${INDICATOR_LABEL[item.key]} 파라미터 기본값 복귀`}
                    aria-label={`${INDICATOR_LABEL[item.key]} 파라미터 기본값 복귀`}
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    onClick={() => toggle(item.key)}
                    className="inline-flex h-5 w-5 items-center justify-center border-l border-primary/20 transition-colors hover:bg-primary/10"
                    title={`${INDICATOR_LABEL[item.key]} 보조지표 끄기`}
                    aria-label={`${INDICATOR_LABEL[item.key]} 보조지표 끄기`}
                  >
                    <EyeOff size={11} />
                  </button>
                  <button
                    onClick={() => moveIndicatorInOrder(item.key, -1)}
                    disabled={!canMoveUp}
                    className={cn(
                      "h-5 w-5 border-l border-primary/20 text-[10px] transition-colors",
                      canMoveUp
                        ? "hover:bg-primary/10"
                        : "cursor-not-allowed text-primary/35",
                    )}
                    title={`${INDICATOR_LABEL[item.key]} 순서를 위로 이동`}
                    aria-label={`${INDICATOR_LABEL[item.key]} 순서를 위로 이동`}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveIndicatorInOrder(item.key, 1)}
                    disabled={!canMoveDown}
                    className={cn(
                      "h-5 w-5 border-l border-primary/20 text-[10px] transition-colors",
                      canMoveDown
                        ? "hover:bg-primary/10"
                        : "cursor-not-allowed text-primary/35",
                    )}
                    title={`${INDICATOR_LABEL[item.key]} 순서를 아래로 이동`}
                    aria-label={`${INDICATOR_LABEL[item.key]} 순서를 아래로 이동`}
                  >
                    ↓
                  </button>
                </span>
              );
            })
          )}
          <span className="shrink-0 font-mono text-muted-foreground">
            가격 {Math.round(pricePaneScale * 100)}% · 패널 {activePaneCount} ·{" "}
            {Math.round(indicatorPaneScale * 100)}%
          </span>
          <span className="shrink-0 text-border">|</span>
          <button
            onClick={() => setAllIndicators(true)}
            disabled={hiddenIndicatorCount === 0}
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
              hiddenIndicatorCount === 0
                ? "border-border bg-muted/10 text-muted-foreground/45 cursor-not-allowed"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
            title={
              hiddenIndicatorCount === 0
                ? "모든 보조지표가 표시 중입니다"
                : `숨긴 ${hiddenIndicatorCount.toLocaleString()}개 보조지표를 모두 다시 표시 (A)`
            }
            aria-label={
              hiddenIndicatorCount === 0
                ? "모든 보조지표가 표시 중입니다"
                : `숨긴 ${hiddenIndicatorCount.toLocaleString()}개 보조지표 모두 표시`
            }
          >
            전체
          </button>
          <div
            className="flex shrink-0 items-center rounded-md border border-border bg-muted/20 p-0.5"
            role="group"
            aria-label="보조지표 카테고리"
          >
            {INDICATOR_CATEGORY_ORDER.map((category) => (
              <button
                key={category}
                onClick={() => setIndicatorCategory(category)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] transition-colors",
                  indicatorCategory === category
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={
                  category === "active"
                    ? "현재 켜진 보조지표만 표시"
                    : `${INDICATOR_CATEGORIES[category].label} 지표만 표시`
                }
                aria-pressed={indicatorCategory === category}
              >
                {INDICATOR_CATEGORIES[category].label}
              </button>
            ))}
          </div>
          <label className="relative shrink-0">
            <Search
              size={11}
              className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={indicatorSearch}
              onChange={(event) =>
                setIndicatorSearch(event.currentTarget.value)
              }
              className="h-6 w-28 rounded border border-border bg-card pl-6 pr-2 text-[10px] text-foreground outline-none focus:border-primary/50"
              placeholder="지표 검색"
              aria-label="보조지표 검색"
              title="이름, 단축키, 설명으로 보조지표 필터"
            />
          </label>
          <div
            className="flex shrink-0 items-center rounded-md border border-border bg-muted/20 p-0.5"
            role="group"
            aria-label="현재 필터 보조지표 일괄 토글"
          >
            <button
              onClick={() => setFilteredIndicators(true)}
              disabled={
                filteredIndicatorKeys.length === 0 ||
                filteredActiveIndicatorCount === filteredIndicatorKeys.length
              }
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] transition-colors",
                filteredIndicatorKeys.length === 0 ||
                  filteredActiveIndicatorCount === filteredIndicatorKeys.length
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
              title={`현재 검색/카테고리 필터의 보조지표 ${filteredIndicatorKeys.length.toLocaleString()}개를 한 번에 켭니다`}
            >
              필터 ON
            </button>
            <button
              onClick={() => setFilteredIndicators(false)}
              disabled={
                filteredIndicatorKeys.length === 0 ||
                filteredActiveIndicatorCount === 0
              }
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] transition-colors",
                filteredIndicatorKeys.length === 0 ||
                  filteredActiveIndicatorCount === 0
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
              title={`현재 검색/카테고리 필터에서 켜진 보조지표 ${filteredActiveIndicatorCount.toLocaleString()}개를 한 번에 끕니다`}
            >
              OFF {filteredActiveIndicatorCount}
            </button>
          </div>
          {filteredIndicatorKeys.length === 0 ? (
            <span className="shrink-0 rounded border border-border bg-muted/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              검색 결과 없음
            </span>
          ) : (
            filteredIndicatorKeys.map((key) => (
              <button
                key={key}
                onClick={(event) => handleIndicatorClick(key, event)}
                className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                  indicators[key]
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
                title={`${INDICATOR_LABEL[key]} · ${INDICATOR_DESCRIPTIONS[key]} · 토글 (${INDICATOR_SHORTCUTS[key]}) · Shift/Alt 클릭 단독 보기`}
                aria-label={`${INDICATOR_LABEL[key]} 보조지표 토글. ${INDICATOR_DESCRIPTIONS[key]}. Shift 또는 Alt를 누른 채 클릭하면 단독 보기`}
                aria-pressed={indicators[key]}
              >
                {INDICATOR_SHORTCUTS[key]} {INDICATOR_LABEL[key]}
              </button>
            ))
          )}
        </div>

        {shortcutsOpen && (
          <div className="mx-3 mb-2 rounded-lg border border-border bg-muted/10 p-3 text-[11px]">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                [
                  "이동/확대",
                  "←/→ 이동 · Shift+←/→ 빠르게 · PageUp/PageDown 크게 이동 · Alt+←/→/Home/End CUR 이동(PIN 유지) · +/- 확대 · 0 기간 맞춤 · Shift+0 전체 맞춤 · Shift+R 초기화 · Home/End · 가로 휠/Shift+휠 이동 · Enter/Space PIN",
                ],
                [
                  "보기",
                  "D/W/R 봉 · [/ ] 기간 · C 보기방식 · E 밀도 · ,/. 지표패널 높이 · Shift+,/. 가격 높이 · L 로그 · F 확장 · G 그리드 · X 십자선 · M 현재가",
                ],
                [
                  "지표",
                  "1-9/B/N/J/Q 지표 토글 · Shift+단축키 단독 보기/이전 조합 복귀 · Shift/Alt+지표 클릭 단독 보기 · Alt+O ON 필터 · O 프리셋 · A 전체 토글 · Shift+A ON 전체 끄기 · Alt+P 지표값 패널 · P 지표값 프리셋/패널 열기 · U 슬롯 불러오기 · Shift+U 현재 슬롯 저장 · Alt+1~3 슬롯 선택 · Alt+Shift+1~3 바로 저장",
                ],
                [
                  "드로잉/비교/저장",
                  "Alt+D 표시 OHLCV 표 · Alt+B 비교 프리셋 순환 · Alt+Shift+B 비교 CLEAR · Alt+L 비교 라벨 · Alt+R 비교선 전체 복구 · Alt+Y 연속 드로잉 · T 추세선 · Y 연장선 · H 수평선 · V 수직선 · I 피보 · K 가격선 · Delete/Backspace 전체 삭제 · S 이미지 · Shift+S 새로고침 · Ctrl/Cmd+Z 되돌리기 · Esc PIN/CUR/표/취소",
                ],
              ].map(([title, body]) => (
                <div key={title} className="min-w-0">
                  <div className="mb-1 font-semibold text-foreground">
                    {title}
                  </div>
                  <div className="leading-relaxed text-muted-foreground">
                    {body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {toolsOpen && (
          <div className="border-t border-border/60 pt-2">
            <div className="px-3 pb-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap inline-flex items-center gap-1">
                  <Sparkles size={11} /> 프리셋
                </span>
                {(Object.keys(PRESETS) as PresetKey[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "text-[11px] px-2 py-1 rounded border transition-colors whitespace-nowrap",
                      activePreset === preset
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                    )}
                    title={`${PRESETS[preset].description} (O로 순환)`}
                  >
                    {PRESETS[preset].label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    soloReturnIndicatorsRef.current = null;
                    setIndicators(defaultIndicatorSet());
                  }}
                  className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap"
                  title="기본 지표 상태로 되돌림"
                >
                  지표 초기화
                </button>
                <button
                  onClick={() => setAllIndicators(true)}
                  className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap"
                  title="모든 보조지표를 한 번에 켬 (A)"
                >
                  전체 켜기
                </button>
                <button
                  onClick={() => setAllIndicators(false)}
                  className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap"
                  title="모든 보조지표를 한 번에 끔 (A)"
                >
                  전체 끄기
                </button>
                <button
                  onClick={saveCurrentIndicatorSet}
                  className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap"
                  title={`현재 지표 조합과 파라미터를 ${activeSavedIndicatorSlot}번 슬롯에 저장 (Shift+U)`}
                >
                  슬롯 저장
                </button>
                <div
                  className="flex items-center rounded border border-border bg-muted/10 p-0.5"
                  role="group"
                  aria-label="내 지표 세트 슬롯 선택"
                >
                  {SAVED_INDICATOR_SLOT_KEYS.map((slot) => {
                    const saved = Boolean(savedIndicatorSlots[slot]);
                    const active = activeSavedIndicatorSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setActiveSavedIndicatorSlot(slot)}
                        className={cn(
                          "h-6 min-w-6 rounded px-1.5 text-[10px] font-mono transition-colors",
                          active
                            ? "bg-card text-foreground shadow-sm"
                            : saved
                              ? "text-primary hover:text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                        )}
                        title={
                          saved
                            ? `${slot}번 저장 슬롯 선택`
                            : `${slot}번 빈 슬롯 선택`
                        }
                        aria-pressed={active}
                      >
                        {slot}
                        {saved ? "*" : ""}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={applySavedIndicatorSet}
                  disabled={!hasSavedIndicatorSet}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded border transition-colors whitespace-nowrap",
                    hasSavedIndicatorSet
                      ? "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      : "border-border text-muted-foreground/40 cursor-not-allowed",
                  )}
                  title={
                    hasSavedIndicatorSet
                      ? `${activeSavedIndicatorSlot}번 저장 슬롯을 불러옴 (U)`
                      : `${activeSavedIndicatorSlot}번에 저장된 지표 세트가 없습니다`
                  }
                >
                  슬롯 불러오기
                </button>
                <button
                  onClick={clearSavedIndicatorSet}
                  disabled={!hasSavedIndicatorSet}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded border transition-colors whitespace-nowrap",
                    hasSavedIndicatorSet
                      ? "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      : "border-border text-muted-foreground/40 cursor-not-allowed",
                  )}
                  title={
                    hasSavedIndicatorSet
                      ? `${activeSavedIndicatorSlot}번 저장 슬롯 삭제`
                      : `${activeSavedIndicatorSlot}번은 비어 있습니다`
                  }
                >
                  슬롯 삭제
                </button>
                <button
                  onClick={resetChartSettings}
                  className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap inline-flex items-center gap-1"
                  title="기간, 봉, 보기 방식, 지표값, 축, 밀도, 높이, 현재가 라인, 표/도구/비교 readout, 드로잉과 연속 모드를 기본 상태로 되돌림 (Shift+R)"
                >
                  <RotateCcw size={11} />
                  차트 초기화
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-[10px] text-muted-foreground">
                  지표 {activeIndicatorCount}/{INDICATOR_KEYS.length}
                  {indicatorStackModeLabel
                    ? ` · ${indicatorStackModeLabel}`
                    : ""}
                </span>
                {orderedOverlayIndicators.map((k) => (
                  <Chip
                    key={k}
                    on={indicators[k]}
                    label={INDICATOR_LABEL[k]}
                    onClick={(event) => handleIndicatorClick(k, event)}
                    title={`${INDICATOR_LABEL[k]} 토글 (${INDICATOR_SHORTCUTS[k]}) · Shift/Alt 클릭 단독 보기`}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1.5">
                  패널
                </span>
                {orderedPaneIndicators.map((k) => (
                  <Chip
                    key={k}
                    on={indicators[k]}
                    label={INDICATOR_LABEL[k]}
                    onClick={(event) => handleIndicatorClick(k, event)}
                    title={`${INDICATOR_LABEL[k]} 토글 (${INDICATOR_SHORTCUTS[k]}) · Shift/Alt 클릭 단독 보기`}
                  />
                ))}
                <div
                  className="flex items-center bg-muted/40 p-0.5 rounded-md"
                  role="group"
                  aria-label="가격 차트 높이 밀도 선택"
                >
                  {(["compact", "standard", "deep"] as ChartDensity[]).map(
                    (d) => (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={cn(
                          "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap",
                          density === d
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title={`차트 높이: ${DENSITY_LABELS[d]} (E로 순환)`}
                        aria-pressed={density === d}
                      >
                        {DENSITY_LABELS[d]}
                      </button>
                    ),
                  )}
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/10 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    가격
                  </span>
                  <button
                    onClick={() =>
                      changePricePaneScale(
                        pricePaneScale - PRICE_PANE_SCALE_STEP,
                      )
                    }
                    disabled={pricePaneScale <= MIN_PRICE_PANE_SCALE}
                    className={cn(
                      "h-5 w-5 inline-flex items-center justify-center rounded border transition-colors",
                      pricePaneScale <= MIN_PRICE_PANE_SCALE
                        ? "border-border text-muted-foreground/35 cursor-not-allowed"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                    title="가격 차트 높이 줄이기"
                  >
                    <ZoomOut size={11} />
                  </button>
                  <input
                    type="range"
                    min={MIN_PRICE_PANE_SCALE}
                    max={MAX_PRICE_PANE_SCALE}
                    step={PRICE_PANE_SCALE_STEP}
                    value={pricePaneScale}
                    onChange={(event) =>
                      changePricePaneScale(Number(event.currentTarget.value))
                    }
                    className="h-2 w-24 accent-primary"
                    aria-label="가격 차트 높이"
                    title="가격 캔들 영역 높이를 즉시 조절"
                  />
                  <button
                    onClick={() =>
                      changePricePaneScale(
                        pricePaneScale + PRICE_PANE_SCALE_STEP,
                      )
                    }
                    disabled={pricePaneScale >= MAX_PRICE_PANE_SCALE}
                    className={cn(
                      "h-5 w-5 inline-flex items-center justify-center rounded border transition-colors",
                      pricePaneScale >= MAX_PRICE_PANE_SCALE
                        ? "border-border text-muted-foreground/35 cursor-not-allowed"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                    title="가격 차트 높이 키우기"
                  >
                    <ZoomIn size={11} />
                  </button>
                  <button
                    onClick={() => changePricePaneScale(1)}
                    className="h-5 rounded border border-border px-1.5 text-[10px] font-mono text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    title="가격 차트 높이 기본값으로"
                  >
                    {Math.round(pricePaneScale * 100)}%
                  </button>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/10 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    패널
                  </span>
                  <button
                    onClick={() =>
                      changeIndicatorPaneScale(
                        indicatorPaneScale - INDICATOR_PANE_SCALE_STEP,
                      )
                    }
                    disabled={indicatorPaneScale <= MIN_INDICATOR_PANE_SCALE}
                    className={cn(
                      "h-5 w-5 inline-flex items-center justify-center rounded border transition-colors",
                      indicatorPaneScale <= MIN_INDICATOR_PANE_SCALE
                        ? "border-border text-muted-foreground/35 cursor-not-allowed"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                    title="보조지표 패널 높이 줄이기 (,)"
                  >
                    <ZoomOut size={11} />
                  </button>
                  <input
                    type="range"
                    min={MIN_INDICATOR_PANE_SCALE}
                    max={MAX_INDICATOR_PANE_SCALE}
                    step={INDICATOR_PANE_SCALE_STEP}
                    value={indicatorPaneScale}
                    onChange={(event) =>
                      changeIndicatorPaneScale(
                        Number(event.currentTarget.value),
                      )
                    }
                    className="h-2 w-24 accent-primary"
                    aria-label="보조지표 패널 높이"
                    title="거래량, MACD, RSI, KDJ 패널 높이를 즉시 조절"
                  />
                  <button
                    onClick={() =>
                      changeIndicatorPaneScale(
                        indicatorPaneScale + INDICATOR_PANE_SCALE_STEP,
                      )
                    }
                    disabled={indicatorPaneScale >= MAX_INDICATOR_PANE_SCALE}
                    className={cn(
                      "h-5 w-5 inline-flex items-center justify-center rounded border transition-colors",
                      indicatorPaneScale >= MAX_INDICATOR_PANE_SCALE
                        ? "border-border text-muted-foreground/35 cursor-not-allowed"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                    title="보조지표 패널 높이 키우기 (.)"
                  >
                    <ZoomIn size={11} />
                  </button>
                  <button
                    onClick={() => changeIndicatorPaneScale(1)}
                    className="h-5 rounded border border-border px-1.5 text-[10px] font-mono text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    title="보조지표 패널 높이 기본값으로"
                  >
                    {Math.round(indicatorPaneScale * 100)}%
                  </button>
                </div>
              </div>
            </div>

            {indicatorSetStatus && (
              <div className="px-3 pb-2">
                <span className="inline-flex rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  {indicatorSetStatus}
                </span>
              </div>
            )}

            <div className="px-3 pb-2 flex items-start gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex shrink-0 flex-col gap-1 rounded-md border border-border/70 bg-muted/10 px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  지표값 {showAllIndicatorParams ? "전체" : "ON"}
                </span>
                <div
                  className="flex items-center bg-muted/40 p-0.5 rounded-md"
                  role="group"
                  aria-label="보조지표 파라미터 프리셋 선택"
                >
                  {(
                    Object.keys(
                      INDICATOR_PARAM_PRESETS,
                    ) as IndicatorParamPresetKey[]
                  ).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => applyIndicatorParamPreset(preset)}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded transition-colors font-medium whitespace-nowrap",
                        activeParamPreset === preset
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      title={`${INDICATOR_PARAM_PRESETS[preset].description} (P로 순환)`}
                    >
                      {INDICATOR_PARAM_PRESETS[preset].label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAllIndicatorParams((v) => !v)}
                  className={cn(
                    "h-6 rounded border px-1.5 text-[10px] transition-colors whitespace-nowrap",
                    showAllIndicatorParams
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                  title={
                    showAllIndicatorParams
                      ? "켜진 지표값만 우선 표시"
                      : "꺼진 지표까지 모든 파라미터 표시"
                  }
                >
                  {showAllIndicatorParams ? "전체값" : "ON값"}
                </button>
              </div>
              {displayedIndicatorParamKeys.length === 0 && (
                <div className="flex h-8 shrink-0 items-center rounded-md border border-border bg-muted/10 px-2 text-[10px] text-muted-foreground">
                  검색 조건에 맞는 지표값이 없습니다
                </div>
              )}
              {displayedIndicatorParamKeys.map((key) => (
                <div
                  key={key}
                  className={cn(
                    "flex w-[320px] shrink-0 flex-col gap-2 rounded-md border px-2 py-2",
                    indicators[key]
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/10 opacity-70",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(event) => handleIndicatorClick(key, event)}
                      className={cn(
                        "h-6 min-w-12 rounded border px-1.5 text-[10px] font-medium transition-colors",
                        indicators[key]
                          ? "border-primary/35 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                      )}
                      title={`${INDICATOR_LABEL[key]} 표시/숨김 (${INDICATOR_SHORTCUTS[key]}) · Shift/Alt 클릭 단독 보기`}
                      aria-pressed={indicators[key]}
                    >
                      {INDICATOR_LABEL[key]}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                      {INDICATOR_DESCRIPTIONS[key]}
                    </span>
                    <button
                      onClick={() => isolateIndicator(key)}
                      className="h-6 rounded border border-border px-1.5 text-[10px] font-mono text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                      title={`${INDICATOR_LABEL[key]}만 단독 보기`}
                      aria-label={`${INDICATOR_LABEL[key]} 보조지표 단독 보기`}
                    >
                      SOLO
                    </button>
                    <button
                      onClick={() => resetIndicatorParam(key)}
                      className="h-6 rounded border border-border px-1.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                      title={`${INDICATOR_LABEL[key]} 파라미터만 기본값으로`}
                    >
                      RESET
                    </button>
                  </div>
                  {DEFAULT_INDICATOR_PARAMS[key].map((_, index) => (
                    <label
                      key={`${key}-${index}`}
                      className="grid grid-cols-[52px_20px_48px_20px_1fr] items-center gap-1 text-[10px] text-muted-foreground"
                    >
                      <span className="truncate">
                        {INDICATOR_PARAM_LABELS[key][index]}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustIndicatorParam(key, index, -1)}
                        className="h-6 w-5 rounded border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                        title={`${INDICATOR_LABEL[key]} ${INDICATOR_PARAM_LABELS[key][index]} 줄이기`}
                        aria-label={`${INDICATOR_LABEL[key]} ${INDICATOR_PARAM_LABELS[key][index]} 줄이기`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={indicatorParamMin(key, index)}
                        max={indicatorParamMax(key, index)}
                        step={indicatorParamStep(key, index)}
                        value={indicatorParams[key][index]}
                        onChange={(event) =>
                          updateIndicatorParam(key, index, event.target.value)
                        }
                        className="h-6 w-12 rounded border border-border bg-card px-1 text-[11px] text-foreground outline-none focus:border-primary/50"
                        title={`${INDICATOR_LABEL[key]} ${INDICATOR_PARAM_LABELS[key][index]} 설정`}
                      />
                      <button
                        type="button"
                        onClick={() => adjustIndicatorParam(key, index, 1)}
                        className="h-6 w-5 rounded border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                        title={`${INDICATOR_LABEL[key]} ${INDICATOR_PARAM_LABELS[key][index]} 키우기`}
                        aria-label={`${INDICATOR_LABEL[key]} ${INDICATOR_PARAM_LABELS[key][index]} 키우기`}
                      >
                        +
                      </button>
                      <input
                        type="range"
                        min={indicatorParamMin(key, index)}
                        max={indicatorParamMax(key, index)}
                        step={indicatorParamStep(key, index)}
                        value={indicatorParams[key][index]}
                        onChange={(event) =>
                          updateIndicatorParam(key, index, event.target.value)
                        }
                        className="h-2 min-w-20 accent-primary"
                        title={`${INDICATOR_LABEL[key]} ${INDICATOR_PARAM_LABELS[key][index]} 슬라이더`}
                        aria-label={`${INDICATOR_LABEL[key]} ${INDICATOR_PARAM_LABELS[key][index]} 슬라이더`}
                      />
                    </label>
                  ))}
                </div>
              ))}
              <button
                onClick={() => {
                  setIndicatorParams(defaultIndicatorParams());
                  setIndicatorSetStatus("모든 지표 파라미터 기본값 복귀");
                }}
                className="h-8 shrink-0 rounded border border-border px-2 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                title="지표 파라미터를 기본값으로 되돌림"
              >
                값 초기화
              </button>
            </div>

            <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                드로잉
              </span>
              <span
                className={cn(
                  "h-7 shrink-0 inline-flex items-center rounded border px-2 font-mono text-[11px]",
                  activeDrawing
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : drawingCount > 0
                      ? "border-border bg-card/50 text-muted-foreground"
                      : "border-border bg-muted/10 text-muted-foreground/50",
                )}
                title={
                  activeDrawingTool
                    ? `${activeDrawingTool.label} 드로잉 중 · Esc 또는 취소 버튼으로 중단`
                    : `현재 저장된 드로잉 ${drawingCount.toLocaleString()}개`
                }
              >
                {activeDrawingTool
                  ? `DRAW ${activeDrawingTool.label}`
                  : `DRAW ${drawingCount.toLocaleString()}`}
              </span>
              {DRAWING_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.key}
                    onClick={() => startDrawing(tool.key)}
                    className={cn(
                      "h-7 shrink-0 inline-flex items-center gap-1 rounded border px-2 text-[11px] transition-colors",
                      activeDrawing === tool.key
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                    title={`${tool.title} (${tool.shortcut})`}
                  >
                    <Icon size={12} />
                    {tool.label}
                  </button>
                );
              })}
              <button
                onClick={() => setDrawingRepeat((value) => !value)}
                className={cn(
                  "h-7 shrink-0 inline-flex items-center gap-1 rounded border px-2 text-[11px] transition-colors",
                  drawingRepeat
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
                title="드로잉 완료 후 같은 도구를 다시 활성화해서 여러 선을 연속으로 그림 (Alt+Y)"
                aria-pressed={drawingRepeat}
              >
                연속 {drawingRepeat ? "ON" : "OFF"}
              </button>
              {activeDrawing && (
                <button
                  onClick={cancelActiveDrawing}
                  className="h-7 shrink-0 inline-flex items-center gap-1 rounded border border-primary/35 bg-primary/10 px-2 text-[11px] text-primary transition-colors hover:border-primary/60"
                  title="현재 진행 중인 드로잉 취소 (Esc)"
                >
                  취소
                </button>
              )}
              <button
                onClick={undoLastDrawing}
                disabled={drawingCount === 0 && !activeDrawing}
                className={cn(
                  "h-7 shrink-0 inline-flex items-center gap-1 rounded border px-2 text-[11px] transition-colors",
                  drawingCount > 0 || activeDrawing
                    ? "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    : "border-border text-muted-foreground/40 cursor-not-allowed",
                )}
                title="마지막 드로잉 하나 되돌리기 (Ctrl/Cmd+Z)"
              >
                <Undo2 size={12} />
                되돌리기
              </button>
              <button
                onClick={clearDrawings}
                disabled={drawingCount === 0 && !activeDrawing}
                className={cn(
                  "h-7 shrink-0 inline-flex items-center gap-1 rounded border px-2 text-[11px] transition-colors",
                  drawingCount > 0 || activeDrawing
                    ? "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    : "cursor-not-allowed border-border text-muted-foreground/40",
                )}
                title="차트에 그린 모든 선을 삭제 (Delete/Backspace)"
              >
                <Eraser size={12} />
                전체 삭제
              </button>
            </div>
          </div>
        )}
      </div>

      {dataTableOpen && (
        <div className="mx-3 mb-2 max-h-60 overflow-auto rounded-lg border border-border bg-card text-[11px] shadow-sm">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-2 py-1.5 backdrop-blur">
            <span className="font-mono text-muted-foreground">
              OHLCV {visibleRangeLabel} · {timeframe}
              {visibleTableSampledCount > 0
                ? ` · ${visibleTableSampledCount.toLocaleString()}행 샘플링 생략`
                : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={exportVisibleDataCsv}
                disabled={visibleCsvRows.length === 0}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] transition-colors",
                  visibleCsvRows.length === 0
                    ? "cursor-not-allowed border-border text-muted-foreground/40"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
                title="현재 표시 구간 전체를 CSV로 저장"
              >
                CSV
              </button>
              <button
                onClick={() => setDataTableOpen(false)}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                title="표 닫기 (Esc 또는 Alt+D)"
              >
                닫기
              </button>
            </div>
          </div>
          <table className="w-full min-w-[640px] border-collapse font-mono tabular-nums">
            <thead>
              <tr className="border-b border-border/70 bg-muted/20 text-muted-foreground">
                {[
                  "날짜",
                  "시가",
                  "고가",
                  "저가",
                  "종가",
                  "변화",
                  "간격",
                  "거래량",
                ].map((label, index) => (
                  <th
                    key={label}
                    className={cn(
                      "px-2 py-1 font-medium",
                      index === 0
                        ? "sticky left-0 z-10 bg-muted/20 text-left"
                        : "text-right",
                    )}
                  >
                    {label}
                  </th>
                ))}
                {indicatorTableColumns.map((column) => (
                  <th
                    key={column.key}
                    className="px-2 py-1 text-right font-medium"
                    title="켜진 보조지표 값"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTableRows.map((bar) => {
                const index =
                  klineIndexByTimestamp.get(Number(bar.timestamp)) ?? -1;
                const prev = index > 0 ? klineData[index - 1] : null;
                const delta = prev
                  ? bar.close - prev.close
                  : bar.close - bar.open;
                const pctBase = prev?.close ?? bar.open;
                const pct =
                  pctBase !== 0 ? (delta / Math.abs(pctBase)) * 100 : 0;
                const gapDays = prev
                  ? Math.max(
                      0,
                      Math.round(
                        (Number(bar.timestamp) - Number(prev.timestamp)) /
                          86_400_000,
                      ),
                    )
                  : null;
                const largeGap = gapDays != null && gapDays > 7;
                const up = delta >= 0;
                return (
                  <tr
                    key={bar.timestamp}
                    className="border-b border-border/40 odd:bg-muted/10 hover:bg-muted/20"
                  >
                    <td className="sticky left-0 bg-card px-2 py-1 text-left text-muted-foreground">
                      {formatUtcDate(bar.timestamp, "YYYY-MM-DD")}
                    </td>
                    <td className="px-2 py-1 text-right text-foreground">
                      {formatCompactNumber(bar.open, pricePrecision)}
                    </td>
                    <td className="px-2 py-1 text-right text-up">
                      {formatCompactNumber(bar.high, pricePrecision)}
                    </td>
                    <td className="px-2 py-1 text-right text-down">
                      {formatCompactNumber(bar.low, pricePrecision)}
                    </td>
                    <td className="px-2 py-1 text-right text-foreground">
                      {formatCompactNumber(bar.close, pricePrecision)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-1 text-right",
                        up ? "text-up" : "text-down",
                      )}
                    >
                      {up ? "+" : ""}
                      {formatCompactNumber(delta, pricePrecision)} (
                      {up ? "+" : ""}
                      {pct.toFixed(2)}%)
                    </td>
                    <td
                      className={cn(
                        "px-2 py-1 text-right",
                        largeGap ? "text-amber-500" : "text-muted-foreground",
                      )}
                      title={
                        gapDays == null
                          ? "첫 표시 행"
                          : `이전 봉 대비 ${gapDays.toLocaleString()}일 간격`
                      }
                    >
                      {gapDays == null ? "-" : `${gapDays}d`}
                    </td>
                    <td className="px-2 py-1 text-right text-muted-foreground">
                      {formatVolume(bar.volume)}
                    </td>
                    {indicatorTableColumns.map((column) => {
                      const value = Number(column.values[index]);
                      return (
                        <td
                          key={column.key}
                          className="px-2 py-1 text-right text-muted-foreground"
                        >
                          {Number.isFinite(value)
                            ? formatIndicatorReadoutValue({
                                key: column.key,
                                label: column.label,
                                value,
                                formatter: column.formatter,
                              })
                            : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart canvas. klinecharts owns this DOM node — never render React children inside. */}
      <div
        ref={chartWheelRef}
        className="relative cursor-grab touch-none active:cursor-grabbing"
        title="드래그로 이동, 세로 휠/핀치로 확대·축소, 가로 휠/Shift+휠로 좌우 이동, PageUp/PageDown 크게 이동, Alt+←/→/Home/End CUR 이동(PIN 유지), Enter/Space PIN, Esc 해제, 0 기간 맞춤, Shift+0 전체 맞춤, Shift+R 초기화, 더블클릭 기간 맞춤"
        aria-label="가격 차트 캔버스. 드래그로 이동, 세로 휠 또는 핀치로 확대·축소, 가로 휠 또는 Shift+휠로 좌우 이동, PageUp/PageDown으로 크게 이동, Alt+왼쪽/오른쪽/Home/End로 PIN을 유지한 채 CUR readout 이동, Enter 또는 Space로 PIN 고정, Esc로 PIN 또는 CUR 해제, 0으로 현재 기간에 맞춤, Shift+0으로 전체 DB 히스토리에 맞춤, Shift+R로 차트 초기화, 더블클릭으로 현재 기간에 맞춤"
        onPointerDown={handleChartPointerDown}
        onPointerMove={handleChartPointerMove}
        onPointerCancel={() => {
          chartPointerRef.current = null;
        }}
        onClick={handleChartClick}
        onDoubleClick={() => {
          setActiveBar(null);
          setKeyboardBarIndex(null);
          setPinnedBar(null);
          syncChartLayout("fit-window");
          syncVisibleRangeAfterMotion();
        }}
      >
        <div ref={containerRef} style={{ height: totalHeight }} />
        {visibleRangeExtremeMarkers && (
          <svg
            className="pointer-events-none absolute inset-0 z-[9] h-full w-full overflow-hidden"
            aria-hidden="true"
          >
            {[
              {
                key: "high",
                marker: visibleRangeExtremeMarkers.high,
                tone: "var(--up)",
              },
              {
                key: "low",
                marker: visibleRangeExtremeMarkers.low,
                tone: "var(--down)",
              },
            ]
              .filter((item) => item.marker != null)
              .map(({ key, marker, tone }) => (
                <g key={key}>
                  <line
                    x1={marker!.x}
                    y1={marker!.y}
                    x2={marker!.labelX}
                    y2={marker!.labelY}
                    stroke={tone}
                    strokeOpacity={0.65}
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  <circle
                    cx={marker!.x}
                    cy={marker!.y}
                    r={2.5}
                    fill="var(--card)"
                    stroke={tone}
                    strokeWidth={1.4}
                  />
                  <g
                    transform={`translate(${marker!.labelX}, ${marker!.labelY})`}
                  >
                    <rect
                      x={-42}
                      y={-7}
                      width={84}
                      height={14}
                      rx={3}
                      fill="var(--card)"
                      fillOpacity={0.94}
                      stroke={tone}
                      strokeOpacity={0.55}
                    />
                    <text
                      x={0}
                      y={3.5}
                      textAnchor="middle"
                      fill={tone}
                      fontSize={9}
                      fontFamily="monospace"
                      fontWeight={700}
                    >
                      {marker!.label}
                    </text>
                  </g>
                </g>
              ))}
          </svg>
        )}
        {readoutPriceMarker && (
          <>
            <svg
              className="pointer-events-none absolute inset-0 z-[11] h-full w-full overflow-hidden"
              aria-hidden="true"
            >
              <line
                x1={Math.max(0, readoutPriceMarker.x)}
                x2={readoutPriceMarker.width}
                y1={readoutPriceMarker.y}
                y2={readoutPriceMarker.y}
                stroke={readoutPriceMarker.tone}
                strokeOpacity={0.36}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            </svg>
            <div
              className="pointer-events-none absolute right-2 z-[12] inline-flex items-center gap-1 rounded border bg-card/95 px-1.5 py-0.5 font-mono text-[10px] shadow-sm backdrop-blur"
              style={{
                top: readoutPriceMarker.y,
                transform: "translateY(-50%)",
                borderColor: readoutPriceMarker.tone,
                color: readoutPriceMarker.tone,
              }}
              aria-hidden="true"
            >
              <span className="text-[8px] opacity-75">
                {readoutPriceMarker.badge}
              </span>
              <span>{readoutPriceMarker.label}</span>
            </div>
          </>
        )}
        {pinnedComparisonLine && (
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-hidden"
            aria-hidden="true"
          >
            <line
              x1={pinnedComparisonLine.x1}
              y1={pinnedComparisonLine.y1}
              x2={pinnedComparisonLine.x2}
              y2={pinnedComparisonLine.y2}
              stroke={pinnedComparisonLine.up ? "var(--up)" : "var(--down)"}
              strokeOpacity={0.8}
              strokeDasharray="4 3"
              strokeWidth={1.4}
            />
            <circle
              cx={pinnedComparisonLine.x1}
              cy={pinnedComparisonLine.y1}
              r={3}
              fill="var(--card)"
              stroke="var(--primary)"
              strokeWidth={1.6}
            />
            <circle
              cx={pinnedComparisonLine.x2}
              cy={pinnedComparisonLine.y2}
              r={3}
              fill="var(--card)"
              stroke={pinnedComparisonLine.up ? "var(--up)" : "var(--down)"}
              strokeWidth={1.6}
            />
            <g
              transform={`translate(${(pinnedComparisonLine.x1 + pinnedComparisonLine.x2) / 2}, ${
                (pinnedComparisonLine.y1 + pinnedComparisonLine.y2) / 2
              })`}
            >
              <rect
                x={-25}
                y={-8}
                width={50}
                height={16}
                rx={3}
                fill="var(--card)"
                stroke={pinnedComparisonLine.up ? "var(--up)" : "var(--down)"}
                strokeOpacity={0.7}
              />
              <text
                x={0}
                y={3.5}
                textAnchor="middle"
                fill={pinnedComparisonLine.up ? "var(--up)" : "var(--down)"}
                fontSize={9}
                fontFamily="monospace"
                fontWeight={700}
              >
                {pinnedComparisonLine.label}
              </text>
            </g>
          </svg>
        )}
        {pinnedMarkerStyle && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary/70 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            style={pinnedMarkerStyle}
            aria-hidden="true"
          >
            <span className="absolute left-1 top-2 rounded border border-primary/30 bg-card/95 px-1.5 py-0.5 text-[10px] font-mono text-primary shadow-sm">
              PIN
            </span>
          </div>
        )}
        {keyboardMarkerStyle && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-muted-foreground/60"
            style={keyboardMarkerStyle}
            aria-hidden="true"
          >
            <span className="absolute left-1 top-7 rounded border border-border bg-card/95 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-sm">
              CUR
            </span>
          </div>
        )}
        {activeDrawingTool && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-md border border-primary/30 bg-card/95 px-3 py-2 text-[11px] shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <ActiveDrawingIcon size={12} />
                {activeDrawingTool.label}
              </span>
              <span className="text-muted-foreground">
                {activeDrawingTool.title}
              </span>
              <span className="font-mono text-muted-foreground">
                {drawingRepeat ? "연속 ON · " : ""}
                Esc 취소 · Ctrl/Cmd+Z 되돌리기
              </span>
              <button
                type="button"
                onClick={cancelActiveDrawing}
                className="pointer-events-auto rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary transition-colors hover:border-primary/60"
                title="현재 진행 중인 드로잉 취소 (Esc)"
              >
                취소
              </button>
            </div>
          </div>
        )}
        {klineData.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-xs pointer-events-none">
            <span
              className={cn(
                "font-medium",
                barsError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {emptyState.title}
            </span>
            {emptyState.detail && (
              <span className="text-[11px] text-muted-foreground">
                {emptyState.detail}
              </span>
            )}
            {!loading && (
              <button
                onClick={refetchBars}
                className="pointer-events-auto mt-2 inline-flex items-center gap-1 rounded border border-border bg-card/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <RefreshCw size={12} />
                가격 데이터 다시 불러오기
              </button>
            )}
          </div>
        )}
      </div>
      {compareOpen && (
        <div className="border-t border-border/60 bg-muted/10 px-3 py-2">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <form
              className="flex min-w-0 flex-1 items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                setCompareRetry((value) => value + 1);
              }}
            >
              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                비교
              </span>
              <input
                value={compareInput}
                onChange={(event) => setCompareInput(event.currentTarget.value)}
                onBlur={() =>
                  setCompareInput((value) => sanitizeCompareInput(value) ?? "")
                }
                className="h-7 min-w-0 flex-1 rounded border border-border bg-card px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
                placeholder="SPY QQQ 069500.KS"
                aria-label="비교할 종목 심볼"
                title="공백이나 쉼표로 최대 4개 비교 종목 입력"
              />
              <button
                type="submit"
                disabled={compareLoading}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] transition-colors",
                  compareLoading
                    ? "border-border text-muted-foreground/45 cursor-wait"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
                title="비교 데이터 다시 불러오기"
              >
                <RefreshCw
                  size={12}
                  className={cn(compareLoading && "animate-spin")}
                />
                적용
              </button>
            </form>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>DB 일봉 · 현재 기간 기준=0%</span>
              {compareSourceStatus && (
                <span
                  className="font-mono"
                  title={`API 요청 ${compareSourceStatus.requestedDays.toLocaleString()}일 · 소스 공통 구간 ${
                    compareSourceStatus.first ?? "-"
                  } ~ ${compareSourceStatus.last ?? "-"} · ${compareSourceStatus.loadedSeries}/${compareSourceStatus.totalSeries}개 시리즈 로드`}
                >
                  API {compareSourceStatus.requestedDays.toLocaleString()}d ·
                  공통 {compareSourceStatus.first ?? "-"}~
                  {compareSourceStatus.last ?? "-"} ·{" "}
                  {compareSourceStatus.rowCount.toLocaleString()}행
                </span>
              )}
              {compareSourceStatus?.baselineDate && (
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono",
                    compareSourceStatus.baselineScope === "visible"
                      ? "border-amber-500/35 bg-amber-500/10 text-amber-500"
                      : "border-primary/25 bg-primary/10 text-primary",
                  )}
                  title={
                    compareSourceStatus.baselineScope === "visible"
                      ? "로드된 전체 시리즈의 공통 기준일이 없어 현재 표시 중인 시리즈 기준으로만 0% 기준을 잡았습니다"
                      : "숨김/표시 조작으로 수익률 기준이 흔들리지 않도록 로드된 전체 비교 시리즈의 공통 기준일을 0% 기준으로 사용합니다"
                  }
                >
                  기준 {compareSourceStatus.baselineDate} ·{" "}
                  {compareSourceStatus.baselineScope === "visible"
                    ? "표시 기준"
                    : "전체 기준"}{" "}
                  · 표시 {compareSourceStatus.displayRowCount.toLocaleString()}
                  행
                </span>
              )}
              {compareSourceStatus && compareSourceStatus.missingSeries > 0 && (
                <span
                  className="rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 font-mono text-amber-500"
                  title={`${compareSourceStatus.missingSeries.toLocaleString()}개 비교 시리즈가 DB 일봉 데이터를 충분히 반환하지 못했습니다`}
                >
                  누락 {compareSourceStatus.missingSeries.toLocaleString()}
                </span>
              )}
              {compareDisplayGapStats && (
                <span
                  className="rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 font-mono text-amber-500"
                  title={`현재 표시 구간 안에 7일 초과 날짜 공백 ${compareDisplayGapStats.largeGapCount.toLocaleString()}개, 최대 ${compareDisplayGapStats.maxGapDays.toLocaleString()}일`}
                >
                  VIEW 공백{" "}
                  {compareDisplayGapStats.largeGapCount.toLocaleString()}개
                </span>
              )}
              {compareStripModel && (
                <span className="font-mono">
                  {period} {compareStripModel.from} ~ {compareStripModel.to} ·{" "}
                  {compareDisplayRows.length.toLocaleString()}행 · 범위{" "}
                  {compareStripModel.min >= 0 ? "+" : ""}
                  {compareStripModel.min.toFixed(1)}~
                  {compareStripModel.max >= 0 ? "+" : ""}
                  {compareStripModel.max.toFixed(1)}%
                </span>
              )}
              {compareStripModel && (
                <button
                  type="button"
                  onClick={() => setCompareEndLabelsVisible((value) => !value)}
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono transition-colors",
                    compareEndLabelsVisible
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                  title={
                    compareEndLabelsVisible
                      ? "비교 그래프 우측 끝 수익률 라벨 숨김"
                      : "비교 그래프 우측 끝 수익률 라벨 표시"
                  }
                  aria-pressed={compareEndLabelsVisible}
                >
                  LABEL {compareEndLabelsVisible ? "ON" : "OFF"} · Alt+L
                </button>
              )}
              {effectiveCompareInputSymbols.length > 0 && (
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono",
                    activeComparePreset
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground",
                  )}
                  title={
                    activeComparePreset
                      ? `${activeComparePreset.label} 비교 프리셋이 적용된 상태`
                      : "수동으로 구성한 비교 입력 상태"
                  }
                >
                  {activeComparePreset
                    ? `PRESET ${activeComparePreset.label}`
                    : "CUSTOM"}{" "}
                  · {effectiveCompareInputSymbols.length}/4
                </span>
              )}
              {compareInputHasCurrentSymbol && (
                <span
                  className="rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 font-mono text-amber-500"
                  title="현재 종목은 비교 기준선으로 이미 포함되어 있어 추가 입력에서는 제외됩니다"
                >
                  현재 종목 제외
                </span>
              )}
              {compareStripModel && (
                <>
                  <button
                    type="button"
                    onClick={() => setCompareDataTableOpen((value) => !value)}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded border px-1.5 font-mono transition-colors",
                      compareDataTableOpen
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                    title={
                      compareDataTableOpen
                        ? "비교 데이터 표 닫기 (D/T/Alt+D)"
                        : "비교 데이터 표 열기 (D/T/Alt+D)"
                    }
                    aria-pressed={compareDataTableOpen}
                  >
                    <Table2 size={11} />표
                  </button>
                  <button
                    type="button"
                    onClick={exportCompareDataCsv}
                    className="inline-flex h-6 items-center gap-1 rounded border border-border px-1.5 font-mono text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    title="비교 표시 구간 전체를 CSV로 저장"
                  >
                    CSV
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mb-2 flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
              빠른 비교
            </span>
            {QUICK_COMPARE_PRESETS.map((preset) => {
              const presetSymbols = preset.symbols
                .map((symbol) => symbol.toUpperCase())
                .filter((symbol) => symbol !== primaryCompareSymbol)
                .slice(0, 4);
              const active = activeComparePreset?.key === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyQuickComparePreset(preset.symbols)}
                  disabled={presetSymbols.length === 0}
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                    presetSymbols.length === 0
                      ? "cursor-not-allowed border-border bg-muted/10 text-muted-foreground/35"
                      : active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card/50 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                  title={`${preset.label} 비교 묶음 적용: ${presetSymbols.join(" ") || "현재 종목과 중복"}`}
                  aria-pressed={active}
                >
                  {preset.label}
                </button>
              );
            })}
            <span className="shrink-0 text-border">|</span>
            {QUICK_COMPARE_SYMBOLS.map((item) => {
              const active = effectiveCompareInputSymbols.includes(item.symbol);
              const isCurrent = primaryCompareSymbol === item.symbol;
              const blockedByLimit =
                !active && !isCurrent && compareInputLimitReached;
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => toggleQuickCompareSymbol(item.symbol)}
                  disabled={isCurrent || blockedByLimit}
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                    isCurrent || blockedByLimit
                      ? "cursor-not-allowed border-border bg-muted/10 text-muted-foreground/35"
                      : active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card/50 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                  title={
                    isCurrent
                      ? `${item.symbol}은 현재 기준 종목입니다`
                      : blockedByLimit
                        ? "비교 입력은 최대 4개까지 가능합니다. 기존 비교선을 제거한 뒤 추가하세요"
                        : active
                          ? `${item.label} (${item.symbol}) 비교 입력에서 제거`
                          : `${item.label} (${item.symbol})을 DB/API 비교 입력에 추가`
                  }
                  aria-pressed={active}
                >
                  {item.symbol}
                </button>
              );
            })}
            <button
              type="button"
              onClick={clearCompareInputSymbols}
              disabled={compareInputSymbols.length === 0}
              className={cn(
                "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                compareInputSymbols.length === 0
                  ? "cursor-not-allowed border-border bg-muted/10 text-muted-foreground/35"
                  : "border-border bg-card/50 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
              title="입력한 비교 종목과 숨김 상태를 모두 초기화"
            >
              CLEAR
            </button>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {effectiveCompareInputSymbols.length}/4 · 현재 종목 제외
            </span>
          </div>
          {compareCoverage.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              {compareHiddenSymbols.size > 0 && (
                <button
                  type="button"
                  onClick={showAllCompareSeries}
                  className="inline-flex h-6 items-center gap-1 rounded border border-primary/35 bg-primary/10 px-1.5 font-mono text-primary transition-colors hover:border-primary/60"
                  title="숨긴 비교 시리즈를 모두 다시 표시 (Alt+R)"
                >
                  <Eye size={11} />
                  ALL
                </button>
              )}
              {compareCoverage.map((series) => (
                <div
                  key={series.symbol}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono",
                    series.hidden
                      ? "border-border bg-card text-muted-foreground/45"
                      : series.loaded
                        ? "border-border bg-card text-muted-foreground"
                        : "border-amber-500/35 bg-amber-500/10 text-amber-500",
                  )}
                  title={`${series.symbol} 원본 DB ${
                    series.from_date ?? "?"
                  } ~ ${series.to_date ?? "?"} · ${series.returned_count.toLocaleString()}행${
                    series.sourceDays != null
                      ? ` · ${series.sourceDays.toLocaleString()}일`
                      : ""
                  } / 표시 ${series.displayFrom ?? "?"} ~ ${series.displayTo ?? "?"} · ${series.displayCount.toLocaleString()}행${
                    series.displayDays != null
                      ? ` · ${series.displayDays.toLocaleString()}일`
                      : ""
                  }${series.hidden ? " · 현재 숨김" : ""}`}
                >
                  <span
                    className={cn(
                      "h-1.5 w-3 rounded-full",
                      series.hidden && "opacity-35",
                    )}
                    style={{ background: series.color }}
                  />
                  <span>{series.symbol}</span>
                  <span>
                    DB {series.returned_count.toLocaleString()}행
                    {series.sourceDays != null
                      ? `/${series.sourceDays.toLocaleString()}d`
                      : ""}
                  </span>
                  <span>
                    {series.hidden
                      ? "VIEW OFF"
                      : `VIEW ${series.displayCount.toLocaleString()}행${
                          series.displayDays != null
                            ? `/${series.displayDays.toLocaleString()}d`
                            : ""
                        }`}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCompareSeries(series.symbol)}
                    disabled={series.returned_count <= 0}
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      series.hidden
                        ? "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        : "border-primary/30 text-primary hover:border-primary/60",
                      series.returned_count <= 0 &&
                        "cursor-not-allowed border-border text-muted-foreground/35",
                    )}
                    title={
                      series.hidden
                        ? `${series.symbol} 비교선 표시`
                        : `${series.symbol} 비교선 숨김`
                    }
                    aria-label={
                      series.hidden
                        ? `${series.symbol} 비교선 표시`
                        : `${series.symbol} 비교선 숨김`
                    }
                  >
                    {series.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => soloCompareSeries(series.symbol)}
                    disabled={series.returned_count <= 0}
                    className={cn(
                      "h-4 rounded border border-border px-1 text-[9px] transition-colors hover:border-foreground/40 hover:text-foreground",
                      series.returned_count <= 0 &&
                        "cursor-not-allowed text-muted-foreground/35",
                    )}
                    title={`기준 종목과 ${series.symbol}만 남기고 비교선 숨김`}
                  >
                    SOLO
                  </button>
                </div>
              ))}
            </div>
          )}
          {compareLoading && compareRows.length === 0 ? (
            <div className="h-24 rounded-md bg-muted/20 animate-pulse" />
          ) : compareError ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
              {compareError}
            </div>
          ) : compareStripModel ? (
            <div className="space-y-2">
              <svg
                viewBox={`0 0 ${compareStripModel.width} ${compareStripModel.height}`}
                className="h-24 w-full touch-none overflow-visible rounded-md border border-border/60 bg-card outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                role="img"
                aria-label="현재 종목과 비교 종목 누적 수익률. 왼쪽/오른쪽 화살표로 CUR을 이동하고 Shift+화살표 또는 PageUp/PageDown으로 크게 이동합니다. Home/End로 처음과 끝으로 이동합니다. Enter 또는 Space로 PIN을 고정하고 D, T 또는 Alt+D로 비교 데이터 표를 열며 Escape로 PIN/CUR 또는 표를 해제합니다."
                tabIndex={0}
                aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight PageUp PageDown Home End Enter Space D T Alt+D Escape"
                onPointerMove={updateCompareHover}
                onPointerLeave={() => setCompareHoverIndex(null)}
                onClick={toggleComparePin}
                onKeyDown={handleCompareKeyDown}
              >
                <line
                  x1={0}
                  x2={compareStripModel.width}
                  y1={compareStripModel.zeroY}
                  y2={compareStripModel.zeroY}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.35}
                  strokeDasharray="4 4"
                />
                <text
                  x={8}
                  y={13}
                  fill="var(--muted-foreground)"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {compareStripModel.max >= 0 ? "+" : ""}
                  {compareStripModel.max.toFixed(1)}%
                </text>
                <text
                  x={8}
                  y={compareStripModel.height - 6}
                  fill="var(--muted-foreground)"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {compareStripModel.min >= 0 ? "+" : ""}
                  {compareStripModel.min.toFixed(1)}%
                </text>
                <text
                  x={compareStripModel.width - 8}
                  y={Math.max(
                    12,
                    Math.min(
                      compareStripModel.height - 6,
                      compareStripModel.zeroY - 4,
                    ),
                  )}
                  textAnchor="end"
                  fill="var(--muted-foreground)"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  0%
                </text>
                {compareStripModel.series.map((series) => (
                  <path
                    key={series.symbol}
                    d={series.path}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={
                      series.symbol === compareStripModel.series[0]?.symbol
                        ? 2.2
                        : 1.7
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {compareEndLabelsVisible &&
                  compareStripModel.endLabels.map((label) => {
                    const text = `${label.symbol} ${label.value >= 0 ? "+" : ""}${label.value.toFixed(1)}%`;
                    return (
                      <g key={`compare-end-${label.symbol}`}>
                        <rect
                          x={compareStripModel.width - 84}
                          y={label.y - 8}
                          width={80}
                          height={13}
                          rx={3}
                          fill="var(--card)"
                          stroke={label.color}
                          strokeOpacity={0.55}
                        />
                        <text
                          x={compareStripModel.width - 7}
                          y={label.y + 1.5}
                          textAnchor="end"
                          fill={label.color}
                          fontSize={9}
                          fontFamily="monospace"
                          fontWeight={700}
                        >
                          {text}
                        </text>
                      </g>
                    );
                  })}
                {comparePinnedMarker && (
                  <g>
                    <title>{`PIN ${comparePinnedMarker.date}`}</title>
                    <line
                      x1={comparePinnedMarker.x}
                      x2={comparePinnedMarker.x}
                      y1={0}
                      y2={compareStripModel.height}
                      stroke="var(--primary)"
                      strokeOpacity={0.75}
                      strokeWidth={1.2}
                    />
                    {comparePinnedMarker.items.map((item) => (
                      <circle
                        key={`pin-${item.symbol}`}
                        cx={comparePinnedMarker.x}
                        cy={item.y}
                        r={3.2}
                        fill="var(--card)"
                        stroke={item.color}
                        strokeWidth={1.6}
                      />
                    ))}
                    <rect
                      x={Math.min(
                        compareStripModel.width - 32,
                        Math.max(2, comparePinnedMarker.x + 5),
                      )}
                      y={3}
                      width={28}
                      height={14}
                      rx={3}
                      fill="var(--card)"
                      stroke="var(--primary)"
                      strokeOpacity={0.55}
                    />
                    <text
                      x={Math.min(
                        compareStripModel.width - 18,
                        Math.max(16, comparePinnedMarker.x + 19),
                      )}
                      y={13}
                      textAnchor="middle"
                      fill="var(--primary)"
                      fontSize={9}
                      fontFamily="monospace"
                      fontWeight={700}
                    >
                      PIN
                    </text>
                  </g>
                )}
                {compareReadout && (
                  <g>
                    <line
                      x1={compareReadout.x}
                      x2={compareReadout.x}
                      y1={0}
                      y2={compareStripModel.height}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={compareReadout.pinned ? 0.75 : 0.5}
                      strokeDasharray={compareReadout.pinned ? "none" : "3 3"}
                    />
                    {compareReadout.items.map((item) => (
                      <circle
                        key={item.symbol}
                        cx={compareReadout.x}
                        cy={item.y}
                        r={3}
                        fill="var(--card)"
                        stroke={item.color}
                        strokeWidth={1.5}
                      />
                    ))}
                    {compareReadout.pinned && (
                      <text
                        x={Math.min(
                          compareStripModel.width - 18,
                          compareReadout.x + 5,
                        )}
                        y={12}
                        fill="var(--primary)"
                        fontSize={10}
                        fontFamily="monospace"
                        fontWeight={700}
                      >
                        PIN
                      </text>
                    )}
                  </g>
                )}
              </svg>
              {compareReadout && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/60 bg-card px-2 py-1 text-[10px]">
                  <span className="font-mono font-semibold text-foreground">
                    {compareReadout.pinned ? "PIN" : "CUR"}{" "}
                    {compareReadout.date}
                  </span>
                  {compareReadout.comparison && (
                    <span className="font-mono text-muted-foreground">
                      PIN {compareReadout.pinnedDate} 대비 ·{" "}
                      {compareReadout.comparison.points.toLocaleString()}포인트
                      {compareReadout.comparison.days != null
                        ? ` · ${compareReadout.comparison.days.toLocaleString()}일`
                        : ""}
                    </span>
                  )}
                  {compareReadout.items.map((item) => (
                    <span
                      key={item.symbol}
                      className="inline-flex items-center gap-1.5 font-mono text-muted-foreground"
                    >
                      <span
                        className="h-1.5 w-3 rounded-full"
                        style={{ background: item.color }}
                      />
                      <span>{item.symbol}</span>
                      <span
                        className={cn(
                          item.value >= 0 ? "text-up" : "text-down",
                        )}
                      >
                        {item.value >= 0 ? "+" : ""}
                        {item.value.toFixed(2)}%
                      </span>
                      {item.delta != null && (
                        <span
                          className={cn(
                            item.delta >= 0 ? "text-up" : "text-down",
                          )}
                          title="PIN 날짜 대비 누적 수익률 차이"
                        >
                          ({item.delta >= 0 ? "+" : ""}
                          {item.delta.toFixed(2)}%p)
                        </span>
                      )}
                    </span>
                  ))}
                  <span className="text-muted-foreground">
                    클릭/Enter PIN · ←/→ CUR · Shift+←/→/PgUp/PgDn 크게 ·
                    Home/End 처음/끝 · D/T/Alt+D 표 · Esc 해제
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                {compareStripModel.series.map((series) => (
                  <span
                    key={series.symbol}
                    className="inline-flex items-center gap-1.5 font-mono text-muted-foreground"
                    title={`${series.symbol} DB 일봉 ${series.from_date ?? "?"} ~ ${
                      series.to_date ?? "?"
                    } · ${series.returned_count.toLocaleString()}행`}
                  >
                    <span
                      className="h-1.5 w-3 rounded-full"
                      style={{ background: series.color }}
                    />
                    <span>{series.symbol}</span>
                    <span
                      className={cn(
                        (series.last ?? 0) >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      {series.last == null
                        ? "—"
                        : `${series.last >= 0 ? "+" : ""}${series.last.toFixed(2)}%`}
                    </span>
                  </span>
                ))}
              </div>
              {compareDataTableOpen && (
                <div className="max-h-56 overflow-auto rounded-lg border border-border bg-card text-[11px] shadow-sm">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-2 py-1.5 backdrop-blur">
                    <span className="font-mono text-muted-foreground">
                      COMPARE {compareStripModel.from} ~ {compareStripModel.to}{" "}
                      · {compareDisplayRows.length.toLocaleString()}행
                      {compareTableSampledCount > 0
                        ? ` · ${compareTableSampledCount.toLocaleString()}행 샘플링 생략`
                        : ""}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={exportCompareDataCsv}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                        title="현재 비교 표시 구간 전체를 CSV로 저장"
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompareDataTableOpen(false)}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                        title="비교 데이터 표 닫기 (Esc 또는 D/T/Alt+D)"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                  <table className="w-full min-w-[420px] border-collapse font-mono tabular-nums">
                    <thead>
                      <tr className="border-b border-border/70 bg-muted/20 text-muted-foreground">
                        <th className="sticky left-0 z-10 bg-muted/20 px-2 py-1 text-left font-medium">
                          날짜
                        </th>
                        <th className="px-2 py-1 text-right font-medium">
                          간격
                        </th>
                        {compareStripModel.series.map((series) => (
                          <th
                            key={series.symbol}
                            className="px-2 py-1 text-right font-medium"
                          >
                            {series.symbol}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareTableRows.map((row) => {
                        const index = compareDisplayRows.findIndex(
                          (item) => item.date === row.date,
                        );
                        const previous =
                          index > 0 ? compareDisplayRows[index - 1] : null;
                        const currentTime = parseUtcDay(row.date)?.timestamp;
                        const previousTime = previous
                          ? parseUtcDay(previous.date)?.timestamp
                          : null;
                        const gapDays =
                          typeof currentTime === "number" &&
                          Number.isFinite(currentTime) &&
                          typeof previousTime === "number" &&
                          Number.isFinite(previousTime)
                            ? Math.max(
                                0,
                                Math.round(
                                  (currentTime - previousTime) / 86_400_000,
                                ),
                              )
                            : null;
                        const largeGap = gapDays != null && gapDays > 7;
                        return (
                          <tr
                            key={String(row.date)}
                            className="border-b border-border/40 odd:bg-muted/10 hover:bg-muted/20"
                          >
                            <td className="sticky left-0 bg-card px-2 py-1 text-left text-muted-foreground">
                              {String(row.date ?? "")}
                            </td>
                            <td
                              className={cn(
                                "px-2 py-1 text-right",
                                largeGap
                                  ? "text-amber-500"
                                  : "text-muted-foreground",
                              )}
                              title={
                                gapDays == null
                                  ? "첫 표시 행"
                                  : `이전 비교 행 대비 ${gapDays.toLocaleString()}일 간격`
                              }
                            >
                              {gapDays == null ? "-" : `${gapDays}d`}
                            </td>
                            {compareStripModel.series.map((series) => {
                              const value = Number(row[series.symbol]);
                              return (
                                <td
                                  key={series.symbol}
                                  className={cn(
                                    "px-2 py-1 text-right",
                                    Number.isFinite(value)
                                      ? value >= 0
                                        ? "text-up"
                                        : "text-down"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {Number.isFinite(value)
                                    ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
                                    : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
              {visibleCompareSymbols.length < 2 &&
              loadedCompareSymbols.length >= 2
                ? "표시 중인 비교선이 2개 미만입니다. ALL로 다시 표시하세요"
                : "비교할 DB 일봉 데이터가 아직 없습니다"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
