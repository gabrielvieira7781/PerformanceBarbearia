import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configurações da Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_URL || 'http://129.121.35.224:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'Performance2026Key!';

// Senha de segurança para evitar que qualquer um acesse essa rota pela internet
const CRON_SECRET = process.env.CRON_SECRET || 'senha_secreta_marketing_2026';

async function sendTextMessage(instanceName: string, number: string, text: string) {
    try {
        await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ number, text, delay: 2000 }) // Delay para simular digitação humana
        });
    } catch (e) {
        console.error(`Erro ao enviar mensagem para ${number}`, e);
    }
}

export async function GET(request: Request) {
    try {
        // 1. TRAVA DE SEGURANÇA: Verifica se quem está chamando é o nosso servidor
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        console.log('[CRON] Iniciando rotina de marketing de reativação...');

        // 2. BUSCA OS DONOS DE BARBEARIA CONECTADOS (Caminho 2 - SaaS)
        const connectedAdmins = await prisma.user.findMany({
            where: { 
                role: 'ADMIN', // Apenas o Dono manda a campanha geral
                isWhatsappConnected: true, 
                whatsappInstanceName: { not: null },
                barbershopId: { not: null }
            }
        });

        // 3. CÁLCULO DA JANELA DE 30 DIAS
        const thirtyDaysAgoStart = new Date();
        thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 30);
        thirtyDaysAgoStart.setHours(0, 0, 0, 0);

        const thirtyDaysAgoEnd = new Date();
        thirtyDaysAgoEnd.setDate(thirtyDaysAgoEnd.getDate() - 30);
        thirtyDaysAgoEnd.setHours(23, 59, 59, 999);

        let totalMessagesSent = 0;

        // 4. VARRE CADA DONO PARA DISPARAR AS CAMPANHAS
        for (const admin of connectedAdmins) {
            const instanceName = admin.whatsappInstanceName!;
            
            // Busca os detalhes da barbearia MANUALMENTE para evitar o erro de 'include' do TypeScript
            const barbershop = await prisma.barbershop.findUnique({
                where: { id: admin.barbershopId! }
            });

            if (!barbershop) continue;

            // Verifica se o dono ativou o robô nas configurações dele
            const settings = await prisma.barbershopSettings.findUnique({
                where: { barbershopId: barbershop.id }
            });

            if (!settings || !settings.botEnabled) continue;

            // Acha os clientes cujo ÚLTIMO serviço foi exatamente há 30 dias
            const clientesSumidos = await prisma.client.findMany({
                where: {
                    barbershopId: barbershop.id,
                    isActive: true,
                    phone: { not: "" }, // Garante que tem telefone
                    services: {
                        some: { date: { gte: thirtyDaysAgoStart, lte: thirtyDaysAgoEnd } },
                    },
                    NOT: {
                        services: {
                            some: { date: { gt: thirtyDaysAgoEnd } }
                        }
                    }
                }
            });

            // Dispara as mensagens
            for (const cliente of clientesSumidos) {
                let phone = cliente.phone.replace(/\D/g, ''); 
                if (phone.length === 10 || phone.length === 11) {
                    phone = `55${phone}`;
                }

                // A mensagem da campanha personalizada com o nome da barbearia
                const mensagem = `Fala ${cliente.name.split(' ')[0]}, tudo beleza? 😎\n\nAqui é do sistema da *${barbershop.name}*. \nDei uma olhada aqui e vi que já faz um tempinho que você não vem dar aquele trato no visual com a gente.\n\nQue tal agendar um horário pra essa semana? Se quiser, é só digitar *MENU* aqui mesmo que o nosso robô te mostra os horários livres! ✂️🔥`;

                // Dispara pela Evolution
                await sendTextMessage(instanceName, `${phone}@s.whatsapp.net`, mensagem);
                totalMessagesSent++;

                // Aguarda 3 segundos entre um cliente e outro (Anti-Ban Meta)
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.log(`[CRON] Rotina finalizada com sucesso. ${totalMessagesSent} mensagens de reativação enviadas.`);
        return NextResponse.json({ success: true, messagesSent: totalMessagesSent });

    } catch (error) {
        console.error('Erro Fatal no CRON de Marketing:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}