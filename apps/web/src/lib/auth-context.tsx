'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch } from './api-client';
import { setAccessToken } from './auth-token';
import type { LoginResponse, MeResponse } from '@/features/auth/types';

export interface AuthUser {
  userId: string;
  companyId: string | null;
  branchId: string | null;
  role: string;
  permissions: string[];
  name?: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_TOKEN_KEY = 'shashvat_refresh_token';

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session from stored refresh token
  useEffect(() => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await apiFetch<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });

        setAccessToken(data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        setCookie('auth-token', '1', 7 * 24 * 60 * 60);

        // Fetch user info
        const me = await apiFetch<MeResponse>('/api/auth/me');
        setUser(me);
      } catch {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        clearCookie('auth-token');
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setAccessToken(data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    setCookie('auth-token', '1', 7 * 24 * 60 * 60);

    const authUser: AuthUser = {
      userId: data.session.userId,
      companyId: data.session.companyId,
      branchId: data.session.branchId,
      role: data.session.role,
      permissions: data.session.permissions,
      email,
    };
    setUser(authUser);
    return authUser;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Even if logout fails, clear local state
      }
    }
    setAccessToken(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearCookie('auth-token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
