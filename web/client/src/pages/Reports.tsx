/**
 * Reports.tsx — 리포트 페이지 v3
 * Design: 증권사 리포트 스타일 테이블 리스트 뷰
 * Layout: 탭 + 검색/필터 바 + 테이블 목록 + 우측 상세 패널 (split view)
 */
import { useState, useMemo, useContext, useCallback, Fragment } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { REPORTS } from "@/lib/data";
import { useReports } from "@/features/reports";
import {
  FileText,
  Bookmark,
  BookmarkCheck,
  X,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Calendar,
  Building2,
  ExternalLink,
  Filter,
  ArrowUpDown,
  BarChart2,
  AlertCircle,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { BookmarkContext } from "@/contexts/BookmarkContext";

type Report = (typeof REPORTS)[0];
type SortKey = "date" | "source" | "title";
type SortDir = "asc" | "desc";

const TABS = ["전체 리포트", "Daily/개별종목", "경제분석 리포트"];
const CATEGORIES = ["전체", "거시", "13F", "산업", "리서치", "공시"];
const REGIONS = ["전체", "KR", "US", "GLOBAL"];

const CATEGORY_COLOR: Record<string, string> = {
  거시: "text-sky-400 border-sky-500/40 bg-sky-500/10",
  "13F": "text-violet-400 border-violet-500/40 bg-violet-500/10",
  산업: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  리서치: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  공시: "text-rose-400 border-rose-500/40 bg-rose-500/10",
};

const RATING_STYLE: Record<string, string> = {
  매수: "text-up bg-up/10 border-up/30",
  중립: "text-muted-foreground bg-muted/30 border-border",
  매도: "text-down bg-down/10 border-down/30",
};

// Pull per-report bullets straight from the report. We try, in order:
//   1) explicit content field with bullet markers (- / •)
//   2) sentence-split of summary, capped at 4 sentences
//   3) derived facts from tickers / tags / rating
// Falls back to the original generic list so the section never blanks.
function deriveKeyPoints(r: Report): string[] {
  const content = (r as any).content as string | undefined;
  if (content) {
    const bullets = content
      .split("\n")
      .map((l) => l.replace(/^[\s\-•·*]+/, "").trim())
      .filter((l) => l.length > 8);
    if (bullets.length >= 2) return bullets.slice(0, 6);
  }
  const sentences = (r.summary ?? "")
    .split(/(?<=[.다요음])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  if (sentences.length >= 2) return sentences.slice(0, 4);
  const facts: string[] = [];
  if (r.rating) facts.push(`투자의견 ${r.rating}`);
  if ((r as any).targetPrice) facts.push(`목표주가 ${(r as any).targetPrice}`);
  if (r.tickers && r.tickers.length)
    facts.push(`관련 종목 ${r.tickers.join(", ")}`);
  if (r.tags && r.tags.length) facts.push(`주요 키워드 ${r.tags.join(" · ")}`);
  return facts;
}

// ── Detail Panel ──────────────────────────────────────────────
function ReportDetailPanel({
  report,
  onClose,
  bookmarked,
  onToggleBookmark,
}: {
  report: Report;
  onClose: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const catColor =
    CATEGORY_COLOR[report.category] ??
    "text-muted-foreground border-border bg-muted/20";
  const ratingStr = (report as any).rating as string | undefined;
  const targetPrice = (report as any).targetPrice as string | undefined;
  const tickers = (report as any).tickers as string[] | undefined;
  const content = (report as any).content as string | undefined;
  const bodyUrl = (report as any).body_url as string | undefined;
  const sourceUrl = (report as any).sourceUrl as string | undefined;
  const downloadUrl = (report as any).downloadUrl as string | undefined;
  const keyPoints = deriveKeyPoints(report);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                catColor,
              )}
            >
              {report.category}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
              {report.region}
            </span>
            {ratingStr && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border font-semibold",
                  RATING_STYLE[ratingStr] ?? "",
                )}
              >
                {ratingStr}
              </span>
            )}
            {tickers &&
              tickers.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono border border-border/50"
                >
                  {t}
                </span>
              ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggleBookmark}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                bookmarked
                  ? "text-amber-400 bg-amber-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {bookmarked ? (
                <BookmarkCheck size={14} />
              ) : (
                <Bookmark size={14} />
              )}
            </button>
            <button
              onClick={() => toast.info("PDF 다운로드 준비 중")}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <h2 className="text-sm font-bold leading-snug font-['Outfit'] mb-1.5">
          {report.title}
        </h2>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          <Building2 size={10} />
          <span className="font-medium text-foreground">{report.source}</span>
          <span>·</span>
          <Calendar size={10} />
          <span>{report.date}</span>
          <span>·</span>
          <FileText size={10} />
          <span>{report.pages}p</span>
        </div>
        {targetPrice && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">목표주가</span>
            <span className="text-sm font-bold font-mono text-up">
              {targetPrice}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            AI 요약
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {report.summary || "요약이 제공되지 않은 리포트입니다."}
          </p>
        </div>
        {/* Quick facts row — rating / target / region — only when at
            least one is set; otherwise the block is hidden so we don't
            ship a row of em-dashes. */}
        {(ratingStr || targetPrice || (tickers && tickers.length)) && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              핵심 정보
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ratingStr && (
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    투자의견
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold",
                      RATING_STYLE[ratingStr]?.split(" ")[0] ?? "",
                    )}
                  >
                    {ratingStr}
                  </div>
                </div>
              )}
              {targetPrice && (
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    목표주가
                  </div>
                  <div className="text-sm font-bold font-mono text-up">
                    {targetPrice}
                  </div>
                </div>
              )}
              {tickers && tickers.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-2.5 col-span-2">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    관련 종목
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tickers.map((t) => (
                      <Link key={t} href={`/stocks/${t}`}>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-card border border-border font-mono hover:border-primary/50 hover:text-primary cursor-pointer">
                          {t}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {keyPoints.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              핵심 포인트
            </h3>
            <ul className="space-y-2">
              {keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-foreground/80 leading-relaxed">
                    {pt}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {content && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              리포트 내용
            </h3>
            <div className="text-sm text-foreground/70 leading-relaxed whitespace-pre-line bg-muted/20 rounded-lg p-3">
              {content}
            </div>
          </div>
        )}
        {/* Meta: institution detail line that doesn't fit the header */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            발행 정보
          </h3>
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 rounded-lg p-3">
            <div className="flex justify-between">
              <span>발행기관</span>
              <span className="text-foreground">{report.source}</span>
            </div>
            <div className="flex justify-between">
              <span>지역</span>
              <span className="text-foreground">{report.region}</span>
            </div>
            <div className="flex justify-between">
              <span>발행일</span>
              <span className="text-foreground font-mono">{report.date}</span>
            </div>
            <div className="flex justify-between">
              <span>분량</span>
              <span className="text-foreground">{report.pages} 페이지</span>
            </div>
            <div className="flex justify-between">
              <span>카테고리</span>
              <span className="text-foreground">{report.category}</span>
            </div>
          </div>
        </div>
        {report.tags && report.tags.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              태그
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {report.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 bg-muted/40 rounded-full text-muted-foreground border border-border/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex-shrink-0 flex gap-2">
        {sourceUrl || bodyUrl ? (
          <a
            href={sourceUrl || bodyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
          >
            <ExternalLink size={12} /> 원문 보기
          </a>
        ) : (
          <button
            onClick={() => toast.info("이 리포트는 원문 링크가 없어요")}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-muted/40 text-muted-foreground cursor-not-allowed font-medium"
          >
            <ExternalLink size={12} /> 원문 링크 없음
          </button>
        )}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
          >
            <Download size={12} /> PDF
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function Reports() {
  const bookmarkCtx = useContext(BookmarkContext);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [region, setRegion] = useState("전체");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleBookmark = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (bookmarkCtx?.isBookmarked("report", id)) {
        bookmarkCtx.removeBookmark("report", id);
        toast.info("북마크 해제");
      } else {
        bookmarkCtx?.addBookmark("report", id);
        toast.success("북마크 추가");
      }
    },
    [bookmarkCtx],
  );

  // Live reports — falls back to REPORTS mock when DB is empty.
  const { data: liveReports } = useReports({ limit: 200 });

  const filtered = useMemo(() => {
    let list: any[] = [
      ...(liveReports && liveReports.length > 0 ? liveReports : REPORTS),
    ];
    if (activeTab === 1) {
      list = list.filter(
        (r) =>
          r.type === "Daily" || r.type === "종목분석" || r.type === "실적분석",
      );
    } else if (activeTab === 2) {
      list = list.filter(
        (r) =>
          r.category === "거시" || r.type === "Macro" || r.type === "Strategy",
      );
    }
    if (category !== "전체") list = list.filter((r) => r.category === category);
    if (region !== "전체") list = list.filter((r) => r.region === region);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q) ||
          (r.tags ?? []).some((t: string) => t.toLowerCase().includes(q)),
      );
    }
    if (dateFrom)
      list = list.filter((r) => r.date.replace(/\./g, "-") >= dateFrom);
    if (dateTo) list = list.filter((r) => r.date.replace(/\./g, "-") <= dateTo);
    list.sort((a, b) => {
      const va = String(a[sortKey as keyof typeof a] ?? "");
      const vb = String(b[sortKey as keyof typeof b] ?? "");
      if (sortDir === "asc") return va < vb ? -1 : va > vb ? 1 : 0;
      return va > vb ? -1 : va < vb ? 1 : 0;
    });
    return list;
  }, [
    activeTab,
    category,
    region,
    searchQuery,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    liveReports,
  ]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown size={11} className="text-muted-foreground/40" />;
    return sortDir === "desc" ? (
      <ChevronDown size={11} className="text-primary" />
    ) : (
      <ChevronUp size={11} className="text-primary" />
    );
  };

  return (
    <div
      className="flex flex-col animate-fade-in-up"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      {/* Page Header */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold font-['Outfit']">리포트</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          증권사 리포트 · 13F · 거시경제 분석
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(i);
              setSelectedReport(null);
            }}
            className={cn(
              "px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === i
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="py-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs text-muted-foreground cursor-pointer">
            <span>제목+요약</span>
            <ChevronDown size={11} />
          </div>
          <div className="flex-1 min-w-[180px] relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어를 입력하세요."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setSortKey("date");
                setSortDir("desc");
              }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                sortKey === "date" && sortDir === "desc"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              최근발행순
            </button>
            <button
              onClick={() => {
                setSortKey("source");
                setSortDir("asc");
              }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                sortKey === "source"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              증권사순
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={12} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-muted/30 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
            />
            <span>~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-muted/30 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors",
              showFilters
                ? "bg-primary/10 text-primary"
                : "bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <Filter size={11} /> 필터
          </button>
        </div>
        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg transition-colors",
                    category === c
                      ? "bg-card text-foreground shadow-sm font-medium border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex gap-1">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg transition-colors",
                    region === r
                      ? "bg-card text-foreground shadow-sm font-medium border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content: table + detail panel */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Table */}
        <div
          className={cn(
            "flex flex-col overflow-hidden transition-all duration-200",
            selectedReport ? "w-[55%]" : "w-full",
          )}
        >
          <div className="py-2 px-1 text-xs text-muted-foreground flex items-center gap-3 flex-shrink-0">
            <span className="font-medium text-foreground">
              {filtered.length}건
            </span>
            <span className="text-up">
              {filtered.filter((r) => r.status === "AI 요약").length}건 AI 요약
            </span>
            {filtered.filter((r) => (r as any).rating === "매수").length >
              0 && (
              <span className="text-emerald-400">
                {filtered.filter((r) => (r as any).rating === "매수").length}건
                매수의견
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/30 border-y border-border">
                  <th
                    className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-[100px]"
                    onClick={() => handleSort("date")}
                  >
                    <span className="flex items-center gap-1">
                      일자 <SortIcon col="date" />
                    </span>
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("title")}
                    >
                      제목 <SortIcon col="title" />
                    </span>
                  </th>
                  <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-[32px]"></th>
                  <th
                    className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-[100px]"
                    onClick={() => handleSort("source")}
                  >
                    <span className="flex items-center gap-1">
                      증권사 <SortIcon col="source" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-16 text-muted-foreground text-sm"
                    >
                      <FileText size={32} className="mx-auto mb-2 opacity-20" />
                      조건에 맞는 리포트가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((report, idx) => {
                    const isSelected = selectedReport?.id === report.id;
                    const isBookmarked =
                      bookmarkCtx?.isBookmarked("report", report.id) ?? false;
                    const prevDate = idx > 0 ? filtered[idx - 1].date : null;
                    const showDivider = prevDate !== report.date;
                    const ratingStr = (report as any).rating as
                      | string
                      | undefined;
                    const tickers = (report as any).tickers as
                      | string[]
                      | undefined;

                    return (
                      <Fragment key={report.id}>
                        {showDivider && idx > 0 && (
                          <tr key={"div-" + report.date + idx}>
                            <td
                              colSpan={4}
                              className="px-3 py-1 bg-muted/10 border-b border-border/30"
                            >
                              <span className="text-[10px] text-muted-foreground/60 font-mono">
                                {report.date}
                              </span>
                            </td>
                          </tr>
                        )}
                        <tr
                          key={report.id}
                          onClick={() =>
                            setSelectedReport(isSelected ? null : report)
                          }
                          className={cn(
                            "border-b border-border/40 cursor-pointer transition-colors group",
                            isSelected
                              ? "bg-primary/5 border-l-2 border-l-primary"
                              : "hover:bg-muted/20",
                          )}
                        >
                          <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                            {report.date}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                  {ratingStr && (
                                    <span
                                      className={cn(
                                        "text-[9px] px-1 py-0.5 rounded border font-bold",
                                        RATING_STYLE[ratingStr] ?? "",
                                      )}
                                    >
                                      {ratingStr}
                                    </span>
                                  )}
                                  {tickers &&
                                    tickers.map((t) => (
                                      <span
                                        key={t}
                                        className="text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono border border-border/50"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  <span
                                    className={cn(
                                      "text-[9px] px-1 py-0.5 rounded border",
                                      CATEGORY_COLOR[report.category] ??
                                        "text-muted-foreground border-border bg-muted/20",
                                    )}
                                  >
                                    {report.category}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    "text-sm leading-snug",
                                    isSelected
                                      ? "text-primary font-medium"
                                      : "group-hover:text-primary transition-colors",
                                  )}
                                >
                                  {report.title}
                                </span>
                                {!selectedReport && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                    {report.summary}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={(e) => toggleBookmark(report.id, e)}
                              className={cn(
                                "p-1 rounded transition-colors",
                                isBookmarked
                                  ? "text-amber-400"
                                  : "text-muted-foreground/30 group-hover:text-muted-foreground",
                              )}
                            >
                              <Paperclip size={13} />
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {report.source}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div
            className="w-[45%] flex-shrink-0 overflow-hidden border-l border-border"
            style={{ maxHeight: "calc(100vh - 220px)" }}
          >
            <ReportDetailPanel
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
              bookmarked={
                bookmarkCtx?.isBookmarked("report", selectedReport.id) ?? false
              }
              onToggleBookmark={() => toggleBookmark(selectedReport.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
