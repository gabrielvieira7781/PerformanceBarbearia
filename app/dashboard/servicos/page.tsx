// app/admin/dashboard/servicos/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Scissors, Tag, Pencil, X, Trash2 } from 'lucide-react';

interface ServiceType {
  id: string;
  name: string;
  price: number;
  description: string | null;
  isActive: boolean;
}

export default function ServicosPage() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (err) {
      console.error("Erro ao buscar serviços:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleEditClick = (service: ServiceType) => {
    setEditingId(service.id);
    setName(service.name);
    setPrice(service.price.toString());
    setDescription(service.description || '');
    setIsActive(service.isActive);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setDescription('');
    setIsActive(true);
    setError('');
  };

  const handleToggleStatus = async (service: ServiceType) => {
    setError('');
    setSuccess('');
    
    // Atualiza a interface instantaneamente (Optimistic UI)
    const newStatus = !service.isActive;
    setServices(services.map(s => s.id === service.id ? { ...s, isActive: newStatus } : s));

    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: service.name,
          price: service.price,
          description: service.description,
          isActive: newStatus
        })
      });

      if (!res.ok) {
        fetchServices();
        const data = await res.json();
        setError(data.message || 'Erro ao alterar o status do serviço.');
      } else {
        setSuccess(newStatus ? 'Serviço ativado!' : 'Serviço inativado!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      fetchServices();
      setError('Erro de conexão com o servidor.');
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('Serviço excluído com sucesso!');
        fetchServices();
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao excluir o serviço.');
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

    if (!name || !price) {
      setError('O nome do serviço e o preço são obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    const formattedPrice = price.replace(',', '.');

    try {
      const url = editingId ? `/api/services/${editingId}` : '/api/services';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: formattedPrice,
          description,
          isActive: editingId ? isActive : true 
        })
      });

      if (res.ok) {
        setSuccess(editingId ? 'Serviço atualizado com sucesso!' : 'Serviço cadastrado com sucesso!');
        handleCancelEdit();
        fetchServices();
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao processar serviço.');
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
          <Scissors className="text-[#FFD700]" size={32} />
          Serviços e Preços
        </h1>
        <p className="text-zinc-400 mt-2">
          Cadastre e gerencie os cortes, produtos e serviços oferecidos pela sua barbearia.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="text-[#FFD700]" size={20} />
                  Editar Serviço
                </>
              ) : (
                <>
                  <Plus className="text-[#FFD700]" size={20} />
                  Novo Serviço
                </>
              )}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-4 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="Ex: Corte Degradê"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Preço Padrão (R$) *</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="Ex: 45.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Descrição (Opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors resize-none h-24"
                  placeholder="Detalhes sobre o serviço..."
                />
              </div>

              {/* Botão de Toggle blindado com cor nativa (Formulário) */}
              {editingId && (
                <div className="flex items-center gap-3 py-2">
                  <div
                    onClick={() => setIsActive(!isActive)}
                    className="w-11 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300"
                    style={{ backgroundColor: isActive ? '#22c55e' : '#3f3f46' }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-300">
                    {isActive ? 'Serviço Ativo' : 'Serviço Inativo'}
                  </span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#FFD700] text-black font-bold rounded px-4 py-3 hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : (editingId ? 'Atualizar Serviço' : 'Salvar Serviço')}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full bg-transparent border border-zinc-700 text-white font-bold rounded px-4 py-3 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Tabela de Serviços */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Tag className="text-[#FFD700]" size={20} />
              Catálogo de Serviços
            </h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-500">
                Carregando catálogo...
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
                <p className="text-zinc-500">Nenhum serviço cadastrado ainda.</p>
                <p className="text-zinc-600 text-sm mt-1">Use o formulário ao lado para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="py-3 px-4 text-zinc-400 font-medium">Serviço</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium hidden md:table-cell text-center">Status</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium text-right">Preço</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id} className={`border-b border-zinc-800/50 transition-colors ${!service.isActive ? 'opacity-50 hover:opacity-100' : 'hover:bg-zinc-800/20'}`}>
                        <td className="py-4 px-4 text-white font-medium">
                          {service.name}
                        </td>
                        
                        {/* Botão de Toggle blindado com cor nativa (Tabela) */}
                        <td className="py-4 px-4 hidden md:table-cell">
                          <div className="flex justify-center">
                            <div
                              onClick={() => handleToggleStatus(service)}
                              title={service.isActive ? "Desativar serviço" : "Ativar serviço"}
                              className="w-11 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300"
                              style={{ backgroundColor: service.isActive ? '#22c55e' : '#3f3f46' }}
                            >
                              <div
                                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${
                                  service.isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#FFD700] font-bold text-right whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(service.price)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEditClick(service)}
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition-colors"
                              title="Editar Serviço"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(service.id)}
                              className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-500 rounded transition-colors"
                              title="Excluir Serviço"
                            >
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