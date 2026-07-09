import { describe, it, expect } from 'vitest';
import { companyListQuery, createCompanySchema, updateCompanySchema } from '../../src/schemas/company.schema.js';

describe('companyListQuery', () => {
  it('applies defaults for empty query', () => {
    const result = companyListQuery.parse({});
    expect(result.limit).toBe(25);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortDir).toBe('desc');
  });

  it('rejects unknown params', () => {
    const result = companyListQuery.safeParse({ unknownParam: 'x' });
    expect(result.success).toBe(false);
  });

  it('clamps limit to 100', () => {
    const result = companyListQuery.safeParse({ limit: 999 });
    expect(result.success).toBe(false);
  });

  it('accepts valid search', () => {
    const result = companyListQuery.parse({ search: 'test company', status: 'ACTIVE', includeDeleted: true });
    expect(result.search).toBe('test company');
    expect(result.status).toBe('ACTIVE');
    expect(result.includeDeleted).toBe(true);
  });

  it('rejects invalid sortBy', () => {
    const result = companyListQuery.safeParse({ sortBy: 'email' });
    expect(result.success).toBe(false);
  });
});

describe('createCompanySchema', () => {
  it('accepts valid input with defaults', () => {
    const result = createCompanySchema.parse({ name: 'Test Corp', slug: 'test-corp' });
    expect(result.name).toBe('Test Corp');
    expect(result.slug).toBe('test-corp');
    expect(result.baseCurrency).toBe('INR');
    expect(result.country).toBe('India');
    expect(result.status).toBe('TRIAL');
  });

  it('rejects invalid slug characters', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', slug: 'UPPERCASE' });
    expect(result.success).toBe(false);
  });

  it('rejects slug with spaces', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', slug: 'my company' });
    expect(result.success).toBe(false);
  });

  it('rejects slug with special chars', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', slug: 'test_company!' });
    expect(result.success).toBe(false);
  });

  it('accepts alphanumeric slug with hyphens', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', slug: 'my-company-123' });
    expect(result.success).toBe(true);
  });

  it('rejects slug shorter than 3 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', slug: 'ab' });
    expect(result.success).toBe(false);
  });

  it('accepts explicit status ACTIVE', () => {
    const result = createCompanySchema.parse({ name: 'Test', slug: 'test', status: 'ACTIVE' });
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects invalid status', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', slug: 'test', status: 'BANNED' });
    expect(result.success).toBe(false);
  });

  it('accepts full input', () => {
    const result = createCompanySchema.parse({
      name: 'Full Corp', slug: 'full-corp', email: 'a@b.com', phone: '123',
      address: 'Addr', city: 'Mumbai', country: 'India', baseCurrency: 'USD',
      taxId: 'GST123', status: 'TRIAL', plan: 'premium',
    });
    expect(result.email).toBe('a@b.com');
    expect(result.plan).toBe('premium');
  });
});

describe('updateCompanySchema', () => {
  it('accepts partial update', () => {
    const result = updateCompanySchema.parse({ name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('rejects slug field', () => {
    const result = updateCompanySchema.safeParse({ slug: 'new-slug' });
    expect(result.success).toBe(false);
  });

  it('rejects status field', () => {
    const result = updateCompanySchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(false);
  });

  it('accepts empty object', () => {
    const result = updateCompanySchema.parse({});
    expect(Object.keys(result).length).toBe(0);
  });
});

describe('slug regex pattern', () => {
  const slugRegex = /^[a-z0-9-]+$/;

  it('matches valid slugs', () => {
    expect(slugRegex.test('my-company')).toBe(true);
    expect(slugRegex.test('test123')).toBe(true);
    expect(slugRegex.test('a')).toBe(true);
    expect(slugRegex.test('a-b-c')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(slugRegex.test('UpperCase')).toBe(false);
    expect(slugRegex.test('space space')).toBe(false);
    expect(slugRegex.test('under_score')).toBe(false);
    expect(slugRegex.test('special!')).toBe(false);
    expect(slugRegex.test('slash/slash')).toBe(false);
    expect(slugRegex.test('')).toBe(false);
  });
});
