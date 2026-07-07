import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import type { SessionPayload } from '@shashvat/shared-types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// In-memory refresh token store. Switch to DB if multi-instance needed.
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

function signAccessToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function signRefreshToken(userId: string): string {
  const token = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  refreshTokens.set(token, { userId, expiresAt });
  return token;
}

export async function login(email: string, password: string) {
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
  if (!superAdmin) {
    return { success: false as const, code: 'INVALID_CREDENTIALS' as const };
  }

  const valid = await bcrypt.compare(password, superAdmin.passwordHash);
  if (!valid) {
    return { success: false as const, code: 'INVALID_CREDENTIALS' as const };
  }

  if (!superAdmin.isActive) {
    return { success: false as const, code: 'ACCOUNT_DISABLED' as const };
  }

  const session: SessionPayload = {
    userId: superAdmin.id,
    companyId: null,
    branchId: null,
    role: 'SUPER_ADMIN',
    permissions: [],
  };

  const accessToken = signAccessToken(session);
  const refreshToken = signRefreshToken(superAdmin.id);

  await prisma.superAdmin.update({
    where: { id: superAdmin.id },
    data: { lastLoginAt: new Date() },
  });

  return { success: true as const, accessToken, refreshToken, session };
}

export function refresh(refreshToken: string) {
  const stored = refreshTokens.get(refreshToken);
  if (!stored || stored.expiresAt < new Date()) {
    refreshTokens.delete(refreshToken);
    return { success: false as const, code: 'INVALID_REFRESH_TOKEN' as const };
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };
    const accessToken = signAccessToken({
      userId: decoded.userId,
      companyId: null,
      branchId: null,
      role: 'SUPER_ADMIN',
      permissions: [],
    });
    // Issue new refresh token, revoke old
    refreshTokens.delete(refreshToken);
    const newRefreshToken = signRefreshToken(decoded.userId);
    return { success: true as const, accessToken, refreshToken: newRefreshToken };
  } catch {
    return { success: false as const, code: 'INVALID_REFRESH_TOKEN' as const };
  }
}

export function logout(refreshToken: string): void {
  refreshTokens.delete(refreshToken);
}

export async function getSession(userId: string) {
  const superAdmin = await prisma.superAdmin.findUnique({ where: { id: userId } });
  if (!superAdmin) return null;
  return {
    userId: superAdmin.id,
    companyId: null,
    branchId: null,
    role: 'SUPER_ADMIN' as const,
    permissions: [],
    name: superAdmin.name,
    email: superAdmin.email,
    lastLoginAt: superAdmin.lastLoginAt,
  };
}
