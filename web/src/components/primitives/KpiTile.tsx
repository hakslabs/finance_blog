import type { ReactNode } from "react";
import styles from "./KpiTile.module.css";

type KpiTileProps = {
  label: string;
  value: string;
  detail?: string;
  trend?: ReactNode;
};

export function KpiTile({ label, value, detail, trend }: KpiTileProps) {
  return (
    <div className={styles.tile}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.footer}>
        {detail ? <span>{detail}</span> : <span />}
        {trend ? <span>{trend}</span> : null}
      </div>
    </div>
  );
}
