// app/api/services/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

async function getBarbershopId() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) return null;

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_123';
        const decoded = jwt.verify(token, secretKey) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        return user?.barbershopId || null;
    } catch (error) {
        console.error("Erro ao verificar token:", error);
        return null;
    }
}

// Rota PUT: Atualiza o serviço (incluindo o status de Ativo/Inativo)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const barbershopId = await getBarbershopId();
        const { id } = await params;

        if (!barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { name, price, description, isActive } = body;

        if (!name || price === undefined) {
            return NextResponse.json({ message: 'Nome e preço são obrigatórios.' }, { status: 400 });
        }

        const existingService = await prisma.serviceType.findFirst({
            where: { id: id, barbershopId: barbershopId }
        });

        if (!existingService) {
            return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });
        }

        const updatedService = await prisma.serviceType.update({
            where: { id: id },
            data: {
                name: name,
                price: parseFloat(price),
                description: description || '',
                isActive: isActive !== undefined ? isActive : existingService.isActive
            }
        });

        return NextResponse.json(updatedService, { status: 200 });

    } catch (error) {
        console.error("Erro ao atualizar serviço:", error);
        return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
    }
}

// Rota DELETE: Exclui o serviço (com trava de segurança)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const barbershopId = await getBarbershopId();
        const { id } = await params;

        if (!barbershopId) {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const existingService = await prisma.serviceType.findFirst({
            where: { id: id, barbershopId: barbershopId }
        });

        if (!existingService) {
            return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });
        }

        await prisma.serviceType.delete({
            where: { id: id }
        });

        return NextResponse.json({ message: 'Serviço excluído com sucesso.' }, { status: 200 });

    } catch (error: any) {
        console.error("Erro ao excluir serviço:", error);
        
        // P2003 é o código de erro do Prisma quando o item já está amarrado a outra tabela (Foreign Key constraint)
        if (error.code === 'P2003') {
            return NextResponse.json(
                { message: 'Este serviço não pode ser excluído pois já possui lançamentos no financeiro. Desative-o em vez disso.' }, 
                { status: 400 }
            );
        }

        return NextResponse.json({ message: 'Erro ao excluir serviço.' }, { status: 500 });
    }
}