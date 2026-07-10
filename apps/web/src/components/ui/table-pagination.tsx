'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdChevronLeft, MdChevronRight, MdExpandMore, MdCheck } from 'react-icons/md';

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
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
    } else if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
      });
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3.5 flex-wrap gap-3">
      <div className="flex items-center gap-2.5 text-xs font-semibold text-text-secondary">
        <span>Rows per page</span>

        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleMenu}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-extrabold text-foreground shadow-sm transition-all hover:bg-muted"
          >
            <span>{pageSize}</span>
            <MdExpandMore
              size={15}
              className={`text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open &&
            coords &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={menuRef}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                }}
                className="z-[99999] min-w-[85px] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-2xl animate-[fadeUp_0.15s_ease-out]"
              >
                {pageSizeOptions.map((size) => {
                  const active = pageSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        onPageSizeChange(size);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>{size}</span>
                      {active && <MdCheck size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </div>,
              document.body
            )}
        </div>

        <span className="ml-1 text-xs font-medium text-text-secondary">
          {startRange}&ndash;{endRange} of {totalCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MdChevronLeft size={16} />
          Prev
        </button>
        <span className="px-2 text-xs font-bold text-foreground">
          Page {page} of {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <MdChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
