'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingUp, HandCoins, Receipt, Plus, CheckCircle2, AlertCircle, Clock, Calendar, Scissors, Filter } from 'lucide-react';

interface ServiceLog {
  id: string;
  date: string;
  clientName: string;
  serviceName: string;
  paymentMethod: string;
  baseValue: number;
  myCut: number;
  isCommissionPaid: boolean;
}

interface FinanceData {
  resumo: {
    totalRecebido: number;
    totalPendente: number;
    totalGasto: number;
    lucroReal: number;
  };
  logs: ServiceLog[];
  expenses: { id: string; description: string; amount: number; date: string }[];
  cycleDetails: { paymentCycle: string; appliedStartDate: string; appliedEndDate: string };
  settings: { allowBarberExpenses: boolean };
}

export default function MeuFinanceiroPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SERVICOS' | 'GASTOS'>('SERVICOS');

  // Filtros
  const [datePreset, setDatePreset] = useState('CICLO');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal de Lançar Gasto
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchFinanceData = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      let url = '/api/meu-financeiro';
      if (start && end) url += `?startDate=${start}&endDate=${end}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        
        // Sincroniza os inputs de data com o que a API calculou pro "Ciclo Atual"
        if (!start && !end) {
          setStartDate(json.cycleDetails.appliedStartDate);
          setEndDate(json.cycleDetails.appliedEndDate);
        }
      }
    } catch (error) {
      showToast('Erro ao carregar dados financeiros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const applyDatePreset = (type: string) => {
    setDatePreset(type);
    
    if (type === 'CICLO') {
      fetchFinanceData(); 
      return;
    }

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
      fetchFinanceData(start, end);
    }
  };

  const handleCustomSearch = () => {
    if (startDate && endDate) {
      fetchFinanceData(startDate, endDate);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc || !expAmount) return showToast('Preencha descrição e valor.', 'error');
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/meu-financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: expDesc, amount: expAmount })
      });

      if (res.ok) {
        showToast('Gasto registrado com sucesso!', 'success');
        setIsExpenseModalOpen(false);
        setExpDesc('');
        setExpAmount('');
        fetchFinanceData(startDate, endDate);
      } else {
        showToast('Erro ao salvar gasto.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const translateCycle = (cycle: string) => {
    const cycles: any = { 'DAILY': 'Diário', 'WEEKLY': 'Semanal', 'BIWEEKLY': 'Quinzenal', 'MONTHLY': 'Mensal' };
    return cycles[cycle] || cycle;
  };

  if (loading && !data) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-medium">Buscando seus resultados...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative animate-in fade-in duration-500">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Wallet className="text-[#FFD700]" size={32} />
          Meu Financeiro
        </h1>
        <p className="text-zinc-400 mt-2 text-sm md:text-base">
          Acompanhe suas comissões, serviços realizados e lucros individuais.
        </p>
      </header>

      {/* ================= BARRA DE FILTROS ================= */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl mb-6 flex flex-col md:flex-row flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[160px] w-full">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Período de Busca</label>
          <select 
            value={datePreset} 
            onChange={(e) => applyDatePreset(e.target.value)} 
            className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] text-sm"
          >
            <option value="CICLO">Meu Ciclo de Acerto ({data ? translateCycle(data.cycleDetails.paymentCycle) : ''})</option>
            <option value="HOJE">Hoje</option>
            <option value="SEMANA">Esta Semana</option>
            <option value="QUINZENA">Esta Quinzena</option>
            <option value="MES">Este Mês</option>
            <option value="CUSTOM">Data Personalizada</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[130px] w-full">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data Inicial</label>
          <input type="date" disabled={datePreset !== 'CUSTOM'} value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] disabled:opacity-50 text-sm" />
        </div>
        
        <div className="flex-1 min-w-[130px] w-full">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data Final</label>
          <input type="date" disabled={datePreset !== 'CUSTOM'} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] disabled:opacity-50 text-sm" />
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="w-full md:w-auto flex-none">
            <button onClick={handleCustomSearch} className="w-full md:w-auto bg-[#FFD700] text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-yellow-500 transition-colors">
              Filtrar
            </button>
          </div>
        )}
      </div>

      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 custom-scrollbar">
        <button onClick={() => setActiveTab('SERVICOS')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shrink-0 ${activeTab === 'SERVICOS' ? 'bg-[#FFD700] text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
          <Scissors size={18} /> Meus Serviços e Comissões
        </button>
        {data?.settings.allowBarberExpenses && (
          <button onClick={() => setActiveTab('GASTOS')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shrink-0 ${activeTab === 'GASTOS' ? 'bg-[#FFD700] text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
            <Receipt size={18} /> Meus Gastos Pessoais
          </button>
        )}
      </div>

      {/* ================= ABA SERVIÇOS E COMISSÕES ================= */}
      {activeTab === 'SERVICOS' && (
        <div className="space-y-6 animate-in fade-in">
          {/* CARDS DE RESUMO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
              <p className="text-xs text-yellow-500 font-bold uppercase mb-2 flex items-center gap-2"><Clock size={16}/> A Receber (Provisão)</p>
              <h3 className="text-2xl font-bold text-white">R$ {(data?.resumo.totalPendente || 0).toFixed(2)}</h3>
              <p className="text-[10px] text-zinc-500 mt-2">Comissões ainda não pagas pela loja</p>
            </div>

            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
              <p className="text-xs text-emerald-400 font-bold uppercase mb-2 flex items-center gap-2"><TrendingUp size={16}/> Recebido (Fechado)</p>
              <h3 className="text-2xl font-bold text-white">R$ {(data?.resumo.totalRecebido || 0).toFixed(2)}</h3>
              <p className="text-[10px] text-zinc-500 mt-2">Comissões que a loja já te pagou</p>
            </div>

            {data?.settings.allowBarberExpenses ? (
              <>
                <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
                  <p className="text-xs text-red-400 font-bold uppercase mb-2 flex items-center gap-2"><Receipt size={16}/> Gastos Pessoais</p>
                  <h3 className="text-2xl font-bold text-white">R$ {(data?.resumo.totalGasto || 0).toFixed(2)}</h3>
                  <p className="text-[10px] text-zinc-500 mt-2">No período filtrado</p>
                </div>
                <div className="p-5 rounded-xl border shadow-lg bg-zinc-900 border-[#FFD700]/30 relative overflow-hidden">
                  <p className="text-xs text-[#FFD700] font-bold uppercase mb-2 flex items-center gap-2"><HandCoins size={16}/> Seu Lucro Líquido</p>
                  <h3 className="text-2xl font-bold text-white">R$ {(data?.resumo.lucroReal || 0).toFixed(2)}</h3>
                  <p className="text-[10px] text-zinc-500 mt-2">(Recebido + A Receber) - Gastos</p>
                </div>
              </>
            ) : (
              <div className="p-5 rounded-xl border shadow-lg bg-zinc-900 border-[#FFD700]/30 sm:col-span-2 relative overflow-hidden">
                <p className="text-xs text-[#FFD700] font-bold uppercase mb-2 flex items-center gap-2"><HandCoins size={16}/> Total Gerado (Sua Parte)</p>
                <h3 className="text-2xl font-bold text-white">R$ {((data?.resumo.totalRecebido || 0) + (data?.resumo.totalPendente || 0)).toFixed(2)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2">Soma de recebidos e a receber</p>
              </div>
            )}
          </div>

          {/* LISTA DE SERVIÇOS FEITOS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6">
            <div className="p-4 md:p-5 border-b border-zinc-800 bg-black/20 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Scissors className="text-[#FFD700]" size={20} /> <span className="hidden sm:inline">Detalhamento de</span> Cortes
              </h2>
              <span className="text-xs font-bold bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full">{data?.logs.length} serviços</span>
            </div>
            
            {loading ? (
               <div className="p-8 text-center text-zinc-500">Atualizando lista...</div>
            ) : data?.logs.length === 0 ? (
               <div className="p-10 text-center">
                 <Scissors size={40} className="mx-auto text-zinc-700 mb-3" />
                 <p className="text-zinc-400">Nenhum serviço registrado neste período.</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-zinc-800/30">
                    <tr className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                      <th className="py-4 px-4 md:px-6">Data / Cliente</th>
                      <th className="py-4 px-4 md:px-6">Serviço / Método</th>
                      <th className="py-4 px-4 md:px-6 text-right">Valor</th>
                      <th className="py-4 px-4 md:px-6 text-right">Comissão</th>
                      <th className="py-4 px-4 md:px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {data?.logs.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3 px-4 md:px-6">
                          <p className="text-white font-medium text-sm line-clamp-1">{log.clientName}</p>
                          <p className="text-zinc-500 text-[10px] font-mono">{new Date(log.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </td>
                        <td className="py-3 px-4 md:px-6">
                          <p className="text-zinc-300 text-xs font-bold line-clamp-1">{log.serviceName}</p>
                          <p className={`text-[9px] uppercase font-bold mt-1 inline-block px-1.5 py-0.5 rounded ${log.paymentMethod.includes('Plano') ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                            {log.paymentMethod}
                          </p>
                        </td>
                        <td className="py-3 px-4 md:px-6 text-right font-mono text-zinc-400 text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.baseValue)}
                        </td>
                        <td className="py-3 px-4 md:px-6 text-right font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                          + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.myCut)}
                        </td>
                        <td className="py-3 px-4 md:px-6 text-center">
                          {log.isCommissionPaid ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase px-2 py-1 rounded inline-flex items-center gap-1">
                              <CheckCircle2 size={12}/> Recebido
                            </span>
                          ) : (
                            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold uppercase px-2 py-1 rounded inline-flex items-center gap-1">
                              <Clock size={12}/> Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ABA GASTOS PESSOAIS ================= */}
      {activeTab === 'GASTOS' && data?.settings.allowBarberExpenses && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in">
          <div className="p-4 md:p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/20">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Receipt className="text-[#FFD700]" /> Controle de Gastos</h2>
              <p className="text-zinc-500 text-xs mt-1">Registros pessoais para abater do seu lucro líquido.</p>
            </div>
            <button onClick={() => setIsExpenseModalOpen(true)} className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-3 sm:py-2 rounded-lg transition-all text-sm flex justify-center items-center gap-2">
              <Plus size={16} /> Lançar Gasto
            </button>
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
               <div className="p-8 text-center text-zinc-500">Atualizando lista...</div>
            ) : data.expenses.length === 0 ? (
              <div className="text-center py-10">
                <Receipt size={40} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-zinc-500 text-sm">Você não registrou nenhum gasto neste período.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.expenses.map(exp => (
                  <div key={exp.id} className="bg-black border border-zinc-800 p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <h3 className="text-white font-medium">{exp.description}</h3>
                      <p className="text-zinc-600 text-[10px] mt-1">{new Date(exp.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="text-red-400 font-mono font-bold">
                      - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL LANÇAR GASTO ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden my-auto">
            <div className="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50 sticky top-0">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><Receipt className="text-[#FFD700]" /> Novo Gasto</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Do que se trata?</label>
                <input type="text" required value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" placeholder="Ex: Máquina nova, lâminas..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Valor Gasto (R$)</label>
                <input type="number" step="0.01" required value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" placeholder="50.00" />
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="w-full py-3 bg-zinc-800 text-white font-bold rounded-lg transition-colors hover:bg-zinc-700">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#FFD700] hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}