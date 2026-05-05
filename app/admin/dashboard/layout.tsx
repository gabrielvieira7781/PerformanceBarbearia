// app/admin/dashboard/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Scissors, Users, Wallet, MessageSquare, Settings, LogOut, PlayCircle, Crown, Menu, X
} from 'lucide-react';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fecha o menu no celular ao mudar de rota
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const menuItems = [
    { name: 'Visão Geral', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Serviços e Preços', href: '/admin/dashboard/servicos', icon: Scissors },
    { name: 'Planos e Assinaturas', href: '/admin/dashboard/planos', icon: Crown},
    { name: 'Gestão de Equipe', href: '/admin/dashboard/equipe', icon: Users },
    { name: 'Automação WhatsApp', href: '/admin/dashboard/mensagens', icon: MessageSquare },
    { name: 'Financeiro e Caixa', href: '/admin/dashboard/financeiro', icon: Wallet },
    { name: 'Configurações', href: '/admin/dashboard/configuracoes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      
      {/* Header Mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white tracking-wider">
          GESTAO<span className="text-[#FFD700]">.</span>ADMIN
        </h2>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white p-2"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay Escuro */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Lateral */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block">
          <h2 className="text-2xl font-bold text-white tracking-wider">
            GESTAO<span className="text-[#FFD700]">.</span>ADMIN
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto pt-4 md:pt-0">
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

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-zinc-800 space-y-2">
          <Link 
            href="/dashboard/servicos"
            className="flex items-center justify-center gap-2 px-4 py-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition-colors shadow-lg animate-pulse"
          >
            <PlayCircle size={20} />
            <span>Painel de Trabalho</span>
          </Link>

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
      <main className="flex-1 overflow-y-auto bg-black h-[calc(100vh-64px)] md:h-screen">
        {children}
      </main>
    </div>
  );
}