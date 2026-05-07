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
        // Aqui pegamos também a role (cargo) para saber se é Admin ou Barbeiro
        const decoded = jwt.verify(token, secretKey) as { userId: string, role?: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        return user;
    } catch (error) {
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        let barberId = searchParams.get('barberId');

        // REGRA DE OURO DA AGENDA INDIVIDUAL:
        // Se o usuário não for ADMIN, forçamos o ID de busca para ser o dele mesmo.
        // Assim, o barbeiro comum jamais conseguirá ver a agenda de outro barbeiro.
        if (user.role !== 'ADMIN') {
            barberId = user.id;
        }

        const whereClause: any = { barbershopId: user.barbershopId };

        if (barberId) {
            whereClause.userId = barberId;
        }

        if (startDate && endDate) {
            // Garante que a busca contemple o dia todo (de 00:00 às 23:59 UTC)
            const start = new Date(`${startDate}T00:00:00.000Z`);
            const end = new Date(`${endDate}T23:59:59.999Z`);
            whereClause.startTime = {
                gte: start,
                lte: end
            };
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                client: true,
                user: true,
                service: true
            },
            orderBy: { startTime: 'asc' }
        });

        return NextResponse.json(appointments, { status: 200 });
    } catch (error) {
        console.error("Erro ao buscar agenda:", error);
        return NextResponse.json({ message: 'Erro ao buscar agendamentos.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId) return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });

        const body = await request.json();
        const { clientId, barberId, serviceId, startTime, endTime } = body;

        // O Robô do WhatsApp ou o app vai mandar a data e o barbeiro escolhido
        if (!clientId || !barberId || !startTime || !endTime) {
            return NextResponse.json({ message: 'Dados incompletos para agendar.' }, { status: 400 });
        }

        // Bloqueio contra choque de horários (Opcional, mas muito útil para o robô não fazer besteira no futuro)
        const conflict = await prisma.appointment.findFirst({
            where: {
                userId: barberId,
                status: 'SCHEDULED',
                OR: [
                    { startTime: { lt: new Date(endTime), gte: new Date(startTime) } },
                    { endTime: { gt: new Date(startTime), lte: new Date(endTime) } }
                ]
            }
        });

        if (conflict) {
            return NextResponse.json({ message: 'Já existe um agendamento neste horário para este profissional.' }, { status: 409 });
        }

        const newAppointment = await prisma.appointment.create({
            data: {
                barbershopId: user.barbershopId,
                clientId,
                userId: barberId,
                serviceId: serviceId || null,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: 'SCHEDULED'
            },
            include: {
                client: true,
                user: true,
                service: true
            }
        });

        return NextResponse.json(newAppointment, { status: 201 });
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        return NextResponse.json({ message: 'Erro ao criar agendamento.' }, { status: 500 });
    }
}