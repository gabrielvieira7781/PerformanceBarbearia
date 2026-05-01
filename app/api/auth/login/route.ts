// app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Remove espaços invisíveis e ignora maiúsculas/minúsculas na busca do banco
        const user = await prisma.user.findFirst({
            where: { 
                email: {
                    equals: email.trim(),
                    mode: 'insensitive'
                }
            }
        });

        if (!user) {
            return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
        }

        // NOVO: Bloqueia se o dono da barbearia inativou o funcionário
        if (!user.isActive) {
            return NextResponse.json({ message: 'Seu acesso foi desativado pelo administrador.' }, { status: 403 });
        }

        if (!user.isVerified) {
            return NextResponse.json({ message: 'Você precisa verificar seu e-mail primeiro.' }, { status: 403 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
        }

        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';

        const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '7d' });

        (await cookies()).set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        (await cookies()).set('user_role', user.role, {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        return NextResponse.json({ message: 'Login realizado com sucesso.', role: user.role }, { status: 200 });

    } catch (error) {
        console.error("Erro no login:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}