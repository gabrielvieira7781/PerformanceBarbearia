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
        const decoded = jwt.verify(token, secretKey) as { userId: string, role?: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        return user;
    } catch (error) {
        return null;
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        const { id } = await params;

        if (!user || !user.barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        // Verifica se o agendamento existe e pertence à barbearia
        const appointment = await prisma.appointment.findUnique({
            where: { id: id }
        });

        if (!appointment || appointment.barbershopId !== user.barbershopId) {
            return NextResponse.json({ message: 'Agendamento não encontrado.' }, { status: 404 });
        }

        // Se não for admin, só pode excluir os PRÓPRIOS agendamentos
        if (user.role !== 'ADMIN' && appointment.userId !== user.id) {
            return NextResponse.json({ message: 'Você não tem permissão para excluir este agendamento.' }, { status: 403 });
        }

        await prisma.appointment.delete({
            where: { id: id }
        });

        return NextResponse.json({ message: 'Agendamento cancelado com sucesso.' }, { status: 200 });
    } catch (error) {
        console.error("Erro ao cancelar agendamento:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}