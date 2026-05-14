import { Card } from "../../../components/primitives/Card";
import { ChartPlaceholder } from "../../../components/primitives/ChartPlaceholder";
import type {
  SupplyDemandKpi,
  InstitutionalHolder,
  InsiderTrade,
} from "../../../fixtures/stocks";
import styles from "./SupplyDemandSection.module.css";

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
  kpis: SupplyDemandKpi[];
  holders: InstitutionalHolder[];
  insiders: InsiderTrade[];
};

export function SupplyDemandSection({
  kpis,
  holders,
  insiders,
}: SupplyDemandSectionProps) {
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

        <Card title="내부자 거래" eyebrow="Form 4">
          <div className={styles.insiderList}>
            {insiders.map((it) => (
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
        title="대형 보유 기관 — 13F 최근 변경"
        eyebrow="2025 Q3 기준"
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
            {holders.map((h) => (
              <tr key={h.id}>
                <td>{h.name}</td>
                <td>{h.shares}</td>
                <td>{h.value}</td>
                <td>{h.weight}</td>
                <td
                  className={
                    QOQ_TONE_MAP[h.qoqChange[0]] || styles.neutral
                  }
                >
                  {h.qoqChange}
                </td>
                <td className={styles.activityCell}>{h.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
