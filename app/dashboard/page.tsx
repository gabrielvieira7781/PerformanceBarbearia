'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, Scissors, Calendar, Filter, User as UserIcon, Edit2, Trash2, X, CheckCircle2, AlertCircle, Package } from 'lucide-react';
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [datePreset, setDatePreset] = useState('HOJE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  
  const [hasManagerPrivileges, setHasManagerPrivileges] = useState(false);
  const [canEditLogs, setCanEditLogs] = useState(false);

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

  const applyDatePreset = useCallback((type: string) => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today.getTime() - offset);
    
    const format = (d: Date) => d.toISOString().split('T')[0];

    let start = '';
    let end = '';

    if (type === 'HOJE') {
      start = format(localDate);
      end = format(localDate);
    } else if (type === 'SEMANA') {
      const first = new Date(localDate);
      const day = first.getDay();
      const diff = first.getDate() - day + (day === 0 ? -6 : 1);
      first.setDate(diff);
      const last = new Date(first);
      last.setDate(first.getDate() + 6);
      start = format(first);
      end = format(last);
    } else if (type === 'QUINZENA') {
      const first = new Date(localDate);
      if (first.getDate() <= 15) {
        first.setDate(1);
        const last = new Date(localDate.getFullYear(), localDate.getMonth(), 15);
        start = format(first);
        end = format(last);
      } else {
        first.setDate(16);
        const last = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
        start = format(first);
        end = format(last);
      }
    } else if (type === 'MES') {
      const first = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
      const last = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
      start = format(first);
      end = format(last);
    }

    if (type !== 'CUSTOM') {
      setStartDate(start);
      setEndDate(end);
    }
  }, []);

  useEffect(() => {
    applyDatePreset('HOJE');
  }, [applyDatePreset]);

  const fetchDashboardData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ startDate, endDate, barberId: selectedBarberId }).toString();
      const res = await fetch(`/api/dashboard/stats?${query}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBarberId]);

  useEffect(() => {
    const checkPerms = () => {
      const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
      const permsMatch = document.cookie.match(new RegExp('(^| )user_permissions=([^;]+)'));
      
      const role = roleMatch ? roleMatch[2] : '';
      let permissions: string[] = [];
      try { if (permsMatch) permissions = JSON.parse(decodeURIComponent(permsMatch[2])); } catch (e) {}

      if (role === 'ADMIN' || permissions.includes('admin_panel') || permissions.includes('view_all_stats')) {
        setHasManagerPrivileges(true);
      }

      if (role === 'ADMIN' || permissions.includes('admin_panel')) {
        setCanEditLogs(true);
        fetchClients();
        fetchServices();
      }
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
  }, [fetchDashboardData]);

  const openEditModal = (log: any) => {
    setEditingLog(log);
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
    } catch (error) { showToast('Erro de conexão.', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Deseja excluir este lançamento? Se foi pago pelo Plano VIP, o limite do cliente será devolvido.')) return;
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Lançamento excluído!', 'success');
        fetchDashboardData();
      } else { showToast('Erro ao excluir.', 'error'); }
    } catch (error) { showToast('Erro de conexão.', 'error'); }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative animate-in fade-in duration-500">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-zinc-400 mt-1 text-sm md:text-base">Acompanhe o desempenho e histórico de atendimentos.</p>
        </div>
      </header>

      {/* ================= BARRA DE FILTROS ================= */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl mb-6 flex flex-col md:flex-row flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[140px] w-full">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Período</label>
          <select 
            value={datePreset} 
            onChange={(e) => {
              setDatePreset(e.target.value);
              if (e.target.value !== 'CUSTOM') applyDatePreset(e.target.value);
            }} 
            className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] text-sm"
          >
            <option value="HOJE">Hoje</option>
            <option value="SEMANA">Esta Semana</option>
            <option value="QUINZENA">Esta Quinzena</option>
            <option value="MES">Este Mês</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[130px] w-full">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data Inicial</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => { setStartDate(e.target.value); setDatePreset('CUSTOM'); }} 
            className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] text-sm hover:border-zinc-700 transition-colors" 
          />
        </div>
        
        <div className="flex-1 min-w-[130px] w-full">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data Final</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => { setEndDate(e.target.value); setDatePreset('CUSTOM'); }} 
            className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] text-sm hover:border-zinc-700 transition-colors" 
          />
        </div>

        {hasManagerPrivileges && (
          <div className="flex-1 min-w-[140px] w-full">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><UserIcon size={12}/> Equipe</label>
            <select value={selectedBarberId} onChange={e => setSelectedBarberId(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] text-sm">
              <option value="">Todos</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name.split(' ')[0]}</option>
              ))}
            </select>
          </div>
        )}

        {datePreset === 'CUSTOM' && (
          <div className="w-full md:w-auto flex-none">
            <button onClick={fetchDashboardData} className="w-full md:w-auto bg-[#FFD700] text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2">
              <Filter size={16} /> Filtrar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={80} className="text-[#FFD700]" /></div>
          <h3 className="text-zinc-400 font-medium text-xs md:text-sm uppercase tracking-wider">Faturamento Total</h3>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.stats.revenue || 0)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Scissors size={80} className="text-white" /></div>
          <h3 className="text-zinc-400 font-medium text-xs md:text-sm uppercase tracking-wider">Vendas & Serviços</h3>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2">{data?.stats.services || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group sm:col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={80} className="text-white" /></div>
          <h3 className="text-zinc-400 font-medium text-xs md:text-sm uppercase tracking-wider">Novos Clientes</h3>
          <p className="text-2xl md:text-3xl font-bold text-white mt-2">{data?.stats.newClients || 0}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-black/20">
          <h3 className="text-xl font-bold text-white">Histórico de Lançamentos</h3>
          <Link href="/dashboard/servicos" className="w-full sm:w-auto bg-[#FFD700] text-black font-bold px-4 py-3 sm:py-2 rounded-lg hover:bg-yellow-500 transition-all text-sm flex items-center justify-center gap-2">
            <Scissors size={16} /> Lançar Nova Venda
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
             Carregando atendimentos...
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="p-4 bg-zinc-800/50 rounded-full mb-4"><Scissors size={40} className="text-zinc-600" /></div>
            <p className="text-zinc-500 max-w-xs">Nenhum registro encontrado para este período.</p>
          </div>
        ) : (
          <>
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
                    <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md border border-zinc-700 font-medium flex items-center gap-1">
                      {log.product ? <Package size={12}/> : <Scissors size={12}/>}
                      {log.serviceType?.name || log.product?.name || 'Item'}
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
                          <button onClick={() => openEditModal(log)} className="p-2 bg-zinc-800 rounded text-blue-400"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteLog(log.id)} className="p-2 bg-zinc-800 rounded text-red-500"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-zinc-800/30 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    <th className="py-4 px-6">Data/Hora</th>
                    <th className="py-4 px-6">Cliente</th>
                    <th className="py-4 px-6">Item Vendido</th>
                    {hasManagerPrivileges && <th className="py-4 px-6">Profissional</th>}
                    <th className="py-4 px-6 text-center">Pagamento</th>
                    <th className="py-4 px-6 text-right">Valor Final</th>
                    {canEditLogs && <th className="py-4 px-6 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="py-4 px-6 text-zinc-400 text-sm font-mono">
                        {new Date(log.date).toLocaleDateString('pt-BR')} <br/>
                        <span className="text-[10px] opacity-50">{new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="py-4 px-6"><span className="text-white font-medium block">{log.client?.name}</span></td>
                      <td className="py-4 px-6">
                        <span className="bg-zinc-800 text-zinc-300 text-[11px] px-2 py-1 rounded-md border border-zinc-700 font-medium inline-flex items-center gap-1">
                          {log.product ? <Package size={12}/> : <Scissors size={12}/>}
                          {log.serviceType?.name || log.product?.name || 'Item'}
                        </span>
                      </td>
                      {hasManagerPrivileges && (
                        <td className="py-4 px-6"><span className="text-zinc-400 text-sm">{log.user?.name.split(' ')[0]}</span></td>
                      )}
                      <td className="py-4 px-6 text-center">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold border inline-flex items-center gap-1 ${log.paymentMethod.includes('Plano') || log.paymentMethod === 'PLANO_VIP' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
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
            <div className="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50 sticky top-0 z-10">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><Edit2 className="text-[#FFD700]" /> Corrigir Lançamento</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cliente</label>
                <select value={editClientId} onChange={(e) => setEditClientId(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Profissional que Atendeu</label>
                <select value={editUserId} onChange={(e) => setEditUserId(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]">
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Serviço Realizado (Opcional se for produto)</label>
                <select value={editServiceId} onChange={(e) => {
                    setEditServiceId(e.target.value);
                    const selectedService = services.find(s => s.id === e.target.value);
                    if (selectedService) setEditPrice(selectedService.price.toString());
                  }} 
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                >
                  <option value="">Manter o mesmo ou alterar para serviço...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Valor Cobrado (R$)</label>
                  <input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full bg-black border border-zinc-800 text-[#FFD700] font-bold rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Pagamento</label>
                  <select value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]">
                    <option value="Dinheiro">💵 Dinheiro</option>
                    <option value="Pix">💠 Pix</option>
                    <option value="Débito">💳 Débito</option>
                    <option value="Crédito">💳 Crédito</option>
                    <option value="Plano VIP">👑 Plano VIP</option>
                    <option value="Plano">👑 Plano</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#FFD700] hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50">
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