// app/api/auth/verify/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, code } = body;

        // Busca o usuário pelo e-mail
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!user) {
            return NextResponse.json(
                { message: 'Usuário não encontrado.' },
                { status: 404 }
            );
        }

        // Verifica se o código bate com o salvo no banco
        if (user.verificationCode !== code) {
            return NextResponse.json(
                { message: 'Código inválido.' },
                { status: 400 }
            );
        }

        // Verifica se o código expirou
        if (user.verificationCodeExpires && user.verificationCodeExpires < new Date()) {
            return NextResponse.json(
                { message: 'O código expirou. Solicite um novo.' },
                { status: 400 }
            );
        }

        // Se deu tudo certo, atualiza o usuário como verificado e limpa o código
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                verificationCodeExpires: null
            }
        });

        return NextResponse.json(
            { message: 'Conta verificada com sucesso!' },
            { status: 200 }
        );

    } catch (error) {
        console.error("Erro no verify:", error);
        return NextResponse.json(
            { message: 'Erro interno no servidor.' },
            { status: 500 }
        );
    }
}