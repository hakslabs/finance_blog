import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Newspaper, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useNewsList } from "@/features/news";
import type { NewsItem } from "@/features/news";

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return `${Math.floor(diff)}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function News() {
  const [query, setQuery] = useState("");
  const { data, loading, error } = useNewsList({ limit: 80 });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((n) => {
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        (n.summary ?? "").toLowerCase().includes(q) ||
        n.related_symbols.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [data, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">시장 뉴스</h1>
            <p className="text-xs text-muted-foreground">
              주요 매체의 시세 영향 뉴스를 모아 보여줍니다
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {data ? `${data.length}건` : ""}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·요약·종목 검색"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-card/60 border border-border/60 text-sm focus:outline-none focus:border-sky-500/60"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            뉴스를 불러오는 중…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            뉴스를 불러오지 못했습니다. ({error.message})
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            표시할 뉴스가 없습니다.
          </div>
        )}

        <ul className="space-y-3">
          {filtered.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const inner = (
    <article className="rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-sky-500/30 transition-all p-4">
      <header className="flex items-start justify-between gap-3 mb-1.5">
        <h2 className="text-sm font-semibold leading-snug flex-1">
          {item.title}
        </h2>
        {item.url && (
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}
      </header>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
        <span className="font-mono uppercase">{item.source}</span>
        <span>·</span>
        <span>{formatRelative(item.published_at)}</span>
      </div>
      {item.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {item.summary}
        </p>
      )}
      {item.related_symbols.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.related_symbols.slice(0, 6).map((sym) => (
            <Badge key={sym} variant="outline" className="font-mono text-[10px]">
              {sym}
            </Badge>
          ))}
        </div>
      )}
    </article>
  );

  if (item.url) {
    return (
      <li>
        <a href={item.url} target="_blank" rel="noreferrer" className="block">
          {inner}
        </a>
      </li>
    );
  }
  return <li>{inner}</li>;
}
