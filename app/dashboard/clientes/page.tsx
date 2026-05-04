// app/dashboard/clientes/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, CheckCircle2, AlertCircle, Link as LinkIcon, UserPlus, Edit2, Ban, Trash2, ShieldCheck, Crown } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  dependents: { id: string; name: string }[];
  planId: string | null;
  plan: { id: string; name: string } | null;
  createdAt: string;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [planos, setPlanos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentId, setParentId] = useState('');
  const [planId, setPlanId] = useState(''); 

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const checkPermissions = () => {
    const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    const permsMatch = document.cookie.match(new RegExp('(^| )user_permissions=([^;]+)'));
    
    const role = roleMatch ? roleMatch[2] : '';
    let permissions: string[] = [];
    try { 
      if (permsMatch) permissions = JSON.parse(decodeURIComponent(permsMatch[2])); 
    } catch (e) {}

    if (role === 'ADMIN') {
      setCanEdit(true);
      setCanDelete(true);
    } else {
      if (permissions.includes('edit_client')) setCanEdit(true);
      if (permissions.includes('delete_client')) setCanDelete(true);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clientes');
      if (res.ok) setClients(await res.json());
    } catch (err) {} finally {
      setLoading(false);
    }
  };

  const fetchPlanos = async () => {
    try {
      const res = await fetch('/api/planos');
      if (res.ok) setPlanos(await res.json());
    } catch (err) {}
  };

  useEffect(() => {
    checkPermissions();
    fetchClients();
    fetchPlanos(); 
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setPhone(value);
  };

  const openNewModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setParentId('');
    setPlanId('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    
    let formattedPhone = client.phone;
    if (formattedPhone && formattedPhone.length === 11) {
      formattedPhone = formattedPhone.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    setPhone(formattedPhone || '');
    setParentId(client.parentId || '');
    setPlanId(client.planId || '');
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return showToast('O nome é obrigatório.', 'error');

    setIsSubmitting(true);
    try {
      const url = editingClient ? `/api/clientes/${editingClient.id}` : '/api/clientes';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, parentId, planId: planId || null })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(editingClient ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
        setIsModalOpen(false);
        fetchClients();
      } else {
        showToast(data.message || 'Erro ao salvar.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlock = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Deseja realmente ${currentStatus ? 'bloquear' : 'desbloquear'} este cliente?`)) return;
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        showToast(`Cliente atualizado com sucesso!`, 'success');
        fetchClients();
      }
    } catch (error) {
      showToast('Erro ao atualizar.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ATENÇÃO: Deseja excluir este cliente definitivamente?')) return;
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Excluído com sucesso.', 'success');
        fetchClients();
      } else {
        showToast(data.message, 'error');
      }
    } catch (error) {
      showToast('Erro ao excluir.', 'error');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm.replace(/\D/g, '')))
  );

  const availableParents = clients.filter(c => c.parentId === null && (!editingClient || c.id !== editingClient.id));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-8 border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-[#FFD700]" size={32} />
            Gestão de Clientes
          </h1>
          <p className="text-zinc-400 mt-2">Visualize sua base, contatos, vínculos familiares e assinaturas.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-[#FFD700] hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
        >
          <UserPlus size={20} />
          Novo Cliente
        </button>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-black/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#FFD700] transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500">Carregando carteira de clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">Nenhum cliente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50">
                <tr className="text-zinc-400 text-sm font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Nome do Cliente</th>
                  <th className="py-4 px-6">Contato</th>
                  <th className="py-4 px-6">Clube / Plano VIP</th>
                  <th className="py-4 px-6">Vínculos</th>
                  <th className="py-4 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredClients.map((client) => (
                  <tr key={client.id} className={`hover:bg-zinc-800/30 transition-colors ${!client.isActive ? 'opacity-60' : ''}`}>
                    <td className="py-4 px-6 text-white font-medium">
                      <div className="flex items-center gap-2">
                        {client.name}
                        {client.parentId && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Dependente</span>}
                        {client.isActive === false && <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Bloqueado</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-zinc-300 font-mono">
                      {client.phone ? (
                         <div className="flex items-center gap-2">
                           <Phone size={14} className="text-zinc-500" />
                           {client.phone.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                         </div>
                      ) : (
                        <span className="text-zinc-600 italic">Sem número próprio</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {client.plan ? (
                        <span className="bg-[#FFD700]/20 text-[#FFD700] text-xs px-2 py-1 rounded font-bold uppercase flex items-center gap-1 w-max">
                           <Crown size={12} /> {client.plan.name}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">Sem plano</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {client.parent && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <LinkIcon size={12} /> Titular: {client.parent.name}
                        </div>
                      )}
                      {client.dependents && client.dependents.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-emerald-500 font-bold uppercase">Titular de:</span>
                          {client.dependents.map(dep => (
                            <span key={dep.id} className="text-xs text-zinc-400 flex items-center gap-1">• {dep.name}</span>
                          ))}
                        </div>
                      )}
                      {!client.parent && (!client.dependents || client.dependents.length === 0) && (
                        <span className="text-zinc-600 text-xs italic">Nenhum</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {canEdit && (
                          <>
                            <button onClick={() => openEditModal(client)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Editar">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleToggleBlock(client.id, client.isActive ?? true)} className={`${client.isActive ? 'text-orange-400 hover:text-orange-300' : 'text-emerald-400 hover:text-emerald-300'} transition-colors`} title={client.isActive ? 'Bloquear Cliente' : 'Desbloquear Cliente'}>
                              {client.isActive ? <Ban size={18} /> : <ShieldCheck size={18} />}
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-400 transition-colors" title="Excluir Definitivamente">
                            <Trash2 size={18} />
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-zinc-600 text-xs italic">Sem permissão</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animation-scale-up">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {editingClient ? <Edit2 className="text-blue-400" /> : <UserPlus className="text-[#FFD700]" />} 
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors text-2xl font-light">&times;</button>
            </div>
            
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Clube de Assinatura VIP</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full bg-black border border-[#FFD700]/30 text-[#FFD700] font-bold rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] appearance-none"
                >
                  <option value="" className="text-white font-normal">-- Nenhum Plano --</option>
                  {planos.map(plano => (
                    <option key={plano.id} value={plano.id} className="text-white font-normal">
                      👑 {plano.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Vincular Titular (Opcional)</label>
                <select
                  value={parentId}
                  onChange={(e) => { setParentId(e.target.value); if (e.target.value) setPhone(''); }}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] appearance-none"
                >
                  <option value="">-- Cliente Independente --</option>
                  {availableParents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      Títular: {parent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  WhatsApp {parentId ? '(Opcional)' : '*'}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  disabled={!!parentId}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] disabled:opacity-50"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className={`flex-1 py-3 font-bold rounded-lg transition-colors disabled:opacity-50 ${editingClient ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#FFD700] hover:bg-yellow-500 text-black'}`}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}