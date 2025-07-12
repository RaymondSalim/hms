# Role-Based Access Control (RBAC) Implementation

This document explains how to use the comprehensive RBAC system implemented in this Next.js application.

## Overview

The RBAC system provides:
- **Permission-based authorization** with granular control
- **Role-based access** with predefined roles
- **Middleware protection** for routes
- **Component-level protection** for UI elements
- **Server action protection** for backend operations
- **API endpoint protection** for external access

## Database Schema

The system uses the following Prisma models:
- `Role` - Defines user roles (Super Admin, Admin, Manager, Staff, Viewer)
- `Permission` - Defines granular permissions (e.g., `user:create`, `booking:read`)
- `RolePermission` - Junction table linking roles to permissions
- `SiteUser` - User model with role assignment

## Quick Start

### 1. Seed the Database

First, populate the database with initial roles and permissions:

```bash
npm run seed-rbac
```

This creates:
- 5 roles: Super Admin, Admin, Manager, Staff, Viewer
- 28 permissions covering all major operations
- Role-permission assignments

### 2. Assign Roles to Users

Users can be assigned roles through the user management interface or directly in the database.

## Core Components

### 1. RBAC Utilities (`src/app/_lib/rbac.ts`)

Core functions for permission checking:

```typescript
import { 
  hasPermission, 
  hasRole, 
  requirePermission, 
  requireRole,
  getCurrentUserWithPermissions 
} from '@/app/_lib/rbac';

// Check if user has a specific permission
const canCreateUser = await hasPermission('user:create');

// Check if user has a specific role
const isAdmin = await hasRole('Admin');

// Require permission (throws error if not authorized)
const user = await requirePermission('user:create');

// Get current user with role and permissions
const userWithPermissions = await getCurrentUserWithPermissions();
```

### 2. Permission Constants

Predefined permission constants for consistency:

```typescript
import { PERMISSIONS } from '@/app/_lib/rbac';

// User management
PERMISSIONS.USER_CREATE  // "user:create"
PERMISSIONS.USER_READ    // "user:read"
PERMISSIONS.USER_UPDATE  // "user:update"
PERMISSIONS.USER_DELETE  // "user:delete"

// Booking management
PERMISSIONS.BOOKING_CREATE  // "booking:create"
PERMISSIONS.BOOKING_READ    // "booking:read"
PERMISSIONS.BOOKING_UPDATE  // "booking:update"
PERMISSIONS.BOOKING_DELETE  // "booking:delete"

// And many more...
```

### 3. Role Constants

Predefined role constants:

```typescript
import { ROLES } from '@/app/_lib/rbac';

ROLES.SUPER_ADMIN  // "Super Admin"
ROLES.ADMIN        // "Admin"
ROLES.MANAGER      // "Manager"
ROLES.STAFF        // "Staff"
ROLES.VIEWER       // "Viewer"
```

## Usage Examples

### 1. Protecting Server Actions

Use the RBAC action wrappers to protect server actions:

```typescript
import { withUserCreate, withUserUpdate, withUserDelete } from '@/app/_lib/rbac-actions';

// Protect user creation
export const createUserAction = withUserCreate(async (userData) => {
  // Your user creation logic here
  return await createUser(userData);
});

// Protect user updates
export const updateUserAction = withUserUpdate(async (id, userData) => {
  // Your user update logic here
  return await updateUser(id, userData);
});

// Protect user deletion
export const deleteUserAction = withUserDelete(async (id) => {
  // Your user deletion logic here
  return await deleteUser(id);
});
```

### 2. Protecting UI Components

Use the ProtectedComponent to conditionally render UI elements:

```typescript
import { 
  ProtectedComponent, 
  RequirePermission, 
  RequireRole,
  CanManageUsers,
  IsAdmin 
} from '@/app/_components/auth/ProtectedComponent';

// Basic permission check
<RequirePermission permission="user:create">
  <button>Create User</button>
</RequirePermission>

// Role-based check
<RequireRole role="Admin">
  <AdminPanel />
</RequireRole>

// Multiple permissions (any)
<ProtectedComponent permissions={['user:create', 'user:update']}>
  <UserManagementPanel />
</ProtectedComponent>

// Multiple permissions (all)
<ProtectedComponent permissions={['user:create', 'user:update']} requireAll={true}>
  <FullUserManagementPanel />
</ProtectedComponent>

// Pre-built components
<CanManageUsers>
  <UserManagementPanel />
</CanManageUsers>

<IsAdmin>
  <AdminDashboard />
</IsAdmin>
```

### 3. Route Protection with Middleware

The middleware automatically protects routes based on authentication:

```typescript
// Routes are automatically protected based on the middleware configuration
// in src/middleware.ts
```

### 4. API Endpoint Protection

Protect API endpoints using the RBAC utilities:

```typescript
import { requirePermission } from '@/app/_lib/rbac';

export async function POST(request: NextRequest) {
  try {
    // Require specific permission
    await requirePermission('user:create');
    
    // Your API logic here
    const data = await request.json();
    const result = await createUser(data);
    
    return NextResponse.json({ success: result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Permission denied' },
      { status: 403 }
    );
  }
}
```

## Role Hierarchy

### Super Admin
- **All permissions** including role management
- Can manage all aspects of the system
- Can assign roles to users

### Admin
- **Most permissions** except role management
- Can manage users, bookings, payments, rooms, reports
- Cannot create or modify roles

### Manager
- **Booking, payment, room, and report permissions**
- Can manage bookings and payments
- Can view reports
- Cannot manage users or roles

### Staff
- **Limited permissions**
- Can read and update bookings
- Can read payments and create new payments
- Can read rooms and reports
- Cannot delete or manage users

### Viewer
- **Read-only permissions**
- Can view all data but cannot modify anything
- Perfect for auditors or observers

## Permission Structure

Permissions follow the format: `resource:action`

### Resources
- `user` - User management
- `role` - Role management
- `booking` - Booking management
- `room` - Room management
- `payment` - Payment management
- `report` - Report management
- `settings` - System settings

### Actions
- `create` - Create new records
- `read` - View records
- `update` - Modify existing records
- `delete` - Remove records

## Best Practices

### 1. Use Permission Constants
Always use the predefined permission constants instead of hardcoded strings:

```typescript
// ✅ Good
import { PERMISSIONS } from '@/app/_lib/rbac';
await requirePermission(PERMISSIONS.USER_CREATE);

// ❌ Bad
await requirePermission('user:create');
```

### 2. Use Pre-built Components
Use the pre-built protection components when possible:

```typescript
// ✅ Good
<CanManageUsers>
  <UserManagementPanel />
</CanManageUsers>

// ❌ Less ideal
<RequirePermission permission={PERMISSIONS.USER_CREATE}>
  <UserManagementPanel />
</RequirePermission>
```

### 3. Use Action Wrappers
Wrap server actions with appropriate permission checks:

```typescript
// ✅ Good
export const createUserAction = withUserCreate(async (userData) => {
  // Your logic here
});

// ❌ Less secure
export async function createUserAction(userData) {
  // Manual permission checking required
  // Your logic here
}
```

### 4. Graceful Fallbacks
Always provide fallback content for protected components:

```typescript
<RequirePermission permission="user:create">
  <CreateUserForm />
  <CreateUserButton />
</RequirePermission>
```

## Error Handling

The RBAC system throws descriptive errors when permissions are denied:

```typescript
try {
  await requirePermission('user:create');
} catch (error) {
  // Error message: "Permission denied: user:create"
  console.error(error.message);
}
```

## Testing

### Unit Testing RBAC Functions

```typescript
import { hasPermission, hasRole } from '@/app/_lib/rbac';

// Mock the auth and database calls
jest.mock('@/app/_lib/auth');
jest.mock('@/app/_lib/primsa');

describe('RBAC Functions', () => {
  it('should check permissions correctly', async () => {
    // Test implementation
  });
});
```

### Integration Testing

```typescript
// Test protected routes
describe('Protected Routes', () => {
  it('should deny access without proper permissions', async () => {
    // Test implementation
  });
});
```

## Migration from Old System

If you're migrating from the old role-based system:

1. **Update existing actions** to use the new RBAC wrappers
2. **Replace hardcoded role checks** with permission checks
3. **Update UI components** to use ProtectedComponent
4. **Test thoroughly** to ensure all access patterns work correctly

## Troubleshooting

### Common Issues

1. **Permission denied errors**
   - Check if the user has the correct role assigned
   - Verify the role has the required permissions
   - Check the permission string format

2. **Component not rendering**
   - Verify the user is authenticated
   - Check if the user has the required permissions
   - Ensure the permission constants are correct

3. **Server action failures**
   - Check if the action is properly wrapped with RBAC
   - Verify the user's session is valid
   - Check database connectivity

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG_RBAC=true
```

This will log permission checks and role assignments for debugging.

## Security Considerations

1. **Always verify permissions server-side** - Client-side checks are for UX only
2. **Use HTTPS** in production to protect authentication tokens
3. **Regularly audit** role assignments and permissions
4. **Implement rate limiting** on permission check endpoints
5. **Log security events** for monitoring and auditing

## Future Enhancements

Potential improvements to consider:

1. **Dynamic permissions** - Allow runtime permission creation
2. **Permission inheritance** - Hierarchical permission structures
3. **Time-based permissions** - Temporary access grants
4. **Audit logging** - Track all permission checks and changes
5. **Permission groups** - Group related permissions together
6. **Multi-tenant support** - Organization-level permission isolation