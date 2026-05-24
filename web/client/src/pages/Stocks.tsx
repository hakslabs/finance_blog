/**
 * Stocks.tsx — Stock Screener Page
 */
import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/route-prefetch";
import { useStockBars, useStockSearch, useStocks } from "@/features/stocks";
import { stocksService, type StockSearchHit } from "@/features/stocks/service";
import type { Stock } from "@/types";
import StockMiniChart from "@/components/StockMiniChart";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

async function searchHitToStock(
  hit: StockSearchHit,
  init?: RequestInit,
): Promise<Stock> {
  let price = 0;
  let change = 0;
  let changePct = 0;
  let volume = 0;
  try {
    const bars = (await stocksService.bars(hit.ticker, 30, init)).items;
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
    /* Keep row visible even if bars are not yet ingested. */
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

function PctBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-mono-num font-medium",
        up ? "text-up" : "text-down",
      )}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

type SparklinePeriod = "1M" | "3M" | "1Y" | "2Y" | "5Y";
const SPARKLINE_PERIOD_DAYS: Record<SparklinePeriod, number> = {
  "1M": 31,
  "3M": 92,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
};

function Sparkline({
  ticker,
  period,
}: {
  ticker: string;
  period: SparklinePeriod;
}) {
  const { data: barsData, loading } = useStockBars(
    ticker,
    SPARKLINE_PERIOD_DAYS[period],
  );
  const data = useMemo(
    () =>
      (barsData ?? []).map((bar) => ({
        date: bar.date,
        value: bar.close,
      })),
    [barsData],
  );
  const priceData = useMemo(
    () =>
      data.filter((point) => Number.isFinite(point.value) && point.value > 0),
    [data],
  );
  const up =
    priceData.length < 2
      ? true
      : priceData[priceData.length - 1].value >= priceData[0].value;

  return (
    <div
      className="w-20 h-9"
      title={`${period} DB 일봉 ${priceData.length.toLocaleString()}행`}
    >
      {loading ? (
        <div className="h-full w-full rounded bg-muted/30 animate-pulse" />
      ) : priceData.length > 1 ? (
        <StockMiniChart
          data={priceData}
          height={36}
          color={up ? "#22c55e" : "#ef4444"}
          interactive={false}
          valueKind="price"
          sourceLabel="DB"
          sourceTone="primary"
          sourceTitle={`${period} DB 일봉 ${priceData.length.toLocaleString()}행`}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
          —
        </div>
      )}
    </div>
  );
}

const SECTORS = [
  "전체",
  "기술",
  "반도체",
  "금융",
  "에너지",
  "소비재",
  "헬스케어",
  "자동차",
  "바이오",
  "IT/플랫폼",
];

export default function Stocks() {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("전체");
  const [sortBy, setSortBy] = useState<"changePct" | "marketCap" | "pe">(
    "changePct",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sparklinePeriod, setSparklinePeriod] = useState<SparklinePeriod>("3M");

  const { data: liveStocks, loading, error, refetch } = useStocks(market);
  const searchMode = search.trim().length > 0;
  const { data: searchHits = [], loading: searchLoading } = useStockSearch(
    searchMode ? search : "",
    24,
  );
  const [searchStocks, setSearchStocks] = useState<Stock[]>([]);
  const [hydratingSearch, setHydratingSearch] = useState(false);
  const allStocks = liveStocks ?? [];

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const hits = (searchHits ?? []).filter((hit) => hit.country === market);
    if (!searchMode || hits.length === 0) {
      setSearchStocks([]);
      setHydratingSearch(false);
      return;
    }
    setHydratingSearch(true);
    Promise.all(
      hits.map((hit) => searchHitToStock(hit, { signal: controller.signal })),
    )
      .then((rows) => {
        if (cancelled) return;
        setSearchStocks(rows);
        setHydratingSearch(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setSearchStocks([]);
        setHydratingSearch(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [market, searchHits, searchMode]);

  const filtered = useMemo(() => {
    const source = searchMode ? searchStocks : allStocks;
    let list = source.filter((s) => {
      const matchSearch =
        searchMode ||
        s.ticker.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase());
      const matchSector =
        searchMode || sector === "전체" || s.sector.includes(sector);
      return matchSearch && matchSector;
    });
    list = [...list].sort((a, b) => {
      const va = Number(a[sortBy] ?? Number.NEGATIVE_INFINITY);
      const vb = Number(b[sortBy] ?? Number.NEGATIVE_INFINITY);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [allStocks, search, searchMode, searchStocks, sector, sortBy, sortDir]);
  const tableLoading = searchMode ? searchLoading || hydratingSearch : loading;

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const avgChange =
    filtered.length > 0
      ? filtered.reduce((a, s) => a + s.changePct, 0) / filtered.length
      : 0;
  const bestChange =
    filtered.length > 0 ? Math.max(...filtered.map((s) => s.changePct)) : 0;
  const worstChange =
    filtered.length > 0 ? Math.min(...filtered.map((s) => s.changePct)) : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-['Outfit']">종목 검색</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          DB 전체 종목 검색 · 실가격 스파크라인
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Market toggle */}
        <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
          {(["US", "KR"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={cn(
                "text-sm px-4 py-1.5 rounded-md transition-all font-medium",
                market === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="티커 / 종목명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Sector filter */}
        <div className="flex gap-1 flex-wrap">
          {SECTORS.slice(0, 5).map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-lg border transition-all",
                sector === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-1">
          <span className="px-1.5 text-[10px] font-mono text-muted-foreground">
            CHART
          </span>
          {(["1M", "3M", "1Y", "2Y", "5Y"] as SparklinePeriod[]).map(
            (period) => (
              <button
                key={period}
                onClick={() => setSparklinePeriod(period)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  sparklinePeriod === period
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-card hover:text-foreground",
                )}
                title={`스파크라인 ${period} DB 일봉`}
                aria-pressed={sparklinePeriod === period}
              >
                {period}
              </button>
            ),
          )}
        </div>
      </div>
      {searchMode && (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          검색 결과는 `/v1/search` 전체 DB에서 가져오고, 가격/등락률은 최근
          일봉으로 보정합니다.
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          {
            label: "상승 종목",
            value: filtered.filter((s) => s.changePct >= 0).length,
            color: "text-up",
          },
          {
            label: "하락 종목",
            value: filtered.filter((s) => s.changePct < 0).length,
            color: "text-down",
          },
          {
            label: "평균 등락",
            value: avgChange.toFixed(2) + "%",
            color: "text-foreground",
          },
          {
            label: "최고 상승",
            value: bestChange.toFixed(2) + "%",
            color: "text-up",
          },
          {
            label: "최고 하락",
            value: worstChange.toFixed(2) + "%",
            color: "text-down",
          },
          {
            label: "검색 결과",
            value: filtered.length + "개",
            color: "text-foreground",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-lg p-3 text-center"
          >
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div
              className={cn(
                "text-lg font-bold font-mono-num mt-0.5",
                stat.color,
              )}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {[
                  { label: "종목", key: null },
                  { label: "현재가", key: null },
                  { label: "등락률", key: "changePct" as const },
                  { label: "시가총액", key: "marketCap" as const },
                  { label: "P/E", key: "pe" as const },
                  { label: "ROE", key: null },
                  { label: "섹터", key: null },
                  { label: `차트 ${sparklinePeriod}`, key: null },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={cn(
                      "text-left py-3 px-4 text-xs text-muted-foreground font-medium",
                      h.key &&
                        "cursor-pointer hover:text-foreground select-none",
                    )}
                    onClick={() => h.key && handleSort(h.key)}
                  >
                    <div className="flex items-center gap-1">
                      {h.label}
                      {h.key && (
                        <ArrowUpDown
                          size={10}
                          className={sortBy === h.key ? "text-primary" : ""}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading &&
                Array.from({ length: 8 }, (_, i) => (
                  <tr
                    key={`loading-${i}`}
                    className="border-b border-border/50"
                  >
                    <td className="py-3 px-4" colSpan={8}>
                      <div className="h-8 rounded bg-muted/25 animate-pulse" />
                    </td>
                  </tr>
                ))}
              {!tableLoading &&
                filtered.map((stock) => (
                  <tr
                    key={stock.ticker}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/stocks/${stock.ticker}`}
                        onMouseEnter={() =>
                          prefetchRoute(`/stocks/${stock.ticker}`)
                        }
                        onFocus={() => prefetchRoute(`/stocks/${stock.ticker}`)}
                        onTouchStart={() =>
                          prefetchRoute(`/stocks/${stock.ticker}`)
                        }
                      >
                        <div className="cursor-pointer">
                          <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate max-w-[180px]">
                            {stock.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono-num">
                            {stock.ticker}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono-num font-medium text-sm">
                      {stock.price > 0 ? stock.price.toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <PctBadge value={stock.changePct} />
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono-num">
                      {stock.marketCap || "—"}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-num">
                      {stock.pe != null ? `${stock.pe}x` : "—"}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-num">
                      {stock.roe != null ? `${stock.roe}%` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {stock.sector}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Sparkline
                        ticker={stock.ticker}
                        period={sparklinePeriod}
                      />
                    </td>
                  </tr>
                ))}
              {!tableLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="text-sm font-medium text-foreground">
                      표시할 종목 데이터가 없습니다
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {error
                        ? "API 응답을 받지 못했습니다. 다시 시도해 주세요."
                        : searchMode
                          ? "검색어를 바꾸거나 다른 시장을 선택하세요."
                          : "검색 조건을 조정하거나 다른 시장을 선택하세요."}
                    </div>
                    {error && !searchMode && (
                      <button
                        onClick={refetch}
                        className="mt-3 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        다시 불러오기
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
