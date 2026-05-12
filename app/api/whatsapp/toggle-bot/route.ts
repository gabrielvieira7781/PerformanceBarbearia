import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, botEnabled } = body;

        if (!userId) {
            return NextResponse.json({ error: 'ID do usuário não fornecido.' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { botEnabled }
        });

        return NextResponse.json({ success: true, botEnabled: user.botEnabled });
    } catch (error) {
        console.error('Erro ao alternar status do robô:', error);
        return NextResponse.json({ error: 'Erro interno ao atualizar status.' }, { status: 500 });
    }
}