
import React, { useState, useEffect, useRef } from 'react';
import { Viatura, InventoryCheck, CheckStatus, CheckEntry, ProntidaoColor, MaterialItem, ViaturaStatus, Posto, Subgrupamento, GB, SystemSettings } from '../types';
import { getProntidaoInfo, safeDateIso } from '../utils/calendarUtils';
import { DEFAULT_HEADER, DEFAULT_HEADER_CONFIG } from '../constants';
import { generateInventoryPDF } from '../utils/pdfGenerator';
import { DataService } from '../services/dataService';

interface ChecklistProps {
  viaturas: Viatura[];
  checks: InventoryCheck[];
  onComplete: (check: InventoryCheck) => void;
  onFullScreenChange?: (isFull: boolean) => void;
  postos: Posto[];
  subs: Subgrupamento[];
  gbs: GB[];
}

const Checklist: React.FC<ChecklistProps> = ({ viaturas, checks, onComplete, onFullScreenChange, postos, subs, gbs }) => {
  const [step, setStep] = useState<'selection' | 'form' | 'finished'>('selection');
  const [selectedVtrId, setSelectedVtrId] = useState<string>('');
  const [lastCheck, setLastCheck] = useState<InventoryCheck | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [justification, setJustification] = useState('');
  const [responsibleList, setResponsibleList] = useState<string[]>(['']);
  const [commander, setCommander] = useState('');
  const [entries, setEntries] = useState<Record<string, CheckEntry>>({});
  const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    DataService.getSettings().then(setSettings);
  }, []);

  const selectedVtr = viaturas.find(v => v.id === selectedVtrId);
  const prontidao = getProntidaoInfo(new Date(date + 'T12:00:00'));
  
  const totalItems = selectedVtr?.items.length || 0;
  const answeredItems = Object.keys(entries).length;
  const progressPercent = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  const isJustificationRequired = date !== todayStr || checks.some(c => c.viaturaId === selectedVtrId && safeDateIso(c.date) === date);

  const groupedItems: Record<string, MaterialItem[]> = selectedVtr?.items.reduce((acc, item) => {
    const comp = item.compartment || 'GERAL';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(item);
    return acc;
  }, {} as Record<string, MaterialItem[]>) || {};

  useEffect(() => {
    if (selectedVtrId && step !== 'finished') {
      setStep('form');
      setEntries({});
      setJustification('');
      const comps = Object.keys(groupedItems);
      if (comps.length > 0) setOpenCompartments({ [comps[0]]: true });
      if (listTopRef.current) listTopRef.current.scrollIntoView({ behavior: 'smooth' });
      onFullScreenChange?.(true);
    }
  }, [selectedVtrId]);

  /**
   * RESOLUÇÃO DE CABEÇALHO DINÂMICO (CORRIGIDO V2)
   * Garante que a viatura (Ex: ABS-2010) seja vinculada ao seu posto real (Ex: Estação Jussara)
   * e não a unidades genéricas ou fixas.
   */
  const resolveHeaderSnapshot = () => {
    const globalStrings = settings?.headerConfig || DEFAULT_HEADER_CONFIG;
    
    // Fallback de segurança caso a viatura não tenha posto vinculado
    if (!selectedVtr || !selectedVtr.postoId) {
        return { 
            ...globalStrings, 
            unidade: "20º GRUPAMENTO DE BOMBEIROS",
            subgrupamento: "1º SUBGRUPAMENTO DE BOMBEIROS",
            pelotao: "POSTO NÃO VINCULADO",
            cidade: "SÃO PAULO"
        };
    }
    
    // Busca na hierarquia cadastrada para obter o nome oficial
    const posto = postos.find(p => p.id === selectedVtr.postoId);
    const sub = subs.find(s => s.id === posto?.subId);
    const gb = gbs.find(g => g.id === sub?.gbId);

    return {
        secretaria: globalStrings.secretaria,
        policiaMilitar: globalStrings.policiaMilitar,
        corpoBombeiros: globalStrings.corpoBombeiros,
        unidade: (gb?.name || "20º GRUPAMENTO DE BOMBEIROS").toUpperCase(),
        subgrupamento: (sub?.name || "1º SUBGRUPAMENTO DE BOMBEIROS").toUpperCase(),
        // Linha 6: Unidade Operacional Oficial
        pelotao: `${posto?.classification || 'POSTO'} DE BOMBEIROS ${posto?.name || ''}`.trim().toUpperCase(),
        // Linha 7 (Município): Usado dinamicamente no gerador de PDF
        cidade: (posto?.municipio || "MUNICÍPIO NÃO DEFINIDO").toUpperCase()
    };
  };

  const constructCheck = (): InventoryCheck => ({
    id: Math.random().toString(36).substr(2, 9),
    viaturaId: selectedVtrId,
    date,
    shiftColor: prontidao.label,
    responsibleNames: responsibleList.filter(n => n.trim() !== ''),
    commanderName: commander,
    entries: Object.values(entries),
    timestamp: new Date().toISOString(),
    justification: isJustificationRequired ? justification : undefined,
    headerDetails: resolveHeaderSnapshot(),
    snapshot: selectedVtr?.items || [],
    viaturaStatusAtTime: selectedVtr?.status || ViaturaStatus.OPERANDO 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answeredItems < totalItems) return alert(`Faltam ${totalItems - answeredItems} itens.`);
    if (isJustificationRequired && !justification.trim()) return alert("Justificativa obrigatória.");
    if (!window.confirm("Salvar conferência oficial?")) return;

    const check = constructCheck();
    setLastCheck(check);
    onComplete(check);
    setStep('finished');
  };

  if (step === 'selection') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-2">
        <div className="text-center py-4">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Nova Conferência</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Selecione o veículo abaixo</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {viaturas.map(v => {
            const isCheckedToday = checks.some(c => c.viaturaId === v.id && safeDateIso(c.date) === todayStr);
            return (
              <button key={v.id} onClick={() => setSelectedVtrId(v.id)} className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all text-left shadow-lg active:scale-[0.98] group relative overflow-hidden ${isCheckedToday ? 'border-green-400 ring-4 ring-green-50' : 'border-slate-100 hover:border-red-500'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span className="text-5xl">🚒</span></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex flex-col gap-2">
                    <span className={`w-fit text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${String(v.status) === ViaturaStatus.OPERANDO ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{v.status}</span>
                    <h3 className={`text-3xl font-black tracking-tighter ${isCheckedToday ? 'text-green-800' : 'text-slate-900'}`}>{v.prefix}</h3>
                  </div>
                </div>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-4">{v.name}</p>
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-2xl font-black text-[11px] uppercase w-fit">Iniciar Checklist →</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 'finished') {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-in zoom-in px-4">
        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto shadow-2xl">✓</div>
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Registro Salvo!</h2>
        <div className="space-y-3">
          <button onClick={() => generateInventoryPDF(lastCheck!, selectedVtr!, true)} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">VER PDF</button>
          <button onClick={() => { setSelectedVtrId(''); setStep('selection'); onFullScreenChange?.(false); }} className="w-full py-5 bg-slate-100 text-slate-600 rounded-3xl font-black uppercase text-xs">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-40" ref={listTopRef}>
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-b-[2rem] sticky top-0 z-50 shadow-2xl border-b border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <button onClick={() => onFullScreenChange?.(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-500 font-bold">✕</button>
                <div className="text-center">
                    <h3 className="font-black text-base tracking-tighter leading-none">{selectedVtr?.prefix}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedVtr?.name}</p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-red-600 text-white font-black text-[10px] uppercase">{prontidao.label}</div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
                <div className="flex-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Data</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent font-black text-xs outline-none" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1"><span className="text-[8px] font-black uppercase">Progresso</span><span className="text-[9px] font-black">{progressPercent}%</span></div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-red-600 transition-all" style={{ width: `${progressPercent}%` }}></div></div>
                </div>
            </div>
        </div>
        <form onSubmit={handleSubmit} className="px-3 space-y-3">
            {Object.entries(groupedItems).map(([comp, items]) => (
                <div key={comp} className={`bg-white rounded-[2rem] border transition-all ${openCompartments[comp] ? 'border-red-500 shadow-xl' : 'border-slate-200 shadow-sm'}`}>
                    <button type="button" onClick={() => setOpenCompartments(p => ({...p, [comp]: !p[comp]}))} className={`w-full p-5 flex justify-between items-center ${openCompartments[comp] ? 'bg-red-600 text-white rounded-t-[1.8rem]' : 'bg-white rounded-[1.8rem]'}`}>
                        <div className="text-left"><span className="font-black text-sm uppercase tracking-tight">{comp}</span></div>
                        <span className="text-xl">{openCompartments[comp] ? '▾' : '▸'}</span>
                    </button>
                    {openCompartments[comp] && (
                        <div className="p-3 space-y-3 bg-slate-50/30">
                            {items.map(item => (
                                <div key={item.id} className="p-4 rounded-[1.5rem] border bg-white shadow-md">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="font-black text-slate-800 text-base flex-1">{item.name}</span>
                                        <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-lg">QT: {item.quantity}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {['S', 'CN', 'NA'].map(s => (
                                            <button key={s} type="button" onClick={() => setEntries(prev => ({ ...prev, [item.id]: { itemId: item.id, status: s as CheckStatus }}))} className={`flex-1 h-14 rounded-2xl font-black text-xs border transition-all ${entries[item.id]?.status === s ? 'bg-red-600 border-transparent text-white' : 'bg-white border-slate-200 text-slate-400'}`}>{s}</button>
                                        ))}
                                    </div>
                                    {(entries[item.id]?.status === 'CN' || entries[item.id]?.status === 'NA') && (
                                        <textarea onChange={e => setEntries(prev => ({...prev, [item.id]: {...prev[item.id], observation: e.target.value}}))} className="w-full mt-4 p-3 border border-red-100 rounded-xl text-xs font-bold" placeholder="Observação obrigatória..." required value={entries[item.id]?.observation || ''} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl space-y-6 mt-10 mb-20">
                <input type="text" placeholder="Comandante da Vtr" value={commander} onChange={e => setCommander(e.target.value)} className="w-full p-4 border rounded-2xl font-black text-sm outline-none focus:border-red-500" required />
                <div className="space-y-2">
                    {responsibleList.map((r, i) => (
                        <input key={i} type="text" placeholder={`Membro ${i+1}`} value={r} onChange={e => { const nl = [...responsibleList]; nl[i] = e.target.value; setResponsibleList(nl); }} className="w-full p-4 border rounded-2xl font-black text-sm outline-none focus:border-red-500" required />
                    ))}
                    <button type="button" onClick={() => setResponsibleList([...responsibleList, ''])} className="w-full py-3 border-2 border-dashed rounded-2xl text-[10px] font-black uppercase text-slate-400">+ Novo Membro</button>
                </div>
                {isJustificationRequired && <textarea value={justification} onChange={e => setJustification(e.target.value)} className="w-full p-4 border border-red-200 bg-red-50 rounded-2xl text-xs font-bold" placeholder="Justificativa Obrigatória..." required />}
                <button type="submit" className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-base shadow-2xl disabled:opacity-50" disabled={progressPercent < 100}>Salvar Conferência Oficial</button>
            </div>
        </form>
    </div>
  );
};

export default Checklist;
