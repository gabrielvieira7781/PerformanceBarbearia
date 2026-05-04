// app/api/planos/[id]/route.ts
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
        return await prisma.user.findUnique({ where: { id: decoded.userId } });
    } catch (error) {
        return null;
    }
}

// EDITAR OU DESATIVAR PLANO
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        const { id } = await params;

        if (!user || !user.barbershopId || user.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { name, price, maxCuts, billingCycle, isActive, serviceIds } = body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (price !== undefined) updateData.price = Number(price);
        if (maxCuts !== undefined) updateData.maxCuts = Number(maxCuts);
        if (billingCycle) updateData.billingCycle = billingCycle;
        if (isActive !== undefined) updateData.isActive = isActive;
        
        // Se mandou a lista de serviços nova, atualiza os vínculos ('set' substitui tudo pelo novo)
        if (serviceIds !== undefined) {
            updateData.services = {
                set: serviceIds.map((srvId: string) => ({ id: srvId }))
            };
        }

        const updatedPlan = await prisma.subscriptionPlan.update({
            where: { id: id, barbershopId: user.barbershopId },
            data: updateData,
            include: { services: true }
        });

        return NextResponse.json(updatedPlan, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Erro interno ao atualizar plano.' }, { status: 500 });
    }
}

// EXCLUIR PLANO DEFINITIVAMENTE
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        const { id } = await params;

        if (!user || !user.barbershopId || user.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        await prisma.subscriptionPlan.delete({
            where: { id: id, barbershopId: user.barbershopId }
        });

        return NextResponse.json({ message: 'Plano excluído com sucesso.' }, { status: 200 });
    } catch (error: any) {
        // P2003 = Tem cliente atrelado a esse plano. O Prisma bloqueia para não quebrar o banco.
        if (error.code === 'P2003') {
            return NextResponse.json({ 
                message: 'Existem clientes ativos neste plano. Por segurança, apenas desative o plano em vez de excluir.' 
            }, { status: 400 });
        }
        return NextResponse.json({ message: 'Erro ao excluir plano.' }, { status: 500 });
    }
}