import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCompanies, createCompany, updateCompany, suspendCompany, reactivateCompany, deleteCompany, getCompany, getDashboardStats, getAuditLog } from '@/features/super-admin/queries';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockFetchResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    status,
    json: () => Promise.resolve({ success: true, data }),
  });
}

function mockFetchError(code: string, message: string, status = 400) {
  mockFetch.mockResolvedValueOnce({
    status,
    json: () => Promise.resolve({ success: false, error: { code, message } }),
  });
}

vi.mock('@/lib/auth-token', () => ({ getAccessToken: () => 'test-token' }));
vi.mock('@/config/env', () => ({ env: { apiUrl: 'http://localhost:4000' } }));

describe('super-admin queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCompanies', () => {
    it('fetches companies without params', async () => {
      mockFetchResponse({ items: [], pageInfo: {} });
      await listCompanies();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toBe('http://localhost:4000/api/super-admin/companies');
    });

    it('passes query params', async () => {
      mockFetchResponse({ items: [], pageInfo: {} });
      await listCompanies({ search: 'test', status: 'ACTIVE', limit: 10 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('search=test');
      expect(url).toContain('status=ACTIVE');
      expect(url).toContain('limit=10');
    });

    it('includes auth header', async () => {
      mockFetchResponse({ items: [], pageInfo: {} });
      await listCompanies();
      const opts = mockFetch.mock.calls[0][1];
      expect(opts.headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('createCompany', () => {
    it('sends POST with body', async () => {
      mockFetchResponse({ id: '1', name: 'Test' });
      await createCompany({ name: 'Test Corp', slug: 'test-corp' });
      const opts = mockFetch.mock.calls[0][1];
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toMatchObject({ name: 'Test Corp', slug: 'test-corp' });
    });
  });

  describe('updateCompany', () => {
    it('sends PATCH with body', async () => {
      mockFetchResponse({ id: '1', name: 'Updated' });
      await updateCompany('1', { name: 'Updated' });
      const opts = mockFetch.mock.calls[0][1];
      expect(opts.method).toBe('PATCH');
      expect(JSON.parse(opts.body)).toMatchObject({ name: 'Updated' });
    });
  });

  describe('suspendCompany', () => {
    it('sends POST to suspend endpoint', async () => {
      mockFetchResponse({ id: '1', status: 'SUSPENDED' });
      await suspendCompany('1');
      expect(mockFetch.mock.calls[0][0]).toContain('/companies/1/suspend');
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('reactivateCompany', () => {
    it('sends POST to reactivate endpoint', async () => {
      mockFetchResponse({ id: '1', status: 'ACTIVE' });
      await reactivateCompany('1');
      expect(mockFetch.mock.calls[0][0]).toContain('/companies/1/reactivate');
    });
  });

  describe('deleteCompany', () => {
    it('sends DELETE', async () => {
      mockFetchResponse({ id: '1', deletedAt: '2026-07-09T00:00:00Z' });
      await deleteCompany('1');
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    });
  });

  describe('getCompany', () => {
    it('fetches single company', async () => {
      mockFetchResponse({ id: '1', name: 'Test' });
      const result = await getCompany('1');
      expect(mockFetch.mock.calls[0][0]).toContain('/companies/1');
      expect(result.id).toBe('1');
    });
  });

  describe('getDashboardStats', () => {
    it('fetches dashboard stats', async () => {
      mockFetchResponse({ total: 5, byStatus: { ACTIVE: 3, TRIAL: 2 }, recentCompanies: [], recentAudit: [] });
      const result = await getDashboardStats();
      expect(result.total).toBe(5);
    });
  });

  describe('getAuditLog', () => {
    it('fetches audit log with filters', async () => {
      mockFetchResponse({ items: [], pageInfo: {} });
      await getAuditLog({ targetType: 'Company', action: 'COMPANY_CREATED', limit: 10 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('targetType=Company');
      expect(url).toContain('action=COMPANY_CREATED');
    });
  });
});
