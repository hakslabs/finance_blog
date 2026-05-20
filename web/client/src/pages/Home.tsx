/**
 * Home.tsx — Dashboard Page (v4)
 * - WatchlistContext 실제 연동 (localStorage 기반)
 * - 뉴스 클릭 → 요약 모달
 * - 캘린더 클릭 → 상세 모달
 * - 공포탐욕지수 클릭 → VIX/ADR 히스토리 차트 팝업
 * - 섹터 로테이션 → 미국/한국 탭 분리
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  MARKET_INDICES, MARKET_NEWS, CALENDAR_EVENTS,
  PORTFOLIO_HOLDINGS, PORTFOLIO_ALLOCATION,
  SECTOR_ROTATION, generatePortfolioChart,
  KR_STOCKS, US_STOCKS
} from "@/lib/data";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine
} from "recharts";
import {
  TrendingUp, TrendingDown, ArrowRight, Star,
  BookmarkCheck, LogIn, X, Clock, ExternalLink,
  Bell, ChevronRight, Bookmark, BookmarkMinus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchlist } from "@/contexts/WatchlistContext";

// ── 시장 감지 ─────────────────────────────────────────────────
function detectOpenMarket(): "KR" | "US" {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const totalMin = utcHour * 60 + utcMin;
  const dayOfWeek = now.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return "KR";
  const krOpen = 0, krClose = 6 * 60 + 30;
  if (totalMin >= krOpen && totalMin < krClose) return "KR";
  const nyOpen = 14 * 60 + 30, nyClose = 21 * 60;
  if (totalMin >= nyOpen && totalMin < nyClose) return "US";
  return "KR";
}

// ── VIX / ADR 히스토리 목업 데이터 ────────────────────────────
const VIX_HISTORY = Array.from({ length: 60 }, (_, i) => {
  const base = 16 + Math.sin(i * 0.2) * 4 + Math.random() * 3;
  return { day: `${i + 1}일`, value: parseFloat(base.toFixed(2)) };
});
const ADR_HISTORY = Array.from({ length: 60 }, (_, i) => {
  const base = 55 + Math.sin(i * 0.15) * 20 + Math.random() * 8;
  return { day: `${i + 1}일`, value: parseFloat(base.toFixed(1)) };
});

// ── 섹터 로테이션 데이터 (미국/한국 분리) ─────────────────────
const US_SECTORS = [
  { sector: "IT", return1d: 1.2, return1w: 3.4, return1m: 8.2, flow: "유입" },
  { sector: "헬스케어", return1d: 0.8, return1w: 1.9, return1m: 5.1, flow: "유입" },
  { sector: "에너지", return1d: -0.5, return1w: -1.2, return1m: -3.8, flow: "유출" },
  { sector: "금융", return1d: 0.3, return1w: 0.9, return1m: 2.4, flow: "중립" },
  { sector: "소비재", return1d: -0.2, return1w: 0.4, return1m: 1.1, flow: "중립" },
  { sector: "유틸리티", return1d: 0.1, return1w: -0.3, return1m: -1.2, flow: "유출" },
  { sector: "산업재", return1d: 0.6, return1w: 1.5, return1m: 3.7, flow: "유입" },
  { sector: "통신", return1d: -0.1, return1w: 0.2, return1m: 0.8, flow: "중립" },
];
const KR_SECTORS = [
  { sector: "반도체", return1d: 2.1, return1w: 4.8, return1m: 11.3, flow: "유입" },
  { sector: "2차전지", return1d: -1.3, return1w: -2.4, return1m: -8.7, flow: "유출" },
  { sector: "바이오", return1d: 0.9, return1w: 2.1, return1m: 6.4, flow: "유입" },
  { sector: "자동차", return1d: 0.4, return1w: 1.2, return1m: 3.1, flow: "중립" },
  { sector: "금융", return1d: 0.2, return1w: 0.6, return1m: 1.8, flow: "중립" },
  { sector: "화학", return1d: -0.6, return1w: -1.8, return1m: -4.2, flow: "유출" },
  { sector: "철강", return1d: 0.3, return1w: 0.7, return1m: 2.0, flow: "중립" },
  { sector: "엔터", return1d: 1.4, return1w: 3.2, return1m: 7.9, flow: "유입" },
];

// ── 공통 컴포넌트 ─────────────────────────────────────────────
function PctBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-mono font-medium", up ? "text-up" : "text-down")}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}
function SectionHeader({ title, sub, href }: { title: string; sub?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-base font-bold text-foreground font-['Outfit']">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {href && (
        <Link href={href}>
          <span className="text-xs text-primary flex items-center gap-1 hover:underline">전체 보기 <ArrowRight size={12} /></span>
        </Link>
      )}
    </div>
  );
}

// ── Fear & Greed Gauge ────────────────────────────────────────
function FearGreedGauge({ value, label, market, onClick }: {
  value: number; label: string; market: string; onClick: () => void;
}) {
  const zones = [
    { from: 0, to: 25, color: "#ef4444", label: "극도 공포" },
    { from: 25, to: 45, color: "#f97316", label: "공포" },
    { from: 45, to: 55, color: "#eab308", label: "중립" },
    { from: 55, to: 75, color: "#84cc16", label: "탐욕" },
    { from: 75, to: 100, color: "#22c55e", label: "극도 탐욕" },
  ];
    const currentZone = zones.find(z => value >= z.from && value < z.to) || zones[2];
  // Semi-circle: center at (90, 90), radius 65, arc spans -180deg to 0deg (left to right)
  const r = 65;
  const cx = 90, cy = 90;
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
  return (
    <div
      className="flex flex-col items-center cursor-pointer group hover:opacity-90 transition-opacity"
      onClick={onClick}
      title={`${market} 히스토리 차트 보기`}
    >
      <div className="text-xs font-bold text-muted-foreground mb-1">{market}</div>
      {/* viewBox: 0 0 180 105 — semi-circle fits with padding */}
      <svg width="160" height="95" viewBox="0 0 180 105">
        {/* Background arc */}
        <path d={arcPath(0, 100)} fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
        {/* Colored zones */}
        {zones.map(z => (
          <path key={z.label} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth="14" strokeLinecap="butt" opacity="0.85" />
        ))}
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleX} y2={needleY}
          stroke="var(--foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill="var(--foreground)" />
        {/* Value */}
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fontWeight="bold" fill={currentZone.color} fontFamily="'Space Mono', monospace">{value}</text>
        {/* Zone label */}
        <text x={cx} y={cy + 26} textAnchor="middle" fontSize="8" fill={currentZone.color} opacity="0.9">{currentZone.label}</text>
      </svg>
      <p className="text-[10px] text-muted-foreground text-center max-w-[140px] leading-tight mt-1">{label}</p>
      <span className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex items-center gap-0.5">
        <ChevronRight size={9} /> 히스토리 보기
      </span>
    </div>
  );
}

// ── 공포탐욕 히스토리 모달 ─────────────────────────────────────
function FearGreedModal({ market, onClose }: { market: "KR" | "US"; onClose: () => void }) {
  const data = market === "US" ? VIX_HISTORY : ADR_HISTORY;
  const title = market === "US" ? "VIX 지수 히스토리 (60일)" : "ADR 히스토리 (60일)";
  const sub = market === "US"
    ? "VIX < 15: 안도 | 15~25: 경계 | > 25: 공포"
    : "ADR > 70: 과매수 | 30~70: 중립 | < 30: 과매도";
  const refLine = market === "US" ? 20 : 50;
  const color = market === "US" ? "#38bdf8" : "#a78bfa";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold font-['Outfit']">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="fearGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={9} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              <ReferenceLine y={refLine} stroke="var(--muted-foreground)" strokeDasharray="4 2" strokeWidth={1} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#fearGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {market === "US" ? (
            <>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">현재 VIX</div>
                <div className="text-lg font-bold font-mono text-sky-400">14.2</div>
                <div className="text-[10px] text-up">안도 구간</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">30일 평균</div>
                <div className="text-lg font-bold font-mono">17.8</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">60일 최고</div>
                <div className="text-lg font-bold font-mono text-down">24.6</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">현재 ADR</div>
                <div className="text-lg font-bold font-mono text-violet-400">56.3</div>
                <div className="text-[10px] text-muted-foreground">중립 구간</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">30일 평균</div>
                <div className="text-lg font-bold font-mono">52.1</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">외인 순매수</div>
                <div className="text-lg font-bold font-mono text-up">+5일</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 뉴스 상세 모달 ─────────────────────────────────────────────
function NewsModal({ news, onClose }: { news: typeof MARKET_NEWS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn(
                "text-[10px]",
                news.category === "매크로" ? "border-sky-400 text-sky-400" :
                news.category === "한국" ? "border-violet-400 text-violet-400" :
                "border-primary text-primary"
              )}>{news.category}</Badge>
              <span className="text-xs text-muted-foreground">{news.source} · {news.time} 전</span>
            </div>
            <h3 className="text-base font-bold font-['Outfit'] leading-snug">{news.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        {/* 요약 */}
        <div className="bg-muted/30 rounded-xl p-4 mb-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">AI 요약</div>
          <p className="text-sm text-foreground leading-relaxed">
            {news.title}에 관한 최신 동향입니다. 해당 이슈는 시장 전반에 걸쳐 영향을 미칠 수 있으며,
            특히 {news.tickers?.join(", ")} 관련 종목에 주목할 필요가 있습니다.
            전문가들은 단기적으로 변동성이 높아질 수 있다고 분석하고 있으며, 거시경제 지표와 함께 모니터링이 권장됩니다.
          </p>
        </div>
        {/* 관련 종목 */}
        {news.tickers && news.tickers.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2">관련 종목</div>
            <div className="flex gap-2 flex-wrap">
              {news.tickers.map(t => (
                <Link key={t} href={`/analysis?ticker=${t}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs">
                    {t}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
        {news.impact && (
          <div className="bg-up/10 border border-up/20 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-up mb-1">내 포지션 영향</div>
            <div className="text-sm font-mono font-bold text-up">{news.impact}</div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => { toast.success("뉴스를 북마크했습니다"); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
          >
            <Bookmark size={14} /> 북마크
          </button>
          <Link href="/news" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm">
              <ExternalLink size={14} /> 뉴스 전체 보기
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── 캘린더 이벤트 상세 모달 ────────────────────────────────────
function CalendarModal({ event, onClose }: { event: typeof CALENDAR_EVENTS[0]; onClose: () => void }) {
  const typeColor = event.type === "실적" ? "text-primary border-primary" :
    event.type === "배당" ? "text-yellow-500 border-yellow-500" :
    "text-muted-foreground border-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex flex-col items-center justify-center">
              <div className="text-[10px] text-muted-foreground">{event.day}</div>
              <div className="text-lg font-bold font-mono">{event.date}</div>
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit']">{event.title}</h3>
              <Badge variant="outline" className={cn("text-[10px] mt-1", typeColor)}>{event.type}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {event.holding && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">보유 종목</span>
              <Link href={`/analysis?ticker=${event.holding}`}>
                <span className="text-xs font-mono font-bold text-primary hover:underline">{event.holding}</span>
              </Link>
            </div>
          )}
          {event.type === "실적" && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="text-xs font-semibold text-primary mb-1">실적 발표 예정</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                시장 예상치 대비 실제 EPS·매출 결과에 따라 주가 변동성이 커질 수 있습니다.
                발표 전 포지션 관리에 유의하세요.
              </p>
            </div>
          )}
          {event.type === "배당" && (
            <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <div className="text-xs font-semibold text-yellow-500 mb-1">배당 지급 예정</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                배당락일 전 보유 시 배당금을 수령할 수 있습니다. 배당락 당일 주가 조정에 유의하세요.
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
            onClick={() => { toast.success("알림이 설정되었습니다"); onClose(); }}
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
    </div>
  );
}

// ── 지수 상세 모달 ───────────────────────────────────────────
function IndexModal({ idx, onClose }: { idx: typeof MARKET_INDICES[0]; onClose: () => void }) {
  const up = idx.change >= 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-muted-foreground">시장 지수</div>
            <h2 className="text-lg font-bold font-['Outfit']">{idx.name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 mb-4">
          <div className="text-3xl font-bold font-mono">{idx.value.toLocaleString()}</div>
          <div className={cn("flex items-center gap-1.5 mt-2 text-sm font-mono", up ? "text-up" : "text-down")}>
            {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {up ? "+" : ""}{idx.change.toFixed(2)} ({up ? "+" : ""}{idx.changePct.toFixed(2)}%)
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">실시간 데이터 · 15분 지연</div>
        </div>
        <div className="flex gap-2">
          <Link href="/analysis" onClick={onClose} className="flex-1">
            <button className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              상세 분석 →
            </button>
          </Link>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-border text-sm hover:bg-muted">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 섹터 로테이션 패널 ─────────────────────────────────────────
function SectorRotationPanel() {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [period, setPeriod] = useState<"1d" | "1w" | "1m">("1m");
  const sectors = market === "US" ? US_SECTORS : KR_SECTORS;
  const getReturn = (s: typeof US_SECTORS[0]) =>
    period === "1d" ? s.return1d : period === "1w" ? s.return1w : s.return1m;
  const sorted = [...sectors].sort((a, b) => getReturn(b) - getReturn(a));

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold font-['Outfit']">섹터 로테이션</h2>
          <p className="text-xs text-muted-foreground mt-0.5">수익률 순위 · 자금흐름 기준</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["US", "KR"] as const).map(m => (
              <button key={m} onClick={() => setMarket(m)}
                className={cn("text-xs px-2.5 py-1 transition-colors",
                  market === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>{m === "US" ? "미국" : "한국"}</button>
            ))}
          </div>
          <div className="flex rounded-lg overflow-hidden border border-border ml-1">
            {(["1d", "1w", "1m"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("text-xs px-2 py-1 transition-colors",
                  period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>{p === "1d" ? "당일" : p === "1w" ? "주간" : "월간"}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {sorted.map((s, rank) => {
          const ret = getReturn(s);
          const up = ret >= 0;
          const barWidth = Math.min(Math.abs(ret) / (market === "KR" ? 12 : 9) * 100, 100);
          const flowColor = s.flow === "유입" ? "text-up" : s.flow === "유출" ? "text-down" : "text-muted-foreground";
          return (
            <div key={s.sector} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-4 text-center font-mono">{rank + 1}</span>
              <div className="w-16 text-xs text-muted-foreground text-right shrink-0">{s.sector}</div>
              <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", up ? "bg-up/60" : "bg-down/60")}
                  style={{ width: `${barWidth}%`, marginLeft: up ? "50%" : `${50 - barWidth}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold" style={{ color: up ? "var(--up)" : "var(--down)" }}>
                    {up ? "+" : ""}{ret}%
                  </span>
                </div>
              </div>
              <span className={cn("text-[10px] w-8 text-right", flowColor)}>{s.flow}</span>
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
function StockListPanel({ isLoggedIn, marketTab, setMarketTab }: {
  isLoggedIn: boolean;
  marketTab: "KR" | "US";
  setMarketTab: (m: "KR" | "US") => void;
}) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const allStocks = [...US_STOCKS, ...KR_STOCKS];
  const topStocks = marketTab === "KR" ? KR_STOCKS.slice(0, 6) : US_STOCKS.slice(0, 6);

  // 관심종목 있으면 관심종목, 없으면 상위거래
  const hasWatchlist = watchlist.length > 0;
  const displayStocks = hasWatchlist
    ? watchlist.slice(0, 6).map(w => {
        const found = allStocks.find(s => s.ticker === w.ticker);
        return found || { ticker: w.ticker, name: w.name, price: w.price, changePct: w.changePct, sector: w.sector, exchange: w.exchange };
      })
    : topStocks;
  const title = hasWatchlist ? "내 관심종목" : "실시간 상위 거래";

  return (
    <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold font-['Outfit']">{title}</h2>
          {hasWatchlist && <Badge variant="outline" className="text-[10px] border-primary text-primary">{watchlist.length}종목</Badge>}
        </div>
        {!hasWatchlist && (
          <div className="flex gap-1">
            {(["KR", "US"] as const).map((m) => (
              <button key={m} onClick={() => setMarketTab(m)}
                className={cn("text-xs px-2.5 py-1 rounded-md transition-colors",
                  marketTab === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>{m === "KR" ? "한국장" : "미국장"}</button>
            ))}
          </div>
        )}
      </div>
      {!hasWatchlist && (
        <div className="mb-3 p-2.5 bg-muted/30 rounded-lg border border-dashed border-border flex items-center gap-2 flex-shrink-0">
          <Star size={13} className="text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground">종목 상세에서 ★ 눌러 관심종목 등록</span>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-0.5">
          {displayStocks.map((s, i) => (
            <div key={s.ticker} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group">
              <span className="text-xs text-muted-foreground w-4 text-center">{i + 1}</span>
              <Link href={`/analysis?ticker=${s.ticker}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{s.ticker}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{s.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-medium">{s.price.toLocaleString()}</div>
                    <PctBadge value={s.changePct} />
                  </div>
                </div>
              </Link>
              {hasWatchlist && (
                <button
                  onClick={() => { removeFromWatchlist(s.ticker); toast.info(`${s.ticker} 관심종목 해제`); }}
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
            {hasWatchlist ? "마이페이지에서 관리" : "전체 종목 보기"} <ArrowRight size={12} />
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const defaultMarket = useMemo(() => detectOpenMarket(), []);
  const [perfPeriod, setPerfPeriod] = useState<"1D" | "1W" | "1M" | "3M" | "1Y">("1M");
  const [marketTab, setMarketTab] = useState<"KR" | "US">(defaultMarket);
  const chartData = generatePortfolioChart(30);
  const isLoggedIn = !!user;

  // 모달 상태
  const [selectedNews, setSelectedNews] = useState<typeof MARKET_NEWS[0] | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<typeof CALENDAR_EVENTS[0] | null>(null);
  const [fearGreedModal, setFearGreedModal] = useState<"KR" | "US" | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<typeof MARKET_INDICES[0] | null>(null);

  const topIndices = MARKET_INDICES.slice(0, 6);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ── 모달들 ── */}
      {selectedNews && <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />}
      {selectedEvent && <CalendarModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {fearGreedModal && <FearGreedModal market={fearGreedModal} onClose={() => setFearGreedModal(null)} />}
      {selectedIndex && <IndexModal idx={selectedIndex} onClose={() => setSelectedIndex(null)} />}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit']">대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {topIndices.map((idx) => {
          const up = idx.change >= 0;
          return (
            <div
              key={idx.name}
              onClick={() => setSelectedIndex(idx)}
              className="bg-card border border-border rounded-xl p-3.5 hover:border-primary/40 transition-colors cursor-pointer group"
            >
              <div className="text-xs text-muted-foreground mb-1 truncate">{idx.name}</div>
              <div className="text-base font-bold font-mono">{idx.value.toLocaleString()}</div>
              <div className={cn("flex items-center gap-1 mt-1 text-xs font-mono", up ? "text-up" : "text-down")}>
                {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {up ? "+" : ""}{idx.change.toFixed(2)} ({up ? "+" : ""}{idx.changePct.toFixed(2)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 2: 공포탐욕지수 (left 2/5) + 시장 핵심뉴스 (right 3/5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch">
        {/* Left: Fear & Greed */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader title="공포·탐욕 지수" sub="클릭하면 VIX/ADR 히스토리 확인" />
          <div className="flex-1 flex items-center justify-around gap-4">
            <FearGreedGauge value={56} label="외인 5거래일 순매수 지속" market="한국" onClick={() => setFearGreedModal("KR")} />
            <div className="w-px self-stretch bg-border" />
            <FearGreedGauge value={68} label="VIX 14.2 · 안도 과열 구간" market="미국" onClick={() => setFearGreedModal("US")} />
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap flex-shrink-0">
            {[
              { label: "극도 공포", color: "#ef4444" },
              { label: "공포", color: "#f97316" },
              { label: "중립", color: "#eab308" },
              { label: "탐욕", color: "#84cc16" },
              { label: "극도 탐욕", color: "#22c55e" },
            ].map(z => (
              <div key={z.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: z.color }} />
                <span className="text-[10px] text-muted-foreground">{z.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: News */}
        <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader title="시장 핵심 뉴스" sub="클릭하면 요약 확인" href="/news" />
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-0">
              {MARKET_NEWS.slice(0, 5).map((news) => (
                <div
                  key={news.id}
                  className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group border-b border-border/40 last:border-0"
                  onClick={() => setSelectedNews(news)}
                >
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5 py-0 shrink-0 mt-0.5",
                    news.category === "매크로" ? "border-sky-400 text-sky-400" :
                    news.category === "한국" ? "border-violet-400 text-violet-400" :
                    "border-primary text-primary"
                  )}>{news.category}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">{news.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{news.source} · {news.time} 전</span>
                      {news.tickers?.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                  {news.impact && (
                    <span className="text-xs text-up font-mono flex-shrink-0">{news.impact}</span>
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
          <SectionHeader title="내 캘린더" sub="실적·배당·경제지표 일정" href="/calendar" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-0">
            {CALENDAR_EVENTS.map((ev, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/30 last:border-0 sm:last:border-0"
                onClick={() => setSelectedEvent(ev)}
              >
                <div className="text-center min-w-[36px] bg-muted/30 rounded-lg py-1.5">
                  <div className="text-[9px] text-muted-foreground">{ev.day}</div>
                  <div className="text-sm font-bold font-mono text-foreground">{ev.date}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground leading-tight line-clamp-1">{ev.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={cn(
                      "text-[9px] px-1 py-0",
                      ev.type === "실적" ? "border-primary text-primary" :
                      ev.type === "배당" ? "border-yellow-500 text-yellow-500" :
                      "border-muted-foreground text-muted-foreground"
                    )}>{ev.type}</Badge>
                    {ev.holding && <span className="text-[10px] text-muted-foreground font-mono">{ev.holding}</span>}
                  </div>
                </div>
                <ChevronRight size={12} className="text-muted-foreground/40 flex-shrink-0 mt-1" />
              </div>
            ))}
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
              <h2 className="text-base font-bold font-['Outfit']">내 수익률 vs 시장</h2>
              <p className="text-xs text-muted-foreground mt-0.5">시장 대비 <span className="text-up font-medium">+4.2%p</span></p>
            </div>
            <div className="flex gap-1">
              {(["1D", "1W", "1M", "3M", "1Y"] as const).map((p) => (
                <button key={p} onClick={() => setPerfPeriod(p)}
                  className={cn("text-xs px-2 py-1 rounded-md transition-colors",
                    perfPeriod === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
                  labelStyle={{ color: "var(--muted-foreground)" }} />
                <Line type="monotone" dataKey="portfolio" stroke="var(--sky)" strokeWidth={2} dot={false} name="포트폴리오" />
                <Line type="monotone" dataKey="kospi" stroke="var(--violet)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="KOSPI" />
                <Line type="monotone" dataKey="sp500" stroke="var(--gold)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="S&P 500" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 flex-shrink-0">
            {[
              { label: "포트폴리오", color: "var(--sky)", value: "+12.4%" },
              { label: "KOSPI", color: "var(--violet)", value: "+4.1%" },
              { label: "S&P 500", color: "var(--gold)", value: "+8.2%" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: l.color }} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
                <span className="text-xs font-mono font-bold text-up">{l.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist */}
        <StockListPanel isLoggedIn={isLoggedIn} marketTab={marketTab} setMarketTab={setMarketTab} />
      </div>
    </div>
  );
}
