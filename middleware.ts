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
            
            // Lê o array de permissões
            const permsCookie = request.cookies.get('user_permissions')?.value;
            let permissions: string[] = [];
            if (permsCookie) {
                try { permissions = JSON.parse(decodeURIComponent(permsCookie)); } catch (e) {}
            }

            // Se NÃO for ADMIN e NÃO tiver a permissão de painel de admin, é bloqueado!
            if (role !== 'ADMIN' && !permissions.includes('admin_panel')) {
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