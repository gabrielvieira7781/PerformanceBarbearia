// app/admin/dashboard/financeiro/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, Calendar, Filter } from 'lucide-react';

export default function FinanceiroPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/financeiro/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar financeiro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <div className="p-8 text-zinc-500 text-center">Carregando dados financeiros...</div>;

  const stats = data?.stats || { totalBalance: 0, todayIncome: 0, totalExpenses: 0 };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 border-b border-zinc-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="text-[#FFD700]" size={32} />
            Financeiro e Caixa
          </h1>
          <p className="text-zinc-400 mt-2">Acompanhe a saúde financeira da sua barbearia em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-zinc-900 border border-zinc-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition-all text-sm font-medium">
            <Calendar size={18} /> Filtrar Data
          </button>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><ArrowUpCircle size={24} /></div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded">Hoje</span>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Entradas de Hoje</p>
          <h3 className="text-3xl font-bold text-white mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.todayIncome)}
          </h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><ArrowDownCircle size={24} /></div>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Total de Saídas</p>
          <h3 className="text-3xl font-bold text-white mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalExpenses)}
          </h3>
        </div>

        <div className="bg-zinc-900 border border-[#FFD700]/30 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD700]/5 rounded-full -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-[#FFD700]/10 rounded-lg text-[#FFD700]"><DollarSign size={24} /></div>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Saldo em Caixa</p>
          <h3 className="text-3xl font-bold text-[#FFD700] mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalBalance)}
          </h3>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Filter className="text-[#FFD700]" size={20} />
          Últimas Movimentações
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
              <tr className="border-b border-zinc-800 text-zinc-500 text-sm uppercase">
                <th className="py-4 px-4 font-bold">Data</th>
                <th className="py-4 px-4 font-bold">Descrição</th>
                <th className="py-4 px-4 font-bold">Tipo</th>
                <th className="py-4 px-4 font-bold text-right">Valor</th>
              </tr>
            <tbody className="divide-y divide-zinc-800">
              {data?.transactions.map((t: any) => (
                <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-4 px-4 text-zinc-400 text-sm font-mono">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-4 text-white font-medium">{t.description}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`py-4 px-4 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.transactions.length === 0 && (
            <div className="text-center py-10 text-zinc-600 italic">Nenhuma movimentação registrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}