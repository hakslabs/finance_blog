/**
 * StockDetail.tsx — Individual Stock Page
 * Features: Price chart with expandable technical indicator panels
 * Indicators: Moving Averages, Bollinger Bands, MACD, RSI, Stochastic, Volume
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { useStocks, useStock, useStockBars } from "@/features/stocks";
import {
  stocksService,
  type StockFinancialPeriod,
} from "@/features/stocks/service";
import type { Stock } from "@/types";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Star,
  Bell,
  RefreshCw,
} from "lucide-react";
import StockChart from "@/components/StockChart";
import KLineSeriesChart from "@/components/KLineSeriesChart";
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
function buildBarsRows(
  bars: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[],
) {
  const n = bars.length;
  const closes = bars.map((b) => b.close);

  const sma = (i: number, w: number) => {
    if (i + 1 < w) return closes[i];
    let s = 0;
    for (let k = i - w + 1; k <= i; k++) s += closes[k];
    return s / w;
  };
  const stdev = (i: number, w: number, mean: number) => {
    if (i + 1 < w) return 0;
    let s = 0;
    for (let k = i - w + 1; k <= i; k++) s += (closes[k] - mean) ** 2;
    return Math.sqrt(s / w);
  };
  // EMA series
  const ema = (period: number) => {
    const k = 2 / (period + 1);
    const out: number[] = [];
    closes.forEach((c, i) => {
      out.push(i === 0 ? c : c * k + out[i - 1] * (1 - k));
    });
    return out;
  };
  const ema12 = ema(12);
  const ema26 = ema(26);
  const macdLineArr = ema12.map((v, i) => v - ema26[i]);
  // 9-EMA of MACD line for signal
  const signalArr: number[] = [];
  const sk = 2 / (9 + 1);
  macdLineArr.forEach((v, i) =>
    signalArr.push(i === 0 ? v : v * sk + signalArr[i - 1] * (1 - sk)),
  );

  // RSI(14)
  const rsiArr: number[] = [];
  let gain = 0,
    loss = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      rsiArr.push(50);
      continue;
    }
    const ch = closes[i] - closes[i - 1];
    const g = Math.max(ch, 0),
      l = Math.max(-ch, 0);
    if (i <= 14) {
      gain += g;
      loss += l;
      if (i === 14) {
        const avgG = gain / 14,
          avgL = loss / 14;
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
    let hi = -Infinity,
      lo = Infinity;
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
    const dt = new Date(`${b.date}T00:00:00Z`);
    const label = `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
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

function fmtOptional(value: unknown, suffix = "") {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function metricStatus(
  value: number | null | undefined,
  kind: "pe" | "pbr" | "roe" | "dividend",
): string {
  if (value == null || !Number.isFinite(value)) return "데이터 없음";
  if (kind === "pe") {
    if (value <= 0) return "해석 주의";
    if (value < 15) return "낮음";
    if (value > 40) return "높음";
    return "중립";
  }
  if (kind === "pbr") {
    if (value < 1) return "낮음";
    if (value > 5) return "높음";
    return "중립";
  }
  if (kind === "roe") {
    if (value >= 20) return "우수";
    if (value <= 0) return "주의";
    return "중립";
  }
  if (value >= 3) return "높음";
  if (value === 0) return "없음";
  return "중립";
}

function statusClass(status: string): string {
  if (status === "우수") return "border-up text-up";
  if (status === "주의" || status === "해석 주의")
    return "border-down text-down";
  if (status === "데이터 없음") return "border-border text-muted-foreground";
  return "border-muted-foreground text-muted-foreground";
}

type FinancialChartRow = {
  year: string;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
};

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

// Number of daily bars to load per chart period. StockChart owns its own
// period UI; this only feeds the Tab 3 "Technical Signals" panel below,
// which reads the latest computed indicators off the bars.
const BARS_FOR_SIGNALS = 365; // 1y — enough for stable signals and 52w range.

// ── Main Component ─────────────────────────────────────────────
export default function StockDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker?.toUpperCase() ?? "";

  const [activeTab, setActiveTab] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialChartRow[]>([]);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [financialRetry, setFinancialRetry] = useState(0);
  const { isWatched, toggleWatchlist } = useWatchlist();

  const { data: liveUS } = useStocks("US");
  const { data: liveKR } = useStocks("KR");
  const allStocks = useMemo(
    () => [...(liveUS ?? []), ...(liveKR ?? [])],
    [liveUS, liveKR],
  );
  const fromListRaw = allStocks.find((s: any) => s.ticker === ticker);
  const fromList: Stock | undefined = fromListRaw
    ? {
        ...(fromListRaw as Stock),
        change: (fromListRaw as any).change ?? 0,
        volume: (fromListRaw as any).volume ?? 0,
        country:
          (fromListRaw as any).country ??
          (/^\d/.test(fromListRaw.ticker) ? "KR" : "US"),
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

  // Real OHLCV — the main chart manages its own period; we pull just
  // enough bars here to power the header price/change and Tab 3 signals.
  const { data: barsData } = useStockBars(
    ticker || undefined,
    BARS_FOR_SIGNALS,
  );
  const isKrTicker = /^\d/.test(ticker);
  // For KR tickers Finnhub returns nothing, so when bars resolved we
  // still want a render — synthesize the Stock from the ticker alone.
  const hasBars = !!(barsData && barsData.length);
  const inferredStock: Stock | undefined =
    fromList ??
    (profile
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
      : isKrTicker && hasBars
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
        : undefined);

  // Latest bar drives the header price/change if movers list didn't
  // supply it (typical for the long tail of profile-only resolutions).
  const latestBar =
    barsData && barsData.length ? barsData[barsData.length - 1] : null;
  const prevBar =
    barsData && barsData.length > 1 ? barsData[barsData.length - 2] : null;
  const livePrice = latestBar?.close ?? inferredStock?.price ?? 0;
  const liveChange =
    latestBar && prevBar
      ? latestBar.close - prevBar.close
      : (inferredStock?.change ?? 0);
  const liveChangePct =
    latestBar && prevBar
      ? ((latestBar.close - prevBar.close) / prevBar.close) * 100
      : (inferredStock?.changePct ?? 0);

  const stock: Stock | undefined = inferredStock
    ? {
        ...inferredStock,
        price: livePrice || inferredStock.price,
        change: liveChange,
        changePct: liveChangePct,
      }
    : undefined;

  const up = stock ? stock.changePct >= 0 : true;
  // Tab 3 "Technical Signals" reads the latest computed indicators from
  // the bars. Empty until bars resolve — Tab 3 renders defensively.
  const chartData = useMemo(
    () => (barsData && barsData.length > 5 ? buildBarsRows(barsData) : []),
    [barsData],
  );
  const signalSourceSummary = useMemo(() => {
    const first = chartData[0];
    const latest = chartData[chartData.length - 1];
    if (!first || !latest) {
      return "DB 일봉 로딩 중";
    }
    return `DB 일봉 ${first.date} - ${latest.date} · ${chartData.length.toLocaleString()}개`;
  }, [chartData]);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (!ticker) {
      setFinancialData([]);
      setFinancialLoading(false);
      setFinancialError(null);
      return;
    }
    setFinancialLoading(true);
    setFinancialError(null);
    stocksService
      .financials(ticker, "annual", { signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        const rows = response.periods
          .map(financialPeriodToRow)
          .filter((row): row is FinancialChartRow => row != null)
          .sort((a, b) => a.year.localeCompare(b.year))
          .slice(-6);
        setFinancialData(rows);
        setFinancialError(null);
        setFinancialLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setFinancialData([]);
        setFinancialError(
          error instanceof Error
            ? error.message
            : "재무제표 API 요청이 실패했습니다",
        );
        setFinancialLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [financialRetry, ticker]);
  const range52w = useMemo(() => {
    const valid = (barsData ?? []).filter(
      (bar) =>
        /^\d{4}-\d{2}-\d{2}$/.test(bar.date) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        bar.high > 0 &&
        bar.low > 0 &&
        bar.high >= bar.low,
    );
    if (!valid.length)
      return { high: null as number | null, low: null as number | null };
    return {
      high: Math.max(...valid.map((bar) => bar.high)),
      low: Math.min(...valid.map((bar) => bar.low)),
    };
  }, [barsData]);
  const technicalSignals = useMemo(() => {
    const latest = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    if (!latest) {
      return [
        {
          label: "RSI (14)",
          value: "—",
          desc: "DB 일봉 로딩 대기",
          status: "중립",
        },
        {
          label: "MACD",
          value: "—",
          desc: "DB 일봉 로딩 대기",
          status: "중립",
        },
        {
          label: "볼린저밴드",
          value: "—",
          desc: "DB 일봉 로딩 대기",
          status: "중립",
        },
        {
          label: "MA20 / MA60",
          value: "—",
          desc: "DB 일봉 로딩 대기",
          status: "중립",
        },
        {
          label: "거래량",
          value: "—",
          desc: "DB 일봉 로딩 대기",
          status: "중립",
        },
        {
          label: "스토캐스틱",
          value: "—",
          desc: "DB 일봉 로딩 대기",
          status: "중립",
        },
      ];
    }

    const rsiStatus =
      latest.rsi >= 70 ? "주의" : latest.rsi <= 30 ? "매수" : "중립";
    const rsiDesc =
      latest.rsi >= 70
        ? "과매수권 진입"
        : latest.rsi <= 30
          ? "과매도권 반등 관찰"
          : "중립 구간 (30-70)";

    const macdGap = latest.macdLine - latest.signalLine;
    const prevMacdGap = prev ? prev.macdLine - prev.signalLine : macdGap;
    const macdStatus = macdGap > 0 ? "매수" : macdGap < 0 ? "매도" : "중립";
    const macdDesc =
      prevMacdGap <= 0 && macdGap > 0
        ? "시그널 상향 돌파"
        : prevMacdGap >= 0 && macdGap < 0
          ? "시그널 하향 이탈"
          : macdGap > 0
            ? "MACD가 시그널 상단"
            : macdGap < 0
              ? "MACD가 시그널 하단"
              : "시그널과 근접";

    const bandSpan = latest.bbUpper - latest.bbLower || 1;
    const bandPos = ((latest.close - latest.bbLower) / bandSpan) * 100;
    const bandStatus =
      latest.close >= latest.bbUpper
        ? "주의"
        : latest.close <= latest.bbLower
          ? "매수"
          : "중립";
    const bandDesc =
      latest.close >= latest.bbUpper
        ? "상단 밴드 돌파"
        : latest.close <= latest.bbLower
          ? "하단 밴드 접촉"
          : latest.close >= latest.bbMiddle
            ? "중간 밴드 위"
            : "중간 밴드 아래";

    const maGap = latest.ma20 - latest.ma60;
    const prevMaGap = prev ? prev.ma20 - prev.ma60 : maGap;
    const maStatus = maGap > 0 ? "매수" : maGap < 0 ? "매도" : "중립";
    const maDesc =
      prevMaGap <= 0 && maGap > 0
        ? "MA20이 MA60 상향 돌파"
        : prevMaGap >= 0 && maGap < 0
          ? "MA20이 MA60 하향 이탈"
          : maGap > 0
            ? "중기 추세 상향"
            : maGap < 0
              ? "중기 추세 하향"
              : "이평선 수렴";

    const recentVolumes = chartData.slice(-20).map((d) => d.volume);
    const avgVolume =
      recentVolumes.reduce((sum, v) => sum + v, 0) /
      Math.max(1, recentVolumes.length);
    const volumePct =
      avgVolume > 0 ? ((latest.volume - avgVolume) / avgVolume) * 100 : 0;
    const volumeStatus =
      volumePct >= 35 ? "주목" : volumePct <= -35 ? "주의" : "중립";

    const stochStatus =
      latest.stochK >= 80 ? "주의" : latest.stochK <= 20 ? "매수" : "중립";
    const stochDesc =
      latest.stochK >= 80
        ? "과매수 근접"
        : latest.stochK <= 20
          ? "과매도 근접"
          : latest.stochK >= latest.stochD
            ? "%K가 %D 상단"
            : "%K가 %D 하단";

    return [
      {
        label: "RSI (14)",
        value: latest.rsi.toFixed(1),
        desc: rsiDesc,
        status: rsiStatus,
      },
      {
        label: "MACD",
        value: latest.macdLine.toFixed(3),
        desc: macdDesc,
        status: macdStatus,
      },
      {
        label: "볼린저밴드",
        value: `${bandPos.toFixed(0)}% 위치`,
        desc: bandDesc,
        status: bandStatus,
      },
      {
        label: "MA20 / MA60",
        value: maGap >= 0 ? "정배열" : "역배열",
        desc: maDesc,
        status: maStatus,
      },
      {
        label: "거래량",
        value: `${volumePct >= 0 ? "+" : ""}${volumePct.toFixed(0)}%`,
        desc: "20일 평균 대비",
        status: volumeStatus,
      },
      {
        label: "스토캐스틱",
        value: `${latest.stochK.toFixed(0)} / ${latest.stochD.toFixed(0)}`,
        desc: stochDesc,
        status: stochStatus,
      },
    ];
  }, [chartData]);

  if (!stock) {
    // Still resolving the profile? Render a skeleton instead of the
    // hard "not found" — most tickers go through this path.
    if (profileLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <div className="text-3xl font-bold font-mono-num text-muted-foreground/30">
            {ticker}
          </div>
          <p className="text-muted-foreground text-xs">
            종목 정보를 불러오는 중…
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-5xl font-bold font-mono-num text-muted-foreground/20">
          {ticker}
        </div>
        <p className="text-muted-foreground text-sm">
          종목 정보를 찾을 수 없습니다.
        </p>
        <Link href="/stocks">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1" />
            목록으로
          </Button>
        </Link>
      </div>
    );
  }

  const TABS = ["차트 & 지표", "재무", "밸류에이션", "기술 신호"];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/stocks">
          <span className="hover:text-foreground transition-colors cursor-pointer">
            종목 검색
          </span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{ticker}</span>
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-3xl font-bold font-mono-num font-['Outfit']">
                {ticker}
              </h1>
              <Badge variant="outline" className="text-xs">
                {stock.exchange}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stock.sector}
              </Badge>
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
                  ticker: stock.ticker,
                  name: stock.name,
                  exchange: stock.exchange,
                  price: stock.price,
                  changePct: stock.changePct,
                  sector: stock.sector,
                });
                toast.success(
                  nowAdded
                    ? "관심종목에 추가되었습니다"
                    : "관심종목에서 제거되었습니다",
                );
              }}
            >
              <Star size={13} className={watched ? "fill-current" : ""} />
              {watched ? "관심종목 해제" : "관심종목"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAlertOpen(true)}
            >
              <Bell size={13} />
              알림
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
            <div className="text-4xl font-bold font-mono-num">
              {stock.price.toLocaleString()}
            </div>
            <div
              className={cn(
                "flex items-center gap-1 mt-1 text-sm font-medium font-mono-num",
                up ? "text-up" : "text-down",
              )}
            >
              {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {up ? "+" : ""}
              {stock.change.toFixed(2)} ({up ? "+" : ""}
              {stock.changePct.toFixed(2)}%)
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-6 gap-y-2 text-sm">
            {[
              { label: "시가총액", value: stock.marketCap || "—" },
              { label: "P/E", value: fmtOptional(stock.pe, "x") },
              { label: "ROE", value: fmtOptional(stock.roe, "%") },
              {
                label: "52주 고가",
                value:
                  range52w.high == null ? "—" : range52w.high.toLocaleString(),
              },
              {
                label: "52주 저가",
                value:
                  range52w.low == null ? "—" : range52w.low.toLocaleString(),
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </div>
                <div className="font-mono-num font-bold mt-0.5">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex max-w-full w-fit gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={cn(
              "shrink-0 whitespace-nowrap text-sm px-4 py-2 rounded-lg transition-all duration-200 font-medium",
              activeTab === i
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
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
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-base font-bold font-['Outfit']">연간 실적</h2>
              <span className="text-[11px] text-muted-foreground font-mono">
                {financialLoading && financialData.length > 0
                  ? "갱신 중..."
                  : financialData.length > 0
                    ? `/stocks/${ticker}/financials · ${financialData.length}개`
                    : "DB/API 재무제표"}
              </span>
            </div>
            {financialLoading && financialData.length === 0 ? (
              <div className="h-48 rounded-lg bg-muted/20 animate-pulse" />
            ) : financialData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 text-center text-sm text-muted-foreground">
                <span>
                  {financialError
                    ? "재무제표 API 요청이 실패했습니다"
                    : "재무제표 DB 데이터가 아직 없습니다"}
                </span>
                {financialError && (
                  <span className="max-w-full truncate font-mono text-[10px] text-destructive">
                    {financialError}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setFinancialRetry((value) => value + 1)}
                  className="mt-2 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  <RefreshCw size={12} />
                  다시 불러오기
                </button>
              </div>
            ) : (
              <>
                <KLineSeriesChart
                  data={financialData.map((row) => ({
                    ...row,
                    date: `${row.year}-01-01`,
                  }))}
                  settingsScope={`stock-detail-financials-${ticker}`}
                  height={240}
                  barLayout="group"
                  showRangeControls={false}
                  allowValueTransform={false}
                  fixedScaleLabel="B"
                  fixedScaleDetail="재무제표 원값"
                  fixedScaleTitle="DB/API 재무제표의 billion 단위 값을 그대로 표시"
                  sourceLabel="API"
                  sourceTone="primary"
                  sourceTitle={`/stocks/${ticker}/financials API 재무제표 기준`}
                  valueFormatter={(value) => `${value.toFixed(2)}B`}
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
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">
                          항목
                        </th>
                        {financialData.map((row) => (
                          <th
                            key={row.year}
                            className="text-left py-2 px-3 text-xs text-muted-foreground font-medium"
                          >
                            {row.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "매출액 ($B)", key: "revenue" as const },
                        { label: "순이익 ($B)", key: "netIncome" as const },
                        { label: "EPS", key: "eps" as const },
                      ].map((row) => (
                        <tr
                          key={row.label}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">
                            {row.label}
                          </td>
                          {financialData.map((period) => {
                            const value = period[row.key];
                            return (
                              <td
                                key={`${row.label}-${period.year}`}
                                className="py-2.5 px-3 font-mono-num text-sm font-medium"
                              >
                                {value == null
                                  ? "—"
                                  : Number(value).toLocaleString(undefined, {
                                      maximumFractionDigits:
                                        row.key === "eps" ? 2 : 1,
                                    })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Valuation ── */}
      {activeTab === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: "P/E",
              value: fmtOptional(stock.pe, "x"),
              peer: "API basic financials",
              status: metricStatus(stock.pe, "pe"),
            },
            {
              label: "P/B",
              value: fmtOptional(stock.pbr, "x"),
              peer: "API basic financials",
              status: metricStatus(stock.pbr, "pbr"),
            },
            {
              label: "ROE",
              value: fmtOptional(stock.roe, "%"),
              peer: "API basic financials",
              status: metricStatus(stock.roe, "roe"),
            },
            {
              label: "배당수익률",
              value: fmtOptional(stock.dividendYield, "%"),
              peer: "API basic financials",
              status: metricStatus(stock.dividendYield, "dividend"),
            },
            {
              label: "현재가",
              value: stock.price > 0 ? stock.price.toLocaleString() : "—",
              peer: latestBar
                ? `DB 일봉 ${latestBar.date}`
                : "DB 가격 데이터 없음",
              status: stock.price > 0 ? "중립" : "데이터 없음",
            },
            {
              label: "52주 범위",
              value:
                range52w.low != null && range52w.high != null
                  ? `${range52w.low.toLocaleString()} - ${range52w.high.toLocaleString()}`
                  : "—",
              peer: "DB 일봉 high/low",
              status:
                range52w.low != null && range52w.high != null
                  ? "중립"
                  : "데이터 없음",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="text-xs text-muted-foreground mb-1">
                {item.label}
              </div>
              <div className="text-2xl font-bold font-mono-num">
                {item.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {item.peer}
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px] mt-2", statusClass(item.status))}
              >
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 3: Technical Signals ── */}
      {activeTab === 3 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span>기술 지표 기준</span>
            <span className="font-mono-num">{signalSourceSummary}</span>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            role="list"
            aria-label={`기술 지표 신호. ${signalSourceSummary}`}
          >
            {technicalSignals.map((item) => {
              const ariaLabel = `${item.label}: ${item.value}, ${item.status}. ${item.desc}. ${signalSourceSummary}`;
              return (
                <div
                  key={item.label}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  role="listitem"
                  tabIndex={0}
                  title={ariaLabel}
                  aria-label={ariaLabel}
                >
                  <div
                    className={cn(
                      "w-1.5 h-10 rounded-full flex-shrink-0",
                      item.status === "매수"
                        ? "bg-up"
                        : item.status === "매도"
                          ? "bg-down"
                          : item.status === "주의"
                            ? "bg-gold"
                            : item.status === "주목"
                              ? "bg-sky"
                              : "bg-muted-foreground/30",
                    )}
                  />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="text-base font-bold font-mono-num mt-0.5">
                      {item.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.desc}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs flex-shrink-0",
                      item.status === "매수" || item.status === "주목"
                        ? "border-up text-up"
                        : item.status === "매도"
                          ? "border-down text-down"
                          : item.status === "주의"
                            ? "border-gold text-gold"
                            : "border-muted-foreground text-muted-foreground",
                    )}
                  >
                    {item.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
