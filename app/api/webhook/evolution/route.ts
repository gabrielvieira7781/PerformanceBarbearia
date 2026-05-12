import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Configurações da Evolution API (VPS)
const EVOLUTION_API_URL = process.env.EVOLUTION_URL || 'http://129.121.35.224:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'Performance2026Key!';

// ==========================================
// FUNÇÕES DE COMUNICAÇÃO COM O WHATSAPP
// ==========================================

async function sendTextMessage(instanceName: string, number: string, text: string) {
    try {
        console.log(`[WEBHOOK - AÇÃO] Enviando texto para ${number} via ${instanceName}...`);
        await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ number, text, delay: 1200 }) // Delay simula o bot digitando
        });
    } catch (e) {
        console.error("[WEBHOOK - ERRO] Falha ao enviar mensagem de texto", e);
    }
}

async function sendListMessage(instanceName: string, number: string, title: string, description: string, buttonText: string, rows: any[]) {
    try {
        console.log(`[WEBHOOK - AÇÃO] Enviando lista iterativa para ${number} via ${instanceName}...`);
        await fetch(`${EVOLUTION_API_URL}/message/sendList/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({
                number,
                title,
                description,
                buttonText,
                sections: [{ title: "Selecione uma opção", rows }]
            })
        });
    } catch (e) {
        console.error("[WEBHOOK - ERRO] Falha ao enviar lista interativa", e);
    }
}

// Função auxiliar para enviar um fluxo de menu específico
async function dispararMenu(instanceName: string, remoteJid: string, stepId: string) {
    console.log(`[WEBHOOK - MENU] Montando menu ID: ${stepId}`);
    const step = await prisma.botFlowStep.findUnique({
        where: { id: stepId },
        include: { options: true }
    });

    if (!step || step.options.length === 0) {
        console.log(`[WEBHOOK - AVISO] Menu não encontrado ou sem opções configuradas.`);
        return;
    }

    // Converte as opções do banco de dados no formato de Lista do WhatsApp
    const rows = step.options.map(opt => ({
        title: opt.label,
        description: opt.description || '',
        rowId: `OPTION_${opt.id}` // O ID secreto que usaremos para saber o que ele clicou
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
        
        // LOG 1: Disparo inicial
        console.log('\n=============================================');
        console.log(`[WEBHOOK - START] Recebendo evento: ${payload.event}`);

        // 1. FILTRO DE SEGURANÇA: Só aceitamos mensagens novas
        if (payload.event !== 'messages.upsert') {
            console.log('[WEBHOOK - STOP] Evento ignorado (não é messages.upsert).');
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        const instanceName = payload.instance;
        const messageData = payload.data.message;
        const remoteJid = payload.data.key.remoteJid; // O número de telefone
        const isFromMe = payload.data.key.fromMe; // Se a barbearia quem mandou do próprio celular

        console.log(`[WEBHOOK - INFO] Instância: ${instanceName} | De: ${remoteJid} | isFromMe: ${isFromMe}`);

        // Ignora status, mensagens de grupos e mensagens enviadas pelo próprio dono
        if (isFromMe || remoteJid.includes('@g.us') || !messageData) {
            console.log('[WEBHOOK - STOP] Ignorado: Mensagem do próprio aparelho, grupo ou sem corpo.');
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        // 2. IDENTIFICA QUEM RECEBEU A MENSAGEM (Novo fluxo de Arquitetura SaaS)
        const userReceiver = await prisma.user.findFirst({
            where: { whatsappInstanceName: instanceName }
        });

        if (!userReceiver || !userReceiver.barbershopId) {
            console.log(`[WEBHOOK - STOP] Usuário dono da instância "${instanceName}" não encontrado ou sem barbearia atrelada.`);
            return NextResponse.json({ status: 'user_not_found' }, { status: 200 });
        }

        const barbershopId = userReceiver.barbershopId;
        console.log(`[WEBHOOK - INFO] Barbearia Identificada: ID ${barbershopId} (User: ${userReceiver.name})`);

        // 2.1. VERIFICA SE A BARBEARIA DESTE USUÁRIO ATIVOU O ROBÔ
        const settings = await prisma.barbershopSettings.findUnique({
            where: { barbershopId: barbershopId }
        });

        if (!settings || !settings.botEnabled) {
            console.log(`[WEBHOOK - STOP] Robô desativado nas configurações da barbearia.`);
            return NextResponse.json({ status: 'bot_disabled' }, { status: 200 });
        }

        const phone = remoteJid.split('@')[0]; 

        // 3. CAPTURA A MENSAGEM DO CLIENTE
        let incomingText = '';
        if (messageData.conversation) {
            incomingText = messageData.conversation;
        } else if (messageData.extendedTextMessage?.text) {
            incomingText = messageData.extendedTextMessage.text;
        } else if (messageData.listResponseMessage?.singleSelectReply?.selectedRowId) {
            incomingText = messageData.listResponseMessage.singleSelectReply.selectedRowId; 
        }

        console.log(`[WEBHOOK - TEXTO] Cliente digitou/clicou: "${incomingText}"`);

        if (!incomingText) {
            console.log('[WEBHOOK - STOP] Nenhuma extração de texto válida (talvez enviou imagem/áudio puro).');
            return NextResponse.json({ status: 'no_text' }, { status: 200 });
        }

        const textUpper = incomingText.toUpperCase().trim();

        // 4. INICIA OU RECUPERA A MEMÓRIA DO ROBÔ (SESSÃO)
        let session = await prisma.botSession.findUnique({ where: { phone } });
        console.log(`[WEBHOOK - SESSÃO] Sessão encontrada? ${session ? 'Sim (Step: ' + session.step + ')' : 'Não. Criando nova...'}`);

        // Escape: Se ele digitar CANCELAR ou SAIR
        if (textUpper === 'CANCELAR' || textUpper === 'SAIR') {
            console.log(`[WEBHOOK - AÇÃO] Cliente solicitou cancelamento do fluxo.`);
            if (session) {
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE', stateData: '{}' } });
            }
            await sendTextMessage(instanceName, remoteJid, "Tudo bem! Cancelamos o atendimento atual. Quando quiser falar comigo novamente, é só mandar um 'Oi' ou 'Menu'. 👍");
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

        // ==========================================
        // MÁQUINA DE INTELIGÊNCIA ARTIFICIAL
        // ==========================================

        // 5A. DETECÇÃO DE PALAVRAS GATILHO (Menu Livre)
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
            console.log(`[WEBHOOK - GATILHO] Palavra-chave acionada: "${textUpper}". Redirecionando para o menu...`);
            await prisma.botSession.update({ where: { id: session.id }, data: { step: 'MENU_FLOW', stateData: '{}' } });
            await dispararMenu(instanceName, remoteJid, matchedStep.id);
            return NextResponse.json({ status: 'menu_triggered' }, { status: 200 });
        }

        // 5B. PROCESSAMENTO DE NAVEGAÇÃO DE MENU (Ele clicou num botão customizado)
        if (incomingText.startsWith('OPTION_')) {
            console.log(`[WEBHOOK - BOTÃO] Cliente clicou na opção ID: ${incomingText}`);
            const optionId = incomingText.replace('OPTION_', '');
            const selectedOption = await prisma.botFlowOption.findUnique({ where: { id: optionId } });

            if (selectedOption) {
                if (selectedOption.actionType === 'MENSAGEM' && selectedOption.finalMessage) {
                    console.log(`[WEBHOOK - AÇÃO] Entregando mensagem final do fluxo.`);
                    await sendTextMessage(instanceName, remoteJid, selectedOption.finalMessage);
                    await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE' } });
                } 
                else if (selectedOption.actionType === 'PROXIMA_ETAPA' && selectedOption.nextStepId) {
                    console.log(`[WEBHOOK - AÇÃO] Pulando para a próxima etapa do fluxo.`);
                    await dispararMenu(instanceName, remoteJid, selectedOption.nextStepId);
                }
                else if (selectedOption.actionType === 'ACAO_SISTEMA' && selectedOption.systemAction === 'START_SCHEDULING') {
                    console.log(`[WEBHOOK - AÇÃO] Iniciando inteligência de agendamento.`);
                    if (!settings.enableAutoScheduling) {
                        console.log(`[WEBHOOK - AVISO] Agendamento bloqueado nas configurações da barbearia.`);
                        await sendTextMessage(instanceName, remoteJid, "O agendamento automático está temporariamente desativado. Por favor, aguarde um momento que já te atendo! ⏳");
                        return NextResponse.json({ status: 'scheduling_disabled' }, { status: 200 });
                    }

                    await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_SERVICE', stateData: '{}' } });
                    
                    const services = await prisma.serviceType.findMany({
                        where: { barbershopId, isActive: true },
                        orderBy: { name: 'asc' }
                    });

                    if (services.length === 0) {
                        await sendTextMessage(instanceName, remoteJid, "No momento não temos serviços cadastrados para agendamento. 😕");
                    } else {
                        const serviceRows = services.map(s => ({
                            title: s.name,
                            description: `R$ ${s.price.toFixed(2)} - Aprox. ${s.duration}min`,
                            rowId: `SERVICE_${s.id}`
                        }));
                        await sendListMessage(instanceName, remoteJid, "Agendamento", "Perfeito! Qual serviço você quer realizar hoje?", "Ver Serviços", serviceRows);
                    }
                }
            }
            return NextResponse.json({ status: 'option_processed' }, { status: 200 });
        }

        // 5C. FUNIL DE AGENDAMENTO INTELIGENTE (As etapas travadas da barbearia)
        console.log(`[WEBHOOK - FUNIL] Processando passo travado da sessão: ${session.step}`);
        switch (session.step) {
            
            case 'SCHEDULING_SERVICE':
                if (!incomingText.startsWith('SERVICE_')) {
                    console.log(`[WEBHOOK - FUNIL] Resposta inválida para seleção de serviço.`);
                    await sendTextMessage(instanceName, remoteJid, "Por favor, clique no botão acima para selecionar um serviço válido da lista.");
                    break;
                }

                const serviceId = incomingText.replace('SERVICE_', '');
                stateData.selectedServiceId = serviceId;

                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_BARBER', stateData: JSON.stringify(stateData) } });

                const barbers = await prisma.user.findMany({
                    where: { barbershopId, isActive: true, role: { in: ['BARBER', 'ADMIN'] } },
                    orderBy: { name: 'asc' }
                });

                const barberRows = barbers.map(b => ({
                    title: b.name.split(' ')[0],
                    description: "Disponível para agendamento",
                    rowId: `BARBER_${b.id}`
                }));

                await sendListMessage(instanceName, remoteJid, "Escolha o Profissional", "Boa escolha! Com quem você gostaria de ser atendido?", "Ver Profissionais", barberRows);
                break;

            case 'SCHEDULING_BARBER':
                if (!incomingText.startsWith('BARBER_')) {
                    await sendTextMessage(instanceName, remoteJid, "Por favor, clique no botão e escolha um profissional da lista.");
                    break;
                }

                const barberId = incomingText.replace('BARBER_', '');
                stateData.selectedBarberId = barberId;

                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'SCHEDULING_DATE', stateData: JSON.stringify(stateData) } });

                const dateRows = [
                    { title: "Hoje", description: "Ver horários para hoje", rowId: "DATE_TODAY" },
                    { title: "Amanhã", description: "Ver horários para amanhã", rowId: "DATE_TOMORROW" }
                ];

                await sendListMessage(instanceName, remoteJid, "Escolha o Dia", "Certo! Para quando vamos agendar?", "Ver Dias", dateRows);
                break;

            case 'SCHEDULING_DATE':
                if (!incomingText.startsWith('DATE_')) {
                    await sendTextMessage(instanceName, remoteJid, "Por favor, selecione Hoje ou Amanhã na lista acima.");
                    break;
                }

                await sendTextMessage(instanceName, remoteJid, "Show! Como ainda estamos ativando a central de horários da agenda, este é o fim do seu teste de integração! O cérebro está ligado. Para testar de novo digite MENU. 🚀");
                await prisma.botSession.update({ where: { id: session.id }, data: { step: 'IDLE' } });
                break;

            case 'IDLE':
            default:
                if (textUpper.includes('AGENDAR') || textUpper.includes('CORTE') || textUpper.includes('CORTAR')) {
                    console.log(`[WEBHOOK - IDLE] Detectada intenção de agendamento solta.`);
                    await sendTextMessage(instanceName, remoteJid, "Vi que você quer dar um trato no visual! Digite *MENU* para acessar as opções e marcar seu horário.");
                } else {
                    console.log(`[WEBHOOK - IDLE] Mensagem genérica ignorada (Sessão livre).`);
                }
                break;
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('[WEBHOOK - ERRO FATAL]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}