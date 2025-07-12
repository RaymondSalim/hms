import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_VERSION || 'development',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
    branch: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || 'unknown',
  });
}