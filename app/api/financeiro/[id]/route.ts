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
        if (!user || !user.barbershopId || (user.role !== 'ADMIN' && !user.permissions.includes('admin_panel'))) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const updated = await prisma.financialRecord.update({
            where: { id, barbershopId: user.barbershopId },
            data: {
                description: body.description,
                amount: body.amount ? Number(body.amount) : undefined,
                category: body.category,
                status: body.status,
                dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                paidAt: body.status === 'PAID' ? (body.paidAt ? new Date(body.paidAt) : new Date()) : null
            }
        });

        return NextResponse.json(updated, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao atualizar.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId || (user.role !== 'ADMIN' && !user.permissions.includes('admin_panel'))) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }
        const { id } = await params;

        await prisma.financialRecord.delete({
            where: { id, barbershopId: user.barbershopId }
        });

        return NextResponse.json({ message: 'Excluído com sucesso.' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao excluir.' }, { status: 500 });
    }
}