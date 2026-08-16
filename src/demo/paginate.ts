import type { PagedResult } from "../types/api";

// Shared by every paged demo route (§9.18) so the in-browser mock backend honors the same
// `?page=&pageSize=` contract (default 25, max 200) as the real API.
export function paginate<T>(items: T[], query: Record<string, string>): PagedResult<T> {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize ?? "25", 10) || 25));
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
