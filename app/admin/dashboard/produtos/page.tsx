'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Package, Tag, Pencil, X, Trash2, AlertTriangle, Calculator, TrendingUp } from 'lucide-react';

interface ProductType {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  isActive: boolean;
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/produtos');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEditClick = (product: ProductType) => {
    setEditingId(product.id);
    setName(product.name);
    setPrice(product.price.toString());
    setCostPrice(product.costPrice.toString());
    setStock(product.stock.toString());
    setMinStock(product.minStock.toString());
    setIsActive(product.isActive);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setCostPrice('');
    setStock('');
    setMinStock('');
    setIsActive(true);
    setError('');
  };

  // Botão Mágico: Sugere um estoque mínimo baseado em uma margem de segurança de 20%
  const handleAutoSuggestMinStock = () => {
    const currentStock = Number(stock);
    if (currentStock > 0) {
      const suggested = Math.max(3, Math.ceil(currentStock * 0.2));
      setMinStock(suggested.toString());
    } else {
      setMinStock('3'); // Mínimo de segurança padrão
    }
  };

  const handleToggleStatus = async (product: ProductType) => {
    setError('');
    setSuccess('');
    
    const newStatus = !product.isActive;
    setProducts(products.map(p => p.id === product.id ? { ...p, isActive: newStatus } : p));

    try {
      const res = await fetch(`/api/produtos/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          costPrice: product.costPrice,
          stock: product.stock,
          minStock: product.minStock,
          isActive: newStatus
        })
      });

      if (!res.ok) {
        fetchProducts();
        const data = await res.json();
        setError(data.message || 'Erro ao alterar o status do produto.');
      } else {
        setSuccess(newStatus ? 'Produto ativado!' : 'Produto inativado!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      fetchProducts();
      setError('Erro de conexão com o servidor.');
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });

      if (res.ok) {
        setSuccess('Produto excluído com sucesso!');
        fetchProducts();
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao excluir o produto.');
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
      setError('O nome do produto e o preço de venda são obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    const formattedPrice = price.replace(',', '.');
    const formattedCost = costPrice ? costPrice.replace(',', '.') : '0';

    try {
      const url = editingId ? `/api/produtos/${editingId}` : '/api/produtos';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: formattedPrice,
          costPrice: formattedCost,
          stock: stock || 0,
          minStock: minStock || 5,
          isActive: editingId ? isActive : true 
        })
      });

      if (res.ok) {
        setSuccess(editingId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
        handleCancelEdit();
        fetchProducts();
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao processar produto.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Cálculo de Margem de Lucro em Tempo Real para o formulário
  const calculatedProfit = Number(price.replace(',','.')) - Number(costPrice.replace(',','.'));
  const calculatedMargin = Number(price) > 0 ? (calculatedProfit / Number(price.replace(',','.'))) * 100 : 0;

  return (
    <div className="p-8">
      <header className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Package className="text-[#FFD700]" size={32} />
          Estoque e Compras
        </h1>
        <p className="text-zinc-400 mt-2">
          Controle seu inventário físico, margens de lucro e receba alertas de reposição.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              {editingId ? (
                <><Pencil className="text-[#FFD700]" size={20} /> Editar Produto</>
              ) : (
                <><Plus className="text-[#FFD700]" size={20} /> Novo Produto</>
              )}
            </h2>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
            {success && <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-4 text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="Ex: Pomada Efeito Matte"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800/50 pt-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Preço de Custo</label>
                  <input
                    type="number" step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-zinc-400 rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="R$ 15.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1 text-[#FFD700]">Preço de Venda *</label>
                  <input
                    type="number" step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-black border border-[#FFD700]/50 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors font-bold"
                    placeholder="R$ 35.00"
                  />
                </div>
              </div>

              {/* Box de Lucro Automático */}
              {(Number(price) > 0 && Number(costPrice) > 0) && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded flex items-center justify-between text-xs animation-scale-up">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <TrendingUp size={14} /> Lucro Líquido Estimado:
                  </div>
                  <span className="text-emerald-400 font-bold">
                    R$ {calculatedProfit.toFixed(2)} ({calculatedMargin.toFixed(0)}%)
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800/50 pt-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Estoque Físico</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="Ex: 20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Estoque Mínimo</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={minStock}
                      onChange={(e) => setMinStock(e.target.value)}
                      className="w-full bg-black border border-zinc-800 text-orange-400 font-bold rounded px-4 py-2 pr-10 focus:outline-none focus:border-[#FFD700] transition-colors"
                      placeholder="Ex: 5"
                    />
                    <button 
                      type="button" 
                      onClick={handleAutoSuggestMinStock}
                      className="absolute right-2 top-2 text-zinc-500 hover:text-[#FFD700] transition-colors"
                      title="Calcular Mínimo Ideal"
                    >
                      <Calculator size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {editingId && (
                <div className="flex items-center gap-3 py-2">
                  <div
                    onClick={() => setIsActive(!isActive)}
                    className="w-11 h-6 rounded-full cursor-pointer relative flex items-center px-0.5 transition-colors duration-300"
                    style={{ backgroundColor: isActive ? '#22c55e' : '#3f3f46' }}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-medium text-zinc-300">{isActive ? 'Produto Ativo' : 'Produto Inativo'}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#FFD700] text-black font-bold rounded px-4 py-3 hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : (editingId ? 'Atualizar Produto' : 'Salvar Produto')}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full bg-transparent border border-zinc-700 text-white font-bold rounded px-4 py-3 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={18} /> Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Tabela de Produtos com Alerta */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Tag className="text-[#FFD700]" size={20} />
              Produtos Cadastrados
            </h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-500">Carregando estoque...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
                <p className="text-zinc-500">Nenhum produto cadastrado ainda.</p>
                <p className="text-zinc-600 text-sm mt-1">Use o formulário ao lado para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="py-3 px-4 text-zinc-400 font-medium">Produto / Custo</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium text-center">Status Estoque</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium text-right">Preço Venda</th>
                      <th className="py-3 px-4 text-zinc-400 font-medium text-center w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const isLowStock = product.stock <= product.minStock;
                      
                      return (
                      <tr key={product.id} className={`border-b border-zinc-800/50 transition-colors ${!product.isActive ? 'opacity-50' : 'hover:bg-zinc-800/20'} ${isLowStock && product.isActive ? 'bg-red-500/5' : ''}`}>
                        
                        <td className="py-4 px-4">
                          <div className="text-white font-medium flex items-center gap-2">
                            {product.name}
                            {!product.isActive && <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Inativo</span>}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            Custo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.costPrice)}
                          </div>
                        </td>
                        
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`font-mono font-bold px-3 py-1 rounded text-sm ${isLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-black border border-zinc-700 text-emerald-400'}`}>
                              {product.stock} un
                            </span>
                            {isLowStock && product.isActive && (
                              <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                                <AlertTriangle size={10} /> Repor
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500">Mín: {product.minStock}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#FFD700] font-bold text-right whitespace-nowrap">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                        </td>
                        
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditClick(product)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition-colors" title="Editar">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDeleteClick(product.id)} className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-500 rounded transition-colors" title="Excluir">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
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