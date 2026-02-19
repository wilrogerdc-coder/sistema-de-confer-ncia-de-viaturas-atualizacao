
import React, { useState, useEffect, useMemo } from 'react';
import { Viatura, InventoryCheck, CheckStatus, CheckEntry, MaterialItem, ViaturaStatus, Posto, Subgrupamento, GB, SystemSettings } from '../types';
import { getProntidaoInfo, getShiftReferenceDate } from '../utils/calendarUtils';
import { DEFAULT_HEADER_CONFIG } from '../constants';
import { generateInventoryPDF } from '../utils/pdfGenerator';
import { DataService } from '../services/dataService';

/**
 * Utilitário para obter a data local no formato YYYY-MM-DD
 * Evita problemas de fuso horário que o toISOString causa ao final do dia.
 */
const getTodayLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<string>(getTodayLocal());
  const [justification, setJustification] = useState('');
  const [responsibleList, setResponsibleList] = useState<string[]>(['']);
  const [commander, setCommander] = useState('');
  const [entries, setEntries] = useState<Record<string, CheckEntry>>({});
  const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});

  useEffect(() => { DataService.getSettings().then(setSettings); }, []);

  const selectedVtr = viaturas.find(v => v.id === selectedVtrId);
  const prontidao = getProntidaoInfo(date); 
  
  const groupedItems = useMemo(() => {
    if (!selectedVtr) return {} as Record<string, MaterialItem[]>;
    return selectedVtr.items.reduce((acc, item) => {
      const comp = item.compartment || 'GERAL';
      if (!acc[comp]) acc[comp] = [];
      acc[comp].push(item);
      return acc;
    }, {} as Record<string, MaterialItem[]>);
  }, [selectedVtr]);

  const progressPercent = selectedVtr?.items.length ? Math.round((Object.keys(entries).length / selectedVtr.items.length) * 100) : 0;
  
  // REGRA: Identificação de compartimentos pendentes (gavetas faltando preencher)
  const pendingCompartments = useMemo(() => {
    if (!selectedVtr || !groupedItems) return [];
    // Adicionado cast explícito para evitar erro 'Property some does not exist on type unknown'
    return (Object.entries(groupedItems) as [string, MaterialItem[]][])
      .filter(([comp, items]) => items.some(item => !entries[item.id]))
      .map(([comp]) => comp);
  }, [groupedItems, entries, selectedVtr]);

  const isJustificationRequired = date !== getTodayLocal() || checks.some(c => c.viaturaId === selectedVtrId && getShiftReferenceDate(c.timestamp) === date);

  useEffect(() => {
    if (selectedVtrId && step !== 'finished') {
      setStep('form');
      setEntries({});
      setJustification('');
      // Ordem direta: Garante data atual local ao iniciar a conferência de qualquer viatura
      setDate(getTodayLocal()); 
      onFullScreenChange?.(true);
    }
  }, [selectedVtrId]);

  const saveCheckInternal = async (isQuickStatus: boolean = false) => {
    if (!isQuickStatus && progressPercent < 100) return alert("Conclua todos os itens antes de salvar.");
    if (isJustificationRequired && !justification.trim()) return alert("Justificativa é obrigatória.");
    if (!commander.trim() || responsibleList.every(r => !r.trim())) return alert("Comandante e ao menos um conferente são obrigatórios.");

    setIsSubmitting(true);
    try {
      const finalEntries: CheckEntry[] = isQuickStatus 
        ? (selectedVtr?.items?.map(item => ({ 
            itemId: item.id, 
            status: 'NA' as CheckStatus,
            observation: selectedVtr?.status
          })) || [])
        : Object.values(entries);

      const check: InventoryCheck = {
        id: Math.random().toString(36).substr(2, 9),
        viaturaId: selectedVtrId,
        date,
        shiftColor: prontidao.label,
        responsibleNames: responsibleList.filter(n => n.trim() !== ''),
        commanderName: commander,
        entries: finalEntries,
        timestamp: new Date().toISOString(),
        justification: isJustificationRequired ? justification : undefined,
        headerDetails: {
            ... (settings?.headerConfig || DEFAULT_HEADER_CONFIG),
            unidade: (gbs.find(g => g.id === subs.find(s => s.id === postos.find(p => p.id === selectedVtr?.postoId)?.subId)?.gbId)?.name || "20º GB").toUpperCase(),
            subgrupamento: (subs.find(s => s.id === postos.find(p => p.id === selectedVtr?.postoId)?.subId)?.name || "1º SGB").toUpperCase(),
            pelotao: `${postos.find(p => p.id === selectedVtr?.postoId)?.classification || 'PELOTÃO'} DE BOMBEIROS DE ${postos.find(p => p.id === selectedVtr?.postoId)?.name || ''}`.toUpperCase(),
            cidade: (postos.find(p => p.id === selectedVtr?.postoId)?.municipio || "SÃO PAULO").toUpperCase()
        },
        snapshot: selectedVtr?.items || [],
        viaturaStatusAtTime: selectedVtr?.status || ViaturaStatus.OPERANDO 
      };
      await onComplete(check);
      setLastCheck(check);
      setStep('finished');
    } catch (e) { alert("Erro ao salvar."); } finally { setIsSubmitting(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCheckInternal(false);
  };

  if (step === 'selection') {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-12">
        <div className="text-center py-10">
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">FROTA OPERACIONAL</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Selecione uma viatura para iniciar o checklist</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {viaturas.map(v => {
            const checkedToday = checks.some(c => c.viaturaId === v.id && getShiftReferenceDate(c.timestamp) === getTodayLocal());
            const isOP = v.status === ViaturaStatus.OPERANDO;
            return (
              <button 
                key={v.id} 
                onClick={() => setSelectedVtrId(v.id)} 
                className={`bg-white p-8 rounded-[3rem] border-2 transition-all text-left shadow-xl active:scale-95 group relative overflow-hidden flex flex-col justify-between h-72 ${
                  checkedToday 
                  ? 'border-emerald-500 bg-emerald-50/20' 
                  : isOP ? 'border-slate-100 hover:border-blue-500' : v.status === ViaturaStatus.RESERVA ? 'border-amber-100 hover:border-amber-500' : 'border-red-100 hover:border-red-500'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className={`w-fit text-[10px] font-black px-4 py-2 rounded-2xl uppercase tracking-widest shadow-md ${
                      isOP ? 'bg-emerald-500 text-white shadow-emerald-200' : v.status === ViaturaStatus.RESERVA ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-red-950 text-white shadow-red-200'
                    }`}>
                      {v.status}
                    </span>
                    {checkedToday && <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg animate-in zoom-in">✓</div>}
                  </div>
                  <h3 className={`text-5xl font-black tracking-tighter leading-none ${checkedToday ? 'text-emerald-800' : 'text-slate-900'}`}>{v.prefix}</h3>
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-3">{v.name}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">Iniciar Checklist →</span>
                </div>
                <div className={`absolute bottom-0 right-0 w-40 h-40 opacity-5 pointer-events-none -mr-12 -mb-12 text-[12rem] ${checkedToday ? 'text-emerald-900' : 'text-slate-900'}`}>🚒</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 'finished') {
    return (
      <div className="max-w-md mx-auto py-32 text-center space-y-10 px-6 animate-in zoom-in-95">
        <div className="w-28 h-28 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center text-6xl mx-auto shadow-2xl border-8 border-emerald-50">✓</div>
        <h2 className="text-5xl font-black text-slate-800 tracking-tighter uppercase leading-none">Gravado com Sucesso!</h2>
        <p className="text-slate-500 font-medium">Os dados foram sincronizados e o histórico oficial foi atualizado.</p>
        <div className="space-y-4 pt-8">
          <button onClick={() => generateInventoryPDF(lastCheck!, selectedVtr!, true)} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-sm shadow-2xl active:scale-95 transition-all">Abrir PDF Oficial</button>
          <button onClick={() => { setSelectedVtrId(''); setStep('selection'); onFullScreenChange?.(false); }} className="w-full py-6 bg-slate-100 text-slate-600 rounded-3xl font-black uppercase text-sm active:scale-95 transition-all">Voltar ao Pátio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-60">
        <div className="bg-white/95 backdrop-blur-xl p-6 rounded-b-[3rem] sticky top-0 z-50 shadow-2xl flex flex-col gap-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
                <button type="button" onClick={() => onFullScreenChange?.(false)} className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-500 font-bold active:scale-90">✕</button>
                <div className="text-center">
                    <h3 className="font-black text-2xl tracking-tighter leading-none">{selectedVtr?.prefix}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{selectedVtr?.name}</p>
                </div>
                <div className="w-16 h-8 rounded-full shadow-inner border border-slate-200" style={{ backgroundColor: prontidao.hex }}></div>
            </div>
            <div className="bg-slate-50 p-4 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-6">
                    <div className="flex-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">DATA TURNO</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent font-black text-base outline-none cursor-pointer" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-slate-400">PROGRESSO</span><span className="text-[11px] font-black text-blue-600">{progressPercent}%</span></div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progressPercent}%` }}></div></div>
                    </div>
                </div>

                {/* REGRA: Exibição de Gavetas Pendentes para rápida identificação */}
                {pendingCompartments.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                        <label className="text-[8px] font-black uppercase text-red-500 tracking-widest mb-2 block">Gavetas Pendentes:</label>
                        <div className="flex flex-wrap gap-2">
                            {pendingCompartments.map(comp => (
                                <span key={comp} className="px-3 py-1 bg-red-50 text-red-600 text-[8px] font-black uppercase rounded-lg border border-red-100 animate-pulse">
                                    {comp}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 space-y-6">
            {(Object.entries(groupedItems) as [string, MaterialItem[]][]).map(([comp, items]) => (
                <div key={comp} className={`bg-white rounded-[2.5rem] border-2 transition-all ${openCompartments[comp] ? 'border-blue-500 shadow-2xl' : 'border-slate-100 shadow-sm'}`}>
                    <button type="button" onClick={() => setOpenCompartments(p => ({...p, [comp]: !p[comp]}))} className={`w-full p-8 flex justify-between items-center transition-all ${openCompartments[comp] ? 'bg-blue-600 text-white rounded-t-[2.3rem]' : 'bg-white rounded-[2.3rem]'}`}>
                        <div className="flex items-center gap-3">
                            <span className="font-black text-base uppercase tracking-widest">{comp}</span>
                            {/* REGRA: Indicador visual se a gaveta está pendente */}
                            {pendingCompartments.includes(comp) && <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>}
                        </div>
                        <span className="text-3xl transition-transform" style={{ transform: openCompartments[comp] ? 'rotate(90deg)' : 'rotate(0)' }}>▸</span>
                    </button>
                    {openCompartments[comp] && (
                        <div className="p-6 space-y-6 bg-slate-50/50">
                            {(items as MaterialItem[]).map(item => (
                                <div key={item.id} className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-1">
                                            <span className="font-black text-slate-800 text-xl block leading-tight uppercase tracking-tighter">{item.name}</span>
                                            {item.specification && <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{item.specification}</span>}
                                        </div>
                                        <span className="text-xs bg-slate-100 text-slate-800 px-4 py-2 rounded-xl font-black border border-slate-200 shadow-inner ml-4">QT: {item.quantity}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        {['S', 'CN', 'NA'].map(s => {
                                          const isSelected = entries[item.id]?.status === s;
                                          return (
                                            <button key={s} type="button" onClick={() => setEntries(prev => ({ ...prev, [item.id]: { itemId: item.id, status: s as any }}))} className={`flex-1 h-16 rounded-2xl font-black text-base border-2 transition-all active:scale-95 ${isSelected ? (s === 'S' ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200' : s === 'CN' ? 'bg-red-500 border-red-500 text-white shadow-red-200' : 'bg-amber-500 border-amber-500 text-white shadow-amber-200') : 'bg-white border-slate-100 text-slate-300 hover:border-slate-300'} shadow-lg`}>
                                              {s}
                                            </button>
                                          );
                                        })}
                                    </div>
                                    {entries[item.id]?.status === 'CN' && (
                                        <textarea onChange={e => setEntries(prev => ({...prev, [item.id]: {...prev[item.id], observation: e.target.value}}))} className="w-full mt-6 p-5 border-2 border-red-100 rounded-3xl text-sm font-bold focus:border-red-500 outline-none bg-red-50/30" placeholder="Relate o defeito ou falta (Obrigatório)..." required value={entries[item.id]?.observation || ''} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            
            <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl space-y-8 mt-16 mb-24 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                <h4 className="text-sm font-black text-white/40 uppercase tracking-[0.4em] text-center border-b border-white/5 pb-6">Finalização da Conferência</h4>
                
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-white/50 ml-3">Comandante da Viatura</label>
                        <input type="text" placeholder="POSTO/GRAD E NOME DE GUERRA" value={commander} onChange={e => setCommander(e.target.value)} className="w-full p-6 border-2 border-white/10 rounded-[1.5rem] font-black text-base outline-none focus:border-blue-500 uppercase tracking-widest bg-white/5 text-white shadow-inner" required />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-white/50 ml-3">Conferente(s)</label>
                        {(responsibleList as string[]).map((r, i) => (
                            <input key={i} type="text" placeholder={`CONFERENTE ${i+1}`} value={r} onChange={e => { const nl = [...responsibleList]; nl[i] = e.target.value; setResponsibleList(nl); }} className="w-full p-6 border-2 border-white/10 rounded-[1.5rem] font-black text-base outline-none focus:border-blue-500 uppercase bg-white/5 text-white shadow-inner" required />
                        ))}
                        <button type="button" onClick={() => setResponsibleList([...responsibleList, ''])} className="w-full py-4 border-2 border-dashed border-white/10 rounded-[1.5rem] text-xs font-black uppercase text-white/30 hover:text-white/60 hover:border-white/30 transition-all">+ Adicionar Auxiliar</button>
                    </div>
                </div>

                {isJustificationRequired && <textarea value={justification} onChange={e => setJustification(e.target.value)} className="w-full p-6 border-2 border-amber-500/50 bg-amber-500/10 rounded-[1.5rem] text-sm font-bold focus:border-amber-500 outline-none text-amber-200" placeholder="JUSTIFICATIVA (CONFERÊNCIA RETROATIVA OU DUPLICADA NO TURNO)..." required />}
                
                <div className="space-y-4 mt-8">
                    {selectedVtr?.status === ViaturaStatus.BAIXADA && (
                        <button type="button" onClick={() => saveCheckInternal(true)} disabled={isSubmitting} className="w-full py-6 bg-red-700 text-white rounded-[1.5rem] font-black text-sm shadow-xl active:scale-95 transition-all uppercase tracking-widest border border-red-500/30">
                            {isSubmitting ? 'Sincronizando...' : 'Confirmar Baixada (Auto NA)'}
                        </button>
                    )}
                    {selectedVtr?.status === ViaturaStatus.RESERVA && (
                        <button type="button" onClick={() => saveCheckInternal(true)} disabled={isSubmitting} className="w-full py-6 bg-amber-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl active:scale-95 transition-all uppercase tracking-widest border border-amber-500/30">
                            {isSubmitting ? 'Sincronizando...' : 'Confirmar Reserva (Auto NA)'}
                        </button>
                    )}

                    <button type="submit" className="w-full py-8 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-2xl disabled:opacity-50 active:scale-95 transition-all hover:brightness-110 uppercase tracking-widest" disabled={progressPercent < 100 || isSubmitting}>
                    {isSubmitting ? 'Processando...' : 'Gravar Conferência'}
                    </button>
                </div>
            </div>
        </form>
    </div>
  );
};

export default Checklist;
