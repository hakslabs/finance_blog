/**
 * Learn.tsx — 학습 페이지 v2
 * 탭: 투자 기초 / 기술적 분석 / 가치 투자 / 퀀트 전략 / 매크로 경제 / 심화 과정
 */
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  useChapters,
  useLessons,
  lessonsService,
  type LessonProgress,
} from "@/features/lessons";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  TrendingUp,
  BarChart2,
  Calculator,
  Globe,
  Award,
  ChevronRight,
  Clock,
  Star,
  Lock,
  CheckCircle,
  Play,
  BookMarked,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Lesson = {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: "입문" | "초급" | "중급" | "고급";
  completed?: boolean;
  locked?: boolean;
  popular?: boolean;
};

type Chapter = {
  title: string;
  lessons: Lesson[];
};

const LEARN_TABS = [
  { label: "투자 기초", icon: <BookOpen size={13} /> },
  { label: "기술적 분석", icon: <BarChart2 size={13} /> },
  { label: "가치 투자", icon: <TrendingUp size={13} /> },
  { label: "퀀트 전략", icon: <Calculator size={13} /> },
  { label: "매크로 경제", icon: <Globe size={13} /> },
  { label: "심화 과정", icon: <Award size={13} /> },
];

const LEARN_CONTENT: Record<number, Chapter[]> = {
  0: [
    {
      title: "주식 시장의 이해",
      lessons: [
        {
          id: "b1",
          title: "주식이란 무엇인가?",
          description:
            "주식의 개념, 주주의 권리, 배당과 자본이득의 차이를 이해합니다.",
          duration: "8분",
          level: "입문",
          completed: true,
        },
        {
          id: "b2",
          title: "증권 거래소와 시장 구조",
          description:
            "NYSE, NASDAQ, KRX 등 주요 거래소와 시장 구조를 알아봅니다.",
          duration: "10분",
          level: "입문",
          completed: true,
        },
        {
          id: "b3",
          title: "주문 유형 완벽 이해",
          description: "시장가, 지정가, 스탑로스 등 다양한 주문 유형과 활용법.",
          duration: "12분",
          level: "초급",
        },
        {
          id: "b4",
          title: "포트폴리오 구성 원칙",
          description: "분산 투자의 원리와 효율적 포트폴리오 구성 방법.",
          duration: "15분",
          level: "초급",
        },
      ],
    },
    {
      title: "재무제표 읽기",
      lessons: [
        {
          id: "b5",
          title: "손익계산서 분석",
          description: "매출, 영업이익, 순이익의 의미와 분석 방법을 배웁니다.",
          duration: "18분",
          level: "초급",
          popular: true,
        },
        {
          id: "b6",
          title: "대차대조표 이해",
          description: "자산, 부채, 자본의 구조와 재무 건전성 평가.",
          duration: "20분",
          level: "초급",
        },
        {
          id: "b7",
          title: "현금흐름표 마스터",
          description: "영업/투자/재무 현금흐름의 차이와 중요성.",
          duration: "22분",
          level: "중급",
        },
        {
          id: "b8",
          title: "재무비율 완전 정복",
          description: "ROE, ROA, 부채비율 등 핵심 재무비율 계산과 해석.",
          duration: "25분",
          level: "중급",
          locked: true,
        },
      ],
    },
  ],
  1: [
    {
      title: "차트 기초",
      lessons: [
        {
          id: "t1",
          title: "캔들스틱 차트 완전 이해",
          description: "양봉, 음봉, 도지, 망치형 등 주요 캔들 패턴 해석.",
          duration: "15분",
          level: "초급",
          popular: true,
        },
        {
          id: "t2",
          title: "지지와 저항 레벨",
          description: "핵심 지지/저항 레벨 찾는 법과 매매 전략 적용.",
          duration: "18분",
          level: "초급",
        },
        {
          id: "t3",
          title: "추세선과 채널",
          description: "상승/하락 추세선 그리기와 채널 매매 전략.",
          duration: "20분",
          level: "초급",
        },
      ],
    },
    {
      title: "보조지표 활용",
      lessons: [
        {
          id: "t4",
          title: "이동평균선 (MA) 전략",
          description: "단순/지수 이동평균선의 골든크로스, 데드크로스 전략.",
          duration: "22분",
          level: "중급",
          popular: true,
        },
        {
          id: "t5",
          title: "RSI로 과매수/과매도 포착",
          description: "RSI 지표의 원리와 다이버전스 매매 기법.",
          duration: "20분",
          level: "중급",
        },
        {
          id: "t6",
          title: "MACD 완전 정복",
          description: "MACD 히스토그램, 시그널 라인 교차 전략.",
          duration: "25분",
          level: "중급",
        },
        {
          id: "t7",
          title: "볼린저밴드 활용법",
          description: "밴드 수축/확장과 스퀴즈 전략.",
          duration: "18분",
          level: "중급",
        },
        {
          id: "t8",
          title: "피보나치 되돌림",
          description: "피보나치 레벨을 이용한 진입/청산 전략.",
          duration: "30분",
          level: "고급",
          locked: true,
        },
      ],
    },
  ],
  2: [
    {
      title: "가치 투자 기초",
      lessons: [
        {
          id: "v1",
          title: "벤저민 그레이엄의 가르침",
          description: "안전마진, 내재가치, 미스터 마켓 개념 이해.",
          duration: "20분",
          level: "초급",
          popular: true,
        },
        {
          id: "v2",
          title: "워런 버핏의 투자 철학",
          description: "경제적 해자, 훌륭한 경영진, 장기 보유 원칙.",
          duration: "25분",
          level: "초급",
        },
        {
          id: "v3",
          title: "내재가치 계산법 (DCF)",
          description: "DCF 모델로 기업의 내재가치를 직접 계산해봅니다.",
          duration: "35분",
          level: "중급",
        },
      ],
    },
    {
      title: "밸류에이션 지표",
      lessons: [
        {
          id: "v4",
          title: "PER, PBR 완벽 이해",
          description: "주가수익비율과 주가순자산비율의 의미와 활용.",
          duration: "18분",
          level: "초급",
          popular: true,
        },
        {
          id: "v5",
          title: "EV/EBITDA 분석",
          description: "기업가치 대비 EBITDA 비율로 섹터 비교 분석.",
          duration: "22분",
          level: "중급",
        },
        {
          id: "v6",
          title: "PEG 비율과 성장 투자",
          description: "성장률을 반영한 PEG 비율로 성장주 평가.",
          duration: "20분",
          level: "중급",
        },
        {
          id: "v7",
          title: "섹터별 밸류에이션 기준",
          description: "은행, 기술, 소비재 등 섹터별 적정 밸류에이션 기준.",
          duration: "28분",
          level: "고급",
          locked: true,
        },
      ],
    },
  ],
  3: [
    {
      title: "퀀트 기초",
      lessons: [
        {
          id: "q1",
          title: "퀀트 투자란?",
          description: "데이터 기반 투자의 개념과 퀀트 전략의 종류.",
          duration: "15분",
          level: "초급",
        },
        {
          id: "q2",
          title: "팩터 투자 입문",
          description: "가치, 모멘텀, 퀄리티, 저변동성 팩터의 이해.",
          duration: "25분",
          level: "중급",
          popular: true,
        },
        {
          id: "q3",
          title: "백테스팅 방법론",
          description: "전략의 과거 성과를 검증하는 백테스팅 방법.",
          duration: "30분",
          level: "중급",
        },
      ],
    },
    {
      title: "전략 구현",
      lessons: [
        {
          id: "q4",
          title: "모멘텀 전략 구현",
          description: "12개월 모멘텀 전략의 원리와 실전 적용.",
          duration: "35분",
          level: "고급",
          locked: true,
        },
        {
          id: "q5",
          title: "듀얼 모멘텀 전략",
          description: "절대 모멘텀과 상대 모멘텀을 결합한 전략.",
          duration: "40분",
          level: "고급",
          locked: true,
        },
        {
          id: "q6",
          title: "멀티팩터 포트폴리오",
          description: "여러 팩터를 결합한 포트폴리오 구성 전략.",
          duration: "45분",
          level: "고급",
          locked: true,
        },
      ],
    },
  ],
  4: [
    {
      title: "거시경제 이해",
      lessons: [
        {
          id: "m1",
          title: "금리와 주식시장의 관계",
          description: "금리 인상/인하가 주식, 채권, 부동산에 미치는 영향.",
          duration: "20분",
          level: "초급",
          popular: true,
        },
        {
          id: "m2",
          title: "인플레이션과 투자 전략",
          description: "인플레이션 환경에서의 자산 배분 전략.",
          duration: "22분",
          level: "초급",
        },
        {
          id: "m3",
          title: "경기 사이클과 섹터 로테이션",
          description: "경기 확장/수축 국면별 유리한 섹터와 투자 전략.",
          duration: "28분",
          level: "중급",
        },
        {
          id: "m4",
          title: "달러 인덱스와 글로벌 투자",
          description: "달러 강세/약세가 신흥국 및 원자재 시장에 미치는 영향.",
          duration: "25분",
          level: "중급",
        },
      ],
    },
    {
      title: "중앙은행과 정책",
      lessons: [
        {
          id: "m5",
          title: "연준(Fed) 통화정책 읽기",
          description: "FOMC 회의록, 점도표, 파월 발언 해석 방법.",
          duration: "30분",
          level: "중급",
          popular: true,
        },
        {
          id: "m6",
          title: "수익률 곡선 역전의 의미",
          description: "장단기 금리 역전과 경기 침체 예측 지표.",
          duration: "25분",
          level: "고급",
          locked: true,
        },
        {
          id: "m7",
          title: "글로벌 자산 배분 전략",
          description: "주식, 채권, 원자재, 현금의 최적 배분 방법.",
          duration: "35분",
          level: "고급",
          locked: true,
        },
      ],
    },
  ],
  5: [
    {
      title: "고급 투자 전략",
      lessons: [
        {
          id: "a1",
          title: "옵션 기초: 콜과 풋",
          description: "옵션의 기본 개념, 만기, 행사가격, 프리미엄.",
          duration: "35분",
          level: "고급",
          locked: true,
        },
        {
          id: "a2",
          title: "커버드 콜 전략",
          description: "보유 주식에 콜옵션을 매도하는 수익 향상 전략.",
          duration: "30분",
          level: "고급",
          locked: true,
        },
        {
          id: "a3",
          title: "공매도 메커니즘",
          description: "공매도의 원리, 리스크, 실전 활용법.",
          duration: "28분",
          level: "고급",
          locked: true,
        },
        {
          id: "a4",
          title: "헤지 전략 구성",
          description: "포트폴리오 리스크를 줄이는 다양한 헤지 기법.",
          duration: "40분",
          level: "고급",
          locked: true,
        },
      ],
    },
    {
      title: "실전 케이스 스터디",
      lessons: [
        {
          id: "a5",
          title: "2008 금융위기 분석",
          description: "서브프라임 사태의 원인, 전개, 교훈.",
          duration: "45분",
          level: "고급",
          locked: true,
        },
        {
          id: "a6",
          title: "2020 코로나 폭락과 반등",
          description: "팬데믹 충격과 역사적 V자 반등의 메커니즘.",
          duration: "40분",
          level: "고급",
          locked: true,
        },
        {
          id: "a7",
          title: "버블 식별 방법론",
          description: "닷컴버블, 주택버블 등 역사적 버블의 공통 패턴.",
          duration: "38분",
          level: "고급",
          locked: true,
        },
      ],
    },
  ],
};

const LEVEL_COLORS: Record<string, string> = {
  입문: "border-up text-up",
  초급: "border-sky text-sky",
  중급: "border-gold text-gold",
  고급: "border-violet text-violet",
};

function LessonCard({ lesson }: { lesson: Lesson }) {
  const [, navigate] = useLocation();
  return (
    <div
      onClick={() => {
        if (lesson.locked) toast.info("프리미엄 구독 후 이용 가능합니다.");
        else navigate(`/learn/${lesson.id}`);
      }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer group",
        lesson.locked
          ? "border-border/50 bg-muted/10 opacity-60"
          : lesson.completed
            ? "border-up/30 bg-up/5 hover:border-up/50"
            : "border-border hover:border-primary/40 hover:bg-muted/20",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          lesson.completed
            ? "bg-up/10"
            : lesson.locked
              ? "bg-muted/50"
              : "bg-muted/30",
        )}
      >
        {lesson.completed ? (
          <CheckCircle size={15} className="text-up" />
        ) : lesson.locked ? (
          <Lock size={13} className="text-muted-foreground" />
        ) : (
          <Play
            size={13}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span
            className={cn(
              "text-sm font-medium leading-snug",
              lesson.completed
                ? "text-muted-foreground line-through"
                : "text-foreground",
            )}
          >
            {lesson.title}
          </span>
          {lesson.popular && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 border-gold text-gold gap-0.5"
            >
              <Star size={8} fill="currentColor" /> 인기
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {lesson.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0", LEVEL_COLORS[lesson.level])}
          >
            {lesson.level}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock size={9} /> {lesson.duration}
          </span>
        </div>
      </div>
      <ChevronRight
        size={13}
        className="text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary transition-colors"
      />
    </div>
  );
}

export default function Learn() {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();

  // Live chapters + lessons. Backend's chapter ids ("basics" /
  // "technical" / "value" / "macro" / "quant") map to the in-page
  // tabs at indexes 0/1/2/3/4 (label-matched via category).
  const { data: liveChapters } = useChapters();
  const { data: liveLessons } = useLessons();

  // Per-user completion. The `/me/lesson-progress` route is auth-only
  // — when signed out we just show the default uncompleted state.
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    lessonsService
      .myProgress()
      .then((r) => {
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        for (const p of (r.items as LessonProgress[]) ?? []) {
          map[p.lesson_id] = !!p.completed;
        }
        setProgressMap(map);
      })
      .catch(() => {
        /* unauthenticated or offline — keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Map the backend chapters into the page's tab structure. Tab order
  // and labels keep the previous LEARN_TABS shape so the icons line up.
  const tabSpec = LEARN_TABS;
  type LiveChapter = {
    id: string;
    title: string;
    description?: string;
    category: string;
    position: number;
  };
  const liveChapterByTabIdx: (LiveChapter | undefined)[] = useMemo(() => {
    const list = (liveChapters ?? []) as LiveChapter[];
    if (!list.length) return new Array(tabSpec.length).fill(undefined);
    const byLabel: Record<string, LiveChapter> = {};
    for (const c of list) byLabel[c.title] = c;
    return tabSpec.map((t) => byLabel[t.label] ?? list[0]);
  }, [liveChapters, tabSpec]);

  const activeChapter = liveChapterByTabIdx[activeTab];
  // Live-path: lessons for the active chapter. Falls back to the
  // in-page LEARN_CONTENT mock when the live list is empty so the
  // page never blanks on a preview env.
  const liveLessonsForChapter = useMemo(() => {
    if (!activeChapter || !liveLessons) return [];
    return liveLessons
      .filter((l: any) => l.chapter_id === activeChapter.id)
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
  }, [activeChapter, liveLessons]);

  // Chapters render shape: { title, lessons[] }. Group live lessons by
  // a single chapter title when present; otherwise use the mock pair.
  const renderChapters: Chapter[] = useMemo(() => {
    if (liveLessonsForChapter.length > 0 && activeChapter) {
      const lessons: Lesson[] = liveLessonsForChapter.map((l: any) => ({
        id: l.id,
        title: l.title,
        description: l.description ?? "",
        duration: `${l.read_time ?? 10}분`,
        level: (l.level ?? "초급") as Lesson["level"],
        completed: !!progressMap[l.id],
        locked: !!l.is_locked,
        popular: !!l.is_popular,
      }));
      return [{ title: activeChapter.title, lessons }];
    }
    return LEARN_CONTENT[activeTab] ?? [];
  }, [liveLessonsForChapter, activeChapter, progressMap, activeTab]);

  const totalLessons = renderChapters.reduce(
    (sum, c) => sum + c.lessons.length,
    0,
  );
  const completedLessons = renderChapters.reduce(
    (sum, c) => sum + c.lessons.filter((l) => l.completed).length,
    0,
  );
  const progress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-['Outfit']">학습 센터</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          투자 기초부터 고급 전략까지 단계별 학습
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl overflow-x-auto">
        {LEARN_TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={cn(
              "flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap font-medium",
              activeTab === i
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      {completedLessons > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">진행률</span>
            <span className="text-sm font-bold font-mono text-primary">
              {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            {completedLessons} / {totalLessons} 강의 완료
          </div>
        </div>
      )}

      {/* Chapters */}
      <div className="space-y-4">
        {renderChapters.map((chapter, ci) => (
          <div key={ci} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookMarked size={14} className="text-primary" />
              <h3 className="text-sm font-bold font-['Outfit']">
                {chapter.title}
              </h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {chapter.lessons.length}개 강의
              </span>
            </div>
            <div className="space-y-2">
              {chapter.lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Glossary CTA */}
      <div className="bg-gradient-to-r from-primary/10 to-violet/10 border border-primary/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold font-['Outfit']">투자 용어 사전</h3>
          <p className="text-xs text-muted-foreground mt-1">
            PER, PBR, EV/EBITDA, DCF, 안전마진… 핵심 용어를 정리했습니다.
          </p>
        </div>
        <button
          onClick={() => toast.info("용어 사전 준비 중입니다.")}
          className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          용어 사전 보기
        </button>
      </div>
    </div>
  );
}
