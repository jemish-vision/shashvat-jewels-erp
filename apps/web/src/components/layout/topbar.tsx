'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { MdLocationOn, MdNotifications, MdPerson, MdLogout, MdUnfoldMore, MdChevronRight } from 'react-icons/md';

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    router.push('/login');
  }

  return (
    <header
      className="fixed right-0 top-0 z-40 flex h-[var(--header-h)] items-center justify-between border-b border-border bg-white/85 px-6 backdrop-blur"
      style={{ left: 'var(--sidebar-w)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-text-secondary">Platform</span>
        <MdChevronRight size={14} className="text-text-muted" />
        <span className="text-[13px] font-bold text-foreground">Overview</span>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {/* Platform Chip */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
          <MdLocationOn size={16} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">Platform HQ</span>
        </div>

        {/* Notification bell */}
        <button className="relative flex rounded-lg p-2 text-text-secondary transition-colors duration-150 hover:bg-background">
          <MdNotifications size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-primary dark:border-card" />
        </button>

        {/* User avatar dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors duration-150 hover:bg-background"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary text-xs font-bold text-white shadow-sm">
              {(user?.name?.[0] || user?.email?.[0] || 'S').toUpperCase()}
            </div>
            <div className="text-left pr-1">
              <div className="text-xs font-bold text-foreground leading-tight">
                {user?.name ||
                  (user?.email
                    ? user.email
                        .split('@')[0]
                        .replace(/[._-]/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'Super Admin')}
              </div>
              <div className="text-[10px] font-semibold text-text-secondary leading-tight">
                Super Admin
              </div>
            </div>
            <MdUnfoldMore
              size={16}
              className={`text-text-muted transition-transform duration-150 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-[9999] mt-1.5 w-[190px] animate-[fadeUp_0.15s_ease-out] overflow-visible rounded-xl border border-border bg-card shadow-[0_8px_24px_rgba(15,23,42,0.10),0_2px_6px_rgba(15,23,42,0.04)]">
              {/* User info header */}
              <div className="border-b border-border px-3.5 py-3">
                <div className="text-[13px] font-bold text-foreground">
                  {user?.name ||
                    (user?.email
                      ? user.email
                          .split('@')[0]
                          .replace(/[._-]/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase())
                      : 'Super Admin')}
                </div>
                <div className="text-[11px] font-medium text-text-muted">Super Admin</div>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-text-strong-2 transition-colors duration-150 hover:bg-background"
                >
                  <MdPerson size={18} className="text-text-muted" />
                  My Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-danger transition-colors duration-150 hover:bg-danger-bg"
                >
                  <MdLogout size={18} className="text-danger" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
