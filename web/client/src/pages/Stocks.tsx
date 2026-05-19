import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Loader2, Search, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useMovers } from "@/features/movers";
import type { MoverItem } from "@/features/movers";

type Market = "US" | "KR";

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

export default function Stocks() {
  const [market, setMarket] = useState<Market>("US");
  const [query, setQuery] = useState("");
  const { data, loading, error } = useMovers({ market, limit: 50 });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items ?? []).filter((m) => {
      if (!q) return true;
      return (
        m.symbol.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q)
      );
    });
  }, [data, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">주요 변동 종목</h1>
            <p className="text-xs text-muted-foreground">
              오늘의 큰 변동 종목 (시가총액·거래량 기준)
            </p>
          </div>
          <div className="inline-flex rounded-md border border-border/60 overflow-hidden text-xs">
            {(["US", "KR"] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`px-3 py-1.5 font-mono ${
                  market === m
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="티커·종목명 검색"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-card/60 border border-border/60 text-sm focus:outline-none focus:border-emerald-500/60"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            변동 종목을 불러오는 중…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            데이터를 불러오지 못했습니다. ({error.message})
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            조건에 맞는 종목이 없습니다.
          </div>
        )}

        <ul className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/40">
          {items.map((m) => (
            <MoverRow key={m.symbol} m={m} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function MoverRow({ m }: { m: MoverItem }) {
  const up = m.change_pct >= 0;
  return (
    <li>
      <Link href={`/stocks/${m.symbol}`}>
        <div className="grid grid-cols-[40px_1fr_100px_120px_100px] gap-3 items-center px-4 py-3 hover:bg-card/60 transition-colors cursor-pointer">
          <span className="font-mono text-xs text-muted-foreground">
            #{m.rank}
          </span>
          <div className="min-w-0">
            <div className="font-mono font-semibold text-sm">{m.symbol}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {m.name}
            </div>
          </div>
          <div className="text-right font-mono text-sm">{fmtPrice(m.last)}</div>
          <div
            className={`flex items-center justify-end gap-1 font-mono text-sm ${
              up ? "text-up" : "text-down"
            }`}
          >
            {up ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {up ? "+" : ""}
            {m.change_pct.toFixed(2)}%
          </div>
          <div className="text-right">
            <Badge variant="outline" className="font-mono text-[10px]">
              {m.market}
            </Badge>
          </div>
        </div>
      </Link>
    </li>
  );
}
