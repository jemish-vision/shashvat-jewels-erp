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
  companyName?: string;
  companyLogoUrl?: string | null;
  branchName?: string;
  branchCode?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
}


const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_TOKEN_KEY = 'shashvat_refresh_token';
const REMEMBER_ME_KEY   = 'shashvat_remember_me';   // 'true' | absent


function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from localStorage (remember me) or sessionStorage (session only)
  useEffect(() => {
    // Prefer localStorage (remember me was checked); fall back to sessionStorage
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    const refreshToken = rememberMe
      ? localStorage.getItem(REFRESH_TOKEN_KEY)
      : sessionStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    (async () => {
      try {
        const data = await apiFetch<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });

        setAccessToken(data.accessToken);
        // Rotate stored refresh token in the same storage
        if (rememberMe) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        } else {
          sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        setCookie('auth-token', '1', cookieMaxAge);

        const me = await apiFetch<MeResponse>('/api/auth/me');
        setUser(me);
        setCookie('user-role', me.role, cookieMaxAge);
      } catch {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        clearCookie('auth-token');
        clearCookie('user-role');
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);


  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });

    setAccessToken(data.accessToken);

    // Cookie & token storage lifetime based on rememberMe
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    if (rememberMe) {
      // Persist across browser restarts
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
      sessionStorage.removeItem(REFRESH_TOKEN_KEY); // ensure no stale session entry
    } else {
      // Session-only: cleared when browser tab/window closes
      sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.removeItem(REFRESH_TOKEN_KEY);  // ensure no stale persistent entry
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
    setCookie('auth-token', '1', cookieMaxAge);
    setCookie('user-role', data.session.role, cookieMaxAge);

    const authUser: AuthUser = {
      userId: data.session.userId,
      companyId: data.session.companyId,
      branchId: data.session.branchId,
      role: data.session.role,
      permissions: data.session.permissions,
      name: data.session.name,
      email: data.session.email || email,
      companyName: data.session.companyName,
      companyLogoUrl: data.session.companyLogoUrl,
      branchName: data.session.branchName,
      branchCode: data.session.branchCode,
    };
    setUser(authUser);
    return authUser;
  }, []);


  const logout = useCallback(async () => {
    const refreshToken =
      localStorage.getItem(REFRESH_TOKEN_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_KEY);
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
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    clearCookie('auth-token');
    clearCookie('user-role');
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
