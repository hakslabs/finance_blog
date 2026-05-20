/**
 * News.tsx — 시장 뉴스 전용 페이지
 * - 카테고리 필터 (전체/매크로/한국/미국/섹터/기업)
 * - 키워드 검색
 * - 뉴스 클릭 시 상세 모달
 * - 관심 뉴스 북마크
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useHoldings } from "@/features/portfolio";
import { tickerToName } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Search, Bookmark, BookmarkCheck,
  ExternalLink, Clock, Filter, X, ArrowRight, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { ModalPortal } from "@/components/ModalPortal";
import { useBookmark } from "@/contexts/BookmarkContext";
import { useNews } from "@/features/news";

function fmtRelative(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMin = Math.floor((now - d.getTime()) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// ── Extended mock news data ───────────────────────────────────
const ALL_NEWS = [
  {
    id: 1, title: "연준 위원, \"9월 인하 가능성 열어둘 것\"",
    body: "연방준비제도(Fed) 위원이 물가 안정 추세가 지속될 경우 9월 FOMC에서 금리 인하를 검토할 수 있다고 밝혔다. 시장은 이를 비둘기파적 신호로 해석하며 국채 수익률이 하락했다.",
    source: "Bloomberg", time: "12분", category: "매크로",
    tickers: ["QQQ", "SPY", "TLT"], impact: "+0.18%", up: true,
    tags: ["#연준", "#금리인하", "#국채"],
  },
  {
    id: 2, title: "코스피 외인 순매수 5거래일 연속, 반도체 주도",
    body: "외국인 투자자가 코스피 시장에서 5거래일 연속 순매수를 기록했다. 삼성전자와 SK하이닉스를 중심으로 반도체 섹터에 집중 매수가 유입되며 코스피는 2,680선을 회복했다.",
    source: "한국경제", time: "34분", category: "한국",
    tickers: ["005930", "000660"], impact: "+0.32%", up: true,
    tags: ["#외인", "#반도체", "#코스피"],
  },
  {
    id: 3, title: "엔비디아 추론 칩 발표 후 AI 반도체 일제 상승",
    body: "NVIDIA가 차세대 추론 최적화 칩 'Blackwell Ultra'를 공개하며 AI 반도체 섹터 전반이 강세를 보였다. AMD, TSMC 등 관련주가 동반 상승했으며 필라델피아 반도체 지수는 2.1% 상승했다.",
    source: "Reuters", time: "1시간", category: "미국",
    tickers: ["NVDA", "AMD", "TSM", "AVGO"], impact: "+0.42%", up: true,
    tags: ["#AI", "#반도체", "#NVDA"],
  },
  {
    id: 4, title: "국제유가 WTI 72달러 회복, OPEC+ 감산 연장 관측",
    body: "서부텍사스산 원유(WTI)가 배럴당 72달러를 회복했다. OPEC+가 다음 달 회의에서 자발적 감산을 연장할 것이라는 관측이 유가를 지지했다. 에너지 섹터 ETF XLE는 1.2% 상승했다.",
    source: "WSJ", time: "2시간", category: "매크로",
    tickers: ["XOM", "CVX", "XLE"], impact: null, up: null,
    tags: ["#원유", "#OPEC", "#에너지"],
  },
  {
    id: 5, title: "원/달러 1,387원 하락 마감, 위험선호 회복",
    body: "원/달러 환율이 전일 대비 3.1원 하락한 1,387원에 마감했다. 글로벌 위험선호 심리 회복과 외국인 주식 순매수가 원화 강세 요인으로 작용했다.",
    source: "연합뉴스", time: "3시간", category: "한국",
    tickers: ["005930", "USD/KRW"], impact: "+0.05%", up: true,
    tags: ["#환율", "#원화", "#외환"],
  },
  {
    id: 6, title: "애플, WWDC에서 AI 기능 대거 공개 예정",
    body: "애플이 다음 달 개최 예정인 WWDC 2025에서 iOS 19와 함께 대규모 AI 기능을 공개할 것으로 알려졌다. Siri 전면 개편, 온디바이스 LLM 탑재 등이 예상된다.",
    source: "9to5Mac", time: "4시간", category: "미국",
    tickers: ["AAPL"], impact: null, up: null,
    tags: ["#애플", "#AI", "#WWDC"],
  },
  {
    id: 7, title: "삼성전자, HBM4 수율 개선 가속화",
    body: "삼성전자가 HBM4 메모리 수율을 빠르게 개선하고 있으며 엔비디아 공급 인증 심사를 통과할 가능성이 높아졌다는 보도가 나왔다. 반도체 업계는 이를 긍정적으로 평가하고 있다.",
    source: "조선비즈", time: "5시간", category: "한국",
    tickers: ["005930", "NVDA"], impact: "+0.51%", up: true,
    tags: ["#삼성", "#HBM", "#반도체"],
  },
  {
    id: 8, title: "테슬라, 완전자율주행 로보택시 6월 출시 확정",
    body: "테슬라가 텍사스 오스틴에서 완전자율주행 로보택시 서비스를 6월 공식 출시한다고 발표했다. 일론 머스크는 연내 10개 도시 확장 계획을 밝혔다.",
    source: "CNBC", time: "6시간", category: "미국",
    tickers: ["TSLA"], impact: null, up: null,
    tags: ["#테슬라", "#자율주행", "#로보택시"],
  },
  {
    id: 9, title: "미국 4월 CPI 예상치 하회, 인플레 둔화 확인",
    body: "미국 4월 소비자물가지수(CPI)가 전년 대비 3.1% 상승해 시장 예상치 3.3%를 하회했다. 근원 CPI도 3.6%로 둔화세를 보이며 연준의 금리 인하 기대를 높였다.",
    source: "BLS", time: "7시간", category: "매크로",
    tickers: ["SPY", "TLT", "QQQ"], impact: "+0.82%", up: true,
    tags: ["#CPI", "#인플레", "#연준"],
  },
  {
    id: 10, title: "현대차, 미국 전기차 판매 전년 대비 38% 증가",
    body: "현대차·기아가 미국 시장에서 전기차 판매량이 전년 동기 대비 38% 증가했다고 발표했다. 아이오닉 6와 EV6의 판매 호조가 주요 요인이다.",
    source: "현대차", time: "8시간", category: "한국",
    tickers: ["005380", "000270"], impact: null, up: null,
    tags: ["#현대차", "#전기차", "#미국"],
  },
  {
    id: 11, title: "JP모건, S&P 500 연말 목표 6,000 상향",
    body: "JP모건 체이스가 S&P 500 연말 목표 주가를 기존 5,600에서 6,000으로 상향 조정했다. AI 기업들의 실적 호조와 금리 인하 기대가 근거로 제시됐다.",
    source: "JP Morgan", time: "9시간", category: "미국",
    tickers: ["SPY", "JPM"], impact: null, up: null,
    tags: ["#S&P500", "#목표주가", "#AI"],
  },
  {
    id: 12, title: "한국 1분기 GDP 성장률 0.9%, 예상 상회",
    body: "한국 1분기 실질 GDP 성장률이 전기 대비 0.9%를 기록해 시장 예상치 0.6%를 상회했다. 반도체 수출 회복과 설비투자 증가가 성장을 견인했다.",
    source: "한국은행", time: "10시간", category: "한국",
    tickers: ["005930", "KOSPI"], impact: "+0.69%", up: true,
    tags: ["#GDP", "#한국경제", "#반도체"],
  },
];

const CATEGORIES = ["전체", "매크로", "한국", "미국", "섹터", "기업"];

function categoryColor(cat: string) {
  if (cat === "매크로") return "border-sky text-sky";
  if (cat === "한국") return "border-violet text-violet-accent";
  if (cat === "미국") return "border-primary text-primary";
  if (cat === "섹터") return "border-gold text-gold";
  return "border-muted-foreground text-muted-foreground";
}

export default function News() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const { isNewsBookmarked, toggleNewsBookmark, bookmarkedNewsIds } = useBookmark();
  // Live news pull — `data` falls back to ALL_NEWS-shaped mock when the
  // backend table is empty (dev/preview), `updatedAt` is the publish
  // time of the latest article and drives the freshness chip.
  const { data: liveNews, updatedAt: newsUpdatedAt } = useNews({ limit: 60 });
  const newsSource = (liveNews && liveNews.length > 0)
    ? liveNews
    : (ALL_NEWS as any[]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  // Personalize each news item's "impact" string from the user's actual
  // portfolio holdings. If a news ticker is in the user's holdings, we
  // surface the holding's weight × |today's change|. Falls back to the
  // mock impact for tickers the user doesn't hold.
  const { data: holdings } = useHoldings();
  const allNewsPersonalized = useMemo(() => {
    const byTicker = new Map<string, { weight: number; changePct: number }>();
    for (const h of holdings ?? []) {
      byTicker.set(h.ticker, { weight: h.weight, changePct: h.gainLossPct });
    }
    if (byTicker.size === 0) return newsSource;
    return newsSource.map((n) => {
      let total = 0;
      let signed = 0;
      for (const t of n.tickers) {
        const h = byTicker.get(t);
        if (!h) continue;
        total += h.weight;
        signed += (h.weight / 100) * h.changePct;
      }
      if (total === 0) return n;
      const sign = signed >= 0 ? "+" : "";
      return { ...n, impact: `${sign}${signed.toFixed(2)}%`, up: signed >= 0 };
    });
  }, [holdings, newsSource]);

  const filtered = (allNewsPersonalized as any[]).filter((n: any) => {
    const matchCat = activeCategory === "전체" || n.category === activeCategory;
    const matchSearch = !searchQuery || n.title.includes(searchQuery) || (n.tags ?? []).some((t: string) => t.includes(searchQuery));
    return matchCat && matchSearch;
  });

  const toggleBookmark = (id: number) => {
    const was = isNewsBookmarked(id);
    const article = allNewsPersonalized.find(n => n.id === id);
    toggleNewsBookmark(id, article ? {
      title: article.title,
      subtitle: `${article.source} · ${article.category}`,
      href: `/news`,
    } : undefined);
    toast.success(was ? "북마크 해제" : "뉴스를 북마크했습니다");
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit'] text-foreground">시장 뉴스</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            실시간 금융·경제 뉴스
            {newsUpdatedAt && (
              <span className="ml-2 text-[11px]">· 업데이트 {fmtRelative(newsUpdatedAt)}</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.info("뉴스 새로고침 중...")}>
          <RefreshCw size={13} /> 새로고침
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="뉴스 검색 (제목, 태그)…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-sm bg-muted/50 border border-border rounded-lg
              focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background
              placeholder:text-muted-foreground transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Filter size={14} className="text-muted-foreground self-center" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-all duration-150",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>총 <strong className="text-foreground">{filtered.length}</strong>건</span>
        {bookmarkedNewsIds.length > 0 && (
          <button onClick={() => setActiveCategory("전체")} className="flex items-center gap-1 text-primary hover:underline">
            <Bookmark size={11} /> 북마크 {bookmarkedNewsIds.length}건
          </button>
        )}
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(news => (
          <div
            key={news.id}
            onClick={() => setSelectedNews(news)}
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 flex-shrink-0 mt-0.5", categoryColor(news.category))}>
                {news.category}
              </Badge>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {news.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {news.body}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} /> {news.source} · {news.time} 전
                </span>
                <div className="flex gap-1">
                  {news.tickers.slice(0, 3).map((t: string) => (
                    <Link key={t} href={`/analysis?ticker=${t}`} onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground hover:text-primary transition-colors">{tickerToName(t)}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {news.impact && (
                  <span className={cn("text-xs font-mono font-bold", news.up ? "text-up" : "text-down")}>
                    {news.up ? <TrendingUp size={10} className="inline mr-0.5" /> : <TrendingDown size={10} className="inline mr-0.5" />}
                    {news.impact}
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); toggleBookmark(news.id); }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {isNewsBookmarked(news.id)
                    ? <BookmarkCheck size={14} className="text-primary" />
                    : <Bookmark size={14} />
                  }
                </button>
              </div>
            </div>

            <div className="flex gap-1 mt-2">
              {(news.tags ?? []).map((tag: string) => (
                <span key={tag} className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">검색 결과가 없습니다</p>
          <button onClick={() => { setSearchQuery(""); setActiveCategory("전체"); }} className="text-xs text-primary hover:underline mt-1">
            필터 초기화
          </button>
        </div>
      )}

      {/* News Detail Modal */}
      {selectedNews && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedNews(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="p-5">
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", categoryColor(selectedNews.category))}>
                    {selectedNews.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} /> {selectedNews.source} · {selectedNews.time} 전
                  </span>
                </div>
                <button onClick={() => setSelectedNews(null)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                  <X size={18} />
                </button>
              </div>

              <h2 className="text-base font-bold text-foreground leading-snug mb-3 font-['Outfit']">
                {selectedNews.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {selectedNews.body}
              </p>

              {/* Impact */}
              {selectedNews.impact && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg mb-4",
                  selectedNews.up ? "bg-up/10 border border-up/20" : "bg-down/10 border border-down/20"
                )}>
                  {selectedNews.up ? <TrendingUp size={14} className="text-up" /> : <TrendingDown size={14} className="text-down" />}
                  <span className="text-xs font-medium">내 포트폴리오 영향</span>
                  <span className={cn("text-sm font-bold font-mono ml-auto", selectedNews.up ? "text-up" : "text-down")}>
                    {selectedNews.impact}
                  </span>
                </div>
              )}

              {/* Related tickers */}
              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-2">관련 종목</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedNews.tickers.map((t: string) => (
                    <Link key={t} href={`/analysis?ticker=${t}`} onClick={() => setSelectedNews(null)}>
                      <span className="text-xs px-2.5 py-1.5 bg-muted rounded-lg text-foreground hover:text-primary hover:bg-muted/80 transition-colors font-semibold flex items-center gap-1">
                        {tickerToName(t)} <ArrowRight size={10} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {(selectedNews.tags ?? []).map((tag: string) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 bg-muted/50 rounded text-muted-foreground">{tag}</span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => toggleBookmark(selectedNews.id)}
                >
                  {isNewsBookmarked(selectedNews.id)
                    ? <><BookmarkCheck size={13} className="text-primary" /> 북마크됨</>
                    : <><Bookmark size={13} /> 북마크</>
                  }
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => { toast.info("원문 링크 기능은 실제 API 연동 후 제공됩니다"); }}
                >
                  <ExternalLink size={13} /> 원문 보기
                </Button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
