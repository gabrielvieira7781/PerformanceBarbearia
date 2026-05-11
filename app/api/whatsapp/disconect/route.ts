import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://129.121.35.224:8080";
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "Performance2026Key!";

export async function POST(request: Request) {
  try {
    const { barbershopId } = await request.json();

    const settings = await prisma.barbershopSettings.findUnique({
      where: { barbershopId },
    });

    if (!settings || !settings.whatsappInstanceName) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    // Chama o endpoint de logout da Evolution
    await fetch(`${EVOLUTION_URL}/instance/logout/${settings.whatsappInstanceName}`, {
      method: "DELETE",
      headers: { apikey: GLOBAL_API_KEY },
    });

    // Atualiza o banco de dados desmarcando a conexão
    await prisma.barbershopSettings.update({
      where: { barbershopId },
      data: { isWhatsappConnected: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}