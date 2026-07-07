import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { apiFetch, ApiError } from '@/lib/api-client';
import { setAccessToken, getAccessToken } from '@/lib/auth-token';

const API_BASE = 'http://localhost:4000';

const handlers = [
  http.get(`${API_BASE}/api/test`, () =>
    HttpResponse.json({ success: true, data: { id: 1, name: 'test' } }),
  ),
  http.get(`${API_BASE}/api/error`, () =>
    HttpResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } },
      { status: 404 },
    ),
  ),
  http.get(`${API_BASE}/api/validation-error`, () =>
    HttpResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Bad request', details: { name: 'required' } } },
      { status: 400 },
    ),
  ),
  http.get(`${API_BASE}/api/authorized`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer test-access-token') {
      return HttpResponse.json({ success: true, data: { secret: 'data' } });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 },
    );
  }),
  http.get(`${API_BASE}/api/auto-refresh`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    // First request with original token - trigger refresh
    if (authHeader === 'Bearer original-token') {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
        { status: 401 },
      );
    }
    // Retry with new token should succeed
    if (authHeader === 'Bearer new-access-token') {
      return HttpResponse.json({ success: true, data: { refreshed: true } });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 },
    );
  }),
  http.post(`${API_BASE}/api/auth/refresh`, async ({ request }) => {
    const body = await request.json() as { refreshToken?: string };
    if (body.refreshToken === 'valid-refresh-token') {
      return HttpResponse.json({
        success: true,
        data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' },
      });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid' } },
      { status: 401 },
    );
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

describe('apiFetch', () => {
  beforeEach(() => {
    // Clean token state and localStorage before each test
    setAccessToken(null);
    localStorage.clear();
  });

  describe('basic success/error', () => {
    it('returns data on success response', async () => {
      const data = await apiFetch<{ id: number; name: string }>('/api/test');
      expect(data).toEqual({ id: 1, name: 'test' });
    });

    it('throws ApiError on error response', async () => {
      try {
        await apiFetch('/api/error');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).code).toBe('NOT_FOUND');
        expect((e as ApiError).message).toBe('Item not found');
      }
    });

    it('includes validation details in ApiError', async () => {
      try {
        await apiFetch('/api/validation-error');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as ApiError).code).toBe('VALIDATION_ERROR');
        expect((e as ApiError).details).toEqual({ name: 'required' });
      }
    });
  });

  describe('Bearer token attachment', () => {
    it('attaches Authorization header when token is set', async () => {
      setAccessToken('test-access-token');

      const data = await apiFetch<{ secret: string }>('/api/authorized');
      expect(data).toEqual({ secret: 'data' });
    });

    it('does not attach Authorization header when no token', async () => {
      try {
        await apiFetch('/api/authorized');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as ApiError).code).toBe('UNAUTHORIZED');
      }
    });

    it('uses a newly set token immediately', async () => {
      setAccessToken('test-access-token');

      const data = await apiFetch<{ secret: string }>('/api/authorized');
      expect(data).toEqual({ secret: 'data' });
    });

    it('stops sending token after clearing it', async () => {
      setAccessToken('test-access-token');
      setAccessToken(null);

      try {
        await apiFetch('/api/authorized');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as ApiError).code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('auto-refresh on 401', () => {
    it('refreshes token and retries on 401 when refresh token exists', async () => {
      setAccessToken('original-token');
      localStorage.setItem('shashvat_refresh_token', 'valid-refresh-token');

      const data = await apiFetch<{ refreshed: boolean }>('/api/auto-refresh');
      expect(data).toEqual({ refreshed: true });

      // Token should be updated after refresh
      expect(getAccessToken()).toBe('new-access-token');
      expect(localStorage.getItem('shashvat_refresh_token')).toBe('new-refresh-token');
    });

    it('does not retry on 401 when no refresh token is stored', async () => {
      setAccessToken('original-token');
      // No refresh token in localStorage

      try {
        await apiFetch('/api/auto-refresh');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as ApiError).code).toBe('UNAUTHORIZED');
      }
    });

    it('does not retry non-401 errors', async () => {
      setAccessToken('some-token');
      localStorage.setItem('shashvat_refresh_token', 'valid-refresh-token');

      try {
        await apiFetch('/api/error'); // Returns 404, not 401
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as ApiError).code).toBe('NOT_FOUND');
      }
    });

    it('does not attempt refresh when no access token was sent', async () => {
      // No token set, but refresh token exists
      localStorage.setItem('shashvat_refresh_token', 'valid-refresh-token');

      try {
        await apiFetch('/api/authorized');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as ApiError).code).toBe('UNAUTHORIZED');
      }
    });

    it('throws original error when refresh endpoint fails', async () => {
      setAccessToken('original-token');
      localStorage.setItem('shashvat_refresh_token', 'invalid-refresh-token');

      try {
        await apiFetch('/api/auto-refresh');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as ApiError).code).toBe('UNAUTHORIZED');
        expect((e as ApiError).message).toBe('Token expired');
      }
    });
  });
});
