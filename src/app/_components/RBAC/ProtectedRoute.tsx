'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRBAC } from '@/app/_context/RBACContext';
import { Permission, Role } from '@/app/_lib/rbac';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  
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
  
  // Authentication check
  requireAuth?: boolean;
  
  // Invert logic (show when condition is NOT met)
  invert?: boolean;
}

export function ProtectedRoute({
  children,
  fallback = <div>Access Denied</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  permission,
  anyPermission,
  allPermissions,
  role,
  anyRole,
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  requireStaff,
  requireAuth = true,
  invert = false,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const { isLoading, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, isSuperAdmin, isAdmin, isManager, isStaff } = useRBAC();
  const router = useRouter();

  // Show loading fallback while session or permissions are being loaded
  if (status === 'loading' || isLoading) {
    return <>{loadingFallback}</>;
  }

  // Check authentication
  if (requireAuth && status === 'unauthenticated') {
    if (redirectTo) {
      router.push(redirectTo);
      return <>{loadingFallback}</>;
    }
    return <>{fallback}</>;
  }

  let hasAccess = false;

  // Check permission-based access
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermission) {
    hasAccess = hasAnyPermission(anyPermission);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(allPermissions);
  }
  // Check role-based access
  else if (role) {
    hasAccess = hasRole(role);
  } else if (anyRole) {
    hasAccess = hasAnyRole(anyRole);
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

  // Handle access denied
  if (!hasAccess) {
    if (redirectTo) {
      router.push(redirectTo);
      return <>{loadingFallback}</>;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience components for common use cases
export function RequireAuth({ 
  children, 
  fallback = <div>Please log in to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo = '/login'
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
}) {
  return (
    <ProtectedRoute
      requireAuth
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequirePermissionRoute({ 
  permission, 
  children, 
  fallback = <div>You don't have permission to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      permission={permission}
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireAnyPermissionRoute({ 
  permissions, 
  children, 
  fallback = <div>You don't have permission to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      anyPermission={permissions}
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireAllPermissionsRoute({ 
  permissions, 
  children, 
  fallback = <div>You don't have permission to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      allPermissions={permissions}
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireRoleRoute({ 
  role, 
  children, 
  fallback = <div>You don't have the required role to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  role: Role;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      role={role}
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireAnyRoleRoute({ 
  roles, 
  children, 
  fallback = <div>You don't have the required role to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      anyRole={roles}
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireSuperAdminRoute({ 
  children, 
  fallback = <div>You need super admin privileges to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      requireSuperAdmin
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireAdminRoute({ 
  children, 
  fallback = <div>You need admin privileges to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      requireAdmin
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireManagerRoute({ 
  children, 
  fallback = <div>You need manager privileges to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      requireManager
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireStaffRoute({ 
  children, 
  fallback = <div>You need staff privileges to access this page</div>,
  loadingFallback = <div>Loading...</div>,
  redirectTo,
  requireAuth = true
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}) {
  return (
    <ProtectedRoute
      requireStaff
      fallback={fallback}
      loadingFallback={loadingFallback}
      redirectTo={redirectTo}
      requireAuth={requireAuth}
    >
      {children}
    </ProtectedRoute>
  );
}