/**
 * Home.tsx — Dashboard Page (v4)
 * - WatchlistContext 실제 연동 (localStorage 기반)
 * - 뉴스 클릭 → 요약 모달
 * - 캘린더 클릭 → 상세 모달
 * - 공포탐욕지수 클릭 → VIX/ADR 히스토리 차트 팝업
 * - 섹터 로테이션 → 미국/한국 탭 분리
 */
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/route-prefetch";
import {
  compareLabelForDate,
  rebaseCompareRows,
  type CompareSeriesRow,
} from "@/lib/compare-series";
import { MARKET_NEWS, CALENDAR_EVENTS, tickerToName } from "@/lib/data";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Star,
  BookmarkCheck,
  LogIn,
  X,
  Clock,
  ExternalLink,
  Bell,
  ChevronRight,
  Bookmark,
  BookmarkMinus,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import KLineSeriesChart from "@/components/KLineSeriesChart";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { useBookmark } from "@/contexts/BookmarkContext";
import { useIndices } from "@/features/indices";
import { useNews } from "@/features/news";
import { useUnifiedCalendar } from "@/features/calendar";
import { useSectors } from "@/features/sectors";
import { useFearGreed } from "@/features/fear-greed";
import { stocksService, useStocks } from "@/features/stocks";
import type { StockBarsCompareResponse } from "@/features/stocks/service";
import type { MarketIndex } from "@/types";

// Pretty-print a backend ISO timestamp for the small "업데이트:" hint
// under each widget. Returns "조금 전" if within 60s, "5분 전" for sub-hour,
// otherwise "HH:MM" today or "MM/DD HH:MM" for older.
function fmtUpdatedAt(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

// ── 시장 감지 ─────────────────────────────────────────────────
function detectOpenMarket(): "KR" | "US" {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const totalMin = utcHour * 60 + utcMin;
  const dayOfWeek = now.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return "KR";
  const krOpen = 0,
    krClose = 6 * 60 + 30;
  if (totalMin >= krOpen && totalMin < krClose) return "KR";
  const nyOpen = 14 * 60 + 30,
    nyClose = 21 * 60;
  if (totalMin >= nyOpen && totalMin < nyClose) return "US";
  return "KR";
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────
function PctBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-mono font-medium",
        up ? "text-up" : "text-down",
      )}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
function SectionHeader({
  title,
  sub,
  href,
  updatedAt,
}: {
  title: string;
  sub?: string;
  href?: string;
  updatedAt?: string | null;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-base font-bold text-foreground font-['Outfit']">
          {title}
        </h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {updatedAt && (
          <span className="text-[10px] text-muted-foreground">
            업데이트 {fmtUpdatedAt(updatedAt)}
          </span>
        )}
        {href && (
          <Link href={href}>
            <span className="text-xs text-primary flex items-center gap-1 hover:underline">
              전체 보기 <ArrowRight size={12} />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Fear & Greed Gauge ────────────────────────────────────────
function FearGreedGauge({
  value,
  label,
  market,
  onClick,
}: {
  value: number;
  label: string;
  market: string;
  onClick: () => void;
}) {
  const zones = [
    { from: 0, to: 25, color: "#ef4444", label: "극도 공포" },
    { from: 25, to: 45, color: "#f97316", label: "공포" },
    { from: 45, to: 55, color: "#eab308", label: "중립" },
    { from: 55, to: 75, color: "#84cc16", label: "탐욕" },
    { from: 75, to: 100, color: "#22c55e", label: "극도 탐욕" },
  ];
  const currentZone =
    zones.find((z) => value >= z.from && value < z.to) || zones[2];
  // Semi-circle: center at (90, 90), radius 65, arc spans -180deg to 0deg (left to right)
  const r = 65;
  const cx = 90,
    cy = 90;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  // Map 0-100 value to -180..0 degrees (left=0, right=100)
  const valToAngle = (v: number) => (v / 100) * 180 - 180;
  const arcPath = (from: number, to: number) => {
    const startAngle = valToAngle(from);
    const endAngle = valToAngle(to);
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const needleAngle = valToAngle(value);
  const needleLen = r - 8;
  const needleX = cx + needleLen * Math.cos(toRad(needleAngle));
  const needleY = cy + needleLen * Math.sin(toRad(needleAngle));
  const gaugeTitle = `${market} 공포·탐욕 지수 ${value} · ${currentZone.label} · ${label}. 히스토리 차트 열기`;
  return (
    <button
      type="button"
      className="group flex flex-col items-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-1 focus-visible:ring-primary/60"
      onClick={onClick}
      title={gaugeTitle}
      aria-label={gaugeTitle}
    >
      <div className="text-xs font-bold text-muted-foreground mb-1">
        {market}
      </div>
      {/* viewBox: 0 0 180 105 — semi-circle fits with padding */}
      <svg
        width="160"
        height="115"
        viewBox="0 0 180 130"
        role="img"
        aria-label={`${market} 공포·탐욕 게이지 ${value}, ${currentZone.label}`}
      >
        <title>{`${market} 공포·탐욕 게이지 ${value}, ${currentZone.label}`}</title>
        {/* Background arc */}
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Colored zones */}
        {zones.map((z) => (
          <path
            key={z.label}
            d={arcPath(z.from, z.to)}
            fill="none"
            stroke={z.color}
            strokeWidth="14"
            strokeLinecap="butt"
            opacity="0.85"
          />
        ))}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="var(--foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill="var(--foreground)" />
        {/* Value — placed below the pivot so it doesn't collide with the needle base */}
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill={currentZone.color}
          fontFamily="'Space Mono', monospace"
        >
          {value}
        </text>
        {/* Zone label */}
        <text
          x={cx}
          y={cy + 38}
          textAnchor="middle"
          fontSize="9"
          fill={currentZone.color}
          opacity="0.9"
        >
          {currentZone.label}
        </text>
      </svg>
      <p className="text-[10px] text-muted-foreground text-center max-w-[140px] leading-tight mt-1">
        {label}
      </p>
      <span className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex items-center gap-0.5">
        <ChevronRight size={9} /> 히스토리 보기
      </span>
    </button>
  );
}

// ── 공포탐욕 히스토리 모달 ─────────────────────────────────────
function FearGreedModal({
  market,
  onClose,
}: {
  market: "KR" | "US";
  onClose: () => void;
}) {
  const [rangeDays, setRangeDays] = useState(365);
  // /v1/sentiment/fear-greed returns the index value + requested DB history.
  // The chart plots only persisted DB history. When the table is empty, show
  // an explicit empty state instead of a synthetic flat baseline.
  const { data: fg, loading, error, refetch } = useFearGreed(market, rangeDays);
  const data = (fg?.history ?? [])
    .filter(
      (p) =>
        /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(Number(p.value)),
    )
    .map((p) => ({
      date: p.date,
      value: p.value,
      vix: p.vix,
      adr: p.adr,
    }));
  const hasHistory = data.length > 0;
  const rangeLabel = rangeDays >= 1825 ? "5년" : `${rangeDays}일`;
  const title =
    market === "US"
      ? `공포·탐욕 지수 히스토리 (US, ${rangeLabel})`
      : `공포·탐욕 지수 히스토리 (KR, ${rangeLabel})`;
  const sub =
    market === "US"
      ? "낮을수록 공포, 높을수록 탐욕 (CNN Fear & Greed)"
      : "외인 매수세·등락비율 등 한국시장 기반 지수";
  const refLine = 50;
  const color = market === "US" ? "#38bdf8" : "#a78bfa";

  // Stat cards: pull live current / 30d avg / visible-window high from the series.
  const values = data.map((d) => d.value);
  const currentValue = hasHistory
    ? (fg?.value ?? values[values.length - 1])
    : null;
  const avg30 = !hasHistory
    ? null
    : values.length >= 30
      ? values.slice(-30).reduce((s, v) => s + v, 0) /
        Math.min(30, values.length)
      : values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1);
  const rangeHigh = hasHistory ? Math.max(...values) : null;
  const rangeLow = hasHistory ? Math.min(...values) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-lg font-bold font-['Outfit']">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {[
                { label: "90D", days: 90 },
                { label: "180D", days: 180 },
                { label: "1Y", days: 365 },
                { label: "5Y", days: 1825 },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => setRangeDays(option.days)}
                  className={cn(
                    "px-2 py-1 transition-colors",
                    rangeDays === option.days
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="h-56">
          {loading && !fg ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground px-4">
              <Loader2 size={18} className="animate-spin" />
              공포·탐욕 DB 히스토리를 불러오는 중입니다
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground px-4">
              <div>공포·탐욕 API 요청에 실패했습니다</div>
              <button
                type="button"
                onClick={refetch}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted"
              >
                <RefreshCw size={12} />
                다시 불러오기
              </button>
            </div>
          ) : hasHistory ? (
            <KLineSeriesChart
              data={data.map((row) => ({
                date: row.date,
                value: row.value,
                neutral: refLine,
              }))}
              settingsScope={`home-fear-greed-${market}`}
              height={224}
              showToolbar={false}
              valueFormatter={(v) => v.toFixed(0)}
              zeroLine={false}
              showRangeControls={false}
              allowValueTransform={false}
              sourceLabel="DB"
              sourceTone="primary"
              sourceTitle="/sentiment/fear-greed DB 히스토리 기준"
              series={[
                {
                  key: "value",
                  label: market === "US" ? "US 심리" : "KR 심리",
                  color,
                  type: "line",
                },
                {
                  key: "neutral",
                  label: "중립선 50",
                  color: "var(--muted-foreground)",
                  type: "line",
                  dashed: true,
                },
              ]}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground px-4">
              공포·탐욕 DB 히스토리가 아직 없습니다
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">현재 지수</div>
            <div className="text-lg font-bold font-mono" style={{ color }}>
              {currentValue ?? "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {hasHistory ? (fg?.label ?? "—") : "DB 데이터 없음"}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">30일 평균</div>
            <div className="text-lg font-bold font-mono">
              {avg30 == null ? "—" : avg30.toFixed(1)}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">
              구간 최고 / 최저
            </div>
            <div className="text-lg font-bold font-mono">
              <span className="text-up">{rangeHigh ?? "—"}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-down">{rangeLow ?? "—"}</span>
            </div>
          </div>
        </div>
        {hasHistory && (
          <div className="mt-2 text-[10px] text-muted-foreground font-mono text-right">
            {data[0].date} ~ {data[data.length - 1].date} ·{" "}
            {data.length.toLocaleString()} rows
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── 뉴스 상세 모달 ─────────────────────────────────────────────
function NewsModal({
  news,
  onClose,
}: {
  news: (typeof MARKET_NEWS)[0];
  onClose: () => void;
}) {
  const { isNewsBookmarked, toggleNewsBookmark } = useBookmark();
  const bookmarked = isNewsBookmarked(news.id);
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  news.category === "매크로"
                    ? "border-sky-400 text-sky-400"
                    : news.category === "한국"
                      ? "border-violet-400 text-violet-400"
                      : "border-primary text-primary",
                )}
              >
                {news.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {news.source} · {news.time} 전
              </span>
            </div>
            <h3 className="text-base font-bold font-['Outfit'] leading-snug">
              {news.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        {/* 요약 */}
        <div className="bg-muted/30 rounded-xl p-4 mb-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            AI 요약
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {news.title}에 관한 최신 동향입니다. 해당 이슈는 시장 전반에 걸쳐
            영향을 미칠 수 있으며, 특히{" "}
            {(news.tickers ?? []).map(tickerToName).join(", ")} 관련 종목에
            주목할 필요가 있습니다. 전문가들은 단기적으로 변동성이 높아질 수
            있다고 분석하고 있으며, 거시경제 지표와 함께 모니터링이 권장됩니다.
          </p>
        </div>
        {/* 관련 종목 */}
        {news.tickers && news.tickers.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              관련 종목
            </div>
            <div className="flex gap-2 flex-wrap">
              {news.tickers.map((t) => (
                <Link key={t} href={`/analysis?ticker=${t}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                  >
                    {tickerToName(t)}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
        {news.impact && (
          <div className="bg-up/10 border border-up/20 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-up mb-1">
              내 포지션 영향
            </div>
            <div className="text-sm font-mono font-bold text-up">
              {news.impact}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              toggleNewsBookmark(news.id, {
                title: news.title,
                subtitle: `${news.source} · ${news.category}`,
                href: `/news`,
              });
              toast.success(
                bookmarked ? "북마크 해제" : "뉴스를 북마크했습니다",
              );
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors text-sm",
              bookmarked
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "bg-muted hover:bg-muted/80",
            )}
          >
            {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {bookmarked ? "북마크됨" : "북마크"}
          </button>
          <Link href="/news" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm">
              <ExternalLink size={14} /> 뉴스 전체 보기
            </button>
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── 캘린더 이벤트 상세 모달 ────────────────────────────────────
function CalendarModal({
  event,
  onClose,
}: {
  event: (typeof CALENDAR_EVENTS)[0];
  onClose: () => void;
}) {
  const typeColor =
    event.type === "실적"
      ? "text-primary border-primary"
      : event.type === "배당"
        ? "text-yellow-500 border-yellow-500"
        : "text-muted-foreground border-muted-foreground";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex flex-col items-center justify-center">
              <div className="text-[10px] text-muted-foreground">
                {event.day}
              </div>
              <div className="text-lg font-bold font-mono">{event.date}</div>
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit']">
                {event.title}
              </h3>
              <Badge
                variant="outline"
                className={cn("text-[10px] mt-1", typeColor)}
              >
                {event.type}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {event.holding && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">보유 종목</span>
              <Link href={`/analysis?ticker=${event.holding}`}>
                <span className="text-xs font-mono font-bold text-primary hover:underline">
                  {event.holding}
                </span>
              </Link>
            </div>
          )}
          {event.type === "실적" && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="text-xs font-semibold text-primary mb-1">
                실적 발표 예정
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                시장 예상치 대비 실제 EPS·매출 결과에 따라 주가 변동성이 커질 수
                있습니다. 발표 전 포지션 관리에 유의하세요.
              </p>
            </div>
          )}
          {event.type === "배당" && (
            <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <div className="text-xs font-semibold text-yellow-500 mb-1">
                배당 지급 예정
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                배당락일 전 보유 시 배당금을 수령할 수 있습니다. 배당락 당일
                주가 조정에 유의하세요.
              </p>
            </div>
          )}
          {event.memo > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">메모</span>
              <span className="text-xs font-medium">{event.memo}개</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              toast.success("알림이 설정되었습니다");
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
          >
            <Bell size={14} /> 알림 설정
          </button>
          <Link href="/calendar" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm">
              <ExternalLink size={14} /> 캘린더 전체보기
            </button>
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── 지수 상세 모달 ───────────────────────────────────────────
// Maps the dashboard's index labels onto a tracked instrument so
// we can pull real history from the public /v1/stocks/:symbol/bars path.
// For index-like rows, use a tracked ETF only when the persisted price table
// actually has bars. If no DB history exists, the modal shows an explicit
// empty state instead of drawing synthetic history.
const INDEX_PROXY: Record<string, string | null> = {
  "S&P 500": "SPY",
  NASDAQ: "QQQ",
  DOW: "DIA",
  VIX: "VIXY",
  GOLD: "GLD",
  WTI: "USO",
  KOSPI: "069500.KS",
  KOSDAQ: null,
  "USD/KRW": null,
  BTC: null,
};

type IndexBar = { t: string; c: number };
type IndexHistory = {
  bars: IndexBar[] | null;
  source: "live" | "unavailable";
  proxy: string | null;
};

function cleanIndexBars(
  bars: Array<{ date?: string | null; close?: number | null }>,
): IndexBar[] {
  const byDate = new Map<string, IndexBar>();
  for (const bar of bars) {
    const date = String(bar.date ?? "").slice(0, 10);
    const close = Number(bar.close);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(close) ||
      close <= 0
    ) {
      continue;
    }
    byDate.set(date, { t: date, c: close });
  }
  return Array.from(byDate.values()).sort((a, b) => a.t.localeCompare(b.t));
}

function useIndexHistory(idx: MarketIndex): IndexHistory {
  const proxy = INDEX_PROXY[idx.symbol];
  const [bars, setBars] = useState<IndexBar[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (!proxy) {
      setBars(null);
      return;
    }
    stocksService
      .bars(proxy, 1825, { signal: controller.signal })
      .then((d) => {
        if (cancelled) return;
        const cleaned = cleanIndexBars(d.items ?? []);
        setBars(cleaned.length ? cleaned : null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (!cancelled) setBars(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [proxy]);
  if (bars && bars.length >= 5) return { bars, source: "live", proxy };
  return { bars: null, source: "unavailable", proxy };
}

type MarketComparePeriod = "1D" | "1W" | "1M" | "3M" | "1Y" | "2Y" | "5Y";
type MarketCompareSeriesMeta = {
  symbol: string;
  requested_days: number;
  returned_count: number;
  from_date?: string | null;
  to_date?: string | null;
};
type PerfRow = {
  date: string;
  label: string;
  baselineDate: string;
  sp500: number | null;
  kospi: number | null;
};
type MarketCompareMeta = {
  from: string;
  to: string;
  baseline: string;
  rows: number;
  sourceFrom: string | null;
  sourceTo: string | null;
  sourceRows: number;
  spBars: number;
  krBars: number;
  source: "api";
  requestedDays: number;
};
type MarketCompareApiMeta = Pick<
  StockBarsCompareResponse,
  | "compare_from_date"
  | "compare_to_date"
  | "compare_baseline_date"
  | "compare_row_count"
>;

const MARKET_COMPARE_LOOKBACK_DAYS: Record<MarketComparePeriod, number> = {
  "1D": 2,
  "1W": 7,
  "1M": 31,
  "3M": 92,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
};
const DEFAULT_MARKET_COMPARE_PERIOD: MarketComparePeriod = "5Y";
const MARKET_COMPARE_SOURCE_DAYS = MARKET_COMPARE_LOOKBACK_DAYS["5Y"];

function buildMarketComparisonRowsFromApi(
  rows: Array<Record<string, number | string | null>>,
  period: MarketComparePeriod,
): PerfRow[] {
  const lookbackDays = MARKET_COMPARE_LOOKBACK_DAYS[period];
  return rebaseCompareRows<CompareSeriesRow, PerfRow>(
    rows as CompareSeriesRow[],
    ["SPY", "069500.KS"],
    lookbackDays,
    (row, { baselineDate }) => {
      const date = String(row.date ?? "");
      return {
        date,
        label: compareLabelForDate(date, lookbackDays),
        baselineDate,
        sp500: typeof row.SPY === "number" ? row.SPY : null,
        kospi: typeof row["069500.KS"] === "number" ? row["069500.KS"] : null,
      };
    },
  ).rows;
}

function buildMarketComparisonMeta(
  rows: PerfRow[],
  series: MarketCompareSeriesMeta[],
  requestedDays: number,
  apiMeta: MarketCompareApiMeta | null,
): MarketCompareMeta | null {
  if (!rows.length) return null;
  const bySymbol = new Map(series.map((item) => [item.symbol, item]));
  return {
    from: rows[0].date,
    to: rows[rows.length - 1].date,
    baseline: rows[0].baselineDate,
    rows: rows.length,
    sourceFrom: apiMeta?.compare_from_date ?? null,
    sourceTo: apiMeta?.compare_to_date ?? null,
    sourceRows: apiMeta?.compare_row_count ?? rows.length,
    spBars: bySymbol.get("SPY")?.returned_count ?? 0,
    krBars: bySymbol.get("069500.KS")?.returned_count ?? 0,
    source: "api",
    requestedDays,
  };
}

function IndexModal({
  idx,
  onClose,
}: {
  idx: MarketIndex;
  onClose: () => void;
}) {
  const up = idx.change >= 0;
  const color = up ? "var(--up)" : "var(--down)";
  const { bars, source, proxy } = useIndexHistory(idx);
  const historyBars = bars ?? [];
  const hasBars = historyBars.length > 0;

  // Summary stats over the rendered window
  const high = hasBars
    ? historyBars.reduce((m, b) => Math.max(m, b.c), -Infinity)
    : null;
  const low = hasBars
    ? historyBars.reduce((m, b) => Math.min(m, b.c), Infinity)
    : null;
  const first = hasBars ? historyBars[0].c : idx.value;
  const last = hasBars ? historyBars[historyBars.length - 1].c : idx.value;
  const periodReturn = hasBars ? ((last - first) / first) * 100 : null;
  const periodUp = (periodReturn ?? 0) >= 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-muted-foreground">시장 지수</div>
            <h2 className="text-lg font-bold font-['Outfit']">{idx.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current value */}
        <div className="bg-muted/30 rounded-xl p-4 mb-3">
          <div className="text-3xl font-bold font-mono">
            {idx.value.toLocaleString()}
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 mt-1.5 text-sm font-mono",
              up ? "text-up" : "text-down",
            )}
          >
            {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {up ? "+" : ""}
            {idx.change.toFixed(2)} ({up ? "+" : ""}
            {idx.changePct.toFixed(2)}%)
          </div>
        </div>

        {/* DB price history */}
        <div className="bg-muted/20 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              DB 가격 히스토리
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                source === "live"
                  ? "bg-up/10 text-up"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {source === "live"
                ? proxy
                  ? `DB ${proxy}`
                  : "DB 실데이터"
                : "DB 데이터 없음"}
            </span>
          </div>
          <div className="h-56">
            {hasBars ? (
              <KLineSeriesChart
                data={historyBars.map((bar) => ({
                  date: bar.t,
                  close: bar.c,
                }))}
                settingsScope={`home-market-index-${idx.symbol}`}
                height={224}
                showToolbar={false}
                valueFormatter={(v) =>
                  v.toLocaleString(undefined, { maximumFractionDigits: 2 })
                }
                sourceLabel={source === "live" ? "DB" : "NO DB"}
                sourceTone={source === "live" ? "primary" : "warning"}
                sourceTitle={
                  source === "live"
                    ? `${proxy ?? idx.symbol} DB 가격 히스토리 기준`
                    : "DB 가격 히스토리가 아직 없습니다"
                }
                series={[
                  {
                    key: "close",
                    label: "종가",
                    color,
                    type: "line",
                  },
                ]}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground px-4">
                이 지수의 DB 가격 히스토리가 아직 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground">30일 누적</div>
            <div
              className={cn(
                "text-sm font-bold font-mono",
                periodUp ? "text-up" : "text-down",
              )}
            >
              {periodUp ? "+" : ""}
              {periodReturn == null ? "—" : `${periodReturn.toFixed(2)}%`}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground">30일 최고</div>
            <div className="text-sm font-bold font-mono">
              {high == null
                ? "—"
                : high.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-muted-foreground">30일 최저</div>
            <div className="text-sm font-bold font-mono">
              {low == null
                ? "—"
                : low.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/analysis" onClick={onClose} className="flex-1">
            <button className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              상세 분석 →
            </button>
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-border text-sm hover:bg-muted"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── 섹터 로테이션 패널 ─────────────────────────────────────────
function SectorRotationPanel() {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [period, setPeriod] = useState<"1d" | "1w" | "1m">("1m");
  // Map the backend SectorData shape onto the local rotation card's
  // shape (return1d/1w/1m + a derived `flow` label). `flow` doesn't
  // exist on the API yet — we proxy it from the daily rank.
  const { data: liveSectors, loading: sectorsLoading } = useSectors(market);
  const sectors =
    liveSectors && liveSectors.length > 0
      ? liveSectors.map((s, _, all) => ({
          sector: s.sector,
          return1d: s.returnDay,
          return1w: s.returnWeek,
          return1m: s.returnMonth,
          flow:
            s.rankDay <= Math.ceil(all.length / 4)
              ? "유입"
              : s.rankDay > all.length - Math.ceil(all.length / 4)
                ? "유출"
                : "중립",
        }))
      : [];
  const getReturn = (s: (typeof sectors)[number]) =>
    period === "1d" ? s.return1d : period === "1w" ? s.return1w : s.return1m;
  const sorted = [...sectors].sort((a, b) => getReturn(b) - getReturn(a));
  const maxAbsReturn = Math.max(
    1,
    ...sorted.map((sector) => Math.abs(getReturn(sector))),
  );
  const periodLabel =
    period === "1d" ? "당일" : period === "1w" ? "주간" : "월간";
  const marketLabel = market === "US" ? "미국" : "한국";
  const sourceLabel = `${marketLabel} 섹터 API · ${periodLabel} 수익률 내림차순`;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold font-['Outfit']">섹터 로테이션</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            수익률 순위 · 자금흐름 기준
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["US", "KR"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={cn(
                  "text-xs px-2.5 py-1 transition-colors",
                  market === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {m === "US" ? "미국" : "한국"}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg overflow-hidden border border-border ml-1">
            {(["1d", "1w", "1m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-xs px-2 py-1 transition-colors",
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {p === "1d" ? "당일" : p === "1w" ? "주간" : "월간"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        className="space-y-1.5"
        role="list"
        aria-label={`홈 섹터 로테이션. ${sourceLabel}`}
      >
        {sectorsLoading &&
          sorted.length === 0 &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`sec-skel-${i}`}
              className="flex items-center gap-2 animate-pulse"
            >
              <div className="w-4 h-3 bg-muted/30 rounded" />
              <div className="w-16 h-3 bg-muted/30 rounded" />
              <div className="flex-1 h-5 bg-muted/20 rounded-full" />
              <div className="w-8 h-3 bg-muted/30 rounded" />
            </div>
          ))}
        {sorted.map((s, rank) => {
          const ret = getReturn(s);
          const up = ret >= 0;
          const barWidth = (Math.abs(ret) / maxAbsReturn) * 50;
          const flowColor =
            s.flow === "유입"
              ? "text-up"
              : s.flow === "유출"
                ? "text-down"
                : "text-muted-foreground";
          const rowLabel = `${rank + 1}위 ${s.sector}. ${periodLabel} 수익률 ${
            up ? "+" : ""
          }${ret.toFixed(2)}%. 자금흐름 ${s.flow}. ${sourceLabel}`;
          return (
            <div
              key={s.sector}
              className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              role="listitem"
              tabIndex={0}
              title={rowLabel}
              aria-label={rowLabel}
            >
              <span className="text-[10px] text-muted-foreground w-4 text-center font-mono">
                {rank + 1}
              </span>
              <div className="w-16 text-xs text-muted-foreground text-right shrink-0">
                {s.sector}
              </div>
              <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                <div className="absolute left-1/2 top-0 h-full w-px bg-border/80" />
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    up ? "bg-up/60" : "bg-down/60",
                  )}
                  style={{
                    width: `${Math.max(2, barWidth)}%`,
                    marginLeft: up ? "50%" : `${50 - barWidth}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: up ? "var(--up)" : "var(--down)" }}
                  >
                    {up ? "+" : ""}
                    {ret.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className={cn("text-[10px] w-8 text-right", flowColor)}>
                {s.flow}
              </span>
            </div>
          );
        })}
      </div>
      <Link href="/analysis">
        <div className="mt-3 text-center text-xs text-primary hover:underline flex items-center justify-center gap-1">
          상세 분석 <ArrowRight size={12} />
        </div>
      </Link>
    </div>
  );
}

// ── 관심종목 / 상위거래 패널 ───────────────────────────────────
function StockListPanel({
  isLoggedIn,
  marketTab,
  setMarketTab,
}: {
  isLoggedIn: boolean;
  marketTab: "KR" | "US";
  setMarketTab: (m: "KR" | "US") => void;
}) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  // /v1/movers is a price_bars_daily-backed top-movers feed.
  const { data: liveMarketStocks, loading: stocksLoading } =
    useStocks(marketTab);
  const safeLive = liveMarketStocks ?? [];
  // No mock fallback during loading — the panel renders a skeleton row
  // list instead so users don't see stale demo tickers.
  const allStocks = safeLive;
  const topStocks = safeLive.slice(0, 6);

  // 관심종목 있으면 관심종목, 없으면 상위거래
  const hasWatchlist = watchlist.length > 0;
  const displayStocks = hasWatchlist
    ? watchlist.slice(0, 6).map((w) => {
        const found = allStocks.find((s) => s.ticker === w.ticker);
        return (
          found || {
            ticker: w.ticker,
            name: w.name,
            price: w.price,
            changePct: w.changePct,
            sector: w.sector,
            exchange: w.exchange,
          }
        );
      })
    : topStocks;
  const title = hasWatchlist ? "내 관심종목" : "실시간 상위 거래";

  return (
    <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold font-['Outfit']">{title}</h2>
          {hasWatchlist && (
            <Badge
              variant="outline"
              className="text-[10px] border-primary text-primary"
            >
              {watchlist.length}종목
            </Badge>
          )}
        </div>
        {!hasWatchlist && (
          <div className="flex gap-1">
            {(["KR", "US"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarketTab(m)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-md transition-colors",
                  marketTab === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {m === "KR" ? "한국장" : "미국장"}
              </button>
            ))}
          </div>
        )}
      </div>
      {!hasWatchlist && (
        <div className="mb-3 p-2.5 bg-muted/30 rounded-lg border border-dashed border-border flex items-center gap-2 flex-shrink-0">
          <Star size={13} className="text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground">
            종목 상세에서 ★ 눌러 관심종목 등록
          </span>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-0.5">
          {stocksLoading &&
            displayStocks.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`stk-skel-${i}`}
                className="flex items-center gap-2 px-2 py-2 animate-pulse"
              >
                <div className="w-4 h-3 bg-muted/30 rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-2/3 bg-muted/40 rounded" />
                  <div className="h-2.5 w-1/3 bg-muted/30 rounded" />
                </div>
                <div className="text-right space-y-1">
                  <div className="h-3 w-12 bg-muted/40 rounded" />
                  <div className="h-2.5 w-10 bg-muted/30 rounded ml-auto" />
                </div>
              </div>
            ))}
          {displayStocks.map((s, i) => (
            <div
              key={s.ticker}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <span className="text-xs text-muted-foreground w-4 text-center">
                {i + 1}
              </span>
              <Link
                href={`/analysis?ticker=${s.ticker}`}
                className="flex-1 min-w-0"
                onMouseEnter={() =>
                  prefetchRoute(`/analysis?ticker=${s.ticker}`)
                }
                onFocus={() => prefetchRoute(`/analysis?ticker=${s.ticker}`)}
                onTouchStart={() =>
                  prefetchRoute(`/analysis?ticker=${s.ticker}`)
                }
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {s.name}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {s.ticker}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-medium">
                      {s.price.toLocaleString()}
                    </div>
                    <PctBadge value={s.changePct} />
                  </div>
                </div>
              </Link>
              {hasWatchlist && (
                <button
                  onClick={() => {
                    removeFromWatchlist(s.ticker);
                    toast.info(`${s.ticker} 관심종목 해제`);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  title="관심종목 해제"
                >
                  <BookmarkMinus size={12} className="text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Link href={hasWatchlist ? "/mypage" : "/analysis"}>
          <div className="mt-3 text-center text-xs text-primary hover:underline flex items-center justify-center gap-1">
            {hasWatchlist ? "마이페이지에서 관리" : "전체 종목 보기"}{" "}
            <ArrowRight size={12} />
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const { watchlist } = useWatchlist();
  const defaultMarket = useMemo(() => detectOpenMarket(), []);
  const [perfPeriod, setPerfPeriod] = useState<MarketComparePeriod>(
    DEFAULT_MARKET_COMPARE_PERIOD,
  );
  const [marketTab, setMarketTab] = useState<"KR" | "US">(defaultMarket);
  const isLoggedIn = !!user;

  // ── Live data hooks ───────────────────────────────────────────
  const { data: indices, updatedAt: indicesUpdatedAt } = useIndices();
  const { data: newsItems, updatedAt: newsUpdatedAt } = useNews({ limit: 5 });
  const { data: krFG } = useFearGreed("KR");
  const { data: usFG } = useFearGreed("US");
  // Home calendar widget: same scoping rule as the full Calendar page —
  // stock events restricted to the user's watchlist, macro shown
  // regardless. Window = next 14 days for the dashboard summary.
  const watchlistSymbols = useMemo(
    () => (watchlist ?? []).map((w) => w.ticker.toUpperCase()),
    [watchlist],
  );
  const today = useMemo(() => new Date(), []);
  const calFromIso = today.toISOString().slice(0, 10);
  const calToIso = useMemo(() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 14);
    return t.toISOString().slice(0, 10);
  }, [today]);
  // Dashboard calendar shows only **high-importance** events. User asked
  // for "회의" / 발표 같은 잔잔한 매크로 말고 CPI / FOMC / NFP 같은 핵심
  // 발표만. minImportance=3 = importance "상" on the existing scale.
  const { data: calItems } = useUnifiedCalendar({
    from: calFromIso,
    to: calToIso,
    symbols: watchlistSymbols,
    minImportance: 3,
  });

  // Market comparison chart (Row 4L). Pull the benchmark comparison from the
  // shared DB-backed /stocks/bars/compare API so SPY and KODEX 200 use the
  // same common-baseline/carry-forward logic as other comparison charts.
  const [marketCompareRows, setMarketCompareRows] = useState<
    Array<Record<string, number | string | null>>
  >([]);
  const [marketCompareSeries, setMarketCompareSeries] = useState<
    MarketCompareSeriesMeta[]
  >([]);
  const [marketCompareApiMeta, setMarketCompareApiMeta] =
    useState<MarketCompareApiMeta | null>(null);
  const [marketCompareLoading, setMarketCompareLoading] = useState(true);
  const [marketCompareError, setMarketCompareError] = useState<string | null>(
    null,
  );
  const [marketCompareRetry, setMarketCompareRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setMarketCompareLoading(true);
    setMarketCompareError(null);
    stocksService
      .compareBars(["SPY", "069500.KS"], MARKET_COMPARE_SOURCE_DAYS, {
        signal: controller.signal,
      })
      .then((response) => {
        if (cancelled) return;
        setMarketCompareRows(response.rows);
        setMarketCompareSeries(response.series);
        setMarketCompareApiMeta({
          compare_from_date: response.compare_from_date,
          compare_to_date: response.compare_to_date,
          compare_baseline_date: response.compare_baseline_date,
          compare_row_count: response.compare_row_count,
        });
        setMarketCompareError(null);
        setMarketCompareLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (cancelled) return;
        setMarketCompareRows([]);
        setMarketCompareSeries([]);
        setMarketCompareApiMeta(null);
        setMarketCompareError(
          error instanceof Error
            ? error.message
            : "시장 비교 API 요청이 실패했습니다",
        );
        setMarketCompareLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [marketCompareRetry]);
  const chartData = useMemo(
    () => buildMarketComparisonRowsFromApi(marketCompareRows, perfPeriod),
    [marketCompareRows, perfPeriod],
  );
  const marketCompareMeta = useMemo(
    () =>
      buildMarketComparisonMeta(
        chartData,
        marketCompareSeries,
        MARKET_COMPARE_SOURCE_DAYS,
        marketCompareApiMeta,
      ),
    [chartData, marketCompareApiMeta, marketCompareSeries, perfPeriod],
  );

  // 모달 상태
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [fearGreedModal, setFearGreedModal] = useState<"KR" | "US" | null>(
    null,
  );
  // Modal accepts both legacy mock rows and live MarketIndex shape.
  const [selectedIndex, setSelectedIndex] = useState<any | null>(null);

  const topIndices = (indices ?? []).slice(0, 6);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ── 모달들 ── */}
      {selectedNews && (
        <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
      {selectedEvent && (
        <CalendarModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      {fearGreedModal && (
        <FearGreedModal
          market={fearGreedModal}
          onClose={() => setFearGreedModal(null)}
        />
      )}
      {selectedIndex && (
        <IndexModal
          idx={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit']">대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-up/10 border border-up/20">
            <div className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
            <span className="text-xs text-up font-medium">
              {defaultMarket === "KR" ? "한국장 정규장" : "미국장 정규장"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 1: 시장 지수 티커 ── */}
      <div className="flex items-center justify-between -mb-2">
        <div /> {/* spacer so the timestamp aligns right */}
        {indicesUpdatedAt && (
          <span className="text-[10px] text-muted-foreground">
            업데이트 {fmtUpdatedAt(indicesUpdatedAt)} · 일봉 EOD
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {topIndices.length === 0
          ? // Skeleton — same outer dimensions as the card so the grid
            // reserves the right space while the fetch is in flight.
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`idx-skel-${i}`}
                className="bg-card border border-border rounded-xl p-3.5 animate-pulse"
              >
                <div className="h-3 w-12 bg-muted/40 rounded mb-2" />
                <div className="h-5 w-20 bg-muted/40 rounded mb-2" />
                <div className="h-3 w-16 bg-muted/30 rounded" />
              </div>
            ))
          : topIndices.map((idx) => {
              const up = idx.change >= 0;
              return (
                <div
                  key={idx.name}
                  onClick={() => setSelectedIndex(idx)}
                  className="bg-card border border-border rounded-xl p-3.5 hover:border-primary/40 transition-colors cursor-pointer group"
                >
                  <div className="text-xs text-muted-foreground mb-1 truncate">
                    {idx.name}
                  </div>
                  <div className="text-base font-bold font-mono">
                    {idx.value.toLocaleString()}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-1 text-xs font-mono",
                      up ? "text-up" : "text-down",
                    )}
                  >
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {up ? "+" : ""}
                    {idx.change.toFixed(2)} ({up ? "+" : ""}
                    {idx.changePct.toFixed(2)}%)
                  </div>
                </div>
              );
            })}
      </div>

      {/* ── Row 2: 공포탐욕지수 (left 2/5) + 시장 핵심뉴스 (right 3/5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch">
        {/* Left: Fear & Greed */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader
            title="공포·탐욕 지수"
            sub="클릭하면 VIX/ADR 히스토리 확인"
            updatedAt={usFG?.updatedAt ?? krFG?.updatedAt}
          />
          <div className="flex-1 flex items-center justify-around gap-4">
            <FearGreedGauge
              value={krFG?.value ?? 50}
              label={krFG?.label ?? "—"}
              market="한국"
              onClick={() => setFearGreedModal("KR")}
            />
            <div className="w-px self-stretch bg-border" />
            <FearGreedGauge
              value={usFG?.value ?? 50}
              label={
                usFG?.vix != null
                  ? `VIX ${usFG.vix.toFixed(1)} · ${usFG.label}`
                  : (usFG?.label ?? "—")
              }
              market="미국"
              onClick={() => setFearGreedModal("US")}
            />
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap flex-shrink-0">
            {[
              { label: "극도 공포", color: "#ef4444" },
              { label: "공포", color: "#f97316" },
              { label: "중립", color: "#eab308" },
              { label: "탐욕", color: "#84cc16" },
              { label: "극도 탐욕", color: "#22c55e" },
            ].map((z) => (
              <div key={z.label} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: z.color }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {z.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: News */}
        <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader
            title="시장 핵심 뉴스"
            sub="클릭하면 요약 확인"
            href="/news"
            updatedAt={newsUpdatedAt}
          />
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-0">
              {newsItems === null &&
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={`news-skel-${i}`}
                    className="flex items-start gap-3 py-2.5 px-2 border-b border-border/40 last:border-0 animate-pulse"
                  >
                    <div className="h-4 w-10 bg-muted/40 rounded shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-3/4 bg-muted/40 rounded" />
                      <div className="h-3 w-1/2 bg-muted/30 rounded" />
                    </div>
                  </div>
                ))}
              {(newsItems ?? []).slice(0, 5).map((news) => (
                <div
                  key={news.id}
                  className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group border-b border-border/40 last:border-0"
                  onClick={() => setSelectedNews(news)}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 shrink-0 mt-0.5",
                      news.category === "매크로"
                        ? "border-sky-400 text-sky-400"
                        : news.category === "한국"
                          ? "border-violet-400 text-violet-400"
                          : "border-primary text-primary",
                    )}
                  >
                    {news.category}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                      {news.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {news.source} · {news.time} 전
                      </span>
                      {news.tickers?.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {news.impact && (
                    <span className="text-xs text-up font-mono flex-shrink-0">
                      {news.impact}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: 내 캘린더 (left 3/5) + 섹터 로테이션 (right 2/5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch">
        {/* Left: Calendar */}
        <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader
            title="내 캘린더"
            sub="앞으로 14일 · 실적·배당·매크로"
            href="/calendar"
            updatedAt={null}
          />
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-1">
            {calItems === null &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`cal-skel-${i}`}
                  className="flex flex-col gap-1 p-2 rounded-lg bg-muted/15 border border-border/40 animate-pulse"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="h-3 w-12 bg-muted/40 rounded" />
                    <div className="h-3 w-8 bg-muted/30 rounded" />
                  </div>
                  <div className="h-4 w-full bg-muted/40 rounded" />
                  <div className="h-4 w-3/4 bg-muted/30 rounded" />
                </div>
              ))}
            {calItems !== null &&
              ((calItems ?? []).length > 0
                ? (calItems ?? []).slice(0, 9)
                : []
              ).map((raw: any, i: number) => {
                // Live unified item OR legacy mock row — coerce to a common
                // shape so the existing list cell template doesn't change.
                const isLive = (raw as { kind?: string }).kind !== undefined;
                const dt = isLive ? new Date(raw.scheduled_at) : null;
                const ev = isLive
                  ? {
                      day: ["일", "월", "화", "수", "목", "금", "토"][
                        dt!.getDay()
                      ],
                      date: dt!.getDate(),
                      title: raw.title,
                      type:
                        raw.kind === "macro"
                          ? "매크로"
                          : raw.kind === "earnings"
                            ? "실적"
                            : "배당",
                      holding: null as string | null,
                      _live: raw,
                    }
                  : raw;
                return (
                  <div
                    key={raw.id ?? i}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-muted/15 hover:bg-muted/40 transition-colors cursor-pointer border border-border/40"
                    onClick={() =>
                      setSelectedEvent(
                        isLive
                          ? {
                              date: ev.date,
                              day: ev.day,
                              title: ev.title,
                              type: ev.type,
                              holding: null,
                              memo: 0,
                              tickers: raw.symbol ? [raw.symbol] : [],
                            }
                          : raw,
                      )
                    }
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-foreground">
                        {ev.day} · {ev.date}일
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          ev.type === "실적"
                            ? "border-primary text-primary"
                            : ev.type === "배당"
                              ? "border-yellow-500 text-yellow-500"
                              : "border-muted-foreground text-muted-foreground",
                        )}
                      >
                        {ev.type}
                      </Badge>
                    </div>
                    <div className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                      {ev.title}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right: Sector Rotation */}
        <div className="xl:col-span-2 flex flex-col">
          <SectorRotationPanel />
        </div>
      </div>

      {/* ── Row 4: 포트폴리오 (left 3/5) + 관심종목 (right 2/5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch">
        {/* Portfolio */}
        <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div>
              <h2 className="text-base font-bold font-['Outfit']">
                시장 누적 수익률
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {marketCompareMeta
                  ? `${marketCompareMeta.from}~${marketCompareMeta.to} · 기준 ${marketCompareMeta.baseline} 대비 % 변동`
                  : "S&P 500 (SPY) vs KODEX 200 (069500) — 공통 기준일 대비 % 변동"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {(["1D", "1W", "1M", "3M", "1Y", "2Y", "5Y"] as const).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPerfPeriod(p)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-md transition-colors",
                      perfPeriod === p
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => setMarketCompareRetry((value) => value + 1)}
                disabled={marketCompareLoading}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  marketCompareLoading
                    ? "text-muted-foreground/45 cursor-wait"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title="시장 비교 데이터 다시 불러오기"
                aria-label="시장 비교 데이터 다시 불러오기"
              >
                <RefreshCw
                  size={13}
                  className={cn(marketCompareLoading && "animate-spin")}
                />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-[160px]">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                <span>
                  {marketCompareLoading
                    ? "시장 가격 데이터를 불러오는 중입니다"
                    : marketCompareError
                      ? "시장 비교 API 요청이 실패했습니다"
                      : "시장 비교 DB 일봉 데이터가 없습니다"}
                </span>
                {marketCompareError && (
                  <span className="max-w-full truncate font-mono text-[10px] text-destructive">
                    {marketCompareError}
                  </span>
                )}
                {!marketCompareLoading && (
                  <button
                    onClick={() => setMarketCompareRetry((value) => value + 1)}
                    className="mt-1 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    <RefreshCw size={12} />
                    다시 불러오기
                  </button>
                )}
              </div>
            ) : (
              <KLineSeriesChart
                data={chartData}
                settingsScope="home-market-compare"
                height={210}
                showToolbar={false}
                valueFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`}
                zeroLine
                showRangeControls={false}
                allowValueTransform={false}
                fixedScaleLabel="%"
                fixedScaleDetail="공통 기준=0%"
                fixedScaleTitle="DB 일봉을 공통 기준일에 0%로 맞춘 누적 수익률"
                sourceLabel="API"
                sourceTone="primary"
                sourceTitle="/stocks/bars/compare API 5Y 원본 기준"
                series={[
                  {
                    key: "sp500",
                    label: "S&P 500",
                    color: "var(--gold)",
                    type: "line",
                  },
                  {
                    key: "kospi",
                    label: "KODEX 200",
                    color: "var(--violet)",
                    type: "line",
                  },
                ]}
              />
            )}
          </div>
          <div className="flex gap-4 mt-2 flex-shrink-0">
            {(() => {
              const last = chartData[chartData.length - 1];
              const sp = (last as any)?.sp500 as number | null | undefined;
              const kr = (last as any)?.kospi as number | null | undefined;
              const fmt = (v: number | null | undefined) =>
                v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
              return [
                {
                  label: "S&P 500",
                  color: "var(--gold)",
                  value: fmt(sp),
                  n: sp ?? 0,
                },
                {
                  label: "KODEX 200",
                  color: "var(--violet)",
                  value: fmt(kr),
                  n: kr ?? 0,
                },
              ];
            })().map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-0.5 rounded"
                  style={{ background: l.color }}
                />
                <span className="text-xs text-muted-foreground">{l.label}</span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold",
                    l.n >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {l.value}
                </span>
              </div>
            ))}
          </div>
          {marketCompareMeta && (
            <div
              className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground font-mono"
              title="DB 일봉을 공통 기준일에 0%로 맞추고, 휴장일 차이는 이전 값을 이어붙여 비교합니다"
            >
              <span>
                API 5Y 원본 {marketCompareMeta.requestedDays.toLocaleString()}일
                {marketCompareMeta.sourceFrom && marketCompareMeta.sourceTo
                  ? ` · ${marketCompareMeta.sourceFrom} ~ ${marketCompareMeta.sourceTo}`
                  : ""}
              </span>
              <span>
                표시 {perfPeriod} · 기준 {marketCompareMeta.baseline} ·{" "}
                {marketCompareMeta.from} ~ {marketCompareMeta.to}
              </span>
              <span>
                SPY {marketCompareMeta.spBars.toLocaleString()} · 069500.KS{" "}
                {marketCompareMeta.krBars.toLocaleString()} · 원본{" "}
                {marketCompareMeta.sourceRows.toLocaleString()} · 표시{" "}
                {marketCompareMeta.rows.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Watchlist */}
        <StockListPanel
          isLoggedIn={isLoggedIn}
          marketTab={marketTab}
          setMarketTab={setMarketTab}
        />
      </div>
    </div>
  );
}
