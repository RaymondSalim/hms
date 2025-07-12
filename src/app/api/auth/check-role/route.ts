import { NextRequest, NextResponse } from 'next/server';
import { hasRoleByName } from '@/app/_lib/rbac';

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    const hasRole = await hasRoleByName(role);

    if (hasRole) {
      return NextResponse.json({ hasRole: true });
    } else {
      return NextResponse.json(
        { error: 'Role access denied' },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error('Error checking role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}