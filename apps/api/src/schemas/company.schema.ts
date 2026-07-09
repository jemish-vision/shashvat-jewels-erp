import { z } from 'zod';

export const companyListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  skip: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().max(100).optional(),
  status: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional(),
}).strict();

export const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').min(3).max(100),
  email: z.string().email().optional(),
  adminPassword: z.string().min(4).max(100).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('India'),
  baseCurrency: z.string().default('INR'),
  taxId: z.string().optional(),
  status: z.enum(['TRIAL', 'ACTIVE']).default('TRIAL'),
  plan: z.string().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  adminPassword: z.string().min(4).max(100).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  baseCurrency: z.string().optional(),
  taxId: z.string().optional(),
  plan: z.string().optional(),
});

export type CompanyListQuery = z.infer<typeof companyListQuery>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
