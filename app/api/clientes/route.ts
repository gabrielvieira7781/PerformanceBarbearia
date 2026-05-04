// app/api/clientes/route.ts

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

        const clients = await prisma.client.findMany({
            where: { barbershopId },
            include: {
                parent: { select: { id: true, name: true } },
                dependents: { select: { id: true, name: true } },
                plan: { 
                    select: { 
                        id: true, 
                        name: true, 
                        maxCuts: true,
                        services: { select: { id: true, name: true } } // NOVO: Traz os serviços do plano
                    } 
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(clients, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const barbershopId = await getBarbershopId();
        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        const { name, phone, parentId, planId } = body;

        if (!name || (!phone && !parentId)) {
            return NextResponse.json({ message: 'Nome e telefone são obrigatórios.' }, { status: 400 });
        }

        let cleanPhone = '';
        if (phone) {
            cleanPhone = phone.replace(/\D/g, '');
            const existingClient = await prisma.client.findFirst({
                where: { barbershopId, phone: cleanPhone }
            });

            if (existingClient) {
                return NextResponse.json({ 
                    message: `Este WhatsApp já está cadastrado para: ${existingClient.name}` 
                }, { status: 400 });
            }
        }

        const newClient = await prisma.client.create({
            data: {
                name: name.trim(),
                phone: cleanPhone,
                barbershopId,
                parentId: parentId || null,
                planId: planId || null 
            },
            include: {
                parent: { select: { id: true, name: true } },
                dependents: { select: { id: true, name: true } },
                plan: { 
                    select: { 
                        id: true, 
                        name: true, 
                        maxCuts: true,
                        services: { select: { id: true, name: true } }
                    } 
                }
            }
        });

        return NextResponse.json(newClient, { status: 201 });
    } catch (error) {
        console.error("Erro ao cadastrar cliente:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}