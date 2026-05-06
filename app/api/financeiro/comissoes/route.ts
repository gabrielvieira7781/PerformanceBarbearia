// app/api/financeiro/comissoes/route.ts

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

export async function GET() {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId || (user.role !== 'ADMIN' && !user.permissions.includes('admin_panel'))) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const barbers = await prisma.user.findMany({
            where: { barbershopId: user.barbershopId, role: 'BARBER', isActive: true },
            select: { id: true, name: true, commissionRate: true, paymentCycle: true }
        });

        const pendingLogs = await prisma.serviceLog.findMany({
            where: { barbershopId: user.barbershopId, status: 'COMPLETED', isCommissionPaid: false },
            include: { serviceType: true, client: true }
        });

        const report = barbers.map(barber => {
            const barberLogs = pendingLogs.filter(log => log.userId === barber.id);
            
            // LÓGICA DE OURO: Soma o valor real para comissão
            const totalForCommission = barberLogs.reduce((acc, log) => {
                const isPlan = log.paymentMethod === 'Plano' || log.paymentMethod === 'PLANO_VIP' || log.paymentMethod === 'Plano VIP';
                // Se for plano, usa o preço cheio do serviço. Se não, usa o preço efetivamente cobrado (que pode ter desconto manual).
                const valueToAdd = isPlan ? Number(log.serviceType?.price || 0) : Number(log.priceCharged);
                return acc + valueToAdd;
            }, 0);

            const commissionRate = barber.commissionRate || 50;
            const commissionValue = totalForCommission * (commissionRate / 100);

            return {
                barber,
                logs: barberLogs,
                totalGenerated: totalForCommission, // Agora reflete o valor base para o barbeiro
                commissionValue,
                servicesCount: barberLogs.length
            };
        });

        return NextResponse.json(report, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Erro ao buscar comissões.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId || (user.role !== 'ADMIN' && !user.permissions.includes('admin_panel'))) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { barberId, barberName, amount, logIds } = body;

        if (!barberId || !logIds || logIds.length === 0) {
            return NextResponse.json({ message: 'Dados inválidos para acerto.' }, { status: 400 });
        }

        await prisma.serviceLog.updateMany({
            where: { id: { in: logIds }, barbershopId: user.barbershopId },
            data: { isCommissionPaid: true }
        });

        if (Number(amount) > 0) {
            await prisma.financialRecord.create({
                data: {
                    barbershopId: user.barbershopId,
                    type: 'EXPENSE',
                    amount: Number(amount),
                    description: `Comissão: ${barberName} (${logIds.length} serviços)`,
                }
            });
        }

        return NextResponse.json({ message: 'Acerto realizado com sucesso!' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Erro ao realizar o acerto.' }, { status: 500 });
    }
}