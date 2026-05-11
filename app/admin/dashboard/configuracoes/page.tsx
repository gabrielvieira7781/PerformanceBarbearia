'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, CheckCircle2, AlertCircle, HandCoins, Star, Award, Gift, Megaphone, CalendarHeart, ClockAlert, MessageSquarePlus, CalendarDays, BellRing } from 'lucide-react';

interface SettingsData {
  allowBarberExpenses: boolean;
  
  enablePointsLoyalty: boolean;
  pointsMultiplier: number;
  pointsDiscountValue: number;
  
  enableStampsLoyalty: boolean;
  stampsRequiredForReward: number;
  stampRewardDescription: string;
  
  enableBirthdayPromo: boolean;
  enableReactivationPromo: boolean;
  enableReviewRequest: boolean;
  
  enableAutoScheduling: boolean;
  enableAutoReminders: boolean;
  enableCashbackAlerts: boolean;
}

interface ServiceType {
  id: string;
  name: string;
  isActive: boolean;
}

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);

  const [rewardMode, setRewardMode] = useState<'CATALOG' | 'MANUAL'>('CATALOG');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resConfig = await fetch('/api/configuracoes');
        if (resConfig.ok) {
          const data = await resConfig.json();
          setSettings(data);
        }

        const resServices = await fetch('/api/services');
        if (resServices.ok) {
          const srvData = await resServices.json();
          const activeServices = srvData.filter((s: ServiceType) => s.isActive);
          setServices(activeServices);
        }

      } catch (error) {
        showToast('Erro ao carregar configurações.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (settings && services.length > 0) {
      const isCatalogService = services.some(s => s.name === settings.stampRewardDescription);
      if (settings.stampRewardDescription && !isCatalogService) {
        setRewardMode('MANUAL');
      }
    }
  }, [settings?.stampRewardDescription, services.length]);

  const handleToggleSetting = async (field: keyof SettingsData) => {
    if (!settings) return;
    const newValue = !settings[field];
    
    // Atualiza otimista na tela
    setSettings({ ...settings, [field]: newValue });

    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
      });

      if (res.ok) {
        showToast('Status atualizado!', 'success');
      } else {
        // Reverte se der erro
        setSettings({ ...settings, [field]: !newValue }); 
        showToast('Erro ao salvar configuração.', 'error');
      }
    } catch (error) {
      setSettings({ ...settings, [field]: !newValue });
      showToast('Erro de conexão.', 'error');
    }
  };

  const handleSaveLoyaltyRules = async () => {
    if (!settings) return;
    if (settings.enableStampsLoyalty && !settings.stampRewardDescription) {
       return showToast('Selecione ou digite o prêmio dos selos!', 'error');
    }

    setIsSavingLoyalty(true);
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pointsMultiplier: settings.pointsMultiplier,
          pointsDiscountValue: settings.pointsDiscountValue,
          stampsRequiredForReward: settings.stampsRequiredForReward,
          stampRewardDescription: settings.stampRewardDescription
        })
      });
      if (res.ok) {
        showToast('Regras de fidelidade atualizadas!', 'success');
      } else {
        showToast('Erro ao salvar regras.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsSavingLoyalty(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="text-[#FFD700]" size={32} />
          Configurações do Sistema
        </h1>
        <p className="text-zinc-400 mt-2 text-sm md:text-base">
          Ative ou desative as funções avançadas, robôs de atendimento e regras do negócio.
        </p>
      </header>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Carregando módulos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLUNA ESQUERDA - OPERACIONAL E AGENDAMENTO */}
          <div className="space-y-6">
            
            {/* MÓDULO AGENDAMENTO */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
                <CalendarDays className="text-blue-400" size={24} />
                <h2 className="text-xl font-bold text-white">Agendamento & WhatsApp</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 pb-6 border-b border-zinc-800/50">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <CalendarDays size={16} className="text-blue-400"/>
                      Agendamento pelo Robô
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">
                      Permite que o cliente interaja com o robô no WhatsApp para ver os serviços, escolher o barbeiro e marcar o horário sozinho.
                    </p>
                  </div>
                  <div onClick={() => handleToggleSetting('enableAutoScheduling')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableAutoScheduling ? '#22c55e' : '#3f3f46' }}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableAutoScheduling ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <BellRing size={16} className="text-purple-400"/>
                      Lembretes Automáticos
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">
                      O robô envia uma mensagem automaticamente 2 horas antes do agendamento lembrando o cliente do corte. Reduz faltas drasticamente.
                    </p>
                  </div>
                  <div onClick={() => handleToggleSetting('enableAutoReminders')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableAutoReminders ? '#22c55e' : '#3f3f46' }}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableAutoReminders ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* MÓDULO EQUIPE */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
                <Shield className="text-emerald-400" size={24} />
                <h2 className="text-xl font-bold text-white">Módulos da Equipe</h2>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <HandCoins size={16} className="text-emerald-400"/>
                    Controle de Gastos Pessoais
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-sm">
                    Permite que os barbeiros registrem suas próprias despesas na tela "Meu Financeiro", abatendo apenas da comissão deles.
                  </p>
                </div>
                <div onClick={() => handleToggleSetting('allowBarberExpenses')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.allowBarberExpenses ? '#22c55e' : '#3f3f46' }}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.allowBarberExpenses ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA - MARKETING E FIDELIDADE */}
          <div className="space-y-6">

            {/* MÓDULO MARKETING */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
                <Megaphone className="text-pink-500" size={24} />
                <h2 className="text-xl font-bold text-white">Marketing Automatizado</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 pb-6 border-b border-zinc-800/50">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <CalendarHeart size={16} className="text-pink-400"/>
                      Mensagens de Aniversário
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">O robô envia uma mensagem de parabéns automática no dia do aniversário do cliente para gerar relacionamento.</p>
                  </div>
                  <div onClick={() => handleToggleSetting('enableBirthdayPromo')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableBirthdayPromo ? '#22c55e' : '#3f3f46' }}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableBirthdayPromo ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 pb-6 border-b border-zinc-800/50">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <ClockAlert size={16} className="text-orange-400"/>
                      Reativação (Clientes Sumidos)
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">Acorda clientes que não cortam o cabelo há mais de 30 dias com uma mensagem chamativa e link de agendamento.</p>
                  </div>
                  <div onClick={() => handleToggleSetting('enableReactivationPromo')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableReactivationPromo ? '#22c55e' : '#3f3f46' }}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableReactivationPromo ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <MessageSquarePlus size={16} className="text-emerald-400"/>
                      Pesquisa de Satisfação (Pós-Venda)
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">Horas após finalizar o serviço, o robô pede uma avaliação (nota de 1 a 5) para medir a satisfação do atendimento.</p>
                  </div>
                  <div onClick={() => handleToggleSetting('enableReviewRequest')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableReviewRequest ? '#22c55e' : '#3f3f46' }}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableReviewRequest ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* MÓDULO FIDELIDADE */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
                <Star className="text-[#FFD700]" size={24} />
                <h2 className="text-xl font-bold text-white">Programas de Fidelidade</h2>
              </div>

              {/* Módulo 1: Cashback */}
              <div className="mb-6 pb-6 border-b border-zinc-800/50">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <HandCoins size={16} className="text-[#FFD700]"/>
                      Cashback (Pontos)
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">O cliente ganha pontos com base no valor gasto para usar como desconto futuramente.</p>
                  </div>
                  <div onClick={() => handleToggleSetting('enablePointsLoyalty')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enablePointsLoyalty ? '#22c55e' : '#3f3f46' }}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enablePointsLoyalty ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>

                {settings?.enablePointsLoyalty && (
                  <div className="bg-black border border-zinc-800 p-4 rounded-lg animate-in fade-in space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">A cada R$ 1 ganha:</label>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.1" value={settings.pointsMultiplier} onChange={(e) => setSettings({...settings, pointsMultiplier: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:border-[#FFD700] outline-none" />
                          <span className="text-zinc-500 text-xs">Pts</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cada ponto vale:</label>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs">R$</span>
                          <input type="number" step="0.01" value={settings.pointsDiscountValue} onChange={(e) => setSettings({...settings, pointsDiscountValue: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:border-[#FFD700] outline-none" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Botão de Aviso de Cashback (Condicional) */}
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <span className="text-xs text-zinc-400">Avisar cliente do ganho via WhatsApp?</span>
                      <div onClick={() => handleToggleSetting('enableCashbackAlerts')} className="w-10 h-5 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableCashbackAlerts ? '#22c55e' : '#3f3f46' }}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableCashbackAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Módulo 2: Cartão de Selos */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <Award size={16} className="text-[#FFD700]"/>
                      Cartão Fidelidade (Selos)
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">1 selo a cada serviço. Ao atingir a meta, ganha um brinde ou serviço.</p>
                  </div>
                  <div onClick={() => handleToggleSetting('enableStampsLoyalty')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableStampsLoyalty ? '#22c55e' : '#3f3f46' }}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableStampsLoyalty ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>

                {settings?.enableStampsLoyalty && (
                  <div className="bg-black border border-zinc-800 p-4 rounded-lg space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Selos para o Brinde</label>
                      <input type="number" value={settings.stampsRequiredForReward} onChange={(e) => setSettings({...settings, stampsRequiredForReward: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:border-[#FFD700] outline-none" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Gift size={12}/> Prêmio de Conclusão</label>
                      <select
                        value={rewardMode === 'CATALOG' ? settings.stampRewardDescription : 'MANUAL'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'MANUAL') {
                            setRewardMode('MANUAL');
                            setSettings({...settings, stampRewardDescription: ''});
                          } else {
                            setRewardMode('CATALOG');
                            setSettings({...settings, stampRewardDescription: val});
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:border-[#FFD700] outline-none appearance-none"
                      >
                        <option value="" disabled>-- Selecione um Prêmio --</option>
                        {services.map(srv => (
                          <option key={srv.id} value={srv.name}>{srv.name}</option>
                        ))}
                        <option value="MANUAL">+ Outro prêmio (Digitar manualmente)</option>
                      </select>

                      {rewardMode === 'MANUAL' && (
                        <input 
                          type="text" 
                          value={settings.stampRewardDescription} 
                          onChange={(e) => setSettings({...settings, stampRewardDescription: e.target.value})} 
                          placeholder="Ex: 1 Pomada Modeladora" 
                          className="w-full bg-zinc-900 border border-[#FFD700]/50 text-white rounded px-3 py-2 text-sm focus:border-[#FFD700] outline-none mt-2 animate-in slide-in-from-top-2" 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Salvar Regras */}
              {(settings?.enablePointsLoyalty || settings?.enableStampsLoyalty) && (
                <button 
                  onClick={handleSaveLoyaltyRules}
                  disabled={isSavingLoyalty}
                  className="w-full bg-[#FFD700] hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {isSavingLoyalty ? 'Salvando...' : 'Salvar Regras de Fidelidade'}
                </button>
              )}

            </div>
          </div>

        </div>
      )}
    </div>
  );
}