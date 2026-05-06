// app/api/meu-financeiro/route.ts

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
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        return user;
    } catch (error) {
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        let startStr = searchParams.get('startDate');
        let endStr = searchParams.get('endDate');
        
        const paymentCycle = user.paymentCycle || 'WEEKLY';

        let startDate: Date;
        let endDate: Date;

        // Função para pegar a data atual no fuso horário do Brasil
        const getLocalBrazilDate = () => {
            const d = new Date();
            d.setHours(d.getHours() - 3);
            return d;
        };

        if (startStr && endStr) {
            startDate = new Date(`${startStr}T00:00:00-03:00`);
            endDate = new Date(`${endStr}T23:59:59-03:00`);
        } else {
            // SE NÃO VIER DATA, CALCULA O CICLO AUTOMATICAMENTE
            const today = getLocalBrazilDate();
            const year = today.getFullYear();
            const month = today.getMonth();
            const date = today.getDate();

            if (paymentCycle === 'DAILY') {
                startDate = new Date(year, month, date, 0, 0, 0);
                endDate = new Date(year, month, date, 23, 59, 59);
            } else if (paymentCycle === 'BIWEEKLY') {
                if (date <= 15) {
                    startDate = new Date(year, month, 1, 0, 0, 0);
                    endDate = new Date(year, month, 15, 23, 59, 59);
                } else {
                    startDate = new Date(year, month, 16, 0, 0, 0);
                    endDate = new Date(year, month + 1, 0, 23, 59, 59); // Último dia do mês
                }
            } else if (paymentCycle === 'MONTHLY') {
                startDate = new Date(year, month, 1, 0, 0, 0);
                endDate = new Date(year, month + 1, 0, 23, 59, 59);
            } else { // WEEKLY (Padrão) - Segunda a Domingo
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                startDate = new Date(year, month, diff, 0, 0, 0);
                
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59);
            }
        }

        // 1. Busca os serviços Feitos por ELE no período
        const myLogs = await prisma.serviceLog.findMany({
            where: { 
                userId: user.id, 
                barbershopId: user.barbershopId, 
                status: 'COMPLETED',
                date: { gte: startDate, lte: endDate }
            },
            include: { serviceType: true, client: true },
            orderBy: { date: 'desc' }
        });

        const commissionRate = user.commissionRate || 50;

        let totalRecebido = 0;
        let totalPendente = 0;

        const detailedLogs = myLogs.map(log => {
            const isPlan = log.paymentMethod === 'Plano' || log.paymentMethod === 'PLANO_VIP' || log.paymentMethod === 'Plano VIP';
            const baseValue = isPlan ? Number(log.serviceType?.price || 0) : Number(log.priceCharged);
            const myCut = baseValue * (commissionRate / 100);

            if (log.isCommissionPaid) {
                totalRecebido += myCut;
            } else {
                totalPendente += myCut;
            }

            return {
                id: log.id,
                date: log.date,
                clientName: log.client?.name || 'Cliente Avulso',
                serviceName: log.serviceType?.name || 'Serviço',
                paymentMethod: log.paymentMethod,
                baseValue,
                myCut,
                isCommissionPaid: log.isCommissionPaid
            };
        });

        // 2. Busca as despesas pessoais dele no período
        const myExpenses = await prisma.barberExpense.findMany({
            where: { 
                userId: user.id, 
                barbershopId: user.barbershopId,
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'desc' }
        });

        const totalGasto = myExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        // 3. Busca a configuração de despesas
        let settings = await prisma.barbershopSettings.findUnique({
            where: { barbershopId: user.barbershopId }
        });

        // Formata as datas para a UI entender
        const formatYMD = (d: Date) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        return NextResponse.json({
            resumo: { totalRecebido, totalPendente, totalGasto, lucroReal: totalRecebido - totalGasto },
            logs: detailedLogs,
            expenses: myExpenses,
            cycleDetails: { 
                paymentCycle, 
                appliedStartDate: formatYMD(startDate), 
                appliedEndDate: formatYMD(endDate) 
            },
            settings: { allowBarberExpenses: settings?.allowBarberExpenses || false }
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: 'Erro ao buscar financeiro.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        const { description, amount } = body;

        const expense = await prisma.barberExpense.create({
            data: {
                userId: user.id,
                barbershopId: user.barbershopId,
                description,
                amount: Number(amount)
            }
        });

        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao lançar despesa.' }, { status: 500 });
    }
}