// app/admin/dashboard/equipe/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, Pencil, X, Trash2, KeyRound, Shield } from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isActive: boolean;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  { id: 'admin_panel', label: 'Acesso total ao Painel Admin' },
  { id: 'view_all_stats', label: 'Ver Faturamento da Equipe' },
  { id: 'manage_plans', label: 'Criar e Editar Planos VIP' },
  { id: 'edit_client', label: 'Editar Clientes' },
  { id: 'delete_client', label: 'Excluir Clientes' },
];

export default function EquipePage() {
  const [team, setTeam] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (err) {
      console.error("Erro ao buscar equipe:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleEditClick = (barber: Barber) => {
    setEditingId(barber.id);
    setName(barber.name);
    setEmail(barber.email);
    setPassword(''); 
    setIsActive(barber.isActive);
    setPermissions(barber.permissions || []);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setIsActive(true);
    setPermissions([]);
    setError('');
  };

  const togglePermission = (permId: string) => {
    if (permissions.includes(permId)) {
      setPermissions(permissions.filter(p => p !== permId));
    } else {
      setPermissions([...permissions, permId]);
    }
  };

  const handleToggleStatus = async (barber: Barber) => {
    setError('');
    setSuccess('');
    
    const newStatus = !barber.isActive;
    setTeam(team.map(b => b.id === barber.id ? { ...b, isActive: newStatus } : b));

    try {
      const res = await fetch(`/api/team/${barber.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: barber.name,
          email: barber.email,
          isActive: newStatus
        })
      });

      if (!res.ok) {
        fetchTeam();
        const data = await res.json();
        setError(data.message || 'Erro ao alterar o status do profissional.');
      } else {
        setSuccess(newStatus ? 'Acesso liberado!' : 'Acesso bloqueado!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      fetchTeam();
      setError('Erro de conexão com o servidor.');
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este barbeiro da equipe?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });

      if (res.ok) {
        setSuccess('Barbeiro excluído com sucesso!');
        fetchTeam();
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao excluir o barbeiro.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!name || !email) {
      setError('O nome e o e-mail são obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    if (!editingId && !password) {
      setError('A senha é obrigatória para novos cadastros.');
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editingId ? `/api/team/${editingId}` : '/api/team';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          isActive: editingId ? isActive : true,
          permissions
        })
      });

      if (res.ok) {
        setSuccess(editingId ? 'Dados atualizados com sucesso!' : 'Barbeiro cadastrado com sucesso!');
        handleCancelEdit();
        fetchTeam();
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao processar dados.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="p-8">
      <header className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="text-[#FFD700]" size={32} />
          Gestão de Equipe
        </h1>
        <p className="text-zinc-400 mt-2">
          Cadastre os barbeiros e defina o nível de acesso que cada um terá no sistema.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              {editingId ? (
                <><Pencil className="text-[#FFD700]" size={20} /> Editar Barbeiro</>
              ) : (
                <><Plus className="text-[#FFD700]" size={20} /> Novo Barbeiro</>
              )}
            </h2>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
            {success && <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-4 text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nome Completo *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors" placeholder="Nome do profissional" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">E-mail de Login *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors" placeholder="email@exemplo.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  {editingId ? 'Nova Senha (Opcional)' : 'Senha de Acesso *'}
                </label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors" placeholder={editingId ? 'Deixe em branco para manter a atual' : 'Crie uma senha inicial'} />
              </div>

              {/* Bloco de Permissões */}
              <div className="pt-2 border-t border-zinc-800 mt-4">
                <label className="block text-sm font-medium text-[#FFD700] mb-3 flex items-center gap-2">
                  <Shield size={16} /> Permissões de Acesso
                </label>
                <div className="space-y-2 bg-black p-3 rounded border border-zinc-800 max-h-40 overflow-y-auto custom-scrollbar">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer hover:text-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="accent-[#FFD700] w-4 h-4 cursor-pointer"
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#FFD700] text-black font-bold rounded px-4 py-3 hover:bg-yellow-500 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : (editingId ? 'Atualizar Dados' : 'Cadastrar Barbeiro')}
                </button>

                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="w-full bg-transparent border border-zinc-700 text-white font-bold rounded px-4 py-3 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                    <X size={18} /> Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Tabela de Equipe */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="text-[#FFD700]" size={20} />
              Profissionais Cadastrados
            </h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-500">Carregando equipe...</div>
            ) : team.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
                <p className="text-zinc-500">Nenhum barbeiro cadastrado na sua equipe ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="py-3 px-4 text-zinc-400 font-medium">Nome do Profissional</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium hidden md:table-cell text-center">Status</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((barber) => (
                      <tr key={barber.id} className={`border-b border-zinc-800/50 transition-colors ${!barber.isActive ? 'opacity-50 hover:opacity-100' : 'hover:bg-zinc-800/20'}`}>
                        <td className="py-4 px-4 text-white font-medium flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-[#FFD700] font-bold">
                            {barber.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p>{barber.name}</p>
                            <p className="text-zinc-500 text-xs font-normal md:hidden">{barber.email}</p>
                          </div>
                        </td>
                        
                        <td className="py-4 px-4 hidden md:table-cell">
                          <div className="flex justify-center">
                            <div onClick={() => handleToggleStatus(barber)} title={barber.isActive ? "Bloquear acesso" : "Liberar acesso"} className="w-11 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300" style={{ backgroundColor: barber.isActive ? '#22c55e' : '#3f3f46' }}>
                              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${barber.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditClick(barber)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition-colors" title="Editar Permissões/Senha">
                              <KeyRound size={16} />
                            </button>
                            <button onClick={() => handleDeleteClick(barber.id)} className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-500 rounded transition-colors" title="Remover Profissional">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}