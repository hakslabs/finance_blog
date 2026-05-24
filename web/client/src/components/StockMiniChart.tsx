/**
 * StockMiniChart — Lightweight area/line chart powered by klinecharts.
 *
 * For summary views (watchlist comparison rows, portfolio profit cards,
 * sparklines, 24-month trend pills). No indicators, no toolbar, minimal
 * chrome — built for density and performance.
 *
 * The same visual language as the full <StockChart>, so charts across the
 * app feel like a single product.
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { init, dispose, type Chart, type KLineData } from "klinecharts";
import { Download, Maximize2, Minimize2, Table2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export type MiniPoint = { date: string; value: number };
type SourceTone = "primary" | "warning" | "neutral";

export interface StockMiniChartProps {
  /** Time series — date (YYYY-MM-DD) + scalar value (close / portfolio NAV / ratio). */
  data: MiniPoint[];
  /** Container height in px (default 56 — sparkline-ish). */
  height?: number;
  /** Render style: filled area (default) or thin line. */
  variant?: "area" | "line";
  /** Force a color (e.g., green for up, red for down). Defaults to up/down from data trend. */
  color?: string;
  /** Show price axis on the right (default false — tight summary look). */
  showAxis?: boolean;
  /** Show crosshair + tooltip on hover (default true; turn off for static sparklines). */
  interactive?: boolean;
  /** Price-like data must be positive. Scalar data may be zero/negative. */
  valueKind?: "price" | "scalar";
  /** Optional formatter for hover readout values. */
  valueFormatter?: (value: number) => string;
  /** Short data-source badge shown when the mini chart has enough room. */
  sourceLabel?: string;
  /** Tooltip for the source badge. */
  sourceTitle?: string;
  /** Visual tone for the source badge. */
  sourceTone?: SourceTone;
}

function pointDataFingerprint(
  points: Array<{ timestamp: number; value: number }>,
): string {
  if (points.length === 0) return "empty";
  const first = points[0];
  const last = points[points.length - 1];
  let checksum = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    checksum =
      (checksum +
        (i + 1) * ((Number(point.timestamp) || 0) % 1_000_003) +
        (i + 3) * Math.round((Number(point.value) || 0) * 1000)) %
      1_000_000_007;
  }
  return [
    points.length,
    first?.timestamp ?? "",
    first?.value ?? "",
    last?.timestamp ?? "",
    last?.value ?? "",
    checksum,
  ].join("|");
}

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

const UP = "#22c55e";
const DOWN = "#ef4444";
type MiniRangeKey = "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y" | "ALL";
const MINI_RANGES: Array<{
  key: MiniRangeKey;
  label: string;
  days: number | null;
}> = [
  { key: "1M", label: "1M", days: 31 },
  { key: "3M", label: "3M", days: 92 },
  { key: "6M", label: "6M", days: 183 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "2Y", label: "2Y", days: 730 },
  { key: "5Y", label: "5Y", days: 1825 },
  { key: "ALL", label: "ALL", days: null },
];
const MINI_RANGE_SETTINGS_KEY = "financelab_stock_mini_chart_range_v1";

function isMiniRangeKey(value: unknown): value is MiniRangeKey {
  return (
    typeof value === "string" &&
    MINI_RANGES.some((range) => range.key === value)
  );
}

function readMiniRangeKey(): MiniRangeKey {
  if (typeof window === "undefined") return "ALL";
  try {
    const value = window.localStorage.getItem(MINI_RANGE_SETTINGS_KEY);
    return isMiniRangeKey(value) ? value : "ALL";
  } catch {
    return "ALL";
  }
}

function writeMiniRangeKey(value: MiniRangeKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MINI_RANGE_SETTINGS_KEY, value);
  } catch {
    /* localStorage can be disabled; the mini chart still works in memory. */
  }
}

function parsePointDate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const epochTimestamp = parseEpochTimestamp(value);
  if (epochTimestamp != null) return epochTimestamp;
  const timestamp = Date.parse(normalizeUtcDateInput(String(value)));
  return Number.isFinite(timestamp) ? timestamp : null;
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

function normalizePoints(
  data: MiniPoint[],
  valueKind: "price" | "scalar",
): Array<MiniPoint & { timestamp: number }> {
  const byTime = new Map<number, MiniPoint & { timestamp: number }>();

  data.forEach((point) => {
    const timestamp = parsePointDate(point.date);
    const value = Number(point.value);
    if (timestamp == null || !Number.isFinite(value)) return;
    if (valueKind === "price" && value <= 0) return;
    byTime.set(timestamp, {
      date: new Date(timestamp).toISOString().slice(0, 10),
      value,
      timestamp,
    });
  });

  return Array.from(byTime.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function nearestPointIndex(
  points: Array<{ timestamp: number }>,
  timestamp: number | null,
): number | null {
  if (timestamp == null || !Number.isFinite(timestamp) || points.length === 0) {
    return null;
  }
  let bestIndex = 0;
  let bestDistance = Math.abs(points[0].timestamp - timestamp);
  for (let i = 1; i < points.length; i += 1) {
    const distance = Math.abs(points[i].timestamp - timestamp);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function staleMiniDayLabel(timestamp: number | undefined): string | null {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  const today = new Date();
  const utcToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const day = new Date(timestamp);
  const utcDay = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
  );
  const diffDays = Math.floor((utcToday - utcDay) / 86_400_000);
  if (diffDays <= 7) return null;
  return `STALE ${diffDays.toLocaleString()}d`;
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
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function StockMiniChart({
  data,
  height = 56,
  variant = "area",
  color,
  showAxis = false,
  interactive = true,
  valueKind = "scalar",
  valueFormatter,
  sourceLabel,
  sourceTitle,
  sourceTone = "neutral",
}: StockMiniChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const layoutRaf = useRef<number | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const hoverTimestampRef = useRef<number | null>(null);
  const pinnedTimestampRef = useRef<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [rangeKey, setRangeKey] = useState<MiniRangeKey>(() =>
    readMiniRangeKey(),
  );
  const [tableOpen, setTableOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const helpId = useId();
  const statusId = useId();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const normalizedData = useMemo(
    () => normalizePoints(data, valueKind),
    [data, valueKind],
  );
  const dataSignature = useMemo(() => {
    return pointDataFingerprint(normalizedData);
  }, [normalizedData]);
  const displayData = useMemo(() => {
    if (!expanded || rangeKey === "ALL" || normalizedData.length === 0) {
      return normalizedData;
    }
    if (customRange) {
      const span = Math.max(1, customRange.end - customRange.start + 1);
      const maxStart = Math.max(0, normalizedData.length - span);
      const start = Math.min(maxStart, Math.max(0, customRange.start));
      return normalizedData.slice(start, start + span);
    }
    const range = MINI_RANGES.find((item) => item.key === rangeKey);
    if (!range?.days) return normalizedData;
    const latest = normalizedData[normalizedData.length - 1].timestamp;
    const cutoff = latest - Math.max(0, range.days - 1) * 86_400_000;
    const rows = normalizedData.filter((point) => point.timestamp >= cutoff);
    return rows.length > 0 ? rows : normalizedData;
  }, [customRange, expanded, normalizedData, rangeKey]);
  const displayDataSignature = useMemo(
    () => pointDataFingerprint(displayData),
    [displayData],
  );

  // Trend-based default color: rising = green, falling = red.
  const trendColor = useMemo(() => {
    if (color) return color;
    if (displayData.length < 2) return UP;
    return displayData[displayData.length - 1].value >= displayData[0].value
      ? UP
      : DOWN;
  }, [color, displayData]);

  const klineData = useMemo<KLineData[]>(() => {
    return displayData.map((p) => {
      return {
        timestamp: p.timestamp,
        open: p.value,
        high: p.value,
        low: p.value,
        close: p.value,
      };
    });
  }, [displayData]);
  const activeIndex = hoverIndex ?? pinnedIndex;
  const visualHeight = expanded ? 280 : height;
  const expandedTableHeight = tableOpen ? 132 : 0;
  const expandedChartHeight =
    expanded && tableOpen ? `calc(100% - ${expandedTableHeight}px)` : "100%";
  const overlayBottomPx = expanded && tableOpen ? expandedTableHeight + 4 : 4;
  const hoverPoint =
    activeIndex == null
      ? null
      : displayData[Math.min(activeIndex, displayData.length - 1)];
  const pinnedPoint =
    pinnedIndex == null
      ? null
      : displayData[Math.min(pinnedIndex, displayData.length - 1)];
  const firstValue = displayData[0]?.value;
  const hoverChangePct =
    hoverPoint && firstValue != null && firstValue !== 0
      ? ((hoverPoint.value - firstValue) / Math.abs(firstValue)) * 100
      : null;
  const hoverChange =
    hoverPoint && firstValue != null ? hoverPoint.value - firstValue : null;
  const pinnedComparison =
    pinnedPoint &&
    hoverPoint &&
    hoverPoint.timestamp !== pinnedPoint.timestamp &&
    pinnedPoint.value !== 0
      ? {
          delta: hoverPoint.value - pinnedPoint.value,
          pct:
            ((hoverPoint.value - pinnedPoint.value) /
              Math.abs(pinnedPoint.value)) *
            100,
          bars: Math.abs((activeIndex ?? 0) - (pinnedIndex ?? 0)),
          days: Math.max(
            0,
            Math.round(
              Math.abs(hoverPoint.timestamp - pinnedPoint.timestamp) /
                86_400_000,
            ),
          ),
        }
      : null;
  const lastValue = displayData[displayData.length - 1]?.value;
  const latestPoint = displayData[displayData.length - 1] ?? null;
  const rangeStats = useMemo(() => {
    if (displayData.length === 0) return null;
    const values = displayData.map((point) => point.value);
    const high = Math.max(...values);
    const low = Math.min(...values);
    if (![high, low].every(Number.isFinite)) return null;
    return {
      high,
      low,
      rows: displayData.length,
      from: displayData[0].date,
      to: displayData[displayData.length - 1].date,
    };
  }, [displayData]);
  const gapStats = useMemo(() => {
    if (displayData.length < 2) return null;
    let maxGapDays = 0;
    let largeGapCount = 0;
    for (let i = 1; i < displayData.length; i++) {
      const gapDays = Math.round(
        (displayData[i].timestamp - displayData[i - 1].timestamp) / 86_400_000,
      );
      if (!Number.isFinite(gapDays)) continue;
      if (gapDays > maxGapDays) maxGapDays = gapDays;
      if (gapDays > 7) largeGapCount += 1;
    }
    return largeGapCount > 0 ? { maxGapDays, largeGapCount } : null;
  }, [displayData]);
  const staleLabel = useMemo(
    () => staleMiniDayLabel(latestPoint?.timestamp),
    [latestPoint],
  );
  const qualityChips = useMemo(() => {
    const chips: Array<{ label: string; title: string }> = [];
    if (staleLabel) {
      chips.push({
        label: staleLabel,
        title: `최신 데이터가 ${latestPoint?.date ?? "알 수 없는 날짜"}에서 멈춰 있습니다`,
      });
    }
    if (gapStats) {
      chips.push({
        label: `공백 ${gapStats.largeGapCount.toLocaleString()}개`,
        title: `7일 초과 날짜 공백 ${gapStats.largeGapCount.toLocaleString()}개, 최대 ${gapStats.maxGapDays.toLocaleString()}일`,
      });
    }
    return chips;
  }, [gapStats, latestPoint, staleLabel]);
  const latestRangePositionPct =
    rangeStats && lastValue != null && rangeStats.high !== rangeStats.low
      ? ((lastValue - rangeStats.low) / (rangeStats.high - rangeStats.low)) *
        100
      : null;
  const rangeChangePct =
    firstValue != null && lastValue != null && firstValue !== 0
      ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100
      : null;
  const rangeUp = (rangeChangePct ?? 0) >= 0;
  const showRangeBadge =
    interactive &&
    activeIndex == null &&
    visualHeight >= 64 &&
    displayData.length > 1 &&
    rangeChangePct != null;
  const showRangeStats =
    interactive &&
    activeIndex == null &&
    visualHeight >= 96 &&
    rangeStats != null;
  const showPositionRail =
    interactive &&
    activeIndex == null &&
    visualHeight >= 96 &&
    latestRangePositionPct != null;
  const showLatestMarker =
    activeIndex == null &&
    visualHeight >= 28 &&
    displayData.length > 1 &&
    latestRangePositionPct != null;
  const latestMarkerTop =
    latestRangePositionPct == null
      ? null
      : `${Math.min(
          96,
          Math.max(4, 100 - Math.min(100, Math.max(0, latestRangePositionPct))),
        )}%`;
  const hoverLeft =
    activeIndex == null || displayData.length <= 1
      ? null
      : `${(activeIndex / (displayData.length - 1)) * 100}%`;
  const pinnedLeft =
    pinnedIndex == null || displayData.length <= 1
      ? null
      : `${(pinnedIndex / (displayData.length - 1)) * 100}%`;
  const timeRailIndex =
    activeIndex == null
      ? displayData.length - 1
      : Math.min(displayData.length - 1, Math.max(0, activeIndex));
  const timeRailPct =
    displayData.length <= 1
      ? 100
      : (timeRailIndex / (displayData.length - 1)) * 100;
  const timeRailPoint = displayData[timeRailIndex] ?? null;
  const showTimeRail =
    interactive && expanded && displayData.length > 1 && rangeStats != null;
  const displayRangeIndexes = useMemo(() => {
    if (normalizedData.length === 0 || displayData.length === 0) return null;
    const firstTimestamp = displayData[0].timestamp;
    const lastTimestamp = displayData[displayData.length - 1].timestamp;
    const start = normalizedData.findIndex(
      (point) => point.timestamp === firstTimestamp,
    );
    const end = normalizedData.findIndex(
      (point) => point.timestamp === lastTimestamp,
    );
    if (start < 0 || end < start) return null;
    return { start, end, span: end - start + 1 };
  }, [displayData, normalizedData]);
  const rangeNavigator = useMemo(() => {
    if (
      !interactive ||
      !expanded ||
      normalizedData.length <= 1 ||
      !displayRangeIndexes ||
      displayRangeIndexes.span >= normalizedData.length
    ) {
      return null;
    }
    const width = 1000;
    const height = 34;
    const step = Math.max(1, Math.ceil(normalizedData.length / 260));
    const sourceIndexes = new Map(
      normalizedData.map((point, index) => [point.timestamp, index]),
    );
    const sampled = normalizedData.filter(
      (_point, index) =>
        index % step === 0 ||
        index === 0 ||
        index === normalizedData.length - 1,
    );
    const values = sampled.map((point) => point.value).filter(Number.isFinite);
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(1, max - min);
    const path = sampled
      .map((point, pointIndex) => {
        const sourceIndex = sourceIndexes.get(point.timestamp) ?? 0;
        const x =
          (sourceIndex / Math.max(1, normalizedData.length - 1)) * width;
        const y = height - ((point.value - min) / spread) * (height - 4) - 2;
        return `${pointIndex === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    const fromPct =
      (displayRangeIndexes.start / Math.max(1, normalizedData.length - 1)) *
      100;
    const toPct =
      (displayRangeIndexes.end / Math.max(1, normalizedData.length - 1)) * 100;
    const first = displayData[0];
    const last = displayData[displayData.length - 1];
    const change =
      first &&
      last &&
      Number.isFinite(first.value) &&
      Number.isFinite(last.value)
        ? last.value - first.value
        : null;
    const changePct =
      change != null && first.value !== 0
        ? (change / Math.abs(first.value)) * 100
        : null;
    return {
      path,
      viewBox: `0 0 ${width} ${height}`,
      fromPct: Math.max(0, Math.min(100, fromPct)),
      widthPct: Math.max(1.5, Math.min(100, toPct - fromPct)),
      sourceLabel: `${normalizedData[0].date.slice(2)} - ${normalizedData[
        normalizedData.length - 1
      ].date.slice(2)}`,
      windowLabel: `${displayData[0].date.slice(2)} - ${displayData[
        displayData.length - 1
      ].date.slice(2)}`,
      changeLabel:
        changePct == null
          ? null
          : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
      changeTone:
        changePct == null ? "neutral" : changePct >= 0 ? "up" : "down",
    };
  }, [displayData, displayRangeIndexes, expanded, interactive, normalizedData]);
  const rangeExtremeMarkers = useMemo(() => {
    if (
      !rangeStats ||
      displayData.length <= 1 ||
      rangeStats.high === rangeStats.low
    ) {
      return [];
    }

    const highIndex = displayData.findIndex(
      (point) => point.value === rangeStats.high,
    );
    const lowIndex = displayData.findIndex(
      (point) => point.value === rangeStats.low,
    );
    if (highIndex < 0 || lowIndex < 0) return [];
    const xOf = (index: number) =>
      Math.min(96, Math.max(4, (index / (displayData.length - 1)) * 100));
    const yOf = (value: number) =>
      Math.min(
        96,
        Math.max(
          4,
          100 -
            ((value - rangeStats.low) / (rangeStats.high - rangeStats.low)) *
              100,
        ),
      );
    return [
      {
        key: "high",
        label: "H",
        value: rangeStats.high,
        date: displayData[highIndex]?.date,
        color: UP,
        left: `${xOf(highIndex)}%`,
        top: `${yOf(rangeStats.high)}%`,
      },
      {
        key: "low",
        label: "L",
        value: rangeStats.low,
        date: displayData[lowIndex]?.date,
        color: DOWN,
        left: `${xOf(lowIndex)}%`,
        top: `${yOf(rangeStats.low)}%`,
      },
    ].filter((marker) => marker.date != null);
  }, [displayData, rangeStats]);
  const showExtremeMarkers =
    interactive &&
    activeIndex == null &&
    visualHeight >= 44 &&
    rangeExtremeMarkers.length > 0;

  const formatValue = useCallback(
    (value: number) => {
      if (valueFormatter) return valueFormatter(value);
      return value.toLocaleString(undefined, {
        maximumFractionDigits: valueKind === "price" ? 2 : 3,
      });
    },
    [valueFormatter, valueKind],
  );
  const latestMarkerTitle =
    latestPoint == null
      ? "최신값 위치"
      : `최신 ${latestPoint.date} ${formatValue(latestPoint.value)}`;
  const latestValueBadge = useMemo(() => {
    if (!expanded || !latestPoint || rangeChangePct == null) return null;
    return {
      label: `LAST ${formatValue(latestPoint.value)}`,
      detail: `${rangeUp ? "+" : ""}${rangeChangePct.toFixed(2)}%`,
      title: `최신 ${latestPoint.date} ${formatValue(latestPoint.value)} · 표시 구간 ${rangeUp ? "+" : ""}${rangeChangePct.toFixed(2)}%`,
      up: rangeUp,
    };
  }, [expanded, formatValue, latestPoint, rangeChangePct, rangeUp]);
  const activeReadoutTitle =
    hoverPoint == null
      ? undefined
      : `${pinnedIndex != null && activeIndex === pinnedIndex ? "PIN" : "CUR"} ${hoverPoint.date} ${formatValue(hoverPoint.value)}${
          hoverChangePct == null
            ? ""
            : ` (${hoverChangePct >= 0 ? "+" : ""}${hoverChangePct.toFixed(2)}%)`
        }${
          pinnedComparison == null
            ? ""
            : ` · PIN 대비 ${pinnedComparison.delta >= 0 ? "+" : ""}${formatValue(
                pinnedComparison.delta,
              )} (${pinnedComparison.pct >= 0 ? "+" : ""}${pinnedComparison.pct.toFixed(
                2,
              )}%) · ${pinnedComparison.bars.toLocaleString()}봉/${pinnedComparison.days.toLocaleString()}일`
        }`;
  const rangeSummary = useMemo(() => {
    if (displayData.length <= 1) return undefined;
    const first = displayData[0];
    const last = displayData[displayData.length - 1];
    const pct =
      rangeChangePct == null
        ? ""
        : ` · ${rangeChangePct >= 0 ? "+" : ""}${rangeChangePct.toFixed(2)}%`;
    const extrema = rangeStats
      ? ` · H ${formatValue(rangeStats.high)} / L ${formatValue(rangeStats.low)} · 위치 ${
          latestRangePositionPct == null
            ? "-"
            : `${Math.round(latestRangePositionPct)}%`
        } · ${rangeStats.rows}행`
      : "";
    const quality =
      qualityChips.length > 0
        ? ` · ${qualityChips.map((chip) => chip.label).join(" · ")}`
        : "";
    const source = sourceLabel ? ` · ${sourceLabel}` : "";
    return `${first.date} - ${last.date} · 최신 ${formatValue(last.value)}${pct}${extrema}${quality}${source}`;
  }, [
    formatValue,
    latestRangePositionPct,
    displayData,
    qualityChips,
    rangeChangePct,
    rangeStats,
    sourceLabel,
  ]);
  const interactionSummary = interactive
    ? " · ←/→ CUR 이동(PIN 유지) · Shift+←/→/PgUp/PgDn 크게 이동 · Home/End 처음/끝 · [/ ] 범위 전환 · 확대 시 미니 내비게이터로 CUSTOM 구간 이동 · Enter/Space PIN · F 확대 · Esc 단계 닫기 · 0/Shift+R 작업공간 초기화 · 더블클릭 readout 초기화"
    : "";
  const accessibleSummary =
    rangeSummary == null ? undefined : `${rangeSummary}${interactionSummary}`;
  const tableRows = useMemo(() => {
    const maxRows = 80;
    if (displayData.length <= maxRows) return displayData;
    const step = Math.max(1, Math.ceil(displayData.length / maxRows));
    return displayData.filter(
      (_, index) => index % step === 0 || index === displayData.length - 1,
    );
  }, [displayData]);
  const tableSampledCount = Math.max(0, displayData.length - tableRows.length);

  const updateHover = useCallback(
    (clientX: number) => {
      const el = wrapperRef.current;
      if (!interactive || !el || displayData.length === 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)),
      );
      setHoverIndex(Math.round(ratio * (displayData.length - 1)));
    },
    [interactive, displayData.length],
  );
  const togglePinnedPoint = useCallback(() => {
    if (!interactive || displayData.length === 0) return;
    const targetIndex =
      hoverIndex ?? pinnedIndex ?? Math.max(0, displayData.length - 1);
    setPinnedIndex((current) => (current === targetIndex ? null : targetIndex));
  }, [hoverIndex, interactive, displayData.length, pinnedIndex]);
  const resetReadoutPoint = useCallback(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
  }, []);
  const resetMiniView = useCallback(() => {
    setCustomRange(null);
    resetReadoutPoint();
  }, [resetReadoutPoint]);
  const resetMiniWorkspace = useCallback(() => {
    setCustomRange(null);
    setTableOpen(false);
    setExpanded(false);
    resetReadoutPoint();
  }, [resetReadoutPoint]);
  const toggleExpanded = useCallback(() => {
    if (!interactive) return;
    setExpanded((current) => !current);
  }, [interactive]);
  const cycleMiniRange = useCallback((direction: "previous" | "next") => {
    setRangeKey((current) => {
      const index = MINI_RANGES.findIndex((range) => range.key === current);
      const currentIndex = index >= 0 ? index : MINI_RANGES.length - 1;
      const nextIndex =
        direction === "next"
          ? (currentIndex + 1) % MINI_RANGES.length
          : (currentIndex - 1 + MINI_RANGES.length) % MINI_RANGES.length;
      return MINI_RANGES[nextIndex].key;
    });
    setCustomRange(null);
  }, []);
  const scrubCustomRange = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        !rangeNavigator ||
        !displayRangeIndexes ||
        normalizedData.length <= 1
      ) {
        return;
      }
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)),
      );
      const span = Math.max(2, displayRangeIndexes.span);
      const centerIndex = Math.round(ratio * (normalizedData.length - 1));
      const maxStart = Math.max(0, normalizedData.length - span);
      const start = Math.min(
        maxStart,
        Math.max(0, Math.round(centerIndex - span / 2)),
      );
      setCustomRange({ start, end: start + span - 1 });
      resetMiniView();
      setCustomRange({ start, end: start + span - 1 });
    },
    [displayRangeIndexes, normalizedData.length, rangeNavigator, resetMiniView],
  );
  const exportDataCsv = useCallback(() => {
    if (displayData.length === 0 || typeof document === "undefined") return;
    const first = displayData[0];
    const last = displayData[displayData.length - 1];
    downloadCsv(
      [
        ["date", "value", "change", "change_pct", "gap_days"],
        ...displayData.map((point, index) => {
          const previous = index > 0 ? displayData[index - 1] : null;
          const delta = previous ? point.value - previous.value : 0;
          const pct =
            previous && previous.value !== 0
              ? (delta / Math.abs(previous.value)) * 100
              : 0;
          const gapDays = previous
            ? Math.max(
                0,
                Math.round((point.timestamp - previous.timestamp) / 86_400_000),
              )
            : "";
          return [point.date, point.value, delta, pct, gapDays];
        }),
      ],
      `mini-chart-${first.date}-${last.date}.csv`,
    );
  }, [displayData]);
  const moveReadoutPoint = useCallback(
    (
      direction: "left" | "right" | "pageLeft" | "pageRight" | "start" | "end",
    ) => {
      if (!interactive || displayData.length === 0) return;
      const fallback = activeIndex ?? Math.max(0, displayData.length - 1);
      const pageStep = Math.max(5, Math.round(displayData.length * 0.08));
      const nextIndex =
        direction === "start"
          ? 0
          : direction === "end"
            ? displayData.length - 1
            : Math.min(
                displayData.length - 1,
                Math.max(
                  0,
                  fallback +
                    (direction === "right" || direction === "pageRight"
                      ? 1
                      : -1) *
                      (direction === "pageLeft" || direction === "pageRight"
                        ? pageStep
                        : 1),
                ),
              );
      setHoverIndex(nextIndex);
    },
    [activeIndex, interactive, displayData.length],
  );

  useEffect(() => {
    if (pinnedIndex == null) return;
    if (pinnedIndex < 0 || pinnedIndex >= displayData.length) {
      setPinnedIndex(null);
    }
  }, [displayData.length, pinnedIndex]);

  useEffect(() => {
    setHoverIndex(null);
    setPinnedIndex(null);
    setCustomRange(null);
  }, [dataSignature]);

  useEffect(() => {
    writeMiniRangeKey(rangeKey);
  }, [rangeKey]);

  useEffect(() => {
    setHoverIndex((current) => {
      if (current == null) return null;
      return nearestPointIndex(displayData, hoverTimestampRef.current);
    });
    setPinnedIndex((current) => {
      if (current == null) return null;
      return nearestPointIndex(displayData, pinnedTimestampRef.current);
    });
  }, [displayData, displayDataSignature, expanded, rangeKey]);

  useEffect(() => {
    hoverTimestampRef.current = hoverPoint?.timestamp ?? null;
    pinnedTimestampRef.current = pinnedPoint?.timestamp ?? null;
  }, [hoverPoint?.timestamp, pinnedPoint?.timestamp]);

  useEffect(() => {
    if (!expanded || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(
    () => () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    },
    [],
  );

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
          const plotWidth = Math.max(24, el.clientWidth - (showAxis ? 36 : 0));
          chart.setBarSpace(Math.max(1, plotWidth / klineData.length));
        }
        // Keep distance-based scroll limits active so compact sparklines do
        // not show phantom padding before/after their real data range.
        chart.setMaxOffsetLeftDistance(0);
        chart.setMaxOffsetRightDistance(0);
        chart.setOffsetRightDistance(0);
        if (klineData.length > 1) {
          chart.scrollToRealTime(0);
        }
        chart.resize();
      });
    });
  }, [klineData.length, showAxis]);

  useEffect(
    () => () => {
      if (layoutRaf.current !== null) {
        cancelAnimationFrame(layoutRaf.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const muted = readToken(
      "--muted-foreground",
      isDark ? "#9ca3af" : "#6b7280",
    );
    const border = readToken("--border", isDark ? "#1f2937" : "#e5e7eb");

    const chart = init(containerRef.current, {
      styles: {
        candle: {
          type: variant === "line" ? "area" : "area",
          area: {
            lineSize: variant === "line" ? 1.5 : 1.2,
            lineColor: trendColor,
            value: "close",
            smooth: false,
            backgroundColor:
              variant === "area"
                ? [
                    { offset: 0, color: trendColor + "55" },
                    { offset: 1, color: trendColor + "00" },
                  ]
                : [
                    { offset: 0, color: trendColor + "00" },
                    { offset: 1, color: trendColor + "00" },
                  ],
            point: {
              show: false,
              color: trendColor,
              radius: 2,
              rippleRadius: 4,
              rippleColor: trendColor,
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
              upColor: trendColor,
              downColor: trendColor,
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
                backgroundColor: trendColor,
                family: "Helvetica",
                weight: "normal",
              },
            },
          },
          tooltip: {
            showRule: interactive ? "follow_cross" : "none",
            showType: "standard",
            offsetLeft: 4,
            offsetTop: 4,
            offsetRight: 4,
            offsetBottom: 4,
            title: {
              show: false,
              color: muted,
              size: 10,
              weight: "normal",
              family: "Helvetica",
              marginLeft: 0,
              marginRight: 0,
              marginTop: 0,
              marginBottom: 2,
              template: "",
            },
            legend: {
              color: muted,
              size: 10,
              weight: "normal",
              family: "Helvetica",
              marginLeft: 0,
              marginRight: 0,
              marginTop: 0,
              marginBottom: 0,
            },
          },
        },
        grid: {
          show: false,
          horizontal: {
            show: false,
            color: border,
            style: "dashed",
            dashedValue: [2, 4],
            size: 1,
          },
          vertical: {
            show: false,
            color: border,
            style: "dashed",
            dashedValue: [2, 4],
            size: 1,
          },
        },
        xAxis: {
          show: false,
          axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: {
            show: false,
            color: muted,
            family: "Helvetica",
            weight: "normal",
            size: 9,
            marginStart: 2,
            marginEnd: 2,
          },
        },
        yAxis: {
          show: showAxis,
          position: "right",
          inside: false,
          reverse: false,
          size: showAxis ? 36 : 0,
          axisLine: { show: false, color: border, size: 1 },
          tickLine: { show: false, color: border, size: 1, length: 3 },
          tickText: {
            show: showAxis,
            color: muted,
            family: "Helvetica",
            weight: "normal",
            size: 9,
            marginStart: 2,
            marginEnd: 2,
          },
        },
        separator: {
          size: 0,
          color: border,
          fill: true,
          activeBackgroundColor: "transparent",
        },
        crosshair: {
          show: interactive,
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
            show: interactive,
            line: {
              show: true,
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
        },
      } as any,
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setTimezone("UTC");
    chart.setZoomEnabled(false);
    chart.setScrollEnabled(false);
    chart.applyNewData(klineData);
    requestAnimationFrame(syncChartLayout);

    const ro = new ResizeObserver(syncChartLayout);
    ro.observe(containerRef.current);
    const el = containerRef.current;
    return () => {
      ro.disconnect();
      if (el) dispose(el);
      chartRef.current = null;
    };
    // Re-init only on visual config changes; data updates flow through the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, variant, trendColor, showAxis, interactive]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyNewData(klineData);
    requestAnimationFrame(syncChartLayout);
  }, [klineData, syncChartLayout]);

  useEffect(() => {
    requestAnimationFrame(syncChartLayout);
  }, [expanded, syncChartLayout]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={interactive ? 0 : undefined}
      role="group"
      aria-roledescription="미니 시계열 차트"
      className={`relative w-full overflow-hidden rounded-md bg-card focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 ${
        interactive ? "cursor-crosshair" : ""
      } ${
        expanded
          ? "fixed inset-3 z-50 border border-border p-3 shadow-2xl sm:inset-5"
          : "h-full"
      }`}
      style={expanded ? undefined : { height }}
      onPointerMove={(event) => updateHover(event.clientX)}
      onPointerEnter={(event) => updateHover(event.clientX)}
      onPointerLeave={() => {
        if (pinnedIndex == null) setHoverIndex(null);
      }}
      onClick={() => {
        if (!interactive) return;
        if (clickTimerRef.current !== null) {
          window.clearTimeout(clickTimerRef.current);
        }
        clickTimerRef.current = window.setTimeout(() => {
          clickTimerRef.current = null;
          togglePinnedPoint();
        }, 180);
      }}
      onDoubleClick={(event) => {
        if (!interactive) return;
        event.preventDefault();
        if (clickTimerRef.current !== null) {
          window.clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        resetMiniView();
      }}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          togglePinnedPoint();
        } else if (
          event.key === "0" ||
          (event.shiftKey && event.key.toLowerCase() === "r")
        ) {
          event.preventDefault();
          resetMiniWorkspace();
        } else if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          toggleExpanded();
        } else if (event.key.toLowerCase() === "d") {
          event.preventDefault();
          if (!expanded) {
            setExpanded(true);
            setTableOpen(true);
          } else {
            setTableOpen((current) => !current);
          }
        } else if (expanded && (event.key === "[" || event.key === "{")) {
          event.preventDefault();
          cycleMiniRange("previous");
        } else if (expanded && (event.key === "]" || event.key === "}")) {
          event.preventDefault();
          cycleMiniRange("next");
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveReadoutPoint(event.shiftKey ? "pageLeft" : "left");
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          moveReadoutPoint(event.shiftKey ? "pageRight" : "right");
        } else if (event.key === "PageUp") {
          event.preventDefault();
          moveReadoutPoint("pageLeft");
        } else if (event.key === "PageDown") {
          event.preventDefault();
          moveReadoutPoint("pageRight");
        } else if (event.key === "Home") {
          event.preventDefault();
          moveReadoutPoint("start");
        } else if (event.key === "End") {
          event.preventDefault();
          moveReadoutPoint("end");
        } else if (event.key === "Escape" && pinnedIndex != null) {
          event.preventDefault();
          resetReadoutPoint();
        } else if (event.key === "Escape" && hoverIndex != null) {
          event.preventDefault();
          resetReadoutPoint();
        } else if (event.key === "Escape" && tableOpen) {
          event.preventDefault();
          setTableOpen(false);
        } else if (event.key === "Escape" && expanded) {
          event.preventDefault();
          setExpanded(false);
        }
      }}
      title={activeReadoutTitle ?? accessibleSummary}
      aria-label={activeReadoutTitle ?? accessibleSummary}
      aria-describedby={interactive ? `${helpId} ${statusId}` : undefined}
      aria-keyshortcuts={
        interactive
          ? "ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight PageUp PageDown Home End Enter Space Escape 0 Shift+R F D Alt+D [ ]"
          : undefined
      }
    >
      {interactive && (
        <>
          <span id={helpId} className="sr-only">
            왼쪽 또는 오른쪽 화살표로 CUR readout을 이동합니다. Shift와 화살표
            또는 PageUp/PageDown으로 크게 이동합니다. Home과 End로 처음 또는
            끝으로 이동합니다. 확대 상태에서는 대괄호 키로 표시 범위를 바꿉니다.
            확대 상태의 미니 내비게이터를 클릭하거나 드래그하면 현재 표시 폭을
            유지한 CUSTOM 구간으로 이동합니다. Enter 또는 Space로 PIN을
            고정하고, PIN을 유지한 채 CUR을 이동해 비교합니다. F로 확대하고 D
            또는 Alt+D로 데이터 표를 열며, 축소 상태에서 D 또는 Alt+D를 누르면
            표와 함께 확대합니다. Escape는 PIN/CUR, 표, 확대 순서로 닫고 0 또는
            Shift+R은 표/확대/readout/CUSTOM 구간을 초기화합니다. 더블클릭은
            readout과 CUSTOM 구간만 초기화합니다. STALE 또는 공백 배지가 보이면
            데이터 최신성이나 날짜 연속성을 확인해야 합니다.
            {sourceLabel ? ` 데이터 소스는 ${sourceLabel}입니다.` : ""}
          </span>
          <span id={statusId} className="sr-only" aria-live="polite">
            {activeReadoutTitle ?? accessibleSummary ?? "미니 차트 데이터 없음"}
          </span>
        </>
      )}
      {interactive &&
        (sourceLabel || qualityChips.length > 0) &&
        (expanded || visualHeight >= 72) && (
          <div className="pointer-events-none absolute left-1 top-1 z-20 flex max-w-[calc(100%-4rem)] items-center gap-1 overflow-hidden">
            {sourceLabel && (
              <span
                className={`shrink-0 rounded border bg-card/95 px-1.5 py-0.5 font-mono text-[9px] leading-none shadow-sm ${
                  sourceTone === "primary"
                    ? "border-primary/35 text-primary"
                    : sourceTone === "warning"
                      ? "border-amber-500/35 text-amber-500"
                      : "border-border/70 text-muted-foreground"
                }`}
                title={sourceTitle ?? `데이터 소스: ${sourceLabel}`}
              >
                {sourceLabel}
              </span>
            )}
            {qualityChips.map((chip) => (
              <span
                key={chip.label}
                className="shrink-0 rounded border border-amber-500/35 bg-card/95 px-1.5 py-0.5 font-mono text-[9px] leading-none text-amber-500 shadow-sm"
                title={chip.title}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
      {interactive && displayData.length > 1 && (
        <div className="absolute right-1 top-1 z-20 flex items-center gap-1">
          {expanded && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setTableOpen((current) => !current);
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded border shadow-sm transition-colors ${
                  tableOpen
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-card/95 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
                title={
                  tableOpen
                    ? "미니 차트 데이터 표 닫기 (D/Alt+D)"
                    : "미니 차트 데이터 표 열기 (D/Alt+D)"
                }
                aria-label={
                  tableOpen
                    ? "미니 차트 데이터 표 닫기"
                    : "미니 차트 데이터 표 열기"
                }
                aria-pressed={tableOpen}
              >
                <Table2 size={12} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  exportDataCsv();
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70 bg-card/95 text-muted-foreground shadow-sm transition-colors hover:border-foreground/40 hover:text-foreground"
                title="미니 차트 표시 데이터를 CSV로 저장"
                aria-label="미니 차트 표시 데이터를 CSV로 저장"
              >
                <Download size={12} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleExpanded();
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70 bg-card/95 text-muted-foreground shadow-sm transition-colors hover:border-foreground/40 hover:text-foreground"
            title={expanded ? "미니 차트 축소 (F/Esc)" : "미니 차트 확대 (F)"}
            aria-label={expanded ? "미니 차트 축소" : "미니 차트 확대"}
            aria-pressed={expanded}
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      )}
      {interactive && expanded && normalizedData.length > 1 && (
        <div
          className="absolute left-3 top-10 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-1 overflow-x-auto rounded-md border border-border/70 bg-card/95 p-0.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onClick={(event) => event.stopPropagation()}
          title="확대 미니 차트 표시 기간"
        >
          {MINI_RANGES.map((range) => (
            <button
              key={range.key}
              type="button"
              onClick={() => {
                setRangeKey(range.key);
                setCustomRange(null);
              }}
              className={`h-6 rounded px-2 text-[10px] font-medium transition-colors ${
                rangeKey === range.key && !customRange
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-pressed={rangeKey === range.key && !customRange}
              title={
                range.days == null
                  ? "전체 데이터 보기"
                  : `최근 ${range.days.toLocaleString()}일 보기`
              }
            >
              {range.label}
            </button>
          ))}
          {customRange && (
            <button
              type="button"
              onClick={() => resetMiniView()}
              className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary transition-colors hover:bg-primary/15"
              title="미니 내비게이터에서 직접 선택한 사용자 구간. 클릭하면 최신 quick range로 복귀합니다"
              aria-label="CUSTOM 구간 해제"
            >
              CUSTOM
            </button>
          )}
          <span className="shrink-0 px-1.5 font-mono text-[9px] text-muted-foreground">
            {displayData.length.toLocaleString()}/
            {normalizedData.length.toLocaleString()}
          </span>
        </div>
      )}
      {rangeNavigator && (
        <div
          className="absolute inset-x-3 top-[4.65rem] z-20 rounded-md border border-border/70 bg-card/95 p-1.5 shadow-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onPointerDown={scrubCustomRange}
            onPointerMove={(event) => {
              if (event.buttons === 1) scrubCustomRange(event);
            }}
            className="relative block h-9 w-full overflow-hidden rounded border border-border/60 bg-background/80 text-left"
            aria-label="미니 차트 전체 기간 내비게이터"
            title="전체 기간에서 현재 표시 구간을 확인하고 클릭/드래그로 이동"
          >
            <svg
              viewBox={rangeNavigator.viewBox}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <path
                d={rangeNavigator.path}
                fill="none"
                stroke={trendColor}
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
            <span className="absolute left-1 top-0.5 font-mono text-[8px] text-muted-foreground">
              {rangeNavigator.sourceLabel}
            </span>
            <span className="absolute bottom-0.5 right-1 font-mono text-[8px] text-primary">
              {rangeNavigator.windowLabel}
            </span>
            {rangeNavigator.changeLabel && (
              <span
                className={`absolute right-1 top-0.5 rounded border bg-card/90 px-1 py-0.5 font-mono text-[8px] ${
                  rangeNavigator.changeTone === "up"
                    ? "border-up/35 text-up"
                    : rangeNavigator.changeTone === "down"
                      ? "border-down/35 text-down"
                      : "border-border text-muted-foreground"
                }`}
                title="현재 표시 구간의 시작값 대비 끝값 변화율"
              >
                {rangeNavigator.changeLabel}
              </span>
            )}
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          height: expanded ? expandedChartHeight : height,
          width: "100%",
        }}
      />
      {expanded && tableOpen && (
        <div
          className="absolute inset-x-3 bottom-3 z-20 max-h-[124px] overflow-auto rounded-lg border border-border bg-card/95 text-[11px] shadow-sm backdrop-blur"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-2 py-1">
            <span className="font-mono text-muted-foreground">
              DATA {displayData.length.toLocaleString()}행
              {tableSampledCount > 0
                ? ` · ${tableSampledCount.toLocaleString()}행 샘플링 생략`
                : ""}
            </span>
            <button
              type="button"
              onClick={exportDataCsv}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              title="표시 데이터를 CSV로 저장"
            >
              CSV
            </button>
          </div>
          <table className="w-full min-w-[320px] border-collapse font-mono tabular-nums">
            <thead>
              <tr className="border-b border-border/70 bg-muted/20 text-muted-foreground">
                <th className="sticky left-0 bg-muted/20 px-2 py-1 text-left font-medium">
                  날짜
                </th>
                <th className="px-2 py-1 text-right font-medium">값</th>
                <th className="px-2 py-1 text-right font-medium">변화</th>
                <th className="px-2 py-1 text-right font-medium">간격</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((point) => {
                const index = displayData.findIndex(
                  (item) => item.timestamp === point.timestamp,
                );
                const previous = index > 0 ? displayData[index - 1] : null;
                const delta = previous ? point.value - previous.value : 0;
                const pct =
                  previous && previous.value !== 0
                    ? (delta / Math.abs(previous.value)) * 100
                    : 0;
                const gapDays = previous
                  ? Math.max(
                      0,
                      Math.round(
                        (point.timestamp - previous.timestamp) / 86_400_000,
                      ),
                    )
                  : null;
                const largeGap = gapDays != null && gapDays > 7;
                const up = delta >= 0;
                return (
                  <tr
                    key={point.timestamp}
                    className="border-b border-border/40 odd:bg-muted/10 hover:bg-muted/20"
                  >
                    <td className="sticky left-0 bg-card px-2 py-1 text-left text-muted-foreground">
                      {point.date}
                    </td>
                    <td className="px-2 py-1 text-right text-foreground">
                      {formatValue(point.value)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${up ? "text-up" : "text-down"}`}
                    >
                      {up ? "+" : ""}
                      {formatValue(delta)} ({up ? "+" : ""}
                      {pct.toFixed(2)}%)
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${
                        largeGap ? "text-amber-500" : "text-muted-foreground"
                      }`}
                      title={
                        gapDays == null
                          ? "첫 표시 행"
                          : `이전 포인트 대비 ${gapDays.toLocaleString()}일 간격`
                      }
                    >
                      {gapDays == null ? "-" : `${gapDays}d`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showLatestMarker && latestMarkerTop && (
        <div
          className="pointer-events-none absolute right-1 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-card shadow-sm"
          style={{
            top: latestMarkerTop,
            background: trendColor,
          }}
          title={latestMarkerTitle}
        />
      )}
      {latestValueBadge && latestMarkerTop && (
        <div
          className={`pointer-events-none absolute right-4 z-10 -translate-y-1/2 rounded border bg-card/95 px-1.5 py-0.5 text-right font-mono text-[9px] leading-tight shadow-sm ${
            latestValueBadge.up
              ? "border-up/35 text-up"
              : "border-down/35 text-down"
          }`}
          style={{ top: latestMarkerTop }}
          title={latestValueBadge.title}
        >
          <div className="text-foreground">{latestValueBadge.label}</div>
          <div>{latestValueBadge.detail}</div>
        </div>
      )}
      {showExtremeMarkers &&
        rangeExtremeMarkers.map((marker) => (
          <div
            key={marker.key}
            className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm"
            style={{
              left: marker.left,
              top: marker.top,
              background: marker.color,
            }}
            title={`${marker.label} ${marker.date} ${formatValue(marker.value)}`}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[6px] font-bold leading-none text-white"
              aria-hidden="true"
            >
              {marker.label}
            </span>
          </div>
        ))}
      {showRangeStats && rangeStats && (
        <div className="pointer-events-none absolute left-1 top-1 rounded border border-border/70 bg-card/90 px-1.5 py-0.5 font-mono text-[9px] leading-tight text-muted-foreground shadow-sm">
          <span className="text-foreground">
            H {formatValue(rangeStats.high)}
          </span>
          <span className="mx-1 text-border">/</span>
          <span className="text-foreground">
            L {formatValue(rangeStats.low)}
          </span>
          <span className="ml-1 text-muted-foreground">
            {rangeStats.rows.toLocaleString()}행
          </span>
        </div>
      )}
      {showRangeBadge && (
        <div
          className={`pointer-events-none absolute right-1 rounded border bg-card/90 px-1.5 py-0.5 font-mono text-[10px] tabular-nums shadow-sm ${
            rangeUp ? "border-up/30 text-up" : "border-down/30 text-down"
          }`}
          style={{ bottom: overlayBottomPx }}
        >
          {rangeUp ? "+" : ""}
          {rangeChangePct.toFixed(2)}%
        </div>
      )}
      {showPositionRail && latestRangePositionPct != null && (
        <div
          className="pointer-events-none absolute left-1 w-[44%] max-w-28 rounded border border-border/70 bg-card/90 px-1.5 py-1 shadow-sm"
          style={{ bottom: overlayBottomPx }}
          title="구간 저점~고점 대비 최신값 위치"
        >
          <div className="mb-0.5 flex items-center justify-between font-mono text-[8px] leading-none text-muted-foreground">
            <span>L</span>
            <span>{Math.round(latestRangePositionPct)}%</span>
            <span>H</span>
          </div>
          <div className="relative h-1 rounded-full bg-muted/60">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, latestRangePositionPct))}%`,
                background: trendColor,
                opacity: 0.7,
              }}
            />
            <div
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card shadow-sm"
              style={{
                left: `${Math.min(100, Math.max(0, latestRangePositionPct))}%`,
                background: trendColor,
              }}
            />
          </div>
        </div>
      )}
      {showTimeRail && rangeStats && timeRailPoint && (
        <div
          className="pointer-events-none absolute right-1 w-[52%] max-w-xs rounded border border-border/70 bg-card/90 px-1.5 py-1 shadow-sm"
          style={{ bottom: overlayBottomPx }}
          title="전체 날짜 범위 대비 현재 CUR/PIN 위치"
        >
          <div className="mb-0.5 flex items-center justify-between gap-2 font-mono text-[8px] leading-none text-muted-foreground">
            <span>{rangeStats.from.slice(2)}</span>
            <span className="truncate text-foreground">
              {timeRailPoint.date}
            </span>
            <span>{rangeStats.to.slice(2)}</span>
          </div>
          <div className="relative h-1 rounded-full bg-muted/60">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
              style={{ width: `${Math.min(100, Math.max(0, timeRailPct))}%` }}
            />
            <div
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card bg-primary shadow-sm"
              style={{ left: `${Math.min(100, Math.max(0, timeRailPct))}%` }}
            />
          </div>
        </div>
      )}
      {interactive && hoverPoint && hoverLeft && (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {pinnedLeft && pinnedIndex !== activeIndex && (
            <div
              className="absolute top-0 h-full border-l border-primary/70"
              style={{ left: pinnedLeft }}
              title="PIN 기준점"
            >
              <span className="absolute left-1 top-1 rounded border border-primary/30 bg-card/95 px-1 py-0.5 font-mono text-[8px] font-semibold text-primary shadow-sm">
                PIN
              </span>
            </div>
          )}
          <div
            className="absolute top-0 h-full border-l border-dashed border-muted-foreground/50"
            style={{ left: hoverLeft }}
            title={activeReadoutTitle}
          />
          <div
            className="absolute top-1 rounded border border-border bg-card/95 px-2 py-1 text-[10px] shadow-lg"
            title={activeReadoutTitle}
            style={{
              left:
                activeIndex != null && activeIndex > displayData.length / 2
                  ? 4
                  : undefined,
              right:
                activeIndex != null && activeIndex > displayData.length / 2
                  ? undefined
                  : 4,
            }}
          >
            {pinnedIndex != null && activeIndex === pinnedIndex && (
              <div className="mb-0.5 inline-flex rounded border border-primary/30 bg-primary/10 px-1 py-0.5 font-mono text-[8px] font-semibold text-primary">
                PIN
              </div>
            )}
            {hoverIndex != null && activeIndex !== pinnedIndex && (
              <div className="mb-0.5 inline-flex rounded border border-border bg-muted/20 px-1 py-0.5 font-mono text-[8px] font-semibold text-muted-foreground">
                CUR
              </div>
            )}
            <div className="font-mono tabular-nums text-muted-foreground">
              {hoverPoint.date}
            </div>
            <div className="font-mono tabular-nums font-semibold text-foreground">
              {formatValue(hoverPoint.value)}
            </div>
            {hoverChangePct != null && hoverChange != null && (
              <div
                className={`font-mono tabular-nums ${
                  hoverChangePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {hoverChange >= 0 ? "+" : ""}
                {formatValue(hoverChange)} ({hoverChangePct >= 0 ? "+" : ""}
                {hoverChangePct.toFixed(2)}%)
              </div>
            )}
            {pinnedComparison && (
              <div
                className={`mt-0.5 border-t border-border/70 pt-0.5 font-mono tabular-nums ${
                  pinnedComparison.delta >= 0 ? "text-up" : "text-down"
                }`}
              >
                PIN {pinnedComparison.delta >= 0 ? "+" : ""}
                {formatValue(pinnedComparison.delta)} (
                {pinnedComparison.pct >= 0 ? "+" : ""}
                {pinnedComparison.pct.toFixed(2)}%)
                <span className="ml-1 text-muted-foreground">
                  {pinnedComparison.bars.toLocaleString()}봉/
                  {pinnedComparison.days.toLocaleString()}일
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
