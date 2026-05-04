// app/api/dashboard/stats/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

async function getUserAuth() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return null;

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
        const decoded = jwt.verify(token, secretKey) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        return user;
    } catch (error) {
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const filterBarberId = searchParams.get('barberId');

        // Força o fuso horário do Brasil (-03:00) para não perder nenhum lançamento do dia
        const start = startDate ? new Date(`${startDate}T00:00:00.000-03:00`) : new Date();
        const end = endDate ? new Date(`${endDate}T23:59:59.999-03:00`) : new Date();

        // MÁGICA DA PERMISSÃO: 
        // Se for ADMIN ou tiver a permissão, ele pode ver tudo (finalBarberId fica vazio a não ser que ele filtre no select)
        // Se for BARBER comum, travamos a busca no ID dele (user.id)
        const hasPermission = user.role === 'ADMIN' || user.permissions.includes('view_all_stats') || user.permissions.includes('admin_panel');
        const finalBarberId = hasPermission ? (filterBarberId || undefined) : user.id;

        // Monta o filtro do banco de dados
        const whereClause: any = {
            barbershopId: user.barbershopId,
            date: { gte: start, lte: end }
        };

        if (finalBarberId) {
            whereClause.userId = finalBarberId;
        }

        // 1. Busca os Logs de Serviço
        const logs = await prisma.serviceLog.findMany({
            where: whereClause,
            include: {
                client: { select: { name: true } },
                serviceType: { select: { name: true } },
                user: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        // 2. Cálculos dos Cards
        const totalRevenue = logs.reduce((acc, log) => acc + log.priceCharged, 0);
        const totalServices = logs.length;

        // 3. Novos Clientes no período
        const newClientsCount = await prisma.client.count({
            where: {
                barbershopId: user.barbershopId,
                createdAt: { gte: start, lte: end }
            }
        });

        return NextResponse.json({
            stats: {
                revenue: totalRevenue,
                services: totalServices,
                newClients: newClientsCount
            },
            logs
        }, { status: 200 });

    } catch (error) {
        console.error("Erro no dashboard stats:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}