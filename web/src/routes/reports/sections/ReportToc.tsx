import { Card } from "../../../components/primitives/Card";
import type { ReportTocItem } from "../../../fixtures/reports";
import styles from "./ReportDetailSections.module.css";

export function ReportToc({ items }: { items: ReportTocItem[] }) {
  return (
    <aside className={styles.toc}>
      <Card title="목차">
        <div className={styles.tocList}>
          {items.map((item) => (
            <div
              key={item.id}
              className={`${styles.tocItem} ${item.active ? styles.tocItemActive : ""}`}
            >
              <span>{item.title}</span>
              <span>{item.page}p</span>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
}
