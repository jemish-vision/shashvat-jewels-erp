'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { PageInfo } from '@/features/super-admin/types';

interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  queryFn: (params: { limit: number; skip: number }) => Promise<{ items: T[]; pageInfo: PageInfo }>;
  defaultPageSize?: number;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({ queryKey, queryFn, defaultPageSize = 10, enabled = true }: UsePaginatedQueryOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: () => queryFn({ limit: pageSize, skip: (page - 1) * pageSize }),
    placeholderData: keepPreviousData,
    enabled,
  });

  const items = data?.items ?? [];
  const totalCount = data?.pageInfo?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, totalCount);

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  function resetPage() {
    setPage(1);
  }

  const paginationProps = {
    page,
    totalPages,
    totalCount,
    pageSize,
    startRange,
    endRange,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
  };

  return {
    items,
    isLoading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
    paginationProps,
    totalCount,
    totalPages,
  };
}
