import { z } from 'zod';

export const createVendorSchema = z.object({
  type: z.enum(['LOCAL', 'IMPORT', 'CONTRACTOR']).default('LOCAL'),
  name: z.string().min(1, 'Vendor name is required').max(150),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  taxId: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).default('India'),
  currencyId: z.string().optional().or(z.literal('')),
  paymentTerms: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

export const updateVendorSchema = createVendorSchema.partial();

export const listVendorQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional(),
  sortBy: z.enum(['createdAt', 'name', 'code']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type ListVendorQueryInput = z.infer<typeof listVendorQuerySchema>;
