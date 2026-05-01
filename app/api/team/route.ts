// app/api/team/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

async function getBarbershopId() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return null;
        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
        const decoded = jwt.verify(token, secretKey) as { userId: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        return user?.barbershopId || null;
    } catch (error) {
        return null;
    }
}

export async function GET() {
    try {
        const barbershopId = await getBarbershopId();
        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const team = await prisma.user.findMany({
            where: { barbershopId: barbershopId, role: 'BARBER' },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(team, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const barbershopId = await getBarbershopId();
        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ message: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
        }

        // Normaliza o e-mail: remove espaços vazios e joga para minúsculo
        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) return NextResponse.json({ message: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newBarber = await prisma.user.create({
            data: {
                name: name,
                email: normalizedEmail,
                password: hashedPassword,
                role: 'BARBER',
                isVerified: true,
                isActive: true,
                barbershopId: barbershopId
            },
            select: { id: true, name: true, email: true, isActive: true }
        });

        return NextResponse.json(newBarber, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}