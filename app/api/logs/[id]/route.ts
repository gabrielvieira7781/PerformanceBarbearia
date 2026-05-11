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

        // 1. Busca o lançamento original e as configurações da barbearia
        const existingLog = await prisma.serviceLog.findUnique({
            where: { id: id, barbershopId: user.barbershopId }
        });

        if (!existingLog) {
            return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });
        }

        const settings = await prisma.barbershopSettings.findUnique({
            where: { barbershopId: user.barbershopId }
        });
        
        const multiplier = settings?.pointsMultiplier || 1;

        // ==========================================
        // MÁQUINA DE CONTABILIDADE (VIP, PONTOS E SELOS)
        // ==========================================

        const wasPlan = existingLog.paymentMethod === 'Plano VIP' || existingLog.paymentMethod === 'PLANO_VIP' || existingLog.paymentMethod === 'Plano';
        const isPlanNow = paymentMethod === 'Plano VIP' || paymentMethod === 'PLANO_VIP' || paymentMethod === 'Plano';

        const oldPoints = (settings?.enablePointsLoyalty && Number(existingLog.priceCharged) > 0) ? Math.floor(Number(existingLog.priceCharged) * multiplier) : 0;
        const newPrice = Number(priceCharged) || 0;
        const newPoints = (settings?.enablePointsLoyalty && newPrice > 0) ? Math.floor(newPrice * multiplier) : 0;

        const oldStamps = (settings?.enableStampsLoyalty && existingLog.serviceTypeId) ? 1 : 0;
        const newStamps = (settings?.enableStampsLoyalty && serviceTypeId) ? 1 : 0;

        const targetClientId = clientId || existingLog.clientId;
        const clientChanged = clientId && clientId !== existingLog.clientId;

        if (clientChanged) {
            // Cenario A: Trocou de cliente. Tira tudo do antigo e dá para o novo!
            const oldClientUpdate: any = {};
            if (wasPlan) oldClientUpdate.cutsUsedThisMonth = { decrement: 1 };
            if (oldPoints > 0) oldClientUpdate.loyaltyPoints = { decrement: oldPoints };
            if (oldStamps > 0) oldClientUpdate.loyaltyStamps = { decrement: oldStamps };

            if (Object.keys(oldClientUpdate).length > 0) {
                await prisma.client.update({ where: { id: existingLog.clientId }, data: oldClientUpdate });
            }

            const newClientUpdate: any = {};
            if (isPlanNow) newClientUpdate.cutsUsedThisMonth = { increment: 1 };
            if (newPoints > 0) newClientUpdate.loyaltyPoints = { increment: newPoints };
            if (newStamps > 0) newClientUpdate.loyaltyStamps = { increment: newStamps };

            if (Object.keys(newClientUpdate).length > 0) {
                await prisma.client.update({ where: { id: targetClientId }, data: newClientUpdate });
            }
        } else {
            // Cenario B: Manteve o cliente, apenas calcula a diferença matemática
            const planDiff = (isPlanNow ? 1 : 0) - (wasPlan ? 1 : 0);
            const pointsDiff = newPoints - oldPoints;
            const stampsDiff = newStamps - oldStamps;

            const sameClientUpdate: any = {};
            if (planDiff !== 0) sameClientUpdate.cutsUsedThisMonth = { increment: planDiff };
            if (pointsDiff !== 0) sameClientUpdate.loyaltyPoints = { increment: pointsDiff };
            if (stampsDiff !== 0) sameClientUpdate.loyaltyStamps = { increment: stampsDiff };

            if (Object.keys(sameClientUpdate).length > 0) {
                await prisma.client.update({ where: { id: existingLog.clientId }, data: sameClientUpdate });
            }
        }

        // 2. Finalmente, salva a edição no log em si
        const updateData: any = {
            priceCharged: newPrice,
            paymentMethod: paymentMethod
        };

        if (clientId) updateData.clientId = clientId;
        if (userId) updateData.userId = userId;
        if (serviceTypeId !== undefined) updateData.serviceTypeId = serviceTypeId || null;

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

        // 1. Busca o log a ser apagado
        const log = await prisma.serviceLog.findUnique({
            where: { id: id, barbershopId: user.barbershopId }
        });

        if (!log) return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });

        // 2. Busca as configurações para saber como calcular o estorno
        const settings = await prisma.barbershopSettings.findUnique({
            where: { barbershopId: user.barbershopId }
        });
        const multiplier = settings?.pointsMultiplier || 1;

        // 3. Calcula o que precisa ser devolvido/removido do cliente
        const wasPlan = log.paymentMethod === 'Plano VIP' || log.paymentMethod === 'PLANO_VIP' || log.paymentMethod === 'Plano';
        const pointsToRemove = (settings?.enablePointsLoyalty && Number(log.priceCharged) > 0) ? Math.floor(Number(log.priceCharged) * multiplier) : 0;
        const stampsToRemove = (settings?.enableStampsLoyalty && log.serviceTypeId) ? 1 : 0;

        const clientUpdate: any = {};
        if (wasPlan) clientUpdate.cutsUsedThisMonth = { decrement: 1 };
        if (pointsToRemove > 0) clientUpdate.loyaltyPoints = { decrement: pointsToRemove };
        if (stampsToRemove > 0) clientUpdate.loyaltyStamps = { decrement: stampsToRemove };

        // 4. Executa o estorno no cliente
        if (Object.keys(clientUpdate).length > 0) {
            await prisma.client.update({
                where: { id: log.clientId },
                data: clientUpdate
            });
        }

        // 5. Apaga o log do sistema
        await prisma.serviceLog.delete({
            where: { id: id, barbershopId: user.barbershopId }
        });

        return NextResponse.json({ message: 'Serviço excluído com sucesso.' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao excluir serviço.' }, { status: 500 });
    }
}