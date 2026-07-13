import { z } from 'zod';

export const createCustomerSchema = z.object({
  type: z.enum(['RETAIL', 'WHOLESALE', 'CORPORATE']).default('RETAIL'),
  name: z.string().min(1, 'Customer name is required').max(150),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  taxId: z.string().max(50).optional().or(z.literal('')),
  billingAddress: z.string().max(500).optional().or(z.literal('')),
  shippingAddress: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).default('India'),
  creditLimit: z
    .union([z.number(), z.string()])
    .optional()
    .default(0),
  notes: z.string().max(1000).optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomerQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(), // CSV or single
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional(),
  sortBy: z.enum(['createdAt', 'name', 'code']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomerQueryInput = z.infer<typeof listCustomerQuerySchema>;
