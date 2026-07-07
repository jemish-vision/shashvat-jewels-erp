import React from 'react';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { setAccessToken } from '@/lib/auth-token';
import { ApiError } from '@/lib/api-client';
import type { ReactNode } from 'react';

// --- Test helpers ---

function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();

  return (
    <div>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {!isLoading && !user && <div data-testid="unauthenticated">Not logged in</div>}
      {!isLoading && user && (
        <div>
          <div data-testid="authenticated">Logged in</div>
          <div data-testid="user-role">{user.role}</div>
          <div data-testid="user-email">{user.email}</div>
          <div data-testid="user-id">{user.userId}</div>
          <button data-testid="btn-logout" onClick={() => logout()}>
            Logout
          </button>
        </div>
      )}
      <button data-testid="btn-login" onClick={() => login('admin@test.com', 'password')}>
        Login
      </button>
    </div>
  );
}

function renderWithProvider(element: ReactNode) {
  return render(<AuthProvider>{element}</AuthProvider>);
}

// --- MSW handlers ---

const API_BASE = 'http://localhost:4000';

const handlers = [
  http.post(`${API_BASE}/api/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };

    if (body.email === 'admin@test.com' && body.password === 'password') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          session: {
            userId: 'user-1',
            companyId: null,
            branchId: null,
            role: 'SUPER_ADMIN',
            permissions: ['company.view', 'company.create'],
          },
        },
      });
    }

    return HttpResponse.json(
      { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      { status: 401 },
    );
  }),

  http.post(`${API_BASE}/api/auth/refresh`, async ({ request }) => {
    const body = await request.json() as { refreshToken?: string };

    if (body.refreshToken === 'refresh-token-456' || body.refreshToken === 'valid-refresh-token') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });
    }

    return HttpResponse.json(
      { success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' } },
      { status: 401 },
    );
  }),

  http.get(`${API_BASE}/api/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        userId: 'user-1',
        companyId: null,
        branchId: null,
        role: 'SUPER_ADMIN',
        permissions: ['company.view', 'company.create'],
        name: 'Admin User',
        email: 'admin@test.com',
        lastLoginAt: '2026-07-07T10:00:00Z',
      },
    });
  }),

  http.post(`${API_BASE}/api/auth/logout`, () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe('AuthProvider', () => {
  beforeEach(() => {
    // Clear all auth state between tests
    localStorage.clear();
    setAccessToken(null);
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;path=/;max-age=0');
    });
  });

  describe('initial state', () => {
    it('shows unauthenticated when no stored session', async () => {
      renderWithProvider(<TestConsumer />);

      // useEffect runs synchronously in test env, so loading may flash instantly
      // Just verify we end up in the unauthenticated state
      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeDefined();
      });
    });

    it('restores session from stored refresh token', async () => {
      localStorage.setItem('shashvat_refresh_token', 'valid-refresh-token');

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeDefined();
      });

      expect(screen.getByTestId('user-role').textContent).toBe('SUPER_ADMIN');
      expect(screen.getByTestId('user-id').textContent).toBe('user-1');
    });

    it('clears invalid refresh token on restore failure', async () => {
      localStorage.setItem('shashvat_refresh_token', 'expired-refresh-token');

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeDefined();
      });

      expect(localStorage.getItem('shashvat_refresh_token')).toBeNull();
      expect(document.cookie).not.toContain('auth-token');
    });
  });

  describe('login', () => {
    it('updates user state and stores tokens on successful login', async () => {
      renderWithProvider(<TestConsumer />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeDefined();
      });

      // Click login button
      screen.getByTestId('btn-login').click();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeDefined();
      });

      expect(screen.getByTestId('user-role').textContent).toBe('SUPER_ADMIN');
      expect(screen.getByTestId('user-email').textContent).toBe('admin@test.com');

      // Tokens stored
      expect(localStorage.getItem('shashvat_refresh_token')).toBe('refresh-token-456');
      expect(document.cookie).toContain('auth-token');
    });

    it('throws ApiError on failed login', async () => {
      let caughtError: unknown = null;

      function LoginWithErrorHandler() {
        const { login } = useAuth();

        async function handleLogin() {
          try {
            await login('wrong@test.com', 'wrong-password');
          } catch (e) {
            caughtError = e;
          }
        }

        return <button data-testid="btn-bad-login" onClick={handleLogin}>Bad Login</button>;
      }

      renderWithProvider(<LoginWithErrorHandler />);

      // Wait for initial load
      await waitFor(() => screen.getByTestId('btn-bad-login'));

      screen.getByTestId('btn-bad-login').click();

      await vi.waitFor(() => {
        expect(caughtError).toBeInstanceOf(ApiError);
      });

      if (caughtError instanceof ApiError) {
        expect(caughtError.code).toBe('INVALID_CREDENTIALS');
      }
    });
  });

  describe('logout', () => {
    it('clears user state and tokens on logout', async () => {
      // First login by restoring session
      localStorage.setItem('shashvat_refresh_token', 'valid-refresh-token');

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeDefined();
      });

      // Logout
      screen.getByTestId('btn-logout').click();

      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeDefined();
      });

      expect(localStorage.getItem('shashvat_refresh_token')).toBeNull();
      expect(document.cookie).not.toContain('auth-token');
    });

    it('clears state even when logout API call fails', async () => {
      server.use(
        http.post(`${API_BASE}/api/auth/logout`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
            { status: 500 },
          );
        }),
      );

      localStorage.setItem('shashvat_refresh_token', 'valid-refresh-token');

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeDefined();
      });

      screen.getByTestId('btn-logout').click();

      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeDefined();
      });

      expect(localStorage.getItem('shashvat_refresh_token')).toBeNull();
    });
  });

  describe('useAuth', () => {
    it('provides auth context values when used within AuthProvider', async () => {
      localStorage.setItem('shashvat_refresh_token', 'valid-refresh-token');

      renderWithProvider(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeDefined();
      });

      // Verify all auth context values are accessible
      expect(screen.getByTestId('user-role').textContent).toBe('SUPER_ADMIN');
      expect(screen.getByTestId('user-id').textContent).toBe('user-1');
    });
  });
});
