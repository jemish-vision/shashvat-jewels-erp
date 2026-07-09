export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  session: {
    userId: string;
    companyId: string | null;
    branchId: string | null;
    role: string;
    permissions: string[];
    name?: string;
    email?: string;
    companyName?: string;
    companyLogoUrl?: string | null;
    branchName?: string;
    branchCode?: string;
  };
}

export interface MeResponse {
  userId: string;
  companyId: string | null;
  branchId: string | null;
  role: string;
  permissions: string[];
  name: string;
  email: string;
  lastLoginAt: string | null;
  companyName?: string;
  companyLogoUrl?: string | null;
  branchName?: string;
  branchCode?: string;
}
