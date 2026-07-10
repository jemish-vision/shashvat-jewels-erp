import { getTenantClient } from '../db/tenant-extension.js';
import { NotFoundError } from '../lib/errors.js';

export async function getTenantCompanyProfile(companyId: string) {
  const tenantDb = getTenantClient(companyId);
  const company = await tenantDb.company.findFirst();
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  return company;
}
