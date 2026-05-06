// app/api/logs/[id]/route.ts

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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        const { id } = await params;

        if (!user || !user.barbershopId || (user.role !== 'ADMIN' && !user.permissions.includes('admin_panel'))) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { priceCharged, paymentMethod, clientId, userId, serviceTypeId } = body;

        // Busca o lançamento original para comparar se houve mudança no Plano VIP
        const existingLog = await prisma.serviceLog.findUnique({
            where: { id: id, barbershopId: user.barbershopId }
        });

        if (!existingLog) {
            return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });
        }

        // --- MÁGICA DO PLANO VIP ---
        const wasPlan = existingLog.paymentMethod === 'Plano VIP' || existingLog.paymentMethod === 'PLANO_VIP' || existingLog.paymentMethod === 'Plano';
        const isPlanNow = paymentMethod === 'Plano VIP' || paymentMethod === 'PLANO_VIP' || paymentMethod === 'Plano';

        // Se ANTES era Plano e AGORA não é mais -> Devolve o limite para o cliente
        if (wasPlan && !isPlanNow) {
            await prisma.client.update({
                where: { id: existingLog.clientId },
                data: { cutsUsedThisMonth: { decrement: 1 } }
            });
        }
        
        // Se ANTES NÃO ERA Plano e AGORA É -> Desconta o limite do cliente
        if (!wasPlan && isPlanNow) {
            const targetClientId = clientId || existingLog.clientId;
            await prisma.client.update({
                where: { id: targetClientId },
                data: { cutsUsedThisMonth: { increment: 1 } }
            });
        }

        // Monta os dados que serão atualizados
        const updateData: any = {
            priceCharged: Number(priceCharged),
            paymentMethod: paymentMethod
        };

        if (clientId) updateData.clientId = clientId;
        if (userId) updateData.userId = userId;
        if (serviceTypeId) updateData.serviceTypeId = serviceTypeId;

        const updatedLog = await prisma.serviceLog.update({
            where: { id: id, barbershopId: user.barbershopId },
            data: updateData
        });

        return NextResponse.json(updatedLog, { status: 200 });
    } catch (error) {
        console.error("Erro na edição do log:", error);
        return NextResponse.json({ message: 'Erro ao atualizar o serviço.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        const { id } = await params;

        if (!user || !user.barbershopId || (user.role !== 'ADMIN' && !user.permissions.includes('admin_panel'))) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const log = await prisma.serviceLog.findUnique({
            where: { id: id, barbershopId: user.barbershopId }
        });

        if (!log) return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });

        const wasPlan = log.paymentMethod === 'Plano VIP' || log.paymentMethod === 'PLANO_VIP' || log.paymentMethod === 'Plano';

        if (wasPlan) {
            await prisma.client.update({
                where: { id: log.clientId },
                data: { cutsUsedThisMonth: { decrement: 1 } }
            });
        }

        await prisma.serviceLog.delete({
            where: { id: id, barbershopId: user.barbershopId }
        });

        return NextResponse.json({ message: 'Serviço excluído com sucesso.' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao excluir serviço.' }, { status: 500 });
    }
}