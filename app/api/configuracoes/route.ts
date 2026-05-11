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

        let settings = await prisma.barbershopSettings.findUnique({
            where: { barbershopId: user.barbershopId }
        });

        if (!settings) {
            settings = await prisma.barbershopSettings.create({
                data: { barbershopId: user.barbershopId }
            });
        }

        return NextResponse.json(settings, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao buscar configurações.' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const user = await getUserAuth();
        if (!user || !user.barbershopId || user.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
        }

        const body = await request.json();
        
        const updateData: any = {};
        
        // Módulo Básico
        if (body.allowBarberExpenses !== undefined) updateData.allowBarberExpenses = body.allowBarberExpenses;
        
        // Módulos de Fidelidade
        if (body.enablePointsLoyalty !== undefined) updateData.enablePointsLoyalty = body.enablePointsLoyalty;
        if (body.pointsMultiplier !== undefined) updateData.pointsMultiplier = Number(body.pointsMultiplier);
        if (body.pointsDiscountValue !== undefined) updateData.pointsDiscountValue = Number(body.pointsDiscountValue);
        
        if (body.enableStampsLoyalty !== undefined) updateData.enableStampsLoyalty = body.enableStampsLoyalty;
        if (body.stampsRequiredForReward !== undefined) updateData.stampsRequiredForReward = Number(body.stampsRequiredForReward);
        if (body.stampRewardDescription !== undefined) updateData.stampRewardDescription = body.stampRewardDescription;

        // === MÓDULOS NOVOS DE MARKETING E OPERAÇÃO ===
        if (body.enableBirthdayPromo !== undefined) updateData.enableBirthdayPromo = body.enableBirthdayPromo;
        if (body.enableReactivationPromo !== undefined) updateData.enableReactivationPromo = body.enableReactivationPromo;
        if (body.enableReviewRequest !== undefined) updateData.enableReviewRequest = body.enableReviewRequest;
        
        if (body.enableAutoScheduling !== undefined) updateData.enableAutoScheduling = body.enableAutoScheduling;
        if (body.enableAutoReminders !== undefined) updateData.enableAutoReminders = body.enableAutoReminders;
        if (body.enableCashbackAlerts !== undefined) updateData.enableCashbackAlerts = body.enableCashbackAlerts;

        const updatedSettings = await prisma.barbershopSettings.upsert({
            where: { barbershopId: user.barbershopId },
            update: updateData,
            create: { barbershopId: user.barbershopId, ...updateData }
        });

        return NextResponse.json(updatedSettings, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Erro ao salvar configurações.' }, { status: 500 });
    }
}