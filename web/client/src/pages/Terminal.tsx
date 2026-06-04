/**
 * Terminal — high-density Bloomberg-style market terminal.
 *
 * A new standalone view (route: /terminal) layered on top of the existing
 * data stack. Every panel reads REAL data from the same feature hooks/services
 * the rest of the app uses; panels with no backing endpoint (order book,
 * Level II, options flow, vol surface, cross-asset flow) render an explicit
 * "데이터 없음 · API 필요" state instead of fabricating numbers — per the
 * project's no-fake-data policy.
 *
 * Layout matches the reference terminal: left intel rail, center price/tech
 * stack, right fundamentals/AI rail, with a command bar + index strip on top
 * and an F-key status bar on the bottom.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/http";
import StockChart from "@/components/StockChart";
import { useIndices } from "@/features/indices";
import {
  useStocks,
  useStock,
  useStockBars,
  stocksService,
} from "@/features/stocks";
import { useSectors } from "@/features/sectors";
import { useFearGreed } from "@/features/fear-greed";
import { useMacroIndicators } from "@/features/macro";
import { useUnifiedCalendar } from "@/features/calendar";
import {
  annualizedVol,
  correlation,
  dailyReturns,
  ema,
  historicalVar,
  macd as computeMacd,
  maxDrawdown,
  rsi,
  sma,
} from "@/lib/indicators";
import type { MarketIndex, SectorData, Stock } from "@/types";

/* ────────────────────────── format helpers ────────────────────────── */

const DEFAULT_SYMBOL = "AAPL";

function nf(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function pct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function compactVol(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

function toneClass(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "text-muted-foreground";
  return n > 0 ? "text-up" : n < 0 ? "text-down" : "text-muted-foreground";
}

/* ────────────────────────── shared UI atoms ────────────────────────── */

function Panel({
  title,
  badge,
  badgeTone = "neutral",
  right,
  className,
  children,
}: {
  title: string;
  badge?: string;
  badgeTone?: "live" | "db" | "calc" | "local" | "warn" | "neutral";
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const tone = {
    live: "text-up border-up/40",
    db: "text-primary border-primary/40",
    calc: "text-primary border-primary/40",
    local: "text-amber-400 border-amber-400/40",
    warn: "text-down border-down/40",
    neutral: "text-muted-foreground border-border",
  }[badgeTone];
  return (
    <section
      className={cn(
        "flex flex-col rounded-md border border-border bg-card/70 backdrop-blur-sm overflow-hidden",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/70 px-2.5 py-1.5">
        <h3 className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
          {title}
        </h3>
        <div className="flex items-center gap-1.5">
          {right}
          {badge && (
            <span
              className={cn(
                "rounded-sm border px-1 py-px text-[9px] font-mono uppercase tracking-wider",
                tone,
              )}
            >
              {badge}
            </span>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-auto p-2.5">{children}</div>
    </section>
  );
}

/** Honest empty/loading/error/needs-api state — never shows fabricated data. */
function StateNote({
  kind,
  message,
  detail,
  onRetry,
}: {
  kind: "loading" | "error" | "empty" | "api";
  message: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[60px] flex-col items-center justify-center gap-1.5 px-3 py-4 text-center">
      {kind === "loading" ? (
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      ) : kind === "api" ? (
        <span className="rounded-sm border border-amber-400/40 px-1.5 py-px text-[9px] font-mono uppercase tracking-wider text-amber-400">
          API 필요
        </span>
      ) : (
        <AlertTriangle
          size={15}
          className={kind === "error" ? "text-down" : "text-muted-foreground"}
        />
      )}
      <div className="text-[11px] leading-snug text-muted-foreground">
        {message}
      </div>
      {detail && (
        <div className="max-w-full truncate font-mono text-[9px] text-muted-foreground/70">
          {detail}
        </div>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <RefreshCw size={10} /> 다시 불러오기
        </button>
      )}
    </div>
  );
}

function Pct({
  value,
  digits = 2,
}: {
  value: number | null | undefined;
  digits?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono",
        toneClass(value),
      )}
    >
      {value != null && Number.isFinite(value) ? (
        value >= 0 ? (
          <TrendingUp size={9} />
        ) : (
          <TrendingDown size={9} />
        )
      ) : null}
      {pct(value, digits)}
    </span>
  );
}

/* ────────────────────────── index strip ────────────────────────── */

function IndexStrip() {
  const { data, loading, error, updatedAt, refetch } = useIndices();
  if (loading && !data)
    return (
      <div className="flex h-9 items-center px-3 text-[11px] text-muted-foreground">
        <Loader2 size={13} className="mr-1.5 animate-spin" /> 지수 로딩 중…
      </div>
    );
  if (error && !data)
    return (
      <div className="flex h-9 items-center gap-2 px-3 text-[11px] text-down">
        지수 데이터를 불러오지 못했습니다
        <button onClick={refetch} className="underline">
          재시도
        </button>
      </div>
    );
  const items = data ?? [];
  return (
    <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap border-b border-border/70 bg-card/50 px-3 py-1.5 text-[11px]">
      {items.length === 0 ? (
        <span className="text-muted-foreground">
          표시할 지수 데이터가 없습니다
        </span>
      ) : (
        items.map((ix: MarketIndex) => (
          <span key={ix.symbol} className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-foreground/90">
              {ix.symbol}
            </span>
            <span className="font-mono text-foreground/80">{nf(ix.value)}</span>
            <Pct value={ix.changePct} />
          </span>
        ))
      )}
      {updatedAt && (
        <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
          upd{" "}
          {new Date(updatedAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}

/* ────────────────────────── left rail ────────────────────────── */

function MarketPulse() {
  const { data: us, loading } = useStocks("US");
  const { data: fg } = useFearGreed("US");
  const stats = useMemo(() => {
    if (!us || us.length === 0) return null;
    const adv = us.filter((s) => s.changePct > 0).length;
    const dec = us.filter((s) => s.changePct < 0).length;
    const avg = us.reduce((a, s) => a + s.changePct, 0) / us.length;
    return { adv, dec, avg, total: us.length };
  }, [us]);

  return (
    <Panel title="Market Pulse" badge="LIVE" badgeTone="live">
      {loading && !stats ? (
        <StateNote kind="loading" message="시장 등락 집계 중" />
      ) : !stats ? (
        <StateNote kind="empty" message="등락 데이터가 없습니다" />
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-up">
                {stats.adv}
              </div>
              <div className="text-[9px] uppercase text-muted-foreground">
                Adv
              </div>
            </div>
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-down">
                {stats.dec}
              </div>
              <div className="text-[9px] uppercase text-muted-foreground">
                Dec
              </div>
            </div>
            <div className="text-center">
              <div
                className={cn(
                  "font-mono text-lg font-bold",
                  toneClass(stats.avg),
                )}
              >
                {pct(stats.avg)}
              </div>
              <div className="text-[9px] uppercase text-muted-foreground">
                Avg
              </div>
            </div>
          </div>
          {/* adv/dec ratio bar */}
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/20">
            <div
              className="bg-up"
              style={{ width: `${(stats.adv / stats.total) * 100}%` }}
            />
            <div
              className="bg-down"
              style={{ width: `${(stats.dec / stats.total) * 100}%` }}
            />
          </div>
          {fg && (
            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-[10px] uppercase text-muted-foreground">
                Fear&amp;Greed
              </span>
              <span className="font-mono text-sm font-bold text-primary">
                {fg.value}{" "}
                <span className="text-[10px] text-muted-foreground">
                  {fg.label}
                </span>
              </span>
            </div>
          )}
          <div className="text-[9px] text-muted-foreground/70">
            US 추적종목 {stats.total}개 · /movers DB 집계
          </div>
        </div>
      )}
    </Panel>
  );
}

function WatchGrid({
  onSelect,
  active,
}: {
  onSelect: (s: string) => void;
  active: string;
}) {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const { data, loading, error, refetch } = useStocks(market);
  return (
    <Panel
      title="Watch Grid"
      badge="DB"
      badgeTone="db"
      right={
        <div className="flex overflow-hidden rounded-sm border border-border">
          {(["US", "KR"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={cn(
                "px-1.5 py-px text-[9px] font-mono",
                market === m
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      }
    >
      {loading && !data ? (
        <StateNote kind="loading" message="워치 그리드 로딩 중" />
      ) : error && !data ? (
        <StateNote
          kind="error"
          message="종목 데이터 요청 실패"
          onRetry={refetch}
        />
      ) : !data || data.length === 0 ? (
        <StateNote kind="empty" message="표시할 종목이 없습니다" />
      ) : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9px] uppercase text-muted-foreground">
              <th className="pb-1 text-left font-medium">종목</th>
              <th className="pb-1 text-right font-medium">Last</th>
              <th className="pb-1 text-right font-medium">Chg%</th>
              <th className="pb-1 text-right font-medium">Vol</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 12).map((s: Stock) => (
              <tr
                key={s.ticker}
                onClick={() => onSelect(s.ticker)}
                className={cn(
                  "cursor-pointer border-t border-border/40 hover:bg-muted/20",
                  active === s.ticker && "bg-primary/10",
                )}
              >
                <td className="py-0.5">
                  <div className="truncate font-medium text-foreground/90 max-w-[110px]">
                    {s.name || s.ticker}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">
                    {s.ticker}
                  </div>
                </td>
                <td className="py-0.5 text-right font-mono text-foreground/80">
                  {nf(s.price)}
                </td>
                <td className="py-0.5 text-right">
                  <span className={cn("font-mono", toneClass(s.changePct))}>
                    {pct(s.changePct)}
                  </span>
                </td>
                <td className="py-0.5 text-right font-mono text-muted-foreground">
                  {compactVol(s.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function SectorMap() {
  const { data, loading, error, refetch } = useSectors("US");
  return (
    <Panel title="Sector Map" badge="DB" badgeTone="db">
      {loading && !data ? (
        <StateNote kind="loading" message="섹터 로딩 중" />
      ) : error ? (
        <StateNote
          kind="error"
          message="섹터 데이터 요청 실패"
          onRetry={refetch}
        />
      ) : !data || data.length === 0 ? (
        <StateNote kind="empty" message="섹터 데이터가 없습니다" />
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {data.slice(0, 9).map((s: SectorData) => {
            const v = s.returnDay;
            const intensity = Math.min(Math.abs(v) / 3, 1);
            const bg =
              v > 0
                ? `rgba(34,197,94,${0.12 + intensity * 0.5})`
                : v < 0
                  ? `rgba(239,68,68,${0.12 + intensity * 0.5})`
                  : "rgba(120,120,120,0.15)";
            return (
              <div
                key={s.sector}
                className="rounded-sm p-1.5 text-center"
                style={{ backgroundColor: bg }}
                title={`${s.sector} ${pct(v)}`}
              >
                <div className="truncate text-[10px] font-medium text-foreground/90">
                  {s.sector}
                </div>
                <div className="font-mono text-[11px] font-bold text-foreground">
                  {pct(v)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function MacroFutures() {
  const { data, loading, error, refetch } = useMacroIndicators();
  const items = useMemo(
    () => (data ?? []).filter((m) => m.country !== "KR").slice(0, 6),
    [data],
  );
  return (
    <Panel title="US Macro / Futures" badge="DB" badgeTone="db">
      {loading && !data ? (
        <StateNote kind="loading" message="매크로 로딩 중" />
      ) : error ? (
        <StateNote kind="error" message="매크로 요청 실패" onRetry={refetch} />
      ) : items.length === 0 ? (
        <StateNote kind="empty" message="매크로 지표가 없습니다" />
      ) : (
        <div className="space-y-1">
          {items.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="truncate text-foreground/80">{m.name}</span>
              <span className="ml-2 shrink-0 font-mono text-foreground/90">
                {m.value}
                <span className="ml-1 text-muted-foreground/70">{m.unit}</span>
              </span>
            </div>
          ))}
          <div className="pt-1 text-[9px] text-muted-foreground/70">
            FRED/ECOS · /macros/indicators
          </div>
        </div>
      )}
    </Panel>
  );
}

function FlowRadar() {
  // No backing endpoint for cross-asset fund flows yet — be explicit.
  return (
    <Panel title="Flow Radar" badge="NO DATA" badgeTone="warn">
      <div className="space-y-1.5 opacity-90">
        {["Equity", "Rates", "FX", "Credit", "Crypto"].map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] text-muted-foreground">
              {k}
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-muted/15" />
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border/60 pt-2">
        <StateNote
          kind="api"
          message="자금 흐름 데이터 소스 미연결"
          detail="요구: 섹터/자산군 flow API"
        />
      </div>
    </Panel>
  );
}

/* ────────────────────────── center: symbol + chart + tech ────────────────────────── */

function SymbolHeader({ symbol }: { symbol: string }) {
  const { data: profile } = useStock(symbol);
  const { data: bars, loading } = useStockBars(symbol, 60);
  const snap = useMemo(() => {
    if (!bars || bars.length < 2) return null;
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    const change = last.close - prev.close;
    const changePct = prev.close ? (change / prev.close) * 100 : 0;
    return { last, change, changePct };
  }, [bars]);

  const cells = [
    { label: "Last", value: snap ? nf(snap.last.close) : "—" },
    { label: "Open", value: snap ? nf(snap.last.open) : "—" },
    { label: "High", value: snap ? nf(snap.last.high) : "—" },
    { label: "Low", value: snap ? nf(snap.last.low) : "—" },
    { label: "Vol", value: snap ? compactVol(snap.last.volume) : "—" },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-md border border-border bg-card/70">
      <div className="flex min-w-[150px] flex-col justify-center px-3 py-2">
        <div className="font-mono text-base font-bold text-foreground">
          {symbol}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {profile?.name ?? (loading ? "로딩 중…" : "—")}
        </div>
      </div>
      {snap && (
        <div className="flex flex-col justify-center px-3 py-2">
          <div className="font-mono text-base font-bold text-foreground">
            {nf(snap.last.close)}
          </div>
          <Pct value={snap.changePct} />
        </div>
      )}
      {cells.map((c) => (
        <div
          key={c.label}
          className="flex min-w-[78px] flex-1 flex-col justify-center border-l border-border/50 px-3 py-2"
        >
          <div className="text-[9px] uppercase text-muted-foreground">
            {c.label}
          </div>
          <div className="font-mono text-[13px] text-foreground/90">
            {c.value}
          </div>
        </div>
      ))}
      <div className="flex min-w-[96px] flex-col justify-center border-l border-border/50 px-3 py-2">
        <div className="text-[9px] uppercase text-muted-foreground">Data</div>
        <div className="text-[10px] text-primary">DB / API bars</div>
      </div>
    </div>
  );
}

interface TechSnapshot {
  last: number;
  changePct: number;
  sma20: number | null;
  sma60: number | null;
  ema12: number | null;
  rsi14: number | null;
  macd: number | null;
  signal: number | null;
  volAnn: number | null;
  var95: number | null;
  maxDd: number | null;
}

function useTech(symbol: string): {
  tech: TechSnapshot | null;
  loading: boolean;
  closes: number[];
} {
  const { data: bars, loading } = useStockBars(symbol, 400);
  const closes = useMemo(() => (bars ?? []).map((b) => b.close), [bars]);
  const tech = useMemo<TechSnapshot | null>(() => {
    if (closes.length < 2) return null;
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const m = computeMacd(closes);
    return {
      last,
      changePct: prev ? (last / prev - 1) * 100 : 0,
      sma20: sma(closes, 20),
      sma60: sma(closes, 60),
      ema12: ema(closes, 12),
      rsi14: rsi(closes, 14),
      macd: m?.macd ?? null,
      signal: m?.signal ?? null,
      volAnn: annualizedVol(closes),
      var95: historicalVar(closes, 0.95),
      maxDd: maxDrawdown(closes),
    };
  }, [closes]);
  return { tech, loading, closes };
}

function TechRiskEngine({
  tech,
  loading,
}: {
  tech: TechSnapshot | null;
  loading: boolean;
}) {
  const rows: { label: string; value: string; tone?: string }[] = tech
    ? [
        { label: "Last", value: nf(tech.last) },
        {
          label: "Chg%",
          value: pct(tech.changePct),
          tone: toneClass(tech.changePct),
        },
        { label: "SMA20", value: nf(tech.sma20) },
        { label: "SMA60", value: nf(tech.sma60) },
        { label: "EMA12", value: nf(tech.ema12) },
        {
          label: "RSI14",
          value: tech.rsi14 != null ? tech.rsi14.toFixed(1) : "—",
          tone:
            tech.rsi14 == null
              ? undefined
              : tech.rsi14 >= 70
                ? "text-down"
                : tech.rsi14 <= 30
                  ? "text-up"
                  : undefined,
        },
        { label: "MACD", value: nf(tech.macd) },
        { label: "Signal", value: nf(tech.signal) },
        {
          label: "Vol(ann)",
          value:
            tech.volAnn != null ? `${(tech.volAnn * 100).toFixed(1)}%` : "—",
        },
        {
          label: "VaR95(1d)",
          value: tech.var95 != null ? `${(tech.var95 * 100).toFixed(2)}%` : "—",
          tone: "text-down",
        },
        {
          label: "MaxDD",
          value: tech.maxDd != null ? `${(tech.maxDd * 100).toFixed(1)}%` : "—",
          tone: "text-down",
        },
      ]
    : [];
  return (
    <Panel title="Tech / Risk Engine" badge="CALC" badgeTone="calc">
      {loading && !tech ? (
        <StateNote kind="loading" message="지표 계산 중" />
      ) : !tech ? (
        <StateNote kind="empty" message="계산할 가격 데이터가 부족합니다" />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className={cn("font-mono", r.tone ?? "text-foreground/90")}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 text-[9px] text-muted-foreground/70">
        실제 OHLCV bars 기반 클라이언트 계산값
      </div>
    </Panel>
  );
}

function CrossAssetMatrix({
  symbol,
  peers,
}: {
  symbol: string;
  peers: string[];
}) {
  const symbols = useMemo(() => {
    const set = [symbol, ...peers.filter((p) => p !== symbol)].slice(0, 5);
    return Array.from(new Set(set));
  }, [symbol, peers]);

  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    matrix: (number | null)[][] | null;
    labels: string[];
  }>({ loading: true, error: null, matrix: null, labels: [] });

  useEffect(() => {
    if (symbols.length < 2) {
      setState({ loading: false, error: null, matrix: null, labels: symbols });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    stocksService
      .compareBars(symbols, 180)
      .then((resp) => {
        if (!alive) return;
        // Build per-symbol close series from aligned rows, then correlate returns.
        const series: Record<string, number[]> = {};
        symbols.forEach((sym) => (series[sym] = []));
        for (const row of resp.rows) {
          for (const sym of symbols) {
            const v = row[sym];
            if (typeof v === "number" && Number.isFinite(v))
              series[sym].push(v);
          }
        }
        const returns = symbols.map((sym) => dailyReturns(series[sym]));
        const matrix = symbols.map((_, i) =>
          symbols.map((__, j) =>
            i === j ? 1 : correlation(returns[i], returns[j]),
          ),
        );
        const anyData = symbols.some((sym) => series[sym].length > 5);
        setState({
          loading: false,
          error: null,
          matrix: anyData ? matrix : null,
          labels: symbols,
        });
      })
      .catch((e) => {
        if (!alive) return;
        setState({
          loading: false,
          error: String(e?.message ?? e),
          matrix: null,
          labels: symbols,
        });
      });
    return () => {
      alive = false;
    };
  }, [symbols]);

  return (
    <Panel title="Cross Asset Matrix" badge="CALC" badgeTone="calc">
      {state.loading ? (
        <StateNote kind="loading" message="상관계수 계산 중" />
      ) : state.error ? (
        <StateNote
          kind="error"
          message="비교 데이터 요청 실패"
          detail={state.error}
        />
      ) : !state.matrix ? (
        <StateNote
          kind="empty"
          message="상관계수 계산용 정렬 데이터가 부족합니다"
        />
      ) : (
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="p-0.5" />
              {state.labels.map((l) => (
                <th
                  key={l}
                  className="p-0.5 text-center font-mono text-muted-foreground"
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.matrix.map((row, i) => (
              <tr key={state.labels[i]}>
                <td className="p-0.5 font-mono text-muted-foreground">
                  {state.labels[i]}
                </td>
                {row.map((c, j) => {
                  const v = c;
                  const bg =
                    v == null
                      ? "transparent"
                      : v > 0
                        ? `rgba(34,197,94,${Math.abs(v) * 0.5})`
                        : `rgba(239,68,68,${Math.abs(v) * 0.5})`;
                  return (
                    <td
                      key={j}
                      className="p-0.5 text-center font-mono text-foreground/90"
                      style={{ backgroundColor: bg }}
                    >
                      {v == null ? "—" : v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-2 text-[9px] text-muted-foreground/70">
        180일 일간수익률 피어슨 상관 · /stocks/bars/compare
      </div>
    </Panel>
  );
}

function ScenarioLab({ tech }: { tech: TechSnapshot | null }) {
  const [shock, setShock] = useState(-5); // % price shock applied to the symbol
  const dailyVol = tech?.volAnn != null ? tech.volAnn / Math.sqrt(252) : null;
  // 10-day stress VaR via square-root-of-time scaling of the historical 1d VaR.
  const stress10 = tech?.var95 != null ? tech.var95 * Math.sqrt(10) : null;
  const shockPrice = tech?.last != null ? tech.last * (1 + shock / 100) : null;

  return (
    <Panel title="Scenario Lab" badge="LOCAL" badgeTone="local">
      {!tech ? (
        <StateNote kind="empty" message="시나리오 계산용 데이터가 부족합니다" />
      ) : (
        <div className="space-y-2 text-[11px]">
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">가격 충격</span>
            <span className="font-mono text-foreground/90">{shock}%</span>
          </label>
          <input
            type="range"
            min={-20}
            max={20}
            step={1}
            value={shock}
            onChange={(e) => setShock(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border/60 pt-2">
            <Row
              label="충격 후 가격"
              value={shockPrice != null ? nf(shockPrice) : "—"}
            />
            <Row
              label="일간 변동성"
              value={dailyVol != null ? `${(dailyVol * 100).toFixed(2)}%` : "—"}
            />
            <Row
              label="10일 스트레스 VaR"
              value={stress10 != null ? `${(stress10 * 100).toFixed(2)}%` : "—"}
              tone="text-down"
            />
            <Row
              label="연율 변동성"
              value={
                tech.volAnn != null ? `${(tech.volAnn * 100).toFixed(1)}%` : "—"
              }
            />
          </div>
        </div>
      )}
      <div className="mt-2 text-[9px] text-muted-foreground/70">
        과거 변동성 기반 로컬 추정 (√t 스케일링). 포트폴리오 베타 미반영.
      </div>
    </Panel>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono", tone ?? "text-foreground/90")}>
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────── right rail ────────────────────────── */

interface ProfileResponse {
  symbol: string;
  profile: {
    name?: string;
    country?: string;
    currency?: string;
    exchange?: string;
    industry?: string;
    market_cap?: number; // Finnhub: USD millions
  } | null;
  metrics: {
    pe_ttm?: number;
    pb?: number;
    roe_ttm?: number;
    dividend_yield?: number;
    beta?: number;
    eps_ttm?: number;
    week52_high?: number;
    week52_low?: number;
  };
}

/** Format a market cap given in USD millions → $X.XXT / $XXX.XB. */
function fmtMarketCapMillions(m: number | undefined): string {
  if (m == null || !Number.isFinite(m)) return "—";
  if (m >= 1e6) return `$${(m / 1e6).toFixed(2)}T`;
  if (m >= 1e3) return `$${(m / 1e3).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}

function Fundamentals({ symbol }: { symbol: string }) {
  const isKR = /^\d{6}/.test(symbol);
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: ProfileResponse | null;
  }>({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    apiGet<ProfileResponse>(`/stocks/${encodeURIComponent(symbol)}/profile`)
      .then((d) => alive && setState({ loading: false, error: null, data: d }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            error: String(e?.message ?? e),
            data: null,
          }),
      );
    return () => {
      alive = false;
    };
  }, [symbol]);

  const p = state.data?.profile;
  const m = state.data?.metrics ?? {};
  const fmt = (v: unknown, suffix = "") => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
  };
  const hasProfile = !!p || Object.keys(m).length > 0;
  const rows = [
    { label: "시가총액", value: fmtMarketCapMillions(p?.market_cap) },
    { label: "PER (TTM)", value: fmt(m.pe_ttm, "x") },
    { label: "PBR", value: fmt(m.pb, "x") },
    { label: "ROE (TTM)", value: fmt(m.roe_ttm, "%") },
    { label: "배당수익률", value: fmt(m.dividend_yield, "%") },
    { label: "베타", value: fmt(m.beta) },
    { label: "EPS (TTM)", value: fmt(m.eps_ttm) },
    {
      label: "52주 범위",
      value:
        m.week52_low != null && m.week52_high != null
          ? `${nf(m.week52_low)} – ${nf(m.week52_high)}`
          : "—",
    },
    { label: "산업", value: p?.industry || "—" },
  ];

  return (
    <Panel
      title="Fundamentals"
      badge={state.loading ? "…" : hasProfile ? "LIVE" : "NO DATA"}
      badgeTone={hasProfile ? "live" : "warn"}
    >
      {state.loading ? (
        <StateNote kind="loading" message="기업 프로파일 로딩 중" />
      ) : state.error ? (
        <StateNote
          kind="error"
          message="프로파일 요청 실패"
          detail={state.error}
        />
      ) : !hasProfile ? (
        <StateNote
          kind="empty"
          message={
            isKR
              ? "Finnhub 프로파일 미제공 (US 한정)"
              : "프로파일 데이터가 없습니다"
          }
          detail={isKR ? "KR 밸류에이션은 DART/KRX 연동 대상" : undefined}
        />
      ) : (
        <div className="space-y-1">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className="truncate pl-2 font-mono text-foreground/90">
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 border-t border-border/60 pt-2 text-[10px] leading-snug text-muted-foreground">
        <span className="text-primary">공시:</span>{" "}
        {isKR ? "DART (한국)" : "SEC EDGAR (미국)"} 연동 대상 ·{" "}
        {hasProfile ? "Finnhub 프로파일/지표 라이브" : "프로파일 소스 미연결"}
      </div>
    </Panel>
  );
}

function EarningsDividend({ symbol }: { symbol: string }) {
  const { data, loading, error, refetch } = useUnifiedCalendar({
    types: ["earnings", "dividend"],
    symbols: [symbol],
  });
  const items = (data ?? [])
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 6);
  return (
    <Panel title="Earnings / Dividend" badge="DB" badgeTone="db">
      {loading && !data ? (
        <StateNote kind="loading" message="일정 로딩 중" />
      ) : error ? (
        <StateNote kind="error" message="캘린더 요청 실패" onRetry={refetch} />
      ) : items.length === 0 ? (
        <StateNote
          kind="empty"
          message={`${symbol} 예정 실적/배당 일정이 없습니다`}
        />
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between text-[11px]"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-sm px-1 py-px text-[8px] font-mono uppercase",
                    it.kind === "earnings"
                      ? "bg-primary/15 text-primary"
                      : "bg-up/15 text-up",
                  )}
                >
                  {it.kind === "earnings" ? "실적" : "배당"}
                </span>
                <span className="text-foreground/80">
                  {new Date(it.scheduled_at).toLocaleDateString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </div>
              <span className="truncate font-mono text-muted-foreground">
                {it.cash_amount != null
                  ? `$${it.cash_amount}`
                  : it.eps_estimate != null
                    ? `EPS ${it.eps_estimate}`
                    : it.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

interface FilingItem {
  accession: string;
  form: string;
  filed_at?: string | null;
  description?: string | null;
  url?: string | null;
}
interface FilingsResponse {
  symbol: string;
  cik?: string | null;
  items: FilingItem[];
}

/** Recent regulatory filings — live SEC EDGAR (US) / DART (KR). */
function FilingsPanel({ symbol }: { symbol: string }) {
  const isKR = /^\d{6}/.test(symbol);
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: FilingsResponse | null;
  }>({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    apiGet<FilingsResponse>(
      `/stocks/${encodeURIComponent(symbol)}/filings?limit=6`,
    )
      .then((d) => alive && setState({ loading: false, error: null, data: d }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            error: String(e?.message ?? e),
            data: null,
          }),
      );
    return () => {
      alive = false;
    };
  }, [symbol]);

  const items = state.data?.items ?? [];
  return (
    <Panel
      title="Filings / 공시"
      badge={isKR ? "DART" : "SEC"}
      badgeTone={items.length ? "live" : "neutral"}
    >
      {state.loading ? (
        <StateNote kind="loading" message="공시 로딩 중" />
      ) : state.error ? (
        <StateNote kind="error" message="공시 요청 실패" detail={state.error} />
      ) : items.length === 0 ? (
        <StateNote
          kind="empty"
          message={
            isKR ? "최근 DART 공시가 없습니다" : "최근 SEC 공시가 없습니다"
          }
          detail={isKR ? undefined : "SEC_USER_AGENT 설정 필요 시 .env 확인"}
        />
      ) : (
        <div className="space-y-1.5">
          {items.map((f) => {
            const body = (
              <div className="flex items-start gap-1.5 text-[11px]">
                <span className="mt-px shrink-0 rounded-sm bg-primary/15 px-1 py-px text-[8px] font-mono uppercase text-primary">
                  {f.form?.slice(0, isKR ? 10 : 8) || "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground/80">
                  {f.description || f.form || "—"}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {f.filed_at ?? ""}
                </span>
              </div>
            );
            return f.url ? (
              <a
                key={f.accession}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-sm px-1 py-0.5 transition-colors hover:bg-muted/20"
              >
                {body}
              </a>
            ) : (
              <div key={f.accession} className="px-1 py-0.5">
                {body}
              </div>
            );
          })}
          <div className="pt-1 text-[9px] text-muted-foreground/70">
            {isKR
              ? "DART 전자공시 · /stocks/:symbol/filings"
              : "SEC EDGAR · /stocks/:symbol/filings"}
          </div>
        </div>
      )}
    </Panel>
  );
}

function AiAssistant({
  symbol,
  tech,
}: {
  symbol: string;
  tech: TechSnapshot | null;
}) {
  const lines = useMemo(() => {
    if (!tech) return null;
    const out: string[] = [];
    out.push(
      `${symbol} 현재가 ${nf(tech.last)} (${pct(tech.changePct)}). ` +
        (tech.changePct >= 0 ? "단기 상승 흐름." : "단기 하락 흐름."),
    );
    if (tech.rsi14 != null) {
      out.push(
        `RSI14 ${tech.rsi14.toFixed(0)} — ` +
          (tech.rsi14 >= 70
            ? "과매수 구간, 단기 과열 주의."
            : tech.rsi14 <= 30
              ? "과매도 구간, 반등 가능성 점검."
              : "중립 구간."),
      );
    }
    if (tech.sma20 != null && tech.sma60 != null) {
      out.push(
        tech.sma20 >= tech.sma60
          ? "SMA20 > SMA60 — 중기 추세 상방 정렬."
          : "SMA20 < SMA60 — 중기 추세 하방 정렬.",
      );
    }
    if (tech.volAnn != null) {
      out.push(
        `연율 변동성 ${(tech.volAnn * 100).toFixed(0)}% — ` +
          (tech.volAnn > 0.4 ? "고변동, 포지션 사이즈 주의." : "변동성 보통."),
      );
    }
    return out;
  }, [symbol, tech]);

  return (
    <Panel title="AI Trade Assistant" badge="LOCAL" badgeTone="local">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <BrainCircuit size={12} className="text-primary" />
        로컬 규칙 기반 요약 (Gemini 등 AI API 미연결)
      </div>
      {!lines ? (
        <StateNote kind="empty" message="요약할 지표 데이터가 부족합니다" />
      ) : (
        <ul className="space-y-1 text-[11px] leading-snug text-foreground/85">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NeedsApi({
  title,
  message,
  detail,
}: {
  title: string;
  message: string;
  detail: string;
}) {
  return (
    <Panel title={title} badge="API" badgeTone="warn">
      <StateNote kind="api" message={message} detail={detail} />
    </Panel>
  );
}

/* ────────────────────────── command bar + status bar ────────────────────────── */

function CommandBar({
  symbol,
  onSubmit,
}: {
  symbol: string;
  onSubmit: (s: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-3 border-b border-border/70 bg-card/60 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-bold tracking-tight text-primary">
          SnapTerminal
        </span>
        <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
          US/KR Equity Intel
        </span>
      </div>
      <form
        className="flex flex-1 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim().toUpperCase();
          if (v) {
            onSubmit(v);
            setValue("");
          }
        }}
      >
        <div className="relative flex-1 max-w-sm">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`심볼 입력 후 GO (현재: ${symbol})`}
            className="w-full rounded-sm border border-border bg-background/60 py-1 pl-7 pr-2 text-[12px] font-mono text-foreground outline-none focus:border-primary/60"
          />
        </div>
        <button
          type="submit"
          className="rounded-sm border border-primary/50 bg-primary/15 px-3 py-1 text-[11px] font-semibold uppercase text-primary hover:bg-primary/25"
        >
          Go
        </button>
      </form>
    </div>
  );
}

function StatusBar({ symbol }: { symbol: string }) {
  const keys = [
    ["F1", "US Market"],
    ["F2", "Chart"],
    ["F3", "Trade"],
    ["F4", "Risk"],
    ["F5", "Snapshot"],
  ];
  return (
    <div className="flex items-center gap-3 overflow-x-auto border-t border-border/70 bg-card/60 px-3 py-1.5 text-[10px] font-mono text-muted-foreground">
      {keys.map(([k, label]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 whitespace-nowrap"
        >
          <span className="rounded-sm bg-muted/30 px-1 text-foreground/80">
            {k}
          </span>
          {label}
        </span>
      ))}
      <span className="ml-auto whitespace-nowrap text-primary">
        {symbol} · NEWS / SEC / FUND
      </span>
    </div>
  );
}

/* ────────────────────────── page ────────────────────────── */

export default function Terminal() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const { data: usMovers } = useStocks("US");
  const { tech, loading: techLoading } = useTech(symbol);
  const currency: "USD" | "KRW" = /^\d{6}/.test(symbol) ? "KRW" : "USD";

  const peers = useMemo(
    () => (usMovers ?? []).slice(0, 4).map((s) => s.ticker),
    [usMovers],
  );

  return (
    <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] flex-col bg-background text-foreground sm:-m-6">
      <CommandBar symbol={symbol} onSubmit={setSymbol} />
      <IndexStrip />

      <div className="grid flex-1 grid-cols-1 gap-2 p-2 lg:grid-cols-12">
        {/* ── Left intel rail ── */}
        <div className="flex flex-col gap-2 lg:col-span-3">
          <MarketPulse />
          <WatchGrid onSelect={setSymbol} active={symbol} />
          <SectorMap />
          <MacroFutures />
          <FlowRadar />
        </div>

        {/* ── Center: price + tech stack ── */}
        <div className="flex flex-col gap-2 lg:col-span-6">
          <SymbolHeader symbol={symbol} />
          <Panel
            title="Price Action / Tech Stack"
            badge="DB/API"
            badgeTone="db"
            className="min-h-[420px]"
          >
            <StockChart ticker={symbol} currency={currency} />
          </Panel>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
            <TechRiskEngine tech={tech} loading={techLoading} />
            <CrossAssetMatrix symbol={symbol} peers={peers} />
            <ScenarioLab tech={tech} />
          </div>
        </div>

        {/* ── Right fundamentals / AI rail ── */}
        <div className="flex flex-col gap-2 lg:col-span-3">
          <Fundamentals symbol={symbol} />
          <EarningsDividend symbol={symbol} />
          <FilingsPanel symbol={symbol} />
          <AiAssistant symbol={symbol} tech={tech} />
          <NeedsApi
            title="Level II / Order Book"
            message="실시간 호가 데이터 미연결"
            detail="요구: 실시간 L2 피드"
          />
          <NeedsApi
            title="Options Flow / Vol Surface"
            message="옵션 데이터 미연결"
            detail="요구: 옵션 체인 / IV API"
          />
        </div>
      </div>

      <StatusBar symbol={symbol} />
    </div>
  );
}
