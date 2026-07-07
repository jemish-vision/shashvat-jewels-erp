export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
}

export const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Companies', href: '/companies', icon: 'business' },
  { label: 'Audit Log', href: '/audit-log', icon: 'history' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];
