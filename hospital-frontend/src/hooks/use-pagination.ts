"use client";

import { useCallback, useMemo } from "react";
import { useQueryState } from "@/hooks/use-query-state";

/**
 * Thin, purpose-named wrapper over `useQueryState` for list views: exposes
 * page/limit/sort/search as a small, explicit API while keeping all of it
 * synced to the URL so views stay bookmarkable and shareable.
 */
export function usePagination(defaultLimit = 10) {
  const { params, setParams, page } = useQueryState();

  const limit = Number(params.limit ?? defaultLimit) || defaultLimit;
  const search = params.search ?? "";
  const status = params.status ?? "";
  const sortBy = params.sortBy;
  const sortOrder = (params.sortOrder as "asc" | "desc" | undefined) ?? "desc";

  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);

  const setSearch = useCallback(
    (value: string) => setParams({ search: value || undefined, page: 1 }),
    [setParams]
  );

  const setStatus = useCallback(
    (value: string) => setParams({ status: value || undefined, page: 1 }),
    [setParams]
  );

  const toggleSort = useCallback(
    (key: string) => {
      if (sortBy !== key) {
        setParams({ sortBy: key, sortOrder: "asc" });
        return;
      }
      setParams({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
    },
    [sortBy, sortOrder, setParams]
  );

  return useMemo(
    () => ({
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder,
      params,
      setPage,
      setSearch,
      setStatus,
      toggleSort,
      setParams,
    }),
    [
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder,
      params,
      setPage,
      setSearch,
      setStatus,
      toggleSort,
      setParams,
    ]
  );
}
