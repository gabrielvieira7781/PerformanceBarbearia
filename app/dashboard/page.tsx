// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Scissors, Calendar, Filter, User as UserIcon, ArrowRight } from 'lucide-react';
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

// Função para pegar a data local exata ignorando o UTC
const getLocalDate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados dos Filtros com a data local corrigida
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());
  const [selectedBarberId, setSelectedBarberId] = useState('');
  
  // Permissões
  const [hasManagerPrivileges, setHasManagerPrivileges] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        barberId: selectedBarberId
      }).toString();

      const res = await fetch(`/api/dashboard/stats?${query}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
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
        fetchBarbers();
      }
    };

    const fetchBarbers = async () => {
      const res = await fetch('/api/team');
      if (res.ok) {
        const json = await res.json();
        setBarbers(json);
      }
    };

    checkPerms();
  }, []);

  // Sempre que a data ou barbeiro mudar, ele busca os dados automaticamente
  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, selectedBarberId]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Visão Geral</h1>
          <p className="text-zinc-400 mt-1">Acompanhe o desempenho e histórico de atendimentos.</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2 px-3 border-r border-zinc-800">
            <Calendar size={16} className="text-[#FFD700]" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none"
            />
            <ArrowRight size={14} className="text-zinc-600" />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none"
            />
          </div>

          {hasManagerPrivileges && (
            <div className="flex items-center gap-2 px-3">
              <UserIcon size={16} className="text-[#FFD700]" />
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="bg-transparent text-white text-sm focus:outline-none cursor-pointer max-w-[150px] truncate"
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
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Atualizar dados"
          >
            <Filter size={18} />
          </button>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} className="text-[#FFD700]" />
          </div>
          <h3 className="text-zinc-400 font-medium text-sm uppercase tracking-wider">Faturamento no Período</h3>
          <p className="text-3xl font-bold text-white mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.stats.revenue || 0)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Scissors size={80} className="text-white" />
          </div>
          <h3 className="text-zinc-400 font-medium text-sm uppercase tracking-wider">Serviços Realizados</h3>
          <p className="text-3xl font-bold text-white mt-2">{data?.stats.services || 0}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={80} className="text-white" />
          </div>
          <h3 className="text-zinc-400 font-medium text-sm uppercase tracking-wider">Novos Clientes</h3>
          <p className="text-3xl font-bold text-white mt-2">{data?.stats.newClients || 0}</p>
        </div>

      </div>

      {/* Tabela de Últimos Serviços */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Histórico de Lançamentos</h3>
          <Link 
            href="/dashboard/servicos"
            className="bg-[#FFD700] text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-500 transition-all text-sm flex items-center gap-2"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-800/30 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  <th className="py-4 px-6">Data/Hora</th>
                  <th className="py-4 px-6">Cliente</th>
                  <th className="py-4 px-6">Serviço</th>
                  {hasManagerPrivileges && <th className="py-4 px-6">Profissional</th>}
                  <th className="py-4 px-6">Pagamento</th>
                  <th className="py-4 px-6 text-right">Valor</th>
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
                      <span className="text-zinc-500 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {log.paymentMethod}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-white font-bold group-hover:text-[#FFD700] transition-colors">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.priceCharged)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}