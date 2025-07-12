import { auth } from "./auth";
import prisma from "./primsa";
import { SiteUser, Role, Permission, RolePermission } from "@prisma/client";

// Types for RBAC
export interface UserWithRole extends SiteUser {
  roles: Role & {
    rolepermissions: (RolePermission & {
      permissions: Permission;
    })[];
  };
}

export interface PermissionCheck {
  resource: string;
  action: string;
}

export type PermissionString = `${string}:${string}`; // format: "resource:action"

// Permission constants
export const PERMISSIONS = {
  // User management
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  
  // Role management
  ROLE_CREATE: "role:create",
  ROLE_READ: "role:read",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",
  
  // Booking management
  BOOKING_CREATE: "booking:create",
  BOOKING_READ: "booking:read",
  BOOKING_UPDATE: "booking:update",
  BOOKING_DELETE: "booking:delete",
  
  // Room management
  ROOM_CREATE: "room:create",
  ROOM_READ: "room:read",
  ROOM_UPDATE: "room:update",
  ROOM_DELETE: "room:delete",
  
  // Payment management
  PAYMENT_CREATE: "payment:create",
  PAYMENT_READ: "payment:read",
  PAYMENT_UPDATE: "payment:update",
  PAYMENT_DELETE: "payment:delete",
  
  // Report management
  REPORT_CREATE: "report:create",
  REPORT_READ: "report:read",
  REPORT_UPDATE: "report:update",
  REPORT_DELETE: "report:delete",
  
  // Settings management
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
} as const;

// Role constants
export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
} as const;

/**
 * Get current user with role and permissions
 */
export async function getCurrentUserWithPermissions(): Promise<UserWithRole | null> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.siteUser.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        include: {
          rolepermissions: {
            include: {
              permissions: true,
            },
          },
        },
      },
    },
  });

  return user as UserWithRole | null;
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(permission: PermissionString): Promise<boolean> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user || !user.roles) {
    return false;
  }

  const userPermissions = user.roles.rolepermissions.map((rp: RolePermission & { permissions: Permission }) => rp.permissions.permission);
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(permissions: PermissionString[]): Promise<boolean> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user || !user.roles) {
    return false;
  }

  const userPermissions = user.roles.rolepermissions.map((rp: RolePermission & { permissions: Permission }) => rp.permissions.permission);
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(permissions: PermissionString[]): Promise<boolean> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user || !user.roles) {
    return false;
  }

  const userPermissions = user.roles.rolepermissions.map((rp: RolePermission & { permissions: Permission }) => rp.permissions.permission);
  return permissions.every(permission => userPermissions.includes(permission));
}

/**
 * Check if user has a specific role
 */
export async function hasRoleByName(roleName: string): Promise<boolean> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user || !user.roles) {
    return false;
  }

  return user.roles.name === roleName;
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(roleNames: string[]): Promise<boolean> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user || !user.roles) {
    return false;
  }

  return roleNames.includes(user.roles.name);
}

/**
 * Get all permissions for current user
 */
export async function getUserPermissions(): Promise<string[]> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user || !user.roles) {
    return [];
  }

  return user.roles.rolepermissions.map((rp: RolePermission & { permissions: Permission }) => rp.permissions.permission);
}

/**
 * Get user's role name
 */
export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user || !user.roles) {
    return null;
  }

  return user.roles.name;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<UserWithRole> {
  const user = await getCurrentUserWithPermissions();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return user;
}

/**
 * Require permission - throws error if user doesn't have permission
 */
export async function requirePermission(permission: PermissionString): Promise<UserWithRole> {
  const user = await requireAuth();
  const hasPerm = await hasPermission(permission);
  
  if (!hasPerm) {
    throw new Error(`Permission denied: ${permission}`);
  }
  
  return user;
}

/**
 * Require any permission - throws error if user doesn't have any of the permissions
 */
export async function requireAnyPermission(permissions: PermissionString[]): Promise<UserWithRole> {
  const user = await requireAuth();
  const hasAny = await hasAnyPermission(permissions);
  
  if (!hasAny) {
    throw new Error(`Permission denied: requires one of ${permissions.join(", ")}`);
  }
  
  return user;
}

/**
 * Require role - throws error if user doesn't have the role
 */
export async function requireRole(roleName: string): Promise<UserWithRole> {
  const user = await requireAuth();
  const hasRole = await hasRoleByName(roleName);
  
  if (!hasRole) {
    throw new Error(`Role required: ${roleName}`);
  }
  
  return user;
}

/**
 * Check if user can access a resource with a specific action
 */
export async function canAccess(resource: string, action: string): Promise<boolean> {
  const permission = `${resource}:${action}` as PermissionString;
  return hasPermission(permission);
}

/**
 * Get all roles from database
 */
export async function getAllRoles() {
  return prisma.role.findMany({
    include: {
      rolepermissions: {
        include: {
          permissions: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });
}

/**
 * Get all permissions from database
 */
export async function getAllPermissions() {
  return prisma.permission.findMany({
    orderBy: {
      id: 'asc',
    },
  });
}

/**
 * Create a new role
 */
export async function createRole(name: string, description?: string, permissionIds?: number[]) {
  return prisma.role.create({
    data: {
      name,
      description,
      rolepermissions: permissionIds ? {
        create: permissionIds.map(permissionId => ({
          permission_id: permissionId,
        })),
      } : undefined,
    },
    include: {
      rolepermissions: {
        include: {
          permissions: true,
        },
      },
    },
  });
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(roleId: number, permissionIds: number[]) {
  // First, remove all existing permissions
  await prisma.rolePermission.deleteMany({
    where: {
      role_id: roleId,
    },
  });

  // Then add the new permissions
  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        role_id: roleId,
        permission_id: permissionId,
      })),
    });
  }

  return prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolepermissions: {
        include: {
          permissions: true,
        },
      },
    },
  });
}