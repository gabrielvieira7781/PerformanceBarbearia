// app/admin/dashboard/financeiro/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Scissors, CheckCircle2, AlertCircle, HandCoins, Receipt, DollarSign, CalendarClock, Plus, TrendingUp, TrendingDown, Edit2, Trash2, Clock, PieChart, Tag, ArrowUpCircle, ArrowDownCircle, Calendar, Filter } from 'lucide-react';

interface Log {
  id: string;
  priceCharged: number;
  date: string;
  paymentMethod: string;
  serviceType: { name: string, price: number };
  client: { name: string };
}

interface BarberReport {
  barber: { id: string; name: string; commissionRate: number; paymentCycle: string };
  logs: Log[];
  totalGenerated: number;
  commissionValue: number;
  servicesCount: number;
}

interface FinancialRecord {
  id: string;
  type: string; 
  amount: number;
  description: string;
  category?: string; 
  status: string; 
  dueDate: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  createdAt?: string;
}

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<'COMISSOES' | 'DESPESAS' | 'RESUMO'>('RESUMO');
  const [reports, setReports] = useState<BarberReport[]>([]);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ================= FILTROS INTELIGENTES =================
  const [datePreset, setDatePreset] = useState('MES');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [methodFilter, setMethodFilter] = useState('TODOS');

  const applyDatePreset = useCallback((type: string) => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today.getTime() - offset);
    
    const format = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'HOJE') {
      setStartDate(format(localDate));
      setEndDate(format(localDate));
    } else if (type === 'SEMANA') {
      const first = new Date(localDate);
      const day = first.getDay();
      const diff = first.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
      first.setDate(diff);
      const last = new Date(first);
      last.setDate(first.getDate() + 6);
      setStartDate(format(first));
      setEndDate(format(last));
    } else if (type === 'QUINZENA') {
      const first = new Date(localDate);
      if (first.getDate() <= 15) {
        first.setDate(1);
        const last = new Date(localDate.getFullYear(), localDate.getMonth(), 15);
        setStartDate(format(first));
        setEndDate(format(last));
      } else {
        first.setDate(16);
        const last = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
        setStartDate(format(first));
        setEndDate(format(last));
      }
    } else if (type === 'MES') {
      const first = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
      const last = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
      setStartDate(format(first));
      setEndDate(format(last));
    }
  }, []);

  useEffect(() => {
    applyDatePreset('MES');
  }, [applyDatePreset]);

  // ================= ESTADOS DOS MODAIS =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BarberReport | null>(null);
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('FIXA');
  const [expStatus, setExpStatus] = useState('PAID');
  const [expPaymentMethod, setExpPaymentMethod] = useState('');
  
  const getTodayStr = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };

  const [expDueDate, setExpDueDate] = useState(getTodayStr());
  const [expPaidAt, setExpPaidAt] = useState(getTodayStr());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financeiro/comissoes');
      if (res.ok) setReports(await res.json());
    } catch (error) {
      showToast('Erro ao carregar comissões.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financeiro');
      if (res.ok) setRecords(await res.json());
    } catch (error) {
      showToast('Erro ao carregar registros financeiros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'COMISSOES') fetchCommissions();
    if (activeTab === 'DESPESAS' || activeTab === 'RESUMO') fetchRecords();
  }, [activeTab]);

  // ================= FILTRAGEM DOS DADOS =================
  const filteredRecords = records.filter(r => {
    // 1. Filtro de Data
    let recordDate = r.createdAt?.split('T')[0];
    if (r.type === 'EXPENSE') {
      recordDate = r.paidAt ? r.paidAt.split('T')[0] : (r.dueDate ? r.dueDate.split('T')[0] : recordDate);
    } else {
      recordDate = r.paidAt ? r.paidAt.split('T')[0] : recordDate;
    }

    if (recordDate) {
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
    }

    // 2. Filtro de Status
    if (statusFilter !== 'TODOS') {
      if (r.status !== statusFilter) return false;
    }

    // 3. Filtro de Método de Pagamento
    if (methodFilter !== 'TODOS') {
      const recordMethod = r.paymentMethod || '';
      const desc = r.description.toLowerCase();
      const methodStr = methodFilter.toLowerCase();
      
      const matchesMethod = recordMethod.toLowerCase() === methodStr || desc.includes(methodStr);
      if (!matchesMethod) return false;
    }

    return true;
  });

  // ================= CÁLCULOS DO RESUMO =================
  const faturamentoTotal = filteredRecords.filter(r => r.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const recebido = filteredRecords.filter(r => r.type === 'INCOME' && r.status !== 'PENDING').reduce((a, b) => a + b.amount, 0); 
  const aReceber = filteredRecords.filter(r => r.type === 'INCOME' && r.status === 'PENDING').reduce((a, b) => a + b.amount, 0); 
  
  const pago = filteredRecords.filter(r => r.type === 'EXPENSE' && r.status === 'PAID').reduce((a, b) => a + b.amount, 0);
  const pendingExpensesAmount = filteredRecords.filter(r => r.type === 'EXPENSE' && r.status === 'PENDING').reduce((a, b) => a + b.amount, 0);
  const pendingCommissionsAmount = reports.reduce((acc, rep) => acc + rep.commissionValue, 0);
  
  // Total que falta sair do caixa
  const aPagar = pendingExpensesAmount + pendingCommissionsAmount;

  const saldoReal = recebido - pago;
  const saldoPrevisto = saldoReal + aReceber - aPagar;

  const totalCommissions = filteredRecords.filter(r => r.type === 'EXPENSE' && r.status === 'PAID' && r.description.includes('Comissão')).reduce((a, b) => a + b.amount, 0);
  const totalFixed = filteredRecords.filter(r => r.type === 'EXPENSE' && r.status === 'PAID' && r.category === 'FIXA').reduce((a, b) => a + b.amount, 0);
  const totalVariable = filteredRecords.filter(r => r.type === 'EXPENSE' && r.status === 'PAID' && (!r.category || r.category === 'VARIAVEL') && !r.description.includes('Comissão')).reduce((a, b) => a + b.amount, 0);

  const pendingExpensesList = filteredRecords.filter(r => r.type === 'EXPENSE' && r.status === 'PENDING' && !r.description.includes('Comissão'));
  const paidExpensesList = filteredRecords.filter(r => r.type === 'EXPENSE' && r.status === 'PAID' && !r.description.includes('Comissão'));

  // ================= AÇÕES E MODAIS =================
  const openPaymentModal = (report: BarberReport) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedReport) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/financeiro/comissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: selectedReport.barber.id,
          barberName: selectedReport.barber.name,
          amount: selectedReport.commissionValue,
          logIds: selectedReport.logs.map(log => log.id)
        })
      });

      if (res.ok) {
        showToast('Acerto realizado! Dinheiro debitado do caixa.', 'success');
        setIsModalOpen(false);
        fetchCommissions();
      } else {
        const data = await res.json();
        showToast(data.message || 'Erro ao realizar pagamento.', 'error');
      }
    } catch (error) { showToast('Erro de conexão.', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const openExpenseModal = (expense?: FinancialRecord, darBaixa = false) => {
    if (expense) {
      setEditingExpenseId(expense.id);
      setExpDesc(expense.description);
      setExpAmount(expense.amount.toString());
      setExpCategory(expense.category || 'VARIAVEL');
      setExpPaymentMethod(expense.paymentMethod || '');
      
      if (darBaixa) {
        setExpStatus('PAID');
        setExpPaidAt(getTodayStr());
      } else {
        setExpStatus(expense.status || 'PAID');
        setExpPaidAt(expense.paidAt ? new Date(expense.paidAt).toISOString().split('T')[0] : getTodayStr());
      }
      setExpDueDate(expense.dueDate ? new Date(expense.dueDate).toISOString().split('T')[0] : getTodayStr());
    } else {
      setEditingExpenseId(null);
      setExpDesc('');
      setExpAmount('');
      setExpCategory('VARIAVEL');
      setExpStatus('PAID');
      setExpPaymentMethod('');
      setExpDueDate(getTodayStr());
      setExpPaidAt(getTodayStr());
    }
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc || !expAmount) return showToast('Preencha descrição e valor.', 'error');
    
    setIsSubmitting(true);
    try {
      const url = editingExpenseId ? `/api/financeiro/${editingExpenseId}` : '/api/financeiro';
      const method = editingExpenseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: expDesc, 
          amount: expAmount, 
          category: expCategory,
          status: expStatus,
          paymentMethod: expPaymentMethod,
          dueDate: expDueDate,
          paidAt: expStatus === 'PAID' ? expPaidAt : null
        })
      });

      if (res.ok) {
        showToast(editingExpenseId ? 'Despesa atualizada com sucesso!' : 'Despesa lançada com sucesso!', 'success');
        setIsExpenseModalOpen(false);
        fetchRecords();
      } else {
        showToast('Erro ao salvar despesa.', 'error');
      }
    } catch (error) { showToast('Erro de conexão.', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if(!confirm("Deseja realmente excluir esta despesa permanentemente?")) return;
    try {
      const res = await fetch(`/api/financeiro/${id}`, { method: 'DELETE' });
      if(res.ok) {
        showToast('Despesa excluída.', 'success');
        fetchRecords();
      }
    } catch (e) { showToast('Erro ao excluir.', 'error'); }
  };

  const translateCycle = (cycle: string) => {
    const cycles: any = { 'DAILY': 'Diário', 'WEEKLY': 'Semanal', 'BIWEEKLY': 'Quinzenal', 'MONTHLY': 'Mensal' };
    return cycles[cycle] || cycle;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-6 border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="text-[#FFD700]" size={32} />
            Gestão Financeira
          </h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base">
            Controle de caixa, lucros, despesas fixas e comissões da barbearia.
          </p>
        </div>
      </header>

      {/* ================= BARRA DE FILTROS ================= */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl mb-6 flex flex-col md:flex-row flex-wrap gap-4 items-end animate-in fade-in">
        <div className="flex-1 min-w-[150px]">
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
        
        <div className="flex-1 min-w-[130px]">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data Inicial</label>
          <input type="date" disabled={datePreset !== 'CUSTOM'} value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] disabled:opacity-50 text-sm" />
        </div>
        
        <div className="flex-1 min-w-[130px]">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Data Final</label>
          <input type="date" disabled={datePreset !== 'CUSTOM'} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] disabled:opacity-50 text-sm" />
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Filter size={12}/> Situação</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] text-sm">
            <option value="TODOS">Todos</option>
            <option value="PAID">Pagos / Recebidos</option>
            <option value="PENDING">Pendentes / A Pagar</option>
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><DollarSign size={12}/> Método</label>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 outline-none focus:border-[#FFD700] text-sm">
            <option value="TODOS">Todos</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Pix">Pix</option>
            <option value="Débito">Débito</option>
            <option value="Crédito">Crédito</option>
            <option value="Plano VIP">Plano VIP</option>
          </select>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 custom-scrollbar">
        <button onClick={() => setActiveTab('RESUMO')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shrink-0 ${activeTab === 'RESUMO' ? 'bg-[#FFD700] text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
          <PieChart size={18} /> Resumo Geral
        </button>
        <button onClick={() => setActiveTab('DESPESAS')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shrink-0 ${activeTab === 'DESPESAS' ? 'bg-[#FFD700] text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
          <Receipt size={18} /> Contas e Despesas
        </button>
        <button onClick={() => setActiveTab('COMISSOES')} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shrink-0 ${activeTab === 'COMISSOES' ? 'bg-[#FFD700] text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
          <HandCoins size={18} /> Acerto de Equipe
        </button>
      </div>

      {/* ================= ABA RESUMO GERAL ================= */}
      {activeTab === 'RESUMO' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* CARD FATURAMENTO */}
            <div className="bg-zinc-900 p-5 rounded-xl border border-[#FFD700]/30 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5"><PieChart size={64}/></div>
                <p className="text-xs text-[#FFD700] font-bold uppercase mb-2 flex items-center gap-2"><Tag size={16}/> Faturamento</p>
                <h3 className="text-2xl font-bold text-white">R$ {faturamentoTotal.toFixed(2)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2 leading-tight">Total bruto gerado no período</p>
            </div>

            {/* CARD RECEITAS */}
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
                <p className="text-xs text-emerald-400 font-bold uppercase mb-2 flex items-center gap-2"><ArrowUpCircle size={16}/> Recebido</p>
                <h3 className="text-2xl font-bold text-white">R$ {recebido.toFixed(2)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2">A receber: R$ {aReceber.toFixed(2)}</p>
            </div>

            {/* CARD DESPESAS */}
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
                <p className="text-xs text-red-400 font-bold uppercase mb-2 flex items-center gap-2"><ArrowDownCircle size={16}/> Pago</p>
                <h3 className="text-2xl font-bold text-white">R$ {pago.toFixed(2)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2">Contas a pagar: R$ {aPagar.toFixed(2)}</p>
            </div>

            {/* CARD SALDO REAL */}
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
                <p className="text-xs text-blue-400 font-bold uppercase mb-2 flex items-center gap-2"><DollarSign size={16}/> Saldo Real</p>
                <h3 className={`text-2xl font-bold ${saldoReal >= 0 ? 'text-blue-400' : 'text-red-500'}`}>R$ {saldoReal.toFixed(2)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2">Disponível em caixa (Recebido - Pago)</p>
            </div>

            {/* CARD PREVISÃO */}
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg sm:col-span-2 lg:col-span-1">
                <p className="text-xs text-orange-400 font-bold uppercase mb-2 flex items-center gap-2"><Calendar size={16}/> Previsão Final</p>
                <h3 className={`text-2xl font-bold ${saldoPrevisto >= 0 ? 'text-orange-400' : 'text-red-500'}`}>R$ {saldoPrevisto.toFixed(2)}</h3>
                <p className="text-[10px] text-zinc-500 mt-2">Fechamento do Período</p>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800">
            <h2 className="text-lg font-bold text-white mb-6">Demonstrativo de Resultado do Exercício (DRE)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 text-emerald-400 mb-2">
                    <TrendingUp size={24} />
                    <h3 className="font-bold uppercase tracking-wider">Entradas Concluídas</h3>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-800 pt-4 mt-4">
                    <span className="text-zinc-400">Serviços e Vendas Recebidas</span>
                    <span className="text-white font-mono text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recebido)}</span>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 text-red-400 mb-2">
                    <TrendingDown size={24} />
                    <h3 className="font-bold uppercase tracking-wider">Saídas Efetuadas</h3>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Comissões da Equipe</span>
                      <span className="text-red-400 font-mono text-sm">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCommissions)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Despesas Fixas Pagas</span>
                      <span className="text-red-400 font-mono text-sm">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFixed)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Despesas Variáveis Pagas</span>
                      <span className="text-red-400 font-mono text-sm">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVariable)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-6 h-full flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-yellow-500 mb-2">
                      <Clock size={24} />
                      <h3 className="font-bold uppercase tracking-wider">Provisões (A Pagar)</h3>
                    </div>
                    <div className="space-y-3 mt-4 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Comissões Pendentes</span>
                        <span className="text-yellow-500 font-mono text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingCommissionsAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Contas e Despesas</span>
                        <span className="text-yellow-500 font-mono text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingExpensesAmount)}</span>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-yellow-500/20 flex justify-between items-center">
                        <span className="text-yellow-500 font-bold uppercase text-sm">Total Comprometido</span>
                        <span className="text-yellow-500 font-black font-mono text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(aPagar)}</span>
                    </div>
                  </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================= ABA COMISSÕES ================= */}
      {activeTab === 'COMISSOES' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-blue-400 shrink-0" />
            <p className="text-sm text-blue-200">
              O sistema calcula automaticamente as comissões pendentes (independente do filtro de data). Ao pagar, o valor é debitado do Fluxo de Caixa.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-20 text-zinc-500 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
              Calculando provisões...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-lg">
              <HandCoins size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-medium">Nenhum acerto pendente!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {reports.map((report) => (
                <div key={report.barber.id} className="bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                  <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg text-[#FFD700] font-bold shrink-0">
                        {report.barber.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{report.barber.name}</h3>
                        <span className="text-[10px] text-zinc-400 uppercase font-medium flex items-center gap-1">
                          <CalendarClock size={10} /> {translateCycle(report.barber.paymentCycle)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#FFD700] font-black text-lg block">{report.barber.commissionRate}%</span>
                      <span className="text-zinc-500 text-[10px] uppercase">Comissão</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4 flex-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400 flex items-center gap-2"><Scissors size={14}/> Serviços Pendentes:</span>
                      <span className="text-white font-medium">{report.servicesCount} cortes</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Total de Base:</span>
                      <span className="text-zinc-300 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.totalGenerated)}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/50">
                      <span className="text-zinc-400 text-xs uppercase font-bold block mb-1">Valor a Pagar</span>
                      <span className="text-3xl font-black text-[#FFD700] block">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.commissionValue)}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 pt-0 mt-auto">
                    <button onClick={() => openPaymentModal(report)} disabled={report.servicesCount === 0} className="w-full bg-[#FFD700] hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-30">
                      <HandCoins size={18} /> Realizar Acerto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= ABA DESPESAS ================= */}
      {activeTab === 'DESPESAS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Lançamentos</h2>
            <button onClick={() => openExpenseModal()} className="bg-[#FFD700] text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-500 transition-all text-sm flex items-center gap-2">
              <Plus size={16} /> Novo Lançamento
            </button>
          </div>

          {loading ? (
             <div className="text-center py-10 text-zinc-500">Carregando dados...</div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              
              {/* PENDENTES */}
              {(statusFilter === 'TODOS' || statusFilter === 'PENDING') && (
                <div>
                  <h3 className="text-[#FFD700] text-xs font-bold uppercase mb-3 flex items-center gap-2">
                    <Clock size={14} /> A Pagar / Receber (Provisões)
                  </h3>
                  {pendingExpensesList.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Nenhum registro pendente no filtro selecionado.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingExpensesList.map(exp => (
                        <div key={exp.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center shadow-lg group">
                          <div>
                            <p className="text-white font-bold">{exp.description}</p>
                            <p className="text-red-400 text-xs mt-1">Vence em: {new Date(exp.dueDate).toLocaleDateString('pt-BR')}</p>
                            <div className="flex gap-2 mt-2">
                              <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold inline-block ${exp.category === 'FIXA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                Despesa {exp.category}
                              </span>
                              {exp.paymentMethod && <span className="text-[9px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 uppercase font-bold inline-block">{exp.paymentMethod}</span>}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <p className="text-white font-mono font-bold mb-3 text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}</p>
                            <div className="flex gap-2">
                              <button onClick={() => openExpenseModal(exp, false)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded transition-colors" title="Editar"><Edit2 size={14}/></button>
                              <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 bg-zinc-800 hover:bg-red-500/20 text-red-500 rounded transition-colors" title="Excluir"><Trash2 size={14}/></button>
                              <button onClick={() => openExpenseModal(exp, true)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase transition-colors">Dar Baixa</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PAGAS */}
              {(statusFilter === 'TODOS' || statusFilter === 'PAID') && (
                <div className="pt-6 border-t border-zinc-800">
                  <h3 className="text-emerald-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Histórico de Efetuados
                  </h3>
                  {paidExpensesList.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Nenhum registro pago no filtro selecionado.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paidExpensesList.map(exp => (
                        <div key={exp.id} className="bg-black border border-zinc-800 p-4 rounded-xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity group">
                          <div>
                            <h3 className="text-white font-medium">{exp.description}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded inline-block ${exp.category === 'FIXA' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                Despesa {exp.category}
                              </span>
                              {exp.paymentMethod && <span className="text-[9px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 uppercase font-bold inline-block">{exp.paymentMethod}</span>}
                            </div>
                            <p className="text-zinc-500 text-[10px] mt-2">Venceu: {new Date(exp.dueDate).toLocaleDateString('pt-BR')} | <strong>Pago em: {exp.paidAt ? new Date(exp.paidAt).toLocaleDateString('pt-BR') : '-'}</strong></p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-red-400 font-mono font-bold">
                              - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}
                            </span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openExpenseModal(exp, false)} className="p-1 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded" title="Editar"><Edit2 size={12}/></button>
                              <button onClick={() => handleDeleteExpense(exp.id)} className="p-1 bg-zinc-800 hover:bg-red-500/20 text-red-500 rounded" title="Excluir"><Trash2 size={12}/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ================= MODAIS ================= */}
      
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden my-auto">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50 sticky top-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><HandCoins className="text-[#FFD700]" /> Acerto: {selectedReport.barber.name}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors text-2xl">&times;</button>
            </div>
            <div className="p-6">
              <div className="bg-black border border-zinc-800 rounded-lg p-4 mb-6">
                <p className="text-zinc-400 text-sm mb-1">Total a transferir:</p>
                <p className="text-4xl font-black text-[#FFD700]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedReport.commissionValue)}</p>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-lg transition-colors">Cancelar</button>
                <button onClick={handleProcessPayment} disabled={isSubmitting} className="flex-1 py-3 bg-[#FFD700] hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Processando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden my-auto">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50 sticky top-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Receipt className="text-[#FFD700]" /> 
                {editingExpenseId ? (expStatus === 'PAID' ? 'Baixar/Editar' : 'Editar Conta') : 'Lançar Conta'}
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição</label>
                <input type="text" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" placeholder="Ex: Conta de Energia" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Valor Final (R$)</label>
                  <input type="number" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" placeholder="150.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Vencimento</label>
                  <input type="date" value={expDueDate} onChange={(e) => setExpDueDate(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Categoria</label>
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] appearance-none">
                    <option value="FIXA">Fixa</option>
                    <option value="VARIAVEL">Variável</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Situação</label>
                  <select value={expStatus} onChange={(e) => setExpStatus(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] appearance-none border-l-4 border-l-[#FFD700]">
                    <option value="PENDING">Pendente (A Pagar)</option>
                    <option value="PAID">Já está Pago</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Método de Pagamento</label>
                <select value={expPaymentMethod} onChange={(e) => setExpPaymentMethod(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] appearance-none">
                  <option value="">Não Especificado</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                </select>
              </div>

              {expStatus === 'PAID' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mt-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Data que foi efetuado o pagamento</label>
                  <input type="date" required value={expPaidAt} onChange={(e) => setExpPaidAt(e.target.value)} className="w-full bg-black border border-emerald-500/30 text-white rounded px-3 py-2 focus:outline-none focus:border-emerald-400 text-sm" />
                </div>
              )}

              <div className="pt-4 flex gap-3 border-t border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#FFD700] hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : (editingExpenseId ? 'Salvar Alterações' : 'Lançar Conta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}