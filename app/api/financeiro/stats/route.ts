// app/api/financeiro/stats/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

async function getBarbershopId() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
    const decoded = jwt.verify(token, secretKey) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    return user?.barbershopId || null;
}

export async function GET() {
    try {
        const barbershopId = await getBarbershopId();
        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

        // Pega data de hoje (início e fim do dia)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Faturamento Total (Tudo que já entrou)
        const totalIncome = await prisma.financialRecord.aggregate({
            where: { barbershopId, type: 'INCOME' },
            _sum: { amount: true }
        });

        // 2. Faturamento de Hoje
        const todayIncome = await prisma.financialRecord.aggregate({
            where: { 
                barbershopId, 
                type: 'INCOME',
                date: { gte: startOfDay, lte: endOfDay }
            },
            _sum: { amount: true }
        });

        // 3. Despesas Totais
        const totalExpenses = await prisma.financialRecord.aggregate({
            where: { barbershopId, type: 'EXPENSE' },
            _sum: { amount: true }
        });

        // 4. Últimas 10 movimentações para a tabela
        const transactions = await prisma.financialRecord.findMany({
            where: { barbershopId },
            orderBy: { date: 'desc' },
            take: 10
        });

        return NextResponse.json({
            stats: {
                totalBalance: (totalIncome._sum.amount || 0) - (totalExpenses._sum.amount || 0),
                todayIncome: todayIncome._sum.amount || 0,
                totalExpenses: totalExpenses._sum.amount || 0,
            },
            transactions
        }, { status: 200 });

    } catch (error) {
        console.error("Erro stats financeiro:", error);
        return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
    }
}