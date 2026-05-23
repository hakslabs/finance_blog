/**
 * Admin.tsx — 어드민 페이지 (전면 개편)
 * Design: 다크 모노 + 에메랄드 액센트
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { adminService } from "@/features/admin";
import { cn } from "@/lib/utils";
import {
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Bell,
  TrendingUp,
  TrendingDown,
  Eye,
  Trash2,
  Edit3,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  X,
  Save,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Send,
  UserCheck,
  UserX,
  Crown,
  Star,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Download,
  Monitor,
  Smartphone,
  Globe,
  LogIn,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ModalPortal } from "@/components/ModalPortal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ADMIN_EMAILS = ["admin@financelab.pro", "superadmin@financelab.pro"];

type UserPlan = "무료" | "프리미엄" | "어드민";
type UserStatus = "활성" | "정지" | "대기";
type User = {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  joined: string;
  lastSeen: string;
  status: UserStatus;
  reports: number;
  bookmarks: number;
  trades: number;
  note: string;
};
type ReportStatus = "게시됨" | "초안" | "비공개";
type Report = {
  id: string;
  title: string;
  category: string;
  source: string;
  status: ReportStatus;
  views: number;
  date: string;
  summary: string;
};
type CourseStatus = "게시됨" | "초안" | "비공개";
type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: "입문" | "초급" | "중급" | "고급";
  duration: string;
  status: CourseStatus;
  popular: boolean;
  locked: boolean;
  views: number;
  date: string;
  content: string;
};
type Notification = {
  id: string;
  title: string;
  body: string;
  target: string;
  sentAt: string;
  count: number;
};

const INIT_USERS: User[] = [
  {
    id: "u1",
    email: "kim@example.com",
    name: "김투자",
    plan: "프리미엄",
    joined: "2025-01-15",
    lastSeen: "2026-05-18",
    status: "활성",
    reports: 42,
    bookmarks: 18,
    trades: 127,
    note: "",
  },
  {
    id: "u2",
    email: "lee@example.com",
    name: "이주식",
    plan: "무료",
    joined: "2025-02-20",
    lastSeen: "2026-05-17",
    status: "활성",
    reports: 8,
    bookmarks: 5,
    trades: 12,
    note: "",
  },
  {
    id: "u3",
    email: "park@example.com",
    name: "박퀀트",
    plan: "프리미엄",
    joined: "2025-03-10",
    lastSeen: "2026-05-16",
    status: "활성",
    reports: 67,
    bookmarks: 31,
    trades: 284,
    note: "VIP 고객",
  },
  {
    id: "u4",
    email: "choi@example.com",
    name: "최분석",
    plan: "무료",
    joined: "2025-04-05",
    lastSeen: "2026-04-10",
    status: "정지",
    reports: 2,
    bookmarks: 1,
    trades: 3,
    note: "스팸 신고",
  },
  {
    id: "u5",
    email: "jung@example.com",
    name: "정가치",
    plan: "프리미엄",
    joined: "2025-05-01",
    lastSeen: "2026-05-18",
    status: "활성",
    reports: 29,
    bookmarks: 14,
    trades: 56,
    note: "",
  },
  {
    id: "u6",
    email: "han@example.com",
    name: "한모멘텀",
    plan: "무료",
    joined: "2025-06-12",
    lastSeen: "2026-05-15",
    status: "활성",
    reports: 5,
    bookmarks: 3,
    trades: 8,
    note: "",
  },
  {
    id: "u7",
    email: "oh@example.com",
    name: "오배당",
    plan: "무료",
    joined: "2025-07-20",
    lastSeen: "2026-05-12",
    status: "대기",
    reports: 0,
    bookmarks: 0,
    trades: 0,
    note: "이메일 미인증",
  },
  {
    id: "u8",
    email: "yoon@example.com",
    name: "윤성장",
    plan: "프리미엄",
    joined: "2025-08-03",
    lastSeen: "2026-05-18",
    status: "활성",
    reports: 88,
    bookmarks: 45,
    trades: 312,
    note: "파워유저",
  },
];

const INIT_REPORTS: Report[] = [
  {
    id: "r1",
    title: "2026 Q2 연준 통화정책 전망",
    category: "거시",
    source: "키움증권",
    status: "게시됨",
    views: 1240,
    date: "2026-05-15",
    summary:
      "연준의 금리 동결 기조가 지속될 것으로 전망. 인플레이션 둔화 확인 후 하반기 인하 가능성.",
  },
  {
    id: "r2",
    title: "반도체 섹터 13F 분석 - 버크셔 포함",
    category: "13F",
    source: "하나증권",
    status: "게시됨",
    views: 890,
    date: "2026-05-12",
    summary: "버크셔 헤서웨이 Q1 13F 분석. 반도체 비중 확대 트렌드 확인.",
  },
  {
    id: "r3",
    title: "AI 인프라 투자 사이클 심층 분석",
    category: "산업",
    source: "대신증권",
    status: "초안",
    views: 0,
    date: "2026-05-18",
    summary: "AI 데이터센터 투자 사이클 2-3년 지속 전망. NVDA, AMD 수혜 분석.",
  },
  {
    id: "r4",
    title: "워런 버핏 2026 Q1 포트폴리오 변화",
    category: "13F",
    source: "신한투자증권",
    status: "게시됨",
    views: 2150,
    date: "2026-05-10",
    summary: "AAPL 비중 추가 축소, 에너지 섹터 확대. 현금 비중 사상 최고.",
  },
  {
    id: "r5",
    title: "미국 고용시장 통계 착시의 한계",
    category: "거시",
    source: "유안타증권",
    status: "게시됨",
    views: 567,
    date: "2026-05-08",
    summary: "BLS 고용 통계의 구조적 문제점 분석.",
  },
  {
    id: "r6",
    title: "국내 반도체 HBM 수요 전망",
    category: "산업",
    source: "DB증권",
    status: "비공개",
    views: 0,
    date: "2026-05-05",
    summary: "HBM3E 수요 급증 전망. 삼성전자, SK하이닉스 수혜 분석.",
  },
];

const INIT_COURSES: Course[] = [
  {
    id: "c1",
    title: "주식이란 무엇인가?",
    description: "주식의 개념, 주주의 권리, 배당과 자본이득의 차이",
    category: "투자 기초",
    level: "입문",
    duration: "8분",
    status: "게시됨",
    popular: false,
    locked: false,
    views: 1240,
    date: "2026-01-10",
    content: `## 주식이란 무엇인가?

주식(Stock)은 기업의 **소유권을 나타내는 증서**입니다. 기업이 자금을 조달하기 위해 발행하며, 주식을 보유한 사람을 **주주(Shareholder)**라고 합니다.

### 주주의 권리
- **의결권**: 주주총회에서 경영 사항에 대해 투표할 수 있습니다.
- **배당권**: 기업이 이익을 배당할 때 지분에 비례하여 받을 수 있습니다.
- **잔여재산 분배권**: 기업 청산 시 채권자 변제 후 남은 자산을 받을 수 있습니다.

> 💡 **핵심 포인트**: 주식 투자는 기업의 일부를 소유하는 것입니다.`,
  },
  {
    id: "c2",
    title: "캔들스틱 차트 완전 이해",
    description: "양봉, 음봉, 도지, 망치형 등 주요 캔들 패턴 해석",
    category: "기술적 분석",
    level: "초급",
    duration: "15분",
    status: "게시됨",
    popular: true,
    locked: false,
    views: 3420,
    date: "2026-01-15",
    content: `## 캔들스틱 차트 완전 이해

캔들스틱은 일정 기간의 시가, 고가, 저가, 종가를 시각적으로 표현합니다.

### 캔들의 구성
- **몸통 (Body)**: 시가와 종가 사이
- **꼬리 (Shadow/Wick)**: 고가와 저가를 나타내는 선
- **양봉 (Bullish)**: 종가 > 시가 (상승)
- **음봉 (Bearish)**: 종가 < 시가 (하락)`,
  },
  {
    id: "c3",
    title: "이동평균선 (MA) 전략",
    description: "단순/지수 이동평균선의 골든크로스, 데드크로스 전략",
    category: "기술적 분석",
    level: "중급",
    duration: "22분",
    status: "게시됨",
    popular: true,
    locked: false,
    views: 2890,
    date: "2026-01-20",
    content: `## 이동평균선 (MA) 전략

### 골든크로스 & 데드크로스
- **골든크로스**: 단기 MA가 장기 MA를 상향 돌파 → 매수 신호
- **데드크로스**: 단기 MA가 장기 MA를 하향 돌파 → 매도 신호`,
  },
  {
    id: "c4",
    title: "DCF 밸류에이션",
    description: "현금흐름 할인법으로 기업의 내재가치 계산",
    category: "가치투자",
    level: "중급",
    duration: "35분",
    status: "초안",
    popular: false,
    locked: true,
    views: 0,
    date: "2026-05-10",
    content: `## DCF 밸류에이션 (초안)

기업의 미래 현금흐름을 현재 가치로 할인하여 내재가치를 산출하는 방법입니다.

> ✏️ 이 강의는 아직 초안 상태입니다.`,
  },
  {
    id: "c5",
    title: "옵션 기초: 콜과 풋",
    description: "옵션의 기본 개념, 만기, 행사가격, 프리미엄",
    category: "심화 과정",
    level: "고급",
    duration: "35분",
    status: "비공개",
    popular: false,
    locked: true,
    views: 0,
    date: "2026-05-15",
    content: `## 옵션 기초: 콜과 풋

- **콜 옵션 (Call)**: 기초자산을 살 수 있는 권리
- **풋 옵션 (Put)**: 기초자산을 팔 수 있는 권리`,
  },
];

const INIT_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "5월 주간 시장 브리핑",
    body: "이번 주 S&P500 +1.2% 상승. AI 섹터 강세 지속.",
    target: "전체",
    sentAt: "2026-05-18 09:00",
    count: 1247,
  },
  {
    id: "n2",
    title: "신규 리포트 등록 알림",
    body: "워런 버핏 Q1 13F 분석 리포트가 등록되었습니다.",
    target: "프리미엄",
    sentAt: "2026-05-10 14:30",
    count: 342,
  },
  {
    id: "n3",
    title: "시스템 점검 안내",
    body: "5월 5일 02:00-04:00 시스템 점검이 예정되어 있습니다.",
    target: "전체",
    sentAt: "2026-05-04 18:00",
    count: 1198,
  },
];

// ── Login History mock data ──────────────────────────────────
type LoginRecord = {
  time: string;
  ip: string;
  device: string;
  location: string;
  status: "성공" | "실패";
};
const USER_LOGIN_HISTORY: Record<string, LoginRecord[]> = {
  u1: [
    {
      time: "2026-05-18 09:14",
      ip: "211.234.12.45",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-17 22:31",
      ip: "211.234.12.45",
      device: "Safari / iPhone",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-16 08:55",
      ip: "211.234.12.45",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-14 19:02",
      ip: "175.112.88.21",
      device: "Chrome / Windows",
      location: "부산, KR",
      status: "성공",
    },
    {
      time: "2026-05-12 11:40",
      ip: "211.234.12.45",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
  ],
  u2: [
    {
      time: "2026-05-17 14:22",
      ip: "58.140.23.91",
      device: "Firefox / Windows",
      location: "인천, KR",
      status: "성공",
    },
    {
      time: "2026-05-15 10:05",
      ip: "58.140.23.91",
      device: "Firefox / Windows",
      location: "인천, KR",
      status: "성공",
    },
    {
      time: "2026-05-10 09:18",
      ip: "58.140.23.91",
      device: "Firefox / Windows",
      location: "인천, KR",
      status: "실패",
    },
    {
      time: "2026-05-10 09:20",
      ip: "58.140.23.91",
      device: "Firefox / Windows",
      location: "인천, KR",
      status: "성공",
    },
  ],
  u3: [
    {
      time: "2026-05-18 07:30",
      ip: "121.88.45.12",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-18 07:28",
      ip: "203.11.22.99",
      device: "Chrome / Windows",
      location: "도쿄, JP",
      status: "실패",
    },
    {
      time: "2026-05-17 21:15",
      ip: "121.88.45.12",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-16 08:44",
      ip: "121.88.45.12",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-14 13:02",
      ip: "121.88.45.12",
      device: "Safari / iPhone",
      location: "서울, KR",
      status: "성공",
    },
  ],
  u4: [
    {
      time: "2026-04-10 16:55",
      ip: "222.99.11.44",
      device: "Chrome / Windows",
      location: "대전, KR",
      status: "성공",
    },
    {
      time: "2026-04-08 10:30",
      ip: "222.99.11.44",
      device: "Chrome / Windows",
      location: "대전, KR",
      status: "성공",
    },
  ],
  u5: [
    {
      time: "2026-05-18 11:02",
      ip: "175.223.44.88",
      device: "Safari / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-17 09:45",
      ip: "175.223.44.88",
      device: "Safari / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-15 20:11",
      ip: "175.223.44.88",
      device: "Safari / iPhone",
      location: "서울, KR",
      status: "성공",
    },
  ],
  u6: [
    {
      time: "2026-05-15 18:33",
      ip: "61.77.22.10",
      device: "Chrome / Android",
      location: "광주, KR",
      status: "성공",
    },
    {
      time: "2026-05-12 14:20",
      ip: "61.77.22.10",
      device: "Chrome / Android",
      location: "광주, KR",
      status: "성공",
    },
  ],
  u7: [],
  u8: [
    {
      time: "2026-05-18 06:55",
      ip: "114.200.33.77",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-17 23:44",
      ip: "114.200.33.77",
      device: "Safari / iPhone",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-17 07:12",
      ip: "114.200.33.77",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-16 22:30",
      ip: "114.200.33.77",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
    {
      time: "2026-05-15 08:05",
      ip: "114.200.33.77",
      device: "Chrome / macOS",
      location: "서울, KR",
      status: "성공",
    },
  ],
};

const WEEKLY_VISITS = [
  { day: "월", visits: 3200, premium: 820 },
  { day: "화", visits: 4100, premium: 1050 },
  { day: "수", visits: 3800, premium: 970 },
  { day: "목", visits: 4600, premium: 1180 },
  { day: "금", visits: 5200, premium: 1340 },
  { day: "토", visits: 2900, premium: 740 },
  { day: "일", visits: 2400, premium: 610 },
];

const COURSE_CATEGORIES = [
  "투자 기초",
  "기술적 분석",
  "가치투자",
  "퀀트 전략",
  "매크로 경제",
  "심화 과정",
];
const REPORT_CATEGORIES = [
  "거시",
  "13F",
  "산업",
  "종목",
  "퀀트",
  "채권",
  "원자재",
];
const SECURITIES = [
  "키움증권",
  "하나증권",
  "대신증권",
  "신한투자증권",
  "유안타증권",
  "DB증권",
  "미래에셋",
  "삼성증권",
  "NH투자증권",
];

const STATUS_DOT: Record<UserStatus, string> = {
  활성: "bg-up",
  정지: "bg-down",
  대기: "bg-amber-400",
};
const PLAN_BADGE: Record<UserPlan, string> = {
  프리미엄: "border-amber-500 text-amber-400",
  무료: "border-muted-foreground text-muted-foreground",
  어드민: "border-primary text-primary",
};
const REPORT_STATUS_COLOR: Record<ReportStatus, string> = {
  게시됨: "border-up text-up",
  초안: "border-amber-500 text-amber-400",
  비공개: "border-muted-foreground text-muted-foreground",
};
const COURSE_STATUS_COLOR: Record<CourseStatus, string> = {
  게시됨: "border-up text-up",
  초안: "border-amber-500 text-amber-400",
  비공개: "border-muted-foreground text-muted-foreground",
};
const LEVEL_COLORS: Record<string, string> = {
  입문: "border-emerald-500 text-emerald-400",
  초급: "border-sky-500 text-sky-400",
  중급: "border-amber-500 text-amber-400",
  고급: "border-violet-500 text-violet-400",
};

// ── Dashboard Tab ─────────────────────────────────────────────
function DashboardTab() {
  const stats = [
    {
      label: "총 사용자",
      value: "1,247",
      change: "+12%",
      up: true,
      icon: <Users size={16} />,
      sub: "이번 달 +43명",
    },
    {
      label: "프리미엄 구독",
      value: "342",
      change: "+8%",
      up: true,
      icon: <Crown size={16} />,
      sub: "전환율 27.4%",
    },
    {
      label: "이번 주 방문",
      value: "26,200",
      change: "+23%",
      up: true,
      icon: <Eye size={16} />,
      sub: "일평균 3,743",
    },
    {
      label: "리포트 수",
      value: "156",
      change: "+5",
      up: true,
      icon: <FileText size={16} />,
      sub: "이번 달 +12건",
    },
    {
      label: "강의 수",
      value: "28",
      change: "+2",
      up: true,
      icon: <BookOpen size={16} />,
      sub: "총 수강 14,200회",
    },
    {
      label: "알람 발송",
      value: "3건",
      change: "이번 주",
      up: true,
      icon: <Bell size={16} />,
      sub: "총 수신 2,787명",
    },
  ];
  const recentActivity = [
    {
      icon: <Users size={12} />,
      text: "신규 사용자 3명 가입",
      time: "10분 전",
      color: "text-up",
    },
    {
      icon: <FileText size={12} />,
      text: "리포트 '연준 통화정책 전망' 게시됨",
      time: "1시간 전",
      color: "text-primary",
    },
    {
      icon: <Crown size={12} />,
      text: "윤성장 님 프리미엄 결제",
      time: "2시간 전",
      color: "text-amber-400",
    },
    {
      icon: <Bell size={12} />,
      text: "주간 브리핑 알람 1,247명 발송",
      time: "3시간 전",
      color: "text-primary",
    },
    {
      icon: <UserX size={12} />,
      text: "최분석 계정 정지 처리",
      time: "1일 전",
      color: "text-down",
    },
    {
      icon: <BookOpen size={12} />,
      text: "강의 'DCF 밸류에이션' 초안 저장",
      time: "1일 전",
      color: "text-muted-foreground",
    },
    {
      icon: <TrendingUp size={12} />,
      text: "버핏 13F 리포트 조회수 2,000 돌파",
      time: "2일 전",
      color: "text-up",
    },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {stat.icon}
              </div>
            </div>
            <div className="text-xl font-bold font-mono">{stat.value}</div>
            <div
              className={cn(
                "text-xs mt-0.5 flex items-center gap-0.5",
                stat.up ? "text-up" : "text-down",
              )}
            >
              {stat.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{" "}
              {stat.change}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {stat.sub}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">주간 방문자 현황</h3>
            <span className="text-xs text-muted-foreground">최근 7일</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={WEEKLY_VISITS}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="visits"
                name="전체 방문"
                fill="var(--primary)"
                opacity={0.3}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="premium"
                name="프리미엄"
                fill="var(--primary)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-primary/30 inline-block" />{" "}
              전체 방문
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-primary inline-block" />{" "}
              프리미엄
            </span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">최근 활동</h3>
          <div className="space-y-2.5">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={cn("mt-0.5 flex-shrink-0", a.color)}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {a.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "무료 플랜", count: 905, pct: 72.6, color: "bg-muted" },
          {
            label: "프리미엄 플랜",
            count: 342,
            pct: 27.4,
            color: "bg-primary",
          },
          { label: "어드민", count: 2, pct: 0.2, color: "bg-amber-400" },
        ].map((p) => (
          <div
            key={p.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{p.label}</span>
              <span className="text-sm font-bold font-mono">
                {p.count.toLocaleString()}명
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", p.color)}
                style={{ width: `${p.pct}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {p.pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Security Risk Helper ─────────────────────────────────────
function getUserRisk(userId: string): {
  hasFail: boolean;
  hasOverseas: boolean;
} {
  const logs = USER_LOGIN_HISTORY[userId] ?? [];
  const failCount = logs.filter((l) => l.status === "실패").length;
  const hasOverseas = logs.some((l) => !l.location.endsWith(", KR"));
  return { hasFail: failCount >= 2, hasOverseas };
}

// ── Users Tab ─────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<User[]>(INIT_USERS);
  const [search, setSearch] = useState("");

  // Overlay real backend users (admin-RLS gated). On error/forbidden we
  // silently keep the mock list so the admin demo page still works.
  useEffect(() => {
    let cancelled = false;
    adminService
      .users()
      .then((res) => {
        if (cancelled || res.items.length === 0) return;
        const fromServer: User[] = res.items.map((u) => ({
          id: u.id,
          email: u.email ?? "",
          name: u.display_name || (u.email ?? "사용자").split("@")[0],
          plan:
            u.role === "admin" || u.role === "superadmin"
              ? "어드민"
              : u.plan === "premium"
                ? "프리미엄"
                : "무료",
          joined: (u.created_at ?? "").slice(0, 10),
          lastSeen: "",
          status: "활성" as UserStatus,
          reports: 0,
          bookmarks: 0,
          trades: 0,
          note: "",
        }));
        // Server users first, then mock users not already represented (by email).
        const serverEmails = new Set(fromServer.map((u) => u.email));
        const mockExtras = INIT_USERS.filter((u) => !serverEmails.has(u.email));
        setUsers([...fromServer, ...mockExtras]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [filterPlan, setFilterPlan] = useState<"전체" | UserPlan>("전체");
  const [filterStatus, setFilterStatus] = useState<"전체" | UserStatus>("전체");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editPlan, setEditPlan] = useState<UserPlan>("무료");

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const matchSearch =
          !search.trim() || u.name.includes(search) || u.email.includes(search);
        const matchPlan = filterPlan === "전체" || u.plan === filterPlan;
        const matchStatus =
          filterStatus === "전체" || u.status === filterStatus;
        return matchSearch && matchPlan && matchStatus;
      }),
    [users, search, filterPlan, filterStatus],
  );

  const openUser = (u: User) => {
    setSelectedUser(u);
    setEditNote(u.note);
    setEditPlan(u.plan);
  };

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const next: UserStatus = u.status === "활성" ? "정지" : "활성";
        if (selectedUser?.id === id) setSelectedUser({ ...u, status: next });
        return { ...u, status: next };
      }),
    );
    toast.success("계정 상태 변경 완료");
  };

  const savePlan = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, plan: editPlan, note: editNote } : u,
      ),
    );
    if (selectedUser?.id === id)
      setSelectedUser((prev) =>
        prev ? { ...prev, plan: editPlan, note: editNote } : null,
      );
    // Best-effort persist role change to backend. UI succeeds either way.
    const role = editPlan === "어드민" ? "admin" : "user";
    adminService.updateUser(id, role).catch(() => {});
    toast.success("사용자 정보 저장 완료");
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSelectedUser(null);
    toast.info("사용자 삭제 완료");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 이메일 검색..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(["전체", "프리미엄", "무료"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlan(p as "전체" | UserPlan)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                filterPlan === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["전체", "활성", "정지", "대기"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as "전체" | UserStatus)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length}명
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["사용자", "플랜", "상태", "가입일", "최근 접속", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => openUser(u)}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/10 transition-colors cursor-pointer group",
                      selectedUser?.id === u.id &&
                        "bg-primary/5 border-l-2 border-l-primary",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {u.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">
                              {u.name}
                            </span>
                            {(() => {
                              const r = getUserRisk(u.id);
                              return r.hasFail || r.hasOverseas ? (
                                <span
                                  title={[
                                    r.hasFail ? "로그인 실패 2회 이상" : "",
                                    r.hasOverseas ? "해외 IP 접근 감지" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                  className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-1 py-0.5"
                                >
                                  <AlertTriangle size={9} />
                                  {r.hasFail && r.hasOverseas
                                    ? "실패+해외"
                                    : r.hasFail
                                      ? "실패"
                                      : "해외IP"}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          PLAN_BADGE[u.plan],
                        )}
                      >
                        {u.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            STATUS_DOT[u.status],
                          )}
                        />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {u.joined}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {u.lastSeen}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight
                        size={13}
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                    {selectedUser.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold">{selectedUser.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedUser.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "리포트 조회", value: selectedUser.reports },
                  { label: "북마크", value: selectedUser.bookmarks },
                  { label: "거래 수", value: selectedUser.trades },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-muted/20 rounded-lg p-2.5 text-center"
                  >
                    <div className="text-base font-bold font-mono">
                      {s.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  플랜 변경
                </label>
                <div className="flex gap-1.5">
                  {(["무료", "프리미엄", "어드민"] as UserPlan[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setEditPlan(p)}
                      className={cn(
                        "flex-1 text-xs py-1.5 rounded-lg border transition-colors",
                        editPlan === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  관리자 메모
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  placeholder="내부 메모 (사용자에게 표시 안됨)"
                  className="w-full px-3 py-2 text-sm bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-primary resize-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => savePlan(selectedUser.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Save size={12} /> 저장
                </button>
                <button
                  onClick={() => toggleStatus(selectedUser.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                    selectedUser.status === "활성"
                      ? "border-down/40 text-down hover:bg-down/10"
                      : "border-up/40 text-up hover:bg-up/10",
                  )}
                >
                  {selectedUser.status === "활성" ? (
                    <>
                      <UserX size={12} /> 계정 정지
                    </>
                  ) : (
                    <>
                      <UserCheck size={12} /> 계정 활성화
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={() => deleteUser(selectedUser.id)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-down/30 text-down text-xs hover:bg-down/10 transition-colors"
              >
                <Trash2 size={11} /> 사용자 삭제
              </button>
              <div className="pt-1 border-t border-border space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <History size={11} /> 로그인 이력
                </div>
                {(USER_LOGIN_HISTORY[selectedUser.id] ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    이력 없음
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(USER_LOGIN_HISTORY[selectedUser.id] ?? []).map(
                      (log, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg px-3 py-2 text-[11px] border",
                            log.status === "실패"
                              ? "border-down/30 bg-down/5"
                              : "border-border bg-muted/10",
                          )}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-mono text-muted-foreground">
                              {log.time}
                            </span>
                            <span
                              className={cn(
                                "font-semibold",
                                log.status === "실패" ? "text-down" : "text-up",
                              )}
                            >
                              {log.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Globe size={9} /> {log.ip}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Monitor size={9} /> {log.device}
                            </span>
                          </div>
                          <div className="text-muted-foreground/70 mt-0.5">
                            {log.location}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground pt-1">
                  가입일: {selectedUser.joined}
                  {selectedUser.note && (
                    <div className="mt-0.5 text-amber-400">
                      메모: {selectedUser.note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <Users size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                사용자를 선택하면
                <br />
                상세 정보가 표시됩니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────
function ContentTab() {
  const [reports, setReports] = useState<Report[]>(INIT_REPORTS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"전체" | ReportStatus>(
    "전체",
  );
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "거시",
    source: "키움증권",
    status: "초안" as ReportStatus,
    summary: "",
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        const matchSearch =
          !search.trim() ||
          r.title.includes(search) ||
          r.source.includes(search);
        const matchStatus =
          filterStatus === "전체" || r.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [reports, search, filterStatus],
  );

  const openAdd = () => {
    setEditId(null);
    setForm({
      title: "",
      category: "거시",
      source: "키움증권",
      status: "초안",
      summary: "",
    });
    setShowForm(true);
  };
  const openEdit = (r: Report) => {
    setEditId(r.id);
    setForm({
      title: r.title,
      category: r.category,
      source: r.source,
      status: r.status,
      summary: r.summary,
    });
    setShowForm(true);
  };
  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("제목을 입력하세요.");
      return;
    }
    if (editId) {
      setReports((prev) =>
        prev.map((r) => (r.id === editId ? { ...r, ...form } : r)),
      );
      toast.success("리포트 수정 완료");
    } else {
      setReports((prev) => [
        {
          id: "r" + Date.now(),
          views: 0,
          date: new Date().toISOString().slice(0, 10),
          ...form,
        },
        ...prev,
      ]);
      toast.success("리포트 등록 완료");
    }
    setShowForm(false);
  };
  const toggleStatus = (id: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: ReportStatus = r.status === "게시됨" ? "비공개" : "게시됨";
        return { ...r, status: next };
      }),
    );
    toast.success("상태 변경 완료");
  };
  const deleteReport = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    toast.info("리포트 삭제");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목 또는 증권사 검색..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(["전체", "게시됨", "초안", "비공개"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as "전체" | ReportStatus)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity ml-auto"
        >
          <Plus size={12} /> 리포트 추가
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {["제목", "카테고리", "증권사", "상태", "조회수", "날짜", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <>
                <tr
                  key={r.id}
                  className="border-b border-border/50 hover:bg-muted/10 transition-colors group cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === r.id ? null : r.id)
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        size={12}
                        className={cn(
                          "text-muted-foreground transition-transform flex-shrink-0",
                          expandedId === r.id && "rotate-180",
                        )}
                      />
                      <span className="font-medium text-sm">{r.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {r.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {r.source}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        REPORT_STATUS_COLOR[r.status],
                      )}
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {r.date}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleStatus(r.id)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title={
                          r.status === "게시됨" ? "비공개 전환" : "게시 전환"
                        }
                      >
                        {r.status === "게시됨" ? (
                          <Eye size={12} />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => deleteReport(r.id)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-down"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr
                    key={r.id + "-exp"}
                    className="border-b border-border/50 bg-muted/5"
                  >
                    <td colSpan={7} className="px-8 py-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {r.summary || "요약 없음"}
                      </p>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <div
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold font-['Outfit']">
                  {editId ? "리포트 수정" : "리포트 추가"}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    제목 *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-primary"
                    placeholder="리포트 제목"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      카테고리
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, category: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-primary"
                    >
                      {REPORT_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      증권사
                    </label>
                    <select
                      value={form.source}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, source: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-primary"
                    >
                      {SECURITIES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    상태
                  </label>
                  <div className="flex gap-1.5">
                    {(["초안", "게시됨", "비공개"] as ReportStatus[]).map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => setForm((p) => ({ ...p, status: s }))}
                          className={cn(
                            "flex-1 text-xs py-1.5 rounded-lg border transition-colors",
                            form.status === s
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {s}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    요약
                  </label>
                  <textarea
                    value={form.summary}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, summary: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
                    placeholder="리포트 요약 내용"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {editId ? "수정 완료" : "등록"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

// ── Course Tab ────────────────────────────────────────────────
function CourseTab() {
  const [courses, setCourses] = useState<Course[]>(INIT_COURSES);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Course, "id" | "views" | "date">>({
    title: "",
    description: "",
    category: "투자 기초",
    level: "입문",
    duration: "",
    status: "초안",
    popular: false,
    locked: false,
    content: "",
  });

  const openAdd = () => {
    setEditId(null);
    setForm({
      title: "",
      description: "",
      category: "투자 기초",
      level: "입문",
      duration: "",
      status: "초안",
      popular: false,
      locked: false,
      content: COURSE_CONTENT_TEMPLATE,
    });
    setShowForm(true);
  };
  const openEdit = (c: Course) => {
    setEditId(c.id);
    setForm({
      title: c.title,
      description: c.description,
      category: c.category,
      level: c.level,
      duration: c.duration,
      status: c.status,
      popular: c.popular,
      locked: c.locked,
      content: c.content ?? "",
    });
    setShowForm(true);
  };
  const handleSave = () => {
    if (!form.title.trim() || !form.duration.trim()) {
      toast.error("제목과 수강 시간을 입력하세요.");
      return;
    }
    if (form.status === "게시됨" && !form.content.trim()) {
      toast.error("게시하려면 본문 내용을 작성하세요.");
      return;
    }
    if (editId) {
      setCourses((prev) =>
        prev.map((c) => (c.id === editId ? { ...c, ...form } : c)),
      );
      toast.success("강의 수정 완료");
    } else {
      setCourses((prev) => [
        {
          id: "c" + Date.now(),
          views: 0,
          date: new Date().toISOString().slice(0, 10),
          ...form,
        },
        ...prev,
      ]);
      toast.success("강의 등록 완료");
    }
    setShowForm(false);
  };
  const toggleStatus = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next: CourseStatus = c.status === "게시됨" ? "비공개" : "게시됨";
        return { ...c, status: next };
      }),
    );
    toast.success("상태 변경 완료");
  };
  const toggleLock = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c)),
    );
  };
  const togglePopular = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, popular: !c.popular } : c)),
    );
  };
  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast.info("강의 삭제");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          총 {courses.length}개 강의
        </span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={12} /> 강의 추가
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {[
                "강의명",
                "카테고리",
                "난이도",
                "시간",
                "상태",
                "조회수",
                "잠금",
                "인기",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border/50 hover:bg-muted/10 transition-colors group"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.description.slice(0, 30)}...
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {c.category}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      LEVEL_COLORS[c.level],
                    )}
                  >
                    {c.level}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {c.duration}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleStatus(c.id)}>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-70 transition-opacity",
                        COURSE_STATUS_COLOR[c.status],
                      )}
                    >
                      {c.status}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {c.views.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleLock(c.id)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      c.locked
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.locked ? <Lock size={13} /> : <Unlock size={13} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => togglePopular(c.id)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      c.popular
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Star
                      size={13}
                      fill={c.popular ? "currentColor" : "none"}
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => deleteCourse(c.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-down"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <CourseEditorModal
          editId={editId}
          form={form}
          setForm={setForm}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

const COURSE_CONTENT_TEMPLATE = `## 강의 소개

이 강의에서 다룰 내용을 한 문단으로 정리합니다.

### 학습 목표
- 핵심 개념 1
- 핵심 개념 2
- 핵심 개념 3

## 본문

여기에 본문을 작성합니다. **굵게**, *기울임*, \`코드\`, [링크](https://example.com)를 사용할 수 있습니다.

> 💡 핵심 포인트를 강조할 때 인용 블록을 사용하세요.

### 표 예시
| 항목 | 설명 |
|------|------|
| A | 설명 A |
| B | 설명 B |

## 마무리

학습한 내용을 요약하고 다음 단계를 안내합니다.`;

// ── Course Editor Modal (Markdown editor + live preview) ──────
type CourseFormState = Omit<Course, "id" | "views" | "date">;

function CourseEditorModal({
  editId,
  form,
  setForm,
  onClose,
  onSave,
}: {
  editId: string | null;
  form: CourseFormState;
  setForm: React.Dispatch<React.SetStateAction<CourseFormState>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const [mode, setMode] = useState<"edit" | "preview" | "split">("split");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const charCount = form.content.length;
  const wordCount = form.content.trim()
    ? form.content.trim().split(/\s+/).length
    : 0;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  /**
   * Wrap or insert markdown syntax around the current textarea selection.
   * @param before Prefix to insert before selection.
   * @param after Suffix to insert after selection.
   * @param placeholder Placeholder used when selection is empty.
   */
  const surround = (before: string, after: string, placeholder = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const selected = value.slice(start, end) || placeholder;
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    setForm((p) => ({ ...p, content: next }));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + selected.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  /**
   * Insert a block-level markdown snippet at the start of the current line.
   * @param prefix Line prefix such as "## ".
   */
  const insertLinePrefix = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const value = ta.value;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    setForm((p) => ({ ...p, content: next }));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + prefix.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  /**
   * Append a fenced block (table / quote / code) at the cursor position.
   * @param block Block text to insert, surrounded by newlines.
   */
  const insertBlock = (block: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const value = ta.value;
    const needsLead = start > 0 && value[start - 1] !== "\n";
    const insert = (needsLead ? "\n" : "") + block + "\n";
    const next = value.slice(0, start) + insert + value.slice(start);
    setForm((p) => ({ ...p, content: next }));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const toolbar: { label: string; title: string; onClick: () => void }[] = [
    { label: "H2", title: "큰 제목", onClick: () => insertLinePrefix("## ") },
    { label: "H3", title: "소제목", onClick: () => insertLinePrefix("### ") },
    {
      label: "B",
      title: "굵게",
      onClick: () => surround("**", "**", "굵은 글씨"),
    },
    {
      label: "I",
      title: "기울임",
      onClick: () => surround("*", "*", "기울임"),
    },
    { label: "•", title: "리스트", onClick: () => insertLinePrefix("- ") },
    {
      label: "1.",
      title: "번호 리스트",
      onClick: () => insertLinePrefix("1. "),
    },
    { label: "❝", title: "인용", onClick: () => insertLinePrefix("> ") },
    {
      label: "<>",
      title: "인라인 코드",
      onClick: () => surround("`", "`", "code"),
    },
    {
      label: "🔗",
      title: "링크",
      onClick: () => surround("[", "](https://)", "링크 텍스트"),
    },
    {
      label: "▦",
      title: "표 삽입",
      onClick: () =>
        insertBlock(
          "| 항목 | 설명 |\n|------|------|\n| A | 설명 A |\n| B | 설명 B |",
        ),
    },
  ];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col w-full max-w-6xl my-auto max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/10">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-primary" />
              <h3 className="font-semibold font-['Outfit'] text-sm">
                {editId ? "강의 수정" : "새 강의 작성"}
              </h3>
              <span className="text-[11px] text-muted-foreground ml-2">
                블로그형 글쓰기 · 마크다운 지원
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted/30 rounded-lg p-0.5 text-[11px]">
                {(["edit", "split", "preview"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors",
                      mode === m
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "edit"
                      ? "에디터"
                      : m === "preview"
                        ? "프리뷰"
                        : "분할"}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Meta fields */}
          <div className="px-5 py-3 border-b border-border space-y-2.5">
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="강의 제목"
              className="w-full bg-transparent text-lg font-semibold font-['Outfit'] focus:outline-none placeholder:text-muted-foreground/50"
            />
            <input
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="한 줄 요약 (목록과 카드에 노출됩니다)"
              className="w-full bg-transparent text-sm text-muted-foreground focus:outline-none placeholder:text-muted-foreground/40"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
                className="px-2.5 py-1 text-xs bg-muted/20 border border-border rounded-md focus:outline-none focus:border-primary"
              >
                {COURSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                value={form.level}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    level: e.target.value as Course["level"],
                  }))
                }
                className="px-2.5 py-1 text-xs bg-muted/20 border border-border rounded-md focus:outline-none focus:border-primary"
              >
                {["입문", "초급", "중급", "고급"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <input
                value={form.duration}
                onChange={(e) =>
                  setForm((p) => ({ ...p, duration: e.target.value }))
                }
                placeholder="수강 시간 (예: 15분)"
                className="px-2.5 py-1 text-xs bg-muted/20 border border-border rounded-md focus:outline-none focus:border-primary w-32"
              />
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as CourseStatus,
                  }))
                }
                className="px-2.5 py-1 text-xs bg-muted/20 border border-border rounded-md focus:outline-none focus:border-primary"
              >
                {["초안", "게시됨", "비공개"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 cursor-pointer ml-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.locked}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, locked: e.target.checked }))
                  }
                  className="rounded"
                />
                <Lock size={11} /> 프리미엄
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, popular: e.target.checked }))
                  }
                  className="rounded"
                />
                <Star size={11} /> 인기
              </label>
              <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                {wordCount.toLocaleString()} 단어 · {charCount.toLocaleString()}
                자 · 약 {readMinutes}분 읽기
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/5 overflow-x-auto">
            {toolbar.map((t) => (
              <button
                key={t.label}
                type="button"
                title={t.title}
                onClick={t.onClick}
                className="px-2 py-1 text-[11px] font-medium rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Editor + Preview body */}
          <div
            className="flex-1 min-h-[420px] overflow-hidden grid"
            style={{
              gridTemplateColumns: mode === "split" ? "1fr 1fr" : "1fr",
            }}
          >
            {(mode === "edit" || mode === "split") && (
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(e) =>
                  setForm((p) => ({ ...p, content: e.target.value }))
                }
                placeholder={COURSE_CONTENT_TEMPLATE}
                spellCheck={false}
                className="w-full h-full p-5 bg-muted/5 border-r border-border resize-none focus:outline-none text-sm font-mono leading-relaxed placeholder:text-muted-foreground/40"
              />
            )}
            {(mode === "preview" || mode === "split") && (
              <div className="w-full h-full overflow-auto p-6 bg-card">
                {form.content.trim() ? (
                  <article className="max-w-2xl mx-auto">
                    <MarkdownPreview content={form.content} />
                  </article>
                ) : (
                  <div className="text-center text-sm text-muted-foreground/60 py-10">
                    미리보기가 여기에 표시됩니다.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/10">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              취소
            </button>
            <button
              onClick={onSave}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Save size={12} /> {editId ? "수정 완료" : "등록"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Lightweight markdown renderer (headings, lists, tables, blockquote, inline) ──
function MarkdownPreview({ content }: { content: string }) {
  /**
   * Render inline markdown (bold, italic, code, link) inside a single line.
   * @param text Source line.
   */
  const renderInline = (text: string): React.ReactNode => {
    const tokens: React.ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) tokens.push(text.slice(last, match.index));
      const m = match[0];
      if (m.startsWith("**"))
        tokens.push(
          <strong key={key++} className="font-semibold text-foreground">
            {m.slice(2, -2)}
          </strong>,
        );
      else if (m.startsWith("`"))
        tokens.push(
          <code
            key={key++}
            className="px-1 py-0.5 rounded bg-muted/40 text-primary text-[0.85em] font-mono"
          >
            {m.slice(1, -1)}
          </code>,
        );
      else if (m.startsWith("[")) {
        const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(m);
        if (lm)
          tokens.push(
            <a
              key={key++}
              href={lm[2]}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {lm[1]}
            </a>,
          );
        else tokens.push(m);
      } else
        tokens.push(
          <em key={key++} className="italic">
            {m.slice(1, -1)}
          </em>,
        );
      last = match.index + m.length;
    }
    if (last < text.length) tokens.push(text.slice(last));
    return tokens;
  };

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={key++}
          className="text-xl font-bold font-['Outfit'] mt-5 mb-2.5 text-foreground"
        >
          {line.slice(3)}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={key++}
          className="text-base font-semibold mt-4 mb-1.5 text-foreground"
        >
          {line.slice(4)}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-2 border-primary pl-3 py-1.5 bg-primary/5 rounded-r-lg text-muted-foreground italic my-2"
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="list-disc pl-5 space-y-1 my-2 text-sm text-muted-foreground"
        >
          {items.map((it, k) => (
            <li key={k}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          className="list-decimal pl-5 space-y-1 my-2 text-sm text-muted-foreground"
        >
          {items.map((it, k) => (
            <li key={k}>{renderInline(it)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    if (
      line.startsWith("| ") &&
      i + 1 < lines.length &&
      /^\|\s*-+/.test(lines[i + 1])
    ) {
      const header = line
        .split("|")
        .slice(1, -1)
        .map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("| ")) {
        rows.push(
          lines[i]
            .split("|")
            .slice(1, -1)
            .map((s) => s.trim()),
        );
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/30">
              <tr>
                {header.map((h, k) => (
                  <th
                    key={k}
                    className="px-3 py-1.5 text-left font-medium text-foreground border-b border-border"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-border/40">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-muted-foreground">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.trim() === "") {
      blocks.push(<div key={key++} className="h-1" />);
      i++;
      continue;
    }
    blocks.push(
      <p
        key={key++}
        className="text-sm leading-relaxed text-muted-foreground my-1.5"
      >
        {renderInline(line)}
      </p>,
    );
    i++;
  }
  return <div className="space-y-1">{blocks}</div>;
}

// ── Notification Tab ──────────────────────────────────────────
function NotificationTab() {
  const [notifications, setNotifications] =
    useState<Notification[]>(INIT_NOTIFICATIONS);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"전체" | "프리미엄" | "무료">("전체");
  const [sending, setSending] = useState(false);

  const targetCount =
    target === "전체" ? 1247 : target === "프리미엄" ? 342 : 905;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("제목과 내용을 입력하세요.");
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    const newNotif: Notification = {
      id: "n" + Date.now(),
      title,
      body,
      target,
      sentAt: new Date().toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      count: targetCount,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setTitle("");
    setBody("");
    setSending(false);
    toast.success(`${targetCount.toLocaleString()}명에게 알람 발송 완료`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Send size={14} className="text-primary" /> 알람 작성
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                발송 대상
              </label>
              <div className="flex gap-1.5">
                {(["전체", "프리미엄", "무료"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={cn(
                      "flex-1 text-xs py-2 rounded-lg border transition-colors",
                      target === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}{" "}
                    {t === "전체"
                      ? "(1,247)"
                      : t === "프리미엄"
                        ? "(342)"
                        : "(905)"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                제목 *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="알람 제목"
                className="w-full px-3 py-2 text-sm bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                내용 *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="알람 내용을 입력하세요..."
                className="w-full px-3 py-2 text-sm bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-primary resize-none transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              수신 예상:{" "}
              <strong className="text-foreground">
                {targetCount.toLocaleString()}명
              </strong>
            </span>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? (
                <>
                  <RefreshCw size={12} className="animate-spin" /> 발송 중...
                </>
              ) : (
                <>
                  <Send size={12} /> 발송하기
                </>
              )}
            </button>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">빠른 템플릿</h3>
          {[
            {
              title: "주간 시장 브리핑",
              body: "이번 주 시장 동향을 정리했습니다. 주요 지수 및 섹터 분석을 확인하세요.",
            },
            {
              title: "신규 리포트 알림",
              body: "새로운 분석 리포트가 등록되었습니다. 지금 바로 확인해보세요.",
            },
            {
              title: "거장 포트폴리오 업데이트",
              body: "팔로우 중인 거장의 포트폴리오 변화가 감지되었습니다.",
            },
            {
              title: "시스템 점검 안내",
              body: "예정된 시스템 점검이 있습니다. 이용에 참고 부탁드립니다.",
            },
          ].map((t) => (
            <button
              key={t.title}
              onClick={() => {
                setTitle(t.title);
                setBody(t.body);
                toast.info("템플릿 적용됨");
              }}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/10 transition-colors group"
            >
              <div className="text-sm font-medium group-hover:text-primary transition-colors">
                {t.title}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {t.body}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">발송 이력</h3>
          <span className="text-xs text-muted-foreground">
            {notifications.length}건
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {["제목", "내용", "대상", "발송 시각", "수신자 수"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr
                key={n.id}
                className="border-b border-border/50 hover:bg-muted/10 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-sm">{n.title}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                  {n.body}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {n.target}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {n.sentAt}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  {n.count.toLocaleString()}명
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────
function SettingsTab() {
  const [settings, setSettings] = useState({
    allowSignup: true,
    freeReportAccess: true,
    maintenanceMode: false,
    emailNotification: true,
    premiumOnlyMasters: false,
    showAdBanner: false,
  });
  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success("설정 변경됨");
  };
  const settingItems = [
    {
      key: "allowSignup" as const,
      label: "신규 가입 허용",
      desc: "비활성화 시 신규 회원가입 차단",
    },
    {
      key: "freeReportAccess" as const,
      label: "무료 플랜 리포트 접근",
      desc: "무료 사용자의 리포트 열람 허용",
    },
    {
      key: "emailNotification" as const,
      label: "이메일 알림 발송",
      desc: "시스템 알림 이메일 발송 여부",
    },
    {
      key: "premiumOnlyMasters" as const,
      label: "거장 상세 프리미엄 전용",
      desc: "거장 상세 페이지를 프리미엄 전용으로 설정",
    },
    {
      key: "showAdBanner" as const,
      label: "광고 배너 표시",
      desc: "무료 사용자에게 광고 배너 노출",
    },
    {
      key: "maintenanceMode" as const,
      label: "유지보수 모드",
      desc: "활성화 시 일반 사용자 접근 차단",
    },
  ];
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card border border-border rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold mb-3">어드민 권한 계정</h3>
        {ADMIN_EMAILS.map((email) => (
          <div
            key={email}
            className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-primary" />
              <span className="text-sm">{email}</span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] border-primary text-primary"
            >
              어드민
            </Badge>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">
          어드민 이메일 추가/제거는 코드의 ADMIN_EMAILS 배열을 수정하세요.
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold mb-3">사이트 설정</h3>
        {settingItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
          >
            <div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.desc}
              </div>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ml-4",
                settings[item.key] ? "bg-primary" : "bg-muted",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm",
                  settings[item.key] ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">데이터 관리</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "사용자 데이터 내보내기", icon: <Download size={13} /> },
            { label: "리포트 목록 내보내기", icon: <Download size={13} /> },
            { label: "캐시 초기화", icon: <RefreshCw size={13} /> },
            { label: "로그 다운로드", icon: <Download size={13} /> },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => toast.info("백엔드 연동 후 사용 가능합니다")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
const ADMIN_TABS = [
  { label: "대시보드", icon: <BarChart3 size={13} /> },
  { label: "사용자 관리", icon: <Users size={13} /> },
  { label: "리포트 관리", icon: <FileText size={13} /> },
  { label: "강의 관리", icon: <GraduationCap size={13} /> },
  { label: "알람 발송", icon: <Bell size={13} /> },
  { label: "설정", icon: <Settings size={13} /> },
];

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in-up">
        <Shield size={48} className="text-muted-foreground/30" />
        <h2 className="text-xl font-bold font-['Outfit']">
          로그인이 필요합니다
        </h2>
        <p className="text-sm text-muted-foreground">
          어드민 페이지는 로그인 후 접근 가능합니다.
        </p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in-up">
        <AlertCircle size={48} className="text-down/50" />
        <h2 className="text-xl font-bold font-['Outfit']">접근 권한 없음</h2>
        <p className="text-sm text-muted-foreground">
          어드민 계정으로만 접근 가능합니다.
        </p>
        <p className="text-xs text-muted-foreground">현재 계정: {user.email}</p>
      </div>
    );
  }

  const TAB_CONTENT = [
    <DashboardTab />,
    <UsersTab />,
    <ContentTab />,
    <CourseTab />,
    <NotificationTab />,
    <SettingsTab />,
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Outfit']">어드민</h1>
            <Badge
              variant="outline"
              className="border-primary text-primary text-xs gap-1"
            >
              <Shield size={10} /> 관리자
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            사용자 관리 · 콘텐츠 관리 · 알람 발송
          </p>
        </div>
      </div>
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl overflow-x-auto">
        {ADMIN_TABS.map((tab, i) => (
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
      {TAB_CONTENT[activeTab]}
    </div>
  );
}
