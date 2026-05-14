import { Card } from "../../../components/primitives/Card";
import type { FinancialTable } from "../../../fixtures/stocks";
import styles from "./FinancialsSection.module.css";

type FinancialsSectionProps = {
  incomeStatement: FinancialTable;
  balanceSheet: FinancialTable;
  cashFlow: FinancialTable;
  keyRatios: FinancialTable;
};

function FinTable({ table }: { table: FinancialTable }) {
  return (
    <>
      {table.hint && <p className={styles.hint}>{table.hint}</p>}
      <table className={styles.finTable}>
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.id} className={r.bold ? styles.boldRow : ""}>
              <td>{r.item}</td>
            {r.values.map((v, i) => (
              <td key={`${r.id}-${table.headers[i + 1] || `col${i}`}`}>{v}</td>
            ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function FinancialsSection({
  incomeStatement,
  balanceSheet,
  cashFlow,
  keyRatios,
}: FinancialsSectionProps) {
  return (
    <div className={styles.container}>
      <div className={styles.subTabs}>
        <span className={styles.subTabActive}>손익계산서</span>
        <span className={styles.subTab}>재무상태표</span>
        <span className={styles.subTab}>현금흐름표</span>
        <span className={styles.spacer} aria-hidden="true" />
        <span className={styles.subTabActive}>연간</span>
        <span className={styles.subTab}>분기</span>
      </div>

      <Card title={`${incomeStatement.title}`} eyebrow={incomeStatement.hint}>
        <FinTable table={incomeStatement} />
      </Card>

      <div className={styles.finGrid}>
        <Card title={balanceSheet.title} eyebrow={balanceSheet.hint}>
          <FinTable table={balanceSheet} />
        </Card>
        <Card title={cashFlow.title} eyebrow={cashFlow.hint}>
          <FinTable table={cashFlow} />
        </Card>
      </div>

      <Card title={keyRatios.title}>
        <FinTable table={keyRatios} />
      </Card>
    </div>
  );
}
