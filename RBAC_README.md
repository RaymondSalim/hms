# Role-Based Access Control (RBAC) System

This document provides a comprehensive guide to the Role-Based Access Control system implemented in your Next.js application.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Core Concepts](#core-concepts)
4. [Usage Examples](#usage-examples)
5. [API Reference](#api-reference)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

The RBAC system provides fine-grained access control for your application through:

- **Roles**: Predefined user categories (Super Admin, Admin, Manager, Staff, User)
- **Permissions**: Granular access rights for specific actions
- **Role Hierarchy**: Automatic permission inheritance
- **Component Protection**: React components that show/hide based on permissions
- **Route Protection**: Page-level access control
- **API Protection**: Server-side permission validation

## Setup

### 1. Database Setup

The RBAC system uses your existing Prisma schema with the following models:
- `Role`: User roles
- `Permission`: Available permissions
- `RolePermission`: Many-to-many relationship between roles and permissions
- `SiteUser`: Users with role assignments

### 2. Seed the Database

Run the RBAC seeder to create default roles and permissions:

```typescript
import { seedRBAC } from '@/app/_lib/seed-rbac';

// In your seed script or development setup
await seedRBAC();
```

### 3. Provider Setup

The RBAC provider is already configured in your `layout.tsx`:

```tsx
import { RBACProvider } from '@/app/_context/RBACContext';

export default function RootLayout({ children }) {
  return (
    <SessionProvider session={session}>
      <RBACProvider>
        {children}
      </RBACProvider>
    </SessionProvider>
  );
}
```

## Core Concepts

### Permissions

Permissions are granular access rights defined as constants:

```typescript
import { PERMISSIONS } from '@/app/_lib/rbac';

// Examples
PERMISSIONS.USER_CREATE    // 'user:create'
PERMISSIONS.BOOKING_READ   // 'booking:read'
PERMISSIONS.PAYMENT_APPROVE // 'payment:approve'
```

### Roles

Predefined roles with hierarchical permissions:

```typescript
import { ROLES } from '@/app/_lib/rbac';

ROLES.SUPER_ADMIN  // Full access
ROLES.ADMIN        // Administrative access
ROLES.MANAGER      // Management access
ROLES.STAFF        // Staff access
ROLES.USER         // Basic user access
```

### Role Hierarchy

Roles inherit permissions from higher levels:
- Super Admin > Admin > Manager > Staff > User

## Usage Examples

### 1. Component-Level Protection

#### Single Permission Check

```tsx
import { RequirePermission, PERMISSIONS } from '@/app/_components/RBAC';

function UserManagement() {
  return (
    <div>
      <h1>User Management</h1>
      
      <RequirePermission permission={PERMISSIONS.USER_CREATE}>
        <button>Create New User</button>
      </RequirePermission>
      
      <RequirePermission permission={PERMISSIONS.USER_READ}>
        <UserList />
      </RequirePermission>
    </div>
  );
}
```

#### Multiple Permissions Check

```tsx
import { RequireAnyPermission, RequireAllPermissions } from '@/app/_components/RBAC';

// Show if user has ANY of these permissions
<RequireAnyPermission permissions={[
  PERMISSIONS.BOOKING_CREATE,
  PERMISSIONS.BOOKING_UPDATE,
  PERMISSIONS.BOOKING_DELETE
]}>
  <BookingManagementPanel />
</RequireAnyPermission>

// Show if user has ALL of these permissions
<RequireAllPermissions permissions={[
  PERMISSIONS.USER_READ,
  PERMISSIONS.USER_UPDATE
]}>
  <UserEditPanel />
</RequireAllPermissions>
```

#### Role-Based Protection

```tsx
import { RequireRole, RequireAdmin, ROLES } from '@/app/_components/RBAC';

// Specific role check
<RequireRole role={ROLES.ADMIN}>
  <AdminPanel />
</RequireRole>

// Role hierarchy check (Admin or Super Admin)
<RequireAdmin>
  <SystemSettings />
</RequireAdmin>
```

### 2. Hook-Based Permission Checking

```tsx
import { usePermission, useAnyPermission, useRole } from '@/app/_components/RBAC';

function Dashboard() {
  const canCreateUsers = usePermission(PERMISSIONS.USER_CREATE);
  const canManageBookings = useAnyPermission([
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_UPDATE
  ]);
  const isAdmin = useRole(ROLES.ADMIN);

  return (
    <div>
      {canCreateUsers && <CreateUserButton />}
      {canManageBookings && <BookingManagementLink />}
      {isAdmin && <AdminLink />}
    </div>
  );
}
```

### 3. Route Protection

```tsx
import { RequirePermissionRoute, RequireAdminRoute } from '@/app/_components/RBAC';

// Protect entire pages
export default function AdminPage() {
  return (
    <RequireAdminRoute>
      <div>Admin-only content</div>
    </RequireAdminRoute>
  );
}

// Or with custom fallback
export default function UserManagementPage() {
  return (
    <RequirePermissionRoute 
      permission={PERMISSIONS.USER_READ}
      fallback={<AccessDenied />}
      redirectTo="/dashboard"
    >
      <UserManagement />
    </RequirePermissionRoute>
  );
}
```

### 4. API Route Protection

```typescript
import { createProtectedAPIHandler } from '@/app/_lib/middleware/rbac';
import { PERMISSIONS } from '@/app/_lib/rbac';

// GET endpoint with permission check
export const GET = createProtectedAPIHandler(
  async (req: NextRequest) => {
    // Your API logic here
    return NextResponse.json({ data: 'protected data' });
  },
  { permission: PERMISSIONS.USER_READ }
);

// POST endpoint with multiple permission options
export const POST = createProtectedAPIHandler(
  async (req: NextRequest) => {
    // Your API logic here
    return NextResponse.json({ success: true });
  },
  { anyPermission: [PERMISSIONS.USER_CREATE, PERMISSIONS.USER_UPDATE] }
);
```

### 5. Server Actions Protection

```typescript
import { withServerActionPermission } from '@/app/_lib/middleware/rbac';
import { PERMISSIONS } from '@/app/_lib/rbac';

// Protect server actions
export const createUser = withServerActionPermission(
  async (userData: UserData) => {
    // Your server action logic
    return await prisma.siteUser.create({ data: userData });
  },
  PERMISSIONS.USER_CREATE
);

export const updateUser = withServerActionPermission(
  async (userId: string, userData: Partial<UserData>) => {
    // Your server action logic
    return await prisma.siteUser.update({
      where: { id: userId },
      data: userData
    });
  },
  PERMISSIONS.USER_UPDATE
);
```

## API Reference

### Core RBAC Functions

```typescript
import { 
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions
} from '@/app/_lib/rbac';

// Get user permissions
const userPerms = await getUserPermissions(userId);

// Check single permission
const canCreate = await hasPermission(userId, PERMISSIONS.USER_CREATE);

// Check multiple permissions
const canManage = await hasAnyPermission(userId, [
  PERMISSIONS.BOOKING_CREATE,
  PERMISSIONS.BOOKING_UPDATE
]);

// Server-side with session
const result = await checkPermission(PERMISSIONS.USER_READ);
```

### React Hooks

```typescript
import { 
  useRBAC,
  usePermission,
  useAnyPermission,
  useAllPermissions,
  useRole,
  useAnyRole
} from '@/app/_context/RBACContext';

// Main RBAC hook
const { 
  userPermissions, 
  isLoading, 
  hasPermission, 
  hasRole,
  refreshPermissions 
} = useRBAC();

// Individual permission hooks
const canCreate = usePermission(PERMISSIONS.USER_CREATE);
const canManage = useAnyPermission([PERMISSIONS.BOOKING_CREATE, PERMISSIONS.BOOKING_UPDATE]);
const isAdmin = useRole(ROLES.ADMIN);
```

### Protected Components

```typescript
import {
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
  RequireRole,
  RequireAdmin,
  RequireManager,
  RequireStaff
} from '@/app/_components/RBAC';

// All components accept these props:
interface ProtectedComponentProps {
  children: ReactNode;
  fallback?: ReactNode;        // What to show if access denied
  loadingFallback?: ReactNode; // What to show while loading
  invert?: boolean;            // Invert the logic
}
```

### Route Protection

```typescript
import {
  RequireAuth,
  RequirePermissionRoute,
  RequireRoleRoute,
  RequireAdminRoute
} from '@/app/_components/RBAC';

// All route components accept these props:
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;         // Redirect instead of showing fallback
  requireAuth?: boolean;       // Require authentication
}
```

## Best Practices

### 1. Permission Naming

Use consistent naming patterns:
- `resource:action` (e.g., `user:create`, `booking:read`)
- Group related permissions (e.g., `user:*`, `booking:*`)

### 2. Component Organization

```tsx
// Good: Separate concerns
function UserManagement() {
  return (
    <div>
      <RequirePermission permission={PERMISSIONS.USER_READ}>
        <UserList />
      </RequirePermission>
      
      <RequirePermission permission={PERMISSIONS.USER_CREATE}>
        <CreateUserForm />
      </RequirePermission>
    </div>
  );
}

// Avoid: Overly complex conditions
function UserManagement() {
  const { hasPermission } = useRBAC();
  
  return (
    <div>
      {hasPermission(PERMISSIONS.USER_READ) && hasPermission(PERMISSIONS.USER_CREATE) && (
        <ComplexComponent />
      )}
    </div>
  );
}
```

### 3. Error Handling

```tsx
// Provide meaningful fallbacks
<RequirePermission 
  permission={PERMISSIONS.USER_CREATE}
  fallback={
    <div className="bg-yellow-50 p-4 rounded">
      <p>You need permission to create users. Contact your administrator.</p>
    </div>
  }
>
  <CreateUserForm />
</RequirePermission>
```

### 4. Performance Considerations

- Use `usePermission` hooks for simple checks
- Use `RequirePermission` components for conditional rendering
- Cache permission results when possible
- Use `refreshPermissions()` when user roles change

### 5. Security

- Always validate permissions on both client and server
- Use server-side checks for critical operations
- Don't rely solely on client-side permission hiding
- Log permission failures for security monitoring

## Troubleshooting

### Common Issues

1. **Permissions not loading**
   - Check if user has a role assigned
   - Verify RBAC provider is wrapping your app
   - Check browser console for errors

2. **Components not showing/hiding**
   - Verify permission names match exactly
   - Check if user has the required role
   - Use `refreshPermissions()` to reload

3. **API routes returning 403**
   - Verify user is authenticated
   - Check if user has required permissions
   - Ensure middleware is applied correctly

### Debug Tools

```tsx
// Add this component to debug permissions
function PermissionDebugger() {
  const { userPermissions, isLoading } = useRBAC();
  
  if (isLoading) return <div>Loading permissions...</div>;
  
  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3>Debug Info</h3>
      <pre>{JSON.stringify(userPermissions, null, 2)}</pre>
    </div>
  );
}
```

### Database Queries

```sql
-- Check user roles and permissions
SELECT 
  u.id,
  u.name,
  r.name as role_name,
  p.permission
FROM siteusers u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN rolepermissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = 'your-user-id';
```

## Migration Guide

If you're upgrading from a simpler permission system:

1. **Run the seeder** to create default roles and permissions
2. **Assign roles** to existing users
3. **Replace simple role checks** with permission-based checks
4. **Update API routes** to use the new middleware
5. **Test thoroughly** with different user roles

## Support

For issues or questions about the RBAC system:

1. Check the troubleshooting section above
2. Review the example components in `src/app/_components/RBAC/RBACExample.tsx`
3. Examine the API routes in `src/app/api/rbac/`
4. Check the database schema and seeder functions

The RBAC system is designed to be flexible and extensible. You can easily add new permissions, roles, and custom logic to fit your specific requirements.