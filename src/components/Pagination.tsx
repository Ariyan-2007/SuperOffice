import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import type { PaginationProps } from "../lib/usePagedQuery";

export function Pagination({ page, pageSize, totalCount, totalPages, hasNextPage, hasPreviousPage, onPageChange }: PaginationProps) {
  if (totalCount === 0 || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {start}–{end} of {totalCount}
      </span>
      <div className="pagination-controls">
        <Button size="sm" variant="secondary" disabled={!hasPreviousPage} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={13} /> Prev
        </Button>
        <span className="pagination-page">
          Page {page} of {totalPages}
        </span>
        <Button size="sm" variant="secondary" disabled={!hasNextPage} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight size={13} />
        </Button>
      </div>
    </div>
  );
}
