'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tenantNav } from '@/config/navigation';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import {
  MdDiamond,
  MdSearch,
  MdDashboard,
  MdVerified,
  MdAutoAwesome,
  MdShoppingCart,
  MdSell,
  MdDescription,
  MdPanTool,
  MdSyncAlt,
  MdPrecisionManufacturing,
  MdGroup,
  MdLocalShipping,
  MdAccountBalance,
  MdInsights,
  MdNotifications,
  MdSecurity,
  MdPeople,
  MdStore,
} from 'react-icons/md';

export function TenantSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { has } = usePermissions();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  }

  const iconMap: Record<string, React.ReactNode> = {
    dashboard: <MdDashboard size={16} />,
    workspace_premium: <MdVerified size={16} />,
    diamond: <MdDiamond size={16} />,
    auto_awesome: <MdAutoAwesome size={16} />,
    shopping_cart: <MdShoppingCart size={16} />,
    sell: <MdSell size={16} />,
    description: <MdDescription size={16} />,
    pan_tool: <MdPanTool size={16} />,
    sync_alt: <MdSyncAlt size={16} />,
    precision_manufacturing: <MdPrecisionManufacturing size={16} />,
    group: <MdGroup size={16} />,
    local_shipping: <MdLocalShipping size={16} />,
    account_balance: <MdAccountBalance size={16} />,
    monitoring: <MdInsights size={16} />,
    notifications: <MdNotifications size={16} />,
    security: <MdSecurity size={16} />,
    people: <MdPeople size={16} />,
    store: <MdStore size={16} />,
  };

  const q = search.trim().toLowerCase();

  // Filter groups per user permissions and optional search query
  const filteredGroups = tenantNav
    .map((g) => ({
      ...g,
      items: g.items
        .filter((it) => !it.permission || has(it.permission))
        .filter((it) => !q || it.label.toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length > 0);

  const companyName = user?.companyName || 'Shashvat Jewels';
  const branchName = user?.branchName || 'All Branches (HQ)';

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[var(--sidebar-w,272px)] flex-col overflow-hidden border-r border-border bg-card">
      {/* Brand Header */}
      <Link
        href="/dashboard"
        className="flex cursor-pointer items-center gap-3 border-b border-border px-5 pb-[18px] pt-[22px] no-underline"
      >
        {user?.companyLogoUrl ? (
          <img
            src={user.companyLogoUrl}
            alt={companyName}
            className="h-[38px] w-[38px] flex-none rounded-[11px] object-cover shadow-[0_4px_14px_rgba(111,211,196,0.35)]"
          />
        ) : (
          <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-gradient-to-br from-primary-light to-primary shadow-[0_4px_14px_rgba(111,211,196,0.35)]">
            <MdDiamond size={20} className="text-primary-ink" />
          </div>
        )}
        <div className="overflow-hidden whitespace-nowrap">
          <div className="m-0 truncate text-[15px] font-bold tracking-tight text-foreground">
            {companyName}
          </div>
          <div className="m-0 mt-px truncate text-[9.5px] font-bold uppercase tracking-[0.14em] text-primary">
            {branchName}
          </div>
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

      {/* Navigation Links (RBAC Filtered) */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-0.5">
        {filteredGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="mb-3 mt-1 border-t border-border" />}
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
                        : 'border-l-2 border-transparent hover:bg-background'
                    }`}
                  >
                    <span
                      className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] transition-colors duration-150 ${
                        active
                          ? 'bg-primary-light text-primary-ink'
                          : 'bg-muted text-text-secondary group-hover:text-foreground'
                      }`}
                    >
                      {iconMap[item.icon] || <MdDashboard size={16} />}
                    </span>
                    <span
                      className={`truncate text-[13px] font-medium transition-colors duration-150 ${
                        active ? 'font-semibold text-foreground' : 'text-text-secondary group-hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
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
