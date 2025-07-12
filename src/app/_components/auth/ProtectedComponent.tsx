'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PERMISSIONS, ROLES } from '@/app/_lib/rbac';

interface ProtectedComponentProps {
  children: ReactNode;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions/roles. If false, user must have ANY.
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export default function ProtectedComponent({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  loadingFallback = <div>Loading...</div>,
}: ProtectedComponentProps) {
  const { data: session, status } = useSession();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (status === 'loading') return;

      if (!session?.user) {
        setHasAccess(false);
        return;
      }

      // If no permissions or roles specified, allow access
      if (permissions.length === 0 && roles.length === 0) {
        setHasAccess(true);
        return;
      }

      try {
        // Check permissions
        if (permissions.length > 0) {
          const permissionChecks = await Promise.all(
            permissions.map(async (permission) => {
              const response = await fetch('/api/auth/check-permission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permission }),
              });
              return response.ok;
            })
          );

          const hasPermission = requireAll
            ? permissionChecks.every(Boolean)
            : permissionChecks.some(Boolean);

          if (!hasPermission) {
            setHasAccess(false);
            return;
          }
        }

        // Check roles
        if (roles.length > 0) {
          const roleChecks = await Promise.all(
            roles.map(async (role) => {
              const response = await fetch('/api/auth/check-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
              });
              return response.ok;
            })
          );

          const hasRole = requireAll
            ? roleChecks.every(Boolean)
            : roleChecks.some(Boolean);

          if (!hasRole) {
            setHasAccess(false);
            return;
          }
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [session, status, permissions, roles, requireAll]);

  if (status === 'loading' || hasAccess === null) {
    return <>{loadingFallback}</>;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience components for common permission checks
export function RequirePermission({ 
  permission, 
  children, 
  fallback 
}: { 
  permission: string; 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <ProtectedComponent permissions={[permission]} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

export function RequireRole({ 
  role, 
  children, 
  fallback 
}: { 
  role: string; 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <ProtectedComponent roles={[role]} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

export function RequireAnyPermission({ 
  permissions, 
  children, 
  fallback 
}: { 
  permissions: string[]; 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <ProtectedComponent permissions={permissions} requireAll={false} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

export function RequireAllPermissions({ 
  permissions, 
  children, 
  fallback 
}: { 
  permissions: string[]; 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <ProtectedComponent permissions={permissions} requireAll={true} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

// Pre-built components for common permission checks
export function CanManageUsers({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequirePermission permission={PERMISSIONS.USER_CREATE} fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

export function CanViewUsers({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequirePermission permission={PERMISSIONS.USER_READ} fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

export function CanManageBookings({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequirePermission permission={PERMISSIONS.BOOKING_CREATE} fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

export function CanViewBookings({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequirePermission permission={PERMISSIONS.BOOKING_READ} fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

export function IsAdmin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequireRole role={ROLES.ADMIN} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

export function IsSuperAdmin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RequireRole role={ROLES.SUPER_ADMIN} fallback={fallback}>
      {children}
    </RequireRole>
  );
}