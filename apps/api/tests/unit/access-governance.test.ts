import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { PERMISSION_CATALOG } from '../../src/lib/permissions.js';
import { autoIncludeListPermissions } from '../../src/services/roles.service.js';
import {
  requirePermission,
  requireAnyPermission,
  enforceBranchScope,
} from '../../src/middleware/require-permission.js';
import { PermissionError } from '../../src/lib/errors.js';

describe('Access & Governance - Permission Catalog & RBAC', () => {
  describe('PERMISSION_CATALOG Integrity', () => {
    it('should define all core RBAC resources', () => {
      const resources = new Set(PERMISSION_CATALOG.map((p) => p.resource));
      const expectedResources = [
        'branch',
        'user',
        'role',
        'certified-diamond',
        'loose-diamond',
        'jewelry',
        'customer',
        'vendor',
        'purchase',
        'sale',
        'memo',
        'hold',
        'transfer',
        'manufacturing',
        'accounting',
        'report',
        'notification',
      ];
      for (const res of expectedResources) {
        expect(resources.has(res)).toBe(true);
      }
    });

    it('should ensure every resource includes view and list actions', () => {
      const byResource = new Map<string, Set<string>>();
      for (const p of PERMISSION_CATALOG) {
        if (!byResource.has(p.resource)) {
          byResource.set(p.resource, new Set());
        }
        byResource.get(p.resource)!.add(p.action);
      }

      for (const [resource, actions] of byResource.entries()) {
        expect(actions.has('list'), `Resource ${resource} missing list action`).toBe(true);
        expect(actions.has('view'), `Resource ${resource} missing view action`).toBe(true);
      }
    });
  });

  describe('autoIncludeListPermissions Helper', () => {
    it('should automatically grant list permission when any resource permission is selected', () => {
      const input = ['role:view', 'customer:create', 'branch:update'];
      const output = autoIncludeListPermissions(input);

      expect(output).toContain('role:view');
      expect(output).toContain('role:list');
      expect(output).toContain('customer:create');
      expect(output).toContain('customer:list');
      expect(output).toContain('branch:update');
      expect(output).toContain('branch:list');
    });

    it('should not duplicate list permission if already present', () => {
      const input = ['role:list', 'role:view'];
      const output = autoIncludeListPermissions(input);
      expect(output.filter((p) => p === 'role:list')).toHaveLength(1);
    });

    it('should handle empty permissions array', () => {
      expect(autoIncludeListPermissions([])).toEqual([]);
    });
  });

  describe('Permission Middleware (requirePermission & requireAnyPermission)', () => {
    function createMockRequest(permissions?: string[]) {
      return {
        session: permissions ? { permissions } : undefined,
      } as unknown as Request;
    }

    const mockRes = {} as Response;

    it('requirePermission throws when unauthenticated', () => {
      const mw = requirePermission('role:create');
      expect(() => mw(createMockRequest(), mockRes, vi.fn())).toThrow(PermissionError);
    });

    it('requirePermission throws when user lacks required permission', () => {
      const mw = requirePermission('role:create');
      const req = createMockRequest(['role:list', 'role:view']);
      expect(() => mw(req, mockRes, vi.fn())).toThrow(
        'You do not have permission for this action'
      );
    });

    it('requirePermission passes when user has all required permissions', () => {
      const mw = requirePermission('role:create');
      const req = createMockRequest(['role:create', 'role:list']);
      const next = vi.fn();
      mw(req, mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('requireAnyPermission passes when user has at least one of the required permissions', () => {
      const mw = requireAnyPermission('role:list', 'role:view');
      const req = createMockRequest(['role:list']);
      const next = vi.fn();
      mw(req, mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it('requireAnyPermission throws when user lacks all specified permissions', () => {
      const mw = requireAnyPermission('role:list', 'role:view');
      const req = createMockRequest(['customer:list']);
      expect(() => mw(req, mockRes, vi.fn())).toThrow(
        'You do not have permission for this action'
      );
    });
  });

  describe('Branch Scope Enforcement (enforceBranchScope)', () => {
    it('allows access to requested branch when session is HQ (branchId is null or undefined)', () => {
      expect(enforceBranchScope({ branchId: null }, 'branch-123')).toBe('branch-123');
      expect(enforceBranchScope({ branchId: undefined }, 'branch-123')).toBe('branch-123');
    });

    it('enforces branch scope when session has specific branchId', () => {
      expect(() =>
        enforceBranchScope({ branchId: 'branch-A' }, 'branch-B')
      ).toThrow(PermissionError);
    });

    it('passes when requested branch matches session branchId', () => {
      expect(enforceBranchScope({ branchId: 'branch-A' }, 'branch-A')).toBe('branch-A');
    });
  });
});
