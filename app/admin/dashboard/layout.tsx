// app/admin/dashboard/layout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Scissors, 
  Users, 
  Wallet, 
  MessageSquare, 
  Settings,
  LogOut 
} from 'lucide-react';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      // Chama a rota do servidor para destruir os cookies httpOnly
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Usa o window.location para forçar uma limpeza completa da memória do navegador 
      // e redirecionar para a tela de login.
      window.location.href = '/login';
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const menuItems = [
    { name: 'Visão Geral', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Serviços e Preços', href: '/admin/dashboard/servicos', icon: Scissors },
    { name: 'Gestão de Equipe', href: '/admin/dashboard/equipe', icon: Users },
    { name: 'Automação WhatsApp', href: '/admin/dashboard/mensagens', icon: MessageSquare },
    { name: 'Financeiro e Caixa', href: '/admin/dashboard/financeiro', icon: Wallet },
    { name: 'Configurações', href: '/admin/dashboard/configuracoes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white tracking-wider">
            GESTAO<span className="text-[#FFD700]">.</span>ADMIN
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  isActive 
                    ? 'bg-[#FFD700] text-black font-bold' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-zinc-400 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}