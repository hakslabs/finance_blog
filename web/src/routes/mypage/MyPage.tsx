import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { DataTable } from "../../components/primitives/DataTable";
import { EmptyState } from "../../components/primitives/EmptyState";
import { KpiTile } from "../../components/primitives/KpiTile";
import { REPORTS } from "../../fixtures/reports";
import type { ReportListItem } from "../../fixtures/reports";
import { useAuth } from "../../lib/auth-state";
import { displayNameStorageKey, getUserDisplayName } from "../../lib/auth-user";
import { SHELL_LABELS, useLanguage } from "../../lib/language";
import { useSavedItems, type SavedItem, type SavedItemKind } from "../../lib/saved-items";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import type { DetailContent } from "../../lib/interaction/action-intent";
import {
  ACTIVITY_LOGS,
  MYPAGE_KPIS,
  MY_TODOS,
  POSITION_THESES,
  SETTING_ROWS,
  TRANSACTION_HISTORY,
  WATCHLIST_SUMMARIES,
} from "../../fixtures/mypage";
import type {
  ActivityLog,
  MyPageKpi,
  PositionThesis,
  SettingRow,
  TodoItem,
  TransactionHistory,
  WatchlistSummary,
} from "../../fixtures/mypage";
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

function simpleDetail(
  eyebrow: string,
  title: string,
  meta: string,
  items: string[],
  summary = "마이페이지 항목 상세입니다."
): DetailContent {
  return {
    id: `${eyebrow}-${title}`,
    eyebrow,
    title,
    meta,
    summary,
    sections: [{ title: "상세 값", body: "현재 화면에 표시된 값을 정리합니다.", items }],
  };
}

function kpiDetail(kpi: MyPageKpi): DetailContent {
  return simpleDetail("마이페이지 KPI", kpi.label, kpi.value, [kpi.detail, kpi.warning ? "확인 필요" : "정상"]);
}

function todoDetail(todo: TodoItem): DetailContent {
  return simpleDetail("오늘 할 일", todo.title, todo.meta, [
    `상태: ${todo.done ? "완료" : "진행 필요"}`,
    `분류: ${todo.category}`,
    "실제 완료 저장은 todo 저장 PR에서 연결됩니다.",
  ]);
}

function watchlistDetail(list: WatchlistSummary): DetailContent {
  return simpleDetail("관심종목 리스트", list.name, `${list.count}개 · ${list.performance}`, [
    "구성 종목 상세와 편집은 관심종목 쓰기 PR에서 연결됩니다.",
  ]);
}

function transactionDetail(row: TransactionHistory): DetailContent {
  return simpleDetail("거래 내역", `${row.symbol} ${row.type}`, row.date, [
    `수량: ${row.quantity}`,
    `단가: ${row.price}`,
    `금액: ${row.amount} ${row.currency}`,
    `수수료: ${row.fee}`,
  ]);
}

function activityDetail(row: ActivityLog): DetailContent {
  return simpleDetail("활동 로그", row.action, row.date, [`대상: ${row.target}`]);
}

function settingDetail(row: SettingRow): DetailContent {
  return simpleDetail("계정 설정", row.label, row.status, [
    `섹션: ${row.group}`,
    `현재값: ${row.value}`,
    "설정 저장은 프로필/설정 저장 PR에서 연결됩니다.",
  ]);
}

function positionDetail(position: PositionThesis): DetailContent {
  return {
    id: `position-${position.id}`,
    eyebrow: "내 포지션 · Thesis",
    title: `${position.symbol} · ${position.name}`,
    meta: `${position.returnPct} · 비중 ${position.weight}`,
    tags: position.tags,
    summary: position.thesis,
    sections: [
      {
        title: "포지션",
        body: "현재 보유와 매수 기준입니다.",
        items: [
          `편입: ${position.openedAt}`,
          `수량: ${position.quantity}`,
          `평단: ${position.averagePrice}`,
          `현재가: ${position.currentPrice}`,
          `Exit: ${position.exitPlan}`,
        ],
      },
      { title: "판단 근거", body: "매수 thesis 조건입니다.", items: position.conditions },
      {
        title: "반응 메모",
        body: "알림 발생 시 기록해야 할 반응입니다.",
        items: position.alerts.map((alert) => `${alert.trigger}: ${alert.note}`),
      },
    ],
  };
}

export function MyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = isMyPageTab(requestedTab) ? requestedTab : "overview";
  const [activeTab, setActiveTab] = useState<MyPageTab>(initialTab);
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();
  const auth = useAuth();
  const { pick } = useLanguage();
  const displayName =
    auth.status === "signed-in" ? getUserDisplayName(auth.user) : "사용자";
  const email = auth.status === "signed-in" ? auth.user.email ?? "이메일 없음" : "";
  const createdAt =
    auth.status === "signed-in"
      ? new Date(auth.user.created_at).toLocaleDateString("ko-KR")
      : "";
  const [nameInput, setNameInput] = useState(displayName);
  const [trackedDisplayName, setTrackedDisplayName] = useState(displayName);
  const [nameSaved, setNameSaved] = useState(false);
  if (trackedDisplayName !== displayName) {
    setTrackedDisplayName(displayName);
    setNameInput(displayName);
  }

  function handleSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.status !== "signed-in") return;
    const next = nameInput.trim();
    const key = displayNameStorageKey(auth.user.id);
    if (next) {
      window.localStorage.setItem(key, next);
    } else {
      window.localStorage.removeItem(key);
    }
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 2400);
  }

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
        {auth.status === "signed-in" ? (
          <form className={styles.profileForm} onSubmit={handleSaveName}>
            <label className={styles.profileField}>
              <span>표시 이름</span>
              <input
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="표시 이름"
                maxLength={64}
                aria-label="표시 이름"
              />
            </label>
            <label className={styles.profileField}>
              <span>이메일</span>
              <input type="email" value={email} readOnly aria-readonly="true" />
            </label>
            <button type="submit" className={styles.profileSubmit}>
              저장
            </button>
            {nameSaved ? (
              <p className={styles.profileNotice} role="status">
                이름이 저장되었습니다 (로컬). 백엔드 동기화는 PR-19에서 연결됩니다.
              </p>
            ) : null}
          </form>
        ) : null}
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
              <button
                key={kpi.id}
                type="button"
                className={styles.kpiButton}
                onClick={() => handleAction({ type: "detail", detail: kpiDetail(kpi) })}
              >
                <KpiTile
                  label={kpi.label}
                  value={kpi.value}
                  detail={kpi.detail}
                  trend={kpi.warning ? <span className={styles.warning}>확인 필요</span> : null}
                />
              </button>
            ))}
          </div>

          <div className={styles.twoCol}>
            <Card title="오늘 할 일" eyebrow="Dashboard sync">
              <div className={styles.todoList}>
                {MY_TODOS.map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    className={`${styles.todoRow} ${todo.done ? styles.todoDone : ""}`}
                    onClick={() => handleAction({ type: "detail", detail: todoDetail(todo) })}
                  >
                    <span className={styles.checkbox} aria-hidden="true" />
                    <span>{todo.title}</span>
                    <Badge tone={todo.done ? "neutral" : "accent"}>{todo.category}</Badge>
                    <span>{todo.meta}</span>
                  </button>
                ))}
              </div>
            </Card>
            <Card title="최근 활동">
              <DataTable<ActivityLog>
                columns={activityColumns}
                rows={ACTIVITY_LOGS.slice(0, 4)}
                getRowKey={(row) => row.id}
                density="compact"
                onRowClick={(row) => handleAction({ type: "detail", detail: activityDetail(row) })}
                getRowAriaLabel={(row) => `${row.action} 활동 상세`}
              />
            </Card>
          </div>
        </>
      ) : null}

      {activeTab === "portfolio" ? (
        <div className={styles.stack}>
          <div className={styles.kpiGrid}>
            {MYPAGE_KPIS.slice(0, 3).map((kpi) => (
              <button
                key={kpi.id}
                type="button"
                className={styles.kpiButton}
                onClick={() => handleAction({ type: "detail", detail: kpiDetail(kpi) })}
              >
                <KpiTile
                  label={kpi.label}
                  value={kpi.value}
                  detail={kpi.detail}
                  trend={kpi.warning ? <span className={styles.warning}>확인 필요</span> : null}
                />
              </button>
            ))}
          </div>
          <div className={styles.twoCol}>
            <Card title="관심종목 리스트">
              <div className={styles.simpleList}>
                {WATCHLIST_SUMMARIES.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    className={styles.simpleListButton}
                    onClick={() => handleAction({ type: "detail", detail: watchlistDetail(list) })}
                  >
                    <span>{list.name}</span>
                    <span>{list.count}개 · {list.performance}</span>
                  </button>
                ))}
              </div>
            </Card>
            <Card title="거래 내역" eyebrow="Transactions">
              <DataTable<TransactionHistory>
                columns={transactionColumns}
                rows={TRANSACTION_HISTORY}
                getRowKey={(row) => row.id}
                density="compact"
                onRowClick={(row) => handleAction({ type: "detail", detail: transactionDetail(row) })}
                getRowAriaLabel={(row) => `${row.symbol} 거래 상세`}
              />
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "portfolio" || activeTab === "saved" ? (
        <Card title="내 포지션 · Thesis" eyebrow="Locked thesis + reaction memo">
          <div className={styles.positionList}>
            {POSITION_THESES.map((position) => (
              <button
                key={position.id}
                type="button"
                className={position.positive ? styles.position : `${styles.position} ${styles.positionWarn}`}
                onClick={() => handleAction({ type: "detail", detail: positionDetail(position) })}
              >
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
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {activeTab === "saved" ? (
        <div className={styles.stack}>
          <SavedItemsSection />
          <Card title="관심 리포트 (정적 샘플)" eyebrow="Saved reports">
            <DataTable<ReportListItem>
              columns={reportColumns}
              rows={REPORTS.filter((report) => SAVED_REPORT_IDS.has(report.id))}
              getRowKey={(row) => row.id}
              density="compact"
              onRowClick={(row) =>
                handleAction({
                  type: "route",
                  to: `/reports/${encodeURIComponent(row.id)}`,
                })
              }
              getRowAriaLabel={(row) => `${row.title} 리포트로 이동`}
            />
          </Card>
          <Card title="관심종목 리스트">
            <div className={styles.simpleList}>
              {WATCHLIST_SUMMARIES.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  className={styles.simpleListButton}
                  onClick={() => handleAction({ type: "detail", detail: watchlistDetail(list) })}
                >
                  <span>{list.name}</span>
                  <span>{list.count}개 · {list.performance}</span>
                </button>
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
                <button
                  key={todo.id}
                  type="button"
                  className={`${styles.todoRow} ${todo.done ? styles.todoDone : ""}`}
                  onClick={() => handleAction({ type: "detail", detail: todoDetail(todo) })}
                >
                  <span className={styles.checkbox} aria-hidden="true" />
                  <span>{todo.title}</span>
                  <Badge tone={todo.done ? "neutral" : "accent"}>{todo.category}</Badge>
                  <span>{todo.meta}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="최근 활동">
            <DataTable<ActivityLog>
              columns={activityColumns}
              rows={ACTIVITY_LOGS}
              getRowKey={(row) => row.id}
              density="compact"
              onRowClick={(row) => handleAction({ type: "detail", detail: activityDetail(row) })}
              getRowAriaLabel={(row) => `${row.action} 활동 상세`}
            />
          </Card>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <Card title="계정 설정" eyebrow="Static form summary">
          <aside className={styles.settingsNote}>{pick(SHELL_LABELS.partialI18nNote)}</aside>
          <DataTable<SettingRow>
            columns={settingColumns}
            rows={SETTING_ROWS}
            getRowKey={(row) => row.id}
            density="compact"
            onRowClick={(row) => handleAction({ type: "detail", detail: settingDetail(row) })}
            getRowAriaLabel={(row) => `${row.label} 설정 상세`}
          />
        </Card>
      ) : null}
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}

const KIND_LABEL: Record<SavedItemKind, string> = {
  report: "리포트",
  stock: "종목",
  master: "고수",
  news: "뉴스",
};

const UNFILED = "미분류";
const ALL = "전체";

function refToUrl(item: SavedItem): string | null {
  switch (item.kind) {
    case "report":
      return `/reports/${encodeURIComponent(item.refId)}`;
    case "stock":
      return `/stocks/${encodeURIComponent(item.refId)}`;
    case "master":
      return `/masters/${encodeURIComponent(item.refId)}`;
    default:
      return null;
  }
}

function SavedItemsSection() {
  const { items, remove, setFolder, setNote, folders } = useSavedItems();
  const [activeFolder, setActiveFolder] = useState<string>(ALL);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const folderList = folders();

  const filteredItems = items.filter((item) => {
    if (activeFolder === ALL) return true;
    if (activeFolder === UNFILED) return !item.folder;
    return item.folder === activeFolder;
  });

  function handleAddFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    setActiveFolder(trimmed);
    setNewFolderName("");
  }

  return (
    <Card title="저장한 항목" eyebrow="Saved items">
      <div className={styles.folderChips} role="tablist" aria-label="폴더 필터">
        {[ALL, UNFILED, ...folderList].map((folder) => (
          <button
            key={folder}
            type="button"
            role="tab"
            aria-selected={activeFolder === folder}
            className={
              activeFolder === folder ? styles.folderChipActive : styles.folderChip
            }
            onClick={() => setActiveFolder(folder)}
          >
            {folder}
          </button>
        ))}
        <form className={styles.newFolderForm} onSubmit={handleAddFolder}>
          <input
            type="text"
            placeholder="새 폴더 이름"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            aria-label="새 폴더 이름"
          />
          <button type="submit">새 폴더</button>
        </form>
      </div>
      {filteredItems.length === 0 ? (
        <EmptyState
          title="저장한 항목이 없습니다"
          description="리포트, 종목, 고수 페이지에서 별 아이콘으로 저장하세요."
        />
      ) : (
        <ul className={styles.savedList}>
          {filteredItems.map((item) => {
            const url = refToUrl(item);
            const expanded = !!expandedNotes[item.id];
            return (
              <li key={item.id} className={styles.savedRow}>
                <div className={styles.savedRowHead}>
                  <Badge tone="neutral">{KIND_LABEL[item.kind]}</Badge>
                  {url ? (
                    <Link to={url} className={styles.savedTitle}>
                      {item.title}
                    </Link>
                  ) : (
                    <span className={styles.savedTitle}>{item.title}</span>
                  )}
                  <FolderPicker
                    item={item}
                    folders={folderList}
                    onChange={(next) => setFolder(item.id, next)}
                  />
                  <button
                    type="button"
                    className={styles.savedNoteToggle}
                    onClick={() =>
                      setExpandedNotes((current) => ({
                        ...current,
                        [item.id]: !current[item.id],
                      }))
                    }
                  >
                    {expanded ? "메모 닫기" : item.note ? "메모 보기" : "메모 추가"}
                  </button>
                  <button
                    type="button"
                    className={styles.savedRemove}
                    aria-label={`${item.title} 저장 해제`}
                    onClick={() => remove(item.id)}
                  >
                    삭제
                  </button>
                </div>
                {expanded ? (
                  <textarea
                    className={styles.savedNote}
                    value={item.note ?? ""}
                    placeholder="메모를 입력하세요 (로컬 저장)"
                    onChange={(event) => setNote(item.id, event.target.value)}
                    rows={3}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function FolderPicker({
  item,
  folders,
  onChange,
}: {
  item: SavedItem;
  folders: string[];
  onChange: (next: string | null) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  function handleSelect(value: string) {
    if (value === "__new__") {
      setCreating(true);
      return;
    }
    if (value === "__none__") {
      onChange(null);
      return;
    }
    onChange(value);
  }

  function handleSubmitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setDraft("");
    setCreating(false);
  }

  if (creating) {
    return (
      <form className={styles.folderInline} onSubmit={handleSubmitNew}>
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          placeholder="새 폴더…"
          aria-label="새 폴더 이름"
        />
        <button type="submit">저장</button>
        <button type="button" onClick={() => setCreating(false)}>
          취소
        </button>
      </form>
    );
  }

  return (
    <select
      className={styles.folderSelect}
      value={item.folder ?? "__none__"}
      onChange={(event) => handleSelect(event.target.value)}
      aria-label={`${item.title} 폴더`}
    >
      <option value="__none__">미분류</option>
      {folders.map((folder) => (
        <option key={folder} value={folder}>
          {folder}
        </option>
      ))}
      <option value="__new__">+ 새 폴더…</option>
    </select>
  );
}
