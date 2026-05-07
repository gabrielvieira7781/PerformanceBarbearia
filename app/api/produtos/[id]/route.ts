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

        if (!user || !user.barbershopId || user.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { name, price, stock, isActive } = body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (price !== undefined) updateData.price = Number(price);
        if (stock !== undefined) updateData.stock = Number(stock);
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedProduct = await prisma.product.update({
            where: { id: id, barbershopId: user.barbershopId },
            data: updateData
        });

        return NextResponse.json(updatedProduct, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao atualizar produto.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserAuth();
        const { id } = await params;

        if (!user || !user.barbershopId || user.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        await prisma.product.delete({
            where: { id: id, barbershopId: user.barbershopId }
        });

        return NextResponse.json({ message: 'Produto excluído com sucesso.' }, { status: 200 });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json({ 
                message: 'Este produto possui histórico de vendas. Desative-o em vez de excluir.' 
            }, { status: 400 });
        }
        return NextResponse.json({ message: 'Erro ao excluir.' }, { status: 500 });
    }
}