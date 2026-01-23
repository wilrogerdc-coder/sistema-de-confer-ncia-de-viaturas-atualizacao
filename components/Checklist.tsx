
import React, { useState, useEffect, useRef } from 'react';
import { Viatura, InventoryCheck, CheckStatus, CheckEntry, ProntidaoColor, MaterialItem, ViaturaStatus } from '../types';
import { getProntidaoInfo, safeDateIso } from '../utils/calendarUtils';
import { DEFAULT_HEADER } from '../constants';
import { generateInventoryPDF } from '../utils/pdfGenerator';

interface ChecklistProps {
  viaturas: Viatura[];
  checks: InventoryCheck[];
  onComplete: (check: InventoryCheck) => void;
  onFullScreenChange?: (isFull: boolean) => void;
}

const Checklist: React.FC<ChecklistProps> = ({ viaturas, checks, onComplete, onFullScreenChange }) => {
  const [step, setStep] = useState<'selection' | 'form' | 'finished'>('selection');
  const [selectedVtrId, setSelectedVtrId] = useState<string>('');
  const [lastCheck, setLastCheck] = useState<InventoryCheck | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [justification, setJustification] = useState('');
  const [responsibleList, setResponsibleList] = useState<string[]>(['']);
  const [commander, setCommander] = useState('');
  const [entries, setEntries] = useState<Record<string, CheckEntry>>({});
  const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});
  const listTopRef = useRef<HTMLDivElement>(null);

  const selectedVtr = viaturas.find(v => v.id === selectedVtrId);
  const prontidao = getProntidaoInfo(new Date(date + 'T12:00:00'));
  
  const isDateDifferent = date !== todayStr;
  const isRecheck = checks.some(c => c.viaturaId === selectedVtrId && safeDateIso(c.date) === date);
  const isJustificationRequired = isDateDifferent || isRecheck;

  const totalItems = selectedVtr?.items.length || 0;
  const answeredItems = Object.keys(entries).length;
  const progressPercent = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  const groupedItems = selectedVtr?.items.reduce((acc, item) => {
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
      if (comps.length > 0) {
        setOpenCompartments({ [comps[0]]: true });
      }
      if (listTopRef.current) {
        listTopRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      onFullScreenChange?.(true);
    }
  }, [selectedVtrId]);

  const handleBackToSelection = () => {
    setStep('selection');
    setSelectedVtrId('');
    onFullScreenChange?.(false);
  };

  const toggleCompartment = (comp: string) => {
    setOpenCompartments(prev => ({ ...prev, [comp]: !prev[comp] }));
  };

  const handleStatusChange = (itemId: string, status: CheckStatus) => {
    setEntries(prev => ({ ...prev, [itemId]: { ...prev[itemId], status, itemId } }));
  };

  const handleObservationChange = (itemId: string, observation: string) => {
    setEntries(prev => ({ ...prev, [itemId]: { ...prev[itemId], observation } }));
  };

  const addResponsible = () => setResponsibleList([...responsibleList, '']);
  const updateResponsible = (index: number, val: string) => {
    const newList = [...responsibleList];
    newList[index] = val;
    setResponsibleList(newList);
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
    headerDetails: DEFAULT_HEADER,
    snapshot: selectedVtr?.items || [] // Salva o estado atual dos materiais para histórico
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answeredItems < totalItems) {
      alert(`Faltam ${totalItems - answeredItems} itens. Complete a lista.`);
      return;
    }
    
    if (isJustificationRequired && !justification.trim()) {
      alert(isDateDifferent 
        ? "Como a data é diferente de hoje, o motivo é OBRIGATÓRIO." 
        : "Esta viatura já foi conferida hoje. Informe o motivo da nova conferência.");
      return;
    }

    if (!window.confirm("Deseja finalizar e salvar esta conferência no banco de dados?")) return;

    const check = constructCheck();
    setLastCheck(check);
    onComplete(check);
    setStep('finished');
  };

  const getReadinessColor = () => {
    if (prontidao.color === ProntidaoColor.VERDE) return 'var(--readiness-verde)';
    if (prontidao.color === ProntidaoColor.AMARELA) return 'var(--readiness-amarela)';
    return 'var(--readiness-azul)';
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
              <button 
                key={v.id} 
                onClick={() => setSelectedVtrId(v.id)} 
                className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all text-left shadow-lg active:scale-[0.98] group relative overflow-hidden ${
                  isCheckedToday 
                    ? 'border-green-400 ring-4 ring-green-50' 
                    : 'border-slate-100 hover:border-red-500'
                }`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="text-5xl">🚒</span>
                </div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <span className={`w-fit text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${
                        String(v.status) === ViaturaStatus.OPERANDO ? 'border-green-200 bg-green-50 text-green-700' :
                        String(v.status) === ViaturaStatus.RESERVA ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                        'border-red-200 bg-red-50 text-red-700'
                      }`}>
                        {v.status}
                      </span>
                      {isCheckedToday && (
                        <span className="w-fit text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-green-200 bg-green-100 text-green-700 flex items-center gap-1">
                          Conferido Hoje ✅
                        </span>
                      )}
                    </div>
                    <h3 className={`text-3xl font-black tracking-tighter transition-colors ${isCheckedToday ? 'text-green-800' : 'text-slate-900 group-hover:text-red-600'}`}>
                      {v.prefix}
                    </h3>
                  </div>
                </div>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-4">{v.name}</p>
                
                <div className={`flex items-center gap-2 font-black text-[11px] uppercase tracking-tighter w-fit px-4 py-2 rounded-2xl transition-all ${
                  isCheckedToday
                    ? 'bg-green-600 text-white shadow-md shadow-green-100'
                    : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                }`}>
                  {isCheckedToday ? 'VER / Retificar' : 'Iniciar Checklist'} <span>→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 'finished') {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-in zoom-in duration-300 px-4">
        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto shadow-2xl shadow-green-200">✓</div>
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">Registro Salvo!</h2>
        <div className="space-y-3 pt-4">
          <button onClick={() => generateInventoryPDF(lastCheck!, selectedVtr!, true)} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-tighter shadow-xl">VER PDF</button>
          <button onClick={() => generateInventoryPDF(lastCheck!, selectedVtr!)} className="w-full py-5 bg-red-600 text-white rounded-3xl font-black uppercase tracking-tighter shadow-xl shadow-red-100">📥 Baixar Documento</button>
          <button onClick={handleBackToSelection} className="w-full py-5 bg-slate-100 text-slate-600 rounded-3xl font-black uppercase tracking-tighter">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-40" ref={listTopRef}>
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-b-[2rem] flex flex-col gap-2 sticky top-0 z-50 shadow-2xl border-b border-slate-100 transition-all">
        <div className="flex items-center justify-between">
           <button onClick={() => window.confirm("Deseja cancelar o preenchimento? Os dados não salvos serão perdidos.") && handleBackToSelection()} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-slate-200 transition-colors">✕</button>
           <div className="text-center">
             <h3 className="font-black text-base tracking-tighter leading-none">{selectedVtr?.prefix}</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedVtr?.name}</p>
           </div>
           
           <div 
             className="px-3 py-2 rounded-xl text-white font-black text-[10px] uppercase shadow-lg text-center min-w-[70px]"
             style={{ backgroundColor: getReadinessColor() }}
           >
             <div className="text-[7px] opacity-80 mb-0.5">Prontidão</div>
             {prontidao.label}
           </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
           <div className="flex-1">
             <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Data da Conferência</label>
             <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full bg-transparent font-black text-xs text-slate-800 outline-none p-1 focus:bg-white rounded-lg transition-colors"
            />
           </div>
           <div className="h-8 w-[1px] bg-slate-200"></div>
           <div className="flex-1">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[8px] font-black uppercase text-slate-400">Progresso</span>
               <span className="text-[9px] font-black text-red-600">{progressPercent}%</span>
             </div>
             <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
             </div>
           </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-3 space-y-3 mt-4">
        {Object.entries(groupedItems).map(([compartment, items]) => {
          const typedItems = items as MaterialItem[];
          const compChecked = typedItems.filter(i => entries[i.id]).length;
          const compTotal = typedItems.length;
          const isDone = compChecked === compTotal;
          const isOpen = openCompartments[compartment];

          return (
            <div key={compartment} className={`bg-white rounded-[2rem] border transition-all ${isOpen ? 'border-red-500 shadow-xl ring-4 ring-red-50' : isDone ? 'border-green-200 bg-green-50/10' : 'border-slate-200 shadow-sm'}`}>
              <button type="button" onClick={() => toggleCompartment(compartment)} className={`w-full p-5 flex justify-between items-center transition-colors ${isOpen ? 'bg-red-600 text-white rounded-t-[1.8rem]' : 'bg-white rounded-[1.8rem]'}`}>
                <div className="text-left">
                  <span className={`font-black text-sm uppercase tracking-tight ${isOpen ? 'text-white' : 'text-slate-800'}`}>{compartment}</span>
                  <p className={`text-[9px] font-bold uppercase ${isOpen ? 'text-white/80' : isDone ? 'text-green-600' : 'text-slate-400'}`}>
                    {isDone ? 'Conferido ✓' : `${compChecked}/${compTotal} materiais`}
                  </p>
                </div>
                <span className={`transition-transform duration-300 text-xl ${isOpen ? 'rotate-180 text-white' : 'text-slate-300'}`}>▾</span>
              </button>
              
              {isOpen && (
                <div className="p-3 space-y-3 bg-slate-50/30">
                  {typedItems.map(item => (
                    <div key={item.id} className={`p-4 rounded-[1.5rem] border transition-all ${entries[item.id] ? 'bg-white border-transparent shadow-md' : 'bg-white border-slate-100'}`}>
                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="flex justify-between items-start">
                             <span className="font-black text-slate-800 text-base leading-tight block flex-1">{item.name}</span>
                             <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-lg font-black ml-2">QT: {item.quantity}</span>
                          </div>
                          {item.specification && <span className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 block leading-relaxed">{item.specification}</span>}
                        </div>
                        
                        <div className="flex gap-2">
                          {[
                            { val: 'S', color: 'bg-green-500', text: 'text-green-600', label: 'SEM NOV' },
                            { val: 'CN', color: 'bg-red-500', text: 'text-red-600', label: 'COM NOV' },
                            { val: 'NA', color: 'bg-yellow-500', text: 'text-yellow-600', label: 'ANTERIOR' }
                          ].map(s => (
                            <button 
                              key={s.val} 
                              type="button" 
                              onClick={() => handleStatusChange(item.id, s.val as CheckStatus)} 
                              className={`flex-1 h-16 rounded-2xl font-black text-[11px] transition-all border flex flex-col items-center justify-center ${
                                entries[item.id]?.status === s.val 
                                ? `${s.color} border-transparent text-white shadow-lg scale-105 z-10` 
                                : `bg-white border-slate-200 ${s.text} active:bg-slate-50`
                              }`}
                            >
                              <span className="text-xl mb-0.5">{s.val}</span>
                              <span className="text-[8px] opacity-80 uppercase tracking-tighter">{s.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {(entries[item.id]?.status === 'CN' || entries[item.id]?.status === 'NA') && (
                        <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                          <textarea 
                            onChange={e => handleObservationChange(item.id, e.target.value)} 
                            className="w-full p-4 border-2 border-red-50 bg-red-50/10 rounded-2xl text-xs font-bold outline-none focus:border-red-400 text-slate-700 placeholder:text-slate-300" 
                            placeholder="Descreva detalhadamente a novidade encontrada..." 
                            required={entries[item.id]?.status === 'CN'}
                            value={entries[item.id]?.observation || ''}
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6 mt-10 mb-20">
          <div className="text-center">
            <h4 className="font-black uppercase text-xs text-slate-400 tracking-[0.2em]">Encerramento</h4>
            <div className="h-1 w-8 bg-red-600 mx-auto mt-2 rounded-full"></div>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Comandante da Vtr</label>
              <input type="text" placeholder="Graduado / Nome" value={commander} onChange={e => setCommander(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-red-500 bg-slate-50" required />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Equipe (Conferentes)</label>
               {responsibleList.map((r, i) => (
                  <div key={i} className="relative flex items-center gap-2">
                    <input type="text" placeholder={`Membro ${i+1}`} value={r} onChange={e => updateResponsible(i, e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-red-500 bg-slate-50" required />
                    {i > 0 && <button type="button" onClick={() => window.confirm("Excluir este membro da equipe?") && setResponsibleList(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 px-2">✕</button>}
                  </div>
               ))}
               <button type="button" onClick={addResponsible} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-red-200 hover:text-red-500 transition-all">+ Novo Membro</button>
            </div>
            
            {isJustificationRequired && (
              <div className="space-y-1.5 pt-4 animate-in fade-in bg-red-50 p-4 rounded-3xl border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚠️</span>
                  <label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Justificativa Obrigatória</label>
                </div>
                <textarea 
                  value={justification} 
                  onChange={e => setJustification(e.target.value)} 
                  className="w-full p-4 border-2 border-white bg-white rounded-2xl text-xs font-bold outline-none focus:border-red-400 placeholder:text-slate-300" 
                  placeholder="Informe o motivo da retificação ou registro fora de data..." 
                  required 
                  rows={2}
                />
              </div>
            )}

            <div className="pt-6">
              <button type="submit" className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-base shadow-2xl shadow-red-200 active:scale-95 transition-all uppercase tracking-widest disabled:grayscale disabled:opacity-50 disabled:scale-100" disabled={progressPercent < 100}>
                {progressPercent < 100 ? `Pendência (${progressPercent}%)` : 'Salvar Registro Oficial'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checklist;
