import type { ReactNode } from "react";
import styles from "./DataTable.module.css";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
};

export type TableDensity = "comfortable" | "compact";

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  density?: TableDensity;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "표시할 데이터가 없습니다.",
  density = "comfortable",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <section className={styles.wrapper} aria-label="데이터 표">
      <table className={`${styles.table} ${density === "compact" ? styles.compact : ""}`}>
        <thead>
          <tr>
            {columns.map((column) => {
              const cls =
                column.align === "right"
                  ? `${styles.th} ${styles.right}`
                  : styles.th;
              return (
                <th key={column.key} scope="col" className={cls}>
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => {
                const cls =
                  column.align === "right"
                    ? `${styles.td} ${styles.right}`
                    : styles.td;
                return (
                  <td key={column.key} className={cls}>
                    {column.render(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
