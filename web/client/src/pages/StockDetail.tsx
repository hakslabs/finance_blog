/**
 * StockDetail.tsx — Individual Stock Page
 * Features: Price chart with expandable technical indicator panels
 * Indicators: Moving Averages, Bollinger Bands, MACD, RSI, Stochastic, Volume
 */
import { useState, useMemo } from "react";
import { Link, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { US_STOCKS, KR_STOCKS } from "@/lib/data";
import {
  ComposedChart, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  CartesianGrid
} from "recharts";
import {
  ArrowLeft, TrendingUp, TrendingDown, Star, Bell,
  ChevronDown, ChevronUp, Settings2, Eye, EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { PriceAlertDialog } from "@/components/PriceAlertDialog";
import { toast } from "sonner";

// ── Data generators ────────────────────────────────────────────
function generatePriceData(days = 90, trend: "up" | "down" | "flat" = "up") {
  const data: Array<{
    day: number; label: string;
    close: number; open: number; high: number; low: number;
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

    data.push({
      day: i + 1, label,
      close, open, high, low, volume,
      ma5, ma20, ma60,
      bbUpper, bbMiddle, bbLower,
      macdLine, signalLine, histogram,
      rsi, stochK, stochD,
    });
  }
  return data;
}

// ── Indicator Panel Component ──────────────────────────────────
interface IndicatorConfig {
  id: string;
  label: string;
  shortLabel: string;
  enabled: boolean;
}

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: "ma", label: "이동평균선 (MA5 · MA20 · MA60)", shortLabel: "MA", enabled: true },
  { id: "bb", label: "볼린저 밴드 (BB 20,2)", shortLabel: "BB", enabled: false },
  { id: "macd", label: "MACD (12,26,9)", shortLabel: "MACD", enabled: true },
  { id: "rsi", label: "RSI (14)", shortLabel: "RSI", enabled: true },
  { id: "stoch", label: "스토캐스틱 (14,3,3)", shortLabel: "Stoch", enabled: false },
  { id: "volume", label: "거래량", shortLabel: "Vol", enabled: true },
];

function IndicatorToggle({
  config,
  onToggle,
}: {
  config: IndicatorConfig;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(config.id)}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
        config.enabled
          ? "bg-primary/10 border-primary text-primary"
          : "bg-transparent border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      )}
    >
      {config.enabled ? <Eye size={11} /> : <EyeOff size={11} />}
      {config.shortLabel}
    </button>
  );
}

interface ExpandablePanelProps {
  title: string;
  subtitle?: string;
  height?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

function ExpandablePanel({ title, subtitle, height = 120, children, defaultOpen = true, accentColor = "var(--primary)" }: ExpandablePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: accentColor }} />
          <span className="text-xs font-bold text-foreground">{title}</span>
          {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-2 pb-2 pt-1" style={{ height }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg min-w-[160px]">
      <div className="text-muted-foreground mb-1.5 font-medium">{d.label}</div>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-4"><span className="text-muted-foreground">종가</span><span className="font-mono-num font-bold">{d.close?.toFixed(2)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-muted-foreground">시가</span><span className="font-mono-num">{d.open?.toFixed(2)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-muted-foreground">고가</span><span className="font-mono-num text-up">{d.high?.toFixed(2)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-muted-foreground">저가</span><span className="font-mono-num text-down">{d.low?.toFixed(2)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-muted-foreground">거래량</span><span className="font-mono-num">{d.volume}M</span></div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function StockDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker?.toUpperCase() ?? "";

  const [chartPeriod, setChartPeriod] = useState<"1W" | "1M" | "3M" | "6M" | "1Y">("3M");
  const [activeTab, setActiveTab] = useState(0);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [alertOpen, setAlertOpen] = useState(false);
  const { isWatched, toggleWatchlist } = useWatchlist();

  const allStocks = [...US_STOCKS, ...KR_STOCKS];
  const stock = allStocks.find(s => s.ticker === ticker);
  const watched = isWatched(ticker);

  const periodDays: Record<string, number> = { "1W": 7, "1M": 22, "3M": 66, "6M": 130, "1Y": 252 };
  const days = periodDays[chartPeriod] ?? 66;
  const up = stock ? stock.changePct >= 0 : true;
  const chartData = useMemo(() => generatePriceData(days, up ? "up" : "down"), [days, up]);

  const toggleIndicator = (id: string) => {
    setIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, enabled: !ind.enabled } : ind));
  };

  const isEnabled = (id: string) => indicators.find(i => i.id === id)?.enabled ?? false;

  if (!stock) {
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

      {/* ── Tab 0: Chart & Indicators ── */}
      {activeTab === 0 && (
        <div className="space-y-3">
          {/* Chart controls */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              {/* Period selector */}
              <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
                {(["1W", "1M", "3M", "6M", "1Y"] as const).map(p => (
                  <button key={p} onClick={() => setChartPeriod(p)}
                    className={cn("text-xs px-2.5 py-1 rounded-md transition-colors font-medium",
                      chartPeriod === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}>{p}</button>
                ))}
              </div>

              {/* Indicator toggles */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Settings2 size={13} className="text-muted-foreground mr-1" />
                {indicators.map(ind => (
                  <IndicatorToggle key={ind.id} config={ind} onToggle={toggleIndicator} />
                ))}
              </div>
            </div>

            {/* Main price chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={up ? "#22c55e" : "#ef4444"} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={up ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                    </linearGradient>
                    {isEnabled("bb") && (
                      <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.02} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                    domain={["auto", "auto"]} tickFormatter={(v) => v.toFixed(0)} />
                  <Tooltip content={<PriceTooltip />} />

                  {/* Bollinger Bands */}
                  {isEnabled("bb") && <>
                    <Area type="monotone" dataKey="bbUpper" stroke="#38BDF8" strokeWidth={1}
                      strokeDasharray="3 2" fill="none" dot={false} name="BB상단" />
                    <Area type="monotone" dataKey="bbLower" stroke="#38BDF8" strokeWidth={1}
                      strokeDasharray="3 2" fill="url(#bbGrad)" dot={false} name="BB하단" />
                    <Line type="monotone" dataKey="bbMiddle" stroke="#38BDF8" strokeWidth={1}
                      strokeDasharray="5 3" dot={false} name="BB중심" opacity={0.6} />
                  </>}

                  {/* Moving Averages */}
                  {isEnabled("ma") && <>
                    <Line type="monotone" dataKey="ma5" stroke="#FBBF24" strokeWidth={1.5}
                      dot={false} name="MA5" />
                    <Line type="monotone" dataKey="ma20" stroke="#A78BFA" strokeWidth={1.5}
                      dot={false} name="MA20" />
                    <Line type="monotone" dataKey="ma60" stroke="#F87171" strokeWidth={1.5}
                      dot={false} name="MA60" />
                  </>}

                  {/* Price area */}
                  <Area type="monotone" dataKey="close" stroke={up ? "#22c55e" : "#ef4444"}
                    strokeWidth={2} fill="url(#priceGrad)" dot={false} name="종가" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* MA legend */}
            {isEnabled("ma") && (
              <div className="flex gap-4 mt-2 flex-wrap">
                {[
                  { label: "MA5", color: "#FBBF24" },
                  { label: "MA20", color: "#A78BFA" },
                  { label: "MA60", color: "#F87171" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 rounded" style={{ background: l.color }} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
                {isEnabled("bb") && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 rounded border-t border-dashed" style={{ borderColor: "#38BDF8" }} />
                    <span className="text-[10px] text-muted-foreground">BB (20,2)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Expandable Indicator Panels ── */}

          {/* Volume */}
          {isEnabled("volume") && (
            <ExpandablePanel title="거래량" subtitle="Volume" height={110} accentColor="var(--muted-foreground)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 8 }} tickLine={false} axisLine={false}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
                    formatter={(v: number) => [`${v}M`, "거래량"]}
                  />
                  <Bar dataKey="volume" radius={[2, 2, 0, 0]}
                    fill="var(--muted-foreground)" opacity={0.5} name="거래량" />
                </BarChart>
              </ResponsiveContainer>
            </ExpandablePanel>
          )}

          {/* MACD */}
          {isEnabled("macd") && (
            <ExpandablePanel title="MACD" subtitle="12, 26, 9" height={130} accentColor="#38BDF8">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 8 }} tickLine={false} axisLine={false}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
                    formatter={(v: number, name: string) => [v.toFixed(3), name]}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
                  <Bar dataKey="histogram" name="히스토그램" radius={[1, 1, 0, 0]}
                    fill="#38BDF8" opacity={0.5} />
                  <Line type="monotone" dataKey="macdLine" stroke="#38BDF8" strokeWidth={1.5}
                    dot={false} name="MACD" />
                  <Line type="monotone" dataKey="signalLine" stroke="#F87171" strokeWidth={1.5}
                    dot={false} name="시그널" strokeDasharray="3 2" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-1">
                {[
                  { label: "MACD", color: "#38BDF8" },
                  { label: "시그널", color: "#F87171" },
                  { label: "히스토그램", color: "#38BDF8", opacity: 0.5 },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ background: l.color, opacity: l.opacity ?? 1 }} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </ExpandablePanel>
          )}

          {/* RSI */}
          {isEnabled("rsi") && (
            <ExpandablePanel title="RSI" subtitle="14" height={130} accentColor="#A78BFA">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 8 }} tickLine={false} axisLine={false}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false}
                    domain={[0, 100]} ticks={[20, 30, 50, 70, 80]} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
                    formatter={(v: number) => [v.toFixed(1), "RSI"]}
                  />
                  {/* Overbought / Oversold zones */}
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={1} label={{ value: "과매수 70", position: "right", fontSize: 8, fill: "#ef4444" }} />
                  <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 2" strokeWidth={1} label={{ value: "과매도 30", position: "right", fontSize: 8, fill: "#22c55e" }} />
                  <ReferenceLine y={50} stroke="var(--border)" strokeWidth={1} />
                  <Area type="monotone" dataKey="rsi" stroke="#A78BFA" strokeWidth={2}
                    fill="#A78BFA" fillOpacity={0.1} dot={false} name="RSI" />
                </ComposedChart>
              </ResponsiveContainer>
            </ExpandablePanel>
          )}

          {/* Stochastic */}
          {isEnabled("stoch") && (
            <ExpandablePanel title="스토캐스틱" subtitle="14, 3, 3" height={130} defaultOpen={false} accentColor="#FBBF24">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 8 }} tickLine={false} axisLine={false}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false}
                    domain={[0, 100]} ticks={[20, 50, 80]} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
                    formatter={(v: number, name: string) => [v.toFixed(1), name]}
                  />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={1} />
                  <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="3 2" strokeWidth={1} />
                  <Line type="monotone" dataKey="stochK" stroke="#FBBF24" strokeWidth={1.5}
                    dot={false} name="%K" />
                  <Line type="monotone" dataKey="stochD" stroke="#F87171" strokeWidth={1.5}
                    dot={false} name="%D" strokeDasharray="3 2" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-1">
                {[{ label: "%K", color: "#FBBF24" }, { label: "%D", color: "#F87171" }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ background: l.color }} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </ExpandablePanel>
          )}

          {/* Current indicator values summary */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">현재 지표 값</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "RSI (14)", value: chartData[chartData.length - 1]?.rsi.toFixed(1) ?? "—",
                  status: (chartData[chartData.length - 1]?.rsi ?? 50) > 70 ? "과매수" : (chartData[chartData.length - 1]?.rsi ?? 50) < 30 ? "과매도" : "중립",
                  color: (chartData[chartData.length - 1]?.rsi ?? 50) > 70 ? "text-down" : (chartData[chartData.length - 1]?.rsi ?? 50) < 30 ? "text-up" : "text-muted-foreground" },
                { label: "MACD", value: chartData[chartData.length - 1]?.macdLine.toFixed(3) ?? "—",
                  status: (chartData[chartData.length - 1]?.macdLine ?? 0) > (chartData[chartData.length - 1]?.signalLine ?? 0) ? "골든크로스" : "데드크로스",
                  color: (chartData[chartData.length - 1]?.macdLine ?? 0) > (chartData[chartData.length - 1]?.signalLine ?? 0) ? "text-up" : "text-down" },
                { label: "MA20", value: chartData[chartData.length - 1]?.ma20.toFixed(2) ?? "—",
                  status: stock.price > (chartData[chartData.length - 1]?.ma20 ?? 0) ? "위" : "아래",
                  color: stock.price > (chartData[chartData.length - 1]?.ma20 ?? 0) ? "text-up" : "text-down" },
                { label: "BB 위치", value: (() => {
                  const d = chartData[chartData.length - 1];
                  if (!d) return "—";
                  const pct = ((d.close - d.bbLower) / (d.bbUpper - d.bbLower) * 100).toFixed(0);
                  return `${pct}%`;
                })(),
                  status: "밴드 내", color: "text-muted-foreground" },
                { label: "Stoch %K", value: chartData[chartData.length - 1]?.stochK.toFixed(1) ?? "—",
                  status: (chartData[chartData.length - 1]?.stochK ?? 50) > 80 ? "과매수" : (chartData[chartData.length - 1]?.stochK ?? 50) < 20 ? "과매도" : "중립",
                  color: (chartData[chartData.length - 1]?.stochK ?? 50) > 80 ? "text-down" : (chartData[chartData.length - 1]?.stochK ?? 50) < 20 ? "text-up" : "text-muted-foreground" },
                { label: "거래량", value: `${chartData[chartData.length - 1]?.volume ?? 0}M`,
                  status: "평균 대비", color: "text-muted-foreground" },
              ].map(item => (
                <div key={item.label} className="bg-muted/30 rounded-lg p-2.5">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-bold font-mono-num mt-0.5">{item.value}</div>
                  <div className={cn("text-[10px] mt-0.5", item.color)}>{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                  { label: "ROE", values: [`${stock.roe}%`, `${(stock.roe * 0.92).toFixed(1)}%`, `${(stock.roe * 0.98).toFixed(1)}%`, `${stock.roe}%`] },
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
            { label: "P/E (현재)", value: `${stock.pe}x`, peer: "섹터 평균 32x", status: stock.pe < 32 ? "저평가" : "고평가" },
            { label: "P/B", value: `${(stock.pe / 8).toFixed(1)}x`, peer: "섹터 평균 4.2x", status: "적정" },
            { label: "EV/EBITDA", value: `${(stock.pe * 0.8).toFixed(1)}x`, peer: "섹터 평균 18x", status: "적정" },
            { label: "PEG Ratio", value: `${(stock.pe / 20).toFixed(2)}`, peer: "1.0 이하 저평가", status: stock.pe / 20 < 1 ? "저평가" : "고평가" },
            { label: "배당수익률", value: "0.52%", peer: "섹터 평균 1.2%", status: "낮음" },
            { label: "ROE", value: `${stock.roe}%`, peer: "섹터 평균 18%", status: stock.roe > 18 ? "우수" : "보통" },
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
