// app/api/services/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Função auxiliar para descobrir a barbearia do usuário logado
async function getBarbershopId() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) return null;

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
        const decoded = jwt.verify(token, secretKey) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        return user?.barbershopId || null;
    } catch (error) {
        console.error("Erro ao verificar token:", error);
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const barbershopId = await getBarbershopId();

        if (!barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { name, price, description } = body;

        if (!name || price === undefined) {
            return NextResponse.json({ message: 'Nome e preço são obrigatórios.' }, { status: 400 });
        }

        const newService = await prisma.serviceType.create({
            data: {
                name: name,
                price: parseFloat(price),
                description: description || '',
                barbershopId: barbershopId
            }
        });

        return NextResponse.json(newService, { status: 201 });

    } catch (error) {
        console.error("Erro ao cadastrar serviço:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const barbershopId = await getBarbershopId();

        if (!barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const services = await prisma.serviceType.findMany({
            where: { barbershopId: barbershopId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(services, { status: 200 });

    } catch (error) {
        console.error("Erro ao buscar serviços:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}