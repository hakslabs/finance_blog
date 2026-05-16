import { Link, useParams } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { ActionNotice } from "../../components/interaction/ActionNotice";
import { DetailPanel } from "../../components/interaction/DetailPanel";
import { Badge } from "../../components/primitives/Badge";
import { Card } from "../../components/primitives/Card";
import { ChartPlaceholder } from "../../components/primitives/ChartPlaceholder";
import { DataTable } from "../../components/primitives/DataTable";
import { EmptyState } from "../../components/primitives/EmptyState";
import { KpiTile } from "../../components/primitives/KpiTile";
import { useInteractionActions } from "../../lib/interaction/useInteractionActions";
import { useMaster } from "../../lib/useMaster";
import { useMasterHoldings } from "../../lib/useMasterHoldings";
import { getMaster } from "../../fixtures/masters";
import type { MasterHolding, MasterQuarterChange, HoldingChange } from "../../fixtures/masters";
import styles from "./MasterDetailPage.module.css";

type BadgeTone = "neutral" | "accent" | "positive" | "negative" | "warning";

const CHANGE_TONE: Record<HoldingChange, BadgeTone> = {
  up: "positive",
  down: "negative",
  flat: "neutral",
  new: "accent",
  exit: "negative",
};

const holdingColumns = [
  { key: "symbol", header: "티커", render: (row: MasterHolding) => <span className={styles.monoStrong}>{row.symbol}</span> },
  { key: "name", header: "종목명", render: (row: MasterHolding) => row.name },
  { key: "weight", header: "비중", align: "right" as const, render: (row: MasterHolding) => row.weight },
  { key: "change", header: "변화", align: "right" as const, render: (row: MasterHolding) => <Badge tone={CHANGE_TONE[row.changeKind]}>{row.change}</Badge> },
];

const quarterColumns = [
  { key: "symbol", header: "티커", render: (row: MasterQuarterChange) => <span className={styles.monoStrong}>{row.symbol}</span> },
  { key: "name", header: "종목명", render: (row: MasterQuarterChange) => row.name },
  { key: "q1", header: "2025 Q1", align: "right" as const, render: (row: MasterQuarterChange) => row.q1 },
  { key: "q2", header: "Q2", align: "right" as const, render: (row: MasterQuarterChange) => row.q2 },
  { key: "q3", header: "Q3", align: "right" as const, render: (row: MasterQuarterChange) => row.q3 },
  { key: "q4", header: "Q4", align: "right" as const, render: (row: MasterQuarterChange) => row.q4 },
  { key: "latest", header: "2026 Q1", align: "right" as const, render: (row: MasterQuarterChange) => row.latest },
  { key: "change", header: "변화", align: "right" as const, render: (row: MasterQuarterChange) => <Badge tone={CHANGE_TONE[row.kind]}>{row.change}</Badge> },
];

export function MasterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fixtureMaster = getMaster(id);
  const dbState = useMaster(id);
  const { detail, notice, handleAction, closeDetail } = useInteractionActions();

  const dbMaster = dbState.status === "ready" ? dbState.master : null;
  const holdingsState = useMasterHoldings(id);
  const liveHoldings: MasterHolding[] =
    holdingsState.status === "ready"
      ? holdingsState.data.holdings.map((h) => ({
          id: h.instrument_id,
          symbol: h.symbol ?? "?",
          name: h.name ?? "—",
          weight: h.weight_pct != null ? `${h.weight_pct.toFixed(2)}%` : "—",
          change: "—",
          changeKind: "flat" as HoldingChange,
        }))
      : [];
  const holdingsSource =
    holdingsState.status === "ready" && liveHoldings.length > 0
      ? `13F ${holdingsState.data.period_end ?? holdingsState.data.filed_at ?? "라이브"} · ${liveHoldings.length}건`
      : holdingsState.status === "loading"
        ? "13F 로딩 중 · fixture 표시"
        : holdingsState.status === "error"
          ? "13F 오류 · fixture 표시"
          : "13F 미수집 · fixture 표시";
  const master = fixtureMaster
    ? {
        ...fixtureMaster,
        name: dbMaster?.name ?? fixtureMaster.name,
        firm: dbMaster?.firm ?? fixtureMaster.firm,
        style: dbMaster?.style ?? fixtureMaster.style,
        principles:
          dbMaster && dbMaster.principles.length > 0
            ? dbMaster.principles.map((p) => p.title)
            : fixtureMaster.principles,
      }
    : null;
  const sourceLabel =
    dbState.status === "ready"
      ? "Supabase · 라이브"
      : dbState.status === "loading"
        ? "DB 로딩 중 · fixture 표시"
        : dbState.status === "not-found"
          ? "DB 미수록 · fixture 표시"
          : "API 오류 · fixture 표시";

  if (!master) {
    return (
      <PageContainer eyebrow="Master Detail" title="거장을 찾을 수 없습니다">
        <EmptyState
          title="거장 상세 정보가 없습니다"
          description={`"${id ?? "unknown"}"에 대한 fixture가 아직 준비되지 않았습니다.`}
          action={<Link to="/masters">거장 목록으로 돌아가기</Link>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      eyebrow="Masters / Detail"
      title={master.name}
      description={`${master.firm} · ${master.style} · ${sourceLabel}`}
      actions={
        <button
          className={styles.followButton}
          type="button"
          onClick={() => handleAction({ type: "planned", message: "거장 팔로우 저장은 PR-17 saved-items에서 연결됩니다." })}
        >
          팔로우
        </button>
      }
    >
      <Link to="/masters" className={styles.backLink}>← 거장 목록으로</Link>

      <div className={styles.kpiGrid}>
        <KpiTile label="운용자산" value={master.aum} detail={master.firm} />
        <KpiTile label="보유 종목" value={`${master.holdingsCount}`} detail="최근 13F 기준" />
        <KpiTile label="최근 신고" value={master.latestFiling} detail="SEC EDGAR" />
        <KpiTile label="5Y CAGR" value={master.cagr5y} detail="벤치마크 비교" />
      </div>

      <div className={styles.detailGrid}>
        <Card title="상위 보유 종목" eyebrow={holdingsSource}>
          <DataTable<MasterHolding>
            columns={holdingColumns}
            rows={liveHoldings.length > 0 ? liveHoldings : master.holdings}
            getRowKey={(row) => row.id}
            density="compact"
            onRowClick={(row) =>
              handleAction({
                type: "detail",
                detail: {
                  id: `master-holding-${row.id}`,
                  eyebrow: `${master.name} · 상위 보유`,
                  title: `${row.symbol} · ${row.name}`,
                  meta: `비중 ${row.weight} · 변화 ${row.change}`,
                  summary: "거장의 최근 13F 기준 상위 보유 종목입니다.",
                },
              })
            }
            getRowAriaLabel={(row) => `${row.symbol} 보유 상세`}
          />
        </Card>
        <Card title="섹터 분포 & 성과" eyebrow="Composition">
          <ChartPlaceholder label="섹터 트리맵 + 10년 성과" height={260} />
        </Card>
      </div>

      <Card title="13F 분기 변화 — 최근 5분기">
        <DataTable<MasterQuarterChange>
          columns={quarterColumns}
          rows={master.quarterChanges}
          getRowKey={(row) => row.id}
          density="compact"
          onRowClick={(row) =>
            handleAction({
              type: "detail",
              detail: {
                id: `master-quarter-${row.id}`,
                eyebrow: `${master.name} · 13F 분기 변화`,
                title: `${row.symbol} · ${row.name}`,
                meta: `최근 ${row.latest} · 변화 ${row.change}`,
                summary: "최근 5분기 보유 비중 변화입니다.",
                sections: [
                  {
                    title: "분기별 비중",
                    body: "13F 신고 기준 보유 비중입니다.",
                    items: [`2025 Q1 ${row.q1}`, `Q2 ${row.q2}`, `Q3 ${row.q3}`, `Q4 ${row.q4}`, `2026 Q1 ${row.latest}`],
                  },
                ],
              },
            })
          }
          getRowAriaLabel={(row) => `${row.symbol} 13F 분기 변화 상세`}
        />
      </Card>

      <div className={styles.detailGrid}>
        <Card title="투자 원칙">
          <ul className={styles.list}>
            {master.principles.map((principle) => <li key={principle}>{principle}</li>)}
          </ul>
        </Card>
        <Card title="최근 보유 변경">
          <div className={styles.changeList}>
            {master.recentChanges.map((change) => (
              <button
                key={change.id}
                type="button"
                className={styles.changeRow}
                onClick={() => handleAction({
                  type: "detail",
                  detail: {
                    id: change.id,
                    eyebrow: `${master.name} · 최근 보유 변경`,
                    title: change.text,
                    summary: "13F 변화 원인과 내 포트폴리오 영향 메모를 연결할 상세 패널입니다.",
                    tags: [change.type],
                  },
                })}
              >
                <Badge tone={CHANGE_TONE[change.kind]}>{change.type}</Badge>
                <span>{change.text}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
      <DetailPanel detail={detail} onClose={closeDetail} />
      <ActionNotice message={notice} />
    </PageContainer>
  );
}
