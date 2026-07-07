export interface SessionPayload {
  userId: string;
  companyId: string | null;
  branchId: string | null;
  role: string;
  permissions: string[];
}
