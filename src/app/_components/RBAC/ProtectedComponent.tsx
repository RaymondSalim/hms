'use client';

import React, { ReactNode } from 'react';
import { useRBAC, usePermission, useAnyPermission, useAllPermissions, useRole, useAnyRole } from '@/app/_context/RBACContext';
import { Permission, Role } from '@/app/_lib/rbac';

interface ProtectedComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  
  // Permission-based protection
  permission?: Permission;
  anyPermission?: Permission[];
  allPermissions?: Permission[];
  
  // Role-based protection
  role?: Role;
  anyRole?: Role[];
  
  // Role hierarchy protection
  requireSuperAdmin?: boolean;
  requireAdmin?: boolean;
  requireManager?: boolean;
  requireStaff?: boolean;
  
  // Invert logic (show when condition is NOT met)
  invert?: boolean;
}

export function ProtectedComponent({
  children,
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  permission,
  anyPermission,
  allPermissions,
  role,
  anyRole,
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  requireStaff,
  invert = false,
}: ProtectedComponentProps) {
  const { isLoading, isSuperAdmin, isAdmin, isManager, isStaff } = useRBAC();
  
  // Show loading fallback while permissions are being loaded
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  let hasAccess = false;

  // Check permission-based access
  if (permission) {
    hasAccess = usePermission(permission);
  } else if (anyPermission) {
    hasAccess = useAnyPermission(anyPermission);
  } else if (allPermissions) {
    hasAccess = useAllPermissions(allPermissions);
  }
  // Check role-based access
  else if (role) {
    hasAccess = useRole(role);
  } else if (anyRole) {
    hasAccess = useAnyRole(anyRole);
  }
  // Check role hierarchy access
  else if (requireSuperAdmin) {
    hasAccess = isSuperAdmin();
  } else if (requireAdmin) {
    hasAccess = isAdmin();
  } else if (requireManager) {
    hasAccess = isManager();
  } else if (requireStaff) {
    hasAccess = isStaff();
  }
  // If no protection specified, allow access
  else {
    hasAccess = true;
  }

  // Apply invert logic if specified
  if (invert) {
    hasAccess = !hasAccess;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common use cases
export function RequirePermission({ 
  permission, 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      permission={permission}
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireAnyPermission({ 
  permissions, 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      anyPermission={permissions}
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireAllPermissions({ 
  permissions, 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      allPermissions={permissions}
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireRole({ 
  role, 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  role: Role;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      role={role}
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireAnyRole({ 
  roles, 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      anyRole={roles}
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireSuperAdmin({ 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      requireSuperAdmin
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireAdmin({ 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      requireAdmin
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireManager({ 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      requireManager
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}

export function RequireStaff({ 
  children, 
  fallback = null,
  loadingFallback = <div>Loading...</div>,
  invert = false 
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  invert?: boolean;
}) {
  return (
    <ProtectedComponent
      requireStaff
      fallback={fallback}
      loadingFallback={loadingFallback}
      invert={invert}
    >
      {children}
    </ProtectedComponent>
  );
}