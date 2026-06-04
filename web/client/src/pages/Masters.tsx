// Design: Brutalist-Financial Dark Theme — Research Hub
// Layout: Four-tab explorer: 거장 탐색 | 전략별 보기 | 보유·변화 | 팔로잉 피드
// Color: slate-950 bg, emerald accent, mono typography
import { useState, useContext, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Bell,
  BellOff,
  Filter,
  ChevronRight,
  Award,
  Zap,
  Building2,
  Star,
  TrendingUp,
  BarChart3,
  Rss,
  Eye,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MASTERS } from "@/services/mockData";
import { useMasters } from "@/features/masters";
import { FollowContext } from "@/contexts/FollowContext";
import { followsService } from "@/features/follows";
import { toast } from "sonner";

const STRATEGY_FILTERS = ["전체", "가치투자", "성장투자", "매크로", "역발상"];
const SECTOR_FILTERS = [
  "전체",
  "테크",
  "금융",
  "소비재",
  "에너지",
  "바이오",
  "ETF",
];
const AUM_FILTERS = ["전체", "$100억 이상", "$1,000억 이상", "$1조 이상"];

const UPDATE_TYPE_COLORS: Record<string, string> = {
  "13F": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  인터뷰: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  포트폴리오: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

/** Strategy group display config for 전략별 보기 */
const STRATEGY_GROUPS: {
  key: string;
  label: string;
  color: string;
  description: string;
}[] = [
  {
    key: "가치투자",
    label: "가치투자",
    color: "emerald",
    description:
      "저평가된 우량 기업을 장기 보유하며 내재 가치 회복을 기다립니다.",
  },
  {
    key: "성장투자",
    label: "성장투자",
    color: "sky",
    description:
      "높은 성장 잠재력을 가진 기업에 투자하며 수익 확대를 추구합니다.",
  },
  {
    key: "매크로",
    label: "매크로",
    color: "violet",
    description: "경제 사이클과 글로벌 흐름을 읽어 자산 배분을 조정합니다.",
  },
  {
    key: "역발상",
    label: "역발상",
    color: "gold",
    description:
      "시장의 반대편에 서서 과매도/과매수 구간에서 기회를 포착합니다.",
  },
];

function parseAum(aum: string): number {
  const n = parseFloat(aum.replace(/[^0-9.]/g, ""));
  if (aum.includes("조")) return n * 10000;
  if (aum.includes("억")) return n;
  return n;
}

function changeIcon(change: string) {
  if (change === "increased")
    return <ArrowUpRight className="w-3 h-3 text-emerald-400" />;
  if (change === "decreased")
    return <ArrowDownRight className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

type ActiveTab = "explore" | "strategy" | "holdings" | "feed";

const TABS: { key: ActiveTab; label: string; icon: typeof Users }[] = [
  { key: "explore", label: "거장 탐색", icon: Users },
  { key: "strategy", label: "전략별 보기", icon: TrendingUp },
  { key: "holdings", label: "보유·변화", icon: BarChart3 },
  { key: "feed", label: "팔로잉 피드", icon: Rss },
];

export default function Masters() {
  const followCtx = useContext(FollowContext);
  const [strategyFilter, setStrategyFilter] = useState("전체");
  const [sectorFilter, setSectorFilter] = useState("전체");
  const [aumFilter, setAumFilter] = useState("전체");
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("explore");

  // Live masters list. Falls back to the mock array inside useMasters
  // when the DB is empty, so the page never blanks on preview envs.
  const { data: liveMasters } = useMasters();
  const mastersList: typeof MASTERS = (liveMasters as any) ?? MASTERS;

  /* ── Shared filtered list (used by explore + strategy) ── */
  const filteredMasters = useMemo(() => {
    return mastersList.filter((m) => {
      if (showFollowedOnly && !followCtx?.isFollowing(m.id)) return false;
      if (strategyFilter !== "전체") {
        const styles = (m as any).style || [];
        if (
          !styles.some((s: string) =>
            s.includes(strategyFilter.replace("투자", "")),
          )
        )
          return false;
      }
      if (sectorFilter !== "전체") {
        const sectors = (m as any).sectors || [];
        if (!sectors.some((s: string) => s.includes(sectorFilter)))
          return false;
      }
      if (aumFilter !== "전체") {
        const aumVal = parseAum(m.aum);
        if (aumFilter === "$100억 이상" && aumVal < 100) return false;
        if (aumFilter === "$1,000억 이상" && aumVal < 1000) return false;
        if (aumFilter === "$1조 이상" && aumVal < 10000) return false;
      }
      return true;
    });
  }, [
    mastersList,
    showFollowedOnly,
    followCtx,
    strategyFilter,
    sectorFilter,
    aumFilter,
  ]);

  /* ── Feed items (followed masters' updates) ── */
  const feedItems = useMemo(() => {
    return mastersList
      .filter((m) => followCtx?.isFollowing(m.id))
      .flatMap((m) =>
        ((m as any).updates || []).map((u: any) => ({
          ...u,
          masterId: m.id,
          masterName: m.nameKo,
          masterFund: m.fund,
        })),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mastersList, followCtx]);

  /* ── Strategy-grouped masters (for 전략별 보기) ── */
  const strategyGrouped = useMemo(() => {
    return STRATEGY_GROUPS.map((group) => {
      const members = filteredMasters.filter((m) => {
        const styles = (m as any).style || [];
        return styles.some((s: string) => s.includes(group.key));
      });
      return { ...group, members };
    }).filter((g) => g.members.length > 0);
  }, [filteredMasters]);

  /* ── Holdings-sorted masters (for 보유·변화) ── */
  const holdingsData = useMemo(() => {
    return filteredMasters
      .map((m) => ({
        master: m,
        topHoldings: m.topHoldings || [],
        updates: (m as any).updates || [],
        lastFiling: (m as any).lastFiling || null,
        reportDate: m.reportDate || null,
        netChange:
          m.topHoldings?.reduce((sum, h) => sum + (h.changePct || 0), 0) ?? 0,
      }))
      .sort((a, b) => Math.abs(b.netChange) - Math.abs(a.netChange));
  }, [filteredMasters]);

  const followedCount = mastersList.filter((m) =>
    followCtx?.isFollowing(m.id),
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-mono tracking-tight">
                  고수 따라잡기
                </h1>
                <p className="text-xs text-muted-foreground">
                  세계 최고 투자자들의 전략을 분석합니다
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFollowedOnly(!showFollowedOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showFollowedOnly
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              팔로우 중 {followedCount > 0 && `(${followedCount})`}
            </button>
          </div>

          {/* ── Tab Bar ── */}
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              const feedBadge =
                key === "feed" && feedItems.length > 0 ? (
                  <span className="ml-1.5 w-4 h-4 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {feedItems.length}
                  </span>
                ) : null;

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : ""}`}
                  />
                  {label}
                  {feedBadge}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Educational banner ── */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-start gap-2.5 px-4 py-3 bg-sky-500/8 border border-sky-500/20 rounded-lg">
          <Lightbulb className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            고수들의 포트폴리오는{" "}
            <span className="text-foreground font-medium">참고 자료</span>이지
            매매 신호가 아닙니다. 각 거장의 투자 맥락과 시기, 그리고 본인의
            상황을 비교해보세요. 같은 종목이라도 진입 시점과 목적이 다를 수
            있습니다.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════════════════
              TAB 1: 거장 탐색 — Filterable master grid
             ════════════════════════════════════════════════════════ */}
          {activeTab === "explore" && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    전략
                  </span>
                  {STRATEGY_FILTERS.map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setStrategyFilter(f)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        strategyFilter === f
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">
                    섹터
                  </span>
                  {SECTOR_FILTERS.map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setSectorFilter(f)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        sectorFilter === f
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">
                    운용규모
                  </span>
                  {AUM_FILTERS.map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setAumFilter(f)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        aumFilter === f
                          ? "bg-violet-500/20 text-violet-400 border border-violet-500/40"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMasters.map((master, i) => {
                  const isFollowing =
                    followCtx?.isFollowing(master.id) ?? false;
                  const updates = (master as any).updates || [];
                  const latestUpdate = updates[0];
                  const sectors = (master as any).sectors || [];

                  return (
                    <motion.div
                      key={master.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                      className="group bg-card border border-border/50 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5"
                    >
                      {/* Card header */}
                      <div className="p-5 pb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-border flex items-center justify-center flex-shrink-0">
                              <span className="text-lg font-bold font-mono text-emerald-400">
                                {master.nameKo.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm">
                                  {master.nameKo}
                                </h3>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {master.name}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {master.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {master.fund}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (isFollowing) {
                                followCtx?.unfollow(master.id);
                                toast.success(`${master.nameKo} 팔로우 취소`);
                              } else {
                                followCtx?.follow(master.id);
                                toast.success(
                                  `${master.nameKo} 팔로우 시작! 업데이트 소식을 받습니다.`,
                                );
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isFollowing
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                                : "bg-muted/50 text-muted-foreground border border-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <Bell className="w-3 h-3" />
                                팔로잉
                              </>
                            ) : (
                              <>
                                <BellOff className="w-3 h-3" />
                                팔로우
                              </>
                            )}
                          </button>
                        </div>

                        {/* Return metrics */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-muted/30 rounded-lg p-2.5">
                            <div className="text-[10px] text-muted-foreground mb-1">
                              YTD 수익률
                            </div>
                            <div
                              className={`text-sm font-bold font-mono ${master.returnYtd >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {master.returnYtd >= 0 ? "+" : ""}
                              {master.returnYtd}%
                            </div>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2.5">
                            <div className="text-[10px] text-muted-foreground mb-1">
                              5년 수익률
                            </div>
                            <div
                              className={`text-sm font-bold font-mono ${master.return5y >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {master.return5y >= 0 ? "+" : ""}
                              {master.return5y}%
                            </div>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2.5">
                            <div className="text-[10px] text-muted-foreground mb-1">
                              운용규모
                            </div>
                            <div className="text-sm font-bold font-mono text-foreground">
                              {master.aum}
                            </div>
                          </div>
                        </div>

                        {/* Strategy tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-400 border-violet-500/30"
                          >
                            {master.strategy}
                          </Badge>
                          {sectors.slice(0, 3).map((s: string) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 text-muted-foreground"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>

                        {/* Top holdings */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            주요 보유
                          </span>
                          <div className="flex gap-1">
                            {master.topHoldings.slice(0, 4).map((h) => (
                              <span
                                key={h.ticker}
                                className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded text-foreground"
                              >
                                {h.ticker}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Latest update */}
                      {latestUpdate && (
                        <div className="px-5 py-3 bg-muted/20 border-t border-border/30">
                          <div className="flex items-start gap-2">
                            <Zap className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded border ${UPDATE_TYPE_COLORS[latestUpdate.type] || "bg-muted/50 text-muted-foreground border-border"}`}
                                >
                                  {latestUpdate.type}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {latestUpdate.date}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {latestUpdate.title}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detail link */}
                      <Link href={`/masters/${master.id}`}>
                        <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between group-hover:bg-emerald-500/5 transition-colors cursor-pointer">
                          <span className="text-xs text-muted-foreground">
                            포트폴리오 · 투자철학 · 13F 분석
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {filteredMasters.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">조건에 맞는 거장이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStrategyFilter("전체");
                      setSectorFilter("전체");
                      setAumFilter("전체");
                      setShowFollowedOnly(false);
                    }}
                    className="mt-2 text-xs text-emerald-400 hover:underline"
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
                TAB 2: 전략별 보기 — Grouped by investment style
               ════════════════════════════════════════════════════════ */}
          {activeTab === "strategy" && (
            <motion.div
              key="strategy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-6 mt-6"
            >
              {strategyGrouped.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">표시할 데이터가 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStrategyFilter("전체");
                      setSectorFilter("전체");
                      setShowFollowedOnly(false);
                    }}
                    className="mt-2 text-xs text-emerald-400 hover:underline"
                  >
                    필터 초기화
                  </button>
                </div>
              ) : (
                strategyGrouped.map((group, gi) => (
                  <section key={group.key}>
                    {/* Group header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          group.color === "emerald"
                            ? "bg-emerald-500/15"
                            : group.color === "sky"
                              ? "bg-sky-500/15"
                              : group.color === "violet"
                                ? "bg-violet-500/15"
                                : "bg-gold/15"
                        }`}
                      >
                        <TrendingUp
                          className={`w-3.5 h-3.5 ${
                            group.color === "emerald"
                              ? "text-emerald-400"
                              : group.color === "sky"
                                ? "text-sky-400"
                                : group.color === "violet"
                                  ? "text-violet-accent"
                                  : "text-gold"
                          }`}
                        />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold">{group.label}</h2>
                        <p className="text-[11px] text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] bg-muted/50"
                      >
                        {group.members.length}명
                      </Badge>
                    </div>

                    {/* Group member cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.members.map((master, mi) => {
                        const isFollowing =
                          followCtx?.isFollowing(master.id) ?? false;
                        const styles = (master as any).style || [];

                        return (
                          <motion.div
                            key={master.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: gi * 0.06 + mi * 0.04,
                              duration: 0.2,
                            }}
                            className="group bg-card border border-border/50 rounded-xl p-4 hover:border-emerald-500/25 transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/15 to-blue-500/15 border border-border flex items-center justify-center flex-shrink-0">
                                  <span className="text-base font-bold font-mono text-emerald-400">
                                    {master.nameKo.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="font-semibold text-sm">
                                      {master.nameKo}
                                    </h3>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {master.name}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {master.fund}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (isFollowing) {
                                    followCtx?.unfollow(master.id);
                                    toast.success(
                                      `${master.nameKo} 팔로우 취소`,
                                    );
                                  } else {
                                    followCtx?.follow(master.id);
                                    toast.success(
                                      `${master.nameKo} 팔로우 시작!`,
                                    );
                                  }
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                                  isFollowing
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-muted/40 text-muted-foreground border border-border hover:text-emerald-400 hover:border-emerald-500/30"
                                }`}
                              >
                                {isFollowing ? (
                                  <>
                                    <Bell className="w-3 h-3" />
                                    팔로잉
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="w-3 h-3" />
                                    팔로우
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Style tags */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {styles.map((s: string) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-px ${
                                    group.color === "emerald"
                                      ? "bg-emerald-500/8 text-emerald-400 border-emerald-500/20"
                                      : group.color === "sky"
                                        ? "bg-sky-500/8 text-sky-400 border-sky-500/20"
                                        : group.color === "violet"
                                          ? "bg-violet-500/8 text-violet-accent border-violet-500/20"
                                          : "bg-gold/8 text-gold border-gold/20"
                                  }`}
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>

                            {/* Mini metrics */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-muted/25 rounded-md p-2 text-center">
                                <div className="text-[9px] text-muted-foreground mb-0.5">
                                  YTD
                                </div>
                                <div
                                  className={`text-xs font-bold font-mono ${master.returnYtd >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {master.returnYtd >= 0 ? "+" : ""}
                                  {master.returnYtd}%
                                </div>
                              </div>
                              <div className="bg-muted/25 rounded-md p-2 text-center">
                                <div className="text-[9px] text-muted-foreground mb-0.5">
                                  5년
                                </div>
                                <div
                                  className={`text-xs font-bold font-mono ${master.return5y >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {master.return5y >= 0 ? "+" : ""}
                                  {master.return5y}%
                                </div>
                              </div>
                              <div className="bg-muted/25 rounded-md p-2 text-center">
                                <div className="text-[9px] text-muted-foreground mb-0.5">
                                  AUM
                                </div>
                                <div className="text-xs font-bold font-mono text-foreground">
                                  {master.aum}
                                </div>
                              </div>
                            </div>

                            {/* Top holdings strip */}
                            <div className="flex items-center gap-1.5 mb-3">
                              <Eye className="w-3 h-3 text-muted-foreground" />
                              <div className="flex gap-1 flex-wrap">
                                {master.topHoldings.slice(0, 5).map((h) => (
                                  <span
                                    key={h.ticker}
                                    className="text-[10px] font-mono bg-muted/40 px-1 py-px rounded text-foreground inline-flex items-center gap-1"
                                  >
                                    {h.ticker}
                                    {changeIcon(h.change)}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Detail link */}
                            <Link href={`/masters/${master.id}`}>
                              <div className="pt-2 border-t border-border/30 flex items-center justify-between group-hover:text-emerald-400 transition-colors cursor-pointer">
                                <span className="text-[10px] text-muted-foreground group-hover:text-emerald-400/70">
                                  전략 심층 분석 보기
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 3: 보유·변화 — Holdings & activity summary
             ════════════════════════════════════════════════════════ */}
          {activeTab === "holdings" && (
            <motion.div
              key="holdings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="mt-6 space-y-4"
            >
              {holdingsData.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">표시할 데이터가 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFollowedOnly(false);
                      setStrategyFilter("전체");
                      setSectorFilter("전체");
                    }}
                    className="mt-2 text-xs text-emerald-400 hover:underline"
                  >
                    필터 초기화
                  </button>
                </div>
              ) : (
                holdingsData.map((item, i) => {
                  const {
                    master,
                    topHoldings,
                    updates,
                    lastFiling,
                    reportDate,
                    netChange,
                  } = item;
                  const isFollowing =
                    followCtx?.isFollowing(master.id) ?? false;
                  const latestUpdate = updates[0];
                  const increasedHoldings = topHoldings.filter(
                    (h) => h.change === "increased",
                  );
                  const decreasedHoldings = topHoldings.filter(
                    (h) => h.change === "decreased",
                  );

                  return (
                    <motion.div
                      key={master.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.22 }}
                      className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-emerald-500/25 transition-all"
                    >
                      {/* Master header row */}
                      <div className="p-5 pb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-violet-500/15 border border-border flex items-center justify-center flex-shrink-0">
                              <span className="text-lg font-bold font-mono text-emerald-400">
                                {master.nameKo.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm">
                                  {master.nameKo}
                                </h3>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {master.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {master.fund} · {master.strategy}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Net change indicator */}
                            {netChange !== 0 && (
                              <span
                                className={`text-[10px] font-mono px-2 py-1 rounded-md ${
                                  netChange > 0
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                순변동 {netChange > 0 ? "+" : ""}
                                {netChange.toFixed(1)}%
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                if (isFollowing) {
                                  followCtx?.unfollow(master.id);
                                  toast.success(`${master.nameKo} 팔로우 취소`);
                                } else {
                                  followCtx?.follow(master.id);
                                  toast.success(
                                    `${master.nameKo} 팔로우 시작!`,
                                  );
                                }
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                                isFollowing
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-muted/40 text-muted-foreground border border-border hover:text-emerald-400 hover:border-emerald-500/30"
                              }`}
                            >
                              {isFollowing ? (
                                <>
                                  <Bell className="w-3 h-3" />
                                  팔로잉
                                </>
                              ) : (
                                <>
                                  <BellOff className="w-3 h-3" />
                                  팔로우
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Holdings table */}
                        <div className="rounded-lg border border-border/40 overflow-hidden">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="bg-muted/30">
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                  종목
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  비중
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  변동
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {topHoldings.map((h) => (
                                <tr
                                  key={h.ticker}
                                  className="border-t border-border/20 hover:bg-muted/15 transition-colors"
                                >
                                  <td className="px-3 py-2">
                                    <span className="font-mono font-medium text-foreground">
                                      {h.ticker}
                                    </span>
                                    <span className="text-muted-foreground ml-1.5">
                                      {h.name}
                                    </span>
                                  </td>
                                  <td className="text-right px-3 py-2 font-mono text-foreground">
                                    {h.weight}%
                                  </td>
                                  <td className="text-right px-3 py-2">
                                    <span
                                      className={`inline-flex items-center gap-1 font-mono ${
                                        h.change === "increased"
                                          ? "text-emerald-400"
                                          : h.change === "decreased"
                                            ? "text-red-400"
                                            : "text-muted-foreground"
                                      }`}
                                    >
                                      {changeIcon(h.change)}
                                      {h.changePct
                                        ? `${h.changePct > 0 ? "+" : ""}${h.changePct}%`
                                        : "-"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Activity footer */}
                      <div className="px-5 py-3 bg-muted/15 border-t border-border/30">
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Filing date */}
                          {(lastFiling || reportDate) && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                최근 공시:
                              </span>
                              <span className="text-[10px] font-mono text-foreground">
                                {lastFiling || reportDate}
                              </span>
                            </div>
                          )}

                          {/* Change summary */}
                          {increasedHoldings.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px] text-emerald-400">
                                증가{" "}
                                {increasedHoldings
                                  .map((h) => h.ticker)
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                          {decreasedHoldings.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <ArrowDownRight className="w-3 h-3 text-red-400" />
                              <span className="text-[10px] text-red-400">
                                감소{" "}
                                {decreasedHoldings
                                  .map((h) => h.ticker)
                                  .join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Latest update snippet */}
                          {latestUpdate && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span
                                className={`text-[10px] px-1.5 py-px rounded border ${UPDATE_TYPE_COLORS[latestUpdate.type] || "bg-muted/50 text-muted-foreground border-border"}`}
                              >
                                {latestUpdate.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {latestUpdate.title}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detail link */}
                      <Link href={`/masters/${master.id}`}>
                        <div className="px-5 py-2.5 border-t border-border/30 flex items-center justify-between group-hover:bg-emerald-500/5 transition-colors cursor-pointer">
                          <span className="text-[10px] text-muted-foreground">
                            13F 상세 · 투자 논리 · 변경 이력
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 4: 팔로잉 피드 — Followed masters' updates
             ════════════════════════════════════════════════════════ */}
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="max-w-2xl mt-6">
                <div className="flex items-center gap-2 mb-5">
                  <Rss className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold">
                    팔로우한 거장 업데이트
                  </h2>
                  {feedItems.length > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      {feedItems.length}개
                    </Badge>
                  )}
                </div>

                {feedItems.length === 0 ? (
                  <div className="text-center py-16 bg-card/50 rounded-xl border border-border/50">
                    <BellOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground mb-2">
                      팔로우한 거장이 없습니다.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      거장 카드의 팔로우 버튼을 눌러 업데이트를 받아보세요.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("explore")}
                      className="mt-4 text-xs text-emerald-400 hover:underline"
                    >
                      거장 탐색으로 이동
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedItems.map((item, i) => (
                      <motion.div
                        key={`${item.masterId}-${item.date}|${item.type}|${item.title}`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-card border border-border/50 rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-border flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-emerald-400">
                              {item.masterName.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                href={`/masters/${item.masterId}`}
                                onClick={() => {
                                  followsService
                                    .feedRead(
                                      item.masterId,
                                      `${item.date}|${item.type}|${item.title}`,
                                    )
                                    .catch(() => {});
                                }}
                              >
                                <span className="text-sm font-semibold hover:text-emerald-400 transition-colors cursor-pointer">
                                  {item.masterName}
                                </span>
                              </Link>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${UPDATE_TYPE_COLORS[item.type] || "bg-muted/50 text-muted-foreground border-border"}`}
                              >
                                {item.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                                {item.date}
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-1">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
