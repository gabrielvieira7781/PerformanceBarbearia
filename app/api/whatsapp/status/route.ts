import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://129.121.35.224:8080";
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "Performance2026Key!";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ error: "UserId obrigatório" }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.whatsappInstanceName) {
      return NextResponse.json({ status: "disconnected" });
    }

    const response = await fetch(`${EVOLUTION_URL}/instance/connectionState/${user.whatsappInstanceName}`, {
      headers: { apikey: GLOBAL_API_KEY },
    });

    if (!response.ok) return NextResponse.json({ status: "disconnected" });

    const data = await response.json();
    const currentState = data.instance?.state || data.instance?.connectionStatus || "close";

    if (currentState === "open") {
      const fetchRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances?instanceName=${user.whatsappInstanceName}`, {
        headers: { apikey: GLOBAL_API_KEY },
      });
      
      const fetchData = await fetchRes.json();
      
      // O Pulo do Gato: Agora procuramos por 'name' (que veio no seu log) e 'instanceName'
      let instanceInfo = null;
      if (Array.isArray(fetchData)) {
        instanceInfo = fetchData.find(i => 
          i.name === user.whatsappInstanceName || 
          i.instanceName === user.whatsappInstanceName || 
          i.instance?.name === user.whatsappInstanceName ||
          i.instance?.instanceName === user.whatsappInstanceName
        );
        if (instanceInfo?.instance) instanceInfo = instanceInfo.instance;
      } else {
        instanceInfo = fetchData?.instance || fetchData;
      }

      // Varredura Total buscando o 'ownerJid' que vimos no seu terminal
      let phoneNumber = 
        instanceInfo?.ownerJid || 
        instanceInfo?.owner || 
        instanceInfo?.number || 
        instanceInfo?.jid ||
        null;

      if (phoneNumber) {
        phoneNumber = String(phoneNumber).split("@")[0];
        if (!phoneNumber.startsWith("+")) phoneNumber = `+${phoneNumber}`;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { 
          isWhatsappConnected: true,
          phone: phoneNumber || user.phone 
        },
      });
      
      return NextResponse.json({ 
        status: "open", 
        phone: updatedUser.phone 
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { isWhatsappConnected: false },
      });
      return NextResponse.json({ status: "disconnected" });
    }

  } catch (error) {
    console.error("Erro na rota de status:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}