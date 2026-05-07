'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Clock, User, Scissors, Plus, X, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Trash2, Wallet, Users } from 'lucide-react';

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  client: { id: string; name: string; phone: string };
  user: { id: string; name: string };
  service: { id: string; name: string; price: number } | null;
}

interface ClientType {
  id: string;
  name: string;
  phone: string;
}

interface ServiceType {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export default function AgendaPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [clientsDb, setClientsDb] = useState<ClientType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [hasManagerPrivileges, setHasManagerPrivileges] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  const getLocalDateString = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
  const [selectedBarberIdFilter, setSelectedBarberIdFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientList, setShowClientList] = useState(false);
  
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('09:40');
  const [formBarberId, setFormBarberId] = useState('');
  
  const [peopleCount, setPeopleCount] = useState(1);
  const [servicesPerPerson, setServicesPerPerson] = useState<string[][]>([[]]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    const checkPermsAndFetchData = async () => {
      const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
      const idMatch = document.cookie.match(new RegExp('(^| )user_id=([^;]+)'));
      const role = roleMatch ? roleMatch[2] : '';
      const uid = idMatch ? idMatch[2] : '';
      
      setCurrentUserId(uid);
      if (role === 'ADMIN') {
        setHasManagerPrivileges(true);
      } else {
        setFormBarberId(uid);
        setSelectedBarberIdFilter(uid);
      }

      try {
        const [resBarbers, resServices, resClients] = await Promise.all([
          fetch('/api/team'), fetch('/api/services'), fetch('/api/clientes')
        ]);
        if (resBarbers.ok) setBarbers(await resBarbers.json());
        if (resServices.ok) setServices((await resServices.json()).filter((s: any) => s.isActive));
        if (resClients.ok) setClientsDb(await resClients.json());
      } catch (error) {
        console.error("Erro ao buscar dependências da agenda", error);
      }
    };
    checkPermsAndFetchData();
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate: selectedDate,
        endDate: selectedDate,
        ...(selectedBarberIdFilter && { barberId: selectedBarberIdFilter })
      }).toString();

      const res = await fetch(`/api/agenda?${query}`);
      if (res.ok) setAppointments(await res.json());
    } catch (error) {
      showToast('Erro ao carregar a agenda.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBarberIdFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const changeDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00Z`);
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateString(d));
  };

  useEffect(() => {
    if (clientName.length > 2 && !selectedClientId) {
      const match = clientsDb.find(c => c.name.toLowerCase() === clientName.toLowerCase().trim());
      if (match) {
        setSelectedClientId(match.id);
        if (match.phone && !clientPhone) setClientPhone(match.phone);
      }
    }
  }, [clientName, clientsDb, selectedClientId, clientPhone]);

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
    setSelectedClientId(client.id); 
    setShowClientList(false);
  };

  const handlePeopleCountChange = (newVal: number) => {
    if (newVal < 1) newVal = 1;
    if (newVal > 5) newVal = 5; 
    setPeopleCount(newVal);
    
    setServicesPerPerson(prev => {
      const next = [...prev];
      while (next.length < newVal) next.push([]);
      while (next.length > newVal) next.pop();
      return next;
    });
  };

  // REGRA DE OURO: Bloqueia 2 cortes de cabelo para a mesma pessoa
  const toggleServiceForPerson = (personIndex: number, serviceId: string) => {
    setServicesPerPerson(prev => {
      const next = [...prev];
      const personServs = next[personIndex];
      const clickedService = services.find(s => s.id === serviceId);
      
      if (!clickedService) return next;

      if (personServs.includes(serviceId)) {
        // Já está selecionado, então desmarca
        next[personIndex] = personServs.filter(id => id !== serviceId);
      } else {
        // Função para identificar se é corte de cabelo
        const isCorteCabelo = (name: string) => {
          const lower = name.toLowerCase();
          return lower.includes('corte') && !lower.includes('barba');
        };

        if (isCorteCabelo(clickedService.name)) {
          // Se for corte de cabelo, remove qualquer OUTRO corte de cabelo da lista daquela pessoa
          const servicosSemCorte = personServs.filter(id => {
            const s = services.find(x => x.id === id);
            return s ? !isCorteCabelo(s.name) : true;
          });
          next[personIndex] = [...servicosSemCorte, serviceId]; // Adiciona o novo corte
        } else {
          // Se for barba, sobrancelha, luzes, apenas adiciona normalmente
          next[personIndex] = [...personServs, serviceId];
        }
      }
      return next;
    });
  };

  // CÁLCULO DE TEMPO AUTOMÁTICO (Soma o tempo de todas as pessoas)
  useEffect(() => {
    if (startTimeStr) {
      let totalMin = 0;
      const allSelectedIds = servicesPerPerson.flat();
      
      if (allSelectedIds.length === 0) {
        totalMin = 40; 
      } else {
        totalMin = allSelectedIds.reduce((acc, id) => {
          const s = services.find(x => x.id === id);
          return acc + (s?.duration || 40);
        }, 0);
      }

      const [h, m] = startTimeStr.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m + totalMin, 0);
      setEndTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  }, [startTimeStr, servicesPerPerson, services]);

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return showToast('O nome do cliente é obrigatório.', 'error');
    if (!formBarberId && hasManagerPrivileges) return showToast('Selecione o barbeiro.', 'error');
    if (!startTimeStr || !endTimeStr) return showToast('Preencha o horário.', 'error');

    setIsSubmitting(true);
    const startDateTime = new Date(`${selectedDate}T${startTimeStr}:00`).toISOString();
    const endDateTime = new Date(`${selectedDate}T${endTimeStr}:00`).toISOString();

    const allSelectedIds = servicesPerPerson.flat();

    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId || undefined,
          clientName: clientName, 
          clientPhone: clientPhone.replace(/\D/g, ''),
          barberId: formBarberId || currentUserId,
          serviceId: allSelectedIds[0] || undefined, 
          startTime: startDateTime,
          endTime: endDateTime
        })
      });

      if (res.ok) {
        const novoAgendamento = await res.json();
        
        const fullServicesToCache = servicesPerPerson.flatMap((personServs, index) => {
          return personServs.map(id => {
             const s = services.find(x => x.id === id);
             if (!s) return null;
             return { 
               ...s, 
               name: peopleCount > 1 ? `${s.name} (${index === 0 ? 'Titular' : 'Acomp. ' + index})` : s.name 
             };
          }).filter(Boolean);
        });

        if (fullServicesToCache.length > 0) {
           localStorage.setItem(`agenda_services_${novoAgendamento.id}`, JSON.stringify(fullServicesToCache));
        }

        showToast('Agendado com sucesso!', 'success');
        setIsModalOpen(false);
        setSelectedBarberIdFilter(formBarberId || currentUserId);
        
        setClientName(''); setClientPhone(''); setSelectedClientId(null); 
        setPeopleCount(1); setServicesPerPerson([[]]);
        
        fetchAppointments();
      } else {
        const data = await res.json();
        showToast(data.message || 'Erro ao agendar.', 'error');
      }
    } catch (error) { showToast('Erro de conexão.', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Deseja cancelar e liberar este horário?')) return;
    try {
      const res = await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Horário liberado.', 'success');
        setAppointments(prev => prev.filter(app => app.id !== id));
        localStorage.removeItem(`agenda_services_${id}`);
      } else showToast('Erro ao cancelar.', 'error');
    } catch (e) { showToast('Erro de conexão.', 'error'); }
  };

  const sendToCheckout = async (app: Appointment) => {
    const cachedServices = localStorage.getItem(`agenda_services_${app.id}`);
    const servicesPayload = cachedServices ? JSON.parse(cachedServices) : (app.service ? [app.service] : []);

    const checkoutData = {
      clientName: app.client.name,
      clientPhone: app.client.phone || '',
      services: servicesPayload
    };

    localStorage.setItem('checkout_transfer', JSON.stringify(checkoutData));
    
    try {
      await fetch(`/api/agenda/${app.id}`, { method: 'DELETE' });
      localStorage.removeItem(`agenda_services_${app.id}`);
    } catch(e) {}

    router.push('/dashboard/servicos');
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

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto relative animate-in fade-in duration-500">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{toast.message}</p>
        </div>
      )}

      <header className="mb-6 border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <CalendarIcon className="text-[#FFD700]" size={32} /> Agenda da Barbearia
          </h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base">Controle os horários e envie direto para o PDV.</p>
        </div>
        <button onClick={() => { 
          if(!formBarberId && barbers.length > 0 && !hasManagerPrivileges) setFormBarberId(currentUserId); 
          setIsModalOpen(true); 
        }} className="bg-[#FFD700] hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 w-full md:w-auto">
          <Plus size={20} /> Agendar Horário
        </button>
      </header>

      {/* BARRA DE DATA E FILTRO */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-center">
          <button onClick={() => changeDate(-1)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"><ChevronLeft size={20} /></button>
          <div className="flex flex-col items-center min-w-[140px]">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold text-lg focus:outline-none text-center cursor-pointer" />
            <span className="text-xs text-[#FFD700] font-medium uppercase tracking-wider mt-0.5">{new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"><ChevronRight size={20} /></button>
        </div>

        {hasManagerPrivileges && (
          <div className="w-full md:w-auto flex items-center gap-2 bg-black px-3 py-2 rounded-lg border border-zinc-800">
            <User size={16} className="text-zinc-400" />
            <select value={selectedBarberIdFilter} onChange={(e) => setSelectedBarberIdFilter(e.target.value)} className="bg-transparent text-white focus:outline-none text-sm w-full outline-none">
              <option value="">Todos os Barbeiros</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* LINHA DO TEMPO DOS AGENDAMENTOS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
             <div className="w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
             Carregando agenda...
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3 text-center">
             <div className="p-4 bg-zinc-800/50 rounded-full mb-2"><Clock size={40} className="text-zinc-600" /></div>
             <p>Nenhum horário marcado para este dia.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((app) => {
              const startDate = new Date(app.startTime);
              const isPast = startDate < new Date();
              
              const cachedServices = localStorage.getItem(`agenda_services_${app.id}`);
              const displayServices = cachedServices ? JSON.parse(cachedServices) : (app.service ? [app.service] : []);

              return (
                <div key={app.id} className={`bg-black border flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg gap-4 transition-all hover:border-zinc-700 ${isPast ? 'border-zinc-800/50 opacity-60' : 'border-zinc-800 border-l-4 border-l-[#FFD700]'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-16 shrink-0">
                      <span className="text-lg font-black text-white">{startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Até {new Date(app.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="pl-4 border-l border-zinc-800">
                      <h3 className="text-white font-bold text-lg">{app.client?.name || 'Cliente'}</h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {displayServices.length > 0 && displayServices.map((ds: any, idx: number) => (
                           <span key={idx} className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded font-medium flex items-center gap-1 border border-zinc-700">
                             <Scissors size={10}/> {ds.name}
                           </span>
                        ))}
                        {hasManagerPrivileges && (
                          <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-1 rounded font-bold uppercase border border-blue-500/20">
                            Com: {app.user?.name.split(' ')[0]}
                          </span>
                        )}
                        {app.client?.phone && (
                          <span className="text-zinc-500 text-[10px] px-2 py-1 rounded font-mono border border-zinc-800 flex items-center gap-1">
                            {app.client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 border-t border-zinc-800 md:border-0 md:pt-0">
                    <button onClick={() => handleCancelAppointment(app.id)} className="flex-1 md:flex-none p-2 md:px-3 md:py-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm font-medium">
                      <X size={16} /> <span className="md:hidden lg:inline">Cancelar</span>
                    </button>
                    <button onClick={() => sendToCheckout(app)} className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                      <Wallet size={16} /> Atender
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE NOVO AGENDAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden my-auto">
            <div className="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50 sticky top-0 z-10">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Clock className="text-[#FFD700]" /> Novo Agendamento
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveAppointment} className="p-4 md:p-6 space-y-4">
              
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cliente *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                  <input type="text" value={clientName} onChange={(e) => { setClientName(e.target.value); if (selectedClientId) setSelectedClientId(null); setShowClientList(true); }} onFocus={() => setShowClientList(true)} className="w-full bg-black border border-zinc-800 text-white rounded pl-9 pr-4 py-2 focus:outline-none focus:border-[#FFD700]" placeholder="Nome do cliente" />
                </div>
                {showClientList && clientName.length > 1 && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto custom-scrollbar">
                    {filteredClients.map(client => (
                      <div key={client.id} onClick={() => handleSelectExistingClient(client)} className="p-3 hover:bg-zinc-700 cursor-pointer border-b border-zinc-700/50 last:border-0">
                        <p className="text-white text-sm font-medium">{client.name}</p>
                        <p className="text-zinc-400 text-xs">{client.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Telefone / WhatsApp</label>
                <input type="text" value={clientPhone} onChange={handlePhoneChange} maxLength={15} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700] font-mono" placeholder="(00) 00000-0000" />
              </div>

              {hasManagerPrivileges && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Profissional *</label>
                  <select value={formBarberId} onChange={(e) => setFormBarberId(e.target.value)} className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]">
                    <option value="">Selecione quem vai atender...</option>
                    {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800/50">
                <div className="flex items-center justify-between bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50 mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-zinc-400"/>
                    <label className="text-sm font-medium text-zinc-300">Quantas Pessoas?</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handlePeopleCountChange(peopleCount - 1)} className="w-7 h-7 bg-zinc-700 rounded-full flex items-center justify-center text-white hover:bg-zinc-600 font-bold">-</button>
                    <span className="font-bold text-white text-lg w-4 text-center">{peopleCount}</span>
                    <button type="button" onClick={() => handlePeopleCountChange(peopleCount + 1)} className="w-7 h-7 bg-[#FFD700] rounded-full flex items-center justify-center text-black font-bold hover:bg-yellow-500">+</button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                  {Array.from({ length: peopleCount }).map((_, pIndex) => (
                    <div key={pIndex} className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                      <label className="block text-[11px] font-bold text-zinc-500 uppercase mb-2">
                        {peopleCount === 1 ? 'Serviços Desejados' : (pIndex === 0 ? 'Pessoa 1 (Titular)' : `Pessoa ${pIndex + 1} (Acompanhante)`)}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {services.map(s => {
                          const isSelected = servicesPerPerson[pIndex].includes(s.id);
                          return (
                            <button key={s.id} type="button" onClick={() => toggleServiceForPerson(pIndex, s.id)} className={`text-[11px] px-3 py-1.5 rounded-full font-bold border transition-colors ${isSelected ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/50' : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}>
                              {s.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/50 mt-4">
                <div>
                  <label className="block text-sm font-medium text-[#FFD700] mb-1">Início *</label>
                  <input type="time" required value={startTimeStr} onChange={(e) => setStartTimeStr(e.target.value)} className="w-full bg-black border border-[#FFD700]/50 text-white font-bold rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1 flex items-center justify-between">
                    Término <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.5 rounded">Auto</span>
                  </label>
                  <input type="time" required value={endTimeStr} onChange={(e) => setEndTimeStr(e.target.value)} className="w-full bg-black border border-zinc-800 text-zinc-400 rounded px-4 py-2 focus:outline-none focus:border-[#FFD700]" />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#FFD700] hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Confirmar Horário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}