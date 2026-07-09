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
      branch: true,
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

  if (tenantUser.company.deletedAt || tenantUser.company.status === 'SUSPENDED') {
    return { success: false as const, code: 'COMPANY_SUSPENDED' as const };
  }

  if (!tenantUser.isActive) {
    return { success: false as const, code: 'ACCOUNT_DISABLED' as const };
  }

  const permissions = tenantUser.role.permissions.map(
    (rp) => `${rp.permission.resource}:${rp.permission.action}`
  );

  const session = {
    userId: tenantUser.id,
    companyId: tenantUser.companyId,
    branchId: tenantUser.branchId,
    role: tenantUser.role.name,
    permissions,
    name: tenantUser.name,
    email: tenantUser.email,
    companyName: tenantUser.company.name,
    companyLogoUrl: tenantUser.company.logoUrl,
    branchName: tenantUser.branch?.name ?? 'All Branches (HQ)',
    branchCode: tenantUser.branch?.code ?? 'ALL',
  };

  const accessToken = signAccessToken({
    userId: tenantUser.id,
    companyId: tenantUser.companyId,
    branchId: tenantUser.branchId,
    role: tenantUser.role.name,
    permissions,
  });
  const refreshToken = signRefreshToken(tenantUser.id);

  await prisma.user.update({
    where: { id: tenantUser.id },
    data: { lastLoginAt: new Date() },
  });

  return { success: true as const, accessToken, refreshToken, session };
}

export async function refresh(refreshToken: string) {
  const stored = refreshTokens.get(refreshToken);
  if (!stored || stored.expiresAt < new Date()) {
    refreshTokens.delete(refreshToken);
    return { success: false as const, code: 'INVALID_REFRESH_TOKEN' as const };
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET!) as unknown as { userId: string; type: string };
    const session = await getSession(decoded.userId);
    if (!session) {
      refreshTokens.delete(refreshToken);
      return { success: false as const, code: 'INVALID_REFRESH_TOKEN' as const };
    }

    const accessToken = signAccessToken({
      userId: session.userId,
      companyId: session.companyId,
      branchId: session.branchId,
      role: session.role,
      permissions: session.permissions,
    });
    refreshTokens.delete(refreshToken);
    const newRefreshToken = signRefreshToken(decoded.userId);
    return { success: true as const, accessToken, refreshToken: newRefreshToken, session };
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
      company: true,
      branch: true,
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  if (!tenantUser || !tenantUser.isActive || tenantUser.company.deletedAt || tenantUser.company.status === 'SUSPENDED') {
    return null;
  }

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
    companyName: tenantUser.company.name,
    companyLogoUrl: tenantUser.company.logoUrl,
    branchName: tenantUser.branch?.name ?? 'All Branches (HQ)',
    branchCode: tenantUser.branch?.code ?? 'ALL',
  };
}

export async function forgotPassword(email: string) {
  const normalizedEmail = email.toLowerCase();
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email: normalizedEmail } });
  const tenantUser = !superAdmin ? await prisma.user.findUnique({ where: { email: normalizedEmail } }) : null;

  if (!superAdmin && !tenantUser) {
    return { success: true as const, message: 'If this email is registered, you will receive a password reset link.' };
  }

  const targetEmail = superAdmin ? superAdmin.email : tenantUser!.email;
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      email: targetEmail,
      token: resetToken,
      expiresAt,
    },
  });

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  console.log('─────────────────────────────────────────────');
  console.log('  PASSWORD RESET LINK (dev mode):');
  console.log(`  ${resetUrl}`);
  console.log('─────────────────────────────────────────────');

  return {
    success: true as const,
    message: 'If this email is registered, you will receive a password reset link.',
    ...(process.env.NODE_ENV !== 'production' && { resetUrl }),
  };
}

export async function resetPassword(token: string, newPassword: string) {
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

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email: resetTokenRecord.email } });
  const tenantUser = !superAdmin ? await prisma.user.findUnique({ where: { email: resetTokenRecord.email } }) : null;

  if (!superAdmin && !tenantUser) {
    return { success: false as const, code: 'USER_NOT_FOUND' as const, message: 'User not found.' };
  }

  await prisma.$transaction(async (tx) => {
    if (superAdmin) {
      await tx.superAdmin.update({
        where: { id: superAdmin.id },
        data: { passwordHash: hashedPassword },
      });
    } else if (tenantUser) {
      await tx.user.update({
        where: { id: tenantUser.id },
        data: { passwordHash: hashedPassword },
      });
    }
    await tx.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { usedAt: new Date() },
    });
  });

  return { success: true as const, message: 'Password has been reset successfully.' };
}
