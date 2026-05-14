export type MyPageKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
};

export type TodoItem = {
  id: string;
  done: boolean;
  title: string;
  category: string;
  meta: string;
};

export type WatchlistSummary = {
  id: string;
  name: string;
  count: number;
  performance: string;
};

export type ActivityLog = {
  id: string;
  date: string;
  action: string;
  target: string;
};

export type PositionThesis = {
  id: string;
  symbol: string;
  name: string;
  openedAt: string;
  quantity: string;
  averagePrice: string;
  currentPrice: string;
  returnPct: string;
  positive: boolean;
  weight: string;
  thesis: string;
  conditions: string[];
  exitPlan: string;
  alerts: { id: string; trigger: string; note: string; urgent: boolean }[];
  tags: string[];
};

export type TransactionHistory = {
  id: string;
  date: string;
  type: "매수" | "매도" | "배당";
  symbol: string;
  quantity: string;
  price: string;
  currency: "USD" | "KRW";
  amount: string;
  fee: string;
};

export type SettingRow = {
  id: string;
  group: string;
  label: string;
  value: string;
  status: string;
};

export const MYPAGE_KPIS: MyPageKpi[] = [
  { id: "positions", label: "보유 포지션", value: "12", detail: "Thesis 12/12" },
  { id: "reactions", label: "반응 메모 필요", value: "3", detail: "±10% 알람", warning: true },
  { id: "notes", label: "작성한 메모", value: "128", detail: "종목·뉴스·거래·학습" },
  { id: "watchlist", label: "관심종목", value: "24", detail: "3개 리스트" },
  { id: "screens", label: "저장한 검색", value: "7", detail: "신규 편입 +3" },
  { id: "masters", label: "팔로우 고수", value: "5", detail: "Buffett 외" },
];

export const MY_TODOS: TodoItem[] = [
  { id: "nvda", done: true, title: "NVDA 실적 발표 전 메모 업데이트", category: "종목", meta: "D-1" },
  { id: "soxl", done: false, title: "SOXL -12% 도달 - 매도/추가매수 판단 메모 작성", category: "반응", meta: "알람" },
  { id: "samsung", done: false, title: "삼성전자 외인 순매수 이유 확인", category: "뉴스", meta: "34분 전" },
  { id: "aapl", done: false, title: "AAPL 배당락 전 포지션 점검", category: "이벤트", meta: "D-2" },
  { id: "rsi", done: false, title: "RSI 과매수 종목 2개 검토", category: "신호", meta: "관심종목" },
];

export const WATCHLIST_SUMMARIES: WatchlistSummary[] = [
  { id: "base", name: "기본", count: 8, performance: "+1.2%" },
  { id: "us", name: "미국주", count: 7, performance: "+2.4%" },
  { id: "dividend", name: "배당주", count: 5, performance: "+0.8%" },
  { id: "ai", name: "AI 테마", count: 4, performance: "+5.1%" },
];

export const ACTIVITY_LOGS: ActivityLog[] = [
  { id: "a1", date: "2026-05-10 14:32", action: "관심종목 추가", target: "NVDA" },
  { id: "a2", date: "2026-05-10 11:08", action: "거래 입력", target: "AAPL 매수 10주 @ $184.32" },
  { id: "a3", date: "2026-05-09 18:42", action: "고수 팔로우", target: "Peter Lynch" },
  { id: "a4", date: "2026-05-08 09:14", action: "용어 북마크", target: "Free Cash Flow" },
  { id: "a5", date: "2026-05-06 22:01", action: "검색 저장", target: "저PER 고ROE" },
];

export const POSITION_THESES: PositionThesis[] = [
  {
    id: "nvda",
    symbol: "NVDA",
    name: "NVIDIA",
    openedAt: "2026-02-14",
    quantity: "14주",
    averagePrice: "$612.40",
    currentPrice: "$912.18",
    returnPct: "+48.9%",
    positive: true,
    weight: "12.4%",
    thesis: "AI 추론 인프라 수요가 최소 2027년까지 CapEx 사이클을 지지한다는 가정입니다.",
    conditions: ["데이터센터 매출 >= +80% YoY", "Gross Margin >= 70%", "PER <= 60"],
    exitPlan: "-15% 손절 · +60% 부분 익절 · 데이터센터 성장률 50% 하회 시 청산",
    alerts: [
      { id: "n1", trigger: "+30% 도달", note: "가이던스 상향. 비중 유지.", urgent: false },
      { id: "n2", trigger: "+48% 도달", note: "반응 메모 필요", urgent: true },
    ],
    tags: ["AI", "반도체", "장기"],
  },
  {
    id: "soxl",
    symbol: "SOXL",
    name: "Direxion Semis 3x",
    openedAt: "2026-05-10",
    quantity: "30주",
    averagePrice: "$28.40",
    currentPrice: "$25.00",
    returnPct: "-12.0%",
    positive: false,
    weight: "1.8%",
    thesis: "매수 당시 thesis 미작성. 뉴스 헤드라인 보고 추격매수한 케이스입니다.",
    conditions: ["사후 기록 필요"],
    exitPlan: "청산 검토",
    alerts: [
      { id: "s1", trigger: "-10% 도달", note: "반응 메모 필요", urgent: true },
      { id: "s2", trigger: "-12% 도달", note: "반응 메모 필요", urgent: true },
    ],
    tags: ["실수복기", "추격매수", "3x레버리지"],
  },
];

export const TRANSACTION_HISTORY: TransactionHistory[] = [
  { id: "t1", date: "2026-05-04", type: "매수", symbol: "AAPL", quantity: "10", price: "184.32", currency: "USD", amount: "1,843.20", fee: "0.50" },
  { id: "t2", date: "2026-04-28", type: "매도", symbol: "TSLA", quantity: "5", price: "224.10", currency: "USD", amount: "1,120.50", fee: "0.40" },
  { id: "t3", date: "2026-04-22", type: "매수", symbol: "005930", quantity: "50", price: "78,400", currency: "KRW", amount: "3,920,000", fee: "785" },
  { id: "t4", date: "2026-04-15", type: "배당", symbol: "MSFT", quantity: "—", price: "0.83", currency: "USD", amount: "4.15", fee: "0" },
];

export const SETTING_ROWS: SettingRow[] = [
  { id: "profile", group: "프로필", label: "이름", value: "홍길동", status: "저장됨" },
  { id: "style", group: "투자 성향", label: "투자 스타일", value: "장기 투자 · 성장주 중심", status: "추천 반영" },
  { id: "market", group: "시장 / 통화", label: "기본 시장", value: "한국 + 미국 · KRW", status: "활성" },
  { id: "language", group: "언어 / 타임존", label: "표시", value: "한·영 혼용 · Asia/Seoul", status: "활성" },
  { id: "notification", group: "알림 설정", label: "알림", value: "가격 · 13F · 배당 · 공시", status: "4개 켜짐" },
  { id: "export", group: "데이터 내보내기", label: "백업", value: "CSV · JSON", status: "준비됨" },
];
