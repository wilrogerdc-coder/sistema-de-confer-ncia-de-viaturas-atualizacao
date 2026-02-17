
import React, { useState, useMemo } from 'react';
import { InventoryCheck, Viatura, User, UserRole, ViaturaStatus, Posto } from '../types';
import { 
  generateInventoryPDF, 
  generateSummaryPDF, 
  generateNewsReportPDF,
  generateVtrDetailedMonthlyPDF,
  generateManualDailyPDF,
  generateManualMonthlyPDF
} from '../utils/pdfGenerator';
import { formatDateShort, getShiftReferenceDate, getProntidaoInfo, getDaysInMonth } from '../utils/calendarUtils';

interface ReportsProps {
  checks: InventoryCheck[];
  viaturas: Viatura[];
  currentUser: User;
  postos: Posto[];
}

const Reports: React.FC<ReportsProps> = ({ checks, viaturas, currentUser, postos }) => {
  const [view, setView] = useState<'history' | 'monthly' | 'stats'>('history');
  const [filterVtr, setFilterVtr] = useState('');
  const [filterPosto, setFilterPosto] = useState(currentUser.scopeLevel === 'POSTO' ? currentUser.scopeId || '' : '');
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

  const isPrivileged = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER;

  const visibleViaturas = useMemo(() => {
    return viaturas.filter(v => {
      if (filterPosto) return String(v.postoId) === String(filterPosto);
      if (currentUser.scopeLevel === 'POSTO') return String(v.postoId) === String(currentUser.scopeId);
      return true;
    });
  }, [viaturas, filterPosto, currentUser]);

  const filteredHistory = useMemo(() => {
    const vtrIds = new Set(visibleViaturas.map(v => v.id));
    return checks.filter(c => vtrIds.has(c.viaturaId) && (filterVtr ? c.viaturaId === filterVtr : true)).reverse();
  }, [checks, visibleViaturas, filterVtr]);

  const safeReport = (fn: Function, ...args: any[]) => {
    try { fn(...args); } catch (e: any) { alert(`Erro ao processar PDF: ${e.message}`); }
  };

  const renderMonthlyGrid = () => {
    const totalDays = getDaysInMonth(month);
    const dayArray = Array.from({ length: totalDays }, (_, i) => i + 1);
    
    return (
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 space-y-6 animate-in fade-in shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700"></div>
        
        {/* TOOLBAR SUPERIOR DENSE */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none">Mapa de Controle Mensal</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5">Histórico Analítico • Ciclo de {totalDays} Dias</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
               <div className="flex gap-2 p-1.5 bg-slate-900 rounded-xl border border-white/10 mr-2 shadow-xl">
                  <button onClick={() => { 
                      const vtr = visibleViaturas.find(v => v.id === filterVtr);
                      if (!vtr) return alert("Selecione uma viatura no filtro ou use os botões na grade.");
                      safeReport(generateManualDailyPDF, vtr, postos);
                  }} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[8px] font-black uppercase transition-all shadow-lg flex items-center gap-2">
                    <span className="text-xs">🖨️</span> FICHA DIÁRIA
                  </button>
                  <button onClick={() => {
                      const vtr = visibleViaturas.find(v => v.id === filterVtr);
                      if (!vtr) return alert("Selecione uma viatura no filtro ou use os botões na grade.");
                      safeReport(generateManualMonthlyPDF, vtr, month, postos);
                  }} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[8px] font-black uppercase transition-all shadow-lg flex items-center gap-2">
                    <span className="text-xs">📅</span> MAPA MENSAL
                  </button>
               </div>
               
               {isPrivileged && (
                 <select value={filterPosto} onChange={e => { setFilterPosto(e.target.value); setFilterVtr(''); }} className="px-3 py-2 rounded-xl border border-slate-200 font-black outline-none focus:border-red-600 text-[9px] uppercase bg-slate-50 shadow-inner transition-all">
                    <option value="">FILTRAR UNIDADE</option>
                    {postos.map(p => <option key={p.id} value={p.id}>{p.classification || 'Posto'} {p.name}</option>)}
                 </select>
               )}
               <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 font-black outline-none focus:border-red-600 text-[9px] bg-white shadow-inner transition-all" />
            </div>
        </div>
        
        {/* CONTAINER COM SCROLL HABILITADO E FONTE REDUZIDA */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-50/50">
          <div className="overflow-x-auto custom-scrollbar-horizontal scroll-smooth">
            <table className="w-full text-[7px] border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-white/95 backdrop-blur-3xl">
                  <th className="p-2.5 border-b border-r border-slate-100 font-black text-left sticky left-0 z-30 text-slate-700 min-w-[160px] bg-white uppercase tracking-tighter shadow-md">Viatura / Unidade</th>
                  {dayArray.map(d => (
                    <th key={d} className="p-1 border-b border-r border-slate-100 font-black text-center min-w-[32px] text-slate-400">{d.toString().padStart(2, '0')}</th>
                  ))}
                  <th className="p-2.5 border-b border-slate-100 font-black text-center text-red-600 uppercase tracking-widest bg-white">Opções</th>
                </tr>
              </thead>
              <tbody>
                {visibleViaturas.map(v => (
                  <tr key={v.id} className="hover:bg-white transition-all group">
                    <td className="p-2.5 border-r border-b border-slate-50 font-black flex flex-col bg-white/70 backdrop-blur-xl sticky left-0 z-20 shadow-md">
                      <div className="flex justify-between items-center gap-1.5">
                        <span className="text-slate-900 text-[10px] tracking-tighter uppercase leading-none group-hover:text-red-600 transition-colors">{v.prefix}</span>
                        <button onClick={() => safeReport(generateVtrDetailedMonthlyPDF, v, checks, month, true, postos)} className="text-red-600 hover:scale-110 transition-all text-xs opacity-40 group-hover:opacity-100" title="Ver Espelho Digital">📋</button>
                      </div>
                      <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">{postos.find(p => p.id === v.postoId)?.name || 'S/ UNID'}</span>
                    </td>
                    {dayArray.map(d => {
                      const dStr = `${month}-${d.toString().padStart(2, '0')}`;
                      const check = checks.find(c => c.viaturaId === v.id && getShiftReferenceDate(c.timestamp) === dStr);
                      const shift = check ? getProntidaoInfo(new Date(check.timestamp)) : null;
                      const hasCN = check?.entries.some(e => e.status === 'CN');
                      
                      // Status histórico preservado: Reflete BX, RS ou OP (Checklist Normal)
                      const historicalStatus = check?.viaturaStatusAtTime || ViaturaStatus.OPERANDO;
                      const isBaixada = historicalStatus === ViaturaStatus.BAIXADA;
                      const isReserva = historicalStatus === ViaturaStatus.RESERVA;

                      return (
                        <td key={d} className={`p-1 border-b border-r border-slate-50 text-center font-black transition-all ${check ? 'animate-in fade-in' : 'text-slate-200'}`} style={check ? { backgroundColor: `color-mix(in srgb, ${shift?.hex}, transparent 96%)`, color: hasCN ? '#ef4444' : (isBaixada ? '#7f1d1d' : isReserva ? '#92400e' : shift?.hex) } : {}}>
                          {check ? (
                              isBaixada ? 'BX' : isReserva ? 'RS' : (hasCN ? 'CN' : 'OK')
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td className="p-2 border-b border-slate-50 text-center">
                        <div className="flex justify-center gap-1.5 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => safeReport(generateManualDailyPDF, v, postos)} className="px-2 py-1 bg-slate-100 hover:bg-red-600 hover:text-white rounded-md text-[6px] font-black uppercase transition-all">DIÁRIO</button>
                            <button onClick={() => safeReport(generateManualMonthlyPDF, v, month, postos)} className="px-2 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-md text-[6px] font-black uppercase transition-all">MENSAL</button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-6 pt-3 border-t border-slate-50">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span><span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">OK: Operando</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></span><span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">CN: Com Novidade</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-950 shadow-sm"></span><span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">BX: Baixada</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-sm"></span><span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">RS: Reserva</span></div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-lg">
        <button onClick={() => setView('history')} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all duration-500 ${view === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Histórico Cronológico</button>
        <button onClick={() => setView('monthly')} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all duration-500 ${view === 'monthly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Mapa Mensal Inteligente</button>
      </div>

      {view === 'history' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                {isPrivileged && (
                  <select value={filterPosto} onChange={e => { setFilterPosto(e.target.value); setFilterVtr(''); }} className="px-5 py-3 rounded-xl border-2 border-slate-50 font-black text-[9px] uppercase bg-slate-50 outline-none focus:border-red-600 shadow-inner">
                     <option value="">TODAS AS UNIDADES</option>
                     {postos.map(p => <option key={p.id} value={p.id}>{p.classification || 'Posto'} {p.name}</option>)}
                  </select>
                )}
                <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="px-5 py-3 rounded-xl border-2 border-slate-50 font-black text-[9px] uppercase bg-slate-50 outline-none focus:border-red-600 shadow-inner min-w-[250px]">
                   <option value="">FILTRAR POR PREFIXO</option>
                   {visibleViaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
                </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => safeReport(generateNewsReportPDF, checks, viaturas, month, true, filterVtr || undefined)} className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-[9px] uppercase border border-rose-100 hover:bg-rose-100 shadow-md transition-all active:scale-95">Resumo Novidades</button>
              <button onClick={() => safeReport(generateSummaryPDF, filteredHistory, viaturas)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase shadow-xl hover:brightness-110 transition-all active:scale-95">Histórico Geral PDF</button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">DATA TURNO</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">PRONTIDÃO</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">STATUS VTR</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">VIATURA</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">CONFERÊNCIA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.map(check => {
                  const vtrObj = viaturas.find(v => v.id === check.viaturaId);
                  // Mapeamento de cor da prontidão baseado no rótulo salvo (Garante fidelidade visual ao turno operacional)
                  const shiftHex = check.shiftColor === 'Verde' ? '#10b981' : 
                                  check.shiftColor === 'Amarela' ? '#f59e0b' : 
                                  check.shiftColor === 'Azul' ? '#2563eb' : '#64748b';
                  const vtrStatus = check.viaturaStatusAtTime || ViaturaStatus.OPERANDO;
                  return (
                    <tr key={check.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-8 py-5 font-black text-xs text-slate-800 tracking-tight">{formatDateShort(getShiftReferenceDate(check.timestamp))}</td>
                      <td className="px-8 py-5 text-center">
                          <span className="px-4 py-2 rounded-full text-[8px] font-black uppercase text-white shadow-xl" style={{ backgroundColor: shiftHex }}>{check.shiftColor}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase border shadow-sm ${
                            vtrStatus === ViaturaStatus.OPERANDO ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            vtrStatus === ViaturaStatus.RESERVA ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {vtrStatus === ViaturaStatus.OPERANDO ? 'OP' : vtrStatus === ViaturaStatus.RESERVA ? 'RS' : 'BX'}
                          </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-slate-900 tracking-tighter uppercase leading-none">{vtrObj?.prefix}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => safeReport(generateInventoryPDF, check, vtrObj!, true)} className="px-5 py-2 bg-white text-slate-600 rounded-lg text-[8px] font-black uppercase border-2 border-slate-100 hover:border-red-600 hover:text-red-600 transition-all shadow-sm">Ver Espelho</button>
                           <button onClick={() => safeReport(generateInventoryPDF, check, vtrObj!)} className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:scale-110 transition-all shadow-xl text-lg">📥</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredHistory.length === 0 && (
                <div className="py-20 text-center">
                    <div className="text-3xl opacity-10 mb-3">🔍</div>
                    <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Nenhum registro localizado no servidor.</p>
                </div>
            )}
          </div>
        </div>
      )}
      {view === 'monthly' && renderMonthlyGrid()}
    </div>
  );
};

export default Reports;
