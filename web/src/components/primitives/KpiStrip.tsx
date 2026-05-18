import type { ReactNode } from "react";
import { KpiTile } from "./KpiTile";
import styles from "./KpiStrip.module.css";

export type KpiStripItem = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  trend?: ReactNode;
};

type KpiStripProps = {
  items: KpiStripItem[];
  ariaLabel: string;
};

export function KpiStrip({ items, ariaLabel }: KpiStripProps) {
  if (items.length === 0) return null;
  return (
    <section
      className={styles.strip}
      aria-label={ariaLabel}
      style={{ ["--kpi-strip-cols" as string]: items.length }}
    >
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          <KpiTile
            label={item.label}
            value={item.value}
            detail={item.detail}
            trend={item.trend}
          />
        </div>
      ))}
    </section>
  );
}
