import { apiFetch } from '@/lib/api-client';
import type { LoginResponse, MeResponse } from './types';

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshApi(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  return apiFetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await apiFetch('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function meApi(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/api/auth/me');
}
