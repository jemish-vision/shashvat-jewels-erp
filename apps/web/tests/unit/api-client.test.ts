import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { apiFetch, ApiError } from '@/lib/api-client';

const handlers = [
  http.get('http://localhost:4000/api/test', () =>
    HttpResponse.json({ success: true, data: { id: 1, name: 'test' } }),
  ),
  http.get('http://localhost:4000/api/error', () =>
    HttpResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } },
      { status: 404 },
    ),
  ),
  http.get('http://localhost:4000/api/validation-error', () =>
    HttpResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Bad request', details: { name: 'required' } } },
      { status: 400 },
    ),
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

describe('apiFetch', () => {
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
