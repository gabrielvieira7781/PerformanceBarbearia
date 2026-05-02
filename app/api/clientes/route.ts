// app/api/clientes/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        
        if (!token) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
        const decoded = jwt.verify(token, secretKey) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user || !user.barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        // Busca todos os clientes cadastrados na barbearia atual
        const clients = await prisma.client.findMany({
            where: { barbershopId: user.barbershopId },
            select: {
                id: true,
                name: true,
                phone: true
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(clients, { status: 200 });

    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}