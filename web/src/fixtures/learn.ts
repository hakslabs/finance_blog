export type LearnTab = "입문서·칼럼" | "용어 사전" | "리포트 라이브러리";
export const LEARN_TABS = ["입문서·칼럼", "용어 사전", "리포트 라이브러리"] as const;

export type LearnCategory = {
  id: string;
  title: string;
  count: number;
  focus: string;
  path: string[];
};

export type GuideArticle = {
  id: string;
  title: string;
  minutes: string;
  category: string;
  summary: string;
  objectives: string[];
  keyConcepts: string[];
  example: string;
  checklist: string[];
};

export type GlossaryTerm = {
  id: string;
  term: string;
  korean: string;
  category: string;
  description: string;
  formula?: string;
  example: string;
  pitfalls: string[];
  relatedTerms: string[];
};

export const LEARN_CATEGORIES: LearnCategory[] = [
  { id: "statements", title: "재무제표 읽는 법", count: 12, focus: "손익계산서·재무상태표·현금흐름표를 한 번에 연결", path: ["매출", "마진", "운전자본", "잉여현금흐름"] },
  { id: "technical", title: "기술적 분석 입문", count: 18, focus: "추세·거래량·변동성을 신호가 아니라 확률로 해석", path: ["이동평균", "RSI", "거래량", "손절 기준"] },
  { id: "value", title: "가치투자 기초", count: 9, focus: "안전마진과 이익의 질을 동시에 점검", path: ["PER", "PBR", "ROE", "현금흐름"] },
  { id: "quant", title: "퀀트 팩터 입문", count: 14, focus: "가치·모멘텀·퀄리티 팩터를 규칙으로 비교", path: ["팩터 정의", "리밸런싱", "유니버스", "성과 검증"] },
  { id: "derivatives", title: "옵션·파생", count: 8, focus: "레버리지 상품의 손익 구조와 위험 한도 이해", path: ["콜·풋", "내재변동성", "만기", "포지션 크기"] },
  { id: "macro", title: "매크로·금리", count: 6, focus: "금리·물가·환율이 밸류에이션과 섹터에 주는 영향", path: ["기준금리", "장단기 금리", "CPI", "달러"] },
];

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: "dcf",
    title: "DCF 모델, 가정 5개로 끝내기",
    minutes: "15분",
    category: "재무",
    summary: "매출 성장률, 마진, 재투자, WACC, 터미널 성장률만으로 보수적 가치를 잡습니다.",
    objectives: ["DCF가 미래 현금흐름을 현재가치로 바꾸는 방식 이해", "가정 5개가 적정가에 주는 민감도 파악", "낙관·기준·보수 시나리오를 분리"],
    keyConcepts: ["FCF", "WACC", "Terminal growth", "Margin of safety"],
    example: "매출 10조 기업이 5년간 6% 성장하고 영업마진 18%, WACC 9%, 터미널 성장률 2%라면 할인율 1%p 변화만으로 적정가가 크게 흔들립니다.",
    checklist: ["매출 성장률이 산업 성장률보다 과하지 않은가", "마진 가정이 과거 평균보다 높은 이유가 있는가", "WACC와 영구성장률 조합이 현실적인가"],
  },
  {
    id: "golden-cross",
    title: "골든크로스, 정말 작동할까? 백테스트",
    minutes: "8분",
    category: "기술",
    summary: "단순 이동평균 신호를 시장 국면별로 나눠 해석합니다.",
    objectives: ["골든크로스를 매수 명령이 아니라 추세 전환 후보로 이해", "횡보장에서 발생하는 거짓 신호 구분", "손절·분할매수 규칙과 함께 사용"],
    keyConcepts: ["SMA 50", "SMA 200", "Whipsaw", "Trend filter"],
    example: "S&P 500이 200일선 위에 있고 거래량이 증가하는 구간의 골든크로스는 하락장 반등 신호보다 신뢰도가 높습니다.",
    checklist: ["장기 지수 추세가 우상향인가", "거래량이 평균보다 늘었는가", "신호 발생 후 손절 기준이 명확한가"],
  },
  {
    id: "net-net",
    title: "Graham의 Net-Net 종목 찾기",
    minutes: "12분",
    category: "가치",
    summary: "유동자산 기반 안전마진 스크리닝을 실전 후보군으로 연결합니다.",
    objectives: ["순유동자산가치의 의미 이해", "회계상 싸 보이는 종목의 함정 구분", "청산가치와 계속기업가치를 분리"],
    keyConcepts: ["NCAV", "Current assets", "Total liabilities", "Liquidity discount"],
    example: "유동자산 5,000억, 총부채 2,000억, 시가총액 2,100억이면 NCAV 대비 할인 거래지만 재고자산 회수 가능성을 반드시 봐야 합니다.",
    checklist: ["현금과 매출채권 비중이 충분한가", "재고 평가손 위험이 큰 업종인가", "적자가 자산을 빠르게 갉아먹고 있지 않은가"],
  },
  {
    id: "dupont",
    title: "ROE 분해 - DuPont 5단계",
    minutes: "10분",
    category: "재무",
    summary: "ROE를 마진, 회전율, 레버리지로 분해해 지속성을 봅니다.",
    objectives: ["ROE 상승 원인이 수익성인지 레버리지인지 구분", "동종업계와 자산 효율 비교", "일회성 이익을 제외한 정상 ROE 추정"],
    keyConcepts: ["Net margin", "Asset turnover", "Equity multiplier", "Tax burden"],
    example: "ROE 20% 기업이라도 순이익률이 낮고 부채비율만 높다면 금리 상승기에 ROE가 빠르게 훼손될 수 있습니다.",
    checklist: ["마진 개선이 반복 가능한가", "자산 회전율이 업계 평균보다 높은가", "레버리지 확대가 ROE를 왜곡하지 않는가"],
  },
  {
    id: "cash-flow-quality",
    title: "순이익보다 현금흐름을 먼저 보는 이유",
    minutes: "11분",
    category: "재무",
    summary: "이익은 나는데 현금이 안 들어오는 기업을 운전자본과 투자현금흐름으로 걸러냅니다.",
    objectives: ["순이익과 영업현금흐름의 차이 이해", "운전자본 증가가 현금흐름에 미치는 영향 파악", "FCF 마진으로 이익의 질 평가"],
    keyConcepts: ["CFO", "Capex", "Working capital", "FCF margin"],
    example: "매출채권이 매출보다 빠르게 늘면 손익계산서상 이익은 좋아 보여도 실제 현금 회수 위험이 커질 수 있습니다.",
    checklist: ["영업현금흐름이 순이익을 꾸준히 따라오는가", "Capex가 유지보수성인지 성장투자인지 구분했는가", "매출채권 회전일수가 늘고 있지 않은가"],
  },
  {
    id: "position-sizing",
    title: "초보 투자자의 포지션 크기 정하기",
    minutes: "9분",
    category: "리스크",
    summary: "확신이 아니라 손실 허용폭을 기준으로 종목 비중과 추가매수 한도를 정합니다.",
    objectives: ["한 종목 손실이 전체 계좌에 주는 영향 계산", "분할매수와 손절 기준을 사전에 정의", "상관관계가 높은 종목 중복 노출 줄이기"],
    keyConcepts: ["Risk per trade", "Max drawdown", "Correlation", "Cash buffer"],
    example: "계좌 1,000만원에서 한 아이디어당 최대 손실을 1%로 제한하면 손절폭 10% 종목의 최초 진입 금액은 100만원 이하가 됩니다.",
    checklist: ["최대 손실 금액을 숫자로 정했는가", "동일 섹터 종목이 과도하게 겹치지 않는가", "추가매수 조건이 가격 하락만으로 되어 있지 않은가"],
  },
  {
    id: "macro-rate-cycle",
    title: "금리 사이클이 성장주와 배당주에 미치는 영향",
    minutes: "13분",
    category: "매크로",
    summary: "할인율 변화가 장기 성장 현금흐름과 고배당 자산의 상대 매력을 어떻게 바꾸는지 봅니다.",
    objectives: ["금리와 할인율의 관계 이해", "장기 성장주의 밸류에이션 민감도 파악", "배당수익률과 국채금리 비교"],
    keyConcepts: ["Discount rate", "Duration", "Equity risk premium", "Dividend yield"],
    example: "10년물 금리가 급등하면 먼 미래 이익 비중이 큰 성장주의 현재가치가 더 크게 조정될 수 있습니다.",
    checklist: ["밸류에이션 하락이 실적 때문인지 할인율 때문인지 나눴는가", "배당수익률이 무위험 금리 대비 충분한가", "부채 만기 구조가 금리 상승에 취약하지 않은가"],
  },
  {
    id: "factor-combine",
    title: "가치·모멘텀·퀄리티 팩터를 같이 쓰는 법",
    minutes: "14분",
    category: "퀀트",
    summary: "단일 팩터 쏠림을 줄이고 서로 다른 시장 국면에서 버틸 수 있는 스코어를 만듭니다.",
    objectives: ["팩터별 강점과 약점 이해", "정규화 점수로 종목을 비교", "리밸런싱 주기와 거래비용 고려"],
    keyConcepts: ["Z-score", "Rank", "Rebalance", "Factor decay"],
    example: "PER 하위 20%만 사면 가치 함정에 걸릴 수 있어 ROE, 부채비율, 6개월 모멘텀을 함께 점수화합니다.",
    checklist: ["팩터 정의가 일관적인가", "극단치 처리를 했는가", "성과가 거래비용 후에도 남는가"],
  },
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  { id: "per", term: "PER", korean: "주가수익비율", category: "재무지표", description: "주가를 주당순이익으로 나눈 값. 낮을수록 저평가일 수 있지만 성장성과 회계 품질을 함께 봐야 합니다.", formula: "PER = 주가 / EPS", example: "주가 50,000원, EPS 5,000원이면 PER은 10배입니다.", pitfalls: ["일회성 이익으로 EPS가 부풀면 PER이 낮아 보입니다.", "고성장 기업과 저성장 기업의 적정 PER은 다릅니다."], relatedTerms: ["EPS", "PEG", "Earnings yield"] },
  { id: "pbr", term: "PBR", korean: "주가순자산비율", category: "재무지표", description: "주가를 주당순자산으로 나눈 값. 금융주와 자산주에서 특히 자주 씁니다.", formula: "PBR = 주가 / BPS", example: "PBR 0.7배 은행주는 장부가보다 싸지만 부실채권 위험을 같이 봐야 합니다.", pitfalls: ["무형자산 비중이 큰 기업은 장부가가 경제적 가치를 잘 못 담습니다."], relatedTerms: ["BPS", "ROE", "청산가치"] },
  { id: "roe", term: "ROE", korean: "자기자본이익률", category: "재무지표", description: "순이익을 자기자본으로 나눈 자본 효율 지표입니다.", formula: "ROE = 순이익 / 평균 자기자본", example: "ROE 18% 기업은 자기자본 100원으로 18원의 이익을 낸 셈입니다.", pitfalls: ["부채를 늘려도 ROE가 올라갈 수 있습니다.", "자사주 소각은 분모를 줄여 ROE를 높입니다."], relatedTerms: ["ROA", "DuPont", "Equity multiplier"] },
  { id: "eps", term: "EPS", korean: "주당순이익", category: "재무지표", description: "순이익을 발행주식수로 나눈 값입니다.", formula: "EPS = 보통주 귀속 순이익 / 가중평균 주식수", example: "순이익 1조원, 주식수 1억주면 EPS는 10,000원입니다.", pitfalls: ["희석주식수와 기본주식수 차이를 확인해야 합니다."], relatedTerms: ["Diluted EPS", "PER", "순이익"] },
  { id: "ev-ebitda", term: "EV/EBITDA", korean: "기업가치 / 상각전영업이익", category: "밸류에이션", description: "부채와 현금을 반영한 인수 관점의 가치 배수입니다.", formula: "EV/EBITDA = (시가총액 + 순부채) / EBITDA", example: "현금이 많은 기업은 같은 시가총액이라도 EV가 낮아질 수 있습니다.", pitfalls: ["Capex가 큰 업종은 EBITDA만 보면 현금창출력이 과대평가됩니다."], relatedTerms: ["EV", "EBITDA", "FCF"] },
  { id: "beta", term: "Beta", korean: "베타", category: "위험", description: "시장 대비 변동성입니다. 1이면 시장과 비슷하게 움직입니다.", formula: "Beta = Cov(종목수익률, 시장수익률) / Var(시장수익률)", example: "베타 1.3 종목은 시장이 1% 움직일 때 평균적으로 1.3% 움직이는 경향이 있습니다.", pitfalls: ["과거 데이터 기반이라 구조 변화에는 늦게 반응합니다."], relatedTerms: ["변동성", "상관계수", "CAPM"] },
  { id: "fcf", term: "FCF", korean: "잉여현금흐름", category: "현금흐름", description: "영업활동으로 번 현금에서 필요한 투자를 뺀 뒤 주주와 채권자에게 남는 현금입니다.", formula: "FCF = 영업현금흐름 - 설비투자", example: "CFO 3조원, Capex 1조원이면 FCF는 2조원입니다.", pitfalls: ["성장투자를 줄이면 일시적으로 FCF가 좋아 보일 수 있습니다."], relatedTerms: ["CFO", "Capex", "FCF yield"] },
  { id: "wacc", term: "WACC", korean: "가중평균자본비용", category: "밸류에이션", description: "주주와 채권자가 요구하는 수익률을 자본 구조 비중으로 평균낸 할인율입니다.", formula: "WACC = E/V×Re + D/V×Rd×(1-T)", example: "부채비중이 낮고 이익 안정성이 높은 기업은 WACC가 낮아지는 경향이 있습니다.", pitfalls: ["너무 낮은 WACC를 쓰면 DCF 적정가가 쉽게 부풀어 오릅니다."], relatedTerms: ["DCF", "Cost of equity", "Cost of debt"] },
  { id: "peg", term: "PEG", korean: "성장 조정 PER", category: "밸류에이션", description: "PER을 이익 성장률로 나눠 성장성을 반영한 상대 가치 지표입니다.", formula: "PEG = PER / EPS 성장률", example: "PER 30배라도 EPS 성장률이 30%면 PEG는 1 수준입니다.", pitfalls: ["성장률 추정이 틀리면 지표 전체가 의미를 잃습니다."], relatedTerms: ["PER", "EPS growth", "Growth stock"] },
  { id: "rsi", term: "RSI", korean: "상대강도지수", category: "기술지표", description: "최근 상승폭과 하락폭을 비교해 과매수·과매도 정도를 보는 모멘텀 지표입니다.", formula: "RSI = 100 - 100 / (1 + RS)", example: "RSI 70 이상은 과열 후보, 30 이하는 침체 후보로 해석합니다.", pitfalls: ["강한 추세에서는 RSI가 오래 과열권에 머물 수 있습니다."], relatedTerms: ["Momentum", "MACD", "Divergence"] },
  { id: "drawdown", term: "Drawdown", korean: "고점 대비 하락률", category: "위험", description: "이전 최고점에서 현재 또는 최저점까지 얼마나 손실이 났는지 보여주는 위험 지표입니다.", formula: "Drawdown = 현재가 / 이전 고점 - 1", example: "100만원 계좌가 82만원까지 내려가면 최대 낙폭은 -18%입니다.", pitfalls: ["평균 수익률이 좋아도 낙폭이 크면 실제 운용이 어렵습니다."], relatedTerms: ["Max drawdown", "Volatility", "Sharpe ratio"] },
  { id: "duration", term: "Duration", korean: "듀레이션", category: "금리", description: "금리 변화에 대한 채권 또는 현금흐름 가치의 민감도입니다.", example: "듀레이션이 긴 성장주는 금리 상승기에 밸류에이션 압박을 더 크게 받을 수 있습니다.", pitfalls: ["주식에서 말하는 듀레이션은 회계 지표가 아니라 현금흐름 시점에 대한 해석입니다."], relatedTerms: ["Discount rate", "Bond yield", "Growth stock"] },
];
