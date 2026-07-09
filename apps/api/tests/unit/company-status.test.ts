import { describe, it, expect } from 'vitest';

type CompanyStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

const VALID_SUSPEND_FROM: CompanyStatus[] = ['TRIAL', 'ACTIVE'];
const VALID_REACTIVATE_FROM: CompanyStatus[] = ['SUSPENDED'];

function canSuspend(status: CompanyStatus): boolean {
  return (VALID_SUSPEND_FROM as string[]).includes(status);
}

function canReactivate(status: CompanyStatus): boolean {
  return (VALID_REACTIVATE_FROM as string[]).includes(status);
}

function canDelete(status: CompanyStatus): boolean {
  return status === 'SUSPENDED';
}

describe('company status transitions', () => {
  describe('suspend', () => {
    it('allows TRIAL -> SUSPENDED', () => {
      expect(canSuspend('TRIAL')).toBe(true);
    });

    it('allows ACTIVE -> SUSPENDED', () => {
      expect(canSuspend('ACTIVE')).toBe(true);
    });

    it('rejects SUSPENDED -> SUSPENDED', () => {
      expect(canSuspend('SUSPENDED')).toBe(false);
    });

    it('rejects CANCELLED -> SUSPENDED', () => {
      expect(canSuspend('CANCELLED')).toBe(false);
    });
  });

  describe('reactivate', () => {
    it('allows SUSPENDED -> ACTIVE', () => {
      expect(canReactivate('SUSPENDED')).toBe(true);
    });

    it('rejects TRIAL -> ACTIVE', () => {
      expect(canReactivate('TRIAL')).toBe(false);
    });

    it('rejects ACTIVE -> ACTIVE', () => {
      expect(canReactivate('ACTIVE')).toBe(false);
    });

    it('rejects CANCELLED -> ACTIVE', () => {
      expect(canReactivate('CANCELLED')).toBe(false);
    });
  });

  describe('delete', () => {
    it('allows SUSPENDED -> CANCELLED', () => {
      expect(canDelete('SUSPENDED')).toBe(true);
    });

    it('rejects TRIAL -> CANCELLED', () => {
      expect(canDelete('TRIAL')).toBe(false);
    });

    it('rejects ACTIVE -> CANCELLED', () => {
      expect(canDelete('ACTIVE')).toBe(false);
    });

    it('rejects CANCELLED -> CANCELLED', () => {
      expect(canDelete('CANCELLED')).toBe(false);
    });
  });

  describe('full transition matrix', () => {
    const allStatuses: CompanyStatus[] = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];

    it('only TRIAL/ACTIVE can be suspended', () => {
      for (const status of allStatuses) {
        const expected = status === 'TRIAL' || status === 'ACTIVE';
        expect(canSuspend(status)).toBe(expected);
      }
    });

    it('only SUSPENDED can be reactivated', () => {
      for (const status of allStatuses) {
        expect(canReactivate(status)).toBe(status === 'SUSPENDED');
      }
    });

    it('only SUSPENDED can be deleted', () => {
      for (const status of allStatuses) {
        expect(canDelete(status)).toBe(status === 'SUSPENDED');
      }
    });
  });
});
