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

export async function GET() {
    const user = await getUserAuth();
    if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

    const etapas = await prisma.botFlowStep.findMany({
        where: { barbershopId: user.barbershopId },
        include: { options: true },
        orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(etapas, { status: 200 });
}

export async function POST(request: Request) {
    const user = await getUserAuth();
    if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

    const body = await request.json();
    const { palavraChave, tituloMenu, mensagemTexto, opcoes } = body;

    const novaEtapa = await prisma.botFlowStep.create({
        data: {
            barbershopId: user.barbershopId,
            keyword: palavraChave || null,
            menuTitle: tituloMenu,
            message: mensagemTexto,
            options: {
                create: opcoes.map((op: any) => ({
                    label: op.rotulo,
                    description: op.descricao,
                    actionType: op.tipoAcao,
                    finalMessage: op.mensagemFinal || null,
                    nextStepId: op.proximaEtapaId || null,
                    systemAction: op.acaoEspecial || null
                }))
            }
        }
    });

    return NextResponse.json(novaEtapa, { status: 201 });
}

export async function PUT(request: Request) {
    const user = await getUserAuth();
    if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

    const body = await request.json();
    const { id, palavraChave, tituloMenu, mensagemTexto, opcoes } = body;

    // Atualiza a etapa deletando as opções antigas e recriando as novas (mais seguro e limpo)
    const etapaAtualizada = await prisma.botFlowStep.update({
        where: { id },
        data: {
            keyword: palavraChave || null,
            menuTitle: tituloMenu,
            message: mensagemTexto,
            options: {
                deleteMany: {},
                create: opcoes.map((op: any) => ({
                    label: op.rotulo,
                    description: op.descricao,
                    actionType: op.tipoAcao,
                    finalMessage: op.mensagemFinal || null,
                    nextStepId: op.proximaEtapaId || null,
                    systemAction: op.acaoEspecial || null
                }))
            }
        }
    });

    return NextResponse.json(etapaAtualizada, { status: 200 });
}

export async function DELETE(request: Request) {
    const user = await getUserAuth();
    if (!user) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
        await prisma.botFlowStep.delete({ where: { id } });
    }
    return NextResponse.json({ success: true }, { status: 200 });
}