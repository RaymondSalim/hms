import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes and their required permissions
const protectedRoutes = {
  '/settings': ['settings:read'],
  '/settings/users': ['user:read'],
  '/settings/roles': ['role:read'],
  '/bookings': ['booking:read'],
  '/rooms': ['room:read'],
  '/payments': ['payment:read'],
  '/reports': ['report:read'],
  '/financials': ['payment:read'],
  '/schedule': ['booking:read'],
  '/residents': ['booking:read'],
  '/bills': ['payment:read'],
  '/deposits': ['payment:read'],
  '/addons': ['room:read'],
  '/data-center': ['settings:read'],
} as const;

// Routes that require authentication but no specific permissions
const authOnlyRoutes = [
  '/dashboard',
  '/profile',
];

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/reset-request',
  '/reset-password',
  '/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get the token from the request
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET 
  });

  // If no token and route requires authentication, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if route requires specific permissions
  const routeEntry = Object.entries(protectedRoutes).find(([route]) => 
    pathname.startsWith(route)
  );
  const requiredPermissions = routeEntry?.[1];

  if (requiredPermissions) {
    // For now, we'll allow access if authenticated
    // In a full implementation, you'd check the user's permissions here
    // This would require a database call to get user permissions
    // For now, we'll implement this in the individual route handlers
    return NextResponse.next();
  }

  // Check if route requires authentication only
  if (authOnlyRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow access to all other routes if authenticated
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};