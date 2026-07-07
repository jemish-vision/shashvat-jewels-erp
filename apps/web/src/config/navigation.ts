export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  permission?: string;
  badge?: string;
}

export const superAdminNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: 'dashboard' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Companies', href: '/companies', icon: 'business' },
      { label: 'Audit Log', href: '/audit-log', icon: 'history' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: 'settings' },
    ],
  },
];

// Tenant navigation (unused until Module 03, but structure is defined here)
export const tenantNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: 'dashboard' },
      { label: 'Analytics', href: '/analytics', icon: 'analytics' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Certified Diamonds', href: '/certified-diamonds', icon: 'workspace_premium' },
      { label: 'Loose Diamonds', href: '/loose-diamonds', icon: 'diamond' },
      { label: 'Jewelry', href: '/jewelry', icon: 'auto_awesome' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Purchase', href: '/purchases', icon: 'shopping_cart' },
      { label: 'Sales', href: '/sales', icon: 'sell' },
      { label: 'Memos', href: '/memos', icon: 'description' },
      { label: 'Holds', href: '/holds', icon: 'pan_tool' },
      { label: 'Transfers', href: '/transfers', icon: 'sync_alt' },
      { label: 'Manufacturing', href: '/manufacturing', icon: 'precision_manufacturing' },
    ],
  },
  {
    label: 'Relations',
    items: [
      { label: 'Customers', href: '/customers', icon: 'group' },
      { label: 'Vendors', href: '/vendors', icon: 'local_shipping' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounting', href: '/accounting', icon: 'account_balance' },
      { label: 'Reports', href: '/reports', icon: 'monitoring' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Notifications', href: '/notifications', icon: 'notifications' },
      { label: 'Settings', href: '/settings', icon: 'settings' },
    ],
  },
];
