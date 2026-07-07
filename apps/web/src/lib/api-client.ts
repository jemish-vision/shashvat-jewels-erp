import { env } from '@/config/env';
import type { ApiResult } from '@shashvat/shared-types';

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
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const body = (await res.json()) as ApiResult<T>;

  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, body.error.details);
  }

  return body.data;
}
