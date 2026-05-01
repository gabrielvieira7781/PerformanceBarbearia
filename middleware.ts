// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;

    const path = request.nextUrl.pathname;

    const isPublicPath = path === '/login' || path === '/cadastro';

    if (!token) {
        if (!isPublicPath) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    if (token) {
        if (isPublicPath) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    if (token) {
        if (path.startsWith('/admin')) {
            const role = request.cookies.get('user_role')?.value;

            if (role !== 'ADMIN') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/login',
        '/cadastro'
    ]
};