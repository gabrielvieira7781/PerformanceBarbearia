'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors, User, Phone, Wallet, Plus, Trash2, CheckCircle2, AlertCircle, ShoppingCart, Star, Award, Gift, Package } from 'lucide-react';

interface ItemType {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  type: 'SERVICE' | 'PRODUCT';
  stock?: number;
}

interface CartItem extends ItemType {
  cartId: string;
}

interface ClientType {
  id: string;
  name: string;
  phone: string;
  plan?: { 
    id: string; 
    name: string; 
    maxCuts: number;
    services?: { id: string; name: string }[] 
  } | null;
  cutsUsedThisMonth?: number;
  planExpiresAt?: string | null;
  loyaltyPoints?: number;
  loyaltyStamps?: number;
}

interface SettingsType {
  enablePointsLoyalty: boolean;
  pointsDiscountValue: number;
  enableStampsLoyalty: boolean;
  stampsRequiredForReward: number;
  stampRewardDescription: string;
}

export default function LancamentoPage() {
  const router = useRouter(); 
  
  const [activeTab, setActiveTab] = useState<'SERVICOS' | 'PRODUTOS'>('SERVICOS');
  
  const [servicesCatalog, setServicesCatalog] = useState<ItemType[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<ItemType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [clientsDb, setClientsDb] = useState<ClientType[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null); 
  const [showClientList, setShowClientList] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [discount, setDiscount] = useState('');

  const [usePoints, setUsePoints] = useState(false);
  const [useStampReward, setUseStampReward] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resServices, resProducts, resClients, resSettings] = await Promise.all([
          fetch('/api/services'),
          fetch('/api/produtos'),
          fetch('/api/clientes'),
          fetch('/api/configuracoes')
        ]);

        if (resServices.ok) {
          const data = await resServices.json();
          setServicesCatalog(data.filter((s: any) => s.isActive).map((s: any) => ({ ...s, type: 'SERVICE' })));
        }

        if (resProducts.ok) {
          const data = await resProducts.json();
          setProductsCatalog(data.filter((p: any) => p.isActive).map((p: any) => ({ ...p, type: 'PRODUCT' })));
        }

        if (resClients.ok) setClientsDb(await resClients.json());
        if (resSettings.ok) setSettings(await resSettings.json());

      } catch (err) {
        console.error("Erro ao buscar dados iniciais", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (clientName.length > 2 && !selectedClient) {
      const match = clientsDb.find(c => c.name.toLowerCase() === clientName.toLowerCase().trim());
      if (match) {
        setSelectedClient(match);
        if (match.phone && !clientPhone) setClientPhone(match.phone);
      }
    }
  }, [clientName, clientsDb, selectedClient, clientPhone]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setClientPhone(value);
  };

  const handleSelectExistingClient = (client: ClientType) => {
    setClientName(client.name);
    setClientPhone(client.phone || '');
    setSelectedClient(client); 
    setShowClientList(false);
    setUsePoints(false);
    setUseStampReward(false);
  };

  const addToCart = (item: ItemType) => {
    if (item.type === 'PRODUCT') {
      const countInCart = cart.filter(c => c.id === item.id).length;
      if (item.stock !== undefined && countInCart >= item.stock) {
        return showToast(`Estoque insuficiente! Apenas ${item.stock} disponíveis.`, 'error');
      }
    }
    setCart(prev => [...prev, { ...item, cartId: Math.random().toString(36).substring(7) }]);
    showToast(`${item.name} adicionado!`, 'success'); 
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // ==========================================
  // CÁLCULOS FINANCEIROS SUPER INTELIGENTES
  // ==========================================
  const remainingPlanCuts = selectedClient?.plan ? (selectedClient.plan.maxCuts - (selectedClient.cutsUsedThisMonth || 0)) : 0;
  let tempRemainingCuts = remainingPlanCuts;
  
  const calculatedCart = cart.map(item => {
    const isCoveredByPlan = item.type === 'SERVICE' && selectedClient?.plan?.services?.some(s => s.id === item.id);
    if (isCoveredByPlan && tempRemainingCuts > 0) {
      tempRemainingCuts--; 
      return { ...item, finalPrice: 0, isCoveredByPlan: true };
    }
    return { ...item, finalPrice: item.price, isCoveredByPlan: false };
  });

  const subtotal = calculatedCart.reduce((acc, item) => acc + item.finalPrice, 0);
  const manualDiscountValue = Number(discount) || 0;
  
  // 1. Desconto do Prêmio de Selos (Zera o item mais caro do carrinho que não esteja no Plano VIP)
  const highestPriceInCart = calculatedCart.filter(i => !i.isCoveredByPlan).length > 0 
    ? Math.max(...calculatedCart.filter(i => !i.isCoveredByPlan).map(i => i.finalPrice)) 
    : 0;
  const stampDiscountAmount = useStampReward ? highestPriceInCart : 0;

  // 2. Desconto do Cashback (Pontos)
  const subtotalAfterStampsAndManual = Math.max(0, subtotal - manualDiscountValue - stampDiscountAmount);
  
  const availablePoints = selectedClient?.loyaltyPoints || 0;
  const ptsValue = settings?.pointsDiscountValue || 0;
  const maxPointsDiscount = availablePoints * ptsValue;
  
  const actualPointsDiscount = usePoints ? Math.min(maxPointsDiscount, subtotalAfterStampsAndManual) : 0;
  const actualPointsUsed = ptsValue > 0 ? (actualPointsDiscount / ptsValue) : 0;

  // 3. Valor Final a Pagar e Desconto Total para o Backend
  const total = Math.max(0, subtotalAfterStampsAndManual - actualPointsDiscount);
  const totalFinancialDiscountToSendBackend = manualDiscountValue + stampDiscountAmount + actualPointsDiscount;

  // Auto seleciona pagamento se o total zerar
  useEffect(() => {
    if (cart.length > 0 && total === 0) {
      if (calculatedCart.some(i => i.isCoveredByPlan)) {
        setPaymentMethod('Plano VIP');
      } else if (usePoints || useStampReward) {
        setPaymentMethod('Fidelidade');
      }
    }
  }, [total, cart.length, calculatedCart, usePoints, useStampReward]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return showToast('Adicione pelo menos um item ao carrinho.', 'error');
    if (!clientName) return showToast('O nome do cliente é obrigatório.', 'error');
    if (!paymentMethod) return showToast('Selecione a forma de pagamento.', 'error');

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
          discount: totalFinancialDiscountToSendBackend, // Envia o somatório de todos os descontos aplicados
          totalToPay: total,
          usedPoints: actualPointsUsed,
          usedStampsReward: useStampReward
        })
      });

      if (res.ok) {
        showToast('Lançamento concluído! Redirecionando...', 'success'); 
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        const data = await res.json();
        showToast(data.message || 'Erro ao processar o lançamento.', 'error');
        setIsSubmitting(false); 
      }
    } catch (error) {
      showToast('Erro de conexão.', 'error');
      setIsSubmitting(false);
    } 
  };

  const filteredClients = clientsDb.filter(c => {
    const searchName = clientName.toLowerCase();
    const searchPhone = clientPhone.replace(/\D/g, '');
    let isMatch = true;

    if (searchName) {
      const matchName = c.name.toLowerCase().includes(searchName);
      const nameAsPhone = clientName.replace(/\D/g, '');
      const matchPhone = nameAsPhone.length > 0 && c.phone ? c.phone.includes(nameAsPhone) : false;
      isMatch = matchName || matchPhone;
    }
    if (searchPhone && isMatch) {
      isMatch = c.phone ? c.phone.includes(searchPhone) : false;
    }
    return isMatch;
  });

  const canUseStamps = selectedClient && settings?.enableStampsLoyalty && ((selectedClient.loyaltyStamps || 0) >= (settings?.stampsRequiredForReward || 9999));
  const hasPoints = selectedClient && settings?.enablePointsLoyalty && ((selectedClient.loyaltyPoints || 0) > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShoppingCart className="text-[#FFD700]" size={32} />
          Lançar Venda / Serviço
        </h1>
        <p className="text-zinc-400 mt-2">Selecione os serviços ou produtos vendidos e finalize o atendimento.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CATÁLOGO ESQUERDO */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            
            <div className="flex gap-4 mb-6 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('SERVICOS')}
                className={`pb-3 px-2 font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'SERVICOS' ? 'border-[#FFD700] text-[#FFD700]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                <Scissors size={18} /> Serviços
              </button>
              <button
                onClick={() => setActiveTab('PRODUTOS')}
                className={`pb-3 px-2 font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'PRODUTOS' ? 'border-[#FFD700] text-[#FFD700]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                <Package size={18} /> Produtos (Estoque)
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-500">Carregando catálogo...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {(activeTab === 'SERVICOS' ? servicesCatalog : productsCatalog).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    disabled={item.type === 'PRODUCT' && item.stock !== undefined && item.stock <= 0}
                    className="flex flex-col text-left bg-black border border-zinc-800 p-4 rounded-lg hover:border-[#FFD700] hover:bg-zinc-800/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-800"
                  >
                    <span className="text-white font-medium group-hover:text-[#FFD700] transition-colors line-clamp-1">{item.name}</span>
                    <div className="flex items-center justify-between w-full mt-2">
                      <span className="text-zinc-400 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                      </span>
                      {item.type === 'PRODUCT' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.stock && item.stock > 0 ? 'bg-zinc-800 text-zinc-400' : 'bg-red-500/20 text-red-400'}`}>
                          {item.stock && item.stock > 0 ? `${item.stock} un` : 'Esgotado'}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                
                {(activeTab === 'SERVICOS' ? servicesCatalog : productsCatalog).length === 0 && (
                  <div className="col-span-full text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500">
                    Nenhum {activeTab === 'SERVICOS' ? 'serviço' : 'produto'} cadastrado.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RESUMO DIREITO */}
        <div className="lg:col-span-1">
          <form onSubmit={handleCheckout} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Wallet className="text-[#FFD700]" size={20} /> Checkout
            </h2>

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
                      if (selectedClient && selectedClient.name.toLowerCase() !== e.target.value.toLowerCase()) {
                        setSelectedClient(null); 
                        setUsePoints(false);
                        setUseStampReward(false);
                      }
                      setShowClientList(true);
                    }}
                    onFocus={() => setShowClientList(true)}
                    className="w-full bg-black border border-zinc-800 text-white rounded pl-9 pr-4 py-2 focus:outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="Ex: João Silva"
                  />
                </div>
                
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

              {selectedClient?.plan && (
                <div className="mt-4 p-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg flex flex-col gap-1 animation-scale-up">
                  <div className="flex items-center gap-2 text-[#FFD700] font-bold text-sm uppercase">
                    <span>👑 Cliente VIP: {selectedClient.plan.name}</span>
                  </div>
                  <p className="text-zinc-300 text-xs mt-1">
                    Cortes usados: <strong className="text-white">{selectedClient.cutsUsedThisMonth || 0}</strong> de 
                    <strong className="text-white"> {selectedClient.plan.maxCuts === 999 ? 'Ilimitado' : selectedClient.plan.maxCuts}</strong>
                  </p>
                </div>
              )}

              {/* BANNER DE GAMIFICAÇÃO E PROGRESSO DO CLIENTE */}
              {selectedClient && (settings?.enablePointsLoyalty || settings?.enableStampsLoyalty) && (
                <div className="mt-4 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg animation-scale-up shadow-inner">
                  <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <Award className="text-[#FFD700]" size={16} /> Progresso do Cliente
                  </h3>
                  
                  <div className="space-y-4">
                    {settings?.enableStampsLoyalty && (
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-400 font-medium">Cartão de Selos</span>
                          <span className="text-orange-400 font-bold">{selectedClient.loyaltyStamps || 0} de {settings.stampsRequiredForReward}</span>
                        </div>
                        <div className="w-full bg-black rounded-full h-2 border border-zinc-700 overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((selectedClient.loyaltyStamps || 0) / settings.stampsRequiredForReward) * 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1.5">
                          {((selectedClient.loyaltyStamps || 0) >= settings.stampsRequiredForReward) 
                            ? <span className="text-orange-400 font-bold">🎉 Meta atingida! Prêmio liberado.</span>
                            : `Faltam ${settings.stampsRequiredForReward - (selectedClient.loyaltyStamps || 0)} cortes para ganhar: ${settings.stampRewardDescription}`
                          }
                        </p>
                      </div>
                    )}

                    {settings?.enablePointsLoyalty && (
                      <div className={`${settings?.enableStampsLoyalty ? 'pt-3 border-t border-zinc-700/50' : ''}`}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400 font-medium">Cashback (Pontos)</span>
                          <span className="text-blue-400 font-bold">{selectedClient.loyaltyPoints || 0} pts</span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Equivale a <strong className="text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxPointsDiscount)}</strong> para usar em descontos.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OPÇÕES DE RESGATE DE BENEFÍCIOS */}
              {(hasPoints || canUseStamps) && (
                <div className="mt-4 space-y-2 animation-scale-up">
                  <p className="text-xs font-bold text-zinc-500 uppercase">Resgatar Benefícios</p>
                  
                  {canUseStamps && (
                    <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${useStampReward ? 'bg-orange-500/10 border-orange-500/50' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-orange-400 flex items-center gap-1"><Gift size={14}/> Resgatar Prêmio</span>
                        <span className="text-[10px] text-zinc-400">{settings?.stampRewardDescription} (Abate o maior valor)</span>
                      </div>
                      <input type="checkbox" checked={useStampReward} onChange={(e) => setUseStampReward(e.target.checked)} className="accent-orange-500 w-4 h-4" />
                    </label>
                  )}

                  {hasPoints && (
                    <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${usePoints ? 'bg-blue-500/10 border-blue-500/50' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-blue-400 flex items-center gap-1"><Star size={14}/> Usar Cashback</span>
                        <span className="text-[10px] text-zinc-400">Abate até {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxPointsDiscount)} do valor final</span>
                      </div>
                      <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6 min-h-[120px] max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {calculatedCart.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-8 italic">Carrinho vazio.</div>
              ) : (
                <ul className="space-y-3">
                  {calculatedCart.map(item => (
                    <li key={item.cartId} className="flex justify-between items-center bg-black p-3 rounded border border-zinc-800">
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium flex items-center gap-2">
                          {item.type === 'PRODUCT' ? <Package size={14} className="text-zinc-500"/> : <Scissors size={14} className="text-zinc-500"/>}
                          {item.name}
                          {item.isCoveredByPlan && (
                            <span className="bg-[#FFD700]/20 text-[#FFD700] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">VIP</span>
                          )}
                        </span>
                        <span className="text-xs font-mono mt-1 pl-5">
                          {item.isCoveredByPlan ? (
                            <div className="flex gap-2 items-center">
                              <span className="line-through text-red-400/50">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</span>
                              <span className="text-emerald-400 font-bold">R$ 0,00</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</span>
                          )}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.cartId)} className="text-red-500 hover:text-red-400 p-2 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
                    <option value="Plano VIP">👑 Plano VIP</option>
                    <option value="Fidelidade">🎁 Fidelidade / Prêmio</option>
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

              {/* NOTA FISCAL DESCRIMINADA */}
              <div className="bg-black/50 p-4 rounded-lg border border-zinc-800 mt-4">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>Subtotal</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                </div>
                
                {manualDiscountValue > 0 && (
                  <div className="flex justify-between text-sm text-red-400 mb-2">
                    <span>Desconto Manual</span>
                    <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manualDiscountValue)}</span>
                  </div>
                )}
                
                {useStampReward && stampDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-orange-400 mb-2">
                    <span className="flex items-center gap-1"><Gift size={12}/> Prêmio Resgatado</span>
                    <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stampDiscountAmount)}</span>
                  </div>
                )}

                {actualPointsDiscount > 0 && (
                  <div className="flex justify-between text-sm text-blue-400 mb-2">
                    <span className="flex items-center gap-1"><Star size={12}/> Cashback ({Math.floor(actualPointsUsed)} pts)</span>
                    <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(actualPointsDiscount)}</span>
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