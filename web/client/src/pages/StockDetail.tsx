/**
 * StockDetail.tsx — Individual Stock Page
 * Features: Price chart with expandable technical indicator panels
 * Indicators: Moving Averages, Bollinger Bands, MACD, RSI, Stochastic, Volume
 */
import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { US_STOCKS, KR_STOCKS } from "@/lib/data";
import { useStocks, useStock, useStockBars } from "@/features/stocks";
import type { Stock } from "@/types";
import {
  ArrowLeft, TrendingUp, TrendingDown, Star, Bell,
} from "lucide-react";
import StockChart from "@/components/StockChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { PriceAlertDialog } from "@/components/PriceAlertDialog";
import { toast } from "sonner";

// ── Data generators ────────────────────────────────────────────
// Build chart-ready rows from real OHLCV bars. Indicators (MA/BB/MACD/
// RSI/Stoch) are computed from the real close series so the technical
// panels reflect actual market data instead of the random mock. The
// math here is the textbook definition — short rolling windows for
// MAs, 14-period RSI, 12/26/9 MACD, 20/2 Bollinger, 14/3/3 Stoch.
function buildBarsRows(bars: { date: string; open: number; high: number; low: number; close: number; volume: number }[]) {
  const n = bars.length;
  const closes = bars.map((b) => b.close);

  const sma = (i: number, w: number) => {
    if (i + 1 < w) return closes[i];
    let s = 0; for (let k = i - w + 1; k <= i; k++) s += closes[k];
    return s / w;
  };
  const stdev = (i: number, w: number, mean: number) => {
    if (i + 1 < w) return 0;
    let s = 0; for (let k = i - w + 1; k <= i; k++) s += (closes[k] - mean) ** 2;
    return Math.sqrt(s / w);
  };
  // EMA series
  const ema = (period: number) => {
    const k = 2 / (period + 1);
    const out: number[] = [];
    closes.forEach((c, i) => { out.push(i === 0 ? c : c * k + out[i - 1] * (1 - k)); });
    return out;
  };
  const ema12 = ema(12);
  const ema26 = ema(26);
  const macdLineArr = ema12.map((v, i) => v - ema26[i]);
  // 9-EMA of MACD line for signal
  const signalArr: number[] = [];
  const sk = 2 / (9 + 1);
  macdLineArr.forEach((v, i) => signalArr.push(i === 0 ? v : v * sk + signalArr[i - 1] * (1 - sk)));

  // RSI(14)
  const rsiArr: number[] = [];
  let gain = 0, loss = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0) { rsiArr.push(50); continue; }
    const ch = closes[i] - closes[i - 1];
    const g = Math.max(ch, 0), l = Math.max(-ch, 0);
    if (i <= 14) {
      gain += g; loss += l;
      if (i === 14) {
        const avgG = gain / 14, avgL = loss / 14;
        rsiArr.push(avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL));
      } else {
        rsiArr.push(50);
      }
    } else {
      gain = (gain * 13 + g) / 14;
      loss = (loss * 13 + l) / 14;
      rsiArr.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
    }
  }

  // Stochastic %K(14), %D(3-SMA of %K)
  const kArr: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - 13);
    let hi = -Infinity, lo = Infinity;
    for (let k = start; k <= i; k++) {
      hi = Math.max(hi, bars[k].high);
      lo = Math.min(lo, bars[k].low);
    }
    kArr.push(hi === lo ? 50 : ((closes[i] - lo) / (hi - lo)) * 100);
  }
  const dArr = kArr.map((_, i) => {
    if (i < 2) return kArr[i];
    return (kArr[i] + kArr[i - 1] + kArr[i - 2]) / 3;
  });

  return bars.map((b, i) => {
    const dt = new Date(b.date);
    const label = `${dt.getMonth() + 1}/${dt.getDate()}`;
    const ma20v = sma(i, 20);
    const sd = stdev(i, 20, ma20v);
    const isUp = b.close >= b.open;
    return {
      day: i + 1,
      label,
      date: b.date,
      close: b.close,
      open: b.open,
      high: b.high,
      low: b.low,
      // Candle body & wick ranges — Recharts `Bar` with array dataKey
      // renders from min to max of the pair, which is exactly what we
      // need for OHLC candlesticks without writing a custom <Customized>.
      candleBody: [b.open, b.close] as [number, number],
      candleWick: [b.low, b.high] as [number, number],
      isUp,
      volume: Math.round(b.volume / 1_000_000), // → M for chart-tooltip parity
      ma5: sma(i, 5),
      ma20: ma20v,
      ma60: sma(i, 60),
      bbMiddle: ma20v,
      bbUpper: ma20v + 2 * sd,
      bbLower: ma20v - 2 * sd,
      macdLine: macdLineArr[i],
      signalLine: signalArr[i],
      histogram: macdLineArr[i] - signalArr[i],
      rsi: rsiArr[i],
      stochK: kArr[i],
      stochD: dArr[i],
    };
  });
}

function generatePriceData(days = 90, trend: "up" | "down" | "flat" = "up") {
  const data: Array<{
    day: number; label: string; date: string;
    close: number; open: number; high: number; low: number;
    candleBody: [number, number]; candleWick: [number, number]; isUp: boolean;
    volume: number;
    ma5: number; ma20: number; ma60: number;
    bbUpper: number; bbMiddle: number; bbLower: number;
    macdLine: number; signalLine: number; histogram: number;
    rsi: number;
    stochK: number; stochD: number;
  }> = [];

  let close = 100;
  let prevRsi = 50;
  let prevK = 50;

  for (let i = 0; i < days; i++) {
    const drift = trend === "up" ? 0.003 : trend === "down" ? -0.003 : 0;
    const change = drift + (Math.random() - 0.5) * 0.04;
    const open = close;
    close = Math.max(50, close * (1 + change));
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    const volume = Math.floor(Math.random() * 80 + 20);

    // Simple approximations for indicators
    const ma5 = close * (1 + (Math.random() - 0.5) * 0.01);
    const ma20 = close * (1 + (Math.random() - 0.5) * 0.025);
    const ma60 = close * (1 + (Math.random() - 0.5) * 0.04);
    const bbMiddle = ma20;
    const bbStd = close * 0.025;
    const bbUpper = bbMiddle + 2 * bbStd;
    const bbLower = bbMiddle - 2 * bbStd;

    // MACD approximation
    const macdLine = (ma5 - ma20) / close * 100;
    const signalLine = macdLine * 0.85 + (Math.random() - 0.5) * 0.3;
    const histogram = macdLine - signalLine;

    // RSI approximation (stays between 20-80)
    const rsiChange = (Math.random() - 0.5) * 8;
    const rsi = Math.max(20, Math.min(80, prevRsi + rsiChange));
    prevRsi = rsi;

    // Stochastic
    const kChange = (Math.random() - 0.5) * 12;
    const stochK = Math.max(5, Math.min(95, prevK + kChange));
    const stochD = stochK * 0.9 + (Math.random() - 0.5) * 3;
    prevK = stochK;

    const date = new Date(2025, 0, 1);
    date.setDate(date.getDate() + i);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;

    const isUp = close >= open;
    data.push({
      day: i + 1, label, date: date.toISOString().slice(0, 10),
      close, open, high, low,
      candleBody: [open, close],
      candleWick: [low, high],
      isUp,
      volume,
      ma5, ma20, ma60,
      bbUpper, bbMiddle, bbLower,
      macdLine, signalLine, histogram,
      rsi, stochK, stochD,
    });
  }
  return data;
}

// ── Indicator config ───────────────────────────────────────────
type IndicatorKey = "ma" | "bb" | "vol" | "macd" | "rsi" | "stoch";
const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  ma: "MA", bb: "BB(20,2)", vol: "Vol", macd: "MACD", rsi: "RSI", stoch: "Stoch",
};
type IndicatorSet = Record<IndicatorKey, boolean>;
const DEFAULT_INDICATORS: IndicatorSet = {
  ma: true, bb: false, vol: true, macd: false, rsi: false, stoch: false,
};

type PeriodKey = "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y";
const PERIOD_DAYS: Record<PeriodKey, number> = {
  "1W": 7, "1M": 22, "3M": 66, "6M": 130, "1Y": 252, "2Y": 504, "5Y": 1300,
};
const PERIOD_ORDER: PeriodKey[] = ["1W", "1M", "3M", "6M", "1Y", "2Y", "5Y"];

const PALETTE = {
  up: "#22c55e", down: "#ef4444",
  ma5: "#FBBF24", ma20: "#A78BFA", ma60: "#F87171",
  bb: "#38BDF8", macd: "#38BDF8", signal: "#F87171",
  rsi: "#A78BFA", stochK: "#FBBF24", stochD: "#F87171",
};

// ── Candlestick renderer (Customized) ──────────────────────────
// Recharts has no built-in candle. We render via <Customized>, which
// receives the full chart state including the y-scale and the per-bar
// x-positions from the price Bar series. Drawing rectangles + a thin
// wick line per bar gives us the classic OHLC look without dragging
// a heavy charting lib in.
function Candles({ chartData }: { chartData: any[] }) {
  return function CandleLayer(props: any) {
    const xMap = props.xAxisMap as Record<string, any> | undefined;
    const yMap = props.yAxisMap as Record<string, any> | undefined;
    if (!xMap || !yMap) return null;
    const xAxis = Object.values(xMap)[0] as any;
    const yAxis = Object.values(yMap)[0] as any;
    if (!xAxis?.scale || !yAxis?.scale) return null;
    const slot = xAxis.bandSize ?? 8;
    const bodyW = Math.max(1, Math.min(slot * 0.7, 8));
    return (
      <g>
        {chartData.map((d, i) => {
          const cx = xAxis.scale(d.label) + slot / 2;
          if (cx == null || isNaN(cx)) return null;
          const yHigh = yAxis.scale(d.high);
          const yLow = yAxis.scale(d.low);
          const yOpen = yAxis.scale(d.open);
          const yClose = yAxis.scale(d.close);
          const color = d.isUp ? PALETTE.up : PALETTE.down;
          const top = Math.min(yOpen, yClose);
          const h = Math.max(1, Math.abs(yClose - yOpen));
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
              <rect x={cx - bodyW / 2} y={top} width={bodyW} height={h} fill={color} />
            </g>
          );
        })}
      </g>
    );
  };
}

// ── Hover info strip ──────────────────────────────────────────
// Compact OHLC + indicators row above the chart that updates as the
// cursor moves across any synced pane. Mirrors TradingView's top-left
// data legend so the user never has to mouse-hunt for a tooltip.
function HoverInfo({
  data, idx, indicators, currency,
}: {
  data: any[]; idx: number | null; indicators: IndicatorSet; currency: string;
}) {
  const d = idx != null && idx >= 0 && idx < data.length ? data[idx] : data[data.length - 1];
  if (!d) return null;
  const pctVsPrev = (() => {
    const prevIdx = (idx ?? data.length - 1) - 1;
    if (prevIdx < 0) return 0;
    const prev = data[prevIdx];
    return prev ? ((d.close - prev.close) / prev.close) * 100 : 0;
  })();
  const fmt = (v: number | undefined, digits = 2) =>
    v == null || isNaN(v) ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const items: { label: string; value: string; color?: string }[] = [
    { label: "O", value: fmt(d.open), color: "text-muted-foreground" },
    { label: "H", value: fmt(d.high), color: "text-up" },
    { label: "L", value: fmt(d.low), color: "text-down" },
    { label: "C", value: fmt(d.close), color: d.isUp ? "text-up" : "text-down" },
    { label: "Δ", value: `${pctVsPrev >= 0 ? "+" : ""}${fmt(pctVsPrev)}%`, color: pctVsPrev >= 0 ? "text-up" : "text-down" },
  ];
  if (indicators.ma) {
    items.push({ label: "MA5", value: fmt(d.ma5), color: "" });
    items.push({ label: "MA20", value: fmt(d.ma20), color: "" });
    items.push({ label: "MA60", value: fmt(d.ma60), color: "" });
  }
  if (indicators.bb) {
    items.push({ label: "BB↑", value: fmt(d.bbUpper) });
    items.push({ label: "BB↓", value: fmt(d.bbLower) });
  }
  if (indicators.rsi) items.push({ label: "RSI", value: fmt(d.rsi, 1) });
  if (indicators.macd) items.push({ label: "MACD", value: fmt(d.macdLine, 3) });
  return (
    <div className="px-3 py-2 border-b border-border flex items-center gap-x-3 gap-y-1 text-[11px] flex-wrap bg-muted/10">
      <span className="text-xs font-mono-num font-semibold text-foreground">{d.date || d.label}</span>
      <span className="text-[10px] text-muted-foreground">{currency}</span>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{it.label}</span>
          <span className={cn("font-mono-num font-medium", it.color)}>{it.value}</span>
        </span>
      ))}
    </div>
  );
}

// Single chip used in the indicator toolbar.
function Chip({ on, label, onClick, color }: { on: boolean; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11px] px-2 py-0.5 rounded border transition-all font-medium",
        on
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
      )}
      style={on && color ? { color, borderColor: color + "66", background: color + "1a" } : undefined}
    >{label}</button>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function StockDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker?.toUpperCase() ?? "";

  const [chartPeriod, setChartPeriod] = useState<PeriodKey>("3M");
  const [activeTab, setActiveTab] = useState(0);
  const [indicators, setIndicators] = useState<IndicatorSet>(DEFAULT_INDICATORS);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const { isWatched, toggleWatchlist } = useWatchlist();

  // Live stock universe (US + KR movers) overlayed onto the mock
  // list. The Stock shape from /v1/movers matches the mock row shape
  // (ticker / name / price / changePct / sector / exchange) so we
  // can concat freely. Mock stays as backstop if /v1/movers is empty.
  const { data: liveUS } = useStocks("US");
  const { data: liveKR } = useStocks("KR");
  const allStocks = useMemo(
    () => [...(liveUS ?? []), ...(liveKR ?? []), ...US_STOCKS, ...KR_STOCKS],
    [liveUS, liveKR],
  );
  const fromListRaw = allStocks.find((s: any) => s.ticker === ticker);
  // The mock US_STOCKS / KR_STOCKS arrays are looser than Stock (missing
  // change / volume / country) — fill defaults so the rest of this file
  // gets a real Stock.
  const fromList: Stock | undefined = fromListRaw
    ? {
        ...(fromListRaw as Stock),
        change: (fromListRaw as any).change ?? 0,
        volume: (fromListRaw as any).volume ?? 0,
        country: (fromListRaw as any).country ?? (/^\d/.test(fromListRaw.ticker) ? "KR" : "US"),
      }
    : undefined;
  const watched = isWatched(ticker);

  // Profile fallback — any ticker not in the movers list (which is most
  // of the universe) still resolves through /v1/stocks/{ticker}/profile,
  // so we render the page instead of bailing out to "not found".
  // Note: Finnhub doesn't cover KR symbols → profile is null there.
  // We compensate by synthesizing a Stock from bars data alone when
  // the ticker looks Korean (numeric).
  const { data: profile, loading: profileLoading } = useStock(
    !fromList && ticker ? ticker : undefined,
  );

  const days = PERIOD_DAYS[chartPeriod] ?? 66;

  // Real OHLCV from the bars endpoint. We always try to load real bars;
  // fall back to the mock generator while loading or if the endpoint is
  // empty, so the chart shape is always populated.
  const { data: barsData } = useStockBars(ticker || undefined, days);
  const isKrTicker = /^\d/.test(ticker);
  // For KR tickers Finnhub returns nothing, so when bars resolved we
  // still want a render — synthesize the Stock from the ticker alone.
  const hasBars = !!(barsData && barsData.length);
  const inferredStock: Stock | undefined = fromList ?? (profile
    ? {
        ticker,
        name: profile.name || ticker,
        sector: profile.sector || "—",
        exchange: isKrTicker ? "KOSPI" : "NASDAQ",
        country: isKrTicker ? "KR" : "US",
        price: 0,
        change: 0,
        changePct: 0,
        volume: 0,
        marketCap: "",
      }
    : (isKrTicker && hasBars
        ? {
            ticker,
            name: ticker,
            sector: "—",
            exchange: "KOSPI",
            country: "KR",
            price: 0,
            change: 0,
            changePct: 0,
            volume: 0,
            marketCap: "",
          }
        : undefined));

  // Latest bar drives the header price/change if movers list didn't
  // supply it (typical for the long tail of profile-only resolutions).
  const latestBar = barsData && barsData.length ? barsData[barsData.length - 1] : null;
  const prevBar = barsData && barsData.length > 1 ? barsData[barsData.length - 2] : null;
  const livePrice = latestBar?.close ?? inferredStock?.price ?? 0;
  const liveChange = latestBar && prevBar ? latestBar.close - prevBar.close : (inferredStock?.change ?? 0);
  const liveChangePct = latestBar && prevBar
    ? ((latestBar.close - prevBar.close) / prevBar.close) * 100
    : (inferredStock?.changePct ?? 0);

  const stock: Stock | undefined = inferredStock
    ? { ...inferredStock, price: livePrice || inferredStock.price, change: liveChange, changePct: liveChangePct }
    : undefined;

  const up = stock ? stock.changePct >= 0 : true;
  const chartData = useMemo(() => {
    if (barsData && barsData.length > 5) return buildBarsRows(barsData);
    return generatePriceData(days, up ? "up" : "down");
  }, [barsData, days, up]);

  const toggle = (k: IndicatorKey) =>
    setIndicators((prev) => ({ ...prev, [k]: !prev[k] }));
  const currency = stock?.country === "KR" ? "KRW" : "USD";

  // Sync the active cursor across all panes. Recharts `syncId` shares
  // the vertical crosshair across charts sharing the id; we also use
  // local hover state to drive the data-legend strip above.
  const SYNC_ID = `sd-${ticker}`;
  const onMove = (e: any) => {
    if (e?.activeTooltipIndex != null) setHoveredIdx(e.activeTooltipIndex);
  };
  const onLeave = () => setHoveredIdx(null);
  const tickInterval = Math.max(0, Math.floor((chartData?.length ?? 0) / 8));

  if (!stock) {
    // Still resolving the profile? Render a skeleton instead of the
    // hard "not found" — most tickers go through this path.
    if (profileLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <div className="text-3xl font-bold font-mono-num text-muted-foreground/30">{ticker}</div>
          <p className="text-muted-foreground text-xs">종목 정보를 불러오는 중…</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-5xl font-bold font-mono-num text-muted-foreground/20">{ticker}</div>
        <p className="text-muted-foreground text-sm">종목 정보를 찾을 수 없습니다.</p>
        <Link href="/stocks"><Button variant="outline" size="sm"><ArrowLeft size={14} className="mr-1" />목록으로</Button></Link>
      </div>
    );
  }

  const TABS = ["차트 & 지표", "재무", "밸류에이션", "기술 신호"];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/stocks"><span className="hover:text-foreground transition-colors cursor-pointer">종목 검색</span></Link>
        <span>/</span>
        <span className="text-foreground font-medium">{ticker}</span>
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-3xl font-bold font-mono-num font-['Outfit']">{ticker}</h1>
              <Badge variant="outline" className="text-xs">{stock.exchange}</Badge>
              <Badge variant="outline" className="text-xs">{stock.sector}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{stock.name}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={watched ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (!stock) return;
                const nowAdded = toggleWatchlist({
                  ticker: stock.ticker, name: stock.name, exchange: stock.exchange,
                  price: stock.price, changePct: stock.changePct, sector: stock.sector,
                });
                toast.success(nowAdded ? "관심종목에 추가되었습니다" : "관심종목에서 제거되었습니다");
              }}
            >
              <Star size={13} className={watched ? "fill-current" : ""} />
              {watched ? "관심종목 해제" : "관심종목"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAlertOpen(true)}>
              <Bell size={13} />알림
            </Button>
            <Button size="sm">매수 분석</Button>
          </div>
          <PriceAlertDialog
            open={alertOpen}
            onOpenChange={setAlertOpen}
            symbol={ticker}
            currentPrice={stock?.price}
          />
        </div>

        <div className="flex flex-wrap items-end gap-6 mt-4 pt-4 border-t border-border">
          <div>
            <div className="text-4xl font-bold font-mono-num">{stock.price.toLocaleString()}</div>
            <div className={cn("flex items-center gap-1 mt-1 text-sm font-medium font-mono-num", up ? "text-up" : "text-down")}>
              {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {up ? "+" : ""}{(stock.price * stock.changePct / 100).toFixed(2)} ({up ? "+" : ""}{stock.changePct.toFixed(2)}%)
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-6 gap-y-2 text-sm">
            {[
              { label: "시가총액", value: stock.marketCap },
              { label: "P/E", value: `${stock.pe}x` },
              { label: "ROE", value: `${stock.roe}%` },
              { label: "52주 고가", value: (stock.price * 1.18).toFixed(0) },
              { label: "52주 저가", value: (stock.price * 0.74).toFixed(0) },
            ].map(item => (
              <div key={item.label}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</div>
                <div className="font-mono-num font-bold mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={cn("text-sm px-4 py-2 rounded-lg transition-all duration-200 font-medium",
              activeTab === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>{tab}</button>
        ))}
      </div>

      {/* ── Tab 0: Chart & Indicators (shared component) ── */}
      {activeTab === 0 && (
        <StockChart
          ticker={ticker}
          currency={stock.country === "KR" ? "KRW" : "USD"}
        />
      )}

      {/* ── Tab 1: Financials ── */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 overflow-x-auto">
            <h2 className="text-base font-bold font-['Outfit'] mb-4">연간 실적</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["항목", "2022", "2023", "2024", "TTM"].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "매출 (B$)", values: ["394", "383", "391", "398"] },
                  { label: "순이익 (B$)", values: ["100", "97", "101", "104"] },
                  { label: "EPS ($)", values: ["6.11", "6.13", "6.43", "6.58"] },
                  { label: "영업이익률", values: ["30.3%", "29.8%", "31.5%", "32.1%"] },
                  { label: "ROE", values: (() => { const roe = stock.roe ?? 20; return [`${roe}%`, `${(roe * 0.92).toFixed(1)}%`, `${(roe * 0.98).toFixed(1)}%`, `${roe}%`]; })() },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="py-2.5 px-3 font-mono-num text-sm font-medium">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 2: Valuation ── */}
      {activeTab === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ...(() => { const pe = stock.pe ?? 25; const roe = stock.roe ?? 20; return [
              { label: "P/E (현재)", value: `${pe}x`, peer: "섹터 평균 32x", status: pe < 32 ? "저평가" : "고평가" },
              { label: "P/B", value: `${(pe / 8).toFixed(1)}x`, peer: "섹터 평균 4.2x", status: "적정" },
              { label: "EV/EBITDA", value: `${(pe * 0.8).toFixed(1)}x`, peer: "섹터 평균 18x", status: "적정" },
              { label: "PEG Ratio", value: `${(pe / 20).toFixed(2)}`, peer: "1.0 이하 저평가", status: pe / 20 < 1 ? "저평가" : "고평가" },
              { label: "배당수익률", value: "0.52%", peer: "섹터 평균 1.2%", status: "낮음" },
              { label: "ROE", value: `${roe}%`, peer: "섹터 평균 18%", status: roe > 18 ? "우수" : "보통" },
            ]; })()
          ].map(item => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-2xl font-bold font-mono-num">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.peer}</div>
              <Badge variant="outline" className={cn("text-[10px] mt-2",
                item.status === "저평가" || item.status === "우수" ? "border-up text-up" :
                item.status === "고평가" || item.status === "낮음" ? "border-down text-down" :
                "border-muted-foreground text-muted-foreground"
              )}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 3: Technical Signals ── */}
      {activeTab === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "RSI (14)", value: chartData[chartData.length - 1]?.rsi.toFixed(1) ?? "62.4", desc: "중립 구간 (30-70)", status: "중립" },
            { label: "MACD", value: chartData[chartData.length - 1]?.macdLine.toFixed(3) ?? "+2.14", desc: "시그널 상향 돌파", status: "매수" },
            { label: "볼린저밴드", value: "중간 밴드 위", desc: "상단 밴드 도달 전", status: "중립" },
            { label: "MA20 / MA60", value: "골든크로스", desc: "단기 추세 상향", status: "매수" },
            { label: "거래량", value: "+42%", desc: "20일 평균 대비", status: "주목" },
            { label: "스토캐스틱", value: `${chartData[chartData.length - 1]?.stochK.toFixed(0) ?? 72} / ${chartData[chartData.length - 1]?.stochD.toFixed(0) ?? 68}`, desc: "과매수 근접", status: "주의" },
          ].map(item => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className={cn("w-1.5 h-10 rounded-full flex-shrink-0",
                item.status === "매수" ? "bg-up" :
                item.status === "매도" ? "bg-down" :
                item.status === "주의" ? "bg-gold" :
                item.status === "주목" ? "bg-sky" :
                "bg-muted-foreground/30"
              )} />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-base font-bold font-mono-num mt-0.5">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Badge variant="outline" className={cn("text-xs flex-shrink-0",
                item.status === "매수" || item.status === "주목" ? "border-up text-up" :
                item.status === "매도" ? "border-down text-down" :
                item.status === "주의" ? "border-gold text-gold" :
                "border-muted-foreground text-muted-foreground"
              )}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
