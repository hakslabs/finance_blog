/**
 * KLineSeriesChart — Multi-series (lines + bars) chart built on klinecharts.
 *
 * Lets every detail-page chart share the same visual language as the main
 * StockChart while still supporting overlays (watchlist comparisons,
 * portfolio vs benchmarks, multi-bar financials, single-line trends).
 *
 * No moving-average / RSI / MACD overlays — these are summary views; the
 * "보조지표는 없음" rule from the design brief.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from "react";
import {
  init,
  dispose,
  registerIndicator,
  type Chart,
  type KLineData,
} from "klinecharts";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  HelpCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Table2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export type SeriesType = "line" | "bar" | "area";

export interface SeriesConfig {
  /** Field key on each data row that holds this series' numeric value. */
  key: string;
  /** Display label (legend / tooltip). */
  label: string;
  /** Stroke / fill color. */
  color: string;
  /** Render style — default "line". */
  type?: SeriesType;
  /** Optional dash pattern e.g. [4, 2] for benchmarks. */
  dashed?: boolean;
}

export interface KLineSeriesChartProps {
  /** Time series rows. Each row needs a `date` (YYYY-MM-DD or any parseable) + the series keys. */
  data: Array<Record<string, any>>;
  series: SeriesConfig[];
  height?: number;
  /** Show the right-side value axis (default true). */
  showYAxis?: boolean;
  /** Show the bottom date axis (default true). */
  showXAxis?: boolean;
  /** Format value labels on the Y-axis and in the tooltip (e.g. v => `${v}%`). */
  valueFormatter?: (v: number) => string;
  /** Optional reference line at y=0 (for percent or P&L charts). */
  zeroLine?: boolean;
  /** Initial bar mode — render bars grouped (side-by-side) or stacked. Default "group". */
  barLayout?: "stack" | "group";
  /** Show compact trading-style controls above the chart. */
  showToolbar?: boolean;
  /** Show the chart-local 1M..ALL range buttons. Disable when a parent owns period selection. */
  showRangeControls?: boolean;
  /** Show latest visible value tags beside the right axis. */
  showLastValueLabels?: boolean;
  /** Allow value / % / indexed transforms. Defaults to toolbar-enabled charts only. */
  allowValueTransform?: boolean;
  /** Initial value/%/100 scale for toolbar-enabled charts. */
  initialTransformMode?: TransformMode;
  /** Initial visible lookback window in calendar days. `null` means full received history. */
  initialViewDays?: number | null;
  /** Label shown when value transforms are disabled because data is precomputed. */
  fixedScaleLabel?: string;
  /** Short detail shown when value transforms are disabled because data is precomputed. */
  fixedScaleDetail?: string;
  /** Tooltip shown when value transforms are disabled because data is precomputed. */
  fixedScaleTitle?: string;
  /** Short source badge shown in the chart toolbar, e.g. API, DB, LOCAL. */
  sourceLabel?: string;
  /** Tooltip for the source badge. */
  sourceTitle?: string;
  /** Visual tone for the source badge. */
  sourceTone?: SourceTone;
  /** Optional persistence scope. Use false for fully ephemeral chart controls. */
  settingsScope?: string | false;
}

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

// Each chart instance registers a uniquely-named indicator so it doesn't
// clobber others. Counter is module-scoped.
let INDICATOR_SEQ = 0;

function parseSeriesValue(value: unknown): number {
  if (value == null || value === "") return Number.NaN;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function seriesSignature(series: SeriesConfig[]): string {
  return series
    .map(
      (s) =>
        `${s.key}:${s.label}:${s.color}:${s.type ?? "line"}:${s.dashed ? 1 : 0}`,
    )
    .join("|");
}

function chartDataFingerprint(
  rows: NormalizedRow[],
  series: SeriesConfig[],
): string {
  if (rows.length === 0) return "empty";
  const keys = series.map((item) => item.key);
  const first = rows[0];
  const last = rows[rows.length - 1];
  let checksum = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    checksum =
      (checksum + (i + 1) * ((Number(row.__ts) || 0) % 1_000_003)) %
      1_000_000_007;
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      const key = keys[keyIndex];
      const value = parseSeriesValue(row[key]);
      if (Number.isFinite(value)) {
        checksum =
          (checksum + (i + 3) * (keyIndex + 1) * Math.round(value * 1000)) %
          1_000_000_007;
      }
    }
  }
  const serializeEdgeValue = (value: number) =>
    Number.isFinite(value) ? String(value) : "";
  return [
    rows.length,
    keys.join(","),
    first?.__ts ?? "",
    last?.__ts ?? "",
    ...keys.map((key) => serializeEdgeValue(parseSeriesValue(first?.[key]))),
    ...keys.map((key) => serializeEdgeValue(parseSeriesValue(last?.[key]))),
    checksum,
  ].join("|");
}

function linePath(
  points: Array<{ x: number; y: number; ok: boolean }>,
): string {
  let path = "";
  let drawing = false;
  for (const p of points) {
    if (!p.ok) {
      drawing = false;
      continue;
    }
    path += `${drawing ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    drawing = true;
  }
  return path;
}

function areaPath(
  points: Array<{ x: number; y: number; ok: boolean }>,
  baseY: number,
): string {
  const segments: string[] = [];
  let current: Array<{ x: number; y: number }> = [];
  const flush = () => {
    if (!current.length) return;
    const line = current
      .map(
        (p, index) =>
          `${index === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
      )
      .join("");
    const last = current[current.length - 1];
    const first = current[0];
    segments.push(
      `${line}L${last.x.toFixed(2)},${baseY.toFixed(2)}L${first.x.toFixed(2)},${baseY.toFixed(2)}Z`,
    );
    current = [];
  };

  for (const p of points) {
    if (!p.ok) {
      flush();
      continue;
    }
    current.push({ x: p.x, y: p.y });
  }
  flush();
  return segments.join("");
}

type ViewRange = { start: number; end: number };
type QuickRangeKey = "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y" | "ALL";
type TransformMode = "value" | "changePct" | "indexed";
type SourceTone = "primary" | "warning" | "neutral";
type ScaleModeStatus = {
  label: string;
  detail: string;
  title: string;
};
type PointerPoint = { x: number; y: number };
type SeriesChartSettings = {
  showGrid: boolean;
  showCrosshair: boolean;
  density: "compact" | "standard" | "deep";
  chartHeightScale: number;
  barDisplayLayout: "stack" | "group";
  showLastValueLabels: boolean;
  seriesOrder: string[];
  visibleKeys: string[];
};
type HoverDatum = {
  index: number;
  row: Record<string, any>;
  x: number;
  items: Array<{
    key: string;
    label: string;
    color: string;
    value: number;
    y: number;
    type: SeriesType;
  }>;
};
type NormalizedRow = Record<string, any> & { __ts: number };
type NormalizeRowsResult = {
  rows: NormalizedRow[];
  invalidRows: number;
  duplicateRows: number;
};
type LastValueMarker = {
  key: string;
  label: string;
  color: string;
  value: number;
  changeLabel?: string | null;
  y: number;
  labelY: number;
};
type RangeSeriesStat = {
  key: string;
  label: string;
  color: string;
  first: number;
  last: number;
  change: number;
  changePct: number | null;
  min: number;
  max: number;
  spread: number;
  spreadPct: number | null;
  up: boolean;
};
type RangeComparisonSummary = {
  best: RangeSeriesStat;
  worst: RangeSeriesStat;
  gap: number;
  correlation: number | null;
  correlationLabel: string | null;
};
type RangeExtremeMarker = {
  key: string;
  label: string;
  color: string;
  kind: "H" | "L";
  index: number;
  value: number;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
};

const QUICK_RANGES: Array<{
  key: QuickRangeKey;
  label: string;
  lookbackDays: number | null;
}> = [
  { key: "1M", label: "1M", lookbackDays: 31 },
  { key: "3M", label: "3M", lookbackDays: 92 },
  { key: "6M", label: "6M", lookbackDays: 183 },
  { key: "1Y", label: "1Y", lookbackDays: 365 },
  { key: "2Y", label: "2Y", lookbackDays: 730 },
  { key: "5Y", label: "5Y", lookbackDays: 1825 },
  { key: "ALL", label: "전체", lookbackDays: null },
];
const SERIES_CHART_SETTINGS_KEY = "financelab_series_chart_settings_v1";
const MIN_SERIES_CHART_HEIGHT_SCALE = 0.75;
const MAX_SERIES_CHART_HEIGHT_SCALE = 1.8;
const SERIES_CHART_HEIGHT_SCALE_STEP = 0.05;
const TRANSFORM_MODE_STATUS: Record<TransformMode, ScaleModeStatus> = {
  value: {
    label: "값",
    detail: "원값",
    title: "DB/API에서 받은 원값을 그대로 표시",
  },
  changePct: {
    label: "%",
    detail: "첫 표시값=0%",
    title: "현재 표시 구간의 첫 유효값을 기준으로 등락률 표시",
  },
  indexed: {
    label: "100",
    detail: "첫 표시값=100",
    title: "현재 표시 구간의 첫 유효값을 100으로 맞춰 상대 성과 표시",
  },
};

function fullRange(length: number): ViewRange {
  return { start: 0, end: Math.max(0, length - 1) };
}

function clampRange(range: ViewRange, length: number): ViewRange {
  if (length <= 0) return { start: 0, end: 0 };
  const span = Math.max(1, Math.round(range.end - range.start));
  const maxStart = Math.max(0, length - 1 - span);
  const start = Math.min(Math.max(0, Math.round(range.start)), maxStart);
  return { start, end: Math.min(length - 1, start + span) };
}

function zoomRange(
  range: ViewRange,
  length: number,
  factor: number,
  anchorRatio = 0.5,
): ViewRange {
  if (length <= 2) return clampRange(range, length);
  const current = clampRange(range, length);
  const span = Math.max(2, current.end - current.start + 1);
  const minSpan = Math.min(length, 8);
  const nextSpan = Math.min(
    length,
    Math.max(minSpan, Math.round(span * factor)),
  );
  const boundedRatio = Math.min(1, Math.max(0, anchorRatio));
  const anchor = current.start + boundedRatio * (span - 1);
  const nextStart = anchor - boundedRatio * (nextSpan - 1);
  return clampRange(
    { start: nextStart, end: nextStart + nextSpan - 1 },
    length,
  );
}

function rowTime(row: Record<string, any> | undefined): number | null {
  if (!row) return null;
  const value = row.date;
  if (value == null || value === "") return null;
  const epochTimestamp = parseEpochTimestamp(value);
  if (epochTimestamp != null) return epochTimestamp;
  const parsed = Date.parse(normalizeUtcDateInput(String(value)));
  return Number.isFinite(parsed) ? parsed : null;
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

function formatUtcDay(time: number): string {
  const dt = new Date(time);
  if (Number.isNaN(dt.getTime())) return "-";
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(dt.getUTCDate()).padStart(2, "0")}`;
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

function normalizeRows(
  rows: Array<Record<string, any>>,
  series: SeriesConfig[],
): NormalizedRow[] {
  return normalizeRowsWithStats(rows, series).rows;
}

function normalizeRowsWithStats(
  rows: Array<Record<string, any>>,
  series: SeriesConfig[],
): NormalizeRowsResult {
  const byTime = new Map<number, NormalizedRow>();
  let invalidRows = 0;
  let duplicateRows = 0;

  rows.forEach((row) => {
    const ts = rowTime(row);
    if (ts == null) {
      invalidRows += 1;
      return;
    }

    const hasValue = series.some((s) =>
      Number.isFinite(parseSeriesValue(row[s.key])),
    );
    if (!hasValue) {
      invalidRows += 1;
      return;
    }

    const date = formatUtcDay(ts);
    const previous = byTime.get(ts);
    if (previous) {
      duplicateRows += 1;
      byTime.set(ts, { ...previous, ...row, date, __ts: ts });
    } else {
      byTime.set(ts, { ...row, date, __ts: ts });
    }
  });

  return {
    rows: Array.from(byTime.values()).sort((a, b) => a.__ts - b.__ts),
    invalidRows,
    duplicateRows,
  };
}

function transformRows(
  rows: NormalizedRow[],
  series: SeriesConfig[],
  mode: TransformMode,
  baseIndex?: number | null,
): NormalizedRow[] {
  if (mode === "value") return rows;
  const baseByKey = new Map<string, number>();
  const commonBaseIndex =
    baseIndex === undefined ? comparisonBaseIndex(rows, series) : baseIndex;

  if (commonBaseIndex == null) {
    return rows.map((row) => {
      const next: NormalizedRow = { ...row };
      for (const s of series) next[s.key] = Number.NaN;
      return next;
    });
  }

  const baseRow = rows[commonBaseIndex];
  for (const s of series) {
    const base = parseSeriesValue(baseRow?.[s.key]);
    if (Number.isFinite(base) && base !== 0) baseByKey.set(s.key, base);
  }

  return rows.map((row, index) => {
    const next: NormalizedRow = { ...row };
    for (const s of series) {
      const value = parseSeriesValue(row[s.key]);
      const base = baseByKey.get(s.key);
      if (
        !Number.isFinite(value) ||
        base == null ||
        base === 0 ||
        index < commonBaseIndex
      ) {
        next[s.key] = Number.NaN;
      } else if (mode === "changePct") {
        next[s.key] = ((value - base) / Math.abs(base)) * 100;
      } else {
        next[s.key] = (value / base) * 100;
      }
    }
    return next;
  });
}

function comparisonBaseIndex(
  rows: NormalizedRow[],
  series: SeriesConfig[],
): number | null {
  if (rows.length === 0 || series.length === 0) return null;
  for (let i = 0; i < rows.length; i++) {
    const hasAllValues = series.every((s) => {
      const value = parseSeriesValue(rows[i][s.key]);
      return Number.isFinite(value) && value !== 0;
    });
    if (hasAllValues) return i;
  }
  return null;
}

function rangeForDays(
  data: Array<Record<string, any>>,
  days: number | null,
): ViewRange {
  if (data.length <= 0 || days == null) return fullRange(data.length);
  const latest = rowTime(data[data.length - 1]);
  if (latest == null) return fullRange(data.length);
  const target = latest - Math.max(0, days - 1) * 86_400_000;
  const start = data.findIndex((row) => {
    const t = rowTime(row);
    return t != null && t >= target;
  });
  return clampRange(
    { start: start >= 0 ? start : 0, end: data.length - 1 },
    data.length,
  );
}

function sameRange(a: ViewRange, b: ViewRange): boolean {
  return a.start === b.start && a.end === b.end;
}

function pearsonCorrelation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const xs = a.slice(0, n);
  const ys = b.slice(0, n);
  const avgX = xs.reduce((sum, value) => sum + value, 0) / n;
  const avgY = ys.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - avgX;
    const dy = ys[i] - avgY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return null;
  const r = numerator / denominator;
  return Number.isFinite(r) ? Math.max(-1, Math.min(1, r)) : null;
}

function correlationLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.75) return value >= 0 ? "강한 동행" : "강한 역행";
  if (abs >= 0.4) return value >= 0 ? "동행" : "역행";
  return "약함";
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

function isSeriesDensity(
  value: unknown,
): value is SeriesChartSettings["density"] {
  return value === "compact" || value === "standard" || value === "deep";
}

function isBarDisplayLayout(
  value: unknown,
): value is SeriesChartSettings["barDisplayLayout"] {
  return value === "group" || value === "stack";
}

function clampSeriesChartHeightScale(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(
    MAX_SERIES_CHART_HEIGHT_SCALE,
    Math.max(MIN_SERIES_CHART_HEIGHT_SCALE, parsed),
  );
}

function sanitizeSeriesKeyList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const keys = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return keys.length > 0 ? keys : undefined;
}

function defaultTransformMode(
  initialTransformMode: TransformMode,
  canTransformValues: boolean,
): TransformMode {
  return canTransformValues ? initialTransformMode : "value";
}

function seriesChartSettingsStorageKey(scope: string): string {
  const safeScope =
    scope.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "default";
  return `${SERIES_CHART_SETTINGS_KEY}:${safeScope}`;
}

function defaultSeriesChartSettingsScope(
  series: SeriesConfig[],
  canTransformValues: boolean,
  allowValueTransform: boolean,
): string {
  const typeSet = new Set(series.map((item) => item.type ?? "line"));
  const typeScope =
    typeSet.size === 1
      ? Array.from(typeSet)[0]
      : Array.from(typeSet).sort().join("-");
  const scaleScope = canTransformValues
    ? "transform"
    : allowValueTransform
      ? "raw"
      : "fixed";
  return `${scaleScope}:${typeScope}`;
}

function readSeriesChartSettings(
  scope: string | null,
): Partial<SeriesChartSettings> {
  if (!scope) return {};
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(
      seriesChartSettingsStorageKey(scope),
    );
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<SeriesChartSettings>;
    return {
      showGrid:
        typeof parsed.showGrid === "boolean" ? parsed.showGrid : undefined,
      showCrosshair:
        typeof parsed.showCrosshair === "boolean"
          ? parsed.showCrosshair
          : undefined,
      density: isSeriesDensity(parsed.density) ? parsed.density : undefined,
      chartHeightScale: clampSeriesChartHeightScale(parsed.chartHeightScale),
      barDisplayLayout: isBarDisplayLayout(parsed.barDisplayLayout)
        ? parsed.barDisplayLayout
        : undefined,
      showLastValueLabels:
        typeof parsed.showLastValueLabels === "boolean"
          ? parsed.showLastValueLabels
          : undefined,
      seriesOrder: sanitizeSeriesKeyList(parsed.seriesOrder),
      visibleKeys: sanitizeSeriesKeyList(parsed.visibleKeys),
    };
  } catch {
    return {};
  }
}

function writeSeriesChartSettings(
  scope: string | null,
  settings: SeriesChartSettings,
): void {
  if (!scope) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      seriesChartSettingsStorageKey(scope),
      JSON.stringify(settings),
    );
  } catch {
    /* localStorage can be disabled; chart still works with in-memory state. */
  }
}

function formatDateLabel(value: unknown): string {
  if (value == null || value === "") return "-";
  const epochTimestamp = parseEpochTimestamp(value);
  if (epochTimestamp != null) return formatUtcDay(epochTimestamp);
  if (typeof value === "number" && Number.isFinite(value))
    return formatUtcDay(value);
  const parsed = new Date(normalizeUtcDateInput(String(value)));
  if (!Number.isNaN(parsed.getTime())) return formatUtcDay(parsed.getTime());
  return String(value);
}

function formatChangePct(current: number, previous: number): string | null {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function rangeMovePct(
  current: number,
  base: number,
  mode: TransformMode,
): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(base)) return null;
  if (mode === "changePct") return current;
  if (mode === "indexed") return current - 100;
  if (base === 0) return null;
  return ((current - base) / Math.abs(base)) * 100;
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

function inlineSvgCssVariables(svgText: string): string {
  return svgText.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (_match, token: string) =>
    readToken(token, "#94a3b8"),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

function spreadMarkers(
  markers: Array<Omit<LastValueMarker, "labelY">>,
  minY: number,
  maxY: number,
): LastValueMarker[] {
  const sorted = [...markers].sort((a, b) => a.y - b.y);
  const gap = 16;
  const placed: LastValueMarker[] = [];

  for (const marker of sorted) {
    const previous = placed[placed.length - 1];
    const nextY = previous
      ? Math.max(marker.y, previous.labelY + gap)
      : marker.y;
    placed.push({
      ...marker,
      labelY: Math.min(maxY, Math.max(minY, nextY)),
    });
  }

  for (let i = placed.length - 2; i >= 0; i--) {
    placed[i].labelY = Math.min(placed[i].labelY, placed[i + 1].labelY - gap);
    placed[i].labelY = Math.max(minY, placed[i].labelY);
  }

  return placed.sort(
    (a, b) =>
      markers.findIndex((m) => m.key === a.key) -
      markers.findIndex((m) => m.key === b.key),
  );
}

export default function KLineSeriesChart({
  data,
  series,
  height = 200,
  showYAxis = true,
  showXAxis = true,
  valueFormatter,
  zeroLine = false,
  barLayout = "group",
  showToolbar = true,
  showRangeControls = true,
  showLastValueLabels = showToolbar,
  allowValueTransform = showToolbar,
  initialTransformMode = "value",
  initialViewDays,
  fixedScaleLabel = "고정",
  fixedScaleDetail = "입력값",
  fixedScaleTitle = "상위 화면에서 이미 계산한 DB/API 값을 그대로 표시",
  sourceLabel,
  sourceTitle,
  sourceTone = "neutral",
  settingsScope,
}: KLineSeriesChartProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartAreaRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const layoutRaf = useRef<number | null>(null);
  const indicatorNameRef = useRef<string>(`series_${++INDICATOR_SEQ}`);
  const transformModeTouchedRef = useRef(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const canTransformValues = showToolbar && allowValueTransform;
  const chartSettingsScope =
    settingsScope === false || !showToolbar
      ? null
      : (settingsScope ??
        defaultSeriesChartSettingsScope(
          series,
          canTransformValues,
          allowValueTransform,
        ));
  const storedSettings = useMemo(
    () => readSeriesChartSettings(chartSettingsScope),
    // Settings seed initial component state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const canPersistSettings = chartSettingsScope != null;
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    const available = new Set(series.map((s) => s.key));
    const restored = (storedSettings.visibleKeys ?? []).filter((key) =>
      available.has(key),
    );
    return new Set(restored.length > 0 ? restored : series.map((s) => s.key));
  });
  const [showGrid, setShowGrid] = useState(storedSettings.showGrid ?? true);
  const [showCrosshair, setShowCrosshair] = useState(
    storedSettings.showCrosshair ?? true,
  );
  const [density, setDensity] = useState<"compact" | "standard" | "deep">(
    storedSettings.density ?? "standard",
  );
  const [chartHeightScale, setChartHeightScale] = useState(
    storedSettings.chartHeightScale ?? 1,
  );
  // Keep value/%/100 as per-chart session state. Persisting it globally made
  // semantically different charts inherit the wrong scale.
  const [transformMode, setTransformMode] = useState<TransformMode>(() =>
    defaultTransformMode(initialTransformMode, canTransformValues),
  );
  const [barDisplayLayout, setBarDisplayLayout] = useState<"stack" | "group">(
    canPersistSettings
      ? (storedSettings.barDisplayLayout ?? barLayout)
      : barLayout,
  );
  const [lastValueLabelsVisible, setLastValueLabelsVisible] = useState(
    canPersistSettings
      ? (storedSettings.showLastValueLabels ?? showLastValueLabels)
      : showLastValueLabels,
  );
  const [seriesSearch, setSeriesSearch] = useState("");
  const [showVisibleSeriesOnly, setShowVisibleSeriesOnly] = useState(false);
  const [seriesOrder, setSeriesOrder] = useState<string[]>(
    () => storedSettings.seriesOrder ?? series.map((item) => item.key),
  );
  const [draggedSeriesKey, setDraggedSeriesKey] = useState<string | null>(null);
  const [dragOverSeriesKey, setDragOverSeriesKey] = useState<string | null>(
    null,
  );
  const [dataTableOpen, setDataTableOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [viewRange, setViewRange] = useState<ViewRange>(() =>
    fullRange(data.length),
  );
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    start: number;
    end: number;
    width: number;
  } | null>(null);
  const pointerMapRef = useRef<Map<number, PointerPoint>>(new Map());
  const pinchRef = useRef<{
    distance: number;
    range: ViewRange;
    centerRatio: number;
  } | null>(null);
  const soloReturnSeriesRef = useRef<Set<string> | null>(null);
  const previousSettingsScopeRef = useRef<string | null>(chartSettingsScope);
  const skipNextSettingsWriteRef = useRef(false);
  const previousSeriesKeysRef = useRef<Set<string>>(
    new Set(series.map((s) => s.key)),
  );
  const seriesKey = seriesSignature(series);
  const stableSeries = useMemo(() => series, [seriesKey]);
  const orderedSeries = useMemo(() => {
    const byKey = new Map(stableSeries.map((item) => [item.key, item]));
    const seen = new Set<string>();
    const ordered: SeriesConfig[] = [];
    for (const key of seriesOrder) {
      const item = byKey.get(key);
      if (!item || seen.has(key)) continue;
      seen.add(key);
      ordered.push(item);
    }
    for (const item of stableSeries) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      ordered.push(item);
    }
    return ordered;
  }, [seriesOrder, stableSeries]);

  useEffect(() => {
    if (previousSettingsScopeRef.current === chartSettingsScope) return;
    previousSettingsScopeRef.current = chartSettingsScope;
    skipNextSettingsWriteRef.current = true;
    if (!chartSettingsScope) {
      setShowGrid(true);
      setShowCrosshair(true);
      setDensity("standard");
      setChartHeightScale(1);
      setBarDisplayLayout(barLayout);
      setLastValueLabelsVisible(showLastValueLabels);
      setSeriesOrder(stableSeries.map((item) => item.key));
      setVisibleKeys(new Set(stableSeries.map((item) => item.key)));
      return;
    }
    const nextSettings = readSeriesChartSettings(chartSettingsScope);
    const available = new Set(stableSeries.map((item) => item.key));
    const restoredVisible = (nextSettings.visibleKeys ?? []).filter((key) =>
      available.has(key),
    );
    setShowGrid(nextSettings.showGrid ?? true);
    setShowCrosshair(nextSettings.showCrosshair ?? true);
    setDensity(nextSettings.density ?? "standard");
    setChartHeightScale(nextSettings.chartHeightScale ?? 1);
    setBarDisplayLayout(nextSettings.barDisplayLayout ?? barLayout);
    setLastValueLabelsVisible(
      nextSettings.showLastValueLabels ?? showLastValueLabels,
    );
    setSeriesOrder(
      nextSettings.seriesOrder ?? stableSeries.map((item) => item.key),
    );
    setVisibleKeys(
      new Set(
        restoredVisible.length > 0
          ? restoredVisible
          : stableSeries.map((item) => item.key),
      ),
    );
  }, [barLayout, chartSettingsScope, showLastValueLabels, stableSeries]);

  useEffect(() => {
    const previousSeriesKeys = previousSeriesKeysRef.current;
    const currentSeriesKeys = new Set(stableSeries.map((s) => s.key));
    setSeriesOrder((prev) => {
      const next = prev.filter((key) => currentSeriesKeys.has(key));
      for (const item of stableSeries) {
        if (!next.includes(item.key)) next.push(item.key);
      }
      return next;
    });
    if (soloReturnSeriesRef.current) {
      const nextReturn = new Set(
        [...soloReturnSeriesRef.current].filter((key) =>
          currentSeriesKeys.has(key),
        ),
      );
      soloReturnSeriesRef.current = nextReturn.size > 0 ? nextReturn : null;
    }
    setVisibleKeys((prev) => {
      const next = new Set<string>();
      for (const item of stableSeries) {
        const isNewSeries = !previousSeriesKeys.has(item.key);
        if (prev.size === 0 || prev.has(item.key) || isNewSeries) {
          next.add(item.key);
        }
      }
      return next.size > 0 ? next : currentSeriesKeys;
    });
    previousSeriesKeysRef.current = currentSeriesKeys;
  }, [stableSeries]);

  const normalizedResult = useMemo(
    () => normalizeRowsWithStats(data, orderedSeries),
    [data, orderedSeries],
  );
  const chartData = normalizedResult.rows;
  const chartDataSignature = useMemo(() => {
    return chartDataFingerprint(chartData, orderedSeries);
  }, [chartData, orderedSeries]);
  const previousChartDataRef = useRef<{
    signature: string;
    length: number;
  } | null>(null);
  const previousInitialViewDaysRef = useRef<number | null | undefined>(
    initialViewDays,
  );
  const droppedRowCount =
    normalizedResult.invalidRows + normalizedResult.duplicateRows;
  const visibleSeries = useMemo(
    () => orderedSeries.filter((s) => visibleKeys.has(s.key)),
    [orderedSeries, visibleKeys],
  );
  const hiddenSeriesCount = Math.max(
    0,
    stableSeries.length - visibleSeries.length,
  );
  const filteredSeries = useMemo(() => {
    const query = seriesSearch.trim().toLowerCase();
    const pool = showVisibleSeriesOnly
      ? orderedSeries.filter((item) => visibleKeys.has(item.key))
      : orderedSeries;
    if (!query) return pool;
    return pool.filter((item) =>
      [item.label, item.key, item.type ?? "line"]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [orderedSeries, seriesSearch, showVisibleSeriesOnly, visibleKeys]);
  const visibleBarSeriesCount = visibleSeries.filter(
    (s) => (s.type ?? "line") === "bar",
  ).length;
  const baseChartHeight = expanded ? Math.max(height, 520) : height;
  const chartHeight =
    Math.round(baseChartHeight * chartHeightScale) +
    (density === "deep" ? 80 : density === "compact" ? -36 : 0);
  const legendHeight = visibleSeries.length > 1 ? 20 : 0;
  const measuredToolbarHeight = showToolbar ? toolbarHeight + 8 : 0;
  const chartAreaHeight = Math.max(
    180,
    expanded
      ? Math.max(260, viewportHeight - measuredToolbarHeight - 72)
      : chartHeight,
  );
  const clampedViewRange = useMemo(
    () => clampRange(viewRange, chartData.length),
    [chartData.length, viewRange],
  );
  useEffect(() => {
    if (sameRange(viewRange, clampedViewRange)) return;
    setViewRange(clampedViewRange);
    setHoverIndex(null);
  }, [clampedViewRange, viewRange]);
  const visibleData = useMemo(
    () => chartData.slice(clampedViewRange.start, clampedViewRange.end + 1),
    [chartData, clampedViewRange],
  );
  const rowGapStats = useMemo(() => {
    if (chartData.length < 2) return null;
    let maxGapDays = 0;
    let largeGapCount = 0;
    for (let i = 1; i < chartData.length; i++) {
      const gapDays = Math.round(
        (chartData[i].__ts - chartData[i - 1].__ts) / 86_400_000,
      );
      if (!Number.isFinite(gapDays)) continue;
      if (gapDays > maxGapDays) maxGapDays = gapDays;
      if (gapDays > 7) largeGapCount += 1;
    }
    return { maxGapDays, largeGapCount };
  }, [chartData]);
  const staleLabel = useMemo(() => {
    const last = chartData[chartData.length - 1];
    return staleDayLabel(last?.__ts);
  }, [chartData]);
  const hasSeriesQualityWarning =
    Boolean(staleLabel) ||
    droppedRowCount > 0 ||
    (rowGapStats != null && rowGapStats.maxGapDays > 7);
  const seriesQualityChips = useMemo(() => {
    const chips: string[] = [];
    if (staleLabel) chips.push(staleLabel.replace(/^ · /, ""));
    if (rowGapStats && rowGapStats.maxGapDays > 7) {
      chips.push(`공백 ${rowGapStats.largeGapCount.toLocaleString()}개`);
    }
    if (normalizedResult.invalidRows > 0) {
      chips.push(`무효 ${normalizedResult.invalidRows.toLocaleString()}`);
    }
    if (normalizedResult.duplicateRows > 0) {
      chips.push(`중복 ${normalizedResult.duplicateRows.toLocaleString()}`);
    }
    return chips;
  }, [normalizedResult, rowGapStats, staleLabel]);
  const loadedSeriesTransformBaseIndex = useMemo(
    () =>
      transformMode === "value"
        ? null
        : comparisonBaseIndex(visibleData, orderedSeries),
    [orderedSeries, transformMode, visibleData],
  );
  const visibleSeriesTransformBaseIndex = useMemo(() => {
    if (
      transformMode === "value" ||
      loadedSeriesTransformBaseIndex != null ||
      visibleSeries.length === orderedSeries.length
    ) {
      return null;
    }
    return comparisonBaseIndex(visibleData, visibleSeries);
  }, [
    loadedSeriesTransformBaseIndex,
    orderedSeries.length,
    transformMode,
    visibleData,
    visibleSeries,
  ]);
  const transformBaseIndex =
    loadedSeriesTransformBaseIndex ?? visibleSeriesTransformBaseIndex;
  const transformBaseScope =
    transformMode === "value" || transformBaseIndex == null
      ? null
      : loadedSeriesTransformBaseIndex != null
        ? "loaded"
        : "visible";
  const scaleModeStatus: ScaleModeStatus = useMemo(() => {
    if (!canTransformValues) {
      return {
        label: fixedScaleLabel,
        detail: fixedScaleDetail,
        title: fixedScaleTitle,
      };
    }
    const base = TRANSFORM_MODE_STATUS[transformMode];
    if (transformMode === "value") return base;
    const baseRow =
      transformBaseIndex != null ? visibleData[transformBaseIndex] : null;
    if (!baseRow) {
      return {
        ...base,
        detail: "공통 기준 없음",
        title:
          "현재 표시 구간 안에서 모든 로드 시리즈 또는 표시 시리즈가 동시에 유효한 기준일을 찾지 못했습니다",
      };
    }
    const baseDate = formatDateLabel(baseRow.date);
    return {
      ...base,
      detail: `기준 ${baseDate}`,
      title:
        transformBaseScope === "visible"
          ? `로드된 전체 시리즈의 공통 기준일이 없어 표시 중인 시리즈가 동시에 존재하는 ${baseDate} 값을 기준으로 비교`
          : `숨김/표시 조작으로 비교 기준이 흔들리지 않도록 로드된 전체 시리즈가 동시에 존재하는 ${baseDate} 값을 기준으로 비교`,
    };
  }, [
    canTransformValues,
    fixedScaleDetail,
    fixedScaleLabel,
    fixedScaleTitle,
    transformBaseIndex,
    transformBaseScope,
    transformMode,
    visibleData,
  ]);
  const displayData = useMemo(
    () =>
      transformRows(
        visibleData,
        visibleSeries,
        transformMode,
        transformBaseIndex,
      ),
    [transformBaseIndex, transformMode, visibleData, visibleSeries],
  );
  const emptyChartMessage = useMemo(() => {
    if (data.length === 0) {
      return {
        title: "표시할 시계열 데이터가 없습니다",
        detail: "DB/API 응답 데이터가 비어 있습니다",
      };
    }
    if (
      transformMode !== "value" &&
      transformBaseIndex == null &&
      visibleData.length > 0 &&
      visibleSeries.length > 1
    ) {
      return {
        title: "공통 비교 기준일이 없습니다",
        detail:
          "현재 표시 구간 안에서 모든 시리즈가 동시에 존재하는 날짜가 없습니다",
      };
    }
    return {
      title: "표시할 시계열 데이터가 없습니다",
      detail: "유효한 날짜와 숫자값이 있는 행이 없습니다",
    };
  }, [
    data.length,
    transformBaseIndex,
    transformMode,
    visibleData.length,
    visibleSeries.length,
  ]);
  const displayValueFormatter = useCallback(
    (value: number) => {
      if (transformMode === "changePct")
        return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
      if (transformMode === "indexed") return value.toFixed(2);
      return valueFormatter
        ? valueFormatter(value)
        : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    },
    [transformMode, valueFormatter],
  );
  const tableRows = useMemo(() => {
    const maxRows = expanded ? 360 : 160;
    if (displayData.length <= maxRows) return displayData;
    const step = Math.max(1, Math.ceil(displayData.length / maxRows));
    return displayData.filter(
      (_, index) => index % step === 0 || index === displayData.length - 1,
    );
  }, [displayData, expanded]);
  const tableSampledCount = Math.max(0, displayData.length - tableRows.length);
  const visibleDateLabel = useMemo(() => {
    if (chartData.length === 0) return "데이터 없음";
    const first = chartData[clampedViewRange.start]?.date;
    const last = chartData[clampedViewRange.end]?.date;
    return `${formatDateLabel(first)} - ${formatDateLabel(last)}`;
  }, [chartData, clampedViewRange]);
  const visiblePointLabel =
    chartData.length === 0
      ? "0-0"
      : `${clampedViewRange.start + 1}-${clampedViewRange.end + 1}`;
  const scrubberSpan = Math.max(
    1,
    clampedViewRange.end - clampedViewRange.start,
  );
  const scrubberMaxStart = Math.max(0, chartData.length - 1 - scrubberSpan);
  const scrubberEnabled =
    showToolbar && chartData.length > 2 && scrubberMaxStart > 0;
  const rangeNavigator = useMemo(() => {
    if (!scrubberEnabled || chartData.length <= 1) return null;
    const sourceSeries = visibleSeries[0] ?? orderedSeries[0];
    if (!sourceSeries) return null;
    const width = 1000;
    const height = 34;
    const step = Math.max(1, Math.ceil(chartData.length / 260));
    const sampled = chartData
      .map((row, index) => ({
        index,
        value: parseSeriesValue(row[sourceSeries.key]),
      }))
      .filter(
        (point) =>
          point.index % step === 0 ||
          point.index === 0 ||
          point.index === chartData.length - 1,
      );
    const values = sampled.map((point) => point.value).filter(Number.isFinite);
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(1, max - min);
    let drawing = false;
    const path = sampled
      .map((point) => {
        if (!Number.isFinite(point.value)) {
          drawing = false;
          return "";
        }
        const x = (point.index / Math.max(1, chartData.length - 1)) * width;
        const y = height - ((point.value - min) / spread) * (height - 4) - 2;
        const command = `${drawing ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
        drawing = true;
        return command;
      })
      .filter(Boolean)
      .join(" ");
    if (!path) return null;
    const fromPct = (clampedViewRange.start / (chartData.length - 1)) * 100;
    const toPct = (clampedViewRange.end / (chartData.length - 1)) * 100;
    const windowFirst = parseSeriesValue(
      chartData[clampedViewRange.start]?.[sourceSeries.key],
    );
    const windowLast = parseSeriesValue(
      chartData[clampedViewRange.end]?.[sourceSeries.key],
    );
    const change =
      Number.isFinite(windowFirst) && Number.isFinite(windowLast)
        ? windowLast - windowFirst
        : null;
    const changePct =
      change != null && windowFirst !== 0
        ? (change / Math.abs(windowFirst)) * 100
        : null;
    return {
      path,
      viewBox: `0 0 ${width} ${height}`,
      fromPct: Math.max(0, Math.min(100, fromPct)),
      widthPct: Math.max(1.5, Math.min(100, toPct - fromPct)),
      color: sourceSeries.color,
      sourceLabel: `${sourceSeries.label} · ${formatDateLabel(
        chartData[0]?.date,
      )} - ${formatDateLabel(chartData[chartData.length - 1]?.date)}`,
      windowLabel: `${formatDateLabel(
        chartData[clampedViewRange.start]?.date,
      )} - ${formatDateLabel(chartData[clampedViewRange.end]?.date)}`,
      changeLabel:
        changePct != null && Number.isFinite(changePct)
          ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`
          : change != null
            ? `${change >= 0 ? "+" : ""}${displayValueFormatter(change)}`
            : null,
      changeTone: change == null ? "neutral" : change >= 0 ? "up" : "down",
    };
  }, [
    chartData,
    clampedViewRange,
    displayValueFormatter,
    orderedSeries,
    scrubberEnabled,
    visibleSeries,
  ]);
  const activeQuickRange = useMemo<QuickRangeKey | null>(() => {
    if (sameRange(clampedViewRange, fullRange(chartData.length))) {
      return "ALL";
    }
    for (const option of QUICK_RANGES) {
      if (
        sameRange(
          clampedViewRange,
          rangeForDays(chartData, option.lookbackDays),
        )
      ) {
        return option.key;
      }
    }
    return null;
  }, [chartData, clampedViewRange]);
  const visibleWindowStatus = useMemo(() => {
    if (chartData.length === 0) return null;
    const count = clampedViewRange.end - clampedViewRange.start + 1;
    const pct = (count / chartData.length) * 100;
    return {
      label: activeQuickRange ? `VIEW ${activeQuickRange}` : "VIEW 사용자",
      detail: `${count.toLocaleString()}/${chartData.length.toLocaleString()} · ${pct.toFixed(
        pct >= 10 ? 0 : 1,
      )}%`,
      title: `${visibleDateLabel} · ${visiblePointLabel}`,
    };
  }, [
    activeQuickRange,
    chartData.length,
    clampedViewRange,
    visibleDateLabel,
    visiblePointLabel,
  ]);
  const visibleWindowGapStats = useMemo(() => {
    if (visibleData.length < 2) return null;
    let maxGapDays = 0;
    let largeGapCount = 0;
    for (let i = 1; i < visibleData.length; i++) {
      const gapDays = Math.round(
        (Number(visibleData[i].__ts) - Number(visibleData[i - 1].__ts)) /
          86_400_000,
      );
      if (!Number.isFinite(gapDays)) continue;
      if (gapDays > maxGapDays) maxGapDays = gapDays;
      if (gapDays > 7) largeGapCount += 1;
    }
    return largeGapCount > 0 ? { maxGapDays, largeGapCount } : null;
  }, [visibleData]);
  const comparisonBaseStatus = useMemo(() => {
    if (transformMode === "value") return null;
    const baseRow =
      transformBaseIndex != null ? visibleData[transformBaseIndex] : null;
    if (!baseRow) {
      return {
        label: "BASE 없음",
        scope: "none" as const,
        title:
          "현재 표시 구간 안에서 모든 로드 시리즈 또는 표시 시리즈가 동시에 존재하는 기준일이 없습니다",
      };
    }
    const validCount = visibleSeries.filter((s) =>
      Number.isFinite(parseSeriesValue(baseRow[s.key])),
    ).length;
    const scopeLabel = transformBaseScope === "visible" ? "표시" : "전체";
    return {
      label: `BASE ${formatDateLabel(baseRow.date)} · ${scopeLabel}`,
      scope: transformBaseScope ?? ("loaded" as const),
      title:
        transformBaseScope === "visible"
          ? `${formatDateLabel(baseRow.date)} 기준 · 로드된 전체 시리즈 공통 기준이 없어 표시 중인 ${validCount}/${visibleSeries.length}개 시리즈 기준으로 비교`
          : `${formatDateLabel(baseRow.date)} 기준 · 숨김/표시 조작으로 기준이 바뀌지 않도록 로드된 전체 시리즈 기준으로 비교`,
    };
  }, [
    transformBaseIndex,
    transformBaseScope,
    transformMode,
    visibleData,
    visibleSeries,
  ]);

  useEffect(() => {
    const previous = previousChartDataRef.current;
    previousChartDataRef.current = {
      signature: chartDataSignature,
      length: chartData.length,
    };

    if (!previous || previous.length <= 0 || chartData.length <= 0) {
      setViewRange(rangeForDays(chartData, initialViewDays ?? null));
      setHoverIndex(null);
      setPinnedIndex(null);
      return;
    }

    if (
      previous.signature === chartDataSignature &&
      previous.length === chartData.length
    ) {
      return;
    }

    setViewRange((currentRange) => {
      const previousRange = clampRange(currentRange, previous.length);
      const wasFull = sameRange(previousRange, fullRange(previous.length));
      if (wasFull) return fullRange(chartData.length);

      const span = Math.max(1, previousRange.end - previousRange.start + 1);
      const wasFollowingLatest = previousRange.end >= previous.length - 1;
      const nextEnd = wasFollowingLatest
        ? chartData.length - 1
        : previousRange.start + span - 1;
      const nextStart = wasFollowingLatest
        ? chartData.length - span
        : previousRange.start;
      return clampRange({ start: nextStart, end: nextEnd }, chartData.length);
    });
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [chartData, chartData.length, chartDataSignature, initialViewDays]);

  useEffect(() => {
    if (chartData.length <= 0) return;
    if (previousInitialViewDaysRef.current === initialViewDays) return;
    previousInitialViewDaysRef.current = initialViewDays;
    if (initialViewDays === undefined) return;
    setViewRange(rangeForDays(chartData, initialViewDays));
    setHoverIndex(null);
    setPinnedIndex(null);
  }, [chartData, chartDataSignature, initialViewDays]);

  useEffect(() => {
    if (!canPersistSettings || storedSettings.barDisplayLayout == null) {
      setBarDisplayLayout(barLayout);
    }
  }, [barLayout, canPersistSettings, storedSettings.barDisplayLayout]);

  useEffect(() => {
    if (!canTransformValues) {
      transformModeTouchedRef.current = false;
      setTransformMode("value");
      return;
    }
    if (!transformModeTouchedRef.current) {
      setTransformMode(
        defaultTransformMode(initialTransformMode, canTransformValues),
      );
    }
  }, [canTransformValues, initialTransformMode]);

  useEffect(() => {
    if (!canPersistSettings) {
      setLastValueLabelsVisible(showLastValueLabels);
    }
  }, [canPersistSettings, showLastValueLabels]);

  useEffect(() => {
    if (!canPersistSettings) return;
    if (skipNextSettingsWriteRef.current) {
      skipNextSettingsWriteRef.current = false;
      return;
    }
    writeSeriesChartSettings(chartSettingsScope, {
      showGrid,
      showCrosshair,
      density,
      chartHeightScale,
      barDisplayLayout,
      showLastValueLabels: lastValueLabelsVisible,
      seriesOrder,
      visibleKeys: [...visibleKeys],
    });
  }, [
    barDisplayLayout,
    canPersistSettings,
    chartHeightScale,
    chartSettingsScope,
    density,
    lastValueLabelsVisible,
    showCrosshair,
    showGrid,
    seriesOrder,
    visibleKeys,
  ]);

  useEffect(() => {
    if (!showToolbar || !toolbarRef.current) {
      setToolbarHeight(0);
      return;
    }
    const el = toolbarRef.current;
    const update = () =>
      setToolbarHeight(Math.ceil(el.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    showToolbar,
    stableSeries.length,
    visibleSeries.length,
    expanded,
    density,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!expanded || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (shortcutsOpen) {
        event.preventDefault();
        setShortcutsOpen(false);
        return;
      }
      if (dataTableOpen) {
        event.preventDefault();
        setDataTableOpen(false);
        return;
      }
      setExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dataTableOpen, expanded, shortcutsOpen]);

  // KLineData rows. We need a 'close' for klinecharts even though the
  // candle/area is hidden — set it to the first series' value so the
  // crosshair/y-axis range still tracks something sensible.
  const klineData = useMemo<KLineData[]>(() => {
    const primaryKey = visibleSeries[0]?.key;
    return displayData.map((row) => {
      const rowValues = visibleSeries
        .map((s) => parseSeriesValue(row[s.key]))
        .filter((value) => Number.isFinite(value));
      const primaryValue = primaryKey ? parseSeriesValue(row[primaryKey]) : 0;
      const fallbackValue = rowValues[0];
      const v = Number.isFinite(primaryValue)
        ? primaryValue
        : (fallbackValue ?? 0);
      const high = rowValues.length ? Math.max(...rowValues, v) : v;
      const low = rowValues.length ? Math.min(...rowValues, v) : v;
      const merged: any = { timestamp: row.__ts, open: v, high, low, close: v };
      for (const s of visibleSeries)
        merged[s.key] = parseSeriesValue(row[s.key]);
      return merged as KLineData;
    });
  }, [displayData, visibleSeries]);

  const svgModel = useMemo(() => {
    const pointValues = displayData.flatMap((row) =>
      visibleSeries
        .map((s) => parseSeriesValue(row[s.key]))
        .filter((value) => Number.isFinite(value)),
    );
    const barSeries = visibleSeries.filter((s) => (s.type ?? "line") === "bar");
    const stackedBarValues =
      barDisplayLayout === "stack" && barSeries.length > 1
        ? displayData.flatMap((row) => {
            let positive = 0;
            let negative = 0;
            for (const s of barSeries) {
              const value = parseSeriesValue(row[s.key]);
              if (!Number.isFinite(value)) continue;
              if (value >= 0) positive += value;
              else negative += value;
            }
            return [positive, negative];
          })
        : [];
    const values = [...pointValues, ...stackedBarValues].filter((value) =>
      Number.isFinite(value),
    );
    if (values.length === 0) return null;

    const width = 1000;
    const height = 360;
    const left = 10;
    const right = showYAxis ? 92 : 10;
    const top = 12;
    const bottom = showXAxis ? 26 : 12;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const baselineValue = transformMode === "indexed" ? 100 : 0;
    const showBaseline =
      zeroLine || transformMode === "changePct" || transformMode === "indexed";
    const rawMin = Math.min(...values, showBaseline ? baselineValue : Infinity);
    const rawMax = Math.max(
      ...values,
      showBaseline ? baselineValue : -Infinity,
    );
    const span = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
    const min = rawMin - span * 0.08;
    const max = rawMax + span * 0.08;
    const yOf = (value: number) =>
      top + ((max - value) / (max - min)) * plotHeight;
    const xOf = (index: number) =>
      left +
      (displayData.length <= 1
        ? plotWidth
        : (index / (displayData.length - 1)) * plotWidth);
    const baselineY = yOf(baselineValue);
    const barBaseY =
      rawMin >= 0 && !showBaseline
        ? top + plotHeight
        : rawMax <= 0 && !showBaseline
          ? top
          : baselineY;
    const ticks = Array.from({ length: 5 }, (_, i) => {
      const value = max - ((max - min) * i) / 4;
      return { value, y: yOf(value) };
    });
    return {
      width,
      height,
      left,
      top,
      plotWidth,
      plotHeight,
      min,
      max,
      baselineValue,
      baselineY,
      showBaseline,
      barBaseY,
      xOf,
      yOf,
      ticks,
    };
  }, [
    barDisplayLayout,
    displayData,
    visibleSeries,
    showXAxis,
    showYAxis,
    zeroLine,
    transformMode,
  ]);

  const hoverDatum = useMemo<HoverDatum | null>(() => {
    if (!svgModel || hoverIndex == null || !displayData[hoverIndex])
      return null;
    const row = displayData[hoverIndex];
    const items = visibleSeries
      .map((s) => {
        const value = parseSeriesValue(row[s.key]);
        if (!Number.isFinite(value)) return null;
        return {
          key: s.key,
          label: s.label,
          color: s.color,
          value,
          y: svgModel.yOf(value),
          type: s.type ?? "line",
        };
      })
      .filter(Boolean) as HoverDatum["items"];
    if (!items.length) return null;
    return {
      index: hoverIndex,
      row,
      x: svgModel.xOf(hoverIndex),
      items,
    };
  }, [displayData, hoverIndex, svgModel, visibleSeries]);

  const readoutDatum = useMemo<HoverDatum | null>(() => {
    if (pinnedIndex != null && svgModel && displayData[pinnedIndex]) {
      const row = displayData[pinnedIndex];
      const items = visibleSeries
        .map((s) => {
          const value = parseSeriesValue(row[s.key]);
          if (!Number.isFinite(value)) return null;
          return {
            key: s.key,
            label: s.label,
            color: s.color,
            value,
            y: svgModel.yOf(value),
            type: s.type ?? "line",
          };
        })
        .filter(Boolean) as HoverDatum["items"];
      if (items.length) {
        return {
          index: pinnedIndex,
          row,
          x: svgModel.xOf(pinnedIndex),
          items,
        };
      }
    }
    if (hoverDatum) return hoverDatum;
    if (!svgModel || !displayData.length) return null;
    for (let i = displayData.length - 1; i >= 0; i--) {
      const row = displayData[i];
      const items = visibleSeries
        .map((s) => {
          const value = parseSeriesValue(row[s.key]);
          if (!Number.isFinite(value)) return null;
          return {
            key: s.key,
            label: s.label,
            color: s.color,
            value,
            y: svgModel.yOf(value),
            type: s.type ?? "line",
          };
        })
        .filter(Boolean) as HoverDatum["items"];
      if (items.length) {
        return {
          index: i,
          row,
          x: svgModel.xOf(i),
          items,
        };
      }
    }
    return null;
  }, [displayData, hoverDatum, pinnedIndex, svgModel, visibleSeries]);

  const readoutPrevRow = readoutDatum
    ? (displayData[readoutDatum.index - 1] ?? null)
    : null;
  const readoutBaseRow =
    readoutDatum && transformBaseIndex != null
      ? (displayData[transformBaseIndex] ?? null)
      : readoutDatum
        ? (displayData[0] ?? null)
        : null;
  const transformBaseMarker = useMemo(() => {
    if (
      transformMode === "value" ||
      transformBaseIndex == null ||
      !svgModel ||
      !displayData[transformBaseIndex]
    ) {
      return null;
    }
    const x = svgModel.xOf(transformBaseIndex);
    return {
      x,
      labelX: Math.min(
        svgModel.left + svgModel.plotWidth - 36,
        Math.max(svgModel.left + 4, x + 4),
      ),
      date: formatDateLabel(displayData[transformBaseIndex].date),
    };
  }, [displayData, svgModel, transformBaseIndex, transformMode]);
  const readoutCursorMarker = useMemo(() => {
    if (hoverIndex == null || !svgModel || !displayData[hoverIndex]) {
      return null;
    }
    const x = svgModel.xOf(hoverIndex);
    return {
      x,
      labelX: Math.min(
        svgModel.left + svgModel.plotWidth - 28,
        Math.max(svgModel.left + 4, x + 4),
      ),
    };
  }, [displayData, hoverIndex, svgModel]);
  const pinnedComparisonDatum = useMemo<HoverDatum | null>(() => {
    if (pinnedIndex == null || !svgModel || displayData.length === 0)
      return null;
    const index =
      hoverIndex != null && hoverIndex !== pinnedIndex
        ? hoverIndex
        : displayData.length - 1 !== pinnedIndex
          ? displayData.length - 1
          : -1;
    if (index < 0 || !displayData[index]) return null;
    const row = displayData[index];
    const items = visibleSeries
      .map((s) => {
        const value = parseSeriesValue(row[s.key]);
        if (!Number.isFinite(value)) return null;
        return {
          key: s.key,
          label: s.label,
          color: s.color,
          value,
          y: svgModel.yOf(value),
          type: s.type ?? "line",
        };
      })
      .filter(Boolean) as HoverDatum["items"];
    if (!items.length) return null;
    return {
      index,
      row,
      x: svgModel.xOf(index),
      items,
    };
  }, [displayData, hoverIndex, pinnedIndex, svgModel, visibleSeries]);
  const pinnedComparisonMeta = useMemo(() => {
    if (
      pinnedIndex == null ||
      !pinnedComparisonDatum ||
      !displayData[pinnedIndex]
    ) {
      return null;
    }
    const fromTime = rowTime(displayData[pinnedIndex]);
    const toTime = rowTime(pinnedComparisonDatum.row);
    const points = Math.abs(pinnedComparisonDatum.index - pinnedIndex);
    const days =
      fromTime != null && toTime != null
        ? Math.max(0, Math.round(Math.abs(toTime - fromTime) / 86_400_000))
        : null;
    return {
      points,
      days,
      label:
        days == null
          ? `${points.toLocaleString()}개 포인트`
          : `${points.toLocaleString()}포인트 · ${days.toLocaleString()}일`,
    };
  }, [displayData, pinnedComparisonDatum, pinnedIndex]);
  const rangeSeriesStats = useMemo<RangeSeriesStat[]>(() => {
    if (displayData.length < 2) return [];
    return visibleSeries
      .map((s) => {
        const values = displayData
          .map((row) => parseSeriesValue(row[s.key]))
          .filter(Number.isFinite);
        const first = values[0];
        const last = values[values.length - 1];
        if (first == null || last == null) return null;
        const change = last - first;
        if (!Number.isFinite(change)) return null;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const spread = max - min;
        const changePct =
          transformMode === "value" && first !== 0
            ? (change / Math.abs(first)) * 100
            : null;
        const spreadPct =
          transformMode === "value" && min !== 0
            ? (spread / Math.abs(min)) * 100
            : null;
        if (![min, max, spread].every(Number.isFinite)) return null;
        return {
          key: s.key,
          label: s.label,
          color: s.color,
          first,
          last,
          change,
          changePct:
            changePct != null && Number.isFinite(changePct) ? changePct : null,
          min,
          max,
          spread,
          spreadPct:
            spreadPct != null && Number.isFinite(spreadPct) ? spreadPct : null,
          up: change >= 0,
        };
      })
      .filter(Boolean) as RangeSeriesStat[];
  }, [displayData, transformMode, visibleSeries]);
  const rangeComparisonSummary = useMemo<RangeComparisonSummary | null>(() => {
    if (rangeSeriesStats.length < 2) return null;
    const score = (item: RangeSeriesStat) =>
      item.changePct != null ? item.changePct : item.change;
    const sorted = [...rangeSeriesStats].sort((a, b) => score(b) - score(a));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (!best || !worst) return null;

    const firstTwo = visibleSeries.slice(0, 2);
    let correlation: number | null = null;
    if (firstTwo.length === 2 && visibleData.length >= 4) {
      const [aSeries, bSeries] = firstTwo;
      const aReturns: number[] = [];
      const bReturns: number[] = [];
      for (let i = 1; i < visibleData.length; i++) {
        const aPrev = parseSeriesValue(visibleData[i - 1][aSeries.key]);
        const aNow = parseSeriesValue(visibleData[i][aSeries.key]);
        const bPrev = parseSeriesValue(visibleData[i - 1][bSeries.key]);
        const bNow = parseSeriesValue(visibleData[i][bSeries.key]);
        if (
          !Number.isFinite(aPrev) ||
          !Number.isFinite(aNow) ||
          !Number.isFinite(bPrev) ||
          !Number.isFinite(bNow) ||
          aPrev === 0 ||
          bPrev === 0
        ) {
          continue;
        }
        aReturns.push(((aNow - aPrev) / Math.abs(aPrev)) * 100);
        bReturns.push(((bNow - bPrev) / Math.abs(bPrev)) * 100);
      }
      correlation = pearsonCorrelation(aReturns, bReturns);
    }

    return {
      best,
      worst,
      gap: score(best) - score(worst),
      correlation,
      correlationLabel:
        correlation == null ? null : correlationLabel(correlation),
    };
  }, [rangeSeriesStats, visibleData, visibleSeries]);
  const rankedRangeSeriesStats = useMemo(() => {
    const score = (item: RangeSeriesStat) =>
      item.changePct != null ? item.changePct : item.change;
    return [...rangeSeriesStats].sort((a, b) => score(b) - score(a));
  }, [rangeSeriesStats]);
  const rangeSeriesStatsByKey = useMemo(() => {
    return new Map(rangeSeriesStats.map((item) => [item.key, item]));
  }, [rangeSeriesStats]);
  const focusRangeExtremes = useCallback(() => {
    if (!rangeComparisonSummary) return;
    soloReturnSeriesRef.current = new Set(visibleKeys);
    setVisibleKeys(
      new Set([
        rangeComparisonSummary.best.key,
        rangeComparisonSummary.worst.key,
      ]),
    );
    setShowVisibleSeriesOnly(true);
  }, [rangeComparisonSummary, visibleKeys]);
  const rangeExtremeMarkers = useMemo<RangeExtremeMarker[]>(() => {
    if (!svgModel || displayData.length < 2) return [];
    const priorityKeys = new Set(
      rankedRangeSeriesStats.slice(0, 6).map((item) => item.key),
    );

    return visibleSeries
      .filter((seriesItem) => priorityKeys.has(seriesItem.key))
      .flatMap((seriesItem) => {
        let high: { value: number; index: number } | null = null;
        let low: { value: number; index: number } | null = null;

        displayData.forEach((row, index) => {
          const value = parseSeriesValue(row[seriesItem.key]);
          if (!Number.isFinite(value)) return;
          if (!high || value > high.value) high = { value, index };
          if (!low || value < low.value) low = { value, index };
        });

        if (!high || !low) return [];
        const highMarker = high as { value: number; index: number };
        const lowMarker = low as { value: number; index: number };
        const labelOffset = 9;
        const clampLabelX = (x: number) =>
          Math.max(
            svgModel.left + 8,
            Math.min(svgModel.left + svgModel.plotWidth - 8, x),
          );
        const clampLabelY = (y: number) =>
          Math.max(
            svgModel.top + 8,
            Math.min(svgModel.top + svgModel.plotHeight - 8, y),
          );
        const highX = svgModel.xOf(highMarker.index);
        const highY = svgModel.yOf(highMarker.value);
        const lowX = svgModel.xOf(lowMarker.index);
        const lowY = svgModel.yOf(lowMarker.value);
        const markers: RangeExtremeMarker[] = [
          {
            key: `${seriesItem.key}-high`,
            label: seriesItem.label,
            color: seriesItem.color,
            kind: "H",
            index: highMarker.index,
            value: highMarker.value,
            x: highX,
            y: highY,
            labelX: clampLabelX(highX),
            labelY: clampLabelY(highY - labelOffset),
          },
        ];
        if (
          lowMarker.index !== highMarker.index ||
          lowMarker.value !== highMarker.value
        ) {
          markers.push({
            key: `${seriesItem.key}-low`,
            label: seriesItem.label,
            color: seriesItem.color,
            kind: "L",
            index: lowMarker.index,
            value: lowMarker.value,
            x: lowX,
            y: lowY,
            labelX: clampLabelX(lowX),
            labelY: clampLabelY(lowY + labelOffset),
          });
        }
        return markers;
      });
  }, [displayData, rankedRangeSeriesStats, svgModel, visibleSeries]);
  const lastValueMarkers = useMemo<LastValueMarker[]>(() => {
    if (
      !lastValueLabelsVisible ||
      !svgModel ||
      !displayData.length ||
      !showYAxis
    ) {
      return [];
    }

    const rawMarkers = visibleSeries
      .map((s) => {
        for (let i = displayData.length - 1; i >= 0; i--) {
          const value = parseSeriesValue(displayData[i][s.key]);
          if (!Number.isFinite(value)) continue;
          const stats = rangeSeriesStatsByKey.get(s.key);
          const changeLabel =
            stats?.changePct != null
              ? `${stats.changePct >= 0 ? "+" : ""}${stats.changePct.toFixed(2)}%`
              : stats
                ? `${stats.change >= 0 ? "+" : ""}${displayValueFormatter(stats.change)}`
                : null;
          return {
            key: s.key,
            label: s.label,
            color: s.color,
            value,
            changeLabel,
            y: svgModel.yOf(value),
          };
        }
        return null;
      })
      .filter(Boolean) as Array<Omit<LastValueMarker, "labelY">>;

    return spreadMarkers(
      rawMarkers,
      svgModel.top + 8,
      svgModel.top + svgModel.plotHeight - 8,
    );
  }, [
    displayData,
    displayValueFormatter,
    lastValueLabelsVisible,
    rangeSeriesStatsByKey,
    showYAxis,
    svgModel,
    visibleSeries,
  ]);
  const readoutValueMarkers = useMemo<LastValueMarker[]>(() => {
    if (
      !readoutDatum ||
      !svgModel ||
      !showYAxis ||
      (pinnedIndex == null && hoverIndex == null)
    ) {
      return [];
    }
    const rawMarkers = readoutDatum.items.slice(0, 4).map((item) => ({
      key: item.key,
      label: item.label,
      color: item.color,
      value: item.value,
      y: item.y,
    }));
    return spreadMarkers(
      rawMarkers,
      svgModel.top + 8,
      svgModel.top + svgModel.plotHeight - 8,
    );
  }, [hoverIndex, pinnedIndex, readoutDatum, showYAxis, svgModel]);

  const syncChartLayout = useCallback(() => {
    if (layoutRaf.current !== null) {
      cancelAnimationFrame(layoutRaf.current);
    }
    layoutRaf.current = requestAnimationFrame(() => {
      layoutRaf.current = requestAnimationFrame(() => {
        layoutRaf.current = null;
        const chart = chartRef.current;
        const el = containerRef.current;
        if (!chart || !el) return;
        if (klineData.length > 1) {
          const plotWidth = Math.max(80, el.clientWidth - (showYAxis ? 52 : 0));
          // klinecharts treats sub-pixel bar spacing inconsistently. Keep the
          // full dataset fit stable without letting zoom-out create phantom
          // left/right gaps on compact comparison charts.
          chart.setBarSpace(Math.max(1, plotWidth / klineData.length));
        }
        // Keep klinecharts in pixel-distance limit mode. Calling
        // setLeft/RightMinVisibleBarCount switches its internal clamp mode and
        // can reintroduce blank margins when users zoom or pan.
        chart.setMaxOffsetLeftDistance(0);
        chart.setMaxOffsetRightDistance(0);
        chart.setOffsetRightDistance(0);
        if (klineData.length > 1) {
          chart.scrollToRealTime(0);
        }
        chart.resize();
      });
    });
  }, [klineData.length, showYAxis]);

  useEffect(
    () => () => {
      if (layoutRaf.current !== null) cancelAnimationFrame(layoutRaf.current);
    },
    [],
  );

  // Register a one-shot indicator that simply echoes each series value
  // straight back, then klinecharts renders each `figure` (line or bar).
  useEffect(() => {
    const indicatorName = indicatorNameRef.current;
    const figures = visibleSeries.map<any>((s) => ({
      key: s.key,
      title: `${s.label}: `,
      type: s.type === "bar" ? "bar" : "line",
      baseValue: 0,
      styles: () => {
        if (s.type === "bar") {
          return {
            style: "fill",
            color: s.color,
            borderColor: s.color,
          };
        }
        return {
          style: s.dashed ? "dashed" : "solid",
          color: s.color,
          size: 2,
          smooth: false,
          dashedValue: s.dashed ? [4, 2] : [],
        };
      },
    }));

    registerIndicator({
      name: indicatorName,
      shortName: " ",
      precision: 2,
      calcParams: [],
      shouldOhlc: false,
      shouldFormatBigNumber: false,
      visible: true,
      zLevel: 0,
      extendData: null,
      series: "normal" as any,
      minValue: null,
      maxValue: null,
      styles: null,
      figures,
      regenerateFigures: null,
      createTooltipDataSource: null,
      draw: null,
      calc: (dataList) =>
        dataList.map((d: any) => {
          const out: Record<string, number> = {};
          for (const s of visibleSeries)
            out[s.key] = parseSeriesValue(d[s.key]);
          return out;
        }),
    });
    // No unregister API — re-registering with the same name overrides.
  }, [visibleSeries]);

  useEffect(() => {
    if (!containerRef.current) return;
    const muted = readToken(
      "--muted-foreground",
      isDark ? "#9ca3af" : "#6b7280",
    );
    const fg = readToken("--foreground", isDark ? "#e5e7eb" : "#111827");
    const border = readToken("--border", isDark ? "#1f2937" : "#e5e7eb");

    const chart = init(containerRef.current, {
      styles: {
        candle: {
          // We hide the main candle/area — only the custom indicator renders.
          type: "area",
          area: {
            lineSize: 0,
            lineColor: "transparent",
            value: "close",
            smooth: false,
            backgroundColor: [
              { offset: 0, color: "transparent" },
              { offset: 1, color: "transparent" },
            ],
            point: {
              show: false,
              color: "transparent",
              radius: 0,
              rippleColor: "transparent",
              rippleRadius: 0,
              animation: false,
              animationDuration: 0,
            },
          },
          priceMark: {
            show: false,
            high: {
              show: false,
              color: muted,
              textOffset: 0,
              textSize: 9,
              textFamily: "Helvetica",
              textWeight: "normal",
            },
            low: {
              show: false,
              color: muted,
              textOffset: 0,
              textSize: 9,
              textFamily: "Helvetica",
              textWeight: "normal",
            },
            last: {
              show: false,
              upColor: muted,
              downColor: muted,
              noChangeColor: muted,
              line: {
                show: false,
                style: "dashed",
                dashedValue: [3, 3],
                size: 1,
              },
              text: {
                show: false,
                size: 9,
                paddingLeft: 2,
                paddingRight: 2,
                paddingTop: 1,
                paddingBottom: 1,
                style: "fill",
                color: "#fff",
                borderColor: "transparent",
                borderStyle: "solid",
                borderSize: 0,
                borderRadius: 2,
                backgroundColor: muted,
                family: "Helvetica",
                weight: "normal",
              },
            },
          },
          tooltip: {
            showRule: "none",
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
        },
        grid: {
          show: showGrid,
          horizontal: {
            show: showGrid,
            color: border,
            style: "dashed",
            dashedValue: [2, 4],
            size: 1,
          },
          vertical: {
            show: showGrid,
            color: border,
            style: "dashed",
            dashedValue: [2, 4],
            size: 1,
          },
        },
        indicator: {
          ohlc: { upColor: muted, downColor: muted, noChangeColor: muted },
          bars: visibleSeries
            .filter((s) => s.type === "bar")
            .map((s) => ({
              style: "fill",
              borderStyle: "solid",
              borderSize: 1,
              borderColor: s.color,
              color: s.color,
              noChangeColor: s.color,
            })),
          lines: visibleSeries
            .filter((s) => s.type !== "bar")
            .map((s) => ({
              style: s.dashed ? "dashed" : "solid",
              smooth: false,
              size: 1.5,
              color: s.color,
              dashedValue: s.dashed ? [4, 2] : [],
            })),
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
          show: showXAxis,
          axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: {
            show: showXAxis,
            color: muted,
            family: "Helvetica",
            weight: "normal",
            size: 9,
            marginStart: 4,
            marginEnd: 4,
          },
        },
        yAxis: {
          show: showYAxis,
          position: "right",
          inside: false,
          reverse: false,
          size: showYAxis ? 48 : 0,
          axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: {
            show: showYAxis,
            color: muted,
            family: "Helvetica",
            weight: "normal",
            size: 9,
            marginStart: 4,
            marginEnd: 4,
          },
        },
        separator: {
          size: 0,
          color: border,
          fill: true,
          activeBackgroundColor: "transparent",
        },
        crosshair: {
          show: showCrosshair,
          horizontal: {
            show: false,
            line: {
              show: false,
              style: "dashed",
              dashedValue: [3, 3],
              size: 1,
              color: muted,
            },
            text: {
              show: false,
              style: "fill",
              color: "#fff",
              size: 9,
              family: "Helvetica",
              weight: "normal",
              borderStyle: "solid",
              borderDashedValue: [],
              borderSize: 0,
              borderColor: "transparent",
              borderRadius: 2,
              paddingLeft: 2,
              paddingRight: 2,
              paddingTop: 1,
              paddingBottom: 1,
              backgroundColor: muted,
            },
          },
          vertical: {
            show: showCrosshair,
            line: {
              show: true,
              style: "dashed",
              dashedValue: [3, 3],
              size: 1,
              color: muted,
            },
            text: {
              show: showXAxis,
              style: "fill",
              color: "#fff",
              size: 9,
              family: "Helvetica",
              weight: "normal",
              borderStyle: "solid",
              borderDashedValue: [],
              borderSize: 0,
              borderColor: "transparent",
              borderRadius: 2,
              paddingLeft: 3,
              paddingRight: 3,
              paddingTop: 2,
              paddingBottom: 2,
              backgroundColor: muted,
            },
          },
        },
      } as any,
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setTimezone("UTC");
    chart.setZoomEnabled(true);
    chart.setScrollEnabled(true);
    chart.setMaxOffsetLeftDistance(0);
    chart.setMaxOffsetRightDistance(0);
    chart.setOffsetRightDistance(0);

    chart.setCustomApi({
      formatBigNumber: (v: string | number) =>
        displayValueFormatter(typeof v === "number" ? v : Number(v)),
    });

    // Mount the custom indicator on the main candle pane (stacked on top of
    // the hidden area). Series render in indicator order.
    chart.createIndicator(indicatorNameRef.current, true, {
      id: "candle_pane",
    });

    if (zeroLine) {
      // Use an overlay to draw the zero reference line. We use the
      // "simpleAnnotation"... actually simpler: render a separate indicator
      // that just paints a flat 0 line. Skip if klinecharts dynamic overlay is fiddly.
      // For now, baseValue: 0 on bar figures gives an implicit zero baseline.
    }

    chart.applyNewData(klineData);
    requestAnimationFrame(syncChartLayout);

    const el = containerRef.current;
    const ro = new ResizeObserver(syncChartLayout);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (el) dispose(el);
      chartRef.current = null;
    };
    // Re-init when visual/series config changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDark,
    visibleSeries,
    showGrid,
    showCrosshair,
    showXAxis,
    showYAxis,
    valueFormatter,
    displayValueFormatter,
    zeroLine,
    barDisplayLayout,
    syncChartLayout,
  ]);

  // Push data updates without re-init.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyNewData(klineData);
    requestAnimationFrame(syncChartLayout);
  }, [klineData, syncChartLayout]);

  const toggleSeries = useCallback((key: string) => {
    soloReturnSeriesRef.current = null;
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isolateSeries = useCallback(
    (key: string) => {
      setVisibleKeys((prev) => {
        const isSolo = prev.size === 1 && prev.has(key);
        if (isSolo) {
          const restored = new Set(
            [
              ...(soloReturnSeriesRef.current ??
                new Set(stableSeries.map((s) => s.key))),
            ].filter((item) =>
              stableSeries.some((seriesItem) => seriesItem.key === item),
            ),
          );
          soloReturnSeriesRef.current = null;
          return restored.size > 0
            ? restored
            : new Set(stableSeries.map((s) => s.key));
        }
        soloReturnSeriesRef.current = new Set(prev);
        return new Set([key]);
      });
    },
    [stableSeries],
  );
  const restorePreviousSeriesSelection = useCallback(() => {
    const restored = new Set(
      [
        ...(soloReturnSeriesRef.current ??
          new Set(stableSeries.map((s) => s.key))),
      ].filter((item) =>
        stableSeries.some((seriesItem) => seriesItem.key === item),
      ),
    );
    soloReturnSeriesRef.current = null;
    setVisibleKeys(
      restored.size > 0 ? restored : new Set(stableSeries.map((s) => s.key)),
    );
  }, [stableSeries]);
  const showAllSeries = useCallback(() => {
    soloReturnSeriesRef.current = null;
    setVisibleKeys(new Set(stableSeries.map((s) => s.key)));
  }, [stableSeries]);

  const handleSeriesLegendClick = useCallback(
    (key: string, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (event.shiftKey || event.altKey) {
        isolateSeries(key);
      } else {
        toggleSeries(key);
      }
    },
    [isolateSeries, toggleSeries],
  );
  const moveSeriesBefore = useCallback(
    (sourceKey: string, targetKey: string) => {
      if (sourceKey === targetKey) return;
      setSeriesOrder((prev) => {
        const keys = orderedSeries.map((item) => item.key);
        const base = prev.length > 0 ? prev : keys;
        const next = base.filter((key) => keys.includes(key));
        for (const key of keys) {
          if (!next.includes(key)) next.push(key);
        }
        const sourceIndex = next.indexOf(sourceKey);
        const targetIndex = next.indexOf(targetKey);
        if (sourceIndex < 0 || targetIndex < 0) return next;
        const [moved] = next.splice(sourceIndex, 1);
        const adjustedTargetIndex =
          sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        next.splice(adjustedTargetIndex, 0, moved);
        return next;
      });
    },
    [orderedSeries],
  );
  const handleSeriesDragStart = useCallback(
    (key: string, event: ReactDragEvent<HTMLElement>) => {
      setDraggedSeriesKey(key);
      setDragOverSeriesKey(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", key);
    },
    [],
  );
  const handleSeriesDragOver = useCallback(
    (key: string, event: ReactDragEvent<HTMLElement>) => {
      if (!draggedSeriesKey || draggedSeriesKey === key) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverSeriesKey(key);
    },
    [draggedSeriesKey],
  );
  const handleSeriesDrop = useCallback(
    (key: string, event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault();
      const sourceKey = draggedSeriesKey;
      setDraggedSeriesKey(null);
      setDragOverSeriesKey(null);
      if (!sourceKey || sourceKey === key) return;
      moveSeriesBefore(sourceKey, key);
    },
    [draggedSeriesKey, moveSeriesBefore],
  );
  const clearSeriesDrag = useCallback(() => {
    setDraggedSeriesKey(null);
    setDragOverSeriesKey(null);
  }, []);

  const resetView = useCallback(() => {
    setViewRange(fullRange(chartData.length));
    setHoverIndex(null);
    setPinnedIndex(null);
    syncChartLayout();
  }, [chartData.length, syncChartLayout]);

  const changeChartHeightScale = useCallback((next: number) => {
    setChartHeightScale(
      Math.min(
        MAX_SERIES_CHART_HEIGHT_SCALE,
        Math.max(MIN_SERIES_CHART_HEIGHT_SCALE, next),
      ),
    );
  }, []);

  const resetChartSettings = useCallback(() => {
    soloReturnSeriesRef.current = null;
    transformModeTouchedRef.current = false;
    setSeriesOrder(stableSeries.map((s) => s.key));
    setVisibleKeys(new Set(stableSeries.map((s) => s.key)));
    setShowGrid(true);
    setShowCrosshair(true);
    setDensity("standard");
    setChartHeightScale(1);
    setTransformMode(
      defaultTransformMode(initialTransformMode, canTransformValues),
    );
    setBarDisplayLayout(barLayout);
    setLastValueLabelsVisible(showLastValueLabels);
    setViewRange(rangeForDays(chartData, initialViewDays ?? null));
    setSeriesSearch("");
    setShowVisibleSeriesOnly(false);
    setDraggedSeriesKey(null);
    setDragOverSeriesKey(null);
    setDataTableOpen(false);
    setShortcutsOpen(false);
    setExpanded(false);
    setHoverIndex(null);
    setPinnedIndex(null);
    syncChartLayout();
  }, [
    barLayout,
    canTransformValues,
    chartData,
    initialTransformMode,
    initialViewDays,
    showLastValueLabels,
    stableSeries,
    syncChartLayout,
  ]);

  const applyQuickRange = useCallback(
    (days: number | null) => {
      setViewRange(rangeForDays(chartData, days));
      setHoverIndex(null);
      syncChartLayout();
    },
    [chartData, syncChartLayout],
  );

  const cycleQuickRange = useCallback(
    (direction: "previous" | "next") => {
      if (!showRangeControls || chartData.length === 0) return;
      const currentIndex = activeQuickRange
        ? QUICK_RANGES.findIndex((option) => option.key === activeQuickRange)
        : direction === "next"
          ? -1
          : QUICK_RANGES.length;
      const nextIndex =
        direction === "next"
          ? Math.min(QUICK_RANGES.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
      const next = QUICK_RANGES[nextIndex];
      if (next) applyQuickRange(next.lookbackDays);
    },
    [activeQuickRange, applyQuickRange, chartData.length, showRangeControls],
  );

  const exportChartImage = useCallback(async () => {
    const chart = chartRef.current;
    if (!chart || typeof document === "undefined") return;
    const background = readToken("--card", isDark ? "#020617" : "#ffffff");
    const first = chartData[clampedViewRange.start]?.date ?? "series";
    const last = chartData[clampedViewRange.end]?.date ?? "chart";
    const filename = `series-${String(first).slice(0, 10)}-${String(last).slice(0, 10)}.png`;
    const baseUrl = chart.getConvertPictureUrl(true, "image/png", background);
    const host = chartAreaRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !svg) {
      downloadUrl(baseUrl, filename);
      return;
    }

    try {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        downloadUrl(baseUrl, filename);
        return;
      }
      ctx.scale(ratio, ratio);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const baseImage = await loadImage(baseUrl);
      ctx.drawImage(baseImage, 0, 0, width, height);

      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(height));
      const serialized = inlineSvgCssVariables(
        new XMLSerializer().serializeToString(clone),
      );
      const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
      const overlayImage = await loadImage(svgUrl);
      ctx.drawImage(overlayImage, 0, 0, width, height);

      downloadUrl(canvas.toDataURL("image/png"), filename);
    } catch {
      downloadUrl(baseUrl, filename);
    }
  }, [chartData, clampedViewRange, isDark]);

  const exportVisibleDataCsv = useCallback(() => {
    if (displayData.length === 0) return;
    const first = displayData[0]?.date ?? "series";
    const last = displayData[displayData.length - 1]?.date ?? "chart";
    const filename = `series-${String(first).slice(0, 10)}-${String(last).slice(0, 10)}.csv`;
    downloadCsv(
      [
        ["date", "gap_days", ...visibleSeries.map((item) => item.label)],
        ...displayData.map((row, index) => {
          const previous = displayData[index - 1];
          const gapDays = previous
            ? Math.max(
                0,
                Math.round(
                  (Number(row.__ts) - Number(previous.__ts)) / 86_400_000,
                ),
              )
            : "";
          return [
            formatDateLabel(row.date),
            gapDays,
            ...visibleSeries.map((item) => {
              const value = parseSeriesValue(row[item.key]);
              return Number.isFinite(value) ? value : "";
            }),
          ];
        }),
      ],
      filename,
    );
  }, [displayData, visibleSeries]);

  const panByBars = useCallback(
    (bars: number) => {
      if (chartData.length <= 2) return;
      const current = clampRange(viewRange, chartData.length);
      setViewRange(
        clampRange(
          { start: current.start + bars, end: current.end + bars },
          chartData.length,
        ),
      );
      setHoverIndex(null);
    },
    [chartData.length, viewRange],
  );

  const zoomByFactor = useCallback(
    (factor: number) => {
      if (chartData.length <= 2) return;
      setViewRange(zoomRange(viewRange, chartData.length, factor));
      setHoverIndex(null);
    },
    [chartData.length, viewRange],
  );

  const panByViewportStep = useCallback(
    (direction: "left" | "right") => {
      const current = clampRange(viewRange, chartData.length);
      const span = Math.max(1, current.end - current.start + 1);
      const step = Math.max(1, Math.round(span * 0.18));
      panByBars(direction === "left" ? -step : step);
      rootRef.current?.focus({ preventScroll: true });
    },
    [chartData.length, panByBars, viewRange],
  );

  const zoomByButton = useCallback(
    (direction: "in" | "out") => {
      zoomByFactor(direction === "in" ? 0.82 : 1.18);
      rootRef.current?.focus({ preventScroll: true });
    },
    [zoomByFactor],
  );

  const jumpToRangeEdge = useCallback(
    (edge: "start" | "end") => {
      if (chartData.length <= 0) return;
      const current = clampRange(viewRange, chartData.length);
      const span = Math.max(1, current.end - current.start + 1);
      const next =
        edge === "start"
          ? { start: 0, end: span - 1 }
          : { start: chartData.length - span, end: chartData.length - 1 };
      setViewRange(clampRange(next, chartData.length));
      setHoverIndex(null);
      rootRef.current?.focus({ preventScroll: true });
    },
    [chartData.length, viewRange],
  );

  const scrubRangeStart = useCallback(
    (start: number) => {
      if (!scrubberEnabled) return;
      const nextStart = Math.min(
        scrubberMaxStart,
        Math.max(0, Math.round(start)),
      );
      setViewRange(
        clampRange(
          { start: nextStart, end: nextStart + scrubberSpan },
          chartData.length,
        ),
      );
      setHoverIndex(null);
      rootRef.current?.focus({ preventScroll: true });
    },
    [chartData.length, scrubberEnabled, scrubberMaxStart, scrubberSpan],
  );

  const scrubRangeFromNavigator = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!scrubberEnabled || chartData.length <= 1) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)),
      );
      const centerIndex = Math.round(ratio * (chartData.length - 1));
      scrubRangeStart(centerIndex - scrubberSpan / 2);
    },
    [chartData.length, scrubRangeStart, scrubberEnabled, scrubberSpan],
  );

  useEffect(() => {
    if (pinnedIndex == null) return;
    if (pinnedIndex < 0 || pinnedIndex >= displayData.length) {
      setPinnedIndex(null);
    }
  }, [displayData.length, pinnedIndex]);

  const focusChartRoot = useCallback((target: EventTarget | null) => {
    if (!isTypingTarget(target)) {
      rootRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const moveKeyboardReadout = useCallback(
    (direction: "left" | "right" | "start" | "end") => {
      if (displayData.length === 0 || chartData.length === 0) return;
      const fallback = readoutDatum?.index ?? displayData.length - 1;
      const currentLocalIndex = Math.min(
        displayData.length - 1,
        Math.max(0, hoverIndex ?? fallback),
      );
      const currentGlobalIndex = clampedViewRange.start + currentLocalIndex;
      const nextGlobalIndex =
        direction === "start"
          ? 0
          : direction === "end"
            ? chartData.length - 1
            : Math.min(
                chartData.length - 1,
                Math.max(
                  0,
                  currentGlobalIndex + (direction === "right" ? 1 : -1),
                ),
              );

      const span = Math.max(1, clampedViewRange.end - clampedViewRange.start);
      const nextRange =
        nextGlobalIndex < clampedViewRange.start
          ? clampRange(
              { start: nextGlobalIndex, end: nextGlobalIndex + span },
              chartData.length,
            )
          : nextGlobalIndex > clampedViewRange.end
            ? clampRange(
                { start: nextGlobalIndex - span, end: nextGlobalIndex },
                chartData.length,
              )
            : clampedViewRange;
      setViewRange(nextRange);
      setHoverIndex(
        Math.min(
          nextRange.end - nextRange.start,
          Math.max(0, nextGlobalIndex - nextRange.start),
        ),
      );
      rootRef.current?.focus({ preventScroll: true });
    },
    [
      chartData.length,
      clampedViewRange,
      displayData.length,
      hoverIndex,
      readoutDatum,
    ],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (isTypingTarget(event.target)) return;
      const current = clampRange(viewRange, chartData.length);
      const span = Math.max(1, current.end - current.start + 1);
      const stepRatio = event.shiftKey ? 0.35 : 0.15;
      const step = Math.max(1, Math.round(span * stepRatio));
      const pageStep = Math.max(1, Math.round(span * 0.8));
      const digitShortcut = /^Digit[1-9]$/.test(event.code)
        ? event.code.slice(-1)
        : /^[1-9]$/.test(event.key)
          ? event.key
          : null;
      const numericIndex =
        digitShortcut == null ? -1 : Number(digitShortcut) - 1;
      const shortcutSeries = orderedSeries[numericIndex];
      const readoutIndex = readoutDatum?.index ?? null;
      const noSystemModifier =
        !event.metaKey && !event.ctrlKey && !event.altKey;

      if (noSystemModifier && shortcutSeries) {
        event.preventDefault();
        if (event.shiftKey) {
          isolateSeries(shortcutSeries.key);
        } else {
          toggleSeries(shortcutSeries.key);
        }
      } else if (noSystemModifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        showAllSeries();
      } else if (event.altKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        setShowVisibleSeriesOnly((value) => !value);
      } else if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        restorePreviousSeriesSelection();
      } else if (event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setLastValueLabelsVisible((v) => !v);
      } else if (event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (showToolbar) setDataTableOpen((v) => !v);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const nextIndex = hoverIndex ?? readoutIndex;
        if (nextIndex != null) {
          setPinnedIndex((prev) => (prev === nextIndex ? null : nextIndex));
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
        panByBars(-step);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        panByBars(step);
      } else if (event.key === "PageUp") {
        event.preventDefault();
        panByBars(-pageStep);
      } else if (event.key === "PageDown") {
        event.preventDefault();
        panByBars(pageStep);
      } else if (noSystemModifier && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        zoomByFactor(0.82);
      } else if (noSystemModifier && (event.key === "-" || event.key === "_")) {
        event.preventDefault();
        zoomByFactor(1.18);
      } else if (noSystemModifier && event.key === "0") {
        event.preventDefault();
        resetView();
      } else if (noSystemModifier && (event.key === "[" || event.key === "{")) {
        event.preventDefault();
        cycleQuickRange("previous");
      } else if (noSystemModifier && (event.key === "]" || event.key === "}")) {
        event.preventDefault();
        cycleQuickRange("next");
      } else if (
        noSystemModifier &&
        event.shiftKey &&
        event.key.toLowerCase() === "r"
      ) {
        event.preventDefault();
        resetChartSettings();
      } else if (event.key === "Home") {
        event.preventDefault();
        setViewRange(clampRange({ start: 0, end: span - 1 }, chartData.length));
        setHoverIndex(null);
      } else if (event.key === "End") {
        event.preventDefault();
        setViewRange(
          clampRange(
            { start: chartData.length - span, end: chartData.length - 1 },
            chartData.length,
          ),
        );
        setHoverIndex(null);
      } else if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (event.key === "Escape" && pinnedIndex != null) {
        event.preventDefault();
        setPinnedIndex(null);
      } else if (event.key === "Escape" && hoverIndex != null) {
        event.preventDefault();
        setHoverIndex(null);
      } else if (event.key === "Escape" && shortcutsOpen) {
        event.preventDefault();
        setShortcutsOpen(false);
      } else if (event.key === "Escape" && dataTableOpen) {
        event.preventDefault();
        setDataTableOpen(false);
      } else if (event.key === "Escape" && expanded) {
        event.preventDefault();
        setExpanded(false);
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
      } else if (noSystemModifier && event.key === ",") {
        event.preventDefault();
        changeChartHeightScale(
          chartHeightScale - SERIES_CHART_HEIGHT_SCALE_STEP,
        );
      } else if (noSystemModifier && event.key === ".") {
        event.preventDefault();
        changeChartHeightScale(
          chartHeightScale + SERIES_CHART_HEIGHT_SCALE_STEP,
        );
      } else if (noSystemModifier && event.key.toLowerCase() === "g") {
        event.preventDefault();
        setShowGrid((v) => !v);
      } else if (noSystemModifier && event.key.toLowerCase() === "x") {
        event.preventDefault();
        setShowCrosshair((v) => !v);
      } else if (noSystemModifier && event.key.toLowerCase() === "p") {
        event.preventDefault();
        if (canTransformValues) {
          transformModeTouchedRef.current = true;
          setTransformMode((v) =>
            v === "value"
              ? "changePct"
              : v === "changePct"
                ? "indexed"
                : "value",
          );
        }
      } else if (noSystemModifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        if (visibleBarSeriesCount > 1) {
          setBarDisplayLayout((v) => (v === "group" ? "stack" : "group"));
        }
      } else if (noSystemModifier && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setLastValueLabelsVisible((v) => !v);
      } else if (
        noSystemModifier &&
        (event.key.toLowerCase() === "t" || event.key.toLowerCase() === "d")
      ) {
        event.preventDefault();
        if (showToolbar) setDataTableOpen((v) => !v);
      } else if (noSystemModifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        exportChartImage();
      }
    },
    [
      chartData.length,
      chartHeightScale,
      changeChartHeightScale,
      cycleQuickRange,
      dataTableOpen,
      exportChartImage,
      hoverIndex,
      moveKeyboardReadout,
      panByBars,
      pinnedIndex,
      readoutDatum,
      resetChartSettings,
      resetView,
      restorePreviousSeriesSelection,
      viewRange,
      canTransformValues,
      expanded,
      orderedSeries,
      shortcutsOpen,
      showToolbar,
      showAllSeries,
      isolateSeries,
      toggleSeries,
      visibleBarSeriesCount,
      zoomByFactor,
    ],
  );

  const updateHoverFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!svgModel || displayData.length === 0) {
        setHoverIndex(null);
        return;
      }
      const rect = chartAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * svgModel.width;
      const y = ((event.clientY - rect.top) / rect.height) * svgModel.height;
      const withinX =
        x >= svgModel.left && x <= svgModel.left + svgModel.plotWidth;
      const withinY =
        y >= svgModel.top && y <= svgModel.top + svgModel.plotHeight;
      if (!withinX || !withinY) {
        setHoverIndex(null);
        return;
      }
      const ratio =
        svgModel.plotWidth > 0 ? (x - svgModel.left) / svgModel.plotWidth : 0;
      const nextIndex = Math.min(
        displayData.length - 1,
        Math.max(0, Math.round(ratio * (displayData.length - 1))),
      );
      setHoverIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    },
    [displayData.length, svgModel],
  );

  const handleWheel = useCallback(
    (event: globalThis.WheelEvent) => {
      if (chartData.length <= 2) return;
      event.preventDefault();
      const horizontalDominant =
        Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (event.shiftKey || horizontalDominant) {
        const current = clampRange(viewRange, chartData.length);
        const span = Math.max(1, current.end - current.start + 1);
        const delta = horizontalDominant ? event.deltaX : event.deltaY;
        const step = Math.max(
          1,
          Math.round((Math.abs(delta) / 120) * Math.max(1, span * 0.12)),
        );
        panByBars(delta > 0 ? step : -step);
        return;
      }
      const rect = chartAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio =
        rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
      const factor = event.deltaY > 0 ? 1.18 : 0.82;
      setViewRange(zoomRange(viewRange, chartData.length, factor, ratio));
      setHoverIndex(null);
    },
    [chartData.length, panByBars, viewRange],
  );

  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const startPinchIfNeeded = useCallback(
    (target: HTMLDivElement) => {
      if (pointerMapRef.current.size < 2 || chartData.length <= 2) {
        pinchRef.current = null;
        return;
      }
      const rect = target.getBoundingClientRect();
      const points = Array.from(pointerMapRef.current.values()).slice(0, 2);
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      if (!Number.isFinite(distance) || distance < 8) {
        pinchRef.current = null;
        return;
      }
      const centerX = (points[0].x + points[1].x) / 2;
      pinchRef.current = {
        distance,
        range: clampRange(viewRange, chartData.length),
        centerRatio: rect.width > 0 ? (centerX - rect.left) / rect.width : 0.5,
      };
      dragRef.current = null;
    },
    [chartData.length, viewRange],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      focusChartRoot(event.target);
      if (chartData.length <= 2) return;
      updateHoverFromPointer(event);
      pointerMapRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      if (pointerMapRef.current.size >= 2) {
        startPinchIfNeeded(event.currentTarget);
        return;
      }
      const current = clampRange(viewRange, chartData.length);
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start: current.start,
        end: current.end,
        width: Math.max(1, event.currentTarget.clientWidth),
      };
    },
    [
      chartData.length,
      focusChartRoot,
      startPinchIfNeeded,
      updateHoverFromPointer,
      viewRange,
    ],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerMapRef.current.has(event.pointerId)) {
        pointerMapRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }
      const pinch = pinchRef.current;
      if (pinch && pointerMapRef.current.size >= 2 && chartData.length > 2) {
        const points = Array.from(pointerMapRef.current.values()).slice(0, 2);
        const distance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        if (Number.isFinite(distance) && distance >= 8) {
          setViewRange(
            zoomRange(
              pinch.range,
              chartData.length,
              pinch.distance / distance,
              pinch.centerRatio,
            ),
          );
          setHoverIndex(null);
        }
        return;
      }
      updateHoverFromPointer(event);
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId || chartData.length <= 2)
        return;
      const span = drag.end - drag.start + 1;
      const barsPerPixel = span / drag.width;
      const shift = Math.round((drag.x - event.clientX) * barsPerPixel);
      setViewRange(
        clampRange(
          { start: drag.start + shift, end: drag.end + shift },
          chartData.length,
        ),
      );
    },
    [chartData.length, updateHoverFromPointer],
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      pointerMapRef.current.delete(event.pointerId);
      if (pointerMapRef.current.size < 2) {
        pinchRef.current = null;
      } else {
        startPinchIfNeeded(event.currentTarget);
      }
      if (
        drag &&
        drag.pointerId === event.pointerId &&
        Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4 &&
        hoverIndex != null
      ) {
        setPinnedIndex((prev) => (prev === hoverIndex ? null : hoverIndex));
      }
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [hoverIndex, startPinchIfNeeded],
  );

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => focusChartRoot(event.target)}
      aria-label="시계열 비교 차트"
      aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Alt+ArrowLeft Alt+ArrowRight Alt+Home Alt+End Home End PageUp PageDown 0 [ ] Shift+R Alt+R Alt+L Alt+D Enter Space Escape F E G X P B M T D S A Comma Period 1 2 3 4 5 6 7 8 9 Shift+1 Shift+2 Shift+3 Shift+4 Shift+5 Shift+6 Shift+7 Shift+8 Shift+9"
      className={cn(
        "w-full bg-card focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        expanded &&
          "fixed inset-3 sm:inset-5 z-50 rounded-xl border border-border shadow-2xl p-3 flex flex-col",
      )}
      style={{
        height: expanded ? undefined : chartAreaHeight + measuredToolbarHeight,
      }}
    >
      {showToolbar && (
        <div ref={toolbarRef} className="mb-2 flex flex-col gap-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleSeries.length === 1 && stableSeries.length > 1 && (
                <button
                  onClick={restorePreviousSeriesSelection}
                  className="shrink-0 rounded border border-primary/35 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary transition-colors hover:border-primary/55 hover:bg-primary/15"
                  title={`${
                    visibleSeries[0]?.label ?? "시리즈"
                  } 단독 보기 상태입니다. 클릭하면 이전 비교 조합으로 돌아갑니다.`}
                  aria-label={`${visibleSeries[0]?.label ?? "시리즈"} 단독 보기 해제, 이전 비교 조합으로 복귀`}
                >
                  SOLO {visibleSeries[0]?.label ?? ""}
                </button>
              )}
              {visibleSeries.length === 2 &&
                stableSeries.length > 2 &&
                soloReturnSeriesRef.current && (
                  <button
                    onClick={restorePreviousSeriesSelection}
                    className="shrink-0 rounded border border-primary/35 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary transition-colors hover:border-primary/55 hover:bg-primary/15"
                    title={`${visibleSeries
                      .map((item) => item.label)
                      .join(
                        " / ",
                      )} 2선 비교 상태입니다. 클릭하면 이전 비교 조합으로 돌아갑니다.`}
                    aria-label="우위/열위 2선 비교 해제, 이전 비교 조합으로 복귀"
                  >
                    PAIR {visibleSeries.map((item) => item.label).join("/")}
                  </button>
                )}
              {hiddenSeriesCount > 0 && visibleSeries.length !== 1 && (
                <button
                  onClick={showAllSeries}
                  className="shrink-0 rounded border border-border/70 bg-muted/20 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  title={`${hiddenSeriesCount.toLocaleString()}개 시리즈가 숨겨져 있습니다. 클릭하거나 A로 모두 다시 표시합니다.`}
                  aria-label={`숨긴 ${hiddenSeriesCount.toLocaleString()}개 시리즈 모두 표시`}
                >
                  숨김 {hiddenSeriesCount}
                </button>
              )}
              <button
                onClick={showAllSeries}
                disabled={hiddenSeriesCount === 0}
                className={cn(
                  "shrink-0 rounded border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
                  hiddenSeriesCount === 0
                    ? "border-border bg-muted/10 text-muted-foreground/45 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
                title={
                  hiddenSeriesCount === 0
                    ? "모든 시리즈가 표시 중입니다"
                    : `숨긴 ${hiddenSeriesCount.toLocaleString()}개 시리즈를 모두 다시 표시 (A)`
                }
                aria-label={
                  hiddenSeriesCount === 0
                    ? "모든 시리즈가 표시 중입니다"
                    : `숨긴 ${hiddenSeriesCount.toLocaleString()}개 시리즈 모두 표시`
                }
              >
                전체
              </button>
              <button
                onClick={() => setShowVisibleSeriesOnly((value) => !value)}
                disabled={visibleSeries.length === stableSeries.length}
                className={cn(
                  "shrink-0 rounded border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
                  showVisibleSeriesOnly
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : visibleSeries.length === stableSeries.length
                      ? "border-border bg-muted/10 text-muted-foreground/45 cursor-not-allowed"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
                title={
                  visibleSeries.length === stableSeries.length
                    ? "숨긴 시리즈가 없어 ON 필터가 필요 없습니다"
                    : showVisibleSeriesOnly
                      ? "전체 시리즈 범례 보기 (Alt+O)"
                      : "켜진 시리즈만 범례에서 보기 (Alt+O)"
                }
                aria-pressed={showVisibleSeriesOnly}
              >
                ON {visibleSeries.length}
              </button>
              {stableSeries.length > 6 && (
                <label className="relative shrink-0">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={seriesSearch}
                    onChange={(event) => setSeriesSearch(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    className="h-7 w-32 rounded border border-border bg-background pl-7 pr-2 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/55 sm:w-40"
                    placeholder="시리즈 검색"
                    aria-label="시리즈 검색"
                    title="시리즈 이름, 키, 차트 타입으로 범례를 필터합니다"
                  />
                </label>
              )}
              {filteredSeries.length === 0 && (
                <span className="shrink-0 rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground">
                  {showVisibleSeriesOnly
                    ? "ON 검색 결과 없음"
                    : "검색 결과 없음"}
                </span>
              )}
              {filteredSeries.map((s) => {
                const visible = visibleKeys.has(s.key);
                const shortcutIndex = orderedSeries.findIndex(
                  (item) => item.key === s.key,
                );
                const shortcut =
                  shortcutIndex >= 0 && shortcutIndex < 9
                    ? String(shortcutIndex + 1)
                    : null;
                const dragging = draggedSeriesKey === s.key;
                const dropTarget =
                  dragOverSeriesKey === s.key && draggedSeriesKey !== s.key;
                return (
                  <span
                    key={s.key}
                    onDragOver={(event) => handleSeriesDragOver(s.key, event)}
                    onDragLeave={() => {
                      if (dragOverSeriesKey === s.key)
                        setDragOverSeriesKey(null);
                    }}
                    onDrop={(event) => handleSeriesDrop(s.key, event)}
                    className={cn(
                      "inline-flex items-center rounded border text-[11px] transition-all whitespace-nowrap",
                      visible
                        ? "bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                      dropTarget
                        ? "border-primary shadow-[inset_3px_0_0_var(--primary)]"
                        : visible
                          ? "border-primary/40"
                          : "border-border",
                      dragging && "opacity-45",
                    )}
                  >
                    <span
                      draggable
                      onDragStart={(event) =>
                        handleSeriesDragStart(s.key, event)
                      }
                      onDragEnd={clearSeriesDrag}
                      className="inline-flex h-7 w-5 cursor-grab items-center justify-center border-r border-border/60 text-muted-foreground active:cursor-grabbing"
                      title={`${s.label} 순서 드래그`}
                      aria-label={`${s.label} 시리즈 순서 드래그 핸들`}
                    >
                      <GripVertical size={12} />
                    </span>
                    <button
                      onClick={(event) => handleSeriesLegendClick(s.key, event)}
                      className="inline-flex h-7 items-center gap-1.5 px-2 transition-colors hover:bg-primary/10"
                      title={`${visible ? `${s.label} 숨김` : `${s.label} 표시`}${shortcut ? ` (${shortcut}) · Shift+${shortcut} 단독 보기` : ""} · Shift/Alt 클릭 단독 보기 · 왼쪽 핸들 드래그로 순서 이동`}
                      aria-label={`${s.label} 시리즈 ${visible ? "숨김" : "표시"}. Shift 또는 Alt를 누른 채 클릭하면 단독 보기`}
                      aria-pressed={visible}
                    >
                      <span
                        className="inline-block h-0.5 w-3 rounded"
                        style={{
                          background: visible
                            ? s.color
                            : "var(--muted-foreground)",
                        }}
                      />
                      {s.label}
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <div className="flex max-w-full shrink-0 items-center overflow-x-auto rounded-md bg-muted/40 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => jumpToRangeEdge("start")}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  title="처음 구간으로 이동 (Home)"
                  aria-label="처음 구간으로 이동"
                >
                  <ChevronsLeft size={13} />
                </button>
                <button
                  onClick={() => panByViewportStep("left")}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  title="왼쪽으로 이동 (←)"
                  aria-label="왼쪽으로 이동"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => zoomByButton("out")}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  title="축소 (-)"
                  aria-label="차트 축소"
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  onClick={() => zoomByButton("in")}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  title="확대 (+)"
                  aria-label="차트 확대"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  onClick={() => panByViewportStep("right")}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  title="오른쪽으로 이동 (→)"
                  aria-label="오른쪽으로 이동"
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => jumpToRangeEdge("end")}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  title="최신 구간으로 이동 (End)"
                  aria-label="최신 구간으로 이동"
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
              <button
                onClick={resetView}
                className="h-7 w-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                title="현재 데이터 폭에 맞춤 (0 또는 차트 더블클릭)"
                aria-label="현재 데이터 폭에 맞춤"
              >
                <RotateCcw size={13} />
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
                onClick={() => setLastValueLabelsVisible((v) => !v)}
                className={cn(
                  "h-7 inline-flex items-center justify-center rounded border px-2 text-[11px] font-medium transition-colors",
                  lastValueLabelsVisible
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                title={
                  lastValueLabelsVisible
                    ? "마지막 값 라벨 숨김 (M 또는 Alt+L)"
                    : "마지막 값 라벨 표시 (M 또는 Alt+L)"
                }
                aria-pressed={lastValueLabelsVisible}
              >
                값라벨
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
                onClick={() => setShortcutsOpen((v) => !v)}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded border transition-colors",
                  shortcutsOpen
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
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
                className="h-7 w-7 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
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
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                )}
                title={
                  dataTableOpen
                    ? "현재 표시 데이터 표 닫기 (D/T/Alt+D)"
                    : "현재 표시 데이터 표 열기 (D/T/Alt+D)"
                }
                aria-label={
                  dataTableOpen
                    ? "현재 표시 데이터 표 닫기"
                    : "현재 표시 데이터 표 열기"
                }
                aria-pressed={dataTableOpen}
              >
                <Table2 size={13} />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={cn(
                "min-w-0 text-[10px]",
                hasSeriesQualityWarning
                  ? "text-amber-500"
                  : "text-muted-foreground",
              )}
            >
              <span className="block truncate sm:hidden">
                {visiblePointLabel} 표시 · {chartData.length.toLocaleString()}행
                · {visibleSeries.length}/{stableSeries.length} series
              </span>
              <span className="hidden truncate sm:block">
                {visibleDateLabel} · {chartData.length.toLocaleString()} points
                {staleLabel}
                {droppedRowCount > 0
                  ? ` · 제외 ${droppedRowCount.toLocaleString()}`
                  : ""}
                {normalizedResult.invalidRows > 0
                  ? ` · 무효 ${normalizedResult.invalidRows.toLocaleString()}`
                  : ""}
                {normalizedResult.duplicateRows > 0
                  ? ` · 중복 ${normalizedResult.duplicateRows.toLocaleString()}`
                  : ""}
                {rowGapStats && rowGapStats.maxGapDays > 7
                  ? ` · 공백 ${rowGapStats.largeGapCount.toLocaleString()}개/최대 ${rowGapStats.maxGapDays}일`
                  : ""}{" "}
                · {visiblePointLabel} 표시 · {visibleSeries.length}/
                {stableSeries.length} series
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[10px] font-mono">
              {sourceLabel && (
                <span
                  className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5",
                    sourceTone === "primary"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : sourceTone === "warning"
                        ? "border-amber-500/35 bg-amber-500/10 text-amber-500"
                        : "border-border/70 bg-muted/20 text-muted-foreground",
                  )}
                  title={sourceTitle ?? `데이터 소스: ${sourceLabel}`}
                >
                  {sourceLabel}
                </span>
              )}
              {visibleWindowStatus && (
                <span
                  className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary"
                  title={`표시 구간 · ${visibleWindowStatus.title}`}
                >
                  {visibleWindowStatus.label}
                </span>
              )}
              {visibleWindowStatus && (
                <span
                  className="shrink-0 rounded border border-border bg-muted/20 px-1.5 py-0.5 text-muted-foreground"
                  title="전체 시계열 대비 현재 표시 비율"
                >
                  {visibleWindowStatus.detail}
                </span>
              )}
              {visibleWindowGapStats && (
                <span
                  className="shrink-0 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-amber-500"
                  title={`현재 표시 구간 안에 7일 초과 날짜 공백 ${visibleWindowGapStats.largeGapCount.toLocaleString()}개, 최대 ${visibleWindowGapStats.maxGapDays.toLocaleString()}일`}
                >
                  VIEW 공백{" "}
                  {visibleWindowGapStats.largeGapCount.toLocaleString()}개
                </span>
              )}
              <span
                className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5",
                  canTransformValues
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/20 text-muted-foreground",
                )}
                title={scaleModeStatus.title}
              >
                SCALE {scaleModeStatus.label}
              </span>
              <span
                className="shrink-0 rounded border border-border bg-muted/20 px-1.5 py-0.5 text-muted-foreground"
                title={scaleModeStatus.title}
              >
                {scaleModeStatus.detail}
              </span>
              {comparisonBaseStatus && (
                <span
                  className={cn(
                    "hidden shrink-0 rounded border px-1.5 py-0.5 sm:inline-flex",
                    comparisonBaseStatus.label === "BASE 없음"
                      ? "border-amber-500/35 bg-amber-500/10 text-amber-500"
                      : comparisonBaseStatus.scope === "visible"
                        ? "border-amber-500/35 bg-amber-500/10 text-amber-500"
                        : "border-border bg-muted/20 text-muted-foreground",
                  )}
                  title={comparisonBaseStatus.title}
                >
                  {comparisonBaseStatus.label}
                </span>
              )}
              {seriesQualityChips.length === 0 ? (
                <span
                  className="hidden rounded border border-up/30 bg-up/10 px-1.5 py-0.5 text-up sm:inline-flex"
                  title="데이터 품질 정상"
                >
                  OK
                </span>
              ) : (
                <>
                  <span className="hidden text-muted-foreground sm:inline">
                    QUALITY
                  </span>
                  {seriesQualityChips.map((chip) => (
                    <span
                      key={chip}
                      className="hidden shrink-0 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-amber-500 sm:inline-flex"
                    >
                      {chip}
                    </span>
                  ))}
                </>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {showRangeControls && (
                <div
                  className="flex items-center bg-muted/40 p-0.5 rounded-md"
                  role="group"
                  aria-label="시계열 차트 빠른 범위 선택"
                >
                  {QUICK_RANGES.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => applyQuickRange(option.lookbackDays)}
                      className={cn(
                        "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap",
                        activeQuickRange === option.key
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={activeQuickRange === option.key}
                      title={
                        option.lookbackDays == null
                          ? "받은 전체 DB/API 시계열 표시 ([/ ]로 범위 전환)"
                          : `최근 ${option.lookbackDays.toLocaleString()}일 범위로 표시 ([/ ]로 범위 전환)`
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {canTransformValues && (
                <div
                  className="flex items-center bg-muted/40 p-0.5 rounded-md"
                  title="표시 스케일 전환 (P)"
                  role="group"
                  aria-label="시계열 차트 표시 스케일 선택"
                >
                  {(
                    [
                      ["value", "값"],
                      ["changePct", "%"],
                      ["indexed", "100"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => {
                        transformModeTouchedRef.current = true;
                        setTransformMode(mode);
                      }}
                      className={cn(
                        "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap",
                        transformMode === mode
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={transformMode === mode}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {visibleBarSeriesCount > 1 && (
                <div
                  className="flex items-center bg-muted/40 p-0.5 rounded-md"
                  title="막대 표시 방식 전환 (B)"
                  role="group"
                  aria-label="시계열 차트 막대 표시 방식 선택"
                >
                  {(
                    [
                      ["group", "그룹"],
                      ["stack", "누적"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setBarDisplayLayout(mode)}
                      className={cn(
                        "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap",
                        barDisplayLayout === mode
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={barDisplayLayout === mode}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <div
                className="hidden sm:flex items-center bg-muted/40 p-0.5 rounded-md"
                role="group"
                aria-label="시계열 차트 높이 밀도 선택"
              >
                {(["compact", "standard", "deep"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    title={`차트 높이: ${d === "compact" ? "압축" : d === "deep" ? "넓게" : "기본"} (E로 순환)`}
                    className={cn(
                      "text-[11px] px-2 py-1 rounded transition-colors font-medium whitespace-nowrap",
                      density === d
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={density === d}
                  >
                    {d === "compact" ? "압축" : d === "deep" ? "넓게" : "기본"}
                  </button>
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/10 px-2 py-1">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  높이
                </span>
                <button
                  onClick={() =>
                    setChartHeightScale((value) =>
                      Math.max(
                        MIN_SERIES_CHART_HEIGHT_SCALE,
                        value - SERIES_CHART_HEIGHT_SCALE_STEP,
                      ),
                    )
                  }
                  disabled={chartHeightScale <= MIN_SERIES_CHART_HEIGHT_SCALE}
                  className={cn(
                    "h-5 w-5 inline-flex items-center justify-center rounded border transition-colors",
                    chartHeightScale <= MIN_SERIES_CHART_HEIGHT_SCALE
                      ? "border-border text-muted-foreground/35 cursor-not-allowed"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                  title="시계열 차트 높이 줄이기"
                >
                  <ZoomOut size={11} />
                </button>
                <input
                  type="range"
                  min={MIN_SERIES_CHART_HEIGHT_SCALE}
                  max={MAX_SERIES_CHART_HEIGHT_SCALE}
                  step={SERIES_CHART_HEIGHT_SCALE_STEP}
                  value={chartHeightScale}
                  onChange={(event) =>
                    setChartHeightScale(
                      clampSeriesChartHeightScale(event.currentTarget.value) ??
                        1,
                    )
                  }
                  className="h-2 w-24 accent-primary"
                  aria-label="시계열 차트 높이"
                  title="비교 차트 본체 높이를 즉시 조절"
                />
                <button
                  onClick={() =>
                    setChartHeightScale((value) =>
                      Math.min(
                        MAX_SERIES_CHART_HEIGHT_SCALE,
                        value + SERIES_CHART_HEIGHT_SCALE_STEP,
                      ),
                    )
                  }
                  disabled={chartHeightScale >= MAX_SERIES_CHART_HEIGHT_SCALE}
                  className={cn(
                    "h-5 w-5 inline-flex items-center justify-center rounded border transition-colors",
                    chartHeightScale >= MAX_SERIES_CHART_HEIGHT_SCALE
                      ? "border-border text-muted-foreground/35 cursor-not-allowed"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                  title="시계열 차트 높이 키우기"
                >
                  <ZoomIn size={11} />
                </button>
                <button
                  onClick={() => setChartHeightScale(1)}
                  className="h-5 rounded border border-border px-1.5 text-[10px] font-mono text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  title="시계열 차트 높이 기본값으로"
                >
                  {Math.round(chartHeightScale * 100)}%
                </button>
              </div>
              <button
                onClick={resetChartSettings}
                className="hidden h-7 shrink-0 items-center gap-1 rounded border border-border px-2 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground sm:inline-flex"
                title="표시 시리즈, 검색/필터, 범위, 스케일, 막대 방식, 값 라벨, 밀도, 높이, 그리드, 십자선, 표/도움말/확장, readout을 기본 상태로 되돌림 (Shift+R)"
              >
                <RotateCcw size={11} />
                초기화
              </button>
            </div>
          </div>
          {scrubberEnabled && (
            <div className="rounded-md border border-border/60 bg-muted/10 px-2 py-1.5 text-[11px]">
              <div className="mb-1 flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-mono text-muted-foreground">
                  WINDOW
                </span>
                <button
                  type="button"
                  onPointerDown={scrubRangeFromNavigator}
                  onPointerMove={(event) => {
                    if (event.buttons === 1) scrubRangeFromNavigator(event);
                  }}
                  className="relative h-9 min-w-0 flex-1 overflow-hidden rounded border border-border/60 bg-background/70 text-left"
                  aria-label="전체 시계열 미니 내비게이터"
                  title="전체 기간에서 현재 표시 구간 위치를 확인하고 클릭/드래그로 이동"
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
                          stroke={rangeNavigator.color}
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                          opacity="0.7"
                        />
                      </svg>
                      <span
                        className="absolute inset-y-0 rounded-sm border-x border-primary/60 bg-primary/20"
                        style={{
                          left: `${rangeNavigator.fromPct}%`,
                          width: `${rangeNavigator.widthPct}%`,
                        }}
                      />
                      <span className="absolute left-1 top-0.5 max-w-[58%] truncate font-mono text-[9px] text-muted-foreground">
                        {rangeNavigator.sourceLabel}
                      </span>
                      <span className="absolute bottom-0.5 right-1 max-w-[58%] truncate font-mono text-[9px] text-primary">
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
                          title="미니 내비게이터 기준 시리즈의 현재 표시 구간 변화"
                        >
                          {rangeNavigator.changeLabel}
                        </span>
                      )}
                    </>
                  )}
                </button>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {visiblePointLabel}/{chartData.length.toLocaleString()}
                  {visibleWindowStatus
                    ? ` · ${visibleWindowStatus.detail.split(" · ")[1]}`
                    : ""}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={scrubberMaxStart}
                step={1}
                value={Math.min(clampedViewRange.start, scrubberMaxStart)}
                onChange={(event) =>
                  scrubRangeStart(Number(event.currentTarget.value))
                }
                className="h-2 w-full accent-primary"
                aria-label="표시 구간 이동"
                title="현재 확대 폭을 유지한 채 전체 기간 위에서 표시 구간 이동"
              />
            </div>
          )}
          {shortcutsOpen && (
            <div className="rounded-lg border border-border bg-muted/10 p-3 text-[11px]">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  [
                    "이동/확대",
                    "←/→ 이동 · Shift+←/→ 빠르게 · PageUp/PageDown 크게 이동 · Alt+←/→/Home/End CUR 이동(PIN 유지, WINDOW 추적) · +/- 확대 · [/ ] 범위 전환 · 0 전체 · Shift+R 초기화 · Home/End · 가로 휠/Shift+휠 이동 · 클릭/Enter/Space PIN",
                  ],
                  [
                    "시리즈",
                    "1-9 표시 토글 · Shift+1-9 단독 보기/이전 조합 복귀 · Alt+R 이전 조합 복귀 · A 전체 보기 · Alt+O ON 필터 · Shift/Alt+범례 클릭 단독 보기 · RANK 클릭 단독 보기",
                  ],
                  [
                    "보기",
                    `${canTransformValues ? "P 값/%/100" : `스케일 고정(${scaleModeStatus.label})`} · ${
                      visibleBarSeriesCount > 1 ? "B 그룹/누적 · " : ""
                    }E 밀도 · ,/. 높이 · M/Alt+L 값라벨 · F 확장 · G 그리드 · X 십자선`,
                  ],
                  [
                    "기타",
                    "D/T/Alt+D 표시 데이터 표 · S 이미지 저장 · 더블클릭 전체 범위 · Esc PIN/CUR/도움말/표/확장 순서로 닫기 · ? 도움말",
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
          {(rangeComparisonSummary || readoutDatum) && (
            <div className="grid gap-1.5 rounded-md border border-border/60 bg-muted/10 px-2 py-1.5 text-[11px] font-mono sm:hidden">
              {rangeComparisonSummary && (
                <div className="grid grid-cols-2 gap-1.5">
                  <span className="truncate text-muted-foreground">
                    우위{" "}
                    <span className="text-up">
                      {rangeComparisonSummary.best.label}
                    </span>
                  </span>
                  <span className="truncate text-right text-muted-foreground">
                    열위{" "}
                    <span className="text-down">
                      {rangeComparisonSummary.worst.label}
                    </span>
                  </span>
                  <span className="truncate text-muted-foreground">
                    격차{" "}
                    <span className="text-foreground">
                      {rangeComparisonSummary.best.changePct != null &&
                      rangeComparisonSummary.worst.changePct != null
                        ? `${rangeComparisonSummary.gap.toFixed(2)}%p`
                        : displayValueFormatter(rangeComparisonSummary.gap)}
                    </span>
                  </span>
                  {rangeComparisonSummary.correlation != null && (
                    <span className="truncate text-right text-muted-foreground">
                      상관{" "}
                      <span className="text-foreground">
                        {rangeComparisonSummary.correlation.toFixed(2)}
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={focusRangeExtremes}
                    className="col-span-2 rounded border border-border/70 bg-card/60 px-1.5 py-1 text-center font-mono text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    title="현재 표시 구간의 우위/열위 시리즈만 남겨 비교"
                  >
                    우위/열위만 보기
                  </button>
                </div>
              )}
              {readoutDatum && (
                <div className="grid grid-cols-2 gap-1.5 border-t border-border/50 pt-1.5">
                  <span className="truncate text-muted-foreground">
                    {formatDateLabel(readoutDatum.row.date)}
                  </span>
                  <span className="truncate text-right text-muted-foreground">
                    {pinnedComparisonMeta?.label ?? visiblePointLabel}
                  </span>
                  {readoutDatum.items.slice(0, 2).map((item) => {
                    const previous = readoutPrevRow
                      ? parseSeriesValue(readoutPrevRow[item.key])
                      : Number.NaN;
                    const delta = Number.isFinite(previous)
                      ? item.value - previous
                      : Number.NaN;
                    const deltaPct = Number.isFinite(previous)
                      ? formatChangePct(item.value, previous)
                      : null;
                    const up = !Number.isFinite(delta) || delta >= 0;
                    return (
                      <span
                        key={item.key}
                        className="truncate text-muted-foreground"
                      >
                        <span
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                          style={{ background: item.color }}
                        />
                        {item.label}{" "}
                        <span className="text-foreground">
                          {displayValueFormatter(item.value)}
                        </span>
                        {deltaPct && (
                          <span className={up ? "text-up" : "text-down"}>
                            {" "}
                            {deltaPct}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {rangeComparisonSummary && (
            <div className="hidden sm:flex items-center gap-3 overflow-x-auto rounded-md border border-border/60 bg-muted/10 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px]">
              <span className="shrink-0 font-mono text-muted-foreground">
                SUMMARY
              </span>
              <span
                className="shrink-0 inline-flex items-center gap-1.5 font-mono"
                title={`${rangeComparisonSummary.best.label}: ${displayValueFormatter(rangeComparisonSummary.best.first)} → ${displayValueFormatter(rangeComparisonSummary.best.last)}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: rangeComparisonSummary.best.color }}
                />
                <span className="text-muted-foreground">우위</span>
                <span className="text-up">
                  {rangeComparisonSummary.best.label}
                </span>
              </span>
              <span
                className="shrink-0 inline-flex items-center gap-1.5 font-mono"
                title={`${rangeComparisonSummary.worst.label}: ${displayValueFormatter(rangeComparisonSummary.worst.first)} → ${displayValueFormatter(rangeComparisonSummary.worst.last)}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: rangeComparisonSummary.worst.color }}
                />
                <span className="text-muted-foreground">열위</span>
                <span className="text-down">
                  {rangeComparisonSummary.worst.label}
                </span>
              </span>
              <span className="shrink-0 font-mono text-muted-foreground">
                격차{" "}
                <span className="text-foreground">
                  {rangeComparisonSummary.best.changePct != null &&
                  rangeComparisonSummary.worst.changePct != null
                    ? `${rangeComparisonSummary.gap.toFixed(2)}%p`
                    : displayValueFormatter(rangeComparisonSummary.gap)}
                </span>
              </span>
              {rangeComparisonSummary.correlation != null && (
                <span
                  className="shrink-0 font-mono text-muted-foreground"
                  title="표시된 첫 두 시리즈의 구간별 변화 상관계수"
                >
                  상관{" "}
                  <span className="text-foreground">
                    {rangeComparisonSummary.correlation.toFixed(2)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {rangeComparisonSummary.correlationLabel}
                  </span>
                </span>
              )}
              <button
                type="button"
                onClick={focusRangeExtremes}
                className="shrink-0 rounded border border-border/70 bg-card/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-card hover:text-foreground"
                title="현재 표시 구간의 우위/열위 시리즈만 남겨 스프레드 비교"
              >
                PAIR 우위/열위
              </button>
            </div>
          )}
          {rankedRangeSeriesStats.length > 1 && (
            <div className="hidden sm:flex items-center gap-2 overflow-x-auto rounded-md border border-border/60 bg-muted/10 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px]">
              <span className="shrink-0 font-mono text-muted-foreground">
                RANK
              </span>
              {rankedRangeSeriesStats.slice(0, 8).map((item, index) => {
                const rankValue =
                  item.changePct != null
                    ? `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`
                    : displayValueFormatter(item.change);
                return (
                  <button
                    key={item.key}
                    onClick={() => isolateSeries(item.key)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded border border-border/70 bg-card/40 px-2 py-1 font-mono transition-colors hover:border-foreground/40 hover:bg-card hover:text-foreground"
                    title={`${item.label} 단독 보기 · ${displayValueFormatter(item.first)} → ${displayValueFormatter(item.last)} · 저 ${displayValueFormatter(item.min)} / 고 ${displayValueFormatter(item.max)}`}
                  >
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={item.up ? "text-up" : "text-down"}>
                      {rankValue}
                    </span>
                    <span className="text-muted-foreground">
                      →{" "}
                      <span className="text-foreground">
                        {displayValueFormatter(item.last)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {rangeSeriesStats.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px]">
              <span className="shrink-0 font-mono text-muted-foreground">
                RANGE
              </span>
              {rangeSeriesStats.slice(0, 6).map((item) => (
                <span
                  key={item.key}
                  className="shrink-0 inline-flex items-center gap-1.5 font-mono"
                  title={`${item.label}: ${displayValueFormatter(item.first)} -> ${displayValueFormatter(item.last)} · 저 ${displayValueFormatter(item.min)} / 고 ${displayValueFormatter(item.max)}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={item.up ? "text-up" : "text-down"}>
                    {displayValueFormatter(item.change)}
                    {item.changePct != null
                      ? ` (${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%)`
                      : ""}
                  </span>
                  <span className="text-muted-foreground">
                    -&gt;{" "}
                    <span className="text-foreground">
                      {displayValueFormatter(item.last)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    폭{" "}
                    <span className="text-foreground">
                      {displayValueFormatter(item.spread)}
                    </span>
                    {item.spreadPct != null
                      ? ` (${item.spreadPct.toFixed(2)}%)`
                      : ""}
                  </span>
                </span>
              ))}
            </div>
          )}
          {readoutDatum && (
            <div className="hidden sm:flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[11px]">
              {pinnedIndex != null && (
                <button
                  onClick={() => setPinnedIndex(null)}
                  className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary transition-colors hover:border-primary/50"
                  title="고정한 readout 해제"
                >
                  PINNED
                </button>
              )}
              {hoverIndex != null && hoverIndex !== pinnedIndex && (
                <button
                  onClick={() => setHoverIndex(null)}
                  className="shrink-0 rounded border border-border bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  title="readout 커서 해제"
                >
                  CUR
                </button>
              )}
              <span className="shrink-0 font-mono text-muted-foreground">
                {formatDateLabel(readoutDatum.row.date)}
              </span>
              {pinnedComparisonDatum && (
                <span className="shrink-0 font-mono text-muted-foreground">
                  PIN→{formatDateLabel(pinnedComparisonDatum.row.date)}
                </span>
              )}
              {pinnedComparisonMeta && (
                <span
                  className="shrink-0 font-mono text-muted-foreground"
                  title="PIN에서 비교 대상까지의 표시 포인트 수와 달력 일수"
                >
                  {pinnedComparisonMeta.label}
                </span>
              )}
              {comparisonBaseStatus &&
                comparisonBaseStatus.label !== "BASE 없음" && (
                  <span
                    className={cn(
                      "shrink-0 font-mono",
                      comparisonBaseStatus.scope === "visible"
                        ? "text-amber-500"
                        : "text-muted-foreground",
                    )}
                    title={comparisonBaseStatus.title}
                  >
                    {comparisonBaseStatus.label}
                  </span>
                )}
              {readoutDatum.items.map((item) => {
                const previous = readoutPrevRow
                  ? parseSeriesValue(readoutPrevRow[item.key])
                  : Number.NaN;
                const delta = Number.isFinite(previous)
                  ? item.value - previous
                  : Number.NaN;
                const deltaPct = Number.isFinite(previous)
                  ? formatChangePct(item.value, previous)
                  : null;
                const base = readoutBaseRow
                  ? parseSeriesValue(readoutBaseRow[item.key])
                  : Number.NaN;
                const baseDelta = Number.isFinite(base)
                  ? item.value - base
                  : Number.NaN;
                const baseDeltaPct = rangeMovePct(
                  item.value,
                  base,
                  transformMode,
                );
                const up = !Number.isFinite(delta) || delta >= 0;
                const baseUp =
                  baseDeltaPct == null
                    ? !Number.isFinite(baseDelta) || baseDelta >= 0
                    : baseDeltaPct >= 0;
                const pinnedCompareItem = pinnedComparisonDatum?.items.find(
                  (candidate) => candidate.key === item.key,
                );
                const pinnedDelta =
                  pinnedCompareItem && Number.isFinite(item.value)
                    ? pinnedCompareItem.value - item.value
                    : Number.NaN;
                const pinnedDeltaPct =
                  Number.isFinite(pinnedDelta) && item.value !== 0
                    ? (pinnedDelta / Math.abs(item.value)) * 100
                    : null;
                const pinnedUp =
                  !Number.isFinite(pinnedDelta) || pinnedDelta >= 0;
                return (
                  <span
                    key={item.key}
                    className="shrink-0 inline-flex items-center gap-1.5 font-mono"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground">
                      {displayValueFormatter(item.value)}
                    </span>
                    {Number.isFinite(delta) && (
                      <span className={up ? "text-up" : "text-down"}>
                        {displayValueFormatter(delta)}
                        {deltaPct ? ` (${deltaPct})` : ""}
                      </span>
                    )}
                    {baseDeltaPct != null && (
                      <span className={baseUp ? "text-up" : "text-down"}>
                        구간 {baseUp ? "+" : ""}
                        {baseDeltaPct.toFixed(2)}%
                      </span>
                    )}
                    {Number.isFinite(pinnedDelta) && pinnedDeltaPct != null && (
                      <span className={pinnedUp ? "text-up" : "text-down"}>
                        PIN→ {pinnedUp ? "+" : ""}
                        {pinnedDeltaPct.toFixed(2)}%
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
      {showToolbar && dataTableOpen && (
        <div className="mb-2 max-h-56 overflow-auto rounded-lg border border-border bg-card text-[11px] shadow-sm">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-2 py-1.5 backdrop-blur">
            <span className="font-mono text-muted-foreground">
              DATA {visibleDateLabel} · {displayData.length.toLocaleString()}행
              {tableSampledCount > 0
                ? ` · ${tableSampledCount.toLocaleString()}행 샘플링 생략`
                : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={exportVisibleDataCsv}
                disabled={displayData.length === 0}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] transition-colors",
                  displayData.length === 0
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
                title="표 닫기 (Esc 또는 D/T/Alt+D)"
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
                <th className="px-2 py-1 text-right font-medium">간격</th>
                {visibleSeries.map((item) => (
                  <th
                    key={item.key}
                    className="px-2 py-1 text-right font-medium"
                    title={item.key}
                  >
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => {
                const previous = tableRows[index - 1];
                const gapDays = previous
                  ? Math.max(
                      0,
                      Math.round(
                        (Number(row.__ts) - Number(previous.__ts)) / 86_400_000,
                      ),
                    )
                  : null;
                const largeGap = gapDays != null && gapDays > 7;
                return (
                  <tr
                    key={`${row.__ts}-${index}`}
                    className="border-b border-border/40 odd:bg-muted/10 hover:bg-muted/20"
                  >
                    <td className="sticky left-0 bg-card px-2 py-1 text-left text-muted-foreground">
                      {formatDateLabel(row.date)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-1 text-right",
                        largeGap ? "text-amber-500" : "text-muted-foreground",
                      )}
                      title={
                        gapDays == null
                          ? "첫 표시 행"
                          : `이전 표시 행 대비 ${gapDays.toLocaleString()}일 간격`
                      }
                    >
                      {gapDays == null ? "-" : `${gapDays}d`}
                    </td>
                    {visibleSeries.map((item) => {
                      const value = parseSeriesValue(row[item.key]);
                      return (
                        <td
                          key={item.key}
                          className="px-2 py-1 text-right text-foreground"
                        >
                          {Number.isFinite(value)
                            ? displayValueFormatter(value)
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
      <div
        ref={chartAreaRef}
        className="relative min-h-0 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={resetView}
        title="드래그로 이동, 세로 휠/핀치로 확대·축소, 가로 휠/Shift+휠로 좌우 이동, Alt+←/→/Home/End CUR 이동(PIN 유지, WINDOW 추적), Enter/Space PIN, Esc 해제, 0 전체, Shift+R 초기화, 더블클릭 맞춤"
        aria-label="시계열 차트 캔버스. 드래그로 이동, 세로 휠 또는 핀치로 확대·축소, 가로 휠 또는 Shift+휠로 좌우 이동, Alt+왼쪽/오른쪽/Home/End로 PIN을 유지한 채 CUR readout 이동, 경계에서는 표시 구간이 따라 이동, 클릭 또는 Enter 또는 Space로 readout 고정, Esc로 PIN 또는 CUR 해제, 0으로 전체 범위에 맞춤, Shift+R로 차트 초기화, 더블클릭으로 전체 범위에 맞춤"
        onPointerLeave={() => {
          if (!dragRef.current) setHoverIndex(null);
        }}
        style={{
          height: chartAreaHeight - (showToolbar ? 0 : legendHeight),
          width: "100%",
        }}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {!showToolbar && sourceLabel && chartAreaHeight >= 88 && (
          <div
            className={cn(
              "pointer-events-none absolute left-1.5 top-1.5 z-20 rounded border bg-card/95 px-1.5 py-0.5 font-mono text-[9px] leading-none shadow-sm",
              sourceTone === "primary"
                ? "border-primary/35 text-primary"
                : sourceTone === "warning"
                  ? "border-amber-500/35 text-amber-500"
                  : "border-border/70 text-muted-foreground",
            )}
            title={sourceTitle ?? `데이터 소스: ${sourceLabel}`}
          >
            {sourceLabel}
          </div>
        )}
        {svgModel && (
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
            viewBox={`0 0 ${svgModel.width} ${svgModel.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {svgModel.showBaseline &&
              svgModel.baselineY >= svgModel.top &&
              svgModel.baselineY <= svgModel.top + svgModel.plotHeight && (
                <g>
                  <line
                    x1={svgModel.left}
                    x2={svgModel.left + svgModel.plotWidth}
                    y1={svgModel.baselineY}
                    y2={svgModel.baselineY}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.32}
                    strokeDasharray="5 5"
                    strokeWidth={1}
                  />
                  {transformMode === "indexed" && showYAxis && (
                    <text
                      x={svgModel.left + svgModel.plotWidth + 10}
                      y={svgModel.baselineY - 4}
                      fill="var(--muted-foreground)"
                      fontSize={9}
                      fontFamily="monospace"
                      opacity={0.72}
                    >
                      기준 {displayValueFormatter(svgModel.baselineValue)}
                    </text>
                  )}
                </g>
              )}
            {showYAxis &&
              svgModel.ticks.map((tick) => (
                <text
                  key={tick.y}
                  x={svgModel.left + svgModel.plotWidth + 10}
                  y={tick.y + 3}
                  fill="var(--muted-foreground)"
                  fontSize={10}
                  fontFamily="monospace"
                  opacity={0.9}
                >
                  {displayValueFormatter(tick.value)}
                </text>
              ))}
            {transformBaseMarker && (
              <g>
                <title>{`공통 비교 기준일 ${transformBaseMarker.date}`}</title>
                <line
                  x1={transformBaseMarker.x}
                  x2={transformBaseMarker.x}
                  y1={svgModel.top}
                  y2={svgModel.top + svgModel.plotHeight}
                  stroke="var(--primary)"
                  strokeOpacity={0.38}
                  strokeDasharray="7 4"
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={transformBaseMarker.labelX}
                  y={svgModel.top + 4}
                  width={34}
                  height={14}
                  rx={3}
                  fill="var(--card)"
                  stroke="var(--primary)"
                  strokeOpacity={0.62}
                />
                <text
                  x={transformBaseMarker.labelX + 17}
                  y={svgModel.top + 14}
                  textAnchor="middle"
                  fill="var(--primary)"
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight={700}
                >
                  BASE
                </text>
              </g>
            )}
            {visibleSeries.map((s, seriesIndex) => {
              const type = s.type ?? "line";
              if (type === "bar") {
                const bars = visibleSeries.filter(
                  (candidate) => (candidate.type ?? "line") === "bar",
                );
                const slotWidth = Math.max(
                  2,
                  svgModel.plotWidth / Math.max(displayData.length, 1),
                );
                const barWidth =
                  barDisplayLayout === "stack"
                    ? Math.min(22, slotWidth * 0.62)
                    : Math.min(
                        18,
                        (slotWidth * 0.72) / Math.max(bars.length, 1),
                      );
                const barIndex = bars.findIndex((bar) => bar.key === s.key);
                return (
                  <g key={s.key}>
                    {displayData.map((row, i) => {
                      const value = parseSeriesValue(row[s.key]);
                      if (!Number.isFinite(value)) return null;
                      let startValue = 0;
                      let endValue = value;
                      if (barDisplayLayout === "stack") {
                        for (const previous of bars.slice(0, barIndex)) {
                          const previousValue = parseSeriesValue(
                            row[previous.key],
                          );
                          if (!Number.isFinite(previousValue)) continue;
                          if (
                            (value >= 0 && previousValue >= 0) ||
                            (value < 0 && previousValue < 0)
                          ) {
                            startValue += previousValue;
                          }
                        }
                        endValue = startValue + value;
                      }
                      const x =
                        barDisplayLayout === "stack"
                          ? svgModel.xOf(i) - barWidth / 2
                          : svgModel.xOf(i) -
                            ((bars.length - 1) * barWidth) / 2 +
                            barIndex * barWidth -
                            barWidth / 2;
                      const y = svgModel.yOf(endValue);
                      const y0 =
                        barDisplayLayout === "stack"
                          ? svgModel.yOf(startValue)
                          : svgModel.barBaseY;
                      return (
                        <rect
                          key={`${s.key}-${i}`}
                          x={x}
                          y={Math.min(y, y0)}
                          width={Math.max(1, barWidth - 1)}
                          height={Math.max(1, Math.abs(y0 - y))}
                          fill={s.color}
                          opacity={0.8}
                        />
                      );
                    })}
                  </g>
                );
              }
              const points = displayData.map((row, i) => {
                const value = parseSeriesValue(row[s.key]);
                return {
                  x: svgModel.xOf(i),
                  y: Number.isFinite(value) ? svgModel.yOf(value) : 0,
                  ok: Number.isFinite(value),
                };
              });
              const path = linePath(points);
              if (!path) return null;
              return (
                <g key={s.key}>
                  {type === "area" && (
                    <path
                      d={areaPath(points, svgModel.barBaseY)}
                      fill={s.color}
                      opacity={0.16}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <path
                    d={path}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={s.dashed ? "7 5" : undefined}
                    opacity={seriesIndex === 0 ? 1 : 0.92}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
            {rangeExtremeMarkers.map((marker) => {
              return (
                <g key={marker.key}>
                  <title>{`${marker.label} ${marker.kind} ${displayValueFormatter(marker.value)} · ${formatDateLabel(displayData[marker.index]?.date)}`}</title>
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={4.2}
                    fill="var(--card)"
                    stroke={marker.color}
                    strokeWidth={1.7}
                    opacity={0.96}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={marker.labelX}
                    y={marker.labelY}
                    textAnchor="middle"
                    fill={marker.color}
                    fontSize={8}
                    fontFamily="monospace"
                    fontWeight={800}
                    opacity={0.9}
                  >
                    {marker.kind}
                  </text>
                </g>
              );
            })}
            {showCrosshair && hoverDatum && (
              <g>
                <line
                  x1={hoverDatum.x}
                  x2={hoverDatum.x}
                  y1={svgModel.top}
                  y2={svgModel.top + svgModel.plotHeight}
                  stroke="var(--foreground)"
                  strokeOpacity={0.42}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                {hoverDatum.items.map((item) => (
                  <circle
                    key={item.key}
                    cx={hoverDatum.x}
                    cy={item.y}
                    r={4}
                    fill="var(--card)"
                    stroke={item.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            )}
            {readoutCursorMarker && (
              <g>
                <line
                  x1={readoutCursorMarker.x}
                  x2={readoutCursorMarker.x}
                  y1={svgModel.top}
                  y2={svgModel.top + svgModel.plotHeight}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={showCrosshair ? 0.28 : 0.6}
                  strokeDasharray="3 4"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={readoutCursorMarker.labelX}
                  y={svgModel.top + 24}
                  width={28}
                  height={14}
                  rx={3}
                  fill="var(--card)"
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.62}
                />
                <text
                  x={readoutCursorMarker.labelX + 14}
                  y={svgModel.top + 34}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight={700}
                >
                  CUR
                </text>
              </g>
            )}
            {pinnedIndex != null &&
              pinnedIndex >= 0 &&
              pinnedIndex < displayData.length && (
                <g>
                  {pinnedComparisonDatum &&
                    visibleSeries.slice(0, 4).map((seriesItem) => {
                      const pinnedValue = parseSeriesValue(
                        displayData[pinnedIndex]?.[seriesItem.key],
                      );
                      const compareValue = parseSeriesValue(
                        pinnedComparisonDatum.row[seriesItem.key],
                      );
                      if (
                        !Number.isFinite(pinnedValue) ||
                        !Number.isFinite(compareValue)
                      ) {
                        return null;
                      }
                      const up = compareValue >= pinnedValue;
                      const pct =
                        pinnedValue !== 0
                          ? ((compareValue - pinnedValue) /
                              Math.abs(pinnedValue)) *
                            100
                          : 0;
                      const x1 = svgModel.xOf(pinnedIndex);
                      const y1 = svgModel.yOf(pinnedValue);
                      const x2 = pinnedComparisonDatum.x;
                      const y2 = svgModel.yOf(compareValue);
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      const label = `${up ? "+" : ""}${pct.toFixed(2)}%`;
                      return (
                        <g key={`pin-link-${seriesItem.key}`}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={up ? "var(--up)" : "var(--down)"}
                            strokeOpacity={0.72}
                            strokeDasharray="5 4"
                            strokeWidth={1.3}
                            vectorEffect="non-scaling-stroke"
                          />
                          <circle
                            cx={x1}
                            cy={y1}
                            r={3}
                            fill="var(--card)"
                            stroke={seriesItem.color}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                          <circle
                            cx={x2}
                            cy={y2}
                            r={3}
                            fill="var(--card)"
                            stroke={up ? "var(--up)" : "var(--down)"}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                          <g transform={`translate(${midX}, ${midY})`}>
                            <rect
                              x={-24}
                              y={-7}
                              width={48}
                              height={14}
                              rx={3}
                              fill="var(--card)"
                              stroke={up ? "var(--up)" : "var(--down)"}
                              strokeOpacity={0.65}
                            />
                            <text
                              x={0}
                              y={3}
                              textAnchor="middle"
                              fill={up ? "var(--up)" : "var(--down)"}
                              fontSize={8}
                              fontFamily="monospace"
                              fontWeight={700}
                            >
                              {label}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  <line
                    x1={svgModel.xOf(pinnedIndex)}
                    x2={svgModel.xOf(pinnedIndex)}
                    y1={svgModel.top}
                    y2={svgModel.top + svgModel.plotHeight}
                    stroke="var(--primary)"
                    strokeOpacity={0.72}
                    strokeDasharray="2 3"
                    strokeWidth={1.2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={svgModel.xOf(pinnedIndex) + 4}
                    y={svgModel.top + 4}
                    width={28}
                    height={14}
                    rx={3}
                    fill="var(--card)"
                    stroke="var(--primary)"
                    strokeOpacity={0.75}
                  />
                  <text
                    x={svgModel.xOf(pinnedIndex) + 18}
                    y={svgModel.top + 14}
                    textAnchor="middle"
                    fill="var(--primary)"
                    fontSize={8}
                    fontFamily="monospace"
                    fontWeight={700}
                  >
                    PIN
                  </text>
                </g>
              )}
            {lastValueMarkers.map((marker) => {
              const shortLabel =
                marker.label.length > 8
                  ? `${marker.label.slice(0, 7)}…`
                  : marker.label;
              const valueLabel = displayValueFormatter(marker.value);
              const label = marker.changeLabel
                ? `${shortLabel} ${valueLabel} ${marker.changeLabel}`
                : `${shortLabel} ${valueLabel}`;
              const labelWidth = Math.max(
                64,
                Math.min(154, label.length * 5.2 + 12),
              );
              const labelX = svgModel.left + svgModel.plotWidth + 7;
              return (
                <g key={`last-${marker.key}`}>
                  <title>{`${marker.label} 최신 ${valueLabel}${marker.changeLabel ? ` · 구간 ${marker.changeLabel}` : ""}`}</title>
                  <line
                    x1={svgModel.left + svgModel.plotWidth - 20}
                    x2={svgModel.left + svgModel.plotWidth + 2}
                    y1={marker.y}
                    y2={marker.y}
                    stroke={marker.color}
                    strokeOpacity={0.55}
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  {Math.abs(marker.labelY - marker.y) > 2 && (
                    <line
                      x1={svgModel.left + svgModel.plotWidth + 4}
                      x2={labelX}
                      y1={marker.y}
                      y2={marker.labelY}
                      stroke={marker.color}
                      strokeOpacity={0.42}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <rect
                    x={labelX}
                    y={marker.labelY - 7}
                    width={labelWidth}
                    height={14}
                    rx={3}
                    fill={marker.color}
                    opacity={0.92}
                  />
                  <text
                    x={labelX + labelWidth / 2}
                    y={marker.labelY + 3.5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={8.5}
                    fontFamily="monospace"
                    fontWeight={700}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            {readoutValueMarkers.map((marker) => {
              const label = displayValueFormatter(marker.value);
              const badge =
                pinnedIndex != null
                  ? "PIN"
                  : hoverIndex != null
                    ? "CUR"
                    : "LAST";
              const labelText = `${badge} ${label}`;
              const labelWidth = Math.max(
                54,
                Math.min(126, labelText.length * 5.4 + 12),
              );
              const labelX = Math.max(
                svgModel.left + 4,
                svgModel.left + svgModel.plotWidth - labelWidth - 8,
              );
              return (
                <g key={`readout-value-${marker.key}`}>
                  <title>{`${marker.label} ${badge} ${label}`}</title>
                  <line
                    x1={svgModel.left}
                    x2={Math.max(svgModel.left, labelX - 4)}
                    y1={marker.y}
                    y2={marker.y}
                    stroke={marker.color}
                    strokeOpacity={0.25}
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  {Math.abs(marker.labelY - marker.y) > 2 && (
                    <line
                      x1={labelX - 4}
                      x2={labelX}
                      y1={marker.y}
                      y2={marker.labelY}
                      stroke={marker.color}
                      strokeOpacity={0.38}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <rect
                    x={labelX}
                    y={marker.labelY - 7}
                    width={labelWidth}
                    height={14}
                    rx={3}
                    fill="var(--card)"
                    fillOpacity={0.96}
                    stroke={marker.color}
                    strokeOpacity={0.72}
                  />
                  <text
                    x={labelX + labelWidth / 2}
                    y={marker.labelY + 3.5}
                    textAnchor="middle"
                    fill={marker.color}
                    fontSize={8.5}
                    fontFamily="monospace"
                    fontWeight={700}
                  >
                    {labelText}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        {showCrosshair && svgModel && hoverDatum && (
          <div
            className="pointer-events-none absolute z-20 min-w-[140px] max-w-[220px] rounded border border-border bg-card/95 px-2 py-1.5 text-[11px] shadow-lg backdrop-blur"
            style={{
              left:
                hoverDatum.x > svgModel.width * 0.74
                  ? undefined
                  : `${(hoverDatum.x / svgModel.width) * 100}%`,
              right: hoverDatum.x > svgModel.width * 0.74 ? 8 : undefined,
              top: 10,
              transform:
                hoverDatum.x > svgModel.width * 0.74
                  ? undefined
                  : "translateX(8px)",
            }}
          >
            <div className="mb-1 font-medium text-foreground">
              {formatDateLabel(hoverDatum.row.date)}
            </div>
            <div className="space-y-0.5">
              {hoverDatum.items.map((item) => {
                const previous = displayData[hoverDatum.index - 1]
                  ? parseSeriesValue(
                      displayData[hoverDatum.index - 1][item.key],
                    )
                  : Number.NaN;
                const delta = Number.isFinite(previous)
                  ? item.value - previous
                  : Number.NaN;
                const deltaPct = Number.isFinite(previous)
                  ? formatChangePct(item.value, previous)
                  : null;
                const baseRow =
                  transformBaseIndex != null
                    ? displayData[transformBaseIndex]
                    : displayData[0];
                const base = baseRow
                  ? parseSeriesValue(baseRow[item.key])
                  : Number.NaN;
                const baseDelta = Number.isFinite(base)
                  ? item.value - base
                  : Number.NaN;
                const baseDeltaPct = rangeMovePct(
                  item.value,
                  base,
                  transformMode,
                );
                const up = !Number.isFinite(delta) || delta >= 0;
                const baseUp =
                  baseDeltaPct == null
                    ? !Number.isFinite(baseDelta) || baseDelta >= 0
                    : baseDeltaPct >= 0;
                return (
                  <div key={item.key} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-3 text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="font-mono text-foreground">
                        {displayValueFormatter(item.value)}
                      </span>
                    </div>
                    {Number.isFinite(delta) && (
                      <div
                        className={`pl-3.5 text-right font-mono tabular-nums ${
                          up ? "text-up" : "text-down"
                        }`}
                      >
                        {displayValueFormatter(delta)}
                        {deltaPct ? ` (${deltaPct})` : ""}
                      </div>
                    )}
                    {baseDeltaPct != null && (
                      <div
                        className={`pl-3.5 text-right font-mono tabular-nums ${
                          baseUp ? "text-up" : "text-down"
                        }`}
                      >
                        구간 {baseUp ? "+" : ""}
                        {baseDeltaPct.toFixed(2)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!svgModel && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 text-center text-xs">
            <span className="font-medium text-muted-foreground">
              {emptyChartMessage.title}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {emptyChartMessage.detail}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
