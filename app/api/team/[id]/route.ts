import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

async function getBarbershopId() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return null;
        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
        const decoded = jwt.verify(token, secretKey) as { userId: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        return user?.barbershopId || null;
    } catch (error) {
        return null;
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const barbershopId = await getBarbershopId();
        const { id } = await params;

        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        const { name, email, password, isActive, permissions, commissionRate, paymentCycle } = body;

        if (!name || !email) return NextResponse.json({ message: 'Nome e e-mail são obrigatórios.' }, { status: 400 });

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await prisma.user.findFirst({
            where: { id: id, barbershopId: barbershopId, role: 'BARBER' }
        });

        if (!existingUser) return NextResponse.json({ message: 'Barbeiro não encontrado.' }, { status: 404 });

        if (normalizedEmail !== existingUser.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (emailTaken) return NextResponse.json({ message: 'Este e-mail já está em uso.' }, { status: 400 });
        }

        const updateData: any = { name: name, email: normalizedEmail };
        if (password) updateData.password = await bcrypt.hash(password, 10);
        if (isActive !== undefined) updateData.isActive = isActive;
        if (permissions !== undefined) updateData.permissions = permissions;
        
        // NOVO: Atualiza comissão e ciclo
        if (commissionRate !== undefined) updateData.commissionRate = Number(commissionRate);
        if (paymentCycle !== undefined) updateData.paymentCycle = paymentCycle;

        const updatedBarber = await prisma.user.update({
            where: { id: id },
            data: updateData,
            select: { id: true, name: true, email: true, isActive: true, permissions: true, commissionRate: true, paymentCycle: true }
        });

        return NextResponse.json(updatedBarber, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const barbershopId = await getBarbershopId();
        const { id } = await params;

        if (!barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const existingUser = await prisma.user.findFirst({
            where: { id: id, barbershopId: barbershopId, role: 'BARBER' }
        });

        if (!existingUser) return NextResponse.json({ message: 'Barbeiro não encontrado.' }, { status: 404 });

        await prisma.user.delete({ where: { id: id } });

        return NextResponse.json({ message: 'Barbeiro excluído com sucesso.' }, { status: 200 });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json(
                { message: 'Este barbeiro já possui serviços lançados. Para remover o acesso, apenas desative a conta dele.' }, 
                { status: 400 }
            );
        }
        return NextResponse.json({ message: 'Erro ao excluir barbeiro.' }, { status: 500 });
    }
}