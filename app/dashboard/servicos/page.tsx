// app/dashboard/servicos/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Scissors, User, Phone, Wallet, Plus, Trash2, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

interface ServiceType {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface CartItem extends ServiceType {
  cartId: string;
}

interface ClientType {
  id: string;
  name: string;
  phone: string;
}

export default function LancamentoPage() {
  const [catalog, setCatalog] = useState<ServiceType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lista de clientes para o autocompletar
  const [clientsDb, setClientsDb] = useState<ClientType[]>([]);
  const [showClientList, setShowClientList] = useState(false);
  
  // Dados do Formulário
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [discount, setDiscount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Busca o catálogo de serviços
        const resServices = await fetch('/api/services');
        if (resServices.ok) {
          const dataServices = await resServices.json();
          setCatalog(dataServices.filter((s: ServiceType) => s.isActive));
        }

        // Busca os clientes já cadastrados
        const resClients = await fetch('/api/clientes');
        if (resClients.ok) {
          const dataClients = await resClients.json();
          setClientsDb(dataClients);
        }
      } catch (err) {
        console.error("Erro ao buscar dados iniciais", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Função para formatar o telefone no padrão WhatsApp (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
    
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    setClientPhone(value);
  };

  const handleSelectExistingClient = (client: ClientType) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setShowClientList(false);
  };

  const addToCart = (service: ServiceType) => {
    setCart([...cart, { ...service, cartId: Math.random().toString(36).substring(7) }]);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
  const discountValue = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountValue);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) return showToast('Adicione pelo menos um serviço ao carrinho.', 'error');
    if (!clientName) return showToast('O nome do cliente é obrigatório.', 'error');
    if (!paymentMethod) return showToast('Selecione a forma de pagamento.', 'error');

    // Remove a formatação visual do telefone antes de enviar para o banco
    const cleanPhone = clientPhone.replace(/\D/g, '');

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientPhone: cleanPhone,
          cart,
          paymentMethod,
          discount: discountValue,
          totalToPay: total
        })
      });

      if (res.ok) {
        showToast('Serviço lançado com sucesso!', 'success');
        
        // Atualiza a lista de clientes silenciosamente caso seja um cliente novo
        fetch('/api/clientes').then(r => r.json()).then(data => setClientsDb(data)).catch(() => {});

        // Limpa o PDV para o próximo cliente
        setCart([]);
        setClientName('');
        setClientPhone('');
        setPaymentMethod('');
        setDiscount('');
      } else {
        const data = await res.json();
        showToast(data.message || 'Erro ao processar o lançamento.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão com o servidor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtra os clientes baseados no que o barbeiro digitou
  const filteredClients = clientsDb.filter(c => 
    c.name.toLowerCase().includes(clientName.toLowerCase()) || 
    c.phone.includes(clientPhone.replace(/\D/g, ''))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Scissors className="text-[#FFD700]" size={32} />
          Lançar Serviço
        </h1>
        <p className="text-zinc-400 mt-2">Selecione os serviços realizados e finalize o atendimento.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Catálogo de Serviços */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="text-[#FFD700]" size={20} />
              Catálogo de Serviços
            </h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-500">Carregando catálogo...</div>
            ) : catalog.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
                <p className="text-zinc-500">Nenhum serviço ativo encontrado.</p>
                <p className="text-zinc-600 text-sm mt-1">Peça para o administrador cadastrar os serviços no painel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {catalog.map(service => (
                  <button
                    key={service.id}
                    onClick={() => addToCart(service)}
                    className="flex flex-col text-left bg-black border border-zinc-800 p-4 rounded-lg hover:border-[#FFD700] hover:bg-zinc-800/50 transition-all group"
                  >
                    <span className="text-white font-medium group-hover:text-[#FFD700] transition-colors line-clamp-1">{service.name}</span>
                    <span className="text-zinc-400 font-mono mt-2">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Carrinho e Checkout */}
        <div className="lg:col-span-1">
          <form onSubmit={handleCheckout} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShoppingCart className="text-[#FFD700]" size={20} />
              Resumo do Atendimento
            </h2>

            {/* Dados do Cliente */}
            <div className="space-y-4 mb-6 pb-6 border-b border-zinc-800 relative">
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome do Cliente *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      setShowClientList(true);
                    }}
                    onFocus={() => setShowClientList(true)}
                    className="w-full bg-black border border-zinc-800 text-white rounded pl-9 pr-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="Ex: João Silva"
                  />
                </div>
                
                {/* Dropdown de Autocompletar */}
                {showClientList && clientName.length > 1 && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto custom-scrollbar">
                    {filteredClients.map(client => (
                      <div 
                        key={client.id} 
                        onClick={() => handleSelectExistingClient(client)}
                        className="p-3 hover:bg-zinc-700 cursor-pointer border-b border-zinc-700/50 last:border-0"
                      >
                        <p className="text-white text-sm font-medium">{client.name}</p>
                        <p className="text-zinc-400 text-xs">{client.phone ? `WhatsApp: ${client.phone}` : 'Sem telefone'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Telefone (WhatsApp)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    className="w-full bg-black border border-zinc-800 text-white rounded pl-9 pr-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors font-mono"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Lista do Carrinho */}
            <div className="mb-6 min-h-[120px] max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {cart.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-8 italic">
                  Nenhum serviço selecionado.
                </div>
              ) : (
                <ul className="space-y-3">
                  {cart.map(item => (
                    <li key={item.cartId} className="flex justify-between items-center bg-black p-3 rounded border border-zinc-800">
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">{item.name}</span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.cartId)} className="text-red-500 hover:text-red-400 p-1 transition-colors" title="Remover">
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pagamento e Totais */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Pagamento *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FFD700] transition-colors appearance-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="Dinheiro">💵 Dinheiro</option>
                    <option value="Pix">💠 Pix</option>
                    <option value="Débito">💳 Débito</option>
                    <option value="Crédito">💳 Crédito</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Desconto</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded px-3 py-2 text-sm text-right focus:outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div className="bg-black/50 p-4 rounded-lg border border-zinc-800 mt-4">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>Subtotal</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-sm text-red-400 mb-2">
                    <span>Desconto</span>
                    <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountValue)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-[#FFD700] pt-2 border-t border-zinc-800/50 mt-2">
                  <span>TOTAL</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className="w-full bg-[#FFD700] text-black font-bold rounded py-4 flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 uppercase tracking-wider"
              >
                <Wallet size={20} />
                {isSubmitting ? 'Processando...' : 'Finalizar Atendimento'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}