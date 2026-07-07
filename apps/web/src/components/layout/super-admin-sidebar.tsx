'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { superAdminNav } from '@/config/navigation';
import {
  MdDiamond,
  MdSearch,
  MdDashboard,
  MdBusiness,
  MdHistory,
  MdSettings,
} from 'react-icons/md';

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  const q = search.trim().toLowerCase();
  const filteredGroups = superAdminNav
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !q || it.label.toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length > 0);

  const iconMap: Record<string, React.ReactNode> = {
    dashboard: <MdDashboard size={16} />,
    business: <MdBusiness size={16} />,
    history: <MdHistory size={16} />,
    settings: <MdSettings size={16} />,
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[var(--sidebar-w)] flex-col overflow-hidden border-r border-border bg-card">
      {/* Logo row */}
      <Link
        href="/"
        className="flex cursor-pointer items-center gap-3 border-b border-border px-5 pb-[18px] pt-[22px] no-underline"
      >
        <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-gradient-to-br from-primary-light to-primary shadow-[0_4px_14px_rgba(111,211,196,0.35)]">
          <MdDiamond size={20} className="text-primary-ink" />
        </div>
        <div className="overflow-hidden whitespace-nowrap">
          <div className="m-0 text-[15px] font-bold tracking-tight text-foreground">Shashvat</div>
          <div className="m-0 mt-px text-[9.5px] font-bold uppercase tracking-[0.14em] text-primary">Jewels ERP</div>
        </div>
      </Link>

      {/* Search bar */}
      <div className="px-4 py-[14px]">
        <div
          className={`flex items-center gap-2 rounded-[10px] border px-[10px] py-[6px] transition-all duration-150 ${
            searchFocused
              ? 'border-primary-light shadow-[0_0_0_3px_rgba(111,211,196,0.15)]'
              : 'border-input'
          } bg-background`}
        >
          <MdSearch size={16} className="text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search modules…"
            className="w-full border-none bg-transparent text-[12px] text-foreground outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-0.5">
        {filteredGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="mb-3 mt-0 border-t border-border" />}
            <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-[11px] rounded-[10px] px-[10px] py-[9px] no-underline transition-all duration-150 ${
                      active
                        ? 'border-l-2 border-primary-light bg-[rgba(111,211,196,0.12)] shadow-[0_2px_6px_rgba(63,163,147,0.15)]'
                        : 'border-l-2 border-transparent hover:translate-x-[2px] hover:bg-background'
                    }`}
                  >
                    <span
                      className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] transition-colors duration-150 ${
                        active ? 'bg-primary-light text-primary-ink' : 'bg-muted text-text-secondary'
                      }`}
                    >
                      {iconMap[item.icon] || <MdDashboard size={16} />}
                    </span>
                    <span
                      className={`flex-1 overflow-hidden whitespace-nowrap text-ellipsis text-[12.5px] ${
                        active ? 'font-bold text-foreground' : 'font-medium text-text-strong-2'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
