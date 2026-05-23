// Design: Brutalist-Financial Dark Theme
// Layout: Split - left filter sidebar + right master grid
// Color: slate-950 bg, emerald accent, mono typography
import { useState, useContext } from "react";
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

function parseAum(aum: string): number {
  const n = parseFloat(aum.replace(/[^0-9.]/g, ""));
  if (aum.includes("조")) return n * 10000;
  if (aum.includes("억")) return n;
  return n;
}

export default function Masters() {
  const followCtx = useContext(FollowContext);
  const [strategyFilter, setStrategyFilter] = useState("전체");
  const [sectorFilter, setSectorFilter] = useState("전체");
  const [aumFilter, setAumFilter] = useState("전체");
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "feed">("all");

  // Live masters list. Falls back to the mock array inside useMasters
  // when the DB is empty, so the page never blanks on preview envs.
  const { data: liveMasters } = useMasters();
  const mastersList: typeof MASTERS = (liveMasters as any) ?? MASTERS;

  const filteredMasters = mastersList.filter((m) => {
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
      if (!sectors.some((s: string) => s.includes(sectorFilter))) return false;
    }
    if (aumFilter !== "전체") {
      const aumVal = parseAum(m.aum);
      if (aumFilter === "$100억 이상" && aumVal < 100) return false;
      if (aumFilter === "$1,000억 이상" && aumVal < 1000) return false;
      if (aumFilter === "$1조 이상" && aumVal < 10000) return false;
    }
    return true;
  });

  const feedItems = mastersList
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

  const followedCount = mastersList.filter((m) =>
    followCtx?.isFollowing(m.id),
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 헤더 */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <button
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
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                전체 목록
              </button>
              <button
                onClick={() => setActiveTab("feed")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors relative ${
                  activeTab === "feed"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                업데이트 피드
                {feedItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {feedItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "all" ? (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* 필터 바 */}
              <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    전략
                  </span>
                  {STRATEGY_FILTERS.map((f) => (
                    <button
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

              {/* 거장 카드 그리드 */}
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
                      {/* 카드 헤더 */}
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

                        {/* 수익률 지표 */}
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

                        {/* 전략 태그 */}
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

                        {/* 주요 보유 종목 */}
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

                      {/* 최근 업데이트 */}
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

                      {/* 상세 보기 링크 */}
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
          ) : (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-5">
                  <Bell className="w-4 h-4 text-emerald-400" />
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
                      onClick={() => setActiveTab("all")}
                      className="mt-4 text-xs text-emerald-400 hover:underline"
                    >
                      거장 목록으로 이동
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedItems.map((item, i) => (
                      <motion.div
                        key={`${item.masterId}-${i}`}
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
                                  // mark this feed entry as read for the current user
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
