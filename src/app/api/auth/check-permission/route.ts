import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/app/_lib/rbac';

export async function POST(request: NextRequest) {
  try {
    const { permission } = await request.json();

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission is required' },
        { status: 400 }
      );
    }

    const hasPerm = await hasPermission(permission);

    if (hasPerm) {
      return NextResponse.json({ hasPermission: true });
    } else {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}