'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Plus, X, Pencil, Trash2, GitMerge, CheckCircle2, CalendarClock } from "lucide-react";

interface FluxoOpcao {
    id?: string;
    rotulo: string;
    descricao: string;
    tipoAcao: 'MENSAGEM' | 'PROXIMA_ETAPA' | 'ACAO_SISTEMA'; 
    mensagemFinal: string;
    proximaEtapaId: string;
    acaoEspecial: string | null;
}

interface FluxoEtapa {
    id: string;
    palavraChave: string | null;
    menuTitle: string;
    message: string;
    options: FluxoOpcao[];
}

export default function FluxosPage() {
    const [etapas, setEtapas] = useState<FluxoEtapa[]>([]);
    const [carregando, setCarregando] = useState(true);
    
    const [idEditando, setIdEditando] = useState<string | null>(null); 
    const [palavraChave, setPalavraChave] = useState("");
    const [tituloMenu, setTituloMenu] = useState("");
    const [mensagemTexto, setMensagemTexto] = useState("");
    const [opcoes, setOpcoes] = useState<FluxoOpcao[]>([]);
    const [salvando, setSalvando] = useState(false);

    async function carregarEtapas() {
        setCarregando(true);
        try {
            const res = await fetch('/api/fluxos');
            if (res.ok) setEtapas(await res.json());
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarEtapas();
    }, []);

    const prepararEdicao = (etapa: any) => {
        setIdEditando(etapa.id);
        setPalavraChave(etapa.keyword || "");
        setTituloMenu(etapa.menuTitle);
        setMensagemTexto(etapa.message);
        
        const opcoesFormatadas = etapa.options.map((op: any) => ({
            ...op,
            rotulo: op.label,
            descricao: op.description || "",
            tipoAcao: op.actionType,
            acaoEspecial: op.systemAction,
        }));
        setOpcoes(opcoesFormatadas);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicao = () => {
        setIdEditando(null); setPalavraChave(""); setTituloMenu(""); setMensagemTexto(""); setOpcoes([]);
    };

    const adicionarOpcao = () => {
        if (opcoes.length >= 10) return alert("Máximo 10 opções pelo WhatsApp.");
        setOpcoes([...opcoes, { rotulo: "", descricao: "", tipoAcao: "MENSAGEM", mensagemFinal: "", proximaEtapaId: "", acaoEspecial: null }]);
    };

    const removerOpcao = (index: number) => {
        setOpcoes(opcoes.filter((_, i) => i !== index));
    };

    const atualizarOpcao = (index: number, campo: keyof FluxoOpcao, valor: string) => {
        const novasOpcoes = [...opcoes];
        novasOpcoes[index] = { ...novasOpcoes[index], [campo]: valor };
        
        if (campo === 'tipoAcao') {
            if (valor === 'MENSAGEM') { novasOpcoes[index].proximaEtapaId = ""; novasOpcoes[index].acaoEspecial = null; }
            if (valor === 'PROXIMA_ETAPA') { novasOpcoes[index].mensagemFinal = ""; novasOpcoes[index].acaoEspecial = null; }
            if (valor === 'ACAO_SISTEMA') { novasOpcoes[index].proximaEtapaId = ""; novasOpcoes[index].mensagemFinal = ""; novasOpcoes[index].acaoEspecial = "START_SCHEDULING"; }
        }
        setOpcoes(novasOpcoes);
    };

    const salvarEtapa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (opcoes.length === 0) return alert("Adicione pelo menos 1 botão/opção.");
        setSalvando(true);
        try {
            const res = await fetch('/api/fluxos', {
                method: idEditando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: idEditando, palavraChave, tituloMenu, mensagemTexto, opcoes })
            });

            if (res.ok) { cancelarEdicao(); carregarEtapas(); } 
            else alert("Erro ao salvar a etapa.");
        } finally { setSalvando(false); }
    };

    const deletarEtapa = async (id: string) => {
        if (!confirm("Tem certeza que deseja apagar essa etapa do robô?")) return;
        await fetch(`/api/fluxos?id=${id}`, { method: 'DELETE' });
        carregarEtapas();
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <header className="mb-6 md:mb-8 border-b border-zinc-800 pb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                    <GitMerge className="text-[#FFD700]" size={32} />
                    Construtor de Fluxos (Robô)
                </h1>
                <p className="text-zinc-400 mt-2 text-sm md:text-base">Crie os menus de atendimento automático e ligue com a Agenda Inteligente.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* FORMULÁRIO DE CRIAÇÃO/EDIÇÃO */}
                <div className={`bg-zinc-900 p-6 rounded-xl shadow-sm border transition-all ${idEditando ? 'border-[#FFD700] ring-1 ring-[#FFD700]/50' : 'border-zinc-800'} h-fit sticky top-6`}>
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {idEditando ? <Pencil className="text-[#FFD700]" size={20}/> : <Plus className="text-[#FFD700]" size={20}/>}
                            {idEditando ? `Editando Etapa` : "Nova Etapa (Pergunta)"}
                        </h2>
                        {idEditando && <button type="button" onClick={cancelarEdicao} className="text-xs text-zinc-400 hover:text-white font-bold uppercase flex items-center gap-1"><X size={14}/> Cancelar</button>}
                    </div>
                    
                    <form onSubmit={salvarEtapa} className="space-y-5">
                        <div className="p-4 bg-black/40 rounded-lg border border-zinc-800">
                            <label className="block text-sm font-bold text-zinc-300 mb-2">Palavras Gatilho (Opcional - Separe por vírgula)</label>
                            <input type="text" value={palavraChave} onChange={e => setPalavraChave(e.target.value)} placeholder="Ex: MENU, OLA, INICIO" className="w-full p-3 border rounded-lg bg-black border-zinc-700 text-white uppercase text-sm focus:outline-none focus:border-[#FFD700] transition-colors" />
                            <span className="text-[10px] text-zinc-500 mt-1 block">Se o cliente digitar isso, o robô manda este menu direto.</span>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-300 mb-1">Título da Lista do WhatsApp (Máx 24 letras)</label>
                            <input type="text" maxLength={24} required value={tituloMenu} onChange={e => setTituloMenu(e.target.value)} placeholder="Ex: Menu Principal" className="w-full p-3 border rounded-lg bg-black border-zinc-800 text-white focus:outline-none focus:border-[#FFD700] transition-colors" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-zinc-300 mb-1">Mensagem do Robô</label>
                            <textarea required value={mensagemTexto} onChange={e => setMensagemTexto(e.target.value)} rows={3} placeholder="Ex: Olá! Seja bem vindo. Escolha uma opção abaixo:" className="w-full p-3 border rounded-lg bg-black border-zinc-800 text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors resize-none"></textarea>
                        </div>

                        <div className="border-t border-zinc-800 pt-6 mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-sm font-bold text-[#FFD700]">Botões / Opções do Menu</label>
                                <button type="button" onClick={adicionarOpcao} className="text-xs bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] font-bold px-3 py-1.5 rounded-lg border border-[#FFD700]/20 transition-colors flex items-center gap-1"><Plus size={14}/> Botão</button>
                            </div>

                            <div className="space-y-4">
                                {opcoes.map((opcao, index) => (
                                    <div key={index} className="p-4 border border-zinc-700 bg-black/50 rounded-xl relative group">
                                        <button type="button" onClick={() => removerOpcao(index)} className="absolute top-3 right-3 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8 mb-4">
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Nome do Botão</label>
                                                <input type="text" required maxLength={24} placeholder="Ex: Ver Preços" value={opcao.rotulo} onChange={e => atualizarOpcao(index, 'rotulo', e.target.value)} className="w-full p-2 text-sm border rounded bg-zinc-900 border-zinc-800 text-white focus:outline-none focus:border-[#FFD700]" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Descrição (Abaixo do botão)</label>
                                                <input type="text" maxLength={72} placeholder="Ex: Tabela completa" value={opcao.descricao} onChange={e => atualizarOpcao(index, 'descricao', e.target.value)} className="w-full p-2 text-sm border rounded bg-zinc-900 border-zinc-800 text-white focus:outline-none focus:border-[#FFD700]" />
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                            <label className="text-[10px] text-zinc-400 uppercase font-bold mb-2 block">O que este botão faz?</label>
                                            <div className="flex flex-wrap gap-4 mb-3">
                                                <label className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded transition-colors ${opcao.tipoAcao === 'MENSAGEM' ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'text-zinc-400 hover:text-zinc-300'}`}>
                                                    <input type="radio" className="hidden" checked={opcao.tipoAcao === 'MENSAGEM'} onChange={() => atualizarOpcao(index, 'tipoAcao', 'MENSAGEM')} /> 
                                                    <MessageSquare size={14}/> Enviar Texto Final
                                                </label>
                                                <label className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded transition-colors ${opcao.tipoAcao === 'PROXIMA_ETAPA' ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'text-zinc-400 hover:text-zinc-300'}`}>
                                                    <input type="radio" className="hidden" checked={opcao.tipoAcao === 'PROXIMA_ETAPA'} onChange={() => atualizarOpcao(index, 'tipoAcao', 'PROXIMA_ETAPA')} /> 
                                                    <GitMerge size={14}/> Ligar com Outra Etapa
                                                </label>
                                                <label className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded transition-colors ${opcao.tipoAcao === 'ACAO_SISTEMA' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-zinc-300'}`}>
                                                    <input type="radio" className="hidden" checked={opcao.tipoAcao === 'ACAO_SISTEMA'} onChange={() => atualizarOpcao(index, 'tipoAcao', 'ACAO_SISTEMA')} /> 
                                                    <CalendarClock size={14}/> Acionar Agendamento
                                                </label>
                                            </div>

                                            {opcao.tipoAcao === 'MENSAGEM' && <textarea required placeholder="Escreva a resposta final aqui..." value={opcao.mensagemFinal} onChange={e => atualizarOpcao(index, 'mensagemFinal', e.target.value)} rows={2} className="w-full p-2 text-sm border rounded bg-black border-zinc-800 text-white focus:outline-none focus:border-[#FFD700] resize-none" />}
                                            {opcao.tipoAcao === 'PROXIMA_ETAPA' && (
                                                <select required value={opcao.proximaEtapaId} onChange={e => atualizarOpcao(index, 'proximaEtapaId', e.target.value)} className="w-full p-2 text-sm border rounded bg-black border-zinc-800 text-white focus:outline-none focus:border-[#FFD700]">
                                                    <option value="">-- Selecione o menu de destino --</option>
                                                    {etapas.filter((et: any) => et.id !== idEditando).map((et: any) => <option key={et.id} value={et.id}>{et.menuTitle} {et.keyword ? `(Gatilho: ${et.keyword})` : ''}</option>)}
                                                </select>
                                            )}
                                            {opcao.tipoAcao === 'ACAO_SISTEMA' && (
                                                <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded text-emerald-400 text-xs font-medium">
                                                    <CheckCircle2 size={14}/> Este botão vai pausar o fluxo livre e iniciar a Inteligência de Agendamento da barbearia.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {opcoes.length === 0 && <div className="text-center text-zinc-500 text-sm py-4 italic">Nenhum botão criado.</div>}
                            </div>
                        </div>
                        <button type="submit" disabled={salvando} className="w-full bg-[#FFD700] hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50 mt-4 uppercase tracking-wider">
                            {salvando ? "Salvando..." : (idEditando ? "Atualizar Etapa" : "Criar Etapa")}
                        </button>
                    </form>
                </div>

                {/* LISTAGEM DOS BLOCOS (DIREITA) */}
                <div className="bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-800 h-fit">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Menus Criados (Memória do Robô)</h2>
                    {carregando ? (
                        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div></div>
                    ) : etapas.length === 0 ? (
                        <div className="text-center text-zinc-500 py-10 italic">Você ainda não criou nenhum menu.</div>
                    ) : (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                            {etapas.map((etapa: any) => (
                                <div key={etapa.id} className={`p-4 border rounded-xl transition-all ${idEditando === etapa.id ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-zinc-800 bg-black/40 hover:border-zinc-700'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                                {etapa.menuTitle} 
                                            </h3>
                                            {etapa.keyword && (
                                                <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider mt-1 inline-block">
                                                    Gatilho: {etapa.keyword}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => prepararEdicao(etapa)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded transition-colors" title="Editar"><Pencil size={14}/></button>
                                            <button onClick={() => deletarEtapa(etapa.id)} className="p-2 bg-zinc-800 hover:bg-red-500/20 text-red-500 rounded transition-colors" title="Excluir"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-3 italic">"{etapa.message}"</p>
                                    <div className="space-y-1.5 border-t border-zinc-800/50 pt-3 mt-2">
                                        {etapa.options.map((opcao: any) => (
                                            <div key={opcao.id} className="flex items-center gap-2 text-[11px] bg-zinc-900 p-2 rounded-lg border border-zinc-800/50">
                                                <span className="font-bold text-[#FFD700] min-w-[80px] truncate">{opcao.label}</span>
                                                <span className="text-zinc-600">➜</span>
                                                <span className="truncate text-zinc-400 flex-1">
                                                    {opcao.actionType === 'ACAO_SISTEMA' ? (
                                                        <span className="text-emerald-400 font-bold flex items-center gap-1"><CalendarClock size={12}/> Inicia Agendamento</span>
                                                    ) : opcao.actionType === 'PROXIMA_ETAPA' ? (
                                                        <span className="text-blue-400 flex items-center gap-1"><GitMerge size={12}/> Vai p/ Outro Menu</span>
                                                    ) : (
                                                        `Texto: ${opcao.finalMessage}`
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}