'use client';

import { useState, useEffect } from 'react';

type Barber = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean; 
  whatsappInstanceName: string | null;
  isWhatsappConnected: boolean;
  botEnabled?: boolean; // NOVO: Propriedade para saber se o robô dele está ligado
};

export default function MensagensDashboard() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeQrCode, setActiveQrCode] = useState<{ userId: string, base64: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Busca a equipe e faz a auto-sincronização se alguém estiver sem número
  const loadBarbers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setBarbers(data);

        // === AUTO-SINCRONIZAÇÃO ===
        // Se a página carregar e tiver alguém conectado mas sem o número (Sincronizando...),
        // o frontend força a chamada na nossa rota de status (que tem a Busca Profunda)
        data.forEach(async (barber: Barber) => {
          if (barber.isWhatsappConnected && !barber.phone && barber.whatsappInstanceName) {
            try {
              const statusRes = await fetch(`/api/whatsapp/status?userId=${barber.id}`);
              const statusData = await statusRes.json();
              
              if (statusData.status === 'open' && statusData.phone) {
                // Atualiza o número na tela imediatamente se encontrou!
                setBarbers(prev => prev.map(b => b.id === barber.id ? { ...b, phone: statusData.phone } : b));
              }
            } catch (err) {
              console.error("Erro na auto-sincronização do barbeiro", barber.id);
            }
          }
        });
        // ===========================
      }
    } catch (error) {
      console.error("Falha de conexão com a API", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBarbers();
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (activeQrCode) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/whatsapp/status?userId=${activeQrCode.userId}`);
          const data = await res.json();
          
          if (data.status === 'open') {
            setActiveQrCode(null); 
            setBarbers(prev => prev.map(b => 
              b.id === activeQrCode.userId 
                ? { ...b, isWhatsappConnected: true, phone: data.phone } 
                : b
            ));
            clearInterval(intervalId);
          }
        } catch (e) {
          // Aguardando servidor
        }
      }, 3000); 
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeQrCode]);

  const handleConnect = async (userId: string) => {
    setIsProcessing(userId);
    setActiveQrCode(null);
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }), 
      });
      const data = await res.json();

      if (data.success && data.qrCodeBase64) {
        setActiveQrCode({ userId, base64: data.qrCodeBase64 });
        setBarbers(prev => prev.map(b => b.id === userId ? { ...b, whatsappInstanceName: data.instanceName } : b));
      } else {
        alert(data.error || "Erro ao gerar QR Code");
      }
    } catch (error) {
      alert("Falha de comunicação com o servidor.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDisconnect = async (userId: string, name: string) => {
    if (!confirm(`Desconectar o WhatsApp de ${name}? O robô dele vai parar.`)) return;
    
    setIsProcessing(userId);
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === userId ? { ...b, isWhatsappConnected: false, phone: null } : b));
        if (activeQrCode?.userId === userId) setActiveQrCode(null);
      }
    } catch (error) {
      alert("Erro de comunicação.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteInstance = async (userId: string, name: string) => {
    if (!confirm(`ATENÇÃO: Deseja apagar completamente a instância de ${name}? Isso forçará a limpeza da conexão no servidor para resolver bugs.`)) return;
    
    setIsProcessing(userId);
    try {
      const res = await fetch('/api/whatsapp/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === userId ? { ...b, isWhatsappConnected: false, whatsappInstanceName: null, phone: null } : b));
        if (activeQrCode?.userId === userId) setActiveQrCode(null);
        alert("Instância excluída com sucesso!");
      }
    } catch (error) {
      alert("Erro de comunicação com o servidor.");
    } finally {
      setIsProcessing(null);
    }
  };

  // NOVO: Função para Ligar/Desligar o Robô individualmente
  const handleToggleBot = async (userId: string, currentState: boolean, name: string) => {
    setIsProcessing(userId);
    try {
      const res = await fetch('/api/whatsapp/toggle-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, botEnabled: !currentState }),
      });
      
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === userId ? { ...b, botEnabled: !currentState } : b));
      } else {
        alert("Erro ao alterar o status do robô.");
      }
    } catch (error) {
      alert("Erro de comunicação com o servidor.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-800">Conexões de WhatsApp</h1>
        <p className="text-gray-500 mt-2">Gerencie os números de WhatsApp individuais de cada barbeiro da sua equipe.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          Carregando equipe...
        </div>
      ) : barbers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Nenhum barbeiro cadastrado. Cadastre-os na tela de Gestão de Equipe primeiro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <div 
              key={barber.id} 
              className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col transition-all ${!barber.isActive ? 'opacity-60 bg-gray-50' : 'hover:shadow-md'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-gray-800">{barber.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md tracking-wider uppercase">
                      {barber.role}
                    </span>
                  </div>
                  
                  {!barber.isActive && (
                    <p className="text-xs text-red-500 font-medium mb-1">Colaborador Bloqueado</p>
                  )}
                  
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    
                    {barber.isWhatsappConnected 
                      ? (barber.phone ? barber.phone : "Sincronizando número...") 
                      : barber.whatsappInstanceName 
                        ? "Aguardando leitura do QR..."
                        : "Sem conexão criada"}
                  </p>
                </div>
                
                {barber.isWhatsappConnected ? (
                  <span className="flex items-center text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1.5"></div>
                    ONLINE
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-1.5"></div>
                    OFFLINE
                  </span>
                )}
              </div>

              {/* NOVO: Botão Switch de Ligar/Desligar Robô Individual */}
              <div className="flex items-center justify-between mt-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700">Robô Automático</span>
                  <span className="text-[10px] text-gray-500">Ative ou pause o bot deste número</span>
                </div>
                <button
                  onClick={() => handleToggleBot(barber.id, barber.botEnabled ?? true, barber.name)}
                  disabled={isProcessing === barber.id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${barber.botEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${barber.botEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100">
                {activeQrCode?.userId === barber.id ? (
                  <div className="flex flex-col items-center">
                    <img src={activeQrCode.base64} alt="QR Code" className="w-48 h-48 object-contain rounded-xl border p-2 mb-3 bg-white shadow-sm" />
                    <p className="text-xs text-center text-gray-500 mb-4 px-2">Aponte a câmera do WhatsApp. Fechará sozinho ao conectar.</p>
                    <button 
                      onClick={() => setActiveQrCode(null)}
                      className="text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors w-full"
                    >
                      Cancelar / Fechar
                    </button>
                  </div>
                ) : barber.isWhatsappConnected ? (
                  <button 
                    onClick={() => handleDisconnect(barber.id, barber.name)}
                    disabled={isProcessing === barber.id}
                    className="w-full py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium rounded-lg transition-all disabled:opacity-50"
                  >
                    {isProcessing === barber.id ? 'Desconectando...' : 'Desconectar Aparelho'}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleConnect(barber.id)}
                    disabled={isProcessing === barber.id || !barber.isActive} 
                    className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 font-medium rounded-lg transition-all disabled:opacity-50 shadow-sm"
                  >
                    {!barber.isActive 
                      ? 'Profissional Bloqueado' 
                      : isProcessing === barber.id ? 'Iniciando (Aguarde 6s)...' : 'Gerar QR Code'}
                  </button>
                )}

                {barber.whatsappInstanceName && !activeQrCode && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => handleDeleteInstance(barber.id, barber.name)}
                      disabled={isProcessing === barber.id}
                      className="text-xs font-medium text-gray-400 hover:text-red-600 hover:underline transition-colors disabled:opacity-50"
                    >
                      {isProcessing === barber.id ? 'Excluindo...' : 'Excluir Instância (Resetar Erros)'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}