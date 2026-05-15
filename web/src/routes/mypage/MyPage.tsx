import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { DataTable } from "../../components/primitives/DataTable";
import { KpiTile } from "../../components/primitives/KpiTile";
import { REPORTS } from "../../fixtures/reports";
import type { ReportListItem } from "../../fixtures/reports";
import { useAuth } from "../../lib/auth-state";
import { getUserDisplayName } from "../../lib/auth-user";
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
type MyPageTab = "overview" | "portfolio" | "saved" | "activity" | "settings";

const MYPAGE_TABS: { id: MyPageTab; label: string }[] = [
  { id: "overview", label: "개요" },
  { id: "portfolio", label: "포트폴리오" },
  { id: "saved", label: "관심글" },
  { id: "activity", label: "활동" },
  { id: "settings", label: "설정" },
];

const SAVED_REPORT_IDS = new Set([
  "bok-monetary-2025-09",
  "berkshire-13f-2025-q3",
  "blackrock-ai-capex-2026",
]);

function isMyPageTab(value: string | null): value is MyPageTab {
  return MYPAGE_TABS.some((tab) => tab.id === value);
}

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

const reportColumns = [
  {
    key: "title",
    header: "관심 리포트",
    render: (row: ReportListItem) => (
      <div className={styles.reportTitle}>
        <strong>{row.title}</strong>
        <span>{row.source} · {row.summary}</span>
      </div>
    ),
  },
  { key: "category", header: "분류", render: (row: ReportListItem) => <Badge tone="neutral">{row.category}</Badge> },
  { key: "date", header: "발간일", render: (row: ReportListItem) => row.date },
  { key: "bookmarks", header: "저장", align: "right" as const, render: (row: ReportListItem) => row.bookmarks },
];

export function MyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = isMyPageTab(requestedTab) ? requestedTab : "overview";
  const [activeTab, setActiveTab] = useState<MyPageTab>(initialTab);
  const auth = useAuth();
  const displayName =
    auth.status === "signed-in" ? getUserDisplayName(auth.user) : "사용자";
  const email = auth.status === "signed-in" ? auth.user.email ?? "이메일 없음" : "";
  const createdAt =
    auth.status === "signed-in"
      ? new Date(auth.user.created_at).toLocaleDateString("ko-KR")
      : "";

  function selectTab(tab: MyPageTab) {
    setActiveTab(tab);
    setSearchParams(tab === "overview" ? {} : { tab });
  }

  return (
    <PageContainer
      eyebrow="My Page"
      title="마이페이지"
      description="내 투자노트, 메모, 거래 내역, 계정 설정을 한곳에서 정적으로 확인합니다."
    >
      <Card>
        <div className={styles.identity}>
          <div className={styles.avatar} aria-hidden="true" />
          <div className={styles.identityText}>
            <strong>{displayName}</strong>
            <span>{email} · 일반회원 · 가입일 {createdAt}</span>
            <span>Google OAuth로 로그인됨</span>
          </div>
          <div className={styles.quickLinks} aria-label="마이페이지 빠른 전환">
            <button type="button" onClick={() => selectTab("portfolio")}>
              포트폴리오
            </button>
            <button type="button" onClick={() => selectTab("saved")}>
              관심글
            </button>
            <button type="button" onClick={() => selectTab("activity")}>
              활동
            </button>
          </div>
        </div>
      </Card>

      <nav className={styles.tabBar} aria-label="마이페이지 섹션">
        {MYPAGE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.tabActive : styles.tab}
            aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <>
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

          <div className={styles.twoCol}>
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
            <Card title="최근 활동">
              <DataTable<ActivityLog> columns={activityColumns} rows={ACTIVITY_LOGS.slice(0, 4)} getRowKey={(row) => row.id} density="compact" />
            </Card>
          </div>
        </>
      ) : null}

      {activeTab === "portfolio" ? (
        <div className={styles.stack}>
          <div className={styles.kpiGrid}>
            {MYPAGE_KPIS.slice(0, 3).map((kpi) => (
              <KpiTile
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                detail={kpi.detail}
                trend={kpi.warning ? <span className={styles.warning}>확인 필요</span> : null}
              />
            ))}
          </div>
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
            <Card title="거래 내역" eyebrow="Transactions">
              <DataTable<TransactionHistory> columns={transactionColumns} rows={TRANSACTION_HISTORY} getRowKey={(row) => row.id} density="compact" />
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "portfolio" || activeTab === "saved" ? (
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
      ) : null}

      {activeTab === "saved" ? (
        <div className={styles.stack}>
          <Card title="관심 리포트" eyebrow="Saved reports">
            <DataTable<ReportListItem>
              columns={reportColumns}
              rows={REPORTS.filter((report) => SAVED_REPORT_IDS.has(report.id))}
              getRowKey={(row) => row.id}
              density="compact"
            />
          </Card>
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
        </div>
      ) : null}

      {activeTab === "activity" ? (
        <div className={styles.stack}>
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
          <Card title="최근 활동">
            <DataTable<ActivityLog> columns={activityColumns} rows={ACTIVITY_LOGS} getRowKey={(row) => row.id} density="compact" />
          </Card>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <Card title="계정 설정" eyebrow="Static form summary">
          <DataTable<SettingRow> columns={settingColumns} rows={SETTING_ROWS} getRowKey={(row) => row.id} density="compact" />
        </Card>
      ) : null}
    </PageContainer>
  );
}
