import { Role } from "@prisma/client";

export interface AuthSessionPayload {
  userId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId?: string | null;
  departmentName?: string | null;
}

export const AUTH_COOKIE_NAME = "ats_auth_token";
