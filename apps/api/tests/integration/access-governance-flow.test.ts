import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { onboardCompanySeed } from '../../src/services/company.service.js';
import * as rolesService from '../../src/services/roles.service.js';
import * as branchesService from '../../src/services/branches.service.js';
import * as teamService from '../../src/services/team.service.js';

const prisma = new PrismaClient();

describe('Access & Governance - Complete End-to-End Integration Flow', () => {
  it('executes complete Access & Governance lifecycle: company onboarding -> role management & list auto-grant -> showroom management -> sub-admin assignment', async () => {
    // 1. Onboard Company Tenant
    const slug = `gov-flow-${Date.now()}`;
    const passwordHash = await bcrypt.hash('SecretPass123!', 4);
    const company = await prisma.company.create({
      data: {
        slug,
        name: 'Governance Flow Jewels',
        email: `gov-${Date.now()}@jewels.com`,
        baseCurrency: 'USD',
        status: 'ACTIVE',
      },
    });
    const companyId = company.id;

    await onboardCompanySeed(prisma, company, {
      email: company.email!,
      passwordHash,
    });

    // 2. Verify Initial Roles
    const initialRoles = await rolesService.listRoles(companyId);
    expect(Array.isArray(initialRoles.roles)).toBe(true);

    // 3. Create Custom Role & Verify Auto-Included List Permissions
    const createdRole = await rolesService.createRole(companyId, {
      name: 'Jewelry Store Manager',
      description: 'Manages jewelry and inventory view',
      permissions: ['jewelry:create', 'customer:view'],
    });

    expect(createdRole.name).toBe('Jewelry Store Manager');

    const roleDetail = await rolesService.getRoleById(companyId, createdRole.id);
    expect(roleDetail.role.permissions).toContain('jewelry:create');
    expect(roleDetail.role.permissions).toContain('jewelry:list');
    expect(roleDetail.role.permissions).toContain('customer:view');
    expect(roleDetail.role.permissions).toContain('customer:list');

    // 4. Update Role Permissions & Verify Recalculation
    const updatedRoleResult = await rolesService.updateRole(companyId, createdRole.id, {
      name: 'Jewelry Store Manager Senior',
      description: 'Updated store manager',
      permissions: ['jewelry:update', 'sale:create'],
    });

    expect(updatedRoleResult.success).toBe(true);
    const updatedDetail = await rolesService.getRoleById(companyId, createdRole.id);
    expect(updatedDetail.role.name).toBe('Jewelry Store Manager Senior');
    expect(updatedDetail.role.permissions).toContain('jewelry:update');
    expect(updatedDetail.role.permissions).toContain('jewelry:list');
    expect(updatedDetail.role.permissions).toContain('sale:create');
    expect(updatedDetail.role.permissions).toContain('sale:list');

    // 5. Create & List Showroom Branch
    const createdBranch = await branchesService.createBranch(companyId, {
      code: 'NYC01',
      name: 'New York Flagship Showroom',
      address: '5th Ave',
      city: 'New York',
      phone: '+1 212 555 0101',
    });

    expect(createdBranch.code).toBe('NYC01');
    expect(createdBranch.name).toBe('New York Flagship Showroom');
    expect(createdBranch.isActive).toBe(true);

    const branchesList = await branchesService.listBranches(companyId);
    const foundBranch = branchesList.find((b) => b.id === createdBranch.id);
    expect(foundBranch).toBeDefined();
    expect(foundBranch?.name).toBe('New York Flagship Showroom');

    // 6. Create & Assign Sub-Admin to Custom Role and Showroom
    const member = await teamService.createTeamMember(companyId, {
      name: 'Alice SubAdmin',
      email: `alice-${Date.now()}@jewels.com`,
      password: 'Password123!',
      roleId: createdRole.id,
      branchId: createdBranch.id,
    });

    expect(member.name).toBe('Alice SubAdmin');
    expect(member.roleName).toBe('Jewelry Store Manager Senior');
    expect(member.branchName).toBe('New York Flagship Showroom');
    expect(member.isActive).toBe(true);

    // 7. Verify Team Members List & Admin Scope Mapping
    const { members } = await teamService.listTeamMembers(companyId);
    const alice = members.find((m) => m.id === member.id);
    expect(alice).toBeDefined();
    expect(alice?.roleId).toBe(createdRole.id);
    expect(alice?.branchId).toBe(createdBranch.id);
    expect(alice?.adminType).toBe('BRANCH_ADMIN');

    // 8. Update Sub-Admin Status
    const updatedMember = await teamService.updateTeamMember(companyId, member.id, {
      name: 'Alice Senior SubAdmin',
      isActive: false,
    });
    expect(updatedMember.name).toBe('Alice Senior SubAdmin');
    expect(updatedMember.isActive).toBe(false);
  }, 30000);
});
