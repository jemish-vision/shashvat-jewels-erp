import { apiFetch } from '@/lib/api-client';
import type { Company, DashboardStats, AuditEntry, PageInfo } from './types';

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/api/super-admin/dashboard');
}

export async function listCompanies(params?: {
  limit?: number; skip?: number; search?: string; status?: string; sortBy?: string; sortDir?: string;
}): Promise<{ items: Company[]; pageInfo: PageInfo }> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.skip) searchParams.set('skip', String(params.skip));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortDir) searchParams.set('sortDir', params.sortDir);
  const qs = searchParams.toString();
  return apiFetch(`/api/super-admin/companies${qs ? `?${qs}` : ''}`);
}

export async function getCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/api/super-admin/companies/${id}`);
}

export async function createCompany(data: {
  name: string; slug: string; email?: string; phone?: string; address?: string;
  city?: string; country?: string; baseCurrency?: string; taxId?: string;
  status?: string; plan?: string;
}): Promise<Company> {
  return apiFetch<Company>('/api/super-admin/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompany(id: string, data: Record<string, unknown>): Promise<Company> {
  return apiFetch<Company>(`/api/super-admin/companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function suspendCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/api/super-admin/companies/${id}/suspend`, { method: 'POST' });
}

export async function reactivateCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/api/super-admin/companies/${id}/reactivate`, { method: 'POST' });
}

export async function deleteCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/api/super-admin/companies/${id}`, { method: 'DELETE' });
}

export async function getAuditLog(params?: {
  limit?: number; skip?: number; targetType?: string; action?: string; adminSearch?: string;
}): Promise<{ items: AuditEntry[]; pageInfo: PageInfo }> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.skip) searchParams.set('skip', String(params.skip));
  if (params?.targetType) searchParams.set('targetType', params.targetType);
  if (params?.action) searchParams.set('action', params.action);
  if (params?.adminSearch) searchParams.set('adminSearch', params.adminSearch);
  const qs = searchParams.toString();
  return apiFetch(`/api/super-admin/audit-log${qs ? `?${qs}` : ''}`);
}

export async function getAuditEntry(id: string): Promise<AuditEntry> {
  return apiFetch<AuditEntry>(`/api/super-admin/audit-log/${id}`);
}
