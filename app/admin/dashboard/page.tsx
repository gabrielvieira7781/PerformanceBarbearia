'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Scissors, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  todayIncome: number;
  monthlyIncome: number;
  todayServices: number;
  activeTeam: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({ todayIncome: 0, monthlyIncome: 0, todayServices: 0, activeTeam: 0 });
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Criação das datas locias para ignorar o fuso horário (UTC) do servidor
      const today = new Date();
      const offset = today.getTimezoneOffset() * 60000;
      const localDate = new Date(today.getTime() - offset);
      const format = (d: Date) => d.toISOString().split('T')[0];

      const todayStr = format(localDate);
      
      const firstDay = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
      const lastDay = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
      const monthStartStr = format(firstDay);
      const monthEndStr = format(lastDay);

      try {
        // Busca usando os endpoints padronizados de data
        const [resToday, resMonth, resProducts, resTeam] = await Promise.all([
          fetch(`/api/dashboard/stats?startDate=${todayStr}&endDate=${todayStr}`),
          fetch(`/api/dashboard/stats?startDate=${monthStartStr}&endDate=${monthEndStr}`),
          fetch('/api/produtos'),
          fetch('/api/team')
        ]);

        let todayInc = 0, todayServ = 0, monthInc = 0, teamActive = 0;

        if (resToday.ok) {
           const data = await resToday.json();
           todayInc = data.stats.revenue;
           todayServ = data.stats.services;
        }
        if (resMonth.ok) {
           const data = await resMonth.json();
           monthInc = data.stats.revenue;
        }
        if (resTeam.ok) {
           const team = await resTeam.json();
           teamActive = team.filter((t: any) => t.isActive !== false).length; 
        }

        setStats({ todayIncome: todayInc, monthlyIncome: monthInc, todayServices: todayServ, activeTeam: teamActive });

        if (resProducts.ok) {
          const allProducts = await resProducts.json();
          const lowStock = allProducts.filter((p: any) => p.isActive && p.stock <= p.minStock);
          setLowStockProducts(lowStock);
        }
      } catch (error) {
        console.error("Erro ao sincronizar dados", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Painel da Barbearia</h1>
        <p className="text-zinc-400 mt-1 text-sm md:text-base">Acompanhe o desempenho sincronizado do seu negócio e alertas de estoque.</p>
      </header>

      {/* ALERTA DE ESTOQUE INTELIGENTE */}
      {lowStockProducts.length > 0 && (
        <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-400" size={24} />
            <h2 className="text-lg font-bold text-red-400">Atenção: Estoque Baixo!</h2>
          </div>
          <p className="text-zinc-300 text-sm mb-4">
            Os seguintes produtos atingiram o limite mínimo e precisam de reposição imediata:
          </p>
          <div className="flex flex-wrap gap-3">
            {lowStockProducts.map(product => (
              <div key={product.id} className="bg-black/40 border border-red-500/20 px-4 py-2 rounded flex items-center gap-3">
                <span className="text-white font-medium text-sm">{product.name}</span>
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Restam {product.stock} un</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-red-500/20">
            <Link href="/admin/dashboard/produtos" className="text-red-400 text-sm font-bold flex items-center gap-1 hover:text-red-300 transition-colors w-max">
              Gerenciar Estoque <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Caixa do Dia</h3>
            <div className="p-2 bg-[#FFD700]/10 rounded text-[#FFD700]"><DollarSign size={20} /></div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">
            {loading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.todayIncome)}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><DollarSign size={80} className="text-[#FFD700]" /></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Faturamento Mensal</h3>
            <div className="p-2 bg-zinc-800 rounded text-white"><TrendingUp size={20} /></div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">
            {loading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthlyIncome)}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={80} className="text-white" /></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Serviços Hoje</h3>
            <div className="p-2 bg-zinc-800 rounded text-white"><Scissors size={20} /></div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">
            {loading ? '...' : stats.todayServices}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Scissors size={80} className="text-white" /></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Equipe Ativa</h3>
            <div className="p-2 bg-zinc-800 rounded text-white"><Users size={20} /></div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">
            {loading ? '...' : stats.activeTeam}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Users size={80} className="text-white" /></div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 md:p-6">
        <h3 className="text-xl font-bold text-white mb-4">Gerenciamento Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 border border-zinc-800 rounded-lg flex flex-col items-start bg-black/20 hover:border-zinc-700 transition-colors">
            <h4 className="text-white font-bold mb-2">Tabela de Preços e Estoque</h4>
            <p className="text-zinc-400 text-sm mb-6 flex-1">Acesse seus catálogos de serviços e produtos disponíveis para a equipe usar no PDV.</p>
            <div className="flex flex-col sm:flex-row w-full gap-3">
              <Link href="/admin/dashboard/servicos" className="bg-[#FFD700] text-black font-bold px-4 py-3 rounded-lg hover:bg-yellow-500 transition-colors flex-1 text-center">
                Serviços
              </Link>
              <Link href="/admin/dashboard/produtos" className="bg-zinc-800 text-white font-bold px-4 py-3 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 flex-1 text-center">
                Estoque
              </Link>
            </div>
          </div>
          
          <div className="p-5 border border-zinc-800 rounded-lg flex flex-col items-start bg-black/20 hover:border-zinc-700 transition-colors">
            <h4 className="text-white font-bold mb-2">Adicionar Barbeiro</h4>
            <p className="text-zinc-400 text-sm mb-6 flex-1">Crie acessos para os seus funcionários começarem a registrar os cortes no sistema.</p>
            <Link 
              href="/admin/dashboard/equipe"
              className="bg-zinc-800 text-white font-bold px-6 py-3 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 w-full text-center"
            >
              Gerenciar Equipe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}