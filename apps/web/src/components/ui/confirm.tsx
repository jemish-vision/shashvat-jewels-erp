'use client';

import { useState, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { MdClose, MdWarning, MdErrorOutline, MdInfoOutline } from 'react-icons/md';

export interface ConfirmOptions {
  title?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmCtx {
  confirm: (message: string, optionsOrTitle?: string | ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmCtx>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Confirm Action');
  const [variant, setVariant] = useState<'primary' | 'danger' | 'warning' | 'info'>('primary');
  const [confirmText, setConfirmText] = useState('Confirm');
  const [cancelText, setCancelText] = useState('Cancel');
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((msg: string, optionsOrTitle?: string | ConfirmOptions) => {
    setMessage(msg);

    if (typeof optionsOrTitle === 'string') {
      setTitle(optionsOrTitle || 'Confirm Action');
      setVariant('primary');
      setConfirmText('Confirm');
      setCancelText('Cancel');
    } else {
      setTitle(optionsOrTitle?.title || 'Confirm Action');
      setVariant(optionsOrTitle?.variant || 'primary');
      setConfirmText(optionsOrTitle?.confirmText || 'Confirm');
      setCancelText(optionsOrTitle?.cancelText || 'Cancel');
    }

    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function handleConfirm() {
    setOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }

  function handleCancel() {
    setOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const buttonStyleMap: Record<'primary' | 'danger' | 'warning' | 'info', string> = {
    primary:
      'bg-primary text-white shadow-[0_2px_8px_rgba(63,163,147,0.3)] hover:brightness-95',
    danger:
      'bg-danger text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)] hover:brightness-95',
    warning:
      'bg-warning text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)] hover:brightness-95',
    info:
      'bg-info text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:brightness-95',
  };

  const iconMap: Record<'primary' | 'danger' | 'warning' | 'info', ReactNode> = {
    primary: <MdInfoOutline size={18} className="text-primary" />,
    danger: <MdErrorOutline size={18} className="text-danger" />,
    warning: <MdWarning size={18} className="text-warning" />,
    info: <MdInfoOutline size={18} className="text-info" />,
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={handleCancel}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="card-lg w-[400px] max-w-[92vw] px-5 py-[20px] shadow-2xl animate-in zoom-in-95 duration-150"
            >
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {iconMap[variant]}
                  <h3 className="m-0 text-[15px] font-extrabold text-foreground">{title}</h3>
                </div>
                <button
                  onClick={handleCancel}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] border-none bg-none text-text-muted transition-colors hover:bg-muted hover:text-text-strong-2"
                >
                  <MdClose size={17} />
                </button>
              </div>
              <p className="m-0 mb-6 text-[13px] font-medium leading-relaxed text-text-secondary">
                {message}
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 rounded-[9px] border border-input bg-card px-4 py-[8px] text-[12px] font-bold text-text-strong-2 transition-colors hover:bg-muted"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`inline-flex items-center gap-1.5 rounded-[9px] border-none px-4 py-[8px] text-[12px] font-bold transition-all ${buttonStyleMap[variant]}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}
