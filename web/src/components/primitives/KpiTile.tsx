import type { ReactNode } from "react";

type KpiTileProps = {
  label: string;
  value: string;
  detail?: string;
  trend?: ReactNode;
};

export function KpiTile({ label, value, detail, trend }: KpiTileProps) {
  return (
    <div className="kpi-tile">
      <div className="kpi-tile__label">{label}</div>
      <div className="kpi-tile__value">{value}</div>
      <div className="kpi-tile__footer">
        {detail ? <span>{detail}</span> : <span />}
        {trend ? <span>{trend}</span> : null}
      </div>
    </div>
  );
}
