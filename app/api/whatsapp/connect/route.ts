import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://129.121.35.224:8080";
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "Performance2026Key!";
const SYSTEM_WEBHOOK_URL = process.env.WEBHOOK_URL || "https://api.performancesystems.com.br/api/webhook/evolution";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "O ID do Usuário (Barbeiro) é obrigatório." }, { status: 400 });
    }

    // 1. Gera um nome de instância único usando o ID do barbeiro
    const cleanId = userId.replace(/[^a-zA-Z0-9]/g, "");
    const instanceName = `barber_${cleanId}`;

    // 2. Chama a Evolution API
    const createResponse = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: GLOBAL_API_KEY,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        rejectCall: false,
        readMessages: false,
        webhook: {
          url: SYSTEM_WEBHOOK_URL,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"], 
        },
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok && !createData.error?.includes("already exists")) {
      return NextResponse.json({ error: "Falha ao criar instância no servidor do WhatsApp." }, { status: 500 });
    }

    const instanceToken = createData?.hash?.apikey || createData?.hash || null;

    // 3. Atualiza direto na tabela do Usuário (Barbeiro)
    await prisma.user.update({
      where: { id: userId },
      data: {
        whatsappInstanceName: instanceName,
        ...(instanceToken && { whatsappToken: instanceToken }),
      },
    });

    // 4. Aguarda a Meta gerar a criptografia
    await new Promise((resolve) => setTimeout(resolve, 6000));

    // 5. Busca o QR Code
    const qrResponse = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { apikey: GLOBAL_API_KEY },
    });

    const qrData = await qrResponse.json();

    if (!qrData.base64) {
      return NextResponse.json({ 
        error: "O WhatsApp demorou muito para responder. Tente novamente em instantes." 
      }, { status: 408 });
    }

    return NextResponse.json({
      success: true,
      instanceName: instanceName,
      qrCodeBase64: qrData.base64,
    });

  } catch (error) {
    console.error("Erro interno ao conectar WhatsApp:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}