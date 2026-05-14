export type LearnTab = "입문서·칼럼" | "용어 사전" | "리포트 라이브러리";
export const LEARN_TABS = ["입문서·칼럼", "용어 사전", "리포트 라이브러리"] as const;

export type LearnCategory = {
  id: string;
  title: string;
  count: number;
};

export type GuideArticle = {
  id: string;
  title: string;
  minutes: string;
  category: string;
  summary: string;
};

export type GlossaryTerm = {
  id: string;
  term: string;
  korean: string;
  category: string;
  description: string;
};

export const LEARN_CATEGORIES: LearnCategory[] = [
  { id: "statements", title: "재무제표 읽는 법", count: 12 },
  { id: "technical", title: "기술적 분석 입문", count: 18 },
  { id: "value", title: "가치투자 기초", count: 9 },
  { id: "quant", title: "퀀트 팩터 입문", count: 14 },
  { id: "derivatives", title: "옵션·파생", count: 8 },
  { id: "macro", title: "매크로·금리", count: 6 },
];

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: "dcf",
    title: "DCF 모델, 가정 5개로 끝내기",
    minutes: "15분",
    category: "재무",
    summary: "매출 성장률, 마진, 재투자, WACC, 터미널 성장률만으로 보수적 가치를 잡습니다.",
  },
  {
    id: "golden-cross",
    title: "골든크로스, 정말 작동할까? 백테스트",
    minutes: "8분",
    category: "기술",
    summary: "단순 이동평균 신호를 시장 국면별로 나눠 해석합니다.",
  },
  {
    id: "net-net",
    title: "Graham의 Net-Net 종목 찾기",
    minutes: "12분",
    category: "가치",
    summary: "유동자산 기반 안전마진 스크리닝을 실전 후보군으로 연결합니다.",
  },
  {
    id: "dupont",
    title: "ROE 분해 - DuPont 5단계",
    minutes: "10분",
    category: "재무",
    summary: "ROE를 마진, 회전율, 레버리지로 분해해 지속성을 봅니다.",
  },
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  { id: "per", term: "PER", korean: "주가수익비율", category: "재무지표", description: "주가를 주당순이익으로 나눈 값. 낮을수록 저평가일 수 있지만 성장성과 회계 품질을 함께 봐야 합니다." },
  { id: "pbr", term: "PBR", korean: "주가순자산비율", category: "재무지표", description: "주가를 주당순자산으로 나눈 값. 금융주와 자산주에서 특히 자주 씁니다." },
  { id: "roe", term: "ROE", korean: "자기자본이익률", category: "재무지표", description: "순이익을 자기자본으로 나눈 자본 효율 지표입니다." },
  { id: "eps", term: "EPS", korean: "주당순이익", category: "재무지표", description: "순이익을 발행주식수로 나눈 값입니다." },
  { id: "ev-ebitda", term: "EV/EBITDA", korean: "기업가치 / 상각전영업이익", category: "밸류에이션", description: "부채와 현금을 반영한 인수 관점의 가치 배수입니다." },
  { id: "beta", term: "Beta", korean: "베타", category: "위험", description: "시장 대비 변동성입니다. 1이면 시장과 비슷하게 움직입니다." },
];
