import { describe, it, expect } from 'vitest';
import {
  createVendorSchema,
  updateVendorSchema,
  listVendorQuerySchema,
} from '../../src/schemas/vendor.schema.js';

describe('Vendor Schema Validation', () => {
  describe('createVendorSchema', () => {
    it('validates a valid bullion or import supplier creation payload', () => {
      const payload = {
        name: 'Antwerp Bullion & Diamonds BV',
        type: 'IMPORT',
        email: 'supply@antwerp-bullion.com',
        phone: '+32 3 123 4567',
        paymentTerms: 'NET30',
        city: 'Antwerp',
        country: 'Belgium',
      };

      const result = createVendorSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Antwerp Bullion & Diamonds BV');
        expect(result.data.type).toBe('IMPORT');
        expect(result.data.paymentTerms).toBe('NET30');
      }
    });

    it('fails validation when vendor name is missing or empty', () => {
      const payload = {
        name: '',
        type: 'LOCAL',
      };

      const result = createVendorSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('fails validation when email format is invalid', () => {
      const payload = {
        name: 'Karigar Workshop 01',
        email: 'invalid-email',
      };

      const result = createVendorSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('updateVendorSchema', () => {
    it('allows updating payment terms and isActive status', () => {
      const payload = {
        paymentTerms: 'NET60',
        isActive: true,
      };

      const result = updateVendorSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paymentTerms).toBe('NET60');
        expect(result.data.isActive).toBe(true);
      }
    });
  });

  describe('listVendorQuerySchema', () => {
    it('validates default pagination and filtering params', () => {
      const result = listVendorQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(10);
      }
    });
  });
});
