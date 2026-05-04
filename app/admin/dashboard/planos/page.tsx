// app/admin/dashboard/planos/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Crown, Plus, CheckCircle2, AlertCircle, CalendarDays, Scissors, Edit2, Ban, Trash2, ShieldCheck, X, Lock } from 'lucide-react';
import Link from 'next/link';

interface ServiceType {
  id: string;
  name: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  maxCuts: number;
  billingCycle: string;
  isActive: boolean;
  services: ServiceType[];
}

export default function GestaoPlanosPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null = carregando verificação
  const [planos, setPlanos] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [availableServices, setAvailableServices] = useState<ServiceType[]>([]);
  
  // Form States
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [maxCuts, setMaxCuts] = useState('');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    // Verificação de Segurança (Bloqueio de Tela)
    const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    const permsMatch = document.cookie.match(new RegExp('(^| )user_permissions=([^;]+)'));
    
    const role = roleMatch ? roleMatch[2] : '';
    let permissions: string[] = [];
    try { 
      if (permsMatch) permissions = JSON.parse(decodeURIComponent(permsMatch[2])); 
    } catch (e) {}

    // É ADMIN ou tem a permissão específica 'manage_plans'?
    if (role === 'ADMIN' || permissions.includes('admin_panel') || permissions.includes('manage_plans')) {
      setHasAccess(true);
      fetchData(); // Só carrega os dados se tiver acesso
    } else {
      setHasAccess(false);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resPlanos = await fetch('/api/planos');
      if (resPlanos.ok) setPlanos(await resPlanos.json());

      const resServices = await fetch('/api/services');
      if (resServices.ok) setAvailableServices(await resServices.json());
    } catch (error) {
      showToast('Erro ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingPlanId(null);
    setName('');
    setPrice('');
    setMaxCuts('');
    setBillingCycle('MONTHLY');
    setSelectedServiceIds([]);
  };

  const startEditing = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setName(plan.name);
    setPrice(plan.price.toString());
    setMaxCuts(plan.maxCuts.toString());
    setBillingCycle(plan.billingCycle);
    setSelectedServiceIds(plan.services.map(s => s.id));
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !maxCuts) return showToast('Preencha os dados principais do plano.', 'error');
    if (selectedServiceIds.length === 0) return showToast('Selecione pelo menos um serviço para o plano.', 'error');

    setIsSubmitting(true);
    try {
      const url = editingPlanId ? `/api/planos/${editingPlanId}` : '/api/planos';
      const method = editingPlanId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          price: parseFloat(price.replace(',', '.')),
          maxCuts: parseInt(maxCuts, 10),
          billingCycle,
          serviceIds: selectedServiceIds
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(editingPlanId ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!', 'success');
        resetForm();
        fetchData();
      } else {
        showToast(data.message || 'Erro ao salvar plano.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlock = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Deseja realmente ${currentStatus ? 'desativar' : 'ativar'} este plano?`)) return;
    try {
      const res = await fetch(`/api/planos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        showToast(`Plano ${currentStatus ? 'desativado' : 'ativado'} com sucesso!`, 'success');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.message, 'error');
      }
    } catch (error) {
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ATENÇÃO: Deseja excluir este plano definitivamente? Se ele tiver clientes ativos, o sistema bloqueará a exclusão.')) return;
    try {
      const res = await fetch(`/api/planos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Plano excluído.', 'success');
        fetchData();
      } else {
        showToast(data.message, 'error');
      }
    } catch (error) {
      showToast('Erro ao excluir.', 'error');
    }
  };

  const getCycleLabel = (cycle: string) => {
    const labels: Record<string, string> = { MONTHLY: '/mês', QUARTERLY: '/trim.', SEMIANNUAL: '/sem.', ANNUAL: '/ano' };
    return labels[cycle] || '/ciclo';
  };

  // Se ainda estiver carregando os cookies de permissão, tela preta
  if (hasAccess === null) return <div className="min-h-screen bg-black" />;

  // Se não tiver acesso, renderiza o Cadeado de Bloqueio
  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Lock size={48} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Acesso Restrito</h1>
        <p className="text-zinc-400 max-w-md mb-8">
          Você não tem permissão para visualizar ou gerenciar os Planos de Assinatura. Solicite acesso ao Administrador.
        </p>
        <Link href="/dashboard" className="bg-[#FFD700] text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-500 transition-colors">
          Voltar ao Início
        </Link>
      </div>
    );
  }

  // Renderiza a tela normal se tiver acesso
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Crown className="text-[#FFD700]" size={32} />
          Clube de Assinatura
        </h1>
        <p className="text-zinc-400 mt-2">Crie, edite e gerencie pacotes para fidelizar clientes.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário Lateral */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSavePlan} className={`bg-zinc-900 border ${editingPlanId ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-zinc-800'} rounded-lg p-6 sticky top-6 transition-all`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingPlanId ? <Edit2 className="text-blue-400" size={20} /> : <Plus className="text-[#FFD700]" size={20} />}
                {editingPlanId ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              {editingPlanId && (
                <button type="button" onClick={resetForm} className="text-zinc-500 hover:text-white" title="Cancelar Edição">
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome do Pacote</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                  placeholder="Ex: Plano Barba Feita"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Ciclo</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] appearance-none"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMIANNUAL">Semestral</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                    placeholder="89.90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Qtd. de Serviços por Ciclo</label>
                <input
                  type="number"
                  value={maxCuts}
                  onChange={(e) => setMaxCuts(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                  placeholder="Ex: 4 (ou 999 para ilimitado)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2 mt-4">Quais serviços entram no plano? *</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto bg-black p-3 rounded border border-zinc-800 custom-scrollbar">
                  {availableServices.length === 0 ? (
                    <span className="text-zinc-600 text-xs italic">Nenhum serviço cadastrado na barbearia.</span>
                  ) : (
                    availableServices.map(service => (
                      <label key={service.id} className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer hover:text-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedServiceIds.includes(service.id)}
                          onChange={(e) => {
                            if(e.target.checked) setSelectedServiceIds([...selectedServiceIds, service.id]);
                            else setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                          }}
                          className="accent-[#FFD700] w-4 h-4 cursor-pointer"
                        />
                        {service.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-bold rounded py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${editingPlanId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#FFD700] hover:bg-yellow-500 text-black'}`}
                >
                  {isSubmitting ? 'Salvando...' : (editingPlanId ? 'Salvar Alterações' : 'Criar Plano VIP')}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Lista de Planos */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {loading ? (
              <div className="xl:col-span-2 text-center py-12 text-zinc-500">Carregando planos...</div>
            ) : planos.length === 0 ? (
              <div className="xl:col-span-2 p-12 text-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
                Nenhum plano cadastrado. Comece a criar seu clube!
              </div>
            ) : (
              planos.map((plano) => (
                <div key={plano.id} className={`bg-black border ${!plano.isActive ? 'border-red-900/30 opacity-60' : 'border-zinc-800'} p-6 rounded-xl hover:border-[#FFD700] transition-colors relative overflow-hidden group flex flex-col h-full`}>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                    <Crown size={80} className="text-[#FFD700]" />
                  </div>
                  
                  {/* Botões de Ação no Canto */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    <button onClick={() => startEditing(plano)} className="p-1.5 bg-zinc-900 rounded text-blue-400 hover:text-blue-300 transition-colors border border-zinc-800 hover:border-blue-500/50" title="Editar">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleToggleBlock(plano.id, plano.isActive)} className={`p-1.5 bg-zinc-900 rounded transition-colors border border-zinc-800 ${plano.isActive ? 'text-orange-400 hover:text-orange-300 hover:border-orange-500/50' : 'text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50'}`} title={plano.isActive ? 'Desativar' : 'Ativar'}>
                      {plano.isActive ? <Ban size={14} /> : <ShieldCheck size={14} />}
                    </button>
                    <button onClick={() => handleDelete(plano.id)} className="p-1.5 bg-zinc-900 rounded text-red-500 hover:text-red-400 transition-colors border border-zinc-800 hover:border-red-500/50" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="relative z-10 flex-1 mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-white uppercase tracking-wider">{plano.name}</h3>
                      {!plano.isActive && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold uppercase">Desativado</span>}
                    </div>
                    <div className="flex items-end gap-1 mb-4">
                      <span className="text-3xl font-black text-[#FFD700]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plano.price)}
                      </span>
                      <span className="text-sm text-zinc-500 mb-1">{getCycleLabel(plano.billingCycle)}</span>
                    </div>
                    
                    <div className="space-y-2 mt-4 pb-4 border-b border-zinc-800/50">
                      <div className="flex items-center gap-2 text-zinc-300 text-sm">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <span>{plano.maxCuts === 999 ? 'Uso Ilimitado' : `Máx. de ${plano.maxCuts} serviços/ciclo`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-300 text-sm">
                        <CalendarDays size={16} className="text-blue-500 shrink-0" />
                        <span>Cobrança {plano.billingCycle === 'MONTHLY' ? 'Mensal' : plano.billingCycle === 'QUARTERLY' ? 'Trimestral' : plano.billingCycle === 'SEMIANNUAL' ? 'Semestral' : 'Anual'}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
                        <Scissors size={12} /> Cobre os serviços:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plano.services && plano.services.length > 0 ? (
                          plano.services.map(s => (
                            <span key={s.id} className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded border border-zinc-700">
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-600 text-xs italic">Nenhum atrelado.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}