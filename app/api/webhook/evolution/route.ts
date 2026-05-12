import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Configurações da Evolution API (VPS)
const EVOLUTION_API_URL = process.env.EVOLUTION_URL || 'http://129.121.35.224:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'Performance2026Key!';

// ==========================================
// FUNÇÕES DE COMUNICAÇÃO COM O WHATSAPP
// ==========================================

async function sendTextMessage(instanceName: string, number: string, text: string, quotedId?: string) {
    try {
        console.log(`[WEBHOOK - AÇÃO] Enviando texto para ${number}...`);
        const payload: any = { number, text, delay: 1200 };
        
        if (quotedId) {
            payload.quoted = { key: { id: quotedId } };
        }

        await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("[WEBHOOK - ERRO] Falha ao enviar mensagem de texto", e);
    }
}

// 🚀 O NOVO PADRÃO OURO: ENQUETES CLICÁVEIS NATIVAS 🚀
async function sendPollMenu(instanceName: string, remoteJid: string, title: string, description: string, rows: any[], session: any, quotedId?: string) {
    try {
        console.log(`[WEBHOOK - AÇÃO] Enviando Menu Premium (Enquete) para ${remoteJid}...`);
        
        const pollName = `*${title}*\n${description}`;
        
        // O WhatsApp aceita no máximo 12 opções em uma enquete
        const optionsToLimit = rows.slice(0, 12);
        const options: string[] = [];
        const optionsMap: Record<string, string> = {};

        optionsToLimit.forEach((row) => {
            const optName = row.title; 
            options.push(optName);
            // Salva a qual ID interno essa opção clicada pertence
            optionsMap[optName.toUpperCase()] = row.rowId; 
        });

        // Salva o mapa de botões na memória do banco de dados
        let stateData = JSON.parse(session.stateData || '{}');
        stateData.expectedPollOptions = optionsMap;
        await prisma.botSession.update({ where: { id: session.id }, data: { stateData: JSON.stringify(stateData) } });

        const payload: any = {
            number: remoteJid,
            name: pollName,
            options: options,
            selectableCount: 1 // Força o cliente a escolher só uma bolinha
        };

        if (quotedId) payload.quoted = { key: { id: quotedId } };

        const res = await fetch(`${EVOLUTION_API_URL}/message/sendPoll/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify(payload)
        });
        
        console.log(`[EVOLUTION RES - POLL] Status: ${res.status}`);
    } catch (e) {
        console.error("[WEBHOOK - ERRO] Falha ao enviar Enquete", e);
    }
}

async function dispararMenu(instanceName: string, remoteJid: string, stepId: string, session: any, quotedId?: string) {
    const step = await prisma.botFlowStep.findUnique({
        where: { id: stepId },
        include: { options: true }
    });

    if (!step || step.options.length === 0) return;

    const rows = step.options.map(opt => ({
        title: opt.label.substring(0, 24), 
        rowId: `OPTION_${opt.id}` 
    }));

    await sendPollMenu(instanceName, remoteJid, step.menuTitle, step.message, rows, session, quotedId);
}

// ==========================================
// O RECEPTOR DE MENSAGENS (WEBHOOK PRINCIPAL)
// ==========================================

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        
        // O Webhook agora escuta MENSAGENS e VOTOS EM ENQUETES (Update)
        if (payload.event !== 'messages.upsert' && payload.event !== 'messages.update') {
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        let instanceName = payload.instance || payload.instanceName || payload.data?.instance;
        let remoteJid = '';
        let isFromMe = false;
        let messageId = '';
        let incomingText = '';
        let messageData: any = null;

        // 🎯 CAPTURA DE CLIQUES NA ENQUETE (VOTOS)
        if (payload.event === 'messages.update') {
            const updateObj = Array.isArray(payload.data) ? payload.data[0] : payload.data;
            remoteJid = updateObj?.key?.remoteJid;
            isFromMe = updateObj?.key?.fromMe;
            messageId = updateObj?.key?.id;

            console.log('\n--- VOTO DE ENQUETE RECEBIDO ---');
            console.log(`[WEBHOOK - DEBUG POLL]`, JSON.stringify(updateObj, null, 2));

            // Tenta pegar o nome do botão que o cliente clicou
            const pollUpdate = updateObj?.update?.pollUpdates?.[0];
            if (pollUpdate && pollUpdate.name) {
                incomingText = pollUpdate.name; // Achou o nome!
            } else {
                // Se a Evolution não descodificou na hora, a gente ignora esse disparo e pega no Upsert
                return NextResponse.json({ status: 'ignored_update' }, { status: 200 });
            }
        } 
        // 💬 CAPTURA DE TEXTOS E RESPOSTAS NORMAIS
        else {
            console.log('\n--- MENSAGEM RECEBIDA ---');
            messageData = payload.data?.message;
            remoteJid = payload.data?.key?.remoteJid;
            isFromMe = payload.data?.key?.fromMe;
            messageId = payload.data?.key?.id;

            if (isFromMe || !remoteJid || remoteJid.includes('@g.us') || !messageData) {
                return NextResponse.json({ status: 'ignored' }, { status: 200 });
            }

            if (messageData.conversation) incomingText = messageData.conversation;
            else if (messageData.extendedTextMessage?.text) incomingText = messageData.extendedTextMessage.text;
            else if (messageData.pollUpdateMessage) {
                const vote = messageData.pollUpdateMessage?.vote?.selectedOptions?.[0];
                if (vote) incomingText = vote;
            }
        }

        if (!incomingText) return NextResponse.json({ status: 'no_text' }, { status: 200 });
        const textUpper = incomingText.toUpperCase().trim();
        console.log(`[WEBHOOK - DADO] Cliente disse/clicou: "${textUpper}"`);

        const userReceiver = await prisma.user.findFirst({ where: { whatsappInstanceName: instanceName } });
        if (!userReceiver || !userReceiver.barbershopId || !userReceiver.botEnabled) {
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }
        const barbershopId = userReceiver.barbershopId;
        const settings = await prisma.barbershopSettings.findUnique({ where: { barbershopId } });
        const phone = remoteJid.split('@')[0]; 

        let session = await prisma.botSession.findUnique({ where: { phone } });

        if (textUpper === 'CANCELAR' || textUpper === 'SAIR') {
            if (session) await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE', stateData: '{}' } });
            await sendTextMessage(instanceName, remoteJid, "Atendimento cancelado. Quando precisar, é só chamar! 👍", messageId);
            return NextResponse.json({ status: 'reset' }, { status: 200 });
        }

        if (!session) {
            const existingClient = await prisma.client.findFirst({ where: { phone: { contains: phone.substring(2) }, barbershopId } });
            session = await prisma.botSession.create({
                data: { phone, barbershopId, clientId: existingClient?.id || null, step: 'IDLE', stateData: '{}' }
            });
        }

        let stateData = JSON.parse(session.stateData || '{}');

        // 🧠 O CÉREBRO DA ENQUETE: Transforma o Clique no ID do Sistema
        if (stateData.expectedPollOptions && stateData.expectedPollOptions[textUpper]) {
            // O cliente clicou num botão da enquete! Substituímos o texto dele pelo ID interno do botão.
            incomingText = stateData.expectedPollOptions[textUpper];
            delete stateData.expectedPollOptions; 
            await prisma.botSession.update({ where: { id: session.id }, data: { stateData: JSON.stringify(stateData) } });
            console.log(`[WEBHOOK - TRADUTOR] Clique detectado! Transformado para comando: ${incomingText}`);
        }

        // 5A. DETECÇÃO DE PALAVRAS GATILHO
        const allSteps = await prisma.botFlowStep.findMany({ where: { barbershopId, keyword: { not: null } } });
        let matchedStep = null;
        for (const step of allSteps) {
            if (step.keyword && step.keyword.split(',').map(w => w.trim().toUpperCase()).includes(textUpper)) {
                matchedStep = step;
                break;
            }
        }

        if (matchedStep) {
            await prisma.botSession.update({ where: { id: session.id }, data: { step: 'MENU_FLOW', stateData: JSON.stringify(stateData) } });
            await dispararMenu(instanceName, remoteJid, matchedStep.id, session, messageId);
            return NextResponse.json({ status: 'ok' }, { status: 200 });
        }

        // 5B. PROCESSAMENTO DE BOTÕES DE MENU (OPTION_)
        if (incomingText.startsWith('OPTION_')) {
            const optionId = incomingText.replace('OPTION_', '');
            const selectedOption = await prisma.botFlowOption.findUnique({ where: { id: optionId } });

            if (selectedOption) {
                if (selectedOption.actionType === 'MENSAGEM' && selectedOption.finalMessage) {
                    await sendTextMessage(instanceName, remoteJid, selectedOption.finalMessage, messageId);
                    await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE' } });
                } 
                else if (selectedOption.actionType === 'PROXIMA_ETAPA' && selectedOption.nextStepId) {
                    await dispararMenu(instanceName, remoteJid, selectedOption.nextStepId, session, messageId);
                }
                else if (selectedOption.actionType === 'ACAO_SISTEMA' && selectedOption.systemAction === 'START_SCHEDULING') {
                    if (!settings?.enableAutoScheduling) {
                        await sendTextMessage(instanceName, remoteJid, "O agendamento automático está desligado. Em instantes te atenderemos manualmente! ⏳", messageId);
                        return NextResponse.json({ status: 'ok' }, { status: 200 });
                    }
                    await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_SERVICE', stateData: '{}' } });
                    const services = await prisma.serviceType.findMany({ where: { barbershopId, isActive: true }, orderBy: { name: 'asc' } });

                    if (services.length === 0) {
                        await sendTextMessage(instanceName, remoteJid, "Não temos serviços disponíveis. 😕", messageId);
                    } else {
                        const serviceRows = services.map(s => ({
                            title: `${s.name} - R$ ${s.price.toFixed(2)}`, rowId: `SERVICE_${s.id}`
                        }));
                        await sendPollMenu(instanceName, remoteJid, "Agendamento", "Qual serviço você deseja?", serviceRows, session, messageId);
                    }
                }
            }
            return NextResponse.json({ status: 'ok' }, { status: 200 });
        }

        // 5C. FUNIL DE AGENDAMENTO (CADA PASSO AGORA É UMA ENQUETE)
        switch (session.step) {
            case 'SCHEDULING_SERVICE':
                if (!incomingText.startsWith('SERVICE_')) return NextResponse.json({ status: 'ok' }, { status: 200 });
                stateData.selectedServiceId = incomingText.replace('SERVICE_', '');
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_BARBER', stateData: JSON.stringify(stateData) } });
                
                const barbers = await prisma.user.findMany({ where: { barbershopId, isActive: true, role: { in: ['BARBER', 'ADMIN'] } } });
                const barberRows = barbers.map(b => ({ title: `✂️ ${b.name}`, rowId: `BARBER_${b.id}` }));
                await sendPollMenu(instanceName, remoteJid, "Profissional", "Com quem você quer cortar?", barberRows, session, messageId);
                break;

            case 'SCHEDULING_BARBER':
                if (!incomingText.startsWith('BARBER_')) return NextResponse.json({ status: 'ok' }, { status: 200 });
                stateData.selectedBarberId = incomingText.replace('BARBER_', '');
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_DATE', stateData: JSON.stringify(stateData) } });
                
                const dateRows = [ { title: "📅 Hoje", rowId: "DATE_TODAY" }, { title: "🗓️ Amanhã", rowId: "DATE_TOMORROW" } ];
                await sendPollMenu(instanceName, remoteJid, "Data", "Para quando seria?", dateRows, session, messageId);
                break;

            case 'SCHEDULING_DATE':
                await sendTextMessage(instanceName, remoteJid, "Show! Central de horários ativada. Digite MENU para recomeçar. 🚀", messageId);
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE' } });
                break;

            default:
                if (textUpper.includes('AGENDAR') || textUpper.includes('CORTE')) {
                    await sendTextMessage(instanceName, remoteJid, "Olá! Para agendar, digite *MENU*.", messageId);
                }
                break;
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('[WEBHOOK - CRÍTICO]', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}