import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Configurações da Evolution API (VPS)
const EVOLUTION_API_URL = process.env.EVOLUTION_URL || 'http://129.121.35.224:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'Performance2026Key!';

// ==========================================
// FUNÇÕES DE COMUNICAÇÃO COM O WHATSAPP
// ==========================================

async function sendTextMessage(instanceName: string, remoteJid: string, text: string) {
    try {
        console.log(`[WEBHOOK - AÇÃO] Enviando texto para ${remoteJid} via ${instanceName}...`);
        const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ number: remoteJid, text, delay: 1200 }) 
        });
        
        const data = await res.json().catch(() => null);
        console.log(`[EVOLUTION RES - TEXTO] Status: ${res.status} | Resposta:`, JSON.stringify(data));
        
    } catch (e) {
        console.error("[WEBHOOK - ERRO] Falha ao enviar mensagem de texto", e);
    }
}

async function sendListMessage(instanceName: string, remoteJid: string, title: string, description: string, buttonText: string, rows: any[]) {
    try {
        console.log(`[WEBHOOK - AÇÃO] Enviando lista para ${remoteJid} via ${instanceName}...`);
        
        const payload = {
            number: remoteJid,
            title: title || "Menu",
            description: description || "Selecione uma das opções abaixo:",
            buttonText: buttonText || "Ver Opções",
            footerText: "Atendimento Automático", 
            sections: [{ title: "Opções Disponíveis", rows }]
        };

        const res = await fetch(`${EVOLUTION_API_URL}/message/sendList/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json().catch(() => null);
        console.log(`[EVOLUTION RES - LISTA] Status: ${res.status} | Resposta:`, JSON.stringify(data));
        
    } catch (e) {
        console.error("[WEBHOOK - ERRO] Falha ao enviar lista interativa", e);
    }
}

async function dispararMenu(instanceName: string, remoteJid: string, stepId: string) {
    console.log(`[WEBHOOK - MENU] Buscando step ID: ${stepId}`);
    const step = await prisma.botFlowStep.findUnique({
        where: { id: stepId },
        include: { options: true }
    });

    if (!step || step.options.length === 0) {
        console.log(`[WEBHOOK - AVISO] Step não encontrado ou sem opções.`);
        return;
    }

    const rows = step.options.map(opt => ({
        title: opt.label.substring(0, 24), 
        description: opt.description ? opt.description.substring(0, 72) : "Toque para selecionar",
        rowId: `OPTION_${opt.id}` 
    }));

    await sendListMessage(
        instanceName,
        remoteJid,
        step.menuTitle,
        step.message,
        "Ver Opções",
        rows
    );
}

// ==========================================
// O RECEPTOR DE MENSAGENS (WEBHOOK PRINCIPAL)
// ==========================================

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        
        console.log('\n--- NOVA REQUISIÇÃO RECEBIDA ---');
        console.log(`[WEBHOOK - EVENTO] ${payload.event}`);

        console.log(`[WEBHOOK - DEBUG TOTAL]`, JSON.stringify(payload.data, null, 2));

        if (payload.event !== 'messages.upsert') {
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        const instanceName = payload.instance || payload.instanceName || payload.data?.instance;
        const messageData = payload.data?.message;
        const remoteJid = payload.data?.key?.remoteJid; 
        const isFromMe = payload.data?.key?.fromMe; 

        console.log(`[WEBHOOK - INFO] Instância: ${instanceName} | Remetente: ${remoteJid}`);

        if (isFromMe || !remoteJid || remoteJid.includes('@g.us') || !messageData) {
            console.log('[WEBHOOK - SKIP] Ignorado por ser grupo, mensagem própria ou vazia.');
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        const userReceiver = await prisma.user.findFirst({
            where: { whatsappInstanceName: instanceName }
        });

        if (!userReceiver || !userReceiver.barbershopId) {
            console.log(`[WEBHOOK - ERRO] Instância "${instanceName}" não está vinculada a nenhum usuário no banco.`);
            return NextResponse.json({ status: 'user_not_linked' }, { status: 200 });
        }

        const barbershopId = userReceiver.barbershopId;
        const settings = await prisma.barbershopSettings.findUnique({
            where: { barbershopId }
        });

        if (!userReceiver.botEnabled) {
            console.log(`[WEBHOOK - STOP] Robô desativado individualmente pelo barbeiro ${userReceiver.name}.`);
            return NextResponse.json({ status: 'bot_disabled_by_user' }, { status: 200 });
        }

        // O phone limpo fica APENAS para o banco de dados
        const phone = remoteJid.split('@')[0]; 
        let incomingText = '';
        
        if (messageData.conversation) {
            incomingText = messageData.conversation;
        } else if (messageData.extendedTextMessage?.text) {
            incomingText = messageData.extendedTextMessage.text;
        } else if (messageData.listResponseMessage?.singleSelectReply?.selectedRowId) {
            incomingText = messageData.listResponseMessage.singleSelectReply.selectedRowId; 
        }

        console.log(`[WEBHOOK - MENSAGEM] Conteúdo: "${incomingText}"`);

        if (!incomingText) return NextResponse.json({ status: 'no_text' }, { status: 200 });

        const textUpper = incomingText.toUpperCase().trim();
        let session = await prisma.botSession.findUnique({ where: { phone } });

        if (textUpper === 'CANCELAR' || textUpper === 'SAIR') {
            if (session) {
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE', stateData: '{}' } });
            }
            // Envia resposta usando o remoteJid oficial
            await sendTextMessage(instanceName, remoteJid, "Atendimento cancelado. Quando precisar, é só chamar! 👍");
            return NextResponse.json({ status: 'reset' }, { status: 200 });
        }

        if (!session) {
            const existingClient = await prisma.client.findFirst({
                where: { phone: { contains: phone.substring(2) }, barbershopId } 
            });

            session = await prisma.botSession.create({
                data: {
                    phone,
                    barbershopId,
                    clientId: existingClient ? existingClient.id : null,
                    step: 'IDLE',
                    stateData: '{}'
                }
            });
        }

        let stateData = JSON.parse(session.stateData || '{}');

        // 5A. DETECÇÃO DE PALAVRAS GATILHO
        const allSteps = await prisma.botFlowStep.findMany({
            where: { barbershopId, keyword: { not: null } }
        });

        let matchedStep = null;
        for (const step of allSteps) {
            if (step.keyword) {
                const words = step.keyword.split(',').map(w => w.trim().toUpperCase());
                if (words.includes(textUpper)) {
                    matchedStep = step;
                    break;
                }
            }
        }

        if (matchedStep) {
            console.log(`[WEBHOOK - GATILHO] Ativado: ${textUpper}`);
            await prisma.botSession.update({ where: { id: session.id }, data: { step: 'MENU_FLOW', stateData: '{}' } });
            // Usa o remoteJid aqui!
            await dispararMenu(instanceName, remoteJid, matchedStep.id);
            return NextResponse.json({ status: 'menu_triggered' }, { status: 200 });
        }

        // 5B. PROCESSAMENTO DE BOTÕES (OPTION_)
        if (incomingText.startsWith('OPTION_')) {
            const optionId = incomingText.replace('OPTION_', '');
            const selectedOption = await prisma.botFlowOption.findUnique({ where: { id: optionId } });

            if (selectedOption) {
                if (selectedOption.actionType === 'MENSAGEM' && selectedOption.finalMessage) {
                    await sendTextMessage(instanceName, remoteJid, selectedOption.finalMessage);
                    await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE' } });
                } 
                else if (selectedOption.actionType === 'PROXIMA_ETAPA' && selectedOption.nextStepId) {
                    await dispararMenu(instanceName, remoteJid, selectedOption.nextStepId);
                }
                else if (selectedOption.actionType === 'ACAO_SISTEMA' && selectedOption.systemAction === 'START_SCHEDULING') {
                    if (!settings?.enableAutoScheduling) {
                        await sendTextMessage(instanceName, remoteJid, "O agendamento automático está desligado. Em instantes te atenderemos manualmente! ⏳");
                        return NextResponse.json({ status: 'scheduling_off' }, { status: 200 });
                    }

                    await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_SERVICE', stateData: '{}' } });
                    
                    const services = await prisma.serviceType.findMany({
                        where: { barbershopId, isActive: true },
                        orderBy: { name: 'asc' }
                    });

                    if (services.length === 0) {
                        await sendTextMessage(instanceName, remoteJid, "Não temos serviços disponíveis no momento. 😕");
                    } else {
                        const serviceRows = services.map(s => ({
                            title: s.name.substring(0, 24),
                            description: `R$ ${s.price.toFixed(2)}`,
                            rowId: `SERVICE_${s.id}`
                        }));
                        await sendListMessage(instanceName, remoteJid, "Agendamento", "Qual serviço você deseja?", "Ver Serviços", serviceRows);
                    }
                }
            }
            return NextResponse.json({ status: 'option_processed' }, { status: 200 });
        }

        // 5C. FUNIL DE AGENDAMENTO
        switch (session.step) {
            case 'SCHEDULING_SERVICE':
                if (!incomingText.startsWith('SERVICE_')) {
                    await sendTextMessage(instanceName, remoteJid, "Por favor, selecione um serviço da lista acima.");
                    break;
                }
                const serviceId = incomingText.replace('SERVICE_', '');
                stateData.selectedServiceId = serviceId;
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_BARBER', stateData: JSON.stringify(stateData) } });
                
                const barbers = await prisma.user.findMany({
                    where: { barbershopId, isActive: true, role: { in: ['BARBER', 'ADMIN'] } }
                });

                const barberRows = barbers.map(b => ({ 
                    title: b.name.substring(0, 24), 
                    description: "Profissional disponível",
                    rowId: `BARBER_${b.id}` 
                }));
                await sendListMessage(instanceName, remoteJid, "Profissional", "Com quem você quer agendar?", "Ver Barbeiros", barberRows);
                break;

            case 'SCHEDULING_BARBER':
                if (!incomingText.startsWith('BARBER_')) {
                    await sendTextMessage(instanceName, remoteJid, "Por favor, escolha um profissional da lista.");
                    break;
                }
                stateData.selectedBarberId = incomingText.replace('BARBER_', '');
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_DATE', stateData: JSON.stringify(stateData) } });
                
                const dateRows = [
                    { title: "Hoje", description: "Ver horários de hoje", rowId: "DATE_TODAY" },
                    { title: "Amanhã", description: "Ver horários de amanhã", rowId: "DATE_TOMORROW" }
                ];
                await sendListMessage(instanceName, remoteJid, "Data", "Para quando?", "Ver Datas", dateRows);
                break;

            case 'SCHEDULING_DATE':
                await sendTextMessage(instanceName, remoteJid, "Show! Central de horários sendo ativada. Digite MENU para recomeçar. 🚀");
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE' } });
                break;

            default:
                if (textUpper.includes('AGENDAR') || textUpper.includes('CORTE')) {
                    await sendTextMessage(instanceName, remoteJid, "Olá! Para agendar, digite *MENU*.");
                }
                break;
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('[WEBHOOK - CRÍTICO]', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}