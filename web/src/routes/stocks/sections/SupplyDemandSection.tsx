import { Link } from "react-router-dom";
import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import type {
  SupplyDemandKpi,
  InstitutionalHolder,
  InsiderTrade,
} from "../../../fixtures/stocks";
import { useEffect, useState } from "react";
import { apiClient, type StockHolderDb } from "../../../lib/api-client";
import { useStockFilings } from "../../../lib/useStockExtras";
import styles from "./SupplyDemandSection.module.css";

function fmtShares(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
function fmtValue(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

const KPI_TONE_CLASS: Record<SupplyDemandKpi["tone"], string> = {
  positive: styles.positive,
  neutral: styles.neutral,
  negative: styles.negative,
};

const QOQ_TONE_MAP: Record<string, string> = {
  "+": styles.positive,
  "-": styles.negative,
  "0": styles.neutral,
};

type SupplyDemandSectionProps = {
  symbol: string;
  kpis: SupplyDemandKpi[];
  holders: InstitutionalHolder[];
  insiders: InsiderTrade[];
};

export function SupplyDemandSection({
  symbol,
  kpis,
  holders,
  insiders,
}: SupplyDemandSectionProps) {
  const [live, setLive] = useState<StockHolderDb[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiClient.getStockHolders(symbol, 20).then((r) => {
      if (!cancelled) setLive(r.items);
    }).catch(() => { if (!cancelled) setLive([]); });
    return () => { cancelled = true; };
  }, [symbol]);
  const useLive = (live ?? []).length > 0;
  const filingsLive = useStockFilings(symbol, 50);
  const liveInsiders: InsiderTrade[] = filingsLive.status === "ready"
    ? filingsLive.data.items
        .filter((f) => f.form === "4")
        .slice(0, 8)
        .map((f) => ({
          id: f.accession,
          name: f.description || "내부자",
          action: "Form 4",
          detail: f.filed_at ?? "",
        }))
    : [];
  const insidersToShow = liveInsiders.length > 0 ? liveInsiders : insiders;
  const sourceLabel = useLive
    ? `13F · 라이브 ${(live ?? []).length}건`
    : live === null ? "DB 로딩 중 · fixture" : "13F 미수록 · fixture";
  return (
    <div className={styles.container}>
      <p className={styles.notice}>
        미국주는 분기별 13F 기관 보유 데이터만 제공 (한국주는 일별 외국인·기관
        매매 KRX 무료 제공)
      </p>

      <div className={styles.kpiGrid}>
        {kpis.map((k) => (
          <Card key={k.id}>
            <p className={styles.kpiLabel}>{k.label}</p>
            <p className={styles.kpiValue}>{k.value}</p>
            <p className={`${styles.kpiDetail} ${KPI_TONE_CLASS[k.tone]}`}>
              {k.detail}
            </p>
          </Card>
        ))}
      </div>

      <div className={styles.sdGrid}>
        <Card title="공매도 잔고 추이 (90일)">
          <ChartPlaceholder label="공매도 잔고 추이" height={160} />
          <p className={styles.trendNote}>
            최근 30일 누적 공매도 잔고 −5% 감소
          </p>
        </Card>

        <Card title="내부자 거래" eyebrow={liveInsiders.length > 0 ? `SEC Form 4 · ${liveInsiders.length}건` : "Form 4"}>
          <div className={styles.insiderList}>
            {insidersToShow.map((it) => (
              <div key={it.id} className={styles.insiderRow}>
                <span>{it.name}</span>
                <span className={styles.monoCell}>{it.action}</span>
                <span className={styles.monoCell}>{it.detail}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="대형 보유 기관 — 13F"
        eyebrow={sourceLabel}
      >
        <table className={styles.instTable}>
          <thead>
            <tr>
              <th>기관</th>
              <th>보유 주식 수</th>
              <th>가치</th>
              <th>비중</th>
              <th>전 분기 대비</th>
              <th>활동</th>
            </tr>
          </thead>
          <tbody>
            {useLive
              ? (live as StockHolderDb[]).map((h, i) => (
                  <tr key={`${h.filer_name}-${i}`}>
                    <td>
                      {h.master_slug
                        ? <Link to={`/masters/${h.master_slug}`}>{h.filer_name}</Link>
                        : h.filer_name}
                    </td>
                    <td>{fmtShares(h.shares)}</td>
                    <td>{fmtValue(h.market_value)}</td>
                    <td>{h.weight_pct != null ? `${h.weight_pct.toFixed(2)}%` : "—"}</td>
                    <td className={styles.neutral}>—</td>
                    <td className={styles.activityCell}>{h.position_kind}</td>
                  </tr>
                ))
              : holders.map((h) => (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td>{h.shares}</td>
                    <td>{h.value}</td>
                    <td>{h.weight}</td>
                    <td className={QOQ_TONE_MAP[h.qoqChange[0]] || styles.neutral}>{h.qoqChange}</td>
                    <td className={styles.activityCell}>{h.activity}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
