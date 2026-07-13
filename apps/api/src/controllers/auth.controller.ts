import { Request, Response, NextFunction } from 'express';
import { loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';
import { ValidationError } from '../lib/errors.js';
import { prisma } from '../db/prisma.js';
import { ErrorCodes } from '@shashvat/shared-types';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const { email, password, rememberMe } = parsed.data;
    const result = await authService.login(email, password, rememberMe);


    if (!result.success) {
      await prisma.platformAuditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          targetType: 'SuperAdmin',
          ipAddress,
          after: { email, reason: result.code },
        },
      });
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid email or password' },
      });
      return;
    }

    const isSuperAdmin = result.session.role === 'SUPER_ADMIN';
    if (isSuperAdmin) {
      await prisma.platformAuditLog.create({
        data: {
          superAdminId: result.session.userId,
          action: 'LOGIN',
          targetType: 'SuperAdmin',
          targetId: result.session.userId,
          ipAddress,
        },
      });
    } else if (result.session.companyId) {
      await prisma.auditLog.create({
        data: {
          companyId: result.session.companyId,
          branchId: result.session.branchId ?? null,
          userId: result.session.userId,
          action: 'LOGIN',
          entityType: 'User',
          entityId: result.session.userId,
          ipAddress,
        },
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        session: result.session,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const result = await authService.refresh(parsed.data.refreshToken);
    if (!result.success) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' },
      });
      return;
    }

    res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken, session: result.session } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      authService.logout(parsed.data.refreshToken);
    }

    if (req.session) {
      if (req.session.role === 'SUPER_ADMIN') {
        await prisma.platformAuditLog.create({
          data: {
            superAdminId: req.session.userId,
            action: 'LOGOUT',
            targetType: 'SuperAdmin',
            targetId: req.session.userId,
            ipAddress: req.ip || 'unknown',
          },
        });
      } else if (req.session.companyId) {
        await prisma.auditLog.create({
          data: {
            companyId: req.session.companyId,
            branchId: req.session.branchId ?? null,
            userId: req.session.userId,
            action: 'LOGOUT',
            entityType: 'User',
            entityId: req.session.userId,
            ipAddress: req.ip || 'unknown',
          },
        });
      }
    }

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Not authenticated' },
      });
      return;
    }

    const session = await authService.getSession(req.session.userId);
    if (!session) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'User not found' },
      });
      return;
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const result = await authService.forgotPassword(parsed.data.email);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
      return;
    }
    
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input', parsed.error.flatten());
    }

    const result = await authService.resetPassword(parsed.data.token, parsed.data.password);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
      return;
    }

    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    next(err);
  }
}
