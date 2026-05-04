// app/api/planos/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

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

        const planos = await prisma.subscriptionPlan.findMany({
            where: { barbershopId },
            include: { services: true }, 
            orderBy: { price: 'asc' }
        });

        return NextResponse.json(planos, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const barbershopId = await getBarbershopId();
        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        // CORREÇÃO: serviceIds extraído corretamente aqui!
        const { name, price, maxCuts, billingCycle, serviceIds = [] } = body;

        if (!name || price === undefined || maxCuts === undefined) {
            return NextResponse.json({ message: 'Nome, preço e limite são obrigatórios.' }, { status: 400 });
        }

        const existingPlan = await prisma.subscriptionPlan.findFirst({
            where: {
                barbershopId,
                name: { equals: name.trim(), mode: 'insensitive' }
            }
        });

        if (existingPlan) {
            return NextResponse.json({ message: `O plano "${existingPlan.name}" já existe.` }, { status: 400 });
        }

        const newPlan = await prisma.subscriptionPlan.create({
            data: {
                name: name.trim(),
                price: Number(price),
                maxCuts: Number(maxCuts),
                billingCycle: billingCycle || "MONTHLY",
                barbershopId,
                services: {
                    connect: serviceIds.map((id: string) => ({ id })) // Conecta os serviços
                }
            },
            include: { services: true }
        });

        return NextResponse.json(newPlan, { status: 201 });
    } catch (error) {
        console.error("Erro ao criar plano:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}