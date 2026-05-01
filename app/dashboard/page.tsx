// app/dashboard/page.tsx
'use client';

import React from 'react';
import { TrendingUp, Users, Scissors } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Visão Geral</h1>
        <p className="text-zinc-400 mt-1">Acompanhe os resultados da barbearia de hoje.</p>
      </header>

      {/* Cards de Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Faturamento Diário</h3>
            <div className="p-2 bg-[#FFD700]/10 rounded text-[#FFD700]">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">R$ 0,00</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Serviços Realizados</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <Scissors size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Novos Clientes</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <Users size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
        </div>

      </div>

      {/* Espaço para tabela de últimos serviços (Faremos na próxima etapa) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Últimos Serviços Lançados</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-zinc-500 mb-4">Nenhum serviço lançado hoje ainda.</p>
          <button className="bg-[#FFD700] text-black font-bold px-6 py-2 rounded hover:bg-yellow-500 transition-colors">
            Lançar Novo Serviço
          </button>
        </div>
      </div>
    </div>
  );
}