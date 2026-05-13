import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "표시할 데이터가 없습니다.",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className="data-table__empty">{emptyMessage}</div>;
  }

  return (
    <div className="data-table" role="region" aria-label="데이터 표">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === "right" ? "is-right" : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.align === "right" ? "is-right" : undefined}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
