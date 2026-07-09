import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('auth-token');
  if (!authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = request.cookies.get('user-role')?.value;
  if (userRole === 'SUPER_ADMIN' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isPlatformPath =
    pathname === '/' ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/companies') ||
    pathname.startsWith('/audit-log');

  if (userRole && userRole !== 'SUPER_ADMIN' && isPlatformPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
