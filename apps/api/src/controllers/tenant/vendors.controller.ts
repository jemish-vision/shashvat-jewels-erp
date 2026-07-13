import { Request, Response, NextFunction } from 'express';
import {
  createVendorSchema,
  updateVendorSchema,
  listVendorQuerySchema,
} from '../../schemas/vendor.schema.js';
import * as vendorService from '../../services/vendors.service.js';

export async function listVendorsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const query = listVendorQuerySchema.parse(req.query);
    const result = await vendorService.listVendors(companyId, query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

export async function getVendorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const vendorId = req.params.id as string;
    const vendor = await vendorService.getVendorById(companyId, vendorId);
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
}

export async function createVendorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const input = createVendorSchema.parse(req.body);
    const vendor = await vendorService.createVendor(companyId, userId, input);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
}

export async function updateVendorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const vendorId = req.params.id as string;
    const input = updateVendorSchema.parse(req.body);
    const vendor = await vendorService.updateVendor(companyId, userId, vendorId, input);
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
}

export async function deleteVendorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const vendorId = req.params.id as string;
    const result = await vendorService.softDeleteVendor(companyId, userId, vendorId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
