export type MasterStrategy = "가치" | "매크로" | "성장" | "혁신" | "컨트래리언" | "멘탈모델" | "정량";
export type HoldingChange = "up" | "down" | "flat" | "new" | "exit";

export type MasterListItem = {
  id: string;
  name: string;
  firm: string;
  strategy: MasterStrategy[];
  style: string;
  aum: string;
  holdingsCount: number;
  latestFiling: string;
  cagr5y: string;
};

export type MasterHolding = {
  id: string;
  symbol: string;
  name: string;
  weight: string;
  change: string;
  changeKind: HoldingChange;
};

export type MasterQuarterChange = {
  id: string;
  symbol: string;
  name: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  latest: string;
  change: string;
  kind: HoldingChange;
};

export type MasterDetail = MasterListItem & {
  initials: string;
  bio: string;
  principles: string[];
  recentChanges: { id: string; type: string; text: string; kind: HoldingChange }[];
  holdings: MasterHolding[];
  quarterChanges: MasterQuarterChange[];
  books: { id: string; title: string; note: string }[];
};

export const MASTERS: MasterListItem[] = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    firm: "Berkshire Hathaway",
    strategy: ["가치"],
    style: "가치 · 장기보유",
    aum: "$320B",
    holdingsCount: 47,
    latestFiling: "2026 Q1",
    cagr5y: "+13.4%",
  },
  {
    id: "ray-dalio",
    name: "Ray Dalio",
    firm: "Bridgewater",
    strategy: ["매크로"],
    style: "매크로 · 올웨더",
    aum: "$170B",
    holdingsCount: 380,
    latestFiling: "2026 Q1",
    cagr5y: "+7.8%",
  },
  {
    id: "charlie-munger",
    name: "Charlie Munger",
    firm: "Daily Journal",
    strategy: ["멘탈모델"],
    style: "집중투자 · 멘탈모델",
    aum: "—",
    holdingsCount: 0,
    latestFiling: "히스토리",
    cagr5y: "—",
  },
  {
    id: "peter-lynch",
    name: "Peter Lynch",
    firm: "Magellan (전)",
    strategy: ["성장"],
    style: "성장 · 생활속 발굴",
    aum: "—",
    holdingsCount: 0,
    latestFiling: "히스토리",
    cagr5y: "—",
  },
  {
    id: "benjamin-graham",
    name: "Benjamin Graham",
    firm: "가치투자 원조",
    strategy: ["정량", "가치"],
    style: "안전마진 · 정량",
    aum: "—",
    holdingsCount: 0,
    latestFiling: "히스토리",
    cagr5y: "—",
  },
  {
    id: "cathie-wood",
    name: "Cathie Wood",
    firm: "ARK Invest",
    strategy: ["혁신"],
    style: "파괴적 혁신",
    aum: "$13B",
    holdingsCount: 36,
    latestFiling: "2026 Q1",
    cagr5y: "-4.2%",
  },
  {
    id: "michael-burry",
    name: "Michael Burry",
    firm: "Scion",
    strategy: ["컨트래리언"],
    style: "컨트래리언 · 숏",
    aum: "$200M",
    holdingsCount: 11,
    latestFiling: "2026 Q1",
    cagr5y: "+9.1%",
  },
];

export const MASTER_DETAILS: MasterDetail[] = [
  {
    ...MASTERS[0],
    initials: "WB",
    bio: "Berkshire Hathaway를 통해 이해 가능한 사업, 경제적 해자, 장기 보유를 강조하는 대표 가치투자자입니다.",
    principles: [
      "이해할 수 있는 사업에만 투자한다.",
      "경제적 해자가 있는 기업을 우선 검토한다.",
      "정직하고 주주친화적인 경영진을 선호한다.",
      "안전마진이 확보된 가격에서만 매수한다.",
      "가장 좋아하는 보유 기간은 영원이다.",
    ],
    holdings: [
      { id: "aapl", symbol: "AAPL", name: "Apple", weight: "41.2%", change: "-2.1%", changeKind: "down" },
      { id: "bac", symbol: "BAC", name: "Bank of America", weight: "9.8%", change: "0%", changeKind: "flat" },
      { id: "axp", symbol: "AXP", name: "American Express", weight: "8.4%", change: "+0.4%", changeKind: "up" },
      { id: "ko", symbol: "KO", name: "Coca-Cola", weight: "7.1%", change: "0%", changeKind: "flat" },
      { id: "cvx", symbol: "CVX", name: "Chevron", weight: "6.2%", change: "-1.8%", changeKind: "down" },
      { id: "oxy", symbol: "OXY", name: "Occidental", weight: "4.9%", change: "+1.2%", changeKind: "up" },
    ],
    quarterChanges: [
      { id: "aapl", symbol: "AAPL", name: "Apple", q1: "915M", q2: "905M", q3: "905M", q4: "300M", latest: "295M", change: "-1%", kind: "down" },
      { id: "bac", symbol: "BAC", name: "Bank of America", q1: "1.0B", q2: "1.0B", q3: "1.0B", q4: "1.0B", latest: "1.0B", change: "0%", kind: "flat" },
      { id: "cb", symbol: "CB", name: "Chubb", q1: "—", q2: "—", q3: "25.9M", q4: "27.0M", latest: "27.0M", change: "신규", kind: "new" },
      { id: "oxy", symbol: "OXY", name: "Occidental", q1: "244M", q2: "248M", q3: "255M", q4: "255M", latest: "286M", change: "+12%", kind: "up" },
      { id: "hpq", symbol: "HPQ", name: "HP Inc.", q1: "62M", q2: "55M", q3: "22M", q4: "—", latest: "—", change: "청산", kind: "exit" },
    ],
    recentChanges: [
      { id: "cb", type: "신규", text: "CB · Chubb", kind: "new" },
      { id: "oxy", type: "증가", text: "OXY +12%", kind: "up" },
      { id: "aapl", type: "감소", text: "AAPL -1%", kind: "down" },
      { id: "hpq", type: "청산", text: "HPQ", kind: "exit" },
    ],
    books: [
      { id: "snowball", title: "The Snowball", note: "버핏의 투자 생애와 의사결정 맥락" },
      { id: "letters", title: "Berkshire Letters", note: "주주서한으로 읽는 장기 복리 사고" },
    ],
  },
  {
    ...MASTERS[1],
    initials: "RD",
    bio: "Bridgewater 창업자. 경기 사이클과 자산군 상관관계를 중심으로 올웨더 포트폴리오를 설명합니다.",
    principles: [
      "경제는 신용 사이클과 생산성 사이클의 조합이다.",
      "상관관계가 낮은 자산을 섞어 위험을 줄인다.",
      "인플레이션과 성장의 네 국면을 나눠 본다.",
      "원칙을 기록하고 반복 가능한 의사결정으로 만든다.",
    ],
    holdings: [
      { id: "spy", symbol: "SPY", name: "S&P 500 ETF", weight: "18.4%", change: "+2.0%", changeKind: "up" },
      { id: "eem", symbol: "EEM", name: "Emerging Markets", weight: "10.2%", change: "-1.4%", changeKind: "down" },
      { id: "gld", symbol: "GLD", name: "Gold Trust", weight: "8.8%", change: "+3.2%", changeKind: "up" },
      { id: "tlt", symbol: "TLT", name: "20Y Treasury", weight: "7.3%", change: "0%", changeKind: "flat" },
    ],
    quarterChanges: [
      { id: "gld", symbol: "GLD", name: "Gold Trust", q1: "4.2M", q2: "4.9M", q3: "5.1M", q4: "5.4M", latest: "5.8M", change: "+7%", kind: "up" },
      { id: "eem", symbol: "EEM", name: "Emerging Markets", q1: "11.2M", q2: "10.8M", q3: "10.4M", q4: "9.8M", latest: "9.2M", change: "-6%", kind: "down" },
    ],
    recentChanges: [
      { id: "gld", type: "증가", text: "GLD +7%", kind: "up" },
      { id: "eem", type: "감소", text: "EEM -6%", kind: "down" },
    ],
    books: [
      { id: "principles", title: "Principles", note: "원칙 기반 의사결정" },
      { id: "big-debt", title: "Big Debt Crises", note: "부채 사이클 분석" },
    ],
  },
];

export function getMaster(id: string | undefined): MasterDetail | undefined {
  return MASTER_DETAILS.find((master) => master.id === id);
}
