// app/api/admin/dashboard/route.ts
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
        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

        const now = new Date();
        
        // Limites de Hoje
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        // Limites do Mês
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Fazemos todas as buscas ao mesmo tempo para ser ultra rápido (Promise.all)
        const [todayIncomeResult, monthlyIncomeResult, todayServices, activeTeam] = await Promise.all([
            prisma.financialRecord.aggregate({
                where: { barbershopId, type: 'INCOME', date: { gte: startOfDay, lte: endOfDay } },
                _sum: { amount: true }
            }),
            prisma.financialRecord.aggregate({
                where: { barbershopId, type: 'INCOME', date: { gte: startOfMonth, lte: endOfMonth } },
                _sum: { amount: true }
            }),
            prisma.serviceLog.count({
                where: { barbershopId, date: { gte: startOfDay, lte: endOfDay } }
            }),
            prisma.user.count({
                where: { barbershopId, role: 'BARBER', isActive: true }
            })
        ]);

        return NextResponse.json({
            todayIncome: todayIncomeResult._sum.amount || 0,
            monthlyIncome: monthlyIncomeResult._sum.amount || 0,
            todayServices,
            activeTeam
        }, { status: 200 });

    } catch (error) {
        console.error("Erro dashboard admin:", error);
        return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
    }
}