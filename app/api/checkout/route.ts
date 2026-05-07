import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

async function getUserInfo() {
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

export async function POST(request: Request) {
    try {
        const user = await getUserInfo();
        if (!user || !user.barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { clientName, clientPhone, cart, paymentMethod, discount, totalToPay, usedPoints, usedStampsReward } = body;

        if (!clientName || !cart || cart.length === 0 || !paymentMethod) {
            return NextResponse.json({ message: 'Dados incompletos para o checkout.' }, { status: 400 });
        }

        let cleanPhone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
        let client = null;

        if (cleanPhone) {
            client = await prisma.client.findFirst({
                where: { phone: cleanPhone, barbershopId: user.barbershopId }
            });

            if (client && !client.isActive) {
                return NextResponse.json({ message: `O cliente ${client.name} está BLOQUEADO no sistema.` }, { status: 403 }); 
            }
        }

        if (!client) {
            client = await prisma.client.create({
                data: { name: clientName, phone: cleanPhone, barbershopId: user.barbershopId }
            });
        }

        const settings = await prisma.barbershopSettings.findUnique({
            where: { barbershopId: user.barbershopId }
        });

        const clientWithPlan = await prisma.client.findUnique({
            where: { id: client.id },
            include: { plan: { include: { services: true } } }
        });

        const subtotal = cart.reduce((acc: number, item: any) => acc + Number(item.price), 0);
        const discountValue = Number(discount) || 0;
        let usedPlanCount = 0; 
        
        let servicesCount = 0; // Quantidade de cortes para somar no Cartão Fidelidade

        // === 1. PROCESSAR LOGS DE VENDAS E BAIXAS DE ESTOQUE ===
        for (const item of cart) {
            let finalPrice = Number(item.price);
            let itemPaymentMethod = paymentMethod;

            if (discountValue > 0 && subtotal > 0) {
                const itemDiscount = (Number(item.price) / subtotal) * discountValue;
                finalPrice = Math.max(0, finalPrice - itemDiscount);
            }

            // Plano VIP só se aplica a SERVIÇOS
            if (item.type === 'SERVICE' && clientWithPlan?.plan) {
                const isServiceInPlan = clientWithPlan.plan.services.some(s => s.id === item.id);
                const currentUsage = clientWithPlan.cutsUsedThisMonth + usedPlanCount;
                const hasBalance = currentUsage < clientWithPlan.plan.maxCuts;

                if (isServiceInPlan && hasBalance) {
                    finalPrice = 0; 
                    itemPaymentMethod = "PLANO_VIP";
                    usedPlanCount++; 
                }
            }

            // Conta os serviços para o cartão fidelidade (exclui produtos)
            if (item.type === 'SERVICE') {
                servicesCount++;
            }

            // Salva o ServiceLog (Agora com a capacidade de ser Service ou Product)
            await prisma.serviceLog.create({
                data: {
                    barbershopId: user.barbershopId,
                    userId: user.id,
                    clientId: client.id,
                    serviceTypeId: item.type === 'SERVICE' ? item.id : null,
                    productId: item.type === 'PRODUCT' ? item.id : null,
                    priceCharged: finalPrice, 
                    paymentMethod: itemPaymentMethod,
                    status: "COMPLETED"
                }
            });

            // === AQUI FICA A MÁGICA: BAIXA DE ESTOQUE AUTOMÁTICA ===
            if (item.type === 'PRODUCT') {
                await prisma.product.update({
                    where: { id: item.id },
                    data: { stock: { decrement: 1 } }
                });
            }
        }

        if (usedPlanCount > 0) {
            await prisma.client.update({
                where: { id: client.id },
                data: { cutsUsedThisMonth: { increment: usedPlanCount } }
            });
        }

        if (totalToPay > 0) {
            const itemNames = cart.map((i: any) => i.name).join(', ');
            await prisma.financialRecord.create({
                data: {
                    barbershopId: user.barbershopId,
                    type: 'INCOME',
                    amount: totalToPay,
                    description: `Venda: ${itemNames} - Cliente: ${client.name}`,
                }
            });
        }

        // === 2. MÓDULO DE FIDELIDADE ===
        let pointsEarned = 0;
        let stampsEarned = 0;
        let pointsToDeduct = Number(usedPoints) || 0;
        let stampsToDeduct = (usedStampsReward && settings?.stampsRequiredForReward) ? settings.stampsRequiredForReward : 0;

        if (settings?.enablePointsLoyalty && totalToPay > 0) {
            pointsEarned = Math.floor(totalToPay * (settings.pointsMultiplier || 1));
        }
        
        if (settings?.enableStampsLoyalty) {
            stampsEarned = servicesCount; // Só ganha selo se fizer corte!
        }

        if (pointsEarned > 0 || stampsEarned > 0 || pointsToDeduct > 0 || stampsToDeduct > 0) {
            await prisma.client.update({
                where: { id: client.id },
                data: {
                    loyaltyPoints: { increment: (pointsEarned - pointsToDeduct) },
                    loyaltyStamps: { increment: (stampsEarned - stampsToDeduct) }
                }
            });
        }

        return NextResponse.json({ message: 'Lançamento concluído com sucesso!' }, { status: 201 });

    } catch (error) {
        console.error("Erro no checkout:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}