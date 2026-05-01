// app/admin/dashboard/page.tsx
'use client';

import React from 'react';
import { TrendingUp, Users, Scissors, DollarSign } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Painel da Barbearia</h1>
        <p className="text-zinc-400 mt-1">Acompanhe o desempenho geral do seu negócio.</p>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Caixa do Dia</h3>
            <div className="p-2 bg-[#FFD700]/10 rounded text-[#FFD700]">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">R$ 0,00</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Faturamento Mensal</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">R$ 0,00</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Serviços Hoje</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <Scissors size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Equipe Ativa</h3>
            <div className="p-2 bg-zinc-800 rounded text-white">
              <Users size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">1</p>
        </div>

      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Gerenciamento Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 border border-zinc-800 rounded flex flex-col items-start">
            <h4 className="text-white font-bold mb-2">Tabela de Preços</h4>
            <p className="text-zinc-400 text-sm mb-4">Cadastre os valores de cortes, barbas e combos para sua equipe usar no lançamento.</p>
            <button className="bg-[#FFD700] text-black font-bold px-4 py-2 rounded hover:bg-yellow-500 transition-colors">
              Configurar Preços
            </button>
          </div>
          
          <div className="p-6 border border-zinc-800 rounded flex flex-col items-start">
            <h4 className="text-white font-bold mb-2">Adicionar Barbeiro</h4>
            <p className="text-zinc-400 text-sm mb-4">Crie acessos para os seus funcionários começarem a registrar os cortes no sistema.</p>
            <button className="bg-zinc-800 text-white font-bold px-4 py-2 rounded hover:bg-zinc-700 transition-colors border border-zinc-700">
              Gerenciar Equipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
