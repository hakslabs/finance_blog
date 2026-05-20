// Design: Brutalist-Financial Dark Theme - Master Detail
// Layout: Header + sticky tab bar + tab content panels
// Color: slate-950 bg, emerald accent, mono typography
import { useState, useContext } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import {
  ArrowLeft, Bell, BellOff, Bookmark, BookmarkCheck,
  TrendingUp, TrendingDown, Building2, Globe, GraduationCap,
  Calendar, FileText, Target, ChevronRight, Award,
  Briefcase, BookOpen, BarChart2, History, Newspaper,
  PlusCircle, MinusCircle, RefreshCw, Minus, Clock, Quote
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MASTERS } from "@/services/mockData";
import { FollowContext } from "@/contexts/FollowContext";
import { BookmarkContext } from "@/contexts/BookmarkContext";
import { toast } from "sonner";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#ef4444", "#f97316", "#84cc16"];

const TABS = [
  { id: "overview", label: "개요", icon: Award },
  { id: "portfolio", label: "포트폴리오", icon: BarChart2 },
  { id: "philosophy", label: "투자철학", icon: BookOpen },
  { id: "career", label: "경력·스토리", icon: Briefcase },
  { id: "13f", label: "13F 보고서", icon: FileText },
  { id: "thesis", label: "투자판단근거", icon: Target },
  { id: "news", label: "관련 뉴스", icon: Newspaper },
];

const CHANGE_ICONS: Record<string, any> = {
  increased: PlusCircle,
  decreased: MinusCircle,
  new: TrendingUp,
  unchanged: Minus,
};
const CHANGE_COLORS: Record<string, string> = {
  increased: "text-emerald-400",
  decreased: "text-red-400",
  new: "text-blue-400",
  unchanged: "text-muted-foreground",
};
const CHANGE_LABELS: Record<string, string> = {
  increased: "확대",
  decreased: "축소",
  new: "신규",
  unchanged: "유지",
};

const UPDATE_TYPE_COLORS: Record<string, string> = {
  "13F": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "인터뷰": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "포트폴리오": "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

// 가상 뉴스 데이터
const MASTER_NEWS: Record<string, any[]> = {
  "warren-buffett": [
    { id: 1, title: "버핏, 애플 지분 추가 매도...현금 보유량 사상 최대", date: "2026-05-15", source: "Bloomberg", summary: "버크셔 해서웨이가 Q1 2026 13F에서 애플 지분을 12.4% 추가 매도한 것으로 확인됐다." },
    { id: 2, title: "버핏 주주 연례 미팅: AI는 도구, 수익력이 핵심", date: "2026-05-04", source: "CNBC", summary: "워런 버핏은 오마하 주주 연례 미팅에서 AI 기술에 대한 견해를 밝히며 기업의 수익력을 강조했다." },
    { id: 3, title: "버크셔 Q1 순이익 $125억...운영 수익 사상 최고", date: "2026-04-28", source: "Reuters", summary: "버크셔 해서웨이의 Q1 2026 운영 수익이 사상 최고치를 기록했다." },
  ],
  "ray-dalio": [
    { id: 1, title: "달리오, 미국 부채 위기 경고...달러 패권 약화 가능성", date: "2026-05-10", source: "LinkedIn", summary: "레이 달리오가 링크드인 포스팅을 통해 미국의 부채 수준이 역사적 임계점에 근접했다고 경고했다." },
    { id: 2, title: "브리지워터, 신흥국 ETF 비중 확대...달러 약세 대응", date: "2026-02-20", source: "FT", summary: "브리지워터 어소시에이츠가 Q4 2025 13F에서 신흥국 ETF 비중을 확대한 것으로 나타났다." },
  ],
  "michael-burry": [
    { id: 1, title: "버리, 중국 기술주 추가 매수...JD.com PER 6배 주목", date: "2026-05-12", source: "X(Twitter)", summary: "마이클 버리가 X 포스팅을 통해 중국 기술주의 극단적 저평가를 언급하며 추가 매수 의사를 밝혔다." },
    { id: 2, title: "사이온 Q4 2025 13F: 알리바바 신규 편입, JD.com 비중 확대", date: "2026-02-14", source: "SEC", summary: "마이클 버리의 사이온 자산운용이 알리바바를 신규 편입하고 JD.com 비중을 확대했다." },
  ],
  "cathie-wood": [
    { id: 1, title: "캐시 우드, AI 혁명 2단계 시작...ARK 수혜주 비중 확대", date: "2026-05-08", source: "CNBC", summary: "캐시 우드가 CNBC 인터뷰에서 AI 추론 비용 급감으로 기업 도입이 가속화되고 있다고 밝혔다." },
    { id: 2, title: "ARK, UiPath 신규 편입...Zoom 완전 매도", date: "2026-02-14", source: "ARK Invest", summary: "ARK 인베스트가 Q4 2025 13F에서 UiPath를 신규 편입하고 Zoom을 완전 매도했다." },
  ],
};

// 가상 역대 변화 차트 데이터
function getHistoricalData(id: string) {
  const base = id === "warren-buffett" ? 100 : id === "ray-dalio" ? 80 : id === "michael-burry" ? 60 : 120;
  return Array.from({ length: 8 }, (_, i) => ({
    quarter: `${2024 + Math.floor(i / 4)}Q${(i % 4) + 1}`,
    value: base + Math.sin(i * 0.8) * 20 + i * 3,
    holdings: 40 + Math.floor(Math.random() * 20),
  }));
}

export default function MasterDetail() {
  const { id } = useParams<{ id: string }>();
  const followCtx = useContext(FollowContext);
  const bookmarkCtx = useContext(BookmarkContext);
  const [activeTab, setActiveTab] = useState("overview");

  const master = MASTERS.find((m) => m.id === id);

  if (!master) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">거장을 찾을 수 없습니다.</p>
          <Link href="/masters">
            <button className="text-emerald-400 hover:underline text-sm">목록으로 돌아가기</button>
          </Link>
        </div>
      </div>
    );
  }

  const isFollowing = followCtx?.isFollowing(master.id) ?? false;
  const isBookmarked = bookmarkCtx?.isBookmarked("master", master.id) ?? false;
  const career = (master as any).career || [];
  const story = (master as any).story || master.bio;
  const investmentThesis = (master as any).investmentThesis || [];
  const sectors = (master as any).sectors || [];
  const style = (master as any).style || [];
  const updates = (master as any).updates || [];
  const firm = (master as any).firm || master.fund;
  const cagr5y = (master as any).cagr5y;
  const holdings = (master as any).holdings;
  const lastFiling = (master as any).lastFiling || master.reportDate;
  const nationality = (master as any).nationality || "미국";
  const birthYear = (master as any).birthYear;
  const education = (master as any).education;
  const strategyDetail = (master as any).strategyDetail;

  const news = MASTER_NEWS[master.id] || [];
  const historicalData = getHistoricalData(master.id);

  const pieData = master.topHoldings.map((h) => ({
    name: h.ticker,
    value: h.weight,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 헤더 */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/masters">
                <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-border flex items-center justify-center">
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {master.nameKo.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold">{master.nameKo}</h1>
                    <span className="text-xs text-muted-foreground font-mono">{master.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{master.title} · {firm}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isBookmarked) {
                    bookmarkCtx?.removeBookmark("master", master.id);
                    toast.success("북마크 제거");
                  } else {
                    bookmarkCtx?.addBookmark("master", master.id, { title: master.nameKo, subtitle: master.fund, href: `/masters/${master.id}` });
                    toast.success("북마크 추가");
                  }
                }}
                className={`p-2 rounded-lg border transition-all ${
                  isBookmarked
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  if (isFollowing) {
                    followCtx?.unfollow(master.id);
                    toast.success(`${master.nameKo} 팔로우 취소`);
                  } else {
                    followCtx?.follow(master.id);
                    toast.success(`${master.nameKo} 팔로우 시작!`);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isFollowing
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30"
                }`}
              >
                {isFollowing ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                {isFollowing ? "팔로잉" : "팔로우"}
              </button>
            </div>
          </div>
        </div>

        {/* 탭 바 */}
        <div className="max-w-6xl mx-auto px-4 border-t border-border/30">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* ── 개요 탭 ── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* 핵심 지표 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "YTD 수익률", value: `${master.returnYtd >= 0 ? "+" : ""}${master.returnYtd}%`, color: master.returnYtd >= 0 ? "text-emerald-400" : "text-red-400" },
                    { label: "5년 수익률", value: `${master.return5y >= 0 ? "+" : ""}${master.return5y}%`, color: master.return5y >= 0 ? "text-emerald-400" : "text-red-400" },
                    { label: "5년 CAGR", value: cagr5y != null ? `${cagr5y >= 0 ? "+" : ""}${cagr5y}%` : "—", color: cagr5y != null && cagr5y >= 0 ? "text-emerald-400" : "text-red-400" },
                    { label: "운용규모", value: master.aum, color: "text-foreground" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card border border-border/50 rounded-xl p-4">
                      <div className="text-[10px] text-muted-foreground mb-1">{stat.label}</div>
                      <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* 기본 정보 + 전략 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      기본 정보
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: "운용사", value: firm },
                        { label: "국적", value: nationality },
                        { label: "출생연도", value: birthYear ? `${birthYear}년` : "—" },
                        { label: "학력", value: education || "—" },
                        { label: "보유 종목 수", value: holdings ? `${holdings}개` : "—" },
                        { label: "최근 13F 제출", value: lastFiling },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-4">
                          <span className="text-xs text-muted-foreground flex-shrink-0">{item.label}</span>
                          <span className="text-xs text-right">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card border border-border/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      투자 전략
                    </h3>
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/30 mb-2">
                        {master.strategy}
                      </Badge>
                      {strategyDetail && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{strategyDetail}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {style.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="text-[10px] text-muted-foreground mb-1.5">주요 섹터</div>
                      <div className="flex flex-wrap gap-1.5">
                        {sectors.map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/30">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 최근 업데이트 */}
                {updates.length > 0 && (
                  <div className="bg-card border border-border/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      최근 업데이트
                    </h3>
                    <div className="space-y-3">
                      {updates.map((u: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${UPDATE_TYPE_COLORS[u.type] || "bg-muted/50 text-muted-foreground border-border"}`}>
                            {u.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-xs font-medium">{u.title}</p>
                              <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0 ml-2">{u.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{u.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 포트폴리오 탭 ── */}
            {activeTab === "portfolio" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 파이 차트 */}
                  <div className="bg-card border border-border/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-4">포트폴리오 구성</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => [`${v}%`, "비중"]}
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-[10px] text-muted-foreground">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 상위 보유 종목 */}
                  <div className="bg-card border border-border/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-4">상위 보유 종목</h3>
                    <div className="space-y-3">
                      {master.topHoldings.map((h, i) => {
                        const ChangeIcon = CHANGE_ICONS[h.change] || Minus;
                        return (
                          <div key={h.ticker} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold font-mono">{h.ticker}</span>
                                  <span className="text-[10px] text-muted-foreground truncate">{h.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <ChangeIcon className={`w-3 h-3 ${CHANGE_COLORS[h.change]}`} />
                                  <span className={`text-[10px] ${CHANGE_COLORS[h.change]}`}>
                                    {CHANGE_LABELS[h.change]}
                                    {h.changePct != null ? ` ${h.changePct > 0 ? "+" : ""}${h.changePct}%` : ""}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.min(h.weight * 2, 100)}%`, background: COLORS[i % COLORS.length] }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{h.weight}%</span>
                                <span className="text-[10px] text-muted-foreground w-16 text-right">{h.value}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 섹터 배분 바 차트 */}
                <div className="bg-card border border-border/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4">섹터별 배분</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={sectors.map((s: string, i: number) => ({ name: s, value: 30 - i * 5 + Math.random() * 10 }))}
                      layout="vertical"
                      margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                      <Tooltip formatter={(v: any) => [`${v.toFixed(1)}%`, "비중"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── 투자철학 탭 ── */}
            {activeTab === "philosophy" && (
              <div className="space-y-6">
                {/* 핵심 원칙 */}
                <div className="bg-card border border-border/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    핵심 투자 원칙
                  </h3>
                  <div className="space-y-4">
                    {master.philosophy.map((p, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-muted/20 rounded-xl border border-border/30">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold font-mono text-emerald-400">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <Quote className="w-3 h-3 text-muted-foreground mb-1" />
                          <p className="text-sm leading-relaxed">{p}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 전략 상세 */}
                {strategyDetail && (
                  <div className="bg-card border border-border/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      전략 상세
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{strategyDetail}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── 경력·스토리 탭 ── */}
            {activeTab === "career" && (
              <div className="space-y-6">
                {/* 스토리 */}
                <div className="bg-card border border-border/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    투자 스토리
                  </h3>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {story}
                  </div>
                </div>

                {/* 경력 타임라인 */}
                {career.length > 0 && (
                  <div className="bg-card border border-border/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
                      <History className="w-4 h-4 text-violet-400" />
                      경력 타임라인
                    </h3>
                    <div className="relative">
                      <div className="absolute left-[3.25rem] top-0 bottom-0 w-px bg-border/50" />
                      <div className="space-y-4">
                        {career.map((c: any, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex items-start gap-4"
                          >
                            <div className="w-12 text-right flex-shrink-0">
                              <span className="text-[10px] font-mono text-muted-foreground">{c.year}</span>
                            </div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500/40 border-2 border-emerald-500 flex-shrink-0 mt-0.5 relative z-10" />
                            <div className="flex-1 pb-2">
                              <p className="text-sm font-medium">{c.event}</p>
                              {c.detail && (
                                <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 13F 보고서 탭 ── */}
            {activeTab === "13f" && (
              <div className="space-y-6">
                <div className="bg-card border border-border/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      최근 13F 보고서
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">최근 제출:</span>
                      <span className="text-[10px] font-mono text-emerald-400">{lastFiling}</span>
                    </div>
                  </div>

                  {/* 변동 요약 */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "신규 편입", count: master.topHoldings.filter(h => h.change === "new").length, color: "text-blue-400", bg: "bg-blue-500/10" },
                      { label: "비중 확대", count: master.topHoldings.filter(h => h.change === "increased").length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                      { label: "비중 축소", count: master.topHoldings.filter(h => h.change === "decreased").length, color: "text-red-400", bg: "bg-red-500/10" },
                      { label: "유지", count: master.topHoldings.filter(h => h.change === "unchanged").length, color: "text-muted-foreground", bg: "bg-muted/30" },
                    ].map((stat) => (
                      <div key={stat.label} className={`${stat.bg} rounded-lg p-3 text-center`}>
                        <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.count}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* 종목 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 text-muted-foreground font-medium">종목</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">비중</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">주식 수</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">평가액</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">변동</th>
                        </tr>
                      </thead>
                      <tbody>
                        {master.topHoldings.map((h) => {
                          const ChangeIcon = CHANGE_ICONS[h.change] || Minus;
                          return (
                            <tr key={h.ticker} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold font-mono">{h.ticker}</span>
                                  <span className="text-muted-foreground hidden sm:block">{h.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-mono">{h.weight}%</td>
                              <td className="py-2.5 text-right text-muted-foreground">{h.shares}</td>
                              <td className="py-2.5 text-right text-muted-foreground">{h.value}</td>
                              <td className="py-2.5 text-right">
                                <div className={`flex items-center justify-end gap-1 ${CHANGE_COLORS[h.change]}`}>
                                  <ChangeIcon className="w-3 h-3" />
                                  <span>{CHANGE_LABELS[h.change]}</span>
                                  {h.changePct != null && (
                                    <span className="font-mono">{h.changePct > 0 ? "+" : ""}{h.changePct}%</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── 투자판단근거 탭 ── */}
            {activeTab === "thesis" && (
              <div className="space-y-4">
                {investmentThesis.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">투자판단근거 데이터가 없습니다.</p>
                  </div>
                ) : (
                  investmentThesis.map((thesis: any, i: number) => (
                    <motion.div
                      key={thesis.ticker}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="bg-card border border-border/50 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                            <span className="text-sm font-bold font-mono text-emerald-400">{thesis.ticker}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">{thesis.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              {thesis.entryDate && (
                                <span className="text-[10px] text-muted-foreground">진입: {thesis.entryDate}</span>
                              )}
                              {thesis.status && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                  {thesis.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {thesis.targetReturn && (
                          <div className="text-right">
                            <div className="text-[10px] text-muted-foreground">목표 수익률</div>
                            <div className="text-sm font-bold font-mono text-emerald-400">{thesis.targetReturn}</div>
                          </div>
                        )}
                      </div>
                      <div className="bg-muted/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">{thesis.reason}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ── 관련 뉴스 탭 ── */}
            {activeTab === "news" && (
              <div className="space-y-3">
                {news.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">관련 뉴스가 없습니다.</p>
                  </div>
                ) : (
                  news.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="bg-card border border-border/50 rounded-xl p-4 hover:border-emerald-500/30 transition-colors cursor-pointer"
                      onClick={() => toast.info(`${item.source}: ${item.title}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              {item.source}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">{item.date}</span>
                          </div>
                          <h4 className="text-sm font-semibold mb-1 hover:text-emerald-400 transition-colors">{item.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
