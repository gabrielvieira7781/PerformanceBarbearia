// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Scissors, Calendar, Filter, User as UserIcon, ArrowRight, Edit2, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    revenue: number;
    services: number;
    newClients: number;
  };
  logs: any[];
}

interface Barber {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

const getLocalDate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  
  // Listas para os filtros e para o Modal de Edição
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());
  const [selectedBarberId, setSelectedBarberId] = useState('');
  
  // Permissões
  const [hasManagerPrivileges, setHasManagerPrivileges] = useState(false);
  const [canEditLogs, setCanEditLogs] = useState(false);

  // Estados de Edição do Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  
  const [editClientId, setEditClientId] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        barberId: selectedBarberId
      }).toString();

      const res = await fetch(`/api/dashboard/stats?${query}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkPerms = () => {
      const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
      const permsMatch = document.cookie.match(new RegExp('(^| )user_permissions=([^;]+)'));
      
      const role = roleMatch ? roleMatch[2] : '';
      let permissions: string[] = [];
      try { 
        if (permsMatch) permissions = JSON.parse(decodeURIComponent(permsMatch[2])); 
      } catch (e) {}

      if (role === 'ADMIN' || permissions.includes('admin_panel') || permissions.includes('view_all_stats')) {
        setHasManagerPrivileges(true);
      }

      if (role === 'ADMIN' || permissions.includes('admin_panel')) {
        setCanEditLogs(true);
        // Se pode editar, precisa da lista completa de clientes e serviços
        fetchClients();
        fetchServices();
      }
      
      // Sempre busca os barbeiros (para o filtro e para a edição)
      fetchBarbers();
    };

    const fetchBarbers = async () => {
      const res = await fetch('/api/team');
      if (res.ok) setBarbers(await res.json());
    };

    const fetchClients = async () => {
      const res = await fetch('/api/clientes');
      if (res.ok) setClients(await res.json());
    };

    const fetchServices = async () => {
      const res = await fetch('/api/services');
      if (res.ok) setServices(await res.json());
    };

    checkPerms();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, selectedBarberId]);

  const openEditModal = (log: any) => {
    setEditingLog(log);
    
    // Preenche os campos com os dados atuais do lançamento
    setEditClientId(log.client?.id || '');
    setEditUserId(log.user?.id || '');
    setEditServiceId(log.serviceType?.id || '');
    setEditPrice(log.priceCharged.toString());
    setEditPaymentMethod(log.paymentMethod);
    
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/logs/${editingLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceCharged: editPrice, 
          paymentMethod: editPaymentMethod,
          clientId: editClientId,
          userId: editUserId,
          serviceTypeId: editServiceId
        })
      });

      if (res.ok) {
        showToast('Lançamento atualizado com sucesso!', 'success');
        setIsEditModalOpen(false);
        fetchDashboardData();
      } else {
        showToast('Erro ao atualizar.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Deseja excluir este lançamento? Se foi pago pelo Plano VIP, o limite do cliente será devolvido.')) return;
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Lançamento excluído!', 'success');
        fetchDashboardData();
      } else {
        showToast('Erro ao excluir.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão.', 'error');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-zinc-400 mt-1 text-sm md:text-base">Acompanhe o desempenho e histórico de atendimentos.</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2 px-3 border-b sm:border-b-0 sm:border-r border-zinc-800 pb-2 sm:pb-0 w-full sm:w-auto">
            <Calendar size={16} className="text-[#FFD700] shrink-0" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none w-full sm:w-auto"
            />
            <ArrowRight size={14} className="text-zinc-600 shrink-0" />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none w-full sm:w-auto"
            />
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto px-3">
            {hasManagerPrivileges && (
              <div className="flex items-center gap-2 flex-1">
                <UserIcon size={16} className="text-[#FFD700]" />
                <select
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  className="bg-transparent text-white text-sm focus:outline-none cursor-pointer w-full max-w-[150px] truncate"
                >
                  <option value="">Toda a Equipe</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.name.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            )}
            
            <button 
              onClick={fetchDashboardData}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-[#FFD700] sm:text-zinc-400 hover:text-white"
              title="Atualizar dados"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} className="text-[#FFD700]" />
          </div>
          <h3 className="text-zinc-400 font-medium text-xs md:text-sm uppercase tracking-wider">Faturamento</h3>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.stats.revenue || 0)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Scissors size={80} className="text-white" />
          </div>
          <h3 className="text-zinc-400 font-medium text-xs md:text-sm uppercase tracking-wider">Serviços Feitos</h3>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2">{data?.stats.services || 0}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group sm:col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={80} className="text-white" />
          </div>
          <h3 className="text-zinc-400 font-medium text-xs md:text-sm uppercase tracking-wider">Novos Clientes</h3>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2">{data?.stats.newClients || 0}</p>
        </div>
      </div>

      {/* Histórico de Lançamentos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h3 className="text-xl font-bold text-white">Histórico de Lançamentos</h3>
          <Link 
            href="/dashboard/servicos"
            className="bg-[#FFD700] text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-500 transition-all text-sm flex items-center justify-center gap-2"
          >
            <Scissors size={16} />
            Lançar Novo Serviço
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
             Carregando atendimentos...
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="p-4 bg-zinc-800/50 rounded-full mb-4">
              <Scissors size={40} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 max-w-xs">Nenhum serviço encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <>
            {/* VERSÃO MOBILE (CARDS) */}
            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {data.logs.map((log) => (
                <div key={log.id} className="bg-black border border-zinc-800 rounded-lg p-4 flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-white font-bold block text-lg">{log.client?.name}</span>
                      <span className="text-zinc-500 text-xs font-mono">
                        {new Date(log.date).toLocaleDateString('pt-BR')} às {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[#FFD700] font-black text-lg">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.priceCharged)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md border border-zinc-700 font-medium">
                      {log.serviceType?.name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-md font-medium border flex items-center gap-1 ${log.paymentMethod.includes('Plano') || log.paymentMethod === 'PLANO_VIP' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                      {log.paymentMethod}
                    </span>
                  </div>

                  {hasManagerPrivileges && (
                    <div className="text-xs text-zinc-500 flex justify-between items-center pt-3 border-t border-zinc-800/50 mt-1">
                      <span>Feito por: <strong className="text-zinc-300">{log.user?.name.split(' ')[0]}</strong></span>
                      
                      {canEditLogs && (
                        <div className="flex gap-2">
                          <button onClick={() => openEditModal(log)} className="p-1.5 bg-zinc-800 rounded text-blue-400"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 bg-zinc-800 rounded text-red-500"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* VERSÃO DESKTOP (TABELA) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-800/30 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    <th className="py-4 px-6">Data/Hora</th>
                    <th className="py-4 px-6">Cliente</th>
                    <th className="py-4 px-6">Serviço</th>
                    {hasManagerPrivileges && <th className="py-4 px-6">Profissional</th>}
                    <th className="py-4 px-6">Pagamento</th>
                    <th className="py-4 px-6 text-right">Valor Final</th>
                    {canEditLogs && <th className="py-4 px-6 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="py-4 px-6 text-zinc-400 text-sm font-mono">
                        {new Date(log.date).toLocaleDateString('pt-BR')} <br/>
                        <span className="text-[10px] opacity-50">
                          {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-white font-medium block">{log.client?.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-zinc-800 text-zinc-300 text-[11px] px-2 py-1 rounded-md border border-zinc-700 font-medium">
                          {log.serviceType?.name}
                        </span>
                      </td>
                      {hasManagerPrivileges && (
                        <td className="py-4 px-6">
                          <span className="text-zinc-400 text-sm">{log.user?.name.split(' ')[0]}</span>
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <span className={`text-xs px-2 py-1 rounded-md font-medium border inline-flex items-center gap-1 ${log.paymentMethod.includes('Plano') || log.paymentMethod === 'PLANO_VIP' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                          {log.paymentMethod}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-white font-bold group-hover:text-[#FFD700] transition-colors">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.priceCharged)}
                        </span>
                      </td>
                      {canEditLogs && (
                        <td className="py-4 px-6 text-center">
                           <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openEditModal(log)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-blue-400 transition-colors" title="Editar"><Edit2 size={16}/></button>
                             <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 bg-zinc-800 hover:bg-red-500/20 rounded text-red-500 transition-colors" title="Excluir"><Trash2 size={16}/></button>
                           </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL DE EDIÇÃO AVANÇADA */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animation-scale-up overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden my-auto">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="text-[#FFD700]" /> Corrigir Lançamento
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              
              {/* Editar Cliente */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cliente</label>
                <select
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Editar Profissional */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Profissional que Atendeu</label>
                <select
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                >
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Editar Serviço */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Serviço Realizado</label>
                <select
                  value={editServiceId}
                  onChange={(e) => {
                    setEditServiceId(e.target.value);
                    // Opcional: Se mudar o serviço, atualiza o preço para o valor padrão do novo serviço
                    const selectedService = services.find(s => s.id === e.target.value);
                    if (selectedService) setEditPrice(selectedService.price.toString());
                  }}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Editar Valor Final */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Valor Final Cobrado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-[#FFD700] font-bold rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Já com descontos aplicados</span>
                </div>

                {/* Editar Forma de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Pagamento</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                  >
                    <option value="Dinheiro">💵 Dinheiro</option>
                    <option value="Pix">💠 Pix</option>
                    <option value="Débito">💳 Débito</option>
                    <option value="Crédito">💳 Crédito</option>
                    <option value="Plano VIP">👑 Plano VIP</option>
                    <option value="Plano">👑 Plano</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#FFD700] hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}