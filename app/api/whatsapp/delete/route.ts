import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://129.121.35.224:8080";
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "Performance2026Key!";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "O ID do Usuário é obrigatório." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // 1. Vai na Evolution API e destrói a instância à força (se ela existir lá)
    if (user.whatsappInstanceName) {
      try {
        await fetch(`${EVOLUTION_URL}/instance/delete/${user.whatsappInstanceName}?force=true`, {
          method: "DELETE",
          headers: { apikey: GLOBAL_API_KEY },
        });
      } catch (evoError) {
        console.error("Aviso: Instância já não existia na Evolution ou falhou ao apagar lá.", evoError);
      }
    }

    // 2. Limpa todos os rastros do WhatsApp no seu banco de dados para este barbeiro
    await prisma.user.update({
      where: { id: userId },
      data: {
        whatsappInstanceName: null,
        whatsappToken: null,
        isWhatsappConnected: false,
        phone: null, // Limpa o telefone para puxar o novo depois
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro interno ao excluir instância:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}