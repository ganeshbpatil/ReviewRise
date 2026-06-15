import type { UserRole } from "@prisma/client";

export type Permission =
  | "agency:manage"
  | "agency:view"
  | "client:create"
  | "client:update"
  | "client:delete"
  | "client:view"
  | "location:create"
  | "location:update"
  | "location:view"
  | "review:view"
  | "review:reply"
  | "review:manage"
  | "campaign:create"
  | "campaign:manage"
  | "campaign:view"
  | "competitor:manage"
  | "competitor:view"
  | "analytics:view"
  | "social-proof:manage"
  | "social-proof:view"
  | "ai:use"
  | "billing:manage"
  | "billing:view"
  | "user:invite"
  | "user:manage"
  | "settings:manage"
  | "audit:view";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "agency:manage", "agency:view", "client:create", "client:update", "client:delete",
    "client:view", "location:create", "location:update", "location:view", "review:view",
    "review:reply", "review:manage", "campaign:create", "campaign:manage", "campaign:view",
    "competitor:manage", "competitor:view", "analytics:view", "social-proof:manage",
    "social-proof:view", "ai:use", "billing:manage", "billing:view", "user:invite",
    "user:manage", "settings:manage", "audit:view",
  ],
  AGENCY_OWNER: [
    "agency:manage", "agency:view", "client:create", "client:update", "client:delete",
    "client:view", "location:create", "location:update", "location:view", "review:view",
    "review:reply", "review:manage", "campaign:create", "campaign:manage", "campaign:view",
    "competitor:manage", "competitor:view", "analytics:view", "social-proof:manage",
    "social-proof:view", "ai:use", "billing:manage", "billing:view", "user:invite",
    "user:manage", "settings:manage", "audit:view",
  ],
  AGENCY_ADMIN: [
    "agency:view", "client:create", "client:update", "client:view", "location:create",
    "location:update", "location:view", "review:view", "review:reply", "review:manage",
    "campaign:create", "campaign:manage", "campaign:view", "competitor:manage",
    "competitor:view", "analytics:view", "social-proof:manage", "social-proof:view",
    "ai:use", "billing:view", "user:invite", "user:manage", "settings:manage",
  ],
  ACCOUNT_MANAGER: [
    "client:view", "location:view", "review:view", "review:reply", "campaign:create",
    "campaign:manage", "campaign:view", "competitor:view", "analytics:view",
    "social-proof:manage", "social-proof:view", "ai:use",
  ],
  SALES_USER: [
    "client:view", "analytics:view", "campaign:view",
  ],
  CLIENT_OWNER: [
    "client:view", "location:view", "review:view", "review:reply", "campaign:view",
    "competitor:view", "analytics:view", "social-proof:view", "ai:use", "billing:view",
  ],
  CLIENT_MANAGER: [
    "client:view", "location:view", "review:view", "review:reply", "campaign:view",
    "analytics:view", "social-proof:view", "ai:use",
  ],
  LOCATION_MANAGER: [
    "location:view", "review:view", "review:reply", "analytics:view",
  ],
  READ_ONLY: ["client:view", "review:view", "analytics:view"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Insufficient permissions: ${permission} required`);
  }
}

export function getUserPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_ADMIN"];
export const AGENCY_ROLES: UserRole[] = ["SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_ADMIN", "ACCOUNT_MANAGER", "SALES_USER"];
export const CLIENT_ROLES: UserRole[] = ["CLIENT_OWNER", "CLIENT_MANAGER", "LOCATION_MANAGER", "READ_ONLY"];
