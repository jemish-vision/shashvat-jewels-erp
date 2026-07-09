export interface Company {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  baseCurrency: string;
  taxId: string | null;
  logoUrl: string | null;
  status: string;
  trialEndsAt: string | null;
  plan: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  recentCompanies: Company[];
  recentAudit: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  superAdminId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
  superAdmin: { name: string } | null;
}

export interface PageInfo {
  nextCursor?: string | null;
  hasNextPage?: boolean;
  totalCount?: number;
  totalPages?: number;
}
