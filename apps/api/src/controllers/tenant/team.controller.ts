import { Request, Response, NextFunction } from 'express';
import * as teamService from '../../services/team.service.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const result = await teamService.listTeamMembers(companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { name, email, password, roleId, branchId } = req.body as {
      name: string;
      email: string;
      password: string;
      roleId: string;
      branchId?: string | null;
    };
    const member = await teamService.createTeamMember(companyId, {
      name,
      email,
      password,
      roleId,
      branchId,
    });
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.params.id!;
    const { name, roleId, branchId, isActive } = req.body as {
      name?: string;
      roleId?: string;
      branchId?: string | null;
      isActive?: boolean;
    };
    const updated = await teamService.updateTeamMember(companyId, userId, {
      name,
      roleId,
      branchId,
      isActive,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.params.id!;
    const result = await teamService.deleteTeamMember(companyId, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
