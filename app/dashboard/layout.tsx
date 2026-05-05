// app/dashboard/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Scissors, 
  Users, 
  Wallet, 
  MessageSquare, 
  LogOut,
  ShieldAlert,
  Menu,
  X // NOVO: Ícones para o botão do celular
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // NOVO: Controle do menu mobile

  useEffect(() => {
    const checkPermissions = () => {
      const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
      const role = roleMatch ? roleMatch[2] : '';
      
      const permsMatch = document.cookie.match(new RegExp('(^| )user_permissions=([^;]+)'));
      let permissions: string[] = [];
      if (permsMatch) {
        try { permissions = JSON.parse(decodeURIComponent(permsMatch[2])); } catch (e) {}
      }

      if (role === 'ADMIN') {
        setIsAdmin(true);
        setCanAccessAdmin(true);
      } else if (permissions.includes('admin_panel')) {
        setCanAccessAdmin(true);
      }
    };
    checkPermissions();
  }, []);

  // NOVO: Fecha o menu no celular ao mudar de rota
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
    { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Lançar Serviço', href: '/dashboard/servicos', icon: Scissors },
    { name: 'Clientes', href: '/dashboard/clientes', icon: Users },
    { name: 'Mensagens', href: '/dashboard/mensagens', icon: MessageSquare },
    { name: 'Financeiro', href: '/dashboard/financeiro', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      
      {/* NOVO: Header Mobile (Só aparece em telas pequenas) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white tracking-wider">
          SISTEMA<span className="text-[#FFD700]">.</span>
        </h2>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white p-2"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay Escuro para Mobile (clicar fora fecha o menu) */}
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
            SISTEMA<span className="text-[#FFD700]">.</span>
          </h2>
          {isAdmin && <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-bold mt-1 inline-block uppercase">Modo Trabalho Ativo</span>}
          {!isAdmin && canAccessAdmin && <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded font-bold mt-1 inline-block uppercase">Acesso Gerencial</span>}
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

        <div className="p-4 border-t border-zinc-800 space-y-2">
          {canAccessAdmin && (
            <Link 
              href="/admin/dashboard"
              className="flex items-center justify-center gap-2 px-4 py-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded transition-colors shadow-lg border border-zinc-600"
            >
              <ShieldAlert size={20} className="text-[#FFD700]" />
              <span>Painel Admin</span>
            </Link>
          )}

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