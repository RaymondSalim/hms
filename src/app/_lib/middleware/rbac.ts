import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { 
  checkPermission, 
  checkAnyPermission, 
  checkAllPermissions,
  Permission,
  ROLES,
  hasRole,
  hasAnyRole
} from '@/app/_lib/rbac';

// Middleware for protecting API routes with permission checks
export async function withPermission(
  handler: (req: NextRequest) => Promise<NextResponse>,
  requiredPermission: Permission
) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const permissionCheck = await checkPermission(requiredPermission);
      
      if (!permissionCheck.hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      return await handler(req);
    } catch (error) {
      console.error('Permission middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export async function withAnyPermission(
  handler: (req: NextRequest) => Promise<NextResponse>,
  requiredPermissions: Permission[]
) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const permissionCheck = await checkAnyPermission(requiredPermissions);
      
      if (!permissionCheck.hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      return await handler(req);
    } catch (error) {
      console.error('Permission middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export async function withAllPermissions(
  handler: (req: NextRequest) => Promise<NextResponse>,
  requiredPermissions: Permission[]
) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const permissionCheck = await checkAllPermissions(requiredPermissions);
      
      if (!permissionCheck.hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      return await handler(req);
    } catch (error) {
      console.error('Permission middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Middleware for protecting API routes with role checks
export async function withRole(
  handler: (req: NextRequest) => Promise<NextResponse>,
  requiredRole: keyof typeof ROLES
) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const hasRequiredRole = await hasRole(session.user.id, ROLES[requiredRole]);
      
      if (!hasRequiredRole) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient role' },
          { status: 403 }
        );
      }

      return await handler(req);
    } catch (error) {
      console.error('Role middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export async function withAnyRole(
  handler: (req: NextRequest) => Promise<NextResponse>,
  requiredRoles: (keyof typeof ROLES)[]
) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const roleValues = requiredRoles.map(role => ROLES[role]);
      const hasRequiredRole = await hasAnyRole(session.user.id, roleValues);
      
      if (!hasRequiredRole) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient role' },
          { status: 403 }
        );
      }

      return await handler(req);
    } catch (error) {
      console.error('Role middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Higher-order function for server actions
export function withServerActionPermission<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  requiredPermission: Permission
) {
  return async (...args: T): Promise<R> => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const permissionCheck = await checkPermission(requiredPermission);
      
      if (!permissionCheck.hasPermission) {
        throw new Error('Forbidden - Insufficient permissions');
      }

      return await action(...args);
    } catch (error) {
      console.error('Server action permission error:', error);
      throw error;
    }
  };
}

export function withServerActionAnyPermission<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  requiredPermissions: Permission[]
) {
  return async (...args: T): Promise<R> => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const permissionCheck = await checkAnyPermission(requiredPermissions);
      
      if (!permissionCheck.hasPermission) {
        throw new Error('Forbidden - Insufficient permissions');
      }

      return await action(...args);
    } catch (error) {
      console.error('Server action permission error:', error);
      throw error;
    }
  };
}

export function withServerActionAllPermissions<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  requiredPermissions: Permission[]
) {
  return async (...args: T): Promise<R> => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const permissionCheck = await checkAllPermissions(requiredPermissions);
      
      if (!permissionCheck.hasPermission) {
        throw new Error('Forbidden - Insufficient permissions');
      }

      return await action(...args);
    } catch (error) {
      console.error('Server action permission error:', error);
      throw error;
    }
  };
}

export function withServerActionRole<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  requiredRole: keyof typeof ROLES
) {
  return async (...args: T): Promise<R> => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const hasRequiredRole = await hasRole(session.user.id, ROLES[requiredRole]);
      
      if (!hasRequiredRole) {
        throw new Error('Forbidden - Insufficient role');
      }

      return await action(...args);
    } catch (error) {
      console.error('Server action role error:', error);
      throw error;
    }
  };
}

export function withServerActionAnyRole<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  requiredRoles: (keyof typeof ROLES)[]
) {
  return async (...args: T): Promise<R> => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const roleValues = requiredRoles.map(role => ROLES[role]);
      const hasRequiredRole = await hasAnyRole(session.user.id, roleValues);
      
      if (!hasRequiredRole) {
        throw new Error('Forbidden - Insufficient role');
      }

      return await action(...args);
    } catch (error) {
      console.error('Server action role error:', error);
      throw error;
    }
  };
}

// Utility function to create protected API handlers
export function createProtectedAPIHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    permission?: Permission;
    anyPermission?: Permission[];
    allPermissions?: Permission[];
    role?: keyof typeof ROLES;
    anyRole?: (keyof typeof ROLES)[];
  }
) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      let hasAccess = false;

      // Check permissions
      if (options.permission) {
        const permissionCheck = await checkPermission(options.permission);
        hasAccess = permissionCheck.hasPermission;
      } else if (options.anyPermission) {
        const permissionCheck = await checkAnyPermission(options.anyPermission);
        hasAccess = permissionCheck.hasPermission;
      } else if (options.allPermissions) {
        const permissionCheck = await checkAllPermissions(options.allPermissions);
        hasAccess = permissionCheck.hasPermission;
      }
      // Check roles
      else if (options.role) {
        hasAccess = await hasRole(session.user.id, ROLES[options.role]);
      } else if (options.anyRole) {
        const roleValues = options.anyRole.map(role => ROLES[role]);
        hasAccess = await hasAnyRole(session.user.id, roleValues);
      }
      // If no protection specified, allow access
      else {
        hasAccess = true;
      }

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      return await handler(req);
    } catch (error) {
      console.error('Protected API handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}