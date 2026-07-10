import { Request, Response, NextFunction } from 'express';
import * as branchesService from '../../services/branches.service.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const result = await branchesService.listBranches(companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const { code, name, address, city, phone, isActive } = req.body as {
      code: string;
      name: string;
      address?: string;
      city?: string;
      phone?: string;
      isActive?: boolean;
    };
    const branch = await branchesService.createBranch(companyId, {
      code,
      name,
      address,
      city,
      phone,
      isActive,
    });
    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const branchId = req.params.id!;
    const { code, name, address, city, phone, isActive } = req.body as {
      code?: string;
      name?: string;
      address?: string;
      city?: string;
      phone?: string;
      isActive?: boolean;
    };
    const updated = await branchesService.updateBranch(companyId, branchId, {
      code,
      name,
      address,
      city,
      phone,
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
    const branchId = req.params.id!;
    const result = await branchesService.deleteBranch(companyId, branchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
