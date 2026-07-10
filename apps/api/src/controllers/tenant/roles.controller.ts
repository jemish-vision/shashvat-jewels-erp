import { Request, Response, NextFunction } from 'express';
import * as rolesService from '../../services/roles.service.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const result = await rolesService.listRoles(companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const roleId = req.params.id!;
    const result = await rolesService.getRoleById(companyId, roleId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { name, description, permissions } = req.body as {
      name: string;
      description?: string;
      permissions?: string[];
    };
    const role = await rolesService.createRole(companyId, { name, description, permissions });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const roleId = req.params.id!;
    const { name, description, permissions } = req.body as {
      name?: string;
      description?: string;
      permissions?: string[];
    };
    const result = await rolesService.updateRole(companyId, roleId, {
      name,
      description,
      permissions,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const roleId = req.params.id!;
    const result = await rolesService.deleteRole(companyId, roleId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
