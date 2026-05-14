import { PageContainer } from "../../components/layout/PageContainer";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { DataTable } from "../../components/primitives/DataTable";
import { KpiTile } from "../../components/primitives/KpiTile";
import {
  ACTIVITY_LOGS,
  MYPAGE_KPIS,
  MY_TODOS,
  POSITION_THESES,
  SETTING_ROWS,
  TRANSACTION_HISTORY,
  WATCHLIST_SUMMARIES,
} from "../../fixtures/mypage";
import type { ActivityLog, SettingRow, TransactionHistory } from "../../fixtures/mypage";
import styles from "./MyPage.module.css";

type BadgeTone = "neutral" | "accent" | "positive" | "negative" | "warning";

const TX_TONE: Record<TransactionHistory["type"], BadgeTone> = {
  매수: "positive",
  매도: "negative",
  배당: "neutral",
};

const transactionColumns = [
  { key: "date", header: "날짜", render: (row: TransactionHistory) => row.date },
  { key: "type", header: "구분", render: (row: TransactionHistory) => <Badge tone={TX_TONE[row.type]}>{row.type}</Badge> },
  { key: "symbol", header: "종목", render: (row: TransactionHistory) => <span className={styles.monoStrong}>{row.symbol}</span> },
  { key: "quantity", header: "수량", align: "right" as const, render: (row: TransactionHistory) => row.quantity },
  { key: "price", header: "단가", align: "right" as const, render: (row: TransactionHistory) => row.price },
  { key: "amount", header: "금액", align: "right" as const, render: (row: TransactionHistory) => `${row.amount} ${row.currency}` },
  { key: "fee", header: "수수료", align: "right" as const, render: (row: TransactionHistory) => row.fee },
];

const activityColumns = [
  { key: "date", header: "일시", render: (row: ActivityLog) => <span className={styles.mono}>{row.date}</span> },
  { key: "action", header: "활동", render: (row: ActivityLog) => row.action },
  { key: "target", header: "대상", render: (row: ActivityLog) => row.target },
];

const settingColumns = [
  { key: "group", header: "섹션", render: (row: SettingRow) => row.group },
  { key: "label", header: "항목", render: (row: SettingRow) => row.label },
  { key: "value", header: "현재값", render: (row: SettingRow) => row.value },
  { key: "status", header: "상태", render: (row: SettingRow) => <Badge tone="neutral">{row.status}</Badge> },
];

export function MyPage() {
  return (
    <PageContainer
      eyebrow="My Page"
      title="마이페이지"
      description="내 투자노트, 메모, 거래 내역, 계정 설정을 한곳에서 정적으로 확인합니다."
    >
      <Card>
        <div className={styles.identity}>
          <div className={styles.avatar} aria-hidden="true" />
          <strong>홍길동</strong>
          <span>hong@example.com · 일반회원 · 가입 21개월차</span>
          <span>마지막 활동 12분 전</span>
        </div>
      </Card>

      <div className={styles.kpiGrid}>
        {MYPAGE_KPIS.map((kpi) => (
          <KpiTile
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            detail={kpi.detail}
            trend={kpi.warning ? <span className={styles.warning}>확인 필요</span> : null}
          />
        ))}
      </div>

      <Card title="오늘 할 일" eyebrow="Dashboard sync">
        <div className={styles.todoList}>
          {MY_TODOS.map((todo) => (
            <div key={todo.id} className={`${styles.todoRow} ${todo.done ? styles.todoDone : ""}`}>
              <span className={styles.checkbox} aria-hidden="true" />
              <span>{todo.title}</span>
              <Badge tone={todo.done ? "neutral" : "accent"}>{todo.category}</Badge>
              <span>{todo.meta}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className={styles.twoCol}>
        <Card title="관심종목 리스트">
          <div className={styles.simpleList}>
            {WATCHLIST_SUMMARIES.map((list) => (
              <div key={list.id}>
                <span>{list.name}</span>
                <span>{list.count}개 · {list.performance}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="최근 활동">
          <DataTable<ActivityLog> columns={activityColumns} rows={ACTIVITY_LOGS} getRowKey={(row) => row.id} density="compact" />
        </Card>
      </div>

      <Card title="내 포지션 · Thesis" eyebrow="Locked thesis + reaction memo">
        <div className={styles.positionList}>
          {POSITION_THESES.map((position) => (
            <article key={position.id} className={position.positive ? styles.position : `${styles.position} ${styles.positionWarn}`}>
              <header>
                <strong>{position.symbol}</strong>
                <span>{position.name} · 편입 {position.openedAt} · {position.quantity} @ {position.averagePrice}</span>
                <span className={position.positive ? styles.positive : styles.negative}>{position.returnPct} · 비중 {position.weight}</span>
              </header>
              <p>{position.thesis}</p>
              <div className={styles.conditionGrid}>
                <div>
                  <strong>판단 근거</strong>
                  {position.conditions.map((condition) => <span key={condition}>{condition}</span>)}
                </div>
                <div>
                  <strong>반응 메모</strong>
                  {position.alerts.map((alert) => (
                    <span key={alert.id} className={alert.urgent ? styles.negative : ""}>{alert.trigger} · {alert.note}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card title="거래 내역" eyebrow="Transactions">
        <DataTable<TransactionHistory> columns={transactionColumns} rows={TRANSACTION_HISTORY} getRowKey={(row) => row.id} density="compact" />
      </Card>

      <Card title="계정 설정" eyebrow="Static form summary">
        <DataTable<SettingRow> columns={settingColumns} rows={SETTING_ROWS} getRowKey={(row) => row.id} density="compact" />
      </Card>
    </PageContainer>
  );
}
