// app/admin/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Scissors, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  todayIncome: number;
  monthlyIncome: number;
  todayServices: number;
  activeTeam: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Erro ao buscar estatísticas", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Painel da Barbearia</h1>
        <p className="text-zinc-400 mt-1">Acompanhe o desempenho geral do seu negócio.</p>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Caixa do Dia</h3>
            <div className="p-2 bg-[#FFD700]/10 rounded text-[#FFD700]">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">
            {loading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.todayIncome || 0)}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <DollarSign size={80} className="text-[#FFD700]" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Faturamento Mensal</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">
            {loading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.monthlyIncome || 0)}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} className="text-white" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Serviços Hoje</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <Scissors size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">
            {loading ? '...' : (stats?.todayServices || 0)}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Scissors size={80} className="text-white" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-zinc-400 font-medium">Equipe Ativa</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <Users size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">
            {loading ? '...' : (stats?.activeTeam || 0)}
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Users size={80} className="text-white" />
          </div>
        </div>

      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Gerenciamento Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 border border-zinc-800 rounded-lg flex flex-col items-start bg-black/20 hover:border-zinc-700 transition-colors">
            <h4 className="text-white font-bold mb-2">Tabela de Preços</h4>
            <p className="text-zinc-400 text-sm mb-6 flex-1">Cadastre os valores de cortes, barbas e combos para sua equipe usar no lançamento.</p>
            <Link 
              href="/admin/dashboard/servicos"
              className="bg-[#FFD700] text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-500 transition-colors w-full text-center"
            >
              Configurar Preços
            </Link>
          </div>
          
          <div className="p-6 border border-zinc-800 rounded-lg flex flex-col items-start bg-black/20 hover:border-zinc-700 transition-colors">
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