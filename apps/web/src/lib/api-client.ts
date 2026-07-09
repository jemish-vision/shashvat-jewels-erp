import { env } from '@/config/env';
import type { ApiResult } from '@shashvat/shared-types';
import { getAccessToken, setAccessToken } from './auth-token';

class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export { ApiError };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.apiUrl}${path}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });

  // On 401, attempt token refresh once
  if (res.status === 401 && token) {
    const refreshToken = localStorage.getItem('shashvat_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${env.apiUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshBody = await refreshRes.json();
        if (refreshBody.success) {
          setAccessToken(refreshBody.data.accessToken);
          localStorage.setItem('shashvat_refresh_token', refreshBody.data.refreshToken);

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${refreshBody.data.accessToken}`;
          const retryRes = await fetch(url, {
            ...init,
            headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
          });
          const retryBody = (await retryRes.json()) as ApiResult<T>;
          if (!retryBody.success) {
            throw new ApiError(retryBody.error.code, retryBody.error.message, retryBody.error.details);
          }
          return retryBody.data;
        }
      } catch {
        // Refresh failed — fall through to throw original error
      }
    }
  }

  const body = (await res.json()) as ApiResult<T>;

  if (!body.success) {
    if (body.error.code === 'COMPANY_SUSPENDED' && typeof window !== 'undefined') {
      localStorage.removeItem('shashvat_refresh_token');
      document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'user-role=; path=/; max-age=0; SameSite=Lax';
      setAccessToken(null);
      window.location.href = '/login?error=COMPANY_SUSPENDED';
    }
    throw new ApiError(body.error.code, body.error.message, body.error.details);
  }

  return body.data;
}
