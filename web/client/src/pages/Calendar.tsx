/**
 * Calendar.tsx — 내 캘린더 전체보기
 * - 월간 캘린더 뷰
 * - 이벤트 타입 필터 (전체/실적/배당/매크로/개인)
 * - 이벤트 클릭 시 상세 모달
 * - 이벤트 추가 (메모)
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useEconomicEvents } from "@/features/events";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, Plus, X, Star, Bell,
  TrendingUp, Calendar as CalIcon, Bookmark
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// ── Extended calendar events ──────────────────────────────────
const EVENTS_DATA = [
  { id: 1, date: 6, day: "화", month: 5, year: 2026, title: "미 무역수지", type: "매크로", holding: null, memo: 0, tickers: ["SPY", "DXY"], importance: "중", detail: "4월 미국 무역수지 발표. 예상: -$68.5B" },
  { id: 2, date: 7, day: "수", month: 5, year: 2026, title: "NVDA 실적 (장마감 후)", type: "실적", holding: "12.4%", memo: 9, tickers: ["NVDA"], importance: "상", detail: "NVIDIA Q1 FY2026 실적 발표. EPS 예상: $5.58, 매출 예상: $24.6B" },
  { id: 3, date: 8, day: "목", month: 5, year: 2026, title: "AAPL 분기 배당락", type: "배당", holding: "9.1%", memo: 4, tickers: ["AAPL"], importance: "중", detail: "Apple 분기 배당 $0.25/주. 배당락일." },
  { id: 4, date: 8, day: "목", month: 5, year: 2026, title: "FOMC 회의록", type: "매크로", holding: null, memo: 0, tickers: ["SPY", "TLT"], importance: "상", detail: "5월 FOMC 회의록 공개. 금리 인하 시그널 주목." },
  { id: 5, date: 13, day: "화", month: 5, year: 2026, title: "AAPL WWDC", type: "이벤트", holding: "9.1%", memo: 4, tickers: ["AAPL"], importance: "상", detail: "Apple WWDC 2026. iOS 20, AI 기능 대거 공개 예정." },
  { id: 6, date: 15, day: "목", month: 5, year: 2026, title: "미 CPI (4월)", type: "매크로", holding: null, memo: 0, tickers: ["SPY", "TLT", "QQQ"], importance: "상", detail: "4월 미국 소비자물가지수 발표. 예상: 3.1% (YoY)" },
  { id: 7, date: 16, day: "금", month: 5, year: 2026, title: "미 소매판매", type: "매크로", holding: null, memo: 0, tickers: ["XRT", "SPY"], importance: "중", detail: "4월 미국 소매판매 발표. 소비 동향 확인." },
  { id: 8, date: 20, day: "화", month: 5, year: 2026, title: "삼성전자 배당락", type: "배당", holding: "18.2%", memo: 6, tickers: ["005930"], importance: "중", detail: "삼성전자 1분기 배당 ₩361/주 배당락일." },
  { id: 9, date: 22, day: "목", month: 5, year: 2026, title: "005930 잠정실적", type: "실적", holding: "18.2%", memo: 6, tickers: ["005930"], importance: "상", detail: "삼성전자 2분기 잠정실적 발표. HBM 수율 개선 여부 주목." },
  { id: 10, date: 22, day: "목", month: 5, year: 2026, title: "SK하이닉스 실적", type: "실적", holding: "7.6%", memo: 3, tickers: ["000660"], importance: "상", detail: "SK하이닉스 Q2 실적 발표. HBM3E 공급 현황 확인." },
  { id: 11, date: 28, day: "수", month: 5, year: 2026, title: "미 GDP 수정치", type: "매크로", holding: null, memo: 0, tickers: ["SPY", "DXY"], importance: "중", detail: "1분기 미국 GDP 수정치 발표. 예상: +2.8% (연율)" },
  { id: 12, date: 30, day: "금", month: 5, year: 2026, title: "미 PCE (4월)", type: "매크로", holding: null, memo: 0, tickers: ["SPY", "TLT"], importance: "상", detail: "연준 선호 물가지표 PCE 발표. 금리 인하 경로 영향." },
  // 다음달
  { id: 13, date: 4, day: "목", month: 6, year: 2026, title: "OPEC+ 회의", type: "이벤트", holding: null, memo: 0, tickers: ["XOM", "CVX"], importance: "중", detail: "OPEC+ 정례 회의. 감산 연장 여부 결정." },
  { id: 14, date: 11, day: "목", month: 6, year: 2026, title: "미 CPI (5월)", type: "매크로", holding: null, memo: 0, tickers: ["SPY", "TLT"], importance: "상", detail: "5월 미국 소비자물가지수 발표." },
];

const TYPE_COLORS: Record<string, string> = {
  "실적": "border-primary text-primary bg-primary/10",
  "배당": "border-gold text-gold bg-gold/10",
  "매크로": "border-sky text-sky bg-sky/10",
  "이벤트": "border-violet text-violet-accent bg-violet/10",
  "개인": "border-muted-foreground text-muted-foreground bg-muted/30",
};

const IMPORTANCE_DOT: Record<string, string> = {
  "상": "bg-down",
  "중": "bg-gold",
  "하": "bg-up",
};

const FILTER_TYPES = ["전체", "실적", "배당", "매크로", "이벤트"];

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-based
  const [filterType, setFilterType] = useState("전체");
  const [selectedEvent, setSelectedEvent] = useState<typeof EVENTS_DATA[0] | null>(null);
  const [listView, setListView] = useState(false);

  const { data: liveEventsRaw } = useEconomicEvents();
  const events = useMemo<typeof EVENTS_DATA>(() => {
    if (!liveEventsRaw || liveEventsRaw.length === 0) return EVENTS_DATA;
    const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
    const importance: Record<string, "상" | "중" | "하"> = {
      high: "상",
      medium: "중",
      low: "하",
    };
    return liveEventsRaw.map((e, i) => {
      const d = new Date(e.time);
      return {
        id: i + 1,
        date: d.getUTCDate(),
        day: dayLabels[d.getUTCDay()],
        month: d.getUTCMonth() + 1,
        year: d.getUTCFullYear(),
        title: e.event,
        type: "매크로",
        holding: null as string | null,
        memo: 0,
        tickers: [] as string[],
        importance: importance[e.impact] ?? "중",
        detail: `[${e.country}] 실제: ${e.actual ?? "—"}${e.unit ?? ""} · 예상: ${e.estimate ?? "—"}${e.unit ?? ""} · 이전: ${e.prev ?? "—"}${e.unit ?? ""}`,
      };
    });
  }, [liveEventsRaw]);

  // Events for current month
  const monthEvents = events.filter(e =>
    e.year === viewYear && e.month === viewMonth &&
    (filterType === "전체" || e.type === filterType)
  );

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();

  const cells: { date: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ date: prevMonthDays - firstDay + 1 + i, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: d, isCurrentMonth: false });
  }

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit'] text-foreground">내 캘린더</h1>
          <p className="text-sm text-muted-foreground mt-0.5">실적·배당·매크로 이벤트 통합 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("text-xs gap-1.5", !listView && "bg-primary text-primary-foreground border-primary")}
            onClick={() => setListView(false)}
          >
            <CalIcon size={13} /> 월간
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("text-xs gap-1.5", listView && "bg-primary text-primary-foreground border-primary")}
            onClick={() => setListView(true)}
          >
            리스트
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => toast.info("이벤트 추가 기능은 로그인 후 사용 가능합니다")}
          >
            <Plus size={13} /> 이벤트 추가
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border transition-all",
              filterType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >{t}</button>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-bold font-['Outfit']">
          {viewYear}년 {viewMonth}월
        </h2>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {!listView ? (
        /* ── Calendar Grid View ── */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_OF_WEEK.map((d, i) => (
              <div key={d} className={cn(
                "py-2 text-center text-xs font-semibold",
                i === 0 ? "text-down" : i === 6 ? "text-primary" : "text-muted-foreground"
              )}>{d}</div>
            ))}
          </div>
          {/* Date cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const cellEvents = cell.isCurrentMonth
                ? events.filter(e => e.year === viewYear && e.month === viewMonth && e.date === cell.date && (filterType === "전체" || e.type === filterType))
                : [];
              const isToday = cell.isCurrentMonth && cell.date === today.getDate() && viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;
              const colIdx = idx % 7;
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[80px] p-1.5 border-b border-r border-border/50 last:border-r-0 transition-colors",
                    !cell.isCurrentMonth && "bg-muted/20",
                    cell.isCurrentMonth && cellEvents.length > 0 && "hover:bg-muted/30 cursor-pointer",
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1",
                    isToday ? "bg-primary text-primary-foreground font-bold" :
                    !cell.isCurrentMonth ? "text-muted-foreground/40" :
                    colIdx === 0 ? "text-down" : colIdx === 6 ? "text-primary" : "text-foreground"
                  )}>
                    {cell.date}
                  </div>
                  <div className="space-y-0.5">
                    {cellEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={cn(
                          "text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity leading-tight",
                          ev.type === "실적" ? "bg-primary/15 text-primary" :
                          ev.type === "배당" ? "bg-gold/15 text-gold" :
                          ev.type === "매크로" ? "bg-sky/15 text-sky" :
                          "bg-violet/15 text-violet-accent"
                        )}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {cellEvents.length > 2 && (
                      <div className="text-[9px] text-muted-foreground pl-1">+{cellEvents.length - 2}개</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-2">
          {monthEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalIcon size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">이번 달 이벤트가 없습니다</p>
            </div>
          ) : (
            monthEvents.map(ev => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all cursor-pointer group flex items-start gap-4"
              >
                {/* Date */}
                <div className="text-center min-w-[48px] flex-shrink-0">
                  <div className="text-xs text-muted-foreground">{ev.day}요일</div>
                  <div className="text-2xl font-bold font-mono text-foreground">{ev.date}</div>
                  <div className="text-xs text-muted-foreground">{viewMonth}월</div>
                </div>
                <div className="w-px self-stretch bg-border" />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", TYPE_COLORS[ev.type] || "")}>
                      {ev.type}
                    </Badge>
                    <div className={cn("w-1.5 h-1.5 rounded-full", IMPORTANCE_DOT[ev.importance])} />
                    <span className="text-[10px] text-muted-foreground">중요도 {ev.importance}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{ev.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.detail}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {ev.tickers.map(t => (
                      <Link key={t} href={`/analysis?ticker=${t}`} onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground hover:text-primary transition-colors font-mono">{t}</span>
                      </Link>
                    ))}
                    {ev.holding && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <TrendingUp size={9} className="text-up" /> 보유 {ev.holding}
                      </span>
                    )}
                    {ev.memo > 0 && (
                      <span className="text-[10px] text-muted-foreground">메모 {ev.memo}개</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); toast.success("알림이 설정되었습니다"); }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                  >
                    <Bell size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); toast.success("북마크되었습니다"); }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                  >
                    <Bookmark size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(TYPE_COLORS).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", cls)}>{type}</Badge>
          </div>
        ))}
        <div className="flex items-center gap-3 ml-auto">
          {Object.entries(IMPORTANCE_DOT).map(([imp, cls]) => (
            <div key={imp} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", cls)} />
              <span className="text-[10px] text-muted-foreground">중요도 {imp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", TYPE_COLORS[selectedEvent.type] || "")}>
                    {selectedEvent.type}
                  </Badge>
                  <div className={cn("w-2 h-2 rounded-full", IMPORTANCE_DOT[selectedEvent.importance])} />
                  <span className="text-xs text-muted-foreground">중요도 {selectedEvent.importance}</span>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="text-center min-w-[48px]">
                  <div className="text-xs text-muted-foreground">{selectedEvent.day}요일</div>
                  <div className="text-3xl font-bold font-mono text-foreground">{selectedEvent.date}</div>
                  <div className="text-xs text-muted-foreground">{selectedEvent.month}월</div>
                </div>
                <div className="w-px self-stretch bg-border" />
                <h2 className="text-base font-bold text-foreground font-['Outfit']">{selectedEvent.title}</h2>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{selectedEvent.detail}</p>

              {selectedEvent.holding && (
                <div className="flex items-center gap-2 p-3 bg-up/10 border border-up/20 rounded-lg mb-4">
                  <TrendingUp size={14} className="text-up" />
                  <span className="text-xs font-medium">내 포트폴리오 보유</span>
                  <span className="text-sm font-bold text-up ml-auto">{selectedEvent.holding}</span>
                </div>
              )}

              <div className="flex gap-2 flex-wrap mb-4">
                {selectedEvent.tickers.map(t => (
                  <Link key={t} href={`/analysis?ticker=${t}`} onClick={() => setSelectedEvent(null)}>
                    <span className="text-xs px-2.5 py-1.5 bg-muted rounded-lg text-foreground hover:text-primary transition-colors font-mono font-bold">
                      {t} →
                    </span>
                  </Link>
                ))}
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                  onClick={() => { toast.success("알림이 설정되었습니다"); setSelectedEvent(null); }}>
                  <Bell size={13} /> 알림 설정
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                  onClick={() => { toast.success("북마크되었습니다"); setSelectedEvent(null); }}>
                  <Star size={13} /> 북마크
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
