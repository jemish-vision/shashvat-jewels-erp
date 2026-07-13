import { describe, it, expect } from 'vitest';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomerQuerySchema,
} from '../../src/schemas/customer.schema.js';

describe('Customer Schema Validation', () => {
  describe('createCustomerSchema', () => {
    it('validates a valid retail customer creation payload', () => {
      const payload = {
        name: 'Sashvat Jewelers Retail Client',
        type: 'RETAIL',
        email: 'client@sashvat.com',
        phone: '+91 9876543210',
        creditLimit: 500000,
        city: 'Surat',
        country: 'India',
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Sashvat Jewelers Retail Client');
        expect(result.data.type).toBe('RETAIL');
      }
    });

    it('fails validation when customer name is missing or empty', () => {
      const payload = {
        name: '',
        type: 'WHOLESALE',
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('fails validation when email format is invalid', () => {
      const payload = {
        name: 'Diamond Trader Client',
        email: 'invalid-email-string',
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('defaults type to RETAIL if not provided', () => {
      const payload = {
        name: 'Default Type Client',
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('RETAIL');
      }
    });
  });

  describe('updateCustomerSchema', () => {
    it('allows partial update of customer fields', () => {
      const payload = {
        name: 'Updated Client Name',
        isActive: false,
      };

      const result = updateCustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Client Name');
        expect(result.data.isActive).toBe(false);
      }
    });
  });

  describe('listCustomerQuerySchema', () => {
    it('validates and parses list query parameters with defaults', () => {
      const result = listCustomerQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(10);
      }
    });

    it('parses page and pageSize strings to numbers correctly', () => {
      const result = listCustomerQuerySchema.safeParse({
        page: '3',
        pageSize: '50',
        search: 'Surat',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(50);
        expect(result.data.search).toBe('Surat');
      }
    });
  });
});
