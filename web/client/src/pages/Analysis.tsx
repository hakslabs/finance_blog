/**
 * Analysis.tsx — Midnight Precision Design System
 * MTS 스타일 완전 개인화 분석 페이지
 * - 관심종목 기반 기술신호/퀀트 스크리너
 * - 시장개요: 데일리 코멘트 + 거시지표 직접 등록
 * - 섹터 로테이션: 미국/한국 분리, 당일/주간/월간/분기/연간
 * - 퀀트+기술신호 통합 스크리너: 조건 설정 → 종목 추천
 * - 수익률 비교: 국채 / 관심종목 / 포트폴리오 사용자 선택
 */
import { useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart
} from "recharts";
import {
  Search, Star, X, Plus, Pencil, Save, Brain, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Filter, RefreshCw, Info, AlertTriangle,
  BarChart2, Activity, Zap, Target, BookOpen, Globe, ArrowUpRight,
  ArrowDownRight, Minus, SlidersHorizontal, CheckCircle2, Circle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWatchlist } from "@/contexts/WatchlistContext";
import {
  US_STOCKS, KR_STOCKS, US_SECTORS, KR_SECTORS, MACRO_INDICATORS
} from "@/services/mockData";
import type { MacroIndicator } from "@/types";

// ─── Types ────────────────────────────────────────────────────
type AllStock = typeof US_STOCKS[0];
type MarketTab = "시장 개요" | "섹터 로테이션" | "스크리너" | "수익률 비교";
type StockTab = "차트" | "재무제표" | "밸류에이션" | "기술적 신호" | "뉴스" | "AI 요약";
type Period = "1D" | "1W" | "1M" | "3M" | "1Y";
type SectorPeriod = "당일" | "주간" | "월간" | "분기" | "연간";

// ─── Helpers ──────────────────────────────────────────────────
function generateOHLC(days: number, basePrice: number) {
  const data = [];
  let price = basePrice * 0.7;
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.47) * price * 0.025;
    const open = price;
    price = Math.max(price + change, basePrice * 0.3);
    const high = Math.max(open, price) * (1 + Math.random() * 0.008);
    const low = Math.min(open, price) * (1 - Math.random() * 0.008);
    const vol = Math.floor(Math.random() * 80000000 + 10000000);
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    data.push({
      date: date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      close: Math.round(price * 100) / 100,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      volume: vol,
      ma5: 0, ma20: 0, ma60: 0,
      bb_upper: 0, bb_lower: 0, bb_mid: 0,
      macd: (Math.random() - 0.5) * 10,
      signal: (Math.random() - 0.5) * 8,
      rsi: 30 + Math.random() * 40,
      stoch: 20 + Math.random() * 60,
    });
  }
  // calc MAs
  for (let i = 0; i < data.length; i++) {
    if (i >= 4) data[i].ma5 = data.slice(i - 4, i + 1).reduce((s, d) => s + d.close, 0) / 5;
    if (i >= 19) data[i].ma20 = data.slice(i - 19, i + 1).reduce((s, d) => s + d.close, 0) / 20;
    if (i >= 59) data[i].ma60 = data.slice(i - 59, i + 1).reduce((s, d) => s + d.close, 0) / 60;
    if (i >= 19) {
      const slice = data.slice(i - 19, i + 1).map(d => d.close);
      const mean = slice.reduce((s, v) => s + v, 0) / 20;
      const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / 20);
      data[i].bb_mid = mean;
      data[i].bb_upper = mean + 2 * std;
      data[i].bb_lower = mean - 2 * std;
    }
  }
  return data;
}

function generateMacroHistory(baseValue: number, months = 24) {
  const data = [];
  let v = baseValue * 0.8;
  for (let i = months; i >= 0; i--) {
    v += (Math.random() - 0.48) * baseValue * 0.04;
    v = Math.max(v, 0);
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    data.push({ date: d.toLocaleDateString("ko-KR", { year: "2-digit", month: "short" }), value: Math.round(v * 100) / 100 });
  }
  return data;
}

const PERIOD_DAYS: Record<Period, number> = { "1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365 };

function PctBadge({ value, size = "sm" }: { value: number; size?: "xs" | "sm" }) {
  const up = value >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 font-mono-num font-medium rounded",
      size === "xs" ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5",
      up ? "text-up bg-up/10" : "text-down bg-down/10"
    )}>
      {up ? <ArrowUpRight size={size === "xs" ? 9 : 11} /> : <ArrowDownRight size={size === "xs" ? 9 : 11} />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function RankChange({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr;
  if (diff > 0) return <span className="text-[10px] text-up flex items-center gap-0.5"><ChevronUp size={10} />+{diff}</span>;
  if (diff < 0) return <span className="text-[10px] text-down flex items-center gap-0.5"><ChevronDown size={10} />{diff}</span>;
  return <span className="text-[10px] text-muted-foreground"><Minus size={10} /></span>;
}

function MoneyFlowBadge({ flow }: { flow: "inflow" | "outflow" | "neutral" }) {
  if (flow === "inflow") return <span className="text-[10px] text-up bg-up/10 px-1.5 py-0.5 rounded font-medium">유입</span>;
  if (flow === "outflow") return <span className="text-[10px] text-down bg-down/10 px-1.5 py-0.5 rounded font-medium">유출</span>;
  return <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">중립</span>;
}

// ─── AI Impact Summaries ──────────────────────────────────────
const AI_IMPACT: Record<string, string> = {
  "미국 CPI": "예상치 상회 시 연준 금리 인하 기대 약화 → 성장주·기술주 밸류에이션 압박. 채권 수익률 상승으로 고PER 종목 조정 가능성.",
  "연방기금금리": "금리 동결·인하 시 유동성 확대 기대 → 나스닥 강세. 인상 시 달러 강세·신흥국 자금 이탈 우려.",
  "미국 실업률": "실업률 상승은 소비 둔화 신호 → 소비재·리테일 섹터 부담. 단, 연준 금리 인하 명분 제공으로 채권 강세.",
  "미국 GDP 성장률": "성장률 가속 시 기업 이익 개선 기대 → 경기민감주(금융·산업재) 강세. 과열 우려 시 인플레이션 재점화 리스크.",
  "WTI 유가": "유가 상승 시 에너지 섹터 수혜, 항공·운송·화학 비용 증가. 인플레이션 자극으로 연준 긴축 장기화 우려.",
  "달러 인덱스": "달러 강세 시 원자재 가격 하락, 신흥국 통화 약세. 미국 수출 기업 실적 압박. 달러 약세 시 반대 효과.",
  "한국 기준금리": "금리 인하 시 부동산·금융주 수혜, 성장주 밸류에이션 개선. 원화 약세 압력으로 수출주 혼조.",
  "KOSPI 외국인 순매수": "외국인 순매수 확대 시 대형주 강세 신호. 반도체·자동차 등 수출 대형주 중심 상승 모멘텀.",
};

// ─── MacroCard ────────────────────────────────────────────────
function MacroCard({ ind, onEdit }: { ind: MacroIndicator; onEdit: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(ind.value);
  const [editPrev, setEditPrev] = useState(ind.prev);
  const [currentInd, setCurrentInd] = useState(ind);

  const historyData = useMemo(() => generateMacroHistory(parseFloat(ind.value) || 3, 24), [ind.id]);
  const numVal = parseFloat(currentInd.value);
  const numPrev = parseFloat(currentInd.prev);
  const diff = numVal - numPrev;
  const up = diff >= 0;
  const color = up ? "#22c55e" : "#ef4444";

  const handleSave = () => {
    setCurrentInd(prev => ({ ...prev, value: editVal, prev: editPrev }));
    setEditing(false);
    toast.success(`${ind.name} 발표치 업데이트 완료`);
    onEdit(ind.id);
  };

  const categoryColors: Record<string, string> = {
    "금리": "text-sky bg-sky/10", "물가": "text-orange-400 bg-orange-400/10",
    "고용": "text-green-400 bg-green-400/10", "성장": "text-violet-400 bg-violet-400/10",
    "원자재": "text-yellow-400 bg-yellow-400/10", "환율": "text-blue-400 bg-blue-400/10",
  };

  return (
    <div className={cn(
      "border border-border rounded-xl overflow-hidden transition-all duration-200",
      expanded ? "col-span-2 sm:col-span-2 lg:col-span-2" : "",
      "hover:border-primary/30 hover:shadow-sm"
    )}>
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold leading-tight truncate">{currentInd.name}</div>
            <span className={cn("text-[9px] px-1 py-0.5 rounded font-medium mt-0.5 inline-block", categoryColors[currentInd.category] || "text-muted-foreground bg-muted")}>
              {currentInd.category}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(!editing); setExpanded(true); }}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil size={10} />
            </button>
            {expanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-xl font-bold font-mono-num">{currentInd.value}{currentInd.unit}</span>
          <span className={cn("text-xs font-mono-num font-medium", up ? "text-up" : "text-down")}>
            {up ? "+" : ""}{diff.toFixed(2)}{currentInd.unit}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">이전: {currentInd.prev}{currentInd.unit}</div>
      </div>

      {expanded && (
        <div className="border-t border-border/50">
          {editing && (
            <div className="p-3 bg-muted/20 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-medium text-muted-foreground">발표치 직접 입력</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">현재값</label>
                  <input value={editVal} onChange={e => setEditVal(e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs bg-background border border-border rounded-lg font-mono-num focus:outline-none focus:border-primary" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">이전값</label>
                  <input value={editPrev} onChange={e => setEditPrev(e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 text-xs bg-background border border-border rounded-lg font-mono-num focus:outline-none focus:border-primary" />
                </div>
                <div className="flex items-end gap-1">
                  <button onClick={handleSave} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1">
                    <Save size={10} /> 저장
                  </button>
                  <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-lg">취소</button>
                </div>
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <BarChart2 size={10} /> 24개월 추이
              <span className="ml-auto">{currentInd.source} · {currentInd.updateFrequency === "monthly" ? "월간" : currentInd.updateFrequency === "daily" ? "일간" : "분기"}</span>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 2, right: 2, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id={`mg-${ind.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }} />
                  <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#mg-${ind.id})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {AI_IMPACT[currentInd.name] && (
              <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-1.5">
                  <Brain size={10} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[9px] text-primary font-semibold mb-0.5">시장 영향 분석</div>
                    <div className="text-[10px] text-muted-foreground leading-relaxed">{AI_IMPACT[currentInd.name]}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Market Overview Panel ────────────────────────────────────
const DAILY_COMMENTS = [
  {
    date: "2025.05.18",
    title: "연준 의사록 발표 앞두고 관망세 — 기술주 차별화 지속",
    summary: "미국 증시는 연준 5월 FOMC 의사록 공개를 앞두고 전반적 관망세를 보였다. S&P500은 소폭 상승하며 5,800선을 유지했으나 거래량은 평균 대비 15% 감소했다. 엔비디아(NVDA)는 AI 수요 지속 기대감에 3.4% 급등하며 나스닥을 견인했고, 에너지 섹터는 유가 하락에 2% 이상 밀렸다.",
    keyPoints: [
      "NVDA +3.4% — Blackwell GPU 수요 예상치 상회 보도",
      "연준 의사록: 금리 동결 기조 유지, 인하 시기 불확실",
      "WTI 유가 $71.8 — OPEC+ 증산 우려 지속",
      "달러 인덱스 104.2 — 엔화 약세 재개",
    ],
    outlook: "단기적으로 연준 의사록과 PCE 물가지수 발표가 시장 방향성을 결정할 것. 기술주 중심 상승 모멘텀은 유지되나 밸류에이션 부담 존재. 한국 시장은 외국인 반도체 순매수 지속 여부가 관건.",
    sentiment: "중립",
    sentimentScore: 52,
  }
];

const MARKET_EVENTS_TODAY = [
  { time: "21:30", event: "미국 소매판매 (4월)", importance: "high", forecast: "+0.4%", prev: "+0.7%" },
  { time: "21:30", event: "미국 산업생산 (4월)", importance: "medium", forecast: "+0.1%", prev: "-0.3%" },
  { time: "23:00", event: "미시간대 소비자심리 (5월 예비)", importance: "medium", forecast: "76.2", prev: "77.2" },
  { time: "다음주", event: "연준 FOMC 의사록 공개", importance: "high", forecast: "-", prev: "-" },
];

function MarketOverviewPanel({ macroIndicators, onEditMacro }: {
  macroIndicators: MacroIndicator[];
  onEditMacro: (id: string) => void;
}) {
  const [showAddMacro, setShowAddMacro] = useState(false);
  const [newMacro, setNewMacro] = useState({ name: "", value: "", prev: "", category: "금리" as MacroIndicator["category"] });
  const [localIndicators, setLocalIndicators] = useState(macroIndicators);
  const comment = DAILY_COMMENTS[0];

  const handleAddMacro = () => {
    if (!newMacro.name || !newMacro.value) { toast.error("지표명과 현재값을 입력하세요"); return; }
    const numVal = parseFloat(newMacro.value) || 0;
    const prevVal = parseFloat(newMacro.prev) || 0;
    const newItem: MacroIndicator = {
      id: `custom-${Date.now()}`,
      name: newMacro.name,
      value: newMacro.value,
      numValue: numVal,
      prev: newMacro.prev,
      status: numVal > prevVal ? "상승" : numVal < prevVal ? "하락" : "보합",
      good: null,
      unit: "",
      trend: numVal > prevVal ? "up" : numVal < prevVal ? "down" : "flat",
      country: "GLOBAL",
      category: newMacro.category,
      description: "",
      source: "직접 입력",
      updateFrequency: "monthly",
    };
    setLocalIndicators(prev => [...prev, newItem]);
    setNewMacro({ name: "", value: "", prev: "", category: "금리" });
    setShowAddMacro(false);
    toast.success("거시지표 추가 완료");
  };

  return (
    <div className="space-y-5">
      {/* Daily Market Comment */}
      <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={13} className="text-primary" />
              <span className="text-[11px] text-primary font-semibold">오늘의 시장 코멘트</span>
              <span className="text-[10px] text-muted-foreground">{comment.date}</span>
            </div>
            <div className="text-sm font-bold leading-snug">{comment.title}</div>
          </div>
          <div className={cn(
            "shrink-0 px-2 py-1 rounded-lg text-xs font-semibold",
            comment.sentimentScore >= 60 ? "bg-up/10 text-up" :
            comment.sentimentScore <= 40 ? "bg-down/10 text-down" :
            "bg-muted text-muted-foreground"
          )}>
            {comment.sentiment} {comment.sentimentScore}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{comment.summary}</p>
        <div className="space-y-1 mb-3">
          {comment.keyPoints.map((pt, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <span className="text-primary mt-0.5 shrink-0">•</span>
              <span className="text-foreground/80">{pt}</span>
            </div>
          ))}
        </div>
        <div className="p-2.5 bg-muted/30 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-semibold mb-1 flex items-center gap-1">
            <Target size={10} /> 단기 전망
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{comment.outlook}</p>
        </div>
      </div>

      {/* Today's Key Events */}
      <div>
        <div className="text-xs font-semibold mb-2 flex items-center gap-2">
          <Activity size={13} className="text-primary" /> 오늘의 주요 경제 일정
        </div>
        <div className="space-y-1.5">
          {MARKET_EVENTS_TODAY.map((ev, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
              <span className="text-[11px] font-mono text-muted-foreground w-12 shrink-0">{ev.time}</span>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                ev.importance === "high" ? "bg-down" : "bg-yellow-400"
              )} />
              <span className="text-xs flex-1 font-medium">{ev.event}</span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                <span>예상 <span className="font-mono text-foreground">{ev.forecast}</span></span>
                <span>이전 <span className="font-mono">{ev.prev}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Macro Indicators */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold flex items-center gap-2">
            <Globe size={13} className="text-primary" /> 핵심 거시지표
            <span className="text-[10px] text-muted-foreground font-normal">클릭하여 히스토리 차트 + AI 분석 확인</span>
          </div>
          <button
            onClick={() => setShowAddMacro(!showAddMacro)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={11} /> 지표 추가
          </button>
        </div>

        {showAddMacro && (
          <div className="p-3 bg-muted/30 rounded-xl border border-border mb-3 space-y-2">
            <div className="text-xs font-medium">새 거시지표 추가</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input value={newMacro.name} onChange={e => setNewMacro(p => ({ ...p, name: e.target.value }))}
                placeholder="지표명 (예: 미국 PPI)" className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary" />
              <input value={newMacro.value} onChange={e => setNewMacro(p => ({ ...p, value: e.target.value }))}
                placeholder="현재값 (예: 2.4)" className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary" />
              <input value={newMacro.prev} onChange={e => setNewMacro(p => ({ ...p, prev: e.target.value }))}
                placeholder="이전값 (예: 2.1)" className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary" />
              <select value={newMacro.category} onChange={e => setNewMacro(p => ({ ...p, category: e.target.value as MacroIndicator["category"] }))}
                className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary">
                {["금리", "물가", "고용", "성장", "원자재", "환율"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddMacro} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg flex items-center gap-1">
                <Plus size={11} /> 추가
              </button>
              <button onClick={() => setShowAddMacro(false)} className="px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg">취소</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-auto">
          {localIndicators.map(ind => (
            <MacroCard key={ind.id} ind={ind} onEdit={onEditMacro} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sector Rotation Panel ────────────────────────────────────
const SECTOR_COMMENTS: Record<string, string> = {
  "Technology": "AI·클라우드 수요 지속으로 최상위 모멘텀. 고PER 부담 있으나 이익 성장이 뒷받침.",
  "Semiconductors": "AI 인프라 투자 사이클 수혜. 데이터센터 GPU 수요 폭발적 증가.",
  "Communication": "광고 시장 회복 + AI 통합 서비스 성장. 메타·알파벳 실적 개선.",
  "Financials": "금리 고점 인식에 NIM 압박 우려. 신용 리스크 모니터링 필요.",
  "Healthcare": "방어주 특성으로 시장 약세 시 주목. 바이오텍 임상 결과 변수.",
  "Energy": "OPEC+ 증산 우려와 글로벌 수요 둔화로 하락 압력. 지정학적 리스크 상존.",
  "Utilities": "금리 인하 기대 시 수혜. 안정적 배당 매력.",
  "Consumer Disc.": "소비자 심리 회복 여부가 관건. 아마존·테슬라 실적 영향 큼.",
  "Industrials": "제조업 PMI 개선 시 수혜. 방산·인프라 지출 증가 테마.",
  "Materials": "달러 강세·중국 수요 부진으로 약세. 구리·철강 가격 하락.",
  "반도체": "HBM·AI 칩 수요로 삼성·SK하이닉스 실적 개선 기대. 외국인 순매수 지속.",
  "IT서비스": "AI 전환 수요 증가. 네이버·카카오 광고 회복 여부 주목.",
  "자동차": "현대·기아 미국 시장 점유율 확대. 전기차 전환 비용 부담은 리스크.",
  "2차전지": "전기차 수요 둔화·공급 과잉으로 조정 지속. 중장기 구조적 성장은 유효.",
  "바이오": "임상 결과 기반 개별 종목 장세. 삼성바이오 CMO 수주 모멘텀.",
  "금융": "금리 인하 기대 약화로 NIM 개선 지연. 배당 매력은 유지.",
  "화학": "원자재 가격 하락·중국 경쟁 심화로 마진 압박.",
  "건설": "부동산 경기 회복 지연. PF 리스크 해소 여부 모니터링.",
  "철강": "중국 수출 물량 증가로 가격 하락 압력. 구조적 수요 약세.",
  "통신": "5G 투자 마무리 단계. 안정적 배당 매력, 성장 모멘텀 제한.",
};

function SectorRotationPanel() {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [period, setPeriod] = useState<SectorPeriod>("월간");
  const [sortBy, setSortBy] = useState<"rank" | "return" | "flow">("rank");

  const sectors = market === "US" ? US_SECTORS : KR_SECTORS;
  const PERIODS: SectorPeriod[] = ["당일", "주간", "월간", "분기", "연간"];

  const getReturn = (s: typeof sectors[0]) => {
    const annualMultiplier = 4.2;
    switch (period) {
      case "당일": return s.returnDay;
      case "주간": return s.returnWeek;
      case "월간": return s.returnMonth;
      case "분기": return s.returnQuarter;
      case "연간": return s.returnQuarter * annualMultiplier;
    }
  };

  const getRank = (s: typeof sectors[0]) => {
    switch (period) {
      case "당일": return s.rankDay;
      case "주간": return s.rankWeek;
      default: return s.rankMonth;
    }
  };

  const sorted = [...sectors].sort((a, b) => {
    if (sortBy === "rank") return getRank(a) - getRank(b);
    if (sortBy === "return") return getReturn(b) - getReturn(a);
    const flowOrder = { inflow: 0, neutral: 1, outflow: 2 };
    return flowOrder[a.moneyFlow] - flowOrder[b.moneyFlow];
  });

  const chartData = sorted.slice(0, 8).map(s => ({
    name: s.sector.length > 8 ? s.sector.slice(0, 8) + "…" : s.sector,
    value: getReturn(s),
    fill: getReturn(s) >= 0 ? "#22c55e" : "#ef4444",
  }));

  const periodComment: Record<SectorPeriod, string> = {
    "당일": "당일 수익률 기준 섹터 순위입니다. 단기 모멘텀과 이벤트 반응을 확인하세요.",
    "주간": "주간 수익률 기준입니다. 단기 트렌드 변화와 자금 흐름 방향을 파악하세요.",
    "월간": "월간 수익률 기준입니다. 섹터 로테이션의 중기 추세를 가장 잘 반영합니다.",
    "분기": "분기 수익률 기준입니다. 어닝 시즌 결과와 중장기 섹터 흐름을 확인하세요.",
    "연간": "연간 수익률 기준입니다. 구조적 성장 섹터와 소외 섹터를 구분하는 데 유용합니다.",
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["US", "KR"] as const).map(m => (
            <button key={m} onClick={() => setMarket(m)}
              className={cn("px-3 py-1.5 font-medium transition-colors",
                market === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}>
              {m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn("px-3 py-1.5 font-medium transition-colors",
                period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs ml-auto">
          {(["rank", "return", "flow"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={cn("px-3 py-1.5 font-medium transition-colors",
                sortBy === s ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              )}>
              {s === "rank" ? "순위" : s === "return" ? "수익률" : "자금흐름"}
            </button>
          ))}
        </div>
      </div>

      {/* Period comment */}
      <div className="flex items-start gap-2 p-2.5 bg-muted/20 rounded-lg text-xs text-muted-foreground">
        <Info size={12} className="shrink-0 mt-0.5 text-primary" />
        {periodComment[period]}
      </div>

      {/* Bar chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
              formatter={(v: number) => [`${v.toFixed(2)}%`, "수익률"]} />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">순위</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">섹터</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">{period} 수익률</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">순위변화</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">상대강도</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">자금흐름</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const ret = getReturn(s);
              const comment = SECTOR_COMMENTS[s.sector];
              return (
                <tr key={s.sector} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                  <td className="py-2 px-2">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      i === 0 ? "bg-yellow-400/20 text-yellow-500" :
                      i === 1 ? "bg-slate-400/20 text-slate-400" :
                      i === 2 ? "bg-orange-400/20 text-orange-400" : "text-muted-foreground"
                    )}>{i + 1}</span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="font-medium">{s.sector}</div>
                    {(s as any).etf && <div className="text-[10px] text-muted-foreground">{(s as any).etf}</div>}
                    {comment && (
                      <div className="text-[10px] text-muted-foreground/70 leading-tight max-w-xs hidden group-hover:block mt-0.5">{comment}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <PctBadge value={ret} />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <RankChange curr={getRank(s)} prev={s.prevRankMonth} />
                  </td>
                  <td className="py-2 px-2 text-right font-mono-num">
                    <span className={cn(s.relativeStrength >= 1 ? "text-up" : "text-down")}>
                      {s.relativeStrength.toFixed(2)}x
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <MoneyFlowBadge flow={s.moneyFlow} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground p-2 bg-muted/10 rounded-lg">
        <span><strong>순위변화</strong>: 이전 월간 대비 순위 상승/하락</span>
        <span><strong>상대강도</strong>: 시장 대비 초과수익률 배수 (1.0 = 시장과 동일)</span>
        <span><strong>자금흐름</strong>: 해당 섹터 ETF 거래량 기반 자금 유출입 방향</span>
      </div>
    </div>
  );
}

// ─── Integrated Screener (Quant + Technical) ─────────────────
const SCREENER_CONDITIONS = [
  { id: "rsi_oversold", label: "RSI 과매도 (RSI < 30)", category: "기술적", description: "RSI가 30 미만으로 과매도 구간. 반등 가능성 탐색." },
  { id: "rsi_overbought", label: "RSI 과매수 (RSI > 70)", category: "기술적", description: "RSI가 70 초과로 과매수 구간. 조정 가능성 탐색." },
  { id: "golden_cross", label: "골든크로스 (MA5 > MA20)", category: "기술적", description: "단기 이평선이 장기 이평선 상향 돌파. 상승 추세 전환 신호." },
  { id: "dead_cross", label: "데드크로스 (MA5 < MA20)", category: "기술적", description: "단기 이평선이 장기 이평선 하향 돌파. 하락 추세 전환 신호." },
  { id: "bb_lower", label: "볼린저밴드 하단 터치", category: "기술적", description: "현재가가 BB 하단 근접. 과매도 반등 후보." },
  { id: "bb_upper", label: "볼린저밴드 상단 돌파", category: "기술적", description: "현재가가 BB 상단 돌파. 강한 상승 모멘텀." },
  { id: "macd_bullish", label: "MACD 골든크로스", category: "기술적", description: "MACD선이 시그널선 상향 돌파. 매수 신호." },
  { id: "low_per", label: "저PER (PER < 15)", category: "가치", description: "PER 15 미만 저평가 종목. 가치투자 관점 매력." },
  { id: "low_pbr", label: "저PBR (PBR < 1)", category: "가치", description: "PBR 1 미만. 자산 대비 저평가 종목." },
  { id: "high_roe", label: "고ROE (ROE > 20%)", category: "퀄리티", description: "자기자본이익률 20% 초과. 수익성 우수 기업." },
  { id: "high_dividend", label: "고배당 (배당수익률 > 3%)", category: "배당", description: "배당수익률 3% 초과. 인컴 투자 관점 매력." },
  { id: "momentum_up", label: "모멘텀 상승 (등락률 > 2%)", category: "모멘텀", description: "당일 2% 이상 상승. 강한 매수세 유입." },
];

const CATEGORY_COLORS: Record<string, string> = {
  "기술적": "text-sky bg-sky/10",
  "가치": "text-green-400 bg-green-400/10",
  "퀄리티": "text-violet-400 bg-violet-400/10",
  "배당": "text-yellow-400 bg-yellow-400/10",
  "모멘텀": "text-orange-400 bg-orange-400/10",
};

function IntegratedScreenerPanel() {
  const { watchlist } = useWatchlist();
  const [selectedConditions, setSelectedConditions] = useState<string[]>(["low_per", "high_roe"]);
  const [market, setMarket] = useState<"ALL" | "US" | "KR">("ALL");
  const [useWatchlistOnly, setUseWatchlistOnly] = useState(false);
  const [sortField, setSortField] = useState<"score" | "changePct" | "pe" | "roe">("score");

  const allStocks = useMemo(() => [...US_STOCKS, ...KR_STOCKS], []);

  const filteredByMarket = useMemo(() => {
    let stocks = market === "US" ? US_STOCKS : market === "KR" ? KR_STOCKS : allStocks;
    if (useWatchlistOnly && watchlist.length > 0) {
      const tickers = new Set(watchlist.map(w => w.ticker));
      stocks = stocks.filter(s => tickers.has(s.ticker));
    }
    return stocks;
  }, [market, useWatchlistOnly, watchlist, allStocks]);

  const scoreStock = useCallback((stock: AllStock) => {
    let score = 0;
    const rsi = 30 + Math.random() * 40;
    const macd = (Math.random() - 0.5) * 10;
    const signal = (Math.random() - 0.5) * 8;

    const checks: Record<string, boolean> = {
      rsi_oversold: rsi < 35,
      rsi_overbought: rsi > 65,
      golden_cross: Math.random() > 0.5,
      dead_cross: Math.random() > 0.7,
      bb_lower: Math.random() > 0.7,
      bb_upper: Math.random() > 0.7,
      macd_bullish: macd > signal,
      low_per: ( stock.pe ?? 99) < 15,
      low_pbr: ( stock.pbr ?? 99) < 1.5,
      high_roe: ( stock.roe ?? 0) > 20,
      high_dividend: ( stock.dividendYield ?? 0) > 3,
      momentum_up: stock.changePct > 2,
    };

    selectedConditions.forEach(cond => {
      if (checks[cond]) score++;
    });

    return { stock, score, rsi: Math.round(rsi), macd: Math.round(macd * 10) / 10, checks };
  }, [selectedConditions]);

  const results = useMemo(() => {
    return filteredByMarket
      .map(scoreStock)
      .filter(r => r.score > 0)
      .sort((a, b) => {
        if (sortField === "score") return b.score - a.score;
        if (sortField === "changePct") return b.stock.changePct - a.stock.changePct;
        if (sortField === "pe") return (a.stock.pe ?? 0) - (b.stock.pe ?? 0);
        if (sortField === "roe") return (b.stock.roe ?? 0) - (a.stock.roe ?? 0);
        return 0;
      });
  }, [filteredByMarket, scoreStock, sortField]);

  const toggleCondition = (id: string) => {
    setSelectedConditions(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const categoryGroups = useMemo(() => {
    const groups: Record<string, typeof SCREENER_CONDITIONS> = {};
    SCREENER_CONDITIONS.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-primary" />
          <span className="text-sm font-semibold">스크리너 조건 설정</span>
          <span className="text-xs text-muted-foreground">조건을 선택하면 해당 종목을 자동으로 필터링합니다</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["ALL", "US", "KR"] as const).map(m => (
              <button key={m} onClick={() => setMarket(m)}
                className={cn("px-3 py-1.5 font-medium transition-colors",
                  market === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>
                {m === "ALL" ? "전체" : m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setUseWatchlistOnly(!useWatchlistOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              useWatchlistOnly ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-500" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Star size={11} fill={useWatchlistOnly ? "currentColor" : "none"} />
            관심종목만
          </button>
        </div>
      </div>

      {/* Condition Groups */}
      <div className="space-y-3">
        {Object.entries(categoryGroups).map(([category, conditions]) => (
          <div key={category}>
            <div className={cn("text-[10px] font-semibold px-2 py-0.5 rounded inline-block mb-2", CATEGORY_COLORS[category] || "text-muted-foreground bg-muted")}>
              {category}
            </div>
            <div className="flex flex-wrap gap-2">
              {conditions.map(cond => {
                const active = selectedConditions.includes(cond.id);
                return (
                  <button
                    key={cond.id}
                    onClick={() => toggleCondition(cond.id)}
                    title={cond.description}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
                      active
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {active ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                    {cond.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedConditions.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Filter size={24} className="mx-auto mb-2 opacity-30" />
          조건을 1개 이상 선택하면 종목이 필터링됩니다
        </div>
      )}

      {selectedConditions.length > 0 && (
        <>
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{results.length}개</span> 종목이 조건에 부합합니다
              {useWatchlistOnly && watchlist.length === 0 && (
                <span className="ml-2 text-yellow-500">관심종목을 먼저 추가하세요</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">정렬:</span>
              {(["score", "changePct", "pe", "roe"] as const).map(f => (
                <button key={f} onClick={() => setSortField(f)}
                  className={cn("px-2 py-0.5 rounded transition-colors",
                    sortField === f ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {f === "score" ? "매칭점수" : f === "changePct" ? "등락률" : f === "pe" ? "PER" : "ROE"}
                </button>
              ))}
            </div>
          </div>

          {/* Results table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">종목</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">현재가</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">등락률</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">PER</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">PBR</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">ROE</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">RSI</th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium">매칭</th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium">충족 조건</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 20).map(({ stock: s, score, rsi, checks }) => (
                  <tr key={s.ticker} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-2">
                      <div className="font-bold">{s.ticker}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{s.name}</div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono-num font-medium">
                      {s.price.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <PctBadge value={s.changePct} size="xs" />
                    </td>
                    <td className="py-2 px-2 text-right font-mono-num">
                      <span className={cn((s.pe ?? 99) < 15 ? "text-up font-semibold" : "")}>{(s.pe ?? 0).toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono-num">
                      <span className={cn((s.pbr ?? 99) < 1 ? "text-up font-semibold" : "")}>{(s.pbr ?? 0).toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono-num">
                      <span className={cn((s.roe ?? 0) > 20 ? "text-up font-semibold" : "")}>{(s.roe ?? 0).toFixed(1)}%</span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono-num">
                      <span className={cn(
                        rsi < 35 ? "text-up font-semibold" : rsi > 65 ? "text-down font-semibold" : ""
                      )}>{rsi}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded font-bold text-[10px]",
                        score >= selectedConditions.length ? "bg-up/20 text-up" :
                        score >= selectedConditions.length * 0.6 ? "bg-yellow-400/20 text-yellow-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {score}/{selectedConditions.length}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-0.5 max-w-[160px]">
                        {selectedConditions.filter(c => checks[c]).map(c => {
                          const cond = SCREENER_CONDITIONS.find(sc => sc.id === c);
                          return cond ? (
                            <span key={c} className={cn("text-[9px] px-1 py-0.5 rounded", CATEGORY_COLORS[cond.category] || "bg-muted text-muted-foreground")}>
                              {cond.category}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Return Comparison Panel ──────────────────────────────────
type ReturnMode = "국채수익률" | "관심종목" | "포트폴리오";

const YIELD_CURVE_US = [
  { maturity: "1M", current: 5.28, prev3m: 5.38, prev1y: 4.82 },
  { maturity: "3M", current: 5.24, prev3m: 5.32, prev1y: 4.78 },
  { maturity: "6M", current: 5.18, prev3m: 5.24, prev1y: 4.72 },
  { maturity: "1Y", current: 5.02, prev3m: 5.08, prev1y: 4.58 },
  { maturity: "2Y", current: 4.84, prev3m: 4.92, prev1y: 4.42 },
  { maturity: "5Y", current: 4.52, prev3m: 4.64, prev1y: 4.18 },
  { maturity: "10Y", current: 4.42, prev3m: 4.58, prev1y: 3.98 },
  { maturity: "20Y", current: 4.68, prev3m: 4.82, prev1y: 4.28 },
  { maturity: "30Y", current: 4.58, prev3m: 4.72, prev1y: 4.18 },
];

const YIELD_CURVE_KR = [
  { maturity: "1M", current: 3.58, prev3m: 3.62, prev1y: 3.82 },
  { maturity: "3M", current: 3.52, prev3m: 3.58, prev1y: 3.74 },
  { maturity: "6M", current: 3.48, prev3m: 3.54, prev1y: 3.68 },
  { maturity: "1Y", current: 3.42, prev3m: 3.48, prev1y: 3.62 },
  { maturity: "2Y", current: 3.38, prev3m: 3.44, prev1y: 3.58 },
  { maturity: "5Y", current: 3.42, prev3m: 3.48, prev1y: 3.62 },
  { maturity: "10Y", current: 3.52, prev3m: 3.58, prev1y: 3.72 },
  { maturity: "20Y", current: 3.48, prev3m: 3.54, prev1y: 3.68 },
  { maturity: "30Y", current: 3.44, prev3m: 3.50, prev1y: 3.64 },
];

function ReturnComparisonPanel() {
  const { watchlist } = useWatchlist();
  const [mode, setMode] = useState<ReturnMode>("국채수익률");
  const [yieldMarket, setYieldMarket] = useState<"US" | "KR">("US");
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("3M");

  const yieldData = yieldMarket === "US" ? YIELD_CURVE_US : YIELD_CURVE_KR;
  const isInverted = yieldData[0].current > yieldData[yieldData.length - 1].current;

  // Watchlist return chart data
  const watchlistChartData = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const data = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const entry: Record<string, number | string> = {
        date: d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      };
      const tickersToShow = selectedTickers.length > 0 ? selectedTickers : watchlist.slice(0, 5).map(w => w.ticker);
      tickersToShow.forEach(ticker => {
        const stock = [...US_STOCKS, ...KR_STOCKS].find(s => s.ticker === ticker);
        if (stock) {
          const baseReturn = ((days - i) / days) * stock.changePct * (days / 30);
          entry[ticker] = Math.round((baseReturn + (Math.random() - 0.48) * 2) * 100) / 100;
        }
      });
      data.push(entry);
    }
    return data;
  }, [watchlist, selectedTickers, period]);

  const COLORS = ["#38bdf8", "#a855f7", "#22c55e", "#f59e0b", "#ef4444", "#ec4899"];
  const displayTickers = selectedTickers.length > 0 ? selectedTickers : watchlist.slice(0, 5).map(w => w.ticker);

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["국채수익률", "관심종목", "포트폴리오"] as ReturnMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("px-3 py-1.5 font-medium transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}>
              {m}
            </button>
          ))}
        </div>
        {mode === "국채수익률" && (
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["US", "KR"] as const).map(m => (
              <button key={m} onClick={() => setYieldMarket(m)}
                className={cn("px-3 py-1.5 font-medium transition-colors",
                  yieldMarket === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>
                {m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
              </button>
            ))}
          </div>
        )}
        {(mode === "관심종목" || mode === "포트폴리오") && (
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["1W", "1M", "3M", "1Y"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-3 py-1.5 font-medium transition-colors",
                  period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 국채 수익률 곡선 */}
      {mode === "국채수익률" && (
        <div className="space-y-3">
          <div className={cn(
            "flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium",
            isInverted ? "bg-down/10 text-down border border-down/20" : "bg-up/10 text-up border border-up/20"
          )}>
            {isInverted ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            {isInverted
              ? "수익률 곡선 역전 — 단기 금리 > 장기 금리. 역사적으로 경기침체 선행 신호."
              : "정상 수익률 곡선 — 장기 금리 > 단기 금리. 경기 확장 국면."}
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="maturity" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="current" name="현재" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="prev3m" name="3개월 전" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                <Line type="monotone" dataKey="prev1y" name="1년 전" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { label: "2Y-10Y 스프레드", value: `${(yieldData[6].current - yieldData[4].current).toFixed(2)}%`, desc: "경기침체 지표" },
              { label: "3M-10Y 스프레드", value: `${(yieldData[6].current - yieldData[2].current).toFixed(2)}%`, desc: "연준 선호 지표" },
              { label: "10Y 실질금리", value: `${(yieldData[6].current - 2.8).toFixed(2)}%`, desc: "CPI 차감 추정" },
            ].map(item => (
              <div key={item.label} className="p-2.5 bg-muted/20 rounded-lg">
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
                <div className={cn("text-base font-bold font-mono-num mt-0.5",
                  parseFloat(item.value) < 0 ? "text-down" : "text-up"
                )}>{item.value}</div>
                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 관심종목 수익률 비교 */}
      {mode === "관심종목" && (
        <div className="space-y-3">
          {watchlist.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Star size={28} className="mx-auto mb-2 opacity-30" />
              관심종목을 추가하면 수익률을 비교할 수 있습니다
              <div className="text-xs mt-1">종목 검색에서 ★ 버튼으로 추가하세요</div>
            </div>
          ) : (
            <>
              {/* Ticker selector */}
              <div className="flex flex-wrap gap-1.5">
                {watchlist.map((w, i) => (
                  <button
                    key={w.ticker}
                    onClick={() => setSelectedTickers(prev =>
                      prev.includes(w.ticker) ? prev.filter(t => t !== w.ticker) : [...prev, w.ticker]
                    )}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                      selectedTickers.includes(w.ticker) || selectedTickers.length === 0
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                    style={{ borderColor: selectedTickers.includes(w.ticker) ? COLORS[i % COLORS.length] : undefined }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {w.ticker}
                  </button>
                ))}
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={watchlistChartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={Math.floor(watchlistChartData.length / 6)} />
                    <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
                      formatter={(v: number) => [`${v.toFixed(2)}%`]} />
                    <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {displayTickers.map((ticker, i) => (
                      <Line key={ticker} type="monotone" dataKey={ticker} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Return summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {displayTickers.map((ticker, i) => {
                  const stock = [...US_STOCKS, ...KR_STOCKS].find(s => s.ticker === ticker);
                  if (!stock) return null;
                  const totalReturn = stock.changePct * (PERIOD_DAYS[period] / 30);
                  return (
                    <div key={ticker} className="p-2 rounded-lg bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-bold">{ticker}</span>
                      </div>
                      <div className={cn("text-sm font-bold font-mono-num", totalReturn >= 0 ? "text-up" : "text-down")}>
                        {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">{period} 수익률</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 포트폴리오 수익률 */}
      {mode === "포트폴리오" && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <BarChart2 size={28} className="mx-auto mb-2 opacity-30" />
          포트폴리오 수익률은 마이페이지에서 종목을 추가하면 여기서 비교할 수 있습니다
          <div className="text-xs mt-1 text-primary cursor-pointer hover:underline">마이페이지 → 포트폴리오 탭으로 이동</div>
        </div>
      )}
    </div>
  );
}

// ─── Stock Analysis Panel (6 tabs) ───────────────────────────
const STOCK_TABS: StockTab[] = ["차트", "재무제표", "밸류에이션", "기술적 신호", "뉴스", "AI 요약"];

const INDICATOR_OPTIONS = [
  { id: "ma5", label: "MA5", color: "#f59e0b" },
  { id: "ma20", label: "MA20", color: "#a855f7" },
  { id: "ma60", label: "MA60", color: "#38bdf8" },
  { id: "bb", label: "볼린저밴드", color: "#94a3b8" },
  { id: "macd", label: "MACD", color: "#22c55e" },
  { id: "rsi", label: "RSI", color: "#f59e0b" },
  { id: "stoch", label: "스토캐스틱", color: "#ec4899" },
  { id: "volume", label: "거래량", color: "#64748b" },
];

function StockAnalysisPanel({ stock, onClose }: { stock: AllStock; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<StockTab>("차트");
  const [period, setPeriod] = useState<Period>("3M");
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["ma5", "ma20", "volume"]);
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const isWatchlisted = isWatched(stock.ticker);

  const chartData = useMemo(() => {
    const days = PERIOD_DAYS[period];
    return generateOHLC(days, stock.price);
  }, [stock.ticker, period]);

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const showMACD = activeIndicators.includes("macd");
  const showRSI = activeIndicators.includes("rsi");
  const showStoch = activeIndicators.includes("stoch");
  const showVolume = activeIndicators.includes("volume");
  const subPanelCount = [showMACD, showRSI, showStoch, showVolume].filter(Boolean).length;

  const financialData = [
    { year: "2021", revenue: 365.8, netIncome: 94.7, eps: 5.61 },
    { year: "2022", revenue: 394.3, netIncome: 99.8, eps: 6.11 },
    { year: "2023", revenue: 383.3, netIncome: 97.0, eps: 6.13 },
    { year: "2024E", revenue: 410.2, netIncome: 105.8, eps: 6.72 },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{stock.ticker}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stock.exchange}</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stock.sector}</Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xl font-bold font-mono-num">{stock.price.toLocaleString()}</div>
            <PctBadge value={stock.changePct} />
          </div>
          <button
            onClick={() => {
              if (isWatchlisted) { removeFromWatchlist(stock.ticker); toast.success("관심종목 해제"); }
              else {
                addToWatchlist({
                  ticker: stock.ticker, name: stock.name, exchange: stock.exchange,
                  price: stock.price, changePct: stock.changePct, sector: stock.sector || "기타"
                });
                toast.success("관심종목 추가");
              }
            }}
            className={cn("p-2 rounded-lg transition-colors", isWatchlisted ? "text-yellow-400 bg-yellow-400/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
          >
            <Star size={16} fill={isWatchlisted ? "currentColor" : "none"} />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 pt-2 border-b border-border overflow-x-auto">
        {STOCK_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("text-xs px-3 py-2 border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{tab}</button>
        ))}
      </div>

      <div className="p-4">
        {/* ── 차트 탭 ── */}
        {activeTab === "차트" && (
          <div className="space-y-3">
            {/* Period + Indicator controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                {(["1W", "1M", "3M", "1Y"] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={cn("px-2.5 py-1.5 font-medium transition-colors",
                      period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}>{p}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {INDICATOR_OPTIONS.map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => toggleIndicator(ind.id)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-medium border transition-all",
                      activeIndicators.includes(ind.id)
                        ? "border-transparent text-white"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                    style={activeIndicators.includes(ind.id) ? { background: ind.color + "33", borderColor: ind.color, color: ind.color } : {}}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main price chart */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false}
                    interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false}
                    domain={["dataMin * 0.97", "dataMax * 1.03"]}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0)} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }} />
                  <Area type="monotone" dataKey="close" stroke="#38bdf8" strokeWidth={1.5} fill="url(#priceGrad)" dot={false} name="종가" />
                  {activeIndicators.includes("bb") && (
                    <>
                      <Line type="monotone" dataKey="bb_upper" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" dot={false} name="BB상단" />
                      <Line type="monotone" dataKey="bb_lower" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" dot={false} name="BB하단" />
                      <Line type="monotone" dataKey="bb_mid" stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="2 3" dot={false} name="BB중심" />
                    </>
                  )}
                  {activeIndicators.includes("ma5") && (
                    <Line type="monotone" dataKey="ma5" stroke="#f59e0b" strokeWidth={1} dot={false} name="MA5" />
                  )}
                  {activeIndicators.includes("ma20") && (
                    <Line type="monotone" dataKey="ma20" stroke="#a855f7" strokeWidth={1} dot={false} name="MA20" />
                  )}
                  {activeIndicators.includes("ma60") && (
                    <Line type="monotone" dataKey="ma60" stroke="#38bdf8" strokeWidth={1} dot={false} name="MA60" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Sub panels */}
            {showVolume && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 font-medium">거래량</div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: -16 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }}
                        formatter={(v: number) => [`${(v / 1e6).toFixed(1)}M`, "거래량"]} />
                      <Bar dataKey="volume" fill="#64748b" opacity={0.6} radius={[1, 1, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {showMACD && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 font-medium">MACD</div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: -16 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }} />
                      <ReferenceLine y={0} stroke="var(--border)" />
                      <Bar dataKey="macd" fill="#22c55e" opacity={0.5} radius={[1, 1, 0, 0]} name="MACD" />
                      <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={1} dot={false} name="Signal" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {showRSI && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 font-medium">RSI</div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: -16 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }} />
                      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={0.8} />
                      <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 2" strokeWidth={0.8} />
                      <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="RSI" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {showStoch && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 font-medium">스토캐스틱</div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: -16 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }} />
                      <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 2" strokeWidth={0.8} />
                      <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="3 2" strokeWidth={0.8} />
                      <Line type="monotone" dataKey="stoch" stroke="#ec4899" strokeWidth={1.5} dot={false} name="Stoch %K" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 재무제표 탭 ── */}
        {activeTab === "재무제표" && (
          <div className="space-y-4">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="매출액" fill="#38bdf8" opacity={0.8} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="netIncome" name="순이익" fill="#22c55e" opacity={0.8} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">항목</th>
                {financialData.map(d => <th key={d.year} className="text-right py-2 px-2 text-muted-foreground font-medium">{d.year}</th>)}
              </tr></thead>
              <tbody>
                {[
                  { label: "매출액 ($B)", key: "revenue" as const },
                  { label: "순이익 ($B)", key: "netIncome" as const },
                  { label: "EPS ($)", key: "eps" as const },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-2 text-muted-foreground">{row.label}</td>
                    {financialData.map(d => (
                      <td key={d.year} className="py-2 px-2 text-right font-mono-num font-medium">{d[row.key].toFixed(1)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 밸류에이션 탭 ── */}
        {activeTab === "밸류에이션" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "PER", value: (stock.pe ?? 0).toFixed(1), desc: "주가수익비율", benchmark: "S&P500 평균 22x", good: (stock.pe ?? 99) < 22 },
                { label: "PBR", value: (stock.pbr ?? 0).toFixed(1), desc: "주가순자산비율", benchmark: "업종 평균 3.2x", good: (stock.pbr ?? 99) < 3.2 },
                { label: "ROE", value: `${(stock.roe ?? 0).toFixed(1)}%`, desc: "자기자본이익률", benchmark: "업종 평균 18%", good: (stock.roe ?? 0) > 18 },
                { label: "배당수익률", value: `${(stock.dividendYield ?? 0).toFixed(2)}%`, desc: "연간 배당/주가", benchmark: "S&P500 평균 1.5%", good: (stock.dividendYield ?? 0) > 1.5 },
              ].map(item => (
                <div key={item.label} className="p-3 bg-muted/20 rounded-xl border border-border/50">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className={cn("text-xl font-bold font-mono-num mt-0.5", item.good ? "text-up" : "text-down")}>
                    {item.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{item.desc}</div>
                  <div className="text-[10px] text-muted-foreground/60">{item.benchmark}</div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Brain size={12} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-primary mb-1">AI 밸류에이션 분석</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    현재 PER {(stock.pe ?? 0).toFixed(1)}x는 업종 평균 대비 {(stock.pe ?? 99) < 22 ? "저평가" : "고평가"} 구간입니다.
                    ROE {(stock.roe ?? 0).toFixed(1)}%의 {( stock.roe ?? 0) > 20 ? "우수한" : "보통 수준의"} 수익성을 감안하면
                    {( stock.pe ?? 99) < 15 && ( stock.roe ?? 0) > 20 ? " 매력적인 가치투자 후보입니다." :
                     (stock.pe ?? 0) > 40 ? " 성장 프리미엄이 상당 부분 반영된 상태입니다." :
                     " 적정 밸류에이션 범위 내에 있습니다."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 기술적 신호 탭 ── */}
        {activeTab === "기술적 신호" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "RSI (14)", value: "58.4", signal: "중립", color: "text-muted-foreground", desc: "과매수/과매도 아님" },
                { label: "MACD", value: "+2.84", signal: "매수", color: "text-up", desc: "MACD > 시그널선" },
                { label: "볼린저밴드", value: "중단", signal: "중립", color: "text-muted-foreground", desc: "밴드 중심 근처" },
                { label: "이동평균", value: "MA5>MA20", signal: "매수", color: "text-up", desc: "단기 골든크로스" },
                { label: "스토캐스틱", value: "64.2", signal: "중립", color: "text-muted-foreground", desc: "중립 구간" },
                { label: "거래량 추세", value: "+18%", signal: "강세", color: "text-up", desc: "평균 대비 증가" },
                { label: "ATR (14)", value: "12.4", signal: "보통", color: "text-muted-foreground", desc: "평균 변동성" },
                { label: "종합 신호", value: "매수 우세", signal: "매수", color: "text-up", desc: "5/8 지표 매수" },
              ].map(item => (
                <div key={item.label} className="p-2.5 bg-muted/20 rounded-lg border border-border/50">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className={cn("text-sm font-bold font-mono-num mt-0.5", item.color)}>{item.value}</div>
                  <div className={cn("text-[10px] font-medium mt-0.5", item.color)}>{item.signal}</div>
                  <div className="text-[10px] text-muted-foreground/60">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 뉴스 탭 ── */}
        {activeTab === "뉴스" && (
          <div className="space-y-2">
            {[
              { title: `${stock.ticker} Q1 실적 예상치 상회 — EPS $1.52 vs 예상 $1.43`, source: "Bloomberg", time: "2시간 전", sentiment: "positive" },
              { title: `애널리스트 목표가 상향 — ${stock.ticker} 목표가 $${(stock.price * 1.15).toFixed(0)}으로 조정`, source: "Goldman Sachs", time: "4시간 전", sentiment: "positive" },
              { title: `${stock.sector} 섹터 전반 조정 — 금리 우려 재부각`, source: "Reuters", time: "6시간 전", sentiment: "negative" },
              { title: `${stock.ticker} 신제품 발표 예정 — 다음 분기 매출 성장 기대`, source: "WSJ", time: "1일 전", sentiment: "positive" },
              { title: `기관 투자자 ${stock.ticker} 지분 확대 — 13F 공시`, source: "SEC Filing", time: "2일 전", sentiment: "positive" },
            ].map((news, i) => (
              <div key={i} className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/20 cursor-pointer",
                news.sentiment === "positive" ? "border-up/20" : "border-down/20"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                  news.sentiment === "positive" ? "bg-up" : "bg-down")} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-snug">{news.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="font-medium">{news.source}</span>
                    <span>{news.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI 요약 탭 ── */}
        {activeTab === "AI 요약" && (
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-primary" />
                <span className="text-sm font-semibold text-primary">AI 종합 분석</span>
                <span className="text-[10px] text-muted-foreground ml-auto">목업 데이터 기반</span>
              </div>
              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">{stock.name}({stock.ticker})</strong>은 현재 {stock.sector} 섹터에서
                  {stock.changePct > 0 ? " 상승 모멘텀을 유지하고 있습니다." : " 단기 조정 국면에 있습니다."}
                </p>
                <p>
                  <strong className="text-foreground">밸류에이션:</strong> PER {(stock.pe ?? 0).toFixed(1)}x, PBR {(stock.pbr ?? 0).toFixed(1)}x로
                  {(stock.pe ?? 99) < 20 ? " 업종 내 저평가 구간에 위치합니다." : " 성장 프리미엄이 반영된 수준입니다."}
                  ROE {(stock.roe ?? 0).toFixed(1)}%의 {( stock.roe ?? 0) > 20 ? "우수한" : "보통 수준의"} 수익성을 보이고 있습니다.
                </p>
                <p>
                  <strong className="text-foreground">기술적 분석:</strong> 단기 이동평균선이 장기 이동평균선 위에 위치하며
                  상승 추세를 유지하고 있습니다. RSI는 중립 구간으로 추가 상승 여력이 있습니다.
                </p>
                <p>
                  <strong className="text-foreground">투자 의견:</strong>
                  {(stock.pe ?? 99) < 20 && ( stock.roe ?? 0) > 20 ? " 가치와 성장이 균형 잡힌 매력적인 투자 후보입니다. 분할 매수 전략을 고려해볼 수 있습니다." :
                   (stock.pe ?? 0) > 40 ? " 높은 밸류에이션으로 리스크 관리가 중요합니다. 실적 발표 전후 변동성에 유의하세요." :
                   " 업종 평균 수준의 밸류에이션으로 시장 흐름에 연동되는 움직임이 예상됩니다."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "단기 전망", value: stock.changePct > 0 ? "긍정적" : "중립", color: stock.changePct > 0 ? "text-up" : "text-muted-foreground" },
                { label: "리스크 레벨", value: (stock.pe ?? 0) > 40 ? "높음" : (stock.pe ?? 0) > 25 ? "중간" : "낮음", color: (stock.pe ?? 0) > 40 ? "text-down" : (stock.pe ?? 0) > 25 ? "text-yellow-400" : "text-up" },
                { label: "투자 매력도", value: (stock.pe ?? 99) < 20 && ( stock.roe ?? 0) > 20 ? "★★★★★" : (stock.pe ?? 99) < 30 ? "★★★★" : "★★★", color: "text-yellow-400" },
              ].map(item => (
                <div key={item.label} className="p-2.5 bg-muted/20 rounded-lg text-center">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className={cn("font-bold mt-0.5", item.color)}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Analysis Page ───────────────────────────────────────
const MARKET_TABS: MarketTab[] = ["시장 개요", "섹터 로테이션", "스크리너", "수익률 비교"];

export default function Analysis() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<AllStock | null>(null);
  const [activeMarketTab, setActiveMarketTab] = useState<MarketTab>("시장 개요");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "US" | "KR">("ALL");
  const [macroIndicators] = useState<MacroIndicator[]>(MACRO_INDICATORS);
  const { watchlist, isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const allStocks = useMemo(() => [...US_STOCKS, ...KR_STOCKS], []);

  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const pool = marketFilter === "US" ? US_STOCKS : marketFilter === "KR" ? KR_STOCKS : allStocks;
    return pool.filter(s =>
      s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [searchQuery, marketFilter, allStocks]);

  const handleEditMacro = useCallback((_id: string) => {}, []);

  return (
    <div className="space-y-4 max-w-full">
      {/* Search bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["ALL", "US", "KR"] as const).map(m => (
              <button key={m} onClick={() => setMarketFilter(m)}
                className={cn("px-3 py-1.5 font-medium transition-colors",
                  marketFilter === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>
                {m === "ALL" ? "전체" : m === "US" ? "🇺🇸 미국" : "🇰🇷 한국"}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            종목을 검색하면 상세 분석 패널이 열립니다
          </div>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="종목 검색 (티커 또는 종목명) — 예: AAPL, 삼성전자, NVDA"
            className="w-full h-10 pl-9 pr-4 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
          />
        </div>

        {/* Search results */}
        {filteredStocks.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredStocks.map(s => {
              const watched = isWatched(s.ticker);
              return (
                <div
                  key={s.ticker}
                  onClick={() => { setSelectedStock(s); setSearchQuery(""); }}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all hover:border-primary/40 hover:bg-muted/20",
                    selectedStock?.ticker === s.ticker ? "border-primary/40 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{s.ticker}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{s.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <PctBadge value={s.changePct} size="xs" />
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (watched) { removeFromWatchlist(s.ticker); toast.success("관심종목 해제"); }
                        else {
                          addToWatchlist({ ticker: s.ticker, name: s.name, exchange: s.exchange, price: s.price, changePct: s.changePct, sector: s.sector || "기타" });
                          toast.success("관심종목 추가");
                        }
                      }}
                      className={cn("p-1 rounded transition-colors", watched ? "text-yellow-400" : "text-muted-foreground hover:text-foreground")}
                    >
                      <Star size={11} fill={watched ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Watchlist quick access */}
        {!searchQuery && watchlist.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
              <Star size={10} className="text-yellow-400" fill="currentColor" /> 관심종목 바로가기
            </div>
            <div className="flex flex-wrap gap-1.5">
              {watchlist.map(w => (
                <button
                  key={w.ticker}
                  onClick={() => {
                    const stock = allStocks.find(s => s.ticker === w.ticker);
                    if (stock) setSelectedStock(stock);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 text-xs transition-colors"
                >
                  <span className="font-bold">{w.ticker}</span>
                  <PctBadge value={w.changePct} size="xs" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stock analysis panel */}
      {selectedStock && (
        <StockAnalysisPanel stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}

      {/* Market analysis tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex gap-0 px-4 pt-3 border-b border-border overflow-x-auto">
          {MARKET_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveMarketTab(tab)}
              className={cn("text-sm px-4 py-2 border-b-2 transition-colors whitespace-nowrap",
                activeMarketTab === tab ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>{tab}</button>
          ))}
        </div>
        <div className="p-4">
          {activeMarketTab === "시장 개요" && (
            <MarketOverviewPanel macroIndicators={macroIndicators} onEditMacro={handleEditMacro} />
          )}
          {activeMarketTab === "섹터 로테이션" && <SectorRotationPanel />}
          {activeMarketTab === "스크리너" && <IntegratedScreenerPanel />}
          {activeMarketTab === "수익률 비교" && <ReturnComparisonPanel />}
        </div>
      </div>
    </div>
  );
}
