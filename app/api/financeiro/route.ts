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
        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        // 1. Busca APENAS as DESPESAS lançadas manualmente na tela do financeiro
        const expenses = await prisma.financialRecord.findMany({
            where: { 
                barbershopId: user.barbershopId,
                type: 'EXPENSE' 
            }
        });

        // 2. Busca OS SERVIÇOS E VENDAS reais como a única fonte de Receita
        const logs = await prisma.serviceLog.findMany({
            where: { barbershopId: user.barbershopId },
            include: { client: true, serviceType: true, product: true }
        });

        // 3. Transforma os cortes/vendas no formato que a tela do Financeiro entende
        const incomesFromLogs = logs.map(log => {
            const itemName = log.serviceType?.name || log.product?.name || 'Item';
            return {
                id: log.id,
                type: 'INCOME',
                amount: log.priceCharged,
                description: `Venda/Serviço: ${itemName} - Cliente: ${log.client?.name || 'Avulso'}`,
                category: 'VENDAS_E_SERVICOS',
                status: 'PAID', // Se passou no PDV, o dinheiro já entrou no caixa
                dueDate: log.date, // CORRIGIDO AQUI
                paidAt: log.date,  // CORRIGIDO AQUI
                paymentMethod: log.paymentMethod,
                createdAt: log.date // CORRIGIDO AQUI
            };
        });

        // 4. Junta as despesas com as receitas e ordena por data
        const allRecords = [...expenses, ...incomesFromLogs].sort((a: any, b: any) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return NextResponse.json(allRecords, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao buscar registros financeiros.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        const { description, amount, category, status, paymentMethod, dueDate, paidAt } = body;

        if (!description || !amount) {
            return NextResponse.json({ message: 'Dados incompletos.' }, { status: 400 });
        }

        // Tudo criado manualmente no modal da tela financeira entra exclusivamente como DESPESA
        const record = await prisma.financialRecord.create({
            data: {
                barbershopId: user.barbershopId,
                type: 'EXPENSE',
                description,
                amount: Number(amount),
                category: category || 'VARIAVEL',
                status: status || 'PAID',
                paymentMethod: paymentMethod || null,
                dueDate: dueDate ? new Date(`${dueDate}T12:00:00Z`) : new Date(),
                paidAt: paidAt ? new Date(`${paidAt}T12:00:00Z`) : null,
            }
        });

        return NextResponse.json(record, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao criar registro.' }, { status: 500 });
    }
}