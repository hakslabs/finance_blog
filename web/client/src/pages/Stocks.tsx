/**
 * Stocks.tsx — Stock Screener Page
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { US_STOCKS, KR_STOCKS, generateSparkline } from "@/lib/data";
import { useStocks } from "@/features/stocks";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Search, TrendingUp, TrendingDown, Filter, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function PctBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-mono-num font-medium", up ? "text-up" : "text-down")}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function Sparkline({ up }: { up: boolean }) {
  const data = generateSparkline(12, up ? "up" : "down");
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${up}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
              <stop offset="100%" stopColor={up ? "#22c55e" : "#ef4444"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth={1.5}
            fill={`url(#sg-${up})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const SECTORS = ["전체", "기술", "반도체", "금융", "에너지", "소비재", "헬스케어", "자동차", "바이오", "IT/플랫폼"];

export default function Stocks() {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("전체");
  const [sortBy, setSortBy] = useState<"changePct" | "marketCap" | "pe">("changePct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Overlay live movers data; if the API has rows we use them, else
  // fall back to the rich mock list (which has marketCap/pe/sector).
  const baseStocks = market === "US" ? US_STOCKS : KR_STOCKS;
  const { data: liveStocks } = useStocks(market);
  const allStocks = useMemo(() => {
    if (!liveStocks || liveStocks.length === 0) return baseStocks;
    const liveBySymbol = new Map(liveStocks.map((s) => [s.ticker, s]));
    return baseStocks.map((s) => {
      const live = liveBySymbol.get(s.ticker);
      return live ? { ...s, price: live.price, changePct: live.changePct, change: live.change, volume: live.volume } : s;
    });
  }, [baseStocks, liveStocks]);

  const filtered = useMemo(() => {
    let list = allStocks.filter(s => {
      const matchSearch = s.ticker.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase());
      const matchSector = sector === "전체" || s.sector.includes(sector);
      return matchSearch && matchSector;
    });
    list = [...list].sort((a, b) => {
      const va = a[sortBy] as number;
      const vb = b[sortBy] as number;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [allStocks, search, sector, sortBy, sortDir]);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-['Outfit']">종목 검색</h1>
        <p className="text-sm text-muted-foreground mt-0.5">미국 · 한국 종목 스크리너</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Market toggle */}
        <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
          {(["US", "KR"] as const).map(m => (
            <button key={m} onClick={() => setMarket(m)}
              className={cn("text-sm px-4 py-1.5 rounded-md transition-all font-medium",
                market === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="티커 / 종목명 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Sector filter */}
        <div className="flex gap-1 flex-wrap">
          {SECTORS.slice(0, 5).map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={cn("text-xs px-2.5 py-1.5 rounded-lg border transition-all",
                sector === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "상승 종목", value: filtered.filter(s => s.changePct >= 0).length, color: "text-up" },
          { label: "하락 종목", value: filtered.filter(s => s.changePct < 0).length, color: "text-down" },
          { label: "평균 등락", value: (filtered.reduce((a, s) => a + s.changePct, 0) / filtered.length || 0).toFixed(2) + "%", color: "text-foreground" },
          { label: "최고 상승", value: Math.max(...filtered.map(s => s.changePct)).toFixed(2) + "%", color: "text-up" },
          { label: "최고 하락", value: Math.min(...filtered.map(s => s.changePct)).toFixed(2) + "%", color: "text-down" },
          { label: "검색 결과", value: filtered.length + "개", color: "text-foreground" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className={cn("text-lg font-bold font-mono-num mt-0.5", stat.color)}>{stat.value}</div>
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
                  { label: "차트", key: null },
                ].map((h) => (
                  <th key={h.label}
                    className={cn("text-left py-3 px-4 text-xs text-muted-foreground font-medium",
                      h.key && "cursor-pointer hover:text-foreground select-none"
                    )}
                    onClick={() => h.key && handleSort(h.key)}>
                    <div className="flex items-center gap-1">
                      {h.label}
                      {h.key && <ArrowUpDown size={10} className={sortBy === h.key ? "text-primary" : ""} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((stock) => (
                <tr key={stock.ticker} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                  <td className="py-3 px-4">
                    <Link href={`/stocks/${stock.ticker}`}>
                      <div className="cursor-pointer">
                        <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate max-w-[180px]">{stock.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono-num">{stock.ticker}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono-num font-medium text-sm">{stock.price.toLocaleString()}</td>
                  <td className="py-3 px-4"><PctBadge value={stock.changePct} /></td>
                  <td className="py-3 px-4 text-xs text-muted-foreground font-mono-num">{stock.marketCap}</td>
                  <td className="py-3 px-4 text-xs font-mono-num">{stock.pe}x</td>
                  <td className="py-3 px-4 text-xs font-mono-num">{stock.roe}%</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stock.sector}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Sparkline up={stock.changePct >= 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
