import { useMemo, useState, type FormEvent } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { Skeleton } from "../../components/primitives/Skeleton";
import { POSITION_THESES, type PositionThesis } from "../../fixtures/mypage";
import { STOCK_LIST, type StockListItem } from "../../fixtures/stocks";
import { usePortfolio } from "../../lib/usePortfolio";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import type { DetailContent } from "../../lib/interaction/action-intent";
import type {
  Portfolio,
  PortfolioHolding,
  PortfolioTransaction,
  PortfolioTransactionType,
} from "../../lib/api-client";
import { HoldingsTable } from "./sections/HoldingsTable";
import { KpiStrip } from "./sections/KpiStrip";
import { TransactionsTable } from "./sections/TransactionsTable";
import styles from "./PortfolioPage.module.css";

const TX_TYPES: { value: PortfolioTransactionType; label: string }[] = [
  { value: "buy", label: "매수" },
  { value: "sell", label: "매도" },
  { value: "dividend", label: "배당" },
  { value: "deposit", label: "입금" },
];

type TransactionDraft = {
  type: PortfolioTransactionType;
  symbol: string;
  quantity: string;
  price: string;
  amount: string;
  currency: string;
  note: string;
};

const EMPTY_DRAFT: TransactionDraft = {
  type: "buy",
  symbol: "",
  quantity: "",
  price: "",
  amount: "",
  currency: "USD",
  note: "",
};

function formatUpdatedAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function holdingDetail(row: PortfolioHolding) {
  return {
    id: `portfolio-holding-${row.exchange}-${row.symbol}`,
    eyebrow: "보유 종목",
    title: `${row.symbol} · ${row.name}`,
    meta: `${row.exchange} · ${row.currency}`,
    summary: "거래 원장 기반으로 계산한 현재 보유 상세입니다.",
    sections: [
      {
        title: "보유 값",
        body: "현재 포지션 원장 기준입니다.",
        items: [
          `수량: ${row.quantity}`,
          `평단가: ${row.average_cost}`,
          `투자원금: ${row.cost_basis}`,
        ],
      },
    ],
  };
}

function transactionDetail(row: PortfolioTransaction) {
  return {
    id: `portfolio-transaction-${row.id}`,
    eyebrow: "거래 내역",
    title: `${row.symbol ?? "현금"} · ${row.type}`,
    meta: row.occurred_at,
    summary: row.note || "거래 원장의 개별 기록입니다.",
    sections: [
      {
        title: "거래 값",
        body: "포지션 계산에 사용되는 원장 항목입니다.",
        items: [
          `수량: ${row.quantity ?? "—"}`,
          `단가: ${row.price ?? "—"}`,
          `금액: ${row.amount} ${row.currency}`,
        ],
      },
    ],
  };
}

function thesisDetail(position: PositionThesis): DetailContent {
  return {
    id: `portfolio-thesis-${position.id}`,
    eyebrow: "투자 근거",
    title: `${position.symbol} · ${position.name}`,
    meta: `${position.openedAt} 진입 · 비중 ${position.weight}`,
    summary: position.thesis,
    tags: position.tags,
    sections: [
      {
        title: "현재 상태",
        body: "진입 시점의 가정과 현재 수익률을 같이 봅니다.",
        items: [
          `수량: ${position.quantity}`,
          `평단가: ${position.averagePrice}`,
          `현재가: ${position.currentPrice}`,
          `수익률: ${position.returnPct}`,
        ],
      },
      {
        title: "판단 조건",
        body: "이 조건이 깨지면 보유 이유를 다시 써야 합니다.",
        items: position.conditions,
      },
      {
        title: "청산 계획",
        body: position.exitPlan,
      },
      {
        title: "반응 메모",
        body: "가격이 크게 움직였을 때 감정이 아니라 사전에 정한 기준으로 복기합니다.",
        items: position.alerts.map((alert) => `${alert.trigger}: ${alert.note}`),
      },
    ],
  };
}

function alertRuleDetail(position: PositionThesis): DetailContent {
  return {
    id: `portfolio-alert-rules-${position.id}`,
    eyebrow: "포지션 알림 규칙",
    title: `${position.symbol} 목표가 / 손절 / Thesis 알림`,
    summary: "목표 도달, 손절 라인 접근, 예상과 반대 방향으로 가는 상황을 놓치지 않기 위한 규칙입니다.",
    tags: ["목표가", "손절", "반응 메모"],
    sections: [
      {
        title: "현재 등록된 반응 알림",
        body: "가격 또는 조건 변화가 생기면 포지션 판단을 다시 열어야 하는 트리거입니다.",
        items: position.alerts.map((alert) => `${alert.urgent ? "긴급" : "일반"} · ${alert.trigger}: ${alert.note}`),
      },
      {
        title: "권장 규칙",
        body: "실제 저장 API가 붙으면 이 규칙들이 사용자별 알림으로 저장됩니다.",
        items: [
          "목표가 도달: 부분익절 또는 보유 지속 근거 재검토",
          "손절가 접근: 추가매수 금지, 원래 thesis 훼손 여부 확인",
          "예상 반대 시나리오 발생: 실적, 뉴스, 지표 변화 중 원인 기록",
        ],
      },
      {
        title: "손절 실행 기준",
        body: position.exitPlan,
      },
    ],
  };
}

function newThesisTemplate(symbol: string): DetailContent {
  const target = symbol.trim().toUpperCase() || "새 종목";
  return {
    id: `portfolio-thesis-template-${target}`,
    eyebrow: "투자 근거 템플릿",
    title: `${target} 투자 근거 작성`,
    summary: "매수 전에 최소한 이 항목들은 적고 들어가야 나중에 복기가 됩니다.",
    tags: ["작성 필요", "Thesis"],
    sections: [
      {
        title: "매수 이유",
        body: "사업/실적/밸류에이션/수급 중 어떤 이유로 사는지 한 문장으로 씁니다.",
        items: ["핵심 가정", "확인한 데이터", "틀릴 수 있는 이유"],
      },
      {
        title: "관리 조건",
        body: "보유 중 매주 또는 이벤트마다 확인할 숫자입니다.",
        items: ["실적 조건", "가격 조건", "뉴스/공시 조건"],
      },
      {
        title: "청산 기준",
        body: "손절, 부분익절, thesis 훼손 시 전량 청산 기준을 미리 둡니다.",
      },
    ],
  };
}

function makeDraftTransaction(draft: TransactionDraft): PortfolioTransaction {
  const amount =
    Number(draft.amount) ||
    Number(draft.quantity || 0) * Number(draft.price || 0);
  return {
    id: `local-${Date.now()}`,
    occurred_at: new Date().toISOString().slice(0, 10),
    type: draft.type,
    symbol: draft.type === "deposit" ? null : draft.symbol.trim().toUpperCase(),
    quantity: draft.quantity ? Number(draft.quantity) : null,
    price: draft.price ? Number(draft.price) : null,
    amount,
    currency: draft.currency,
    note: draft.note || "프론트 로컬 입력 초안",
  };
}

function PortfolioControls({
  searchQuery,
  searchResults,
  draft,
  onSearchChange,
  onSelectStock,
  onDraftChange,
  onAddTransaction,
  onOpenThesisTemplate,
}: {
  searchQuery: string;
  searchResults: StockListItem[];
  draft: TransactionDraft;
  onSearchChange: (value: string) => void;
  onSelectStock: (stock: StockListItem) => void;
  onDraftChange: (draft: TransactionDraft) => void;
  onAddTransaction: () => void;
  onOpenThesisTemplate: (symbol: string) => void;
}) {
  function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddTransaction();
  }

  return (
    <div className={styles.controlsGrid}>
      <Card title="종목 찾기 / 편입 준비" eyebrow="Portfolio command">
        <div className={styles.searchPanel}>
          <label className={styles.fieldLabel} htmlFor="portfolio-symbol-search">
            종목 검색
          </label>
          <input
            id="portfolio-symbol-search"
            className={styles.input}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="티커, 종목명, 섹터 검색"
          />
          <div className={styles.resultList}>
            {searchResults.map((stock) => (
              <button
                key={stock.id}
                type="button"
                className={styles.stockResult}
                onClick={() => onSelectStock(stock)}
              >
                <span>
                  <strong>{stock.symbol}</strong>
                  <small>{stock.name} · {stock.exchange}</small>
                </span>
                <Badge tone={stock.up ? "positive" : "negative"}>{stock.change}</Badge>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onOpenThesisTemplate(draft.symbol || searchQuery)}
          >
            투자 근거 템플릿 열기
          </button>
        </div>
      </Card>

      <Card title="거래 입력" eyebrow="Local draft">
        <form className={styles.transactionForm} onSubmit={submitTransaction}>
          <label className={styles.fieldLabel}>
            유형
            <select
              className={styles.input}
              value={draft.type}
              onChange={(event) => onDraftChange({ ...draft, type: event.target.value as PortfolioTransactionType })}
            >
              {TX_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.fieldLabel}>
            티커
            <input
              className={styles.input}
              value={draft.symbol}
              onChange={(event) => onDraftChange({ ...draft, symbol: event.target.value.toUpperCase() })}
              placeholder="AAPL"
            />
          </label>
          <label className={styles.fieldLabel}>
            수량
            <input
              className={styles.input}
              inputMode="decimal"
              value={draft.quantity}
              onChange={(event) => onDraftChange({ ...draft, quantity: event.target.value })}
              placeholder="10"
            />
          </label>
          <label className={styles.fieldLabel}>
            단가
            <input
              className={styles.input}
              inputMode="decimal"
              value={draft.price}
              onChange={(event) => onDraftChange({ ...draft, price: event.target.value })}
              placeholder="184.32"
            />
          </label>
          <label className={styles.fieldLabel}>
            통화
            <select
              className={styles.input}
              value={draft.currency}
              onChange={(event) => onDraftChange({ ...draft, currency: event.target.value })}
            >
              <option value="USD">USD</option>
              <option value="KRW">KRW</option>
            </select>
          </label>
          <label className={styles.fieldLabel}>
            금액
            <input
              className={styles.input}
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) => onDraftChange({ ...draft, amount: event.target.value })}
              placeholder="자동 계산 또는 직접 입력"
            />
          </label>
          <label className={styles.fieldLabel}>
            메모
            <input
              className={styles.input}
              value={draft.note}
              onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
              placeholder="매수 이유 또는 이벤트"
            />
          </label>
          <button className={styles.primaryButton} type="submit">
            거래내역에 추가
          </button>
        </form>
      </Card>
    </div>
  );
}

function ThesisBoard({
  positions,
  onOpenThesis,
  onOpenAlertRules,
  onOpenTemplate,
}: {
  positions: PositionThesis[];
  onOpenThesis: (position: PositionThesis) => void;
  onOpenAlertRules: (position: PositionThesis) => void;
  onOpenTemplate: (symbol: string) => void;
}) {
  return (
    <Card title="투자 근거 / 현재 판단" eyebrow="Thesis + reaction memo">
      <div className={styles.thesisGrid}>
        {positions.map((position) => (
          <div key={position.id} className={styles.thesisCard}>
            <button type="button" className={styles.thesisMain} onClick={() => onOpenThesis(position)}>
              <span className={styles.thesisHeader}>
                <strong>{position.symbol}</strong>
                <Badge tone={position.positive ? "positive" : "negative"}>{position.returnPct}</Badge>
              </span>
              <span className={styles.thesisMeta}>{position.name} · {position.weight}</span>
              <span className={styles.thesisBody}>{position.thesis}</span>
            </button>
            <button
              type="button"
              className={styles.alertRuleButton}
              onClick={() => onOpenAlertRules(position)}
            >
              목표/손절 알림 {position.alerts.filter((alert) => alert.urgent).length}개 점검
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.thesisCardAdd}
          onClick={() => onOpenTemplate("")}
        >
          <strong>새 투자 근거 작성</strong>
          <span>매수 이유, 확인 조건, 청산 기준을 먼저 잠급니다.</span>
        </button>
      </div>
    </Card>
  );
}

function ReadyBody({
  portfolio,
  transactions,
  searchQuery,
  searchResults,
  draft,
  onOpenHolding,
  onOpenTransaction,
  onOpenThesis,
  onOpenAlertRules,
  onOpenThesisTemplate,
  onSearchChange,
  onSelectStock,
  onDraftChange,
  onAddTransaction,
}: {
  portfolio: Portfolio;
  transactions: PortfolioTransaction[];
  searchQuery: string;
  searchResults: StockListItem[];
  draft: TransactionDraft;
  onOpenHolding: (row: PortfolioHolding) => void;
  onOpenTransaction: (row: PortfolioTransaction) => void;
  onOpenThesis: (position: PositionThesis) => void;
  onOpenAlertRules: (position: PositionThesis) => void;
  onOpenThesisTemplate: (symbol: string) => void;
  onSearchChange: (value: string) => void;
  onSelectStock: (stock: StockListItem) => void;
  onDraftChange: (draft: TransactionDraft) => void;
  onAddTransaction: () => void;
}) {
  const mergedPortfolio = { ...portfolio, transactions };

  return (
    <>
      <PortfolioControls
        searchQuery={searchQuery}
        searchResults={searchResults}
        draft={draft}
        onSearchChange={onSearchChange}
        onSelectStock={onSelectStock}
        onDraftChange={onDraftChange}
        onAddTransaction={onAddTransaction}
        onOpenThesisTemplate={onOpenThesisTemplate}
      />
      <KpiStrip portfolio={mergedPortfolio} />
      <ThesisBoard
        positions={POSITION_THESES}
        onOpenThesis={onOpenThesis}
        onOpenAlertRules={onOpenAlertRules}
        onOpenTemplate={onOpenThesisTemplate}
      />
      <div className={styles.grid}>
        <HoldingsTable holdings={portfolio.holdings} onOpenHolding={onOpenHolding} />
        <TransactionsTable transactions={transactions} onOpenTransaction={onOpenTransaction} />
      </div>
    </>
  );
}

export function PortfolioPage() {
  const state = usePortfolio();
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<TransactionDraft>(EMPTY_DRAFT);
  const [localTransactions, setLocalTransactions] = useState<PortfolioTransaction[]>([]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const source = query
      ? STOCK_LIST.filter((stock) =>
          `${stock.symbol} ${stock.name} ${stock.sector} ${stock.exchange}`.toLowerCase().includes(query),
        )
      : STOCK_LIST.slice(0, 5);
    return source.slice(0, 6);
  }, [searchQuery]);
  const description =
    state.status === "ready" ? (
      <span className={styles.meta}>
        최종 갱신 {formatUpdatedAt(state.portfolio.updated_at)} &middot; 통화{" "}
        {state.portfolio.currency}
      </span>
    ) : (
      <span className={styles.meta}>최종 갱신 —</span>
    );

  return (
    <PageContainer eyebrow="Portfolio" title="운용 / 포트폴리오" description={description}>
      {state.status === "loading" && (
        <Card title="포트폴리오">
          <div className={styles.skeletonGrid} aria-hidden="true">
            <Skeleton variant="title" />
            <Skeleton />
            <Skeleton />
            <Skeleton variant="block" />
          </div>
        </Card>
      )}
      {state.status === "error" && (
        <Card title="포트폴리오">
          <p className={styles.statusBody}>
            포트폴리오를 불러오지 못했습니다. ({state.message})
          </p>
        </Card>
      )}
      {state.status === "ready" && (
        <ReadyBody
          portfolio={state.portfolio}
          transactions={[...localTransactions, ...state.portfolio.transactions]}
          searchQuery={searchQuery}
          searchResults={searchResults}
          draft={draft}
          onOpenHolding={(row) => handleAction({ type: "detail", detail: holdingDetail(row) })}
          onOpenTransaction={(row) => handleAction({ type: "detail", detail: transactionDetail(row) })}
          onOpenThesis={(position) => handleAction({ type: "detail", detail: thesisDetail(position) })}
          onOpenAlertRules={(position) => handleAction({ type: "detail", detail: alertRuleDetail(position) })}
          onOpenThesisTemplate={(symbol) => handleAction({ type: "detail", detail: newThesisTemplate(symbol) })}
          onSearchChange={setSearchQuery}
          onSelectStock={(stock) => {
            setSearchQuery(stock.symbol);
            setDraft((current) => ({
              ...current,
              symbol: stock.symbol,
              currency: stock.exchange.includes("K") ? "KRW" : "USD",
            }));
          }}
          onDraftChange={setDraft}
          onAddTransaction={() => {
            if (draft.type !== "deposit" && !draft.symbol.trim()) {
              handleAction({ type: "planned", message: "거래를 추가하려면 티커를 먼저 입력하세요." });
              return;
            }
            const transaction = makeDraftTransaction(draft);
            setLocalTransactions((items) => [transaction, ...items]);
            setDraft({ ...EMPTY_DRAFT, symbol: draft.symbol, currency: draft.currency });
            handleAction({ type: "detail", detail: transactionDetail(transaction) });
          }}
        />
      )}
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
