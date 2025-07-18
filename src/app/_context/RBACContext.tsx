'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PERMISSIONS, 
  ROLES, 
  Permission, 
  Role, 
  UserPermissions,
  getUserPermissions,
  isSuperAdmin,
  isAdmin,
  isManager,
  isStaff
} from '@/app/_lib/rbac';

interface RBACContextType {
  // User permissions state
  userPermissions: UserPermissions | null;
  isLoading: boolean;
  error: string | null;
  
  // Permission checking functions
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  // Role checking functions
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  
  // Role hierarchy functions
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
  
  // Utility functions
  canAccess: (requiredPermission: Permission) => boolean;
  canAccessAny: (requiredPermissions: Permission[]) => boolean;
  canAccessAll: (requiredPermissions: Permission[]) => boolean;
  
  // Refresh permissions
  refreshPermissions: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

interface RBACProviderProps {
  children: ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const { data: session, status } = useSession();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserPermissions = async () => {
    if (!session?.user?.id) {
      setUserPermissions(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const permissions = await getUserPermissions(session.user.id);
      setUserPermissions(permissions);
    } catch (err) {
      console.error('Error loading user permissions:', err);
      setError('Failed to load user permissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'authenticated' && session?.user?.id) {
      loadUserPermissions();
    } else {
      setUserPermissions(null);
      setIsLoading(false);
    }
  }, [session, status]);

  const hasPermission = (permission: Permission): boolean => {
    if (!userPermissions) return false;
    return userPermissions.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false;
    return permissions.some(permission => userPermissions.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false;
    return permissions.every(permission => userPermissions.permissions.includes(permission));
  };

  const hasRole = (role: Role): boolean => {
    if (!userPermissions) return false;
    return userPermissions.roleName === role;
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!userPermissions) return false;
    return roles.includes(userPermissions.roleName as Role);
  };

  const isSuperAdminUser = (): boolean => {
    if (!userPermissions) return false;
    return isSuperAdmin(userPermissions.roleName);
  };

  const isAdminUser = (): boolean => {
    if (!userPermissions) return false;
    return isAdmin(userPermissions.roleName);
  };

  const isManagerUser = (): boolean => {
    if (!userPermissions) return false;
    return isManager(userPermissions.roleName);
  };

  const isStaffUser = (): boolean => {
    if (!userPermissions) return false;
    return isStaff(userPermissions.roleName);
  };

  const canAccess = (requiredPermission: Permission): boolean => {
    return hasPermission(requiredPermission);
  };

  const canAccessAny = (requiredPermissions: Permission[]): boolean => {
    return hasAnyPermission(requiredPermissions);
  };

  const canAccessAll = (requiredPermissions: Permission[]): boolean => {
    return hasAllPermissions(requiredPermissions);
  };

  const refreshPermissions = async (): Promise<void> => {
    await loadUserPermissions();
  };

  const contextValue: RBACContextType = {
    userPermissions,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isSuperAdmin: isSuperAdminUser,
    isAdmin: isAdminUser,
    isManager: isManagerUser,
    isStaff: isStaffUser,
    canAccess,
    canAccessAny,
    canAccessAll,
    refreshPermissions,
  };

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC(): RBACContextType {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within a RBACProvider');
  }
  return context;
}

// Hook for checking if user can access a specific permission
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useRBAC();
  return hasPermission(permission);
}

// Hook for checking if user can access any of the specified permissions
export function useAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = useRBAC();
  return hasAnyPermission(permissions);
}

// Hook for checking if user can access all of the specified permissions
export function useAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = useRBAC();
  return hasAllPermissions(permissions);
}

// Hook for checking if user has a specific role
export function useRole(role: Role): boolean {
  const { hasRole } = useRBAC();
  return hasRole(role);
}

// Hook for checking if user has any of the specified roles
export function useAnyRole(roles: Role[]): boolean {
  const { hasAnyRole } = useRBAC();
  return hasAnyRole(roles);
}