// app/api/checkout/route.ts

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
        const { clientName, clientPhone, cart, paymentMethod, discount, totalToPay } = body;

        if (!clientName || !cart || cart.length === 0 || !paymentMethod) {
            return NextResponse.json({ message: 'Dados incompletos para o checkout.' }, { status: 400 });
        }

        let cleanPhone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
        let client = null;

        if (cleanPhone) {
            client = await prisma.client.findFirst({
                where: { phone: cleanPhone, barbershopId: user.barbershopId }
            });
        }

        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: clientName,
                    phone: cleanPhone,
                    barbershopId: user.barbershopId
                }
            });
        }

        // Traz o cliente, o plano e quais serviços esse plano cobre
        const clientWithPlan = await prisma.client.findUnique({
            where: { id: client.id },
            include: { plan: { include: { services: true } } }
        });

        const subtotal = cart.reduce((acc: number, item: any) => acc + Number(item.price), 0);
        const discountValue = Number(discount) || 0;
        let usedPlanCount = 0; 

        // Registra os serviços avaliando o plano item a item
        const serviceLogsData = cart.map((item: any) => {
            let finalPrice = Number(item.price);
            let itemPaymentMethod = paymentMethod;

            // Desconto manual genérico
            if (discountValue > 0 && subtotal > 0) {
                const itemDiscount = (Number(item.price) / subtotal) * discountValue;
                finalPrice = Math.max(0, finalPrice - itemDiscount);
            }

            // O serviço está no plano? Tem saldo? Zera o valor!
            if (clientWithPlan?.plan) {
                const isServiceInPlan = clientWithPlan.plan.services.some(s => s.id === item.id);
                const currentUsage = clientWithPlan.cutsUsedThisMonth + usedPlanCount;
                const hasBalance = currentUsage < clientWithPlan.plan.maxCuts;

                if (isServiceInPlan && hasBalance) {
                    finalPrice = 0; 
                    itemPaymentMethod = "PLANO_VIP";
                    usedPlanCount++; 
                }
            }

            return {
                barbershopId: user.barbershopId,
                userId: user.id,
                clientId: client.id,
                serviceTypeId: item.id,
                priceCharged: finalPrice, 
                paymentMethod: itemPaymentMethod,
                status: "COMPLETED"
            };
        });

        await prisma.serviceLog.createMany({ data: serviceLogsData });

        // Atualiza a cota do plano no mês
        if (usedPlanCount > 0) {
            await prisma.client.update({
                where: { id: client.id },
                data: { cutsUsedThisMonth: { increment: usedPlanCount } }
            });
        }

        // Só lança no financeiro se o cliente pagou algum dinheiro de fato (totalToPay > 0)
        if (totalToPay > 0) {
            const serviceNames = cart.map((i: any) => i.name).join(', ');
            await prisma.financialRecord.create({
                data: {
                    barbershopId: user.barbershopId,
                    type: 'INCOME',
                    amount: totalToPay,
                    description: `Recebimento: ${serviceNames} - Cliente: ${client.name}`,
                }
            });
        }

        return NextResponse.json({ message: 'Lançamento concluído com sucesso!' }, { status: 201 });

    } catch (error) {
        console.error("Erro no checkout:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}