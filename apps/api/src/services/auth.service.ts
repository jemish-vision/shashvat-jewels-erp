import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import type { SessionPayload } from '@shashvat/shared-types';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables.');
}
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// In-memory refresh token store. Switch to DB if multi-instance needed.
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

function signAccessToken(payload: SessionPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function signRefreshToken(userId: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  const token = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  refreshTokens.set(token, { userId, expiresAt });
  return token;
}

export async function login(rawEmail: string, password: string) {
  const email = rawEmail.trim().toLowerCase();
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
  if (superAdmin) {
    const valid = await bcrypt.compare(password, superAdmin.passwordHash);
    if (!valid) {
      return { success: false as const, code: 'INVALID_CREDENTIALS' as const };
    }
    if (!superAdmin.isActive) {
      return { success: false as const, code: 'ACCOUNT_DISABLED' as const };
    }
    const session: SessionPayload & { name: string; email: string } = {
      userId: superAdmin.id,
      companyId: null,
      branchId: null,
      role: 'SUPER_ADMIN',
      permissions: [],
      name: superAdmin.name,
      email: superAdmin.email,
    };
    const accessToken = signAccessToken(session);
    const refreshToken = signRefreshToken(superAdmin.id);
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLoginAt: new Date() },
    });
    return { success: true as const, accessToken, refreshToken, session };
  }

  const tenantUser = await prisma.user.findFirst({
    where: { email },
    include: {
      company: true,
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  if (!tenantUser) {
    return { success: false as const, code: 'INVALID_CREDENTIALS' as const };
  }

  const valid = await bcrypt.compare(password, tenantUser.passwordHash);
  if (!valid) {
    return { success: false as const, code: 'INVALID_CREDENTIALS' as const };
  }

  if (!tenantUser.isActive || tenantUser.company.deletedAt || tenantUser.company.status === 'SUSPENDED') {
    return { success: false as const, code: 'ACCOUNT_DISABLED' as const };
  }

  const permissions = tenantUser.role.permissions.map(
    (rp) => `${rp.permission.resource}:${rp.permission.action}`
  );

  const session: SessionPayload & { name: string; email: string } = {
    userId: tenantUser.id,
    companyId: tenantUser.companyId,
    branchId: tenantUser.branchId,
    role: tenantUser.role.name,
    permissions,
    name: tenantUser.name,
    email: tenantUser.email,
  };

  const accessToken = signAccessToken(session);
  const refreshToken = signRefreshToken(tenantUser.id);

  await prisma.user.update({
    where: { id: tenantUser.id },
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
    const decoded = jwt.verify(refreshToken, JWT_SECRET!) as unknown as { userId: string; type: string };
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
  if (superAdmin) {
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

  const tenantUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  if (!tenantUser) return null;

  const permissions = tenantUser.role.permissions.map(
    (rp) => `${rp.permission.resource}:${rp.permission.action}`
  );

  return {
    userId: tenantUser.id,
    companyId: tenantUser.companyId,
    branchId: tenantUser.branchId,
    role: tenantUser.role.name,
    permissions,
    name: tenantUser.name,
    email: tenantUser.email,
    lastLoginAt: tenantUser.lastLoginAt,
  };
}

export async function forgotPassword(email: string) {
  // Look up user in super_admins first, then tenant users (for Module 03)
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
  if (!superAdmin) {
    // Return success even if email not found (security: don't reveal which emails exist)
    return { success: true as const, message: 'If this email is registered, you will receive a password reset link.' };
  }

  // Generate a secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

  // Store the token in the database
  await prisma.passwordResetToken.create({
    data: {
      email: superAdmin.email,
      token: resetToken,
      expiresAt,
    },
  });

  // Build reset URL
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  // In development: log the reset URL
  console.log('─────────────────────────────────────────────');
  console.log('  PASSWORD RESET LINK (dev mode):');
  console.log(`  ${resetUrl}`);
  console.log('─────────────────────────────────────────────');

  // TODO: Send email via SMTP/Resend/etc. when email service is configured
  // For now, return the reset URL so frontend can test
  return {
    success: true as const,
    message: 'If this email is registered, you will receive a password reset link.',
    // Only include resetUrl in development
    ...(process.env.NODE_ENV !== 'production' && { resetUrl }),
  };
}

export async function resetPassword(token: string, newPassword: string) {
  // Find valid token
  const resetTokenRecord = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetTokenRecord) {
    return { success: false as const, code: 'INVALID_TOKEN' as const, message: 'Invalid or expired reset token.' };
  }

  if (resetTokenRecord.usedAt) {
    return { success: false as const, code: 'TOKEN_ALREADY_USED' as const, message: 'This reset link has already been used.' };
  }

  if (resetTokenRecord.expiresAt < new Date()) {
    return { success: false as const, code: 'TOKEN_EXPIRED' as const, message: 'This reset link has expired.' };
  }

  // Hash new password and update
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email: resetTokenRecord.email } });
  if (!superAdmin) {
    return { success: false as const, code: 'USER_NOT_FOUND' as const, message: 'User not found.' };
  }

  await prisma.$transaction([
    prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { passwordHash: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true as const, message: 'Password has been reset successfully.' };
}
