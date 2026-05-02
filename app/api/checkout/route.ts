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

        // 1. Busca ou cria o cliente pelo telefone na barbearia atual
        let client = await prisma.client.findFirst({
            where: { phone: clientPhone, barbershopId: user.barbershopId }
        });

        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: clientName,
                    phone: clientPhone || '00000000000',
                    barbershopId: user.barbershopId
                }
            });
        }

        // 2. Registra todos os serviços (ServiceLogs)
        const serviceLogsData = cart.map((item: any) => ({
            barbershopId: user.barbershopId,
            userId: user.id, // O barbeiro que fez o serviço
            clientId: client.id,
            serviceTypeId: item.id,
            priceCharged: item.price,
            paymentMethod: paymentMethod,
            status: "COMPLETED"
        }));

        await prisma.serviceLog.createMany({
            data: serviceLogsData
        });

        // 3. Registra a entrada no Caixa (FinancialRecord)
        const serviceNames = cart.map((i: any) => i.name).join(', ');
        await prisma.financialRecord.create({
            data: {
                barbershopId: user.barbershopId,
                type: 'INCOME',
                amount: totalToPay,
                description: `Recebimento: ${serviceNames} - Cliente: ${client.name}`,
            }
        });

        return NextResponse.json({ message: 'Lançamento concluído com sucesso!' }, { status: 201 });

    } catch (error) {
        console.error("Erro no checkout:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}