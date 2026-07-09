'use client';

import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  startRange: number;
  endRange: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [10, 25, 50];

export function TablePagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  startRange,
  endRange,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: TablePaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 flex-wrap gap-3">
      <div className="flex items-center gap-2 text-[11.5px] font-medium text-text-secondary">
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-[7px] border border-input bg-card px-[6px] py-[4px] text-[11.5px] font-medium text-foreground outline-none"
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="ml-2">
          {startRange}&ndash;{endRange} of {totalCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-[7px] border border-input bg-card px-[10px] py-[6px] text-[11.5px] font-bold text-text-strong-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MdChevronLeft size={14} />
          Prev
        </button>
        <span className="text-[11.5px] font-semibold text-text-secondary">
          Page {page} of {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-[7px] border border-input bg-card px-[10px] py-[6px] text-[11.5px] font-bold text-text-strong-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <MdChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
