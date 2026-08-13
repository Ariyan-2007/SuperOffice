import type { ReactNode } from "react";
import clsx from "clsx";
import { Inbox } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyTitle, emptyDescription }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <div className="empty-state">
          <Inbox className="empty-state-icon" strokeWidth={1.4} />
          <div className="empty-state-title">{emptyTitle ?? "Nothing here yet"}</div>
          {emptyDescription && <div className="empty-state-desc">{emptyDescription}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={clsx(onRowClick && "clickable")} onClick={() => onRowClick?.(row)}>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
