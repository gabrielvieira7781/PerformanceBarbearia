// app/api/clientes/[id]/route.ts
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

        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const canEdit = user.role === 'ADMIN' || user.permissions.includes('edit_client');
        if (!canEdit) return NextResponse.json({ message: 'Você não tem permissão para editar clientes.' }, { status: 403 });

        const body = await request.json();
        const { name, phone, parentId, isActive, planId } = body;

        let cleanPhone = phone ? phone.replace(/\D/g, '') : '';

        if (cleanPhone) {
            const existing = await prisma.client.findFirst({
                where: { barbershopId: user.barbershopId, phone: cleanPhone, id: { not: id } }
            });
            if (existing) return NextResponse.json({ message: 'Este WhatsApp já pertence a outro cliente.' }, { status: 400 });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (phone !== undefined) updateData.phone = cleanPhone;
        if (parentId !== undefined) updateData.parentId = parentId || null;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (planId !== undefined) updateData.planId = planId || null;

        const updatedClient = await prisma.client.update({
            where: { id: id, barbershopId: user.barbershopId },
            data: updateData
        });

        return NextResponse.json(updatedClient, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro interno.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        const { id } = await params;

        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const canDelete = user.role === 'ADMIN' || user.permissions.includes('delete_client');
        if (!canDelete) return NextResponse.json({ message: 'Você não tem permissão para excluir clientes.' }, { status: 403 });

        await prisma.client.delete({
            where: { id: id, barbershopId: user.barbershopId }
        });

        return NextResponse.json({ message: 'Cliente excluído com sucesso.' }, { status: 200 });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json({ 
                message: 'Este cliente possui histórico de serviços ou dependentes. Em vez de excluir, utilize a opção de Bloquear.' 
            }, { status: 400 });
        }
        return NextResponse.json({ message: 'Erro ao excluir.' }, { status: 500 });
    }
}