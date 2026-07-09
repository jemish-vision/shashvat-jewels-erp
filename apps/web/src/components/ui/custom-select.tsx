'use client';

import { useState, useRef, useEffect } from 'react';
import { MdUnfoldMore } from 'react-icons/md';

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  width?: string;
}

export function CustomSelect({ options, value, onChange, placeholder = 'Select...', className = '', width = '160px' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="field-compact flex w-full items-center justify-between gap-2"
        style={{ width }}
      >
        <span className="truncate text-[11.5px] font-medium text-foreground">
          {selected?.label || placeholder}
        </span>
        <MdUnfoldMore
          size={14}
          className={`flex-none text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[9999] mt-1.5 w-full min-w-[160px] animate-[fadeUp_0.15s_ease-out] overflow-visible rounded-xl border border-border bg-card shadow-[0_8px_24px_rgba(15,23,42,0.10),0_2px_6px_rgba(15,23,42,0.04)]">
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3.5 py-[7px] text-[12px] font-medium transition-colors duration-150 hover:bg-background ${
                  active ? 'text-primary' : 'text-text-strong-2'
                }`}
              >
                {opt.meta && (
                  <span className={`inline-block h-[6px] w-[6px] rounded-full flex-none ${opt.meta}`} />
                )}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
