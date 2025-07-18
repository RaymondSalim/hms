import { auth } from './auth';
import prisma from './primsa';

// Permission constants
export const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Role Management
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  
  // Booking Management
  BOOKING_CREATE: 'booking:create',
  BOOKING_READ: 'booking:read',
  BOOKING_UPDATE: 'booking:update',
  BOOKING_DELETE: 'booking:delete',
  BOOKING_APPROVE: 'booking:approve',
  BOOKING_CANCEL: 'booking:cancel',
  
  // Room Management
  ROOM_CREATE: 'room:create',
  ROOM_READ: 'room:read',
  ROOM_UPDATE: 'room:update',
  ROOM_DELETE: 'room:delete',
  
  // Payment Management
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_READ: 'payment:read',
  PAYMENT_UPDATE: 'payment:update',
  PAYMENT_DELETE: 'payment:delete',
  PAYMENT_APPROVE: 'payment:approve',
  
  // Report Management
  REPORT_CREATE: 'report:create',
  REPORT_READ: 'report:read',
  REPORT_UPDATE: 'report:update',
  REPORT_DELETE: 'report:delete',
  
  // Settings Management
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  
  // System Management
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_LOGS: 'system:logs',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role constants
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  USER: 'user',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Default role permissions mapping
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_DELETE,
    PERMISSIONS.BOOKING_APPROVE,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.ROOM_CREATE,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.ROOM_UPDATE,
    PERMISSIONS.ROOM_DELETE,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_UPDATE,
    PERMISSIONS.PAYMENT_DELETE,
    PERMISSIONS.PAYMENT_APPROVE,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_UPDATE,
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.SYSTEM_LOGS,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_APPROVE,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.ROOM_UPDATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_UPDATE,
    PERMISSIONS.PAYMENT_APPROVE,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_UPDATE,
    PERMISSIONS.REPORT_READ,
  ],
  [ROLES.USER]: [
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.ROOM_READ,
    PERMISSIONS.PAYMENT_READ,
  ],
};

// Types
export interface UserPermissions {
  userId: string;
  roleId: number;
  roleName: string;
  permissions: Permission[];
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  userPermissions?: UserPermissions;
  error?: string;
}

// Core RBAC functions
export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  try {
    const user = await prisma.siteUser.findUnique({
      where: { id: userId },
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

    if (!user || !user.roles) {
      return null;
    }

    const permissions = user.roles.rolepermissions.map(
      (rp) => rp.permissions.permission as Permission
    );

    return {
      userId: user.id,
      roleId: user.roles.id,
      roleName: user.roles.name,
      permissions,
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return null;
  }
}

export async function hasPermission(
  userId: string,
  requiredPermission: Permission
): Promise<PermissionCheckResult> {
  try {
    const userPermissions = await getUserPermissions(userId);
    
    if (!userPermissions) {
      return {
        hasPermission: false,
        error: 'User not found or has no role assigned',
      };
    }

    const hasPermission = userPermissions.permissions.includes(requiredPermission);
    
    return {
      hasPermission,
      userPermissions,
    };
  } catch (error) {
    console.error('Error checking permission:', error);
    return {
      hasPermission: false,
      error: 'Error checking permission',
    };
  }
}

export async function hasAnyPermission(
  userId: string,
  requiredPermissions: Permission[]
): Promise<PermissionCheckResult> {
  try {
    const userPermissions = await getUserPermissions(userId);
    
    if (!userPermissions) {
      return {
        hasPermission: false,
        error: 'User not found or has no role assigned',
      };
    }

    const hasAnyPermission = requiredPermissions.some(permission =>
      userPermissions.permissions.includes(permission)
    );
    
    return {
      hasPermission: hasAnyPermission,
      userPermissions,
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      hasPermission: false,
      error: 'Error checking permissions',
    };
  }
}

export async function hasAllPermissions(
  userId: string,
  requiredPermissions: Permission[]
): Promise<PermissionCheckResult> {
  try {
    const userPermissions = await getUserPermissions(userId);
    
    if (!userPermissions) {
      return {
        hasPermission: false,
        error: 'User not found or has no role assigned',
      };
    }

    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.permissions.includes(permission)
    );
    
    return {
      hasPermission: hasAllPermissions,
      userPermissions,
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      hasPermission: false,
      error: 'Error checking permissions',
    };
  }
}

export async function hasRole(userId: string, requiredRole: Role): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userId);
    return userPermissions?.roleName === requiredRole;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

export async function hasAnyRole(userId: string, requiredRoles: Role[]): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userId);
    return requiredRoles.includes(userPermissions?.roleName as Role);
  } catch (error) {
    console.error('Error checking roles:', error);
    return false;
  }
}

// Server-side permission checking with session
export async function checkPermission(
  requiredPermission: Permission
): Promise<PermissionCheckResult> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        hasPermission: false,
        error: 'User not authenticated',
      };
    }

    return await hasPermission(session.user.id, requiredPermission);
  } catch (error) {
    console.error('Error checking permission with session:', error);
    return {
      hasPermission: false,
      error: 'Error checking permission',
    };
  }
}

export async function checkAnyPermission(
  requiredPermissions: Permission[]
): Promise<PermissionCheckResult> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        hasPermission: false,
        error: 'User not authenticated',
      };
    }

    return await hasAnyPermission(session.user.id, requiredPermissions);
  } catch (error) {
    console.error('Error checking permissions with session:', error);
    return {
      hasPermission: false,
      error: 'Error checking permissions',
    };
  }
}

export async function checkAllPermissions(
  requiredPermissions: Permission[]
): Promise<PermissionCheckResult> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        hasPermission: false,
        error: 'User not authenticated',
      };
    }

    return await hasAllPermissions(session.user.id, requiredPermissions);
  } catch (error) {
    console.error('Error checking permissions with session:', error);
    return {
      hasPermission: false,
      error: 'Error checking permissions',
    };
  }
}

// Role management functions
export async function createRole(name: string, description?: string): Promise<number> {
  const role = await prisma.role.create({
    data: {
      name,
      description,
    },
  });
  return role.id;
}

export async function assignPermissionsToRole(
  roleId: number,
  permissions: Permission[]
): Promise<void> {
  // First, ensure all permissions exist in the database
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { permission },
      update: {},
      create: { permission },
    });
  }

  // Get permission IDs
  const permissionRecords = await prisma.permission.findMany({
    where: { permission: { in: permissions } },
  });

  // Create role-permission relationships
  const rolePermissions = permissionRecords.map(permission => ({
    role_id: roleId,
    permission_id: permission.id,
  }));

  await prisma.rolePermission.createMany({
    data: rolePermissions,
    skipDuplicates: true,
  });
}

export async function assignRoleToUser(userId: string, roleId: number): Promise<void> {
  await prisma.siteUser.update({
    where: { id: userId },
    data: { role_id: roleId },
  });
}

// Utility functions
export function isSuperAdmin(roleName: string): boolean {
  return roleName === ROLES.SUPER_ADMIN;
}

export function isAdmin(roleName: string): boolean {
  return roleName === ROLES.ADMIN || roleName === ROLES.SUPER_ADMIN;
}

export function isManager(roleName: string): boolean {
  return roleName === ROLES.MANAGER || isAdmin(roleName);
}

export function isStaff(roleName: string): boolean {
  return roleName === ROLES.STAFF || isManager(roleName);
}