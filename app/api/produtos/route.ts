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

        const products = await prisma.product.findMany({
            where: { barbershopId: user.barbershopId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(products, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao buscar produtos.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId || user.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        const { name, price, costPrice, stock, minStock } = body;

        if (!name || price === undefined) {
            return NextResponse.json({ message: 'Nome e preço são obrigatórios.' }, { status: 400 });
        }

        const newProduct = await prisma.product.create({
            data: {
                name: name.trim(),
                price: Number(price),
                costPrice: Number(costPrice) || 0,
                stock: Number(stock) || 0,
                minStock: Number(minStock) || 5, // Padrão de 5 se não for preenchido
                barbershopId: user.barbershopId
            }
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao cadastrar produto.' }, { status: 500 });
    }
}