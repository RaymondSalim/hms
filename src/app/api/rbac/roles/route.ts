import { NextRequest, NextResponse } from 'next/server';
import { createProtectedAPIHandler } from '@/app/_lib/middleware/rbac';
import { PERMISSIONS, ROLES } from '@/app/_lib/rbac';
import { getAllRoles, createCustomRole, updateRolePermissions } from '@/app/_lib/seed-rbac';

// GET /api/rbac/roles - Get all roles (requires ROLE_READ permission)
export const GET = createProtectedAPIHandler(
  async (req: NextRequest) => {
    try {
      const roles = await getAllRoles();
      return NextResponse.json({ roles });
    } catch (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      );
    }
  },
  { permission: PERMISSIONS.ROLE_READ }
);

// POST /api/rbac/roles - Create a new role (requires ROLE_CREATE permission)
export const POST = createProtectedAPIHandler(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { name, description, permissions } = body;

      if (!name || !permissions || !Array.isArray(permissions)) {
        return NextResponse.json(
          { error: 'Invalid request body. Name and permissions array are required.' },
          { status: 400 }
        );
      }

      const role = await createCustomRole(name, description || '', permissions);
      return NextResponse.json({ role }, { status: 201 });
    } catch (error) {
      console.error('Error creating role:', error);
      return NextResponse.json(
        { error: 'Failed to create role' },
        { status: 500 }
      );
    }
  },
  { permission: PERMISSIONS.ROLE_CREATE }
);