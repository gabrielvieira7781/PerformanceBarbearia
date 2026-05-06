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

        const records = await prisma.financialRecord.findMany({
            where: { barbershopId: user.barbershopId },
            orderBy: { id: 'desc' }
        });

        return NextResponse.json(records, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao buscar dados.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId || (user.role !== 'ADMIN' && !user.permissions.includes('admin_panel'))) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { description, amount, category, status, dueDate, paidAt } = body;

        if (!description || !amount) {
            return NextResponse.json({ message: 'Descrição e valor obrigatórios.' }, { status: 400 });
        }

        const newRecord = await prisma.financialRecord.create({
            data: {
                barbershopId: user.barbershopId,
                type: 'EXPENSE',
                amount: Number(amount),
                description,
                category: category || 'VARIAVEL',
                status: status || 'PAID',
                dueDate: dueDate ? new Date(dueDate) : new Date(),
                paidAt: status === 'PAID' ? (paidAt ? new Date(paidAt) : new Date()) : null
            }
        });

        return NextResponse.json(newRecord, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao lançar despesa.' }, { status: 500 });
    }
}