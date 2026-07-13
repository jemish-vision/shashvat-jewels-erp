import { Request, Response, NextFunction } from 'express';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomerQuerySchema,
} from '../../schemas/customer.schema.js';
import * as customerService from '../../services/customers.service.js';

export async function listCustomersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const query = listCustomerQuerySchema.parse(req.query);
    const result = await customerService.listCustomers(companyId, query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const customerId = req.params.id as string;
    const customer = await customerService.getCustomerById(companyId, customerId);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function createCustomerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const input = createCustomerSchema.parse(req.body);
    const customer = await customerService.createCustomer(companyId, userId, input);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const customerId = req.params.id as string;
    const input = updateCustomerSchema.parse(req.body);
    const customer = await customerService.updateCustomer(companyId, userId, customerId, input);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const customerId = req.params.id as string;
    const result = await customerService.softDeleteCustomer(companyId, userId, customerId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
