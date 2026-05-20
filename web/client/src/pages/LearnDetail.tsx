/**
 * LearnDetail.tsx — 강의 상세 페이지
 * Design: 다크 모노 + 에메랄드 액센트
 * Features:
 *  - 비디오 플레이어 영역 (YouTube 임베드 or 썸네일)
 *  - 강의 목차 (사이드바)
 *  - 강의 내용 본문 (마크다운 스타일)
 *  - 퀴즈 섹션
 *  - 북마크 / 완료 체크
 *  - 이전/다음 강의 네비게이션
 */
import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle, Lock, Clock, Star,
  ChevronLeft, ChevronRight, BookOpen, Award, BarChart2, Calculator,
  Globe, TrendingUp, Bookmark, BookmarkCheck, HelpCircle, Check, X,
  FileText, AlignLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { lessonsService } from "@/features/lessons";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmark } from "@/contexts/BookmarkContext";

// ── All lessons flat list (same data as Learn.tsx) ────────────
type Lesson = {
  id: string; title: string; description: string; duration: string;
  level: "입문" | "초급" | "중급" | "고급";
  completed?: boolean; locked?: boolean; popular?: boolean;
  category: string;
  content?: string;
  videoId?: string;
  quiz?: { question: string; options: string[]; answer: number }[];
};

const ALL_LESSONS: Lesson[] = [
  // 투자 기초
  { id: "b1", category: "투자 기초", title: "주식이란 무엇인가?", description: "주식의 개념, 주주의 권리, 배당과 자본이득의 차이를 이해합니다.", duration: "8분", level: "입문", completed: true,
    content: `## 주식이란 무엇인가?

주식(Stock)은 기업의 **소유권을 나타내는 증서**입니다. 기업이 자금을 조달하기 위해 발행하며, 주식을 보유한 사람을 **주주(Shareholder)**라고 합니다.

### 주주의 권리
- **의결권**: 주주총회에서 경영 사항에 대해 투표할 수 있습니다.
- **배당권**: 기업이 이익을 배당할 때 지분에 비례하여 받을 수 있습니다.
- **잔여재산 분배권**: 기업 청산 시 채권자 변제 후 남은 자산을 받을 수 있습니다.

### 수익의 두 가지 원천
| 구분 | 설명 | 예시 |
|------|------|------|
| **자본이득 (Capital Gain)** | 주가 상승으로 인한 매매 차익 | 100원에 사서 150원에 팔면 50원 이익 |
| **배당 (Dividend)** | 기업이 이익의 일부를 주주에게 분배 | 연 2% 배당수익률 |

### 보통주 vs 우선주
- **보통주**: 의결권 있음, 배당은 나중에 받음
- **우선주**: 의결권 없음, 배당을 먼저/더 많이 받음

> 💡 **핵심 포인트**: 주식 투자는 기업의 일부를 소유하는 것입니다. 기업이 성장하면 주가도 오르고, 배당도 늘어납니다.`,
    quiz: [
      { question: "주식 투자로 얻을 수 있는 수익의 두 가지 원천은?", options: ["이자와 원금", "자본이득과 배당", "임대료와 로열티", "매출과 영업이익"], answer: 1 },
      { question: "우선주의 특징으로 올바른 것은?", options: ["의결권이 있다", "배당을 나중에 받는다", "의결권이 없고 배당을 먼저 받는다", "보통주보다 위험하다"], answer: 2 },
    ],
  },
  { id: "b2", category: "투자 기초", title: "증권 거래소와 시장 구조", description: "NYSE, NASDAQ, KRX 등 주요 거래소와 시장 구조를 알아봅니다.", duration: "10분", level: "입문", completed: true,
    content: `## 증권 거래소와 시장 구조

### 주요 거래소
| 거래소 | 국가 | 특징 |
|--------|------|------|
| **NYSE** | 미국 | 세계 최대 거래소, 전통적 대기업 상장 |
| **NASDAQ** | 미국 | 기술주 중심, 애플·구글·메타 등 |
| **KRX (한국거래소)** | 한국 | KOSPI + KOSDAQ 운영 |
| **TSE** | 일본 | 아시아 최대 거래소 중 하나 |

### 1차 시장 vs 2차 시장
- **1차 시장**: 기업이 처음 주식을 발행하는 시장 (IPO)
- **2차 시장**: 이미 발행된 주식을 투자자들끼리 거래하는 시장 (우리가 일반적으로 거래하는 곳)

### 거래 시간
- **미국**: 동부시간 9:30~16:00 (한국시간 23:30~06:00)
- **한국**: 09:00~15:30 (정규장), 08:00~09:00 (프리마켓)`,
    quiz: [
      { question: "기술주가 많이 상장된 미국 거래소는?", options: ["NYSE", "NASDAQ", "KRX", "TSE"], answer: 1 },
    ],
  },
  { id: "b3", category: "투자 기초", title: "주문 유형 완벽 이해", description: "시장가, 지정가, 스탑로스 등 다양한 주문 유형과 활용법.", duration: "12분", level: "초급",
    content: `## 주문 유형 완벽 이해

### 핵심 주문 유형

**1. 시장가 주문 (Market Order)**
현재 시장 가격으로 즉시 체결. 빠른 매매가 필요할 때 사용.
- 장점: 즉시 체결 보장
- 단점: 원하는 가격에 못 살 수 있음 (슬리피지)

**2. 지정가 주문 (Limit Order)**
원하는 가격을 지정하여 주문. 해당 가격이 되면 체결.
- 장점: 원하는 가격에 매매 가능
- 단점: 체결 보장 없음

**3. 스탑로스 주문 (Stop-Loss Order)**
손실을 제한하기 위한 주문. 주가가 특정 가격 이하로 떨어지면 자동 매도.
- 예: 100원에 산 주식에 90원 스탑로스 설정 → 90원 되면 자동 매도

> 💡 **실전 팁**: 스탑로스는 감정적 매매를 방지하는 가장 효과적인 도구입니다.`,
    quiz: [
      { question: "원하는 가격을 지정하여 주문하는 방식은?", options: ["시장가 주문", "지정가 주문", "스탑로스 주문", "OCO 주문"], answer: 1 },
      { question: "스탑로스 주문의 주요 목적은?", options: ["수익 극대화", "손실 제한", "거래량 증가", "세금 절약"], answer: 1 },
    ],
  },
  // 기술적 분석
  { id: "t1", category: "기술적 분석", title: "캔들스틱 차트 완전 이해", description: "양봉, 음봉, 도지, 망치형 등 주요 캔들 패턴 해석.", duration: "15분", level: "초급", popular: true,
    content: `## 캔들스틱 차트 완전 이해

캔들스틱은 일정 기간의 시가, 고가, 저가, 종가를 시각적으로 표현합니다.

### 캔들의 구성
- **몸통 (Body)**: 시가와 종가 사이
- **꼬리 (Shadow/Wick)**: 고가와 저가를 나타내는 선
- **양봉 (Bullish)**: 종가 > 시가 (상승)
- **음봉 (Bearish)**: 종가 < 시가 (하락)

### 주요 패턴
| 패턴 | 의미 | 신뢰도 |
|------|------|--------|
| **도지 (Doji)** | 시가 ≈ 종가, 방향성 불확실 | 중간 |
| **망치형 (Hammer)** | 하락 후 반등 신호 | 높음 |
| **역망치형 (Inverted Hammer)** | 상승 반전 가능성 | 중간 |
| **장악형 (Engulfing)** | 강한 추세 전환 신호 | 높음 |

> 💡 **실전 팁**: 단일 캔들보다 2-3개의 캔들 패턴 조합이 더 신뢰도가 높습니다.`,
    quiz: [
      { question: "양봉의 조건은?", options: ["시가 > 종가", "종가 > 시가", "고가 = 저가", "거래량이 많을 때"], answer: 1 },
      { question: "하락 후 반등 신호를 나타내는 캔들 패턴은?", options: ["도지", "망치형", "역망치형", "음봉"], answer: 1 },
    ],
  },
  { id: "t4", category: "기술적 분석", title: "이동평균선 (MA) 전략", description: "단순/지수 이동평균선의 골든크로스, 데드크로스 전략.", duration: "22분", level: "중급", popular: true,
    content: `## 이동평균선 (Moving Average) 전략

### 이동평균선의 종류
- **단순 이동평균 (SMA)**: 일정 기간 종가의 단순 평균
- **지수 이동평균 (EMA)**: 최근 데이터에 더 높은 가중치 부여

### 주요 이동평균선
| 기간 | 용도 |
|------|------|
| 5일선 | 단기 추세 |
| 20일선 | 중기 추세 (월봉) |
| 60일선 | 중장기 추세 (분기) |
| 120일선 | 장기 추세 (반기) |
| 200일선 | 장기 추세 (연간) |

### 골든크로스 & 데드크로스
- **골든크로스**: 단기 MA가 장기 MA를 상향 돌파 → 매수 신호
- **데드크로스**: 단기 MA가 장기 MA를 하향 돌파 → 매도 신호

> 💡 **실전 팁**: 200일선은 기관투자자들이 가장 중요하게 보는 지표입니다. 200일선 위에 있으면 강세장, 아래면 약세장으로 판단합니다.`,
    quiz: [
      { question: "골든크로스란?", options: ["단기 MA가 장기 MA를 하향 돌파", "단기 MA가 장기 MA를 상향 돌파", "주가가 200일선을 돌파", "거래량이 급증"], answer: 1 },
    ],
  },
  // 가치투자
  { id: "v1", category: "가치투자", title: "PER, PBR, ROE 완전 정복", description: "가장 많이 쓰이는 밸류에이션 지표를 쉽게 이해하기.", duration: "10분", level: "초급",
    content: `## PER, PBR, ROE 완전 정복

### PER (주가수익비율, Price-to-Earnings Ratio)
**PER = 주가 ÷ 주당순이익(EPS)**

- PER이 낮을수록 저평가 (같은 이익에 더 싼 가격)
- 업종별 평균 PER과 비교하는 것이 중요
- 성장주는 높은 PER이 정당화될 수 있음

### PBR (주가순자산비율, Price-to-Book Ratio)
**PBR = 주가 ÷ 주당순자산(BPS)**

- PBR < 1: 청산가치보다 싸게 거래 (극단적 저평가 가능성)
- 자산 중심 업종(은행, 보험)에서 유용

### ROE (자기자본이익률, Return on Equity)
**ROE = 순이익 ÷ 자기자본 × 100%**

- 주주가 투자한 돈으로 얼마나 이익을 냈는지
- 워런 버핏은 ROE 15% 이상을 선호
- 부채를 활용한 ROE 상승은 주의 필요

> 💡 **버핏의 기준**: ROE 15% 이상, PER 15배 이하, PBR 1.5배 이하면 관심 종목으로 고려.`,
    quiz: [
      { question: "PER의 계산 공식은?", options: ["주가 ÷ 주당순자산", "주가 ÷ 주당순이익", "순이익 ÷ 자기자본", "매출 ÷ 영업이익"], answer: 1 },
      { question: "ROE가 높을수록 의미하는 것은?", options: ["부채가 많다", "주주 자본으로 더 많은 이익을 낸다", "주가가 높다", "배당이 많다"], answer: 1 },
    ],
  },
  // 퀀트
  { id: "q1", category: "퀀트 전략", title: "팩터 투자 입문", description: "학술적으로 검증된 팩터 투자 전략의 기초.", duration: "16분", level: "중급",
    content: `## 팩터 투자 입문

팩터 투자는 초과수익을 설명하는 **체계적인 특성(팩터)**을 기반으로 투자하는 전략입니다.

### 5대 핵심 팩터
| 팩터 | 설명 | 측정 지표 |
|------|------|-----------|
| **가치 (Value)** | 저평가된 종목 | PER, PBR, EV/EBITDA |
| **모멘텀 (Momentum)** | 최근 상승한 종목 | 12-1개월 수익률 |
| **퀄리티 (Quality)** | 재무 건전한 종목 | ROE, 부채비율 |
| **사이즈 (Size)** | 소형주 프리미엄 | 시가총액 |
| **저변동성 (Low Vol)** | 변동성 낮은 종목 | 베타, 표준편차 |

### 팩터 조합 전략
단일 팩터보다 여러 팩터를 조합하면 더 안정적인 초과수익 가능:
- **가치 + 모멘텀**: 저평가되었지만 최근 상승 중인 종목
- **퀄리티 + 가치**: 재무 건전하고 저평가된 종목

> 💡 **실전 팁**: 팩터는 시장 사이클에 따라 성과가 다릅니다. 경기 상승기에는 모멘텀, 하락기에는 퀄리티와 저변동성이 유리합니다.`,
    quiz: [
      { question: "모멘텀 팩터를 측정하는 주요 지표는?", options: ["PER, PBR", "12-1개월 수익률", "ROE, 부채비율", "시가총액"], answer: 1 },
    ],
  },
];

const LEVEL_COLORS: Record<string, string> = {
  "입문": "border-emerald-500 text-emerald-400",
  "초급": "border-sky-500 text-sky-400",
  "중급": "border-amber-500 text-amber-400",
  "고급": "border-violet-500 text-violet-400",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "투자 기초": <BookOpen size={13} />,
  "기술적 분석": <BarChart2 size={13} />,
  "가치투자": <TrendingUp size={13} />,
  "퀀트 전략": <Calculator size={13} />,
  "매크로 경제": <Globe size={13} />,
  "심화 과정": <Award size={13} />,
};

// ── Quiz Component ────────────────────────────────────────────
function QuizSection({ quiz, lessonId }: { quiz: NonNullable<Lesson["quiz"]>; lessonId: string }) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = submitted ? quiz.filter((q, i) => answers[i] === q.answer).length : 0;

  const onSubmit = () => {
    if (Object.keys(answers).length < quiz.length) {
      toast.error("모든 문제에 답하세요.");
      return;
    }
    setSubmitted(true);
    const correctCount = quiz.filter((q, i) => answers[i] === q.answer).length;
    const pct = Math.round((correctCount / quiz.length) * 100);
    if (user) {
      lessonsService.submitQuiz(lessonId, {
        score: pct,
        total_questions: quiz.length,
        correct_count: correctCount,
        answers: quiz.map((_, i) => answers[i] ?? -1),
      }).catch(() => { /* swallow — UI already shows local score */ });
    }
  };
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <HelpCircle size={15} className="text-primary" />
        <h3 className="text-sm font-bold font-['Outfit']">이해도 퀴즈</h3>
        {submitted && <span className="ml-auto text-sm font-semibold text-primary">{score}/{quiz.length} 정답</span>}
      </div>
      {quiz.map((q, qi) => (
        <div key={qi} className="space-y-2">
          <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {q.options.map((opt, oi) => {
              const isSelected = answers[qi] === oi;
              const isCorrect = submitted && oi === q.answer;
              const isWrong = submitted && isSelected && oi !== q.answer;
              return (
                <button key={oi} disabled={submitted}
                  onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                  className={cn("text-left px-3 py-2 rounded-lg text-sm border transition-all",
                    isCorrect ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" :
                    isWrong ? "border-red-500 bg-red-500/10 text-red-400" :
                    isSelected ? "border-primary bg-primary/10 text-primary" :
                    "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}>
                  <span className="flex items-center gap-2">
                    {submitted && isCorrect && <Check size={12} />}
                    {submitted && isWrong && <X size={12} />}
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted ? (
        <button onClick={onSubmit}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          제출하기
        </button>
      ) : (
        <button onClick={() => { setAnswers({}); setSubmitted(false); }}
          className="w-full py-2.5 rounded-lg bg-muted/40 text-muted-foreground text-sm hover:text-foreground transition-colors">
          다시 풀기
        </button>
      )}
    </div>
  );
}

// ── Markdown-like content renderer ───────────────────────────
function ContentRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold font-['Outfit'] mt-4 mb-2 text-foreground">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-3 mb-1.5 text-foreground">{line.slice(4)}</h3>;
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4) return <p key={i} className="font-semibold text-foreground">{line.slice(2, -2)}</p>;
        if (line.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-r-lg text-muted-foreground italic">{line.slice(2)}</blockquote>;
        if (line.startsWith("| ")) {
          const cells = line.split("|").filter(c => c.trim());
          const isHeader = lines[i + 1]?.startsWith("|---");
          const isSep = line.includes("---");
          if (isSep) return null;
          return (
            <div key={i} className={cn("grid gap-2 text-xs py-1.5 px-2 rounded", isHeader ? "font-semibold bg-muted/30" : "hover:bg-muted/10")} style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
              {cells.map((c, ci) => <span key={ci} dangerouslySetInnerHTML={{ __html: c.trim().replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />)}
            </div>
          );
        }
        if (line.startsWith("- ")) return <li key={i} className="ml-4 text-muted-foreground list-disc" dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong class=\"text-foreground\">$1</strong>") }} />;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong class=\"text-foreground\">$1</strong>") }} />;
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LearnDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isGuideBookmarked, toggleGuideBookmark } = useBookmark();
  const [completed, setCompleted] = useState(false);
  const [activeSection, setActiveSection] = useState<"content" | "quiz">("content");
  const lesson = ALL_LESSONS.find(l => l.id === params.id);
  const categoryLessons = lesson ? ALL_LESSONS.filter(l => l.category === lesson.category) : [];
  const currentIdx = categoryLessons.findIndex(l => l.id === params.id);
  const prevLesson = currentIdx > 0 ? categoryLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < categoryLessons.length - 1 ? categoryLessons[currentIdx + 1] : null;
  const isBookmarked = lesson ? isGuideBookmarked(lesson.id) : false;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.id]);
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <BookOpen size={48} className="text-muted-foreground/30" />
        <h2 className="text-xl font-bold">강의를 찾을 수 없습니다</h2>
        <Link href="/learn"><button className="text-sm text-primary hover:underline">← 학습 센터로 돌아가기</button></Link>
      </div>
    );
  }
  return (
    <div className="animate-fade-in-up">
      {/* Back nav */}
      <div className="flex items-center gap-2 mb-5">
        <Link href="/learn">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> 학습 센터
          </button>
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm text-muted-foreground">{lesson.category}</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm text-foreground truncate max-w-[200px]">{lesson.title}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 flex items-center justify-center text-primary">{CATEGORY_ICONS[lesson.category]}</div>
              <h3 className="text-sm font-semibold">{lesson.category}</h3>
            </div>
            <div className="space-y-1">
              {categoryLessons.map((l, i) => (
                <Link key={l.id} href={`/learn/${l.id}`}>
                  <div className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors",
                    l.id === lesson.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}>
                    <span className="text-[10px] font-mono w-4 text-center opacity-60">{i + 1}</span>
                    {l.completed ? <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" /> : l.locked ? <Lock size={11} className="flex-shrink-0" /> : <FileText size={11} className="flex-shrink-0 opacity-50" />}
                    <span className="truncate text-xs">{l.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Document-style header */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <AlignLeft size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", LEVEL_COLORS[lesson.level])}>{lesson.level}</Badge>
                    {lesson.popular && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-400 gap-0.5"><Star size={8} fill="currentColor" /> 인기</Badge>}
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock size={10} /> {lesson.duration}</span>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted/40 rounded">보고서 형태</span>
                  </div>
                  <h1 className="text-xl font-bold font-['Outfit'] leading-snug">{lesson.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { toggleGuideBookmark(lesson.id); toast.success(isBookmarked ? "북마크 해제" : "북마크 추가"); }}
                    className={cn("p-2 rounded-lg border transition-all", isBookmarked ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
                    {isBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  </button>
                  <button onClick={() => {
                    setCompleted(true);
                    toast.success("교재 완독 표시 완료! 🎉");
                    if (lesson) lessonsService.setCompleted(lesson.id, true).catch(() => {});
                  }}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all", completed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-primary text-primary-foreground hover:opacity-90")}>
                    {completed ? <><CheckCircle size={13} /> 완독</> : <><Check size={13} /> 완독 표시</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Content tabs */}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
            {[{ key: "content" as const, label: "강의 내용", icon: <FileText size={12} /> }, { key: "quiz" as const, label: "퀴즈", icon: <HelpCircle size={12} /> }].map(tab => (
              <button key={tab.key} onClick={() => setActiveSection(tab.key)}
                className={cn("flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-all font-medium",
                  activeSection === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          {activeSection === "content" && lesson.content && (
            <div className="bg-card border border-border rounded-xl p-5">
              <ContentRenderer content={lesson.content} />
            </div>
          )}
          {activeSection === "quiz" && (
            lesson.quiz ? <QuizSection quiz={lesson.quiz} lessonId={lesson.id} /> :
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">이 강의에는 퀴즈가 없습니다.</div>
          )}
          {/* Prev / Next navigation */}
          <div className="flex gap-3">
            {prevLesson ? (
              <Link href={`/learn/${prevLesson.id}`} className="flex-1">
                <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors cursor-pointer group">
                  <ChevronLeft size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground">이전 강의</div>
                    <div className="text-sm font-medium truncate">{prevLesson.title}</div>
                  </div>
                </div>
              </Link>
            ) : <div className="flex-1" />}
            {nextLesson ? (
              <Link href={`/learn/${nextLesson.id}`} className="flex-1">
                <div className="flex items-center justify-end gap-2 p-3 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors cursor-pointer group">
                  <div className="min-w-0 text-right">
                    <div className="text-[10px] text-muted-foreground">다음 강의</div>
                    <div className="text-sm font-medium truncate">{nextLesson.title}</div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Link>
            ) : <div className="flex-1" />}
          </div>
        </div>
      </div>
    </div>
  );
}
