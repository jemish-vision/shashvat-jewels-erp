export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide / Material icon key
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
];

// Tenant navigation with permission filtering per Module 03 RBAC
export const tenantNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Certified Diamonds', href: '/dashboard/certified-diamonds', icon: 'workspace_premium', permission: 'certified-diamond:view' },
      { label: 'Loose Diamonds', href: '/dashboard/loose-diamonds', icon: 'diamond', permission: 'loose-diamond:view' },
      { label: 'Jewelry', href: '/dashboard/jewelry', icon: 'auto_awesome', permission: 'jewelry:view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Purchase', href: '/dashboard/purchases', icon: 'shopping_cart', permission: 'purchase:view' },
      { label: 'Sales', href: '/dashboard/sales', icon: 'sell', permission: 'sale:view' },
      { label: 'Memos', href: '/dashboard/memos', icon: 'description', permission: 'memo:view' },
      { label: 'Holds', href: '/dashboard/holds', icon: 'pan_tool', permission: 'hold:view' },
      { label: 'Transfers', href: '/dashboard/transfers', icon: 'sync_alt', permission: 'transfer:view' },
      { label: 'Manufacturing', href: '/dashboard/manufacturing', icon: 'precision_manufacturing', permission: 'manufacturing:view' },
    ],
  },
  {
    label: 'Relations',
    items: [
      { label: 'Customers', href: '/dashboard/customers', icon: 'group', permission: 'customer:view' },
      { label: 'Vendors', href: '/dashboard/vendors', icon: 'local_shipping', permission: 'vendor:view' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounting', href: '/dashboard/accounting', icon: 'account_balance', permission: 'accounting:view' },
      { label: 'Reports', href: '/dashboard/reports', icon: 'monitoring', permission: 'report:view' },
    ],
  },
  {
    label: 'Access & Governance',
    items: [
      { label: 'Roles & Permissions', href: '/dashboard/roles', icon: 'security', permission: 'role:view' },
      // { label: 'Branch Management', href: '/dashboard/branches', icon: 'store', permission: 'branch:view' },
      { label: 'Sub Admins', href: '/dashboard/sub-admins', icon: 'people', permission: 'user:view' },
      { label: 'Notifications', href: '/dashboard/notifications', icon: 'notifications', permission: 'notification:view' },
    ],
  },
];
