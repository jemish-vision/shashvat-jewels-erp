import type { ReactNode } from 'react';
import { MdFilterList } from 'react-icons/md';

interface FilterCardProps {
  children: ReactNode;
  onReset?: () => void;
  showReset?: boolean;
}

export function FilterCard({ children, onReset, showReset }: FilterCardProps) {
  return (
    <div className="card-lg overflow-visible px-4 py-[14px]">
      <p className="mb-[10px] text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
        <MdFilterList size={12} className="mr-1 inline" />
        Filters
      </p>

      {children}

      {showReset && onReset && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onReset}
            className="rounded-[8px] border border-input bg-card px-[14px] py-[7px] text-[11.5px] font-bold text-text-strong-2 transition-colors hover:bg-muted"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
