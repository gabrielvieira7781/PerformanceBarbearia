'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, CheckCircle2, AlertCircle, HandCoins, Star, Award, Gift } from 'lucide-react';

interface SettingsData {
  allowBarberExpenses: boolean;
  whatsappInstanceName: string | null;
  whatsappApiKey: string | null;
  isWhatsappConnected: boolean;
  enablePointsLoyalty: boolean;
  pointsMultiplier: number;
  pointsDiscountValue: number;
  enableStampsLoyalty: boolean;
  stampsRequiredForReward: number;
  stampRewardDescription: string;
}

interface ServiceType {
  id: string;
  name: string;
  isActive: boolean;
}

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]); // NOVO: Estado para guardar os serviços
  const [loading, setLoading] = useState(true);
  
  const [waInstance, setWaInstance] = useState('');
  const [waToken, setWaToken] = useState('');
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);

  // NOVO: Controle de como o prêmio será preenchido (Serviço do catálogo ou Texto livre)
  const [rewardMode, setRewardMode] = useState<'CATALOG' | 'MANUAL'>('CATALOG');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Busca as configurações
        const resConfig = await fetch('/api/configuracoes');
        if (resConfig.ok) {
          const data = await resConfig.json();
          setSettings(data);
          setWaInstance(data.whatsappInstanceName || '');
          setWaToken(data.whatsappApiKey || '');
          
          // Verifica se a descrição atual já é algum dos serviços (faremos isso após buscar os serviços)
        }

        // Busca o catálogo de serviços para preencher o select
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

  // Lógica para definir se o select mostra "MANUAL" ou um Serviço, baseando-se no que já estava salvo no banco.
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
    setSettings({ ...settings, [field]: newValue });

    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
      });

      if (res.ok) {
        showToast('Configuração atualizada!', 'success');
      } else {
        setSettings({ ...settings, [field]: !newValue }); 
        showToast('Erro ao salvar.', 'error');
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
          Gerencie as permissões globais e módulos ativos da sua barbearia.
        </p>
      </header>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Carregando configurações...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLUNA ESQUERDA */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/50 pb-4">
                <Shield className="text-blue-400" size={24} />
                <h2 className="text-xl font-bold text-white">Módulos da Equipe</h2>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <HandCoins size={16} className="text-[#FFD700]"/>
                    Controle de Gastos Pessoais
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1 max-w-sm">
                    Permite que os barbeiros registrem suas próprias despesas (ex: lâminas, golas) na tela "Meu Financeiro". Esses valores abatem apenas do lucro deles, não interferindo no caixa geral.
                  </p>
                </div>
                <div onClick={() => handleToggleSetting('allowBarberExpenses')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.allowBarberExpenses ? '#22c55e' : '#3f3f46' }}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.allowBarberExpenses ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            {/* CARD: INTEGRAÇÕES (WHATSAPP) MANTIDO OCULTO */}
          </div>

          {/* COLUNA DIREITA - PROGRAMAS DE FIDELIDADE */}
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
                    <HandCoins size={16} className="text-blue-400"/>
                    Cashback (Pontos por R$)
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1">O cliente acumula pontos baseados no valor gasto. Os pontos geram descontos na hora do PDV.</p>
                </div>
                <div onClick={() => handleToggleSetting('enablePointsLoyalty')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enablePointsLoyalty ? '#22c55e' : '#3f3f46' }}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enablePointsLoyalty ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              {settings?.enablePointsLoyalty && (
                <div className="bg-black border border-zinc-800 p-4 rounded-lg grid grid-cols-2 gap-4 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">A cada R$ 1 ganha:</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.1" value={settings.pointsMultiplier} onChange={(e) => setSettings({...settings, pointsMultiplier: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:border-[#FFD700] outline-none" />
                      <span className="text-zinc-500 text-xs">Pontos</span>
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
              )}
            </div>

            {/* Módulo 2: Cartão de Selos */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Award size={16} className="text-orange-400"/>
                    Cartão Fidelidade (Selos)
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1">O cliente ganha 1 selo a cada serviço realizado. Ao atingir a meta, ganha um brinde ou serviço.</p>
                </div>
                <div onClick={() => handleToggleSetting('enableStampsLoyalty')} className="w-12 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300 shrink-0" style={{ backgroundColor: settings?.enableStampsLoyalty ? '#22c55e' : '#3f3f46' }}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings?.enableStampsLoyalty ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              {settings?.enableStampsLoyalty && (
                <div className="bg-black border border-zinc-800 p-4 rounded-lg space-y-4 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Quantidade de Selos para o Brinde</label>
                    <input type="number" value={settings.stampsRequiredForReward} onChange={(e) => setSettings({...settings, stampsRequiredForReward: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:border-[#FFD700] outline-none" />
                  </div>
                  
                  {/* NOVO: SELETOR DE PRÊMIO INTELIGENTE */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Gift size={12}/> O que o cliente ganha?</label>
                    
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
                        placeholder="Ex: 1 Pomada Modeladora, Desconto de 20%, etc..." 
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
      )}
    </div>
  );
}