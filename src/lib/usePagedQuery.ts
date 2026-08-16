import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PagedResult } from "../types/api";

interface UsePagedQueryOptions {
  initialPageSize?: number;
  enabled?: boolean;
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}

// Shared client-side half of the §9.18 pagination contract: owns page/pageSize state, resets
// to page 1 whenever the caller's filters change (anything folded into `queryKey` besides
// page/pageSize itself), and keeps the previous page's rows on screen while the next one loads.
export function usePagedQuery<T>(
  queryKey: readonly unknown[],
  queryFn: (page: number, pageSize: number) => Promise<PagedResult<T>>,
  options?: UsePagedQueryOptions,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options?.initialPageSize ?? 25);
  const filterFingerprint = JSON.stringify(queryKey);

  useEffect(() => {
    setPage(1);
    // Only the filter portion of the key should reset pagination — deliberately excludes page/pageSize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFingerprint]);

  const query: UseQueryResult<PagedResult<T>> = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: () => queryFn(page, pageSize),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });

  const result = query.data;

  const paginationProps: PaginationProps | undefined = result
    ? {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
        onPageChange: setPage,
      }
    : undefined;

  return {
    items: result?.items ?? [],
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    paginationProps,
  };
}
