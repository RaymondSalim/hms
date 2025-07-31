import { NextRequest, NextResponse } from 'next/server';
import { createProtectedAPIHandler } from '@/app/_lib/middleware/rbac';
import { PERMISSIONS } from '@/app/_lib/rbac';
import { getAllPermissions } from '@/app/_lib/seed-rbac';

// GET /api/rbac/permissions - Get all permissions (requires ROLE_READ permission)
export const GET = createProtectedAPIHandler(
  async (req: NextRequest) => {
    try {
      const permissions = await getAllPermissions();
      return NextResponse.json({ permissions });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }
  },
  { permission: PERMISSIONS.ROLE_READ }
);