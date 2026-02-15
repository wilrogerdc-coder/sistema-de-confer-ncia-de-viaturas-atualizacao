
import React, { useState, useMemo } from 'react';
import { InventoryCheck, Viatura, User, UserRole, ViaturaStatus, Posto } from '../types';
import { 
  generateInventoryPDF, 
  generateSummaryPDF, 
  generateNewsReportPDF,
  generateEfficiencyReportPDF,
  getHistoricalVtrStatus,
  generateVtrDetailedMonthlyPDF
} from '../utils/pdfGenerator';
import { formatDateShort, getShiftReferenceDate, getProntidaoInfo } from '../utils/calendarUtils';

interface ReportsProps {
  checks: InventoryCheck[];
  viaturas: Viatura[];
  currentUser: User;
  postos: Posto[];
}

/**
 * COMPONENTE: Reports
 * Interface de gestão de documentos e inteligência operacional.
 * Fornece filtros por Viatura, Unidade e Período Mensal.
 */
const Reports: React.FC<ReportsProps> = ({ checks, viaturas, currentUser, postos }) => {
  const [view, setView] = useState<'history' | 'monthly' | 'stats' | 'manual'>('history');
  const [filterVtr, setFilterVtr] = useState('');
  
  // O filtro de unidade inicia travado no posto do usuário, a menos que ele tenha permissões globais
  const [filterPosto, setFilterPosto] = useState(
    currentUser.scopeLevel === 'POSTO' ? currentUser.scopeId || '' : ''
  );
  
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

  // Determina se o usuário logado tem privilégios administrativos
  const isPrivileged = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER;

  /**
   * RESOLUÇÃO DE FROTA VISÍVEL:
   * Filtra as viaturas disponíveis com base na Unidade selecionada.
   */
  const visibleViaturas = useMemo(() => {
    return viaturas.filter(v => {
      if (filterPosto) return String(v.postoId) === String(filterPosto);
      if (currentUser.scopeLevel === 'POSTO') return String(v.postoId) === String(currentUser.scopeId);
      return true;
    });
  }, [viaturas, filterPosto, currentUser]);

  /**
   * FILTRO DE HISTÓRICO:
   * Processa a lista cronológica de checklists com base nos filtros de UI.
   */
  const filteredHistory = useMemo(() => {
    const vtrIds = new Set(visibleViaturas.map(v => v.id));
    return checks.filter(c => {
      const belongsToVisibleFleet = vtrIds.has(c.viaturaId);
      const matchesVtrFilter = filterVtr ? c.viaturaId === filterVtr : true;
      return belongsToVisibleFleet && matchesVtrFilter;
    }).reverse();
  }, [checks, visibleViaturas, filterVtr]);

  /**
   * Wrapper seguro para chamadas de PDF com feedback de erro.
   */
  const safeReport = (fn: Function, ...args: any[]) => {
    try { 
      fn(...args); 
    } catch (e: any) { 
      console.error("Erro na geração de PDF:", e);
      alert(`Erro ao processar o documento PDF: ${e.message}`); 
    }
  };

  /**
   * GRADE MENSAL (Monthly View)
   * Renderiza a visualização diária compacta de preenchimento.
   */
  const renderMonthlyGrid = () => {
    const days = 31;
    const dayArray = Array.from({ length: days }, (_, i) => i + 1);
    
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200 overflow-x-auto space-y-8 animate-in fade-in shadow-sm">
        <div>
          <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Mapa de Conferências Mensal</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Grade diária de status operacional</p>
            </div>
             <div className="flex flex-wrap items-center gap-4">
               {isPrivileged && (
                 <div className="flex items-center gap-2">
                   <label className="text-[10px] font-black uppercase text-slate-500">Unidade:</label>
                   <select value={filterPosto} onChange={e => { setFilterPosto(e.target.value); setFilterVtr(''); }} className="px-3 py-2 rounded-lg border border-slate-300 font-bold outline-none focus:border-red-500 text-xs bg-slate-50 transition-colors">
                      <option value="">TODAS AS UNIDADES</option>
                      {postos.map(p => <option key={p.id} value={p.id}>{p.classification || 'Posto'} {p.name}</option>)}
                   </select>
                 </div>
               )}
               <div className="flex items-center gap-2">
                 <label className="text-[10px] font-black uppercase text-slate-500">Mês/Ano:</label>
                 <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 font-bold outline-none focus:border-red-500 text-xs" />
               </div>
             </div>
          </div>
          
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 border-b border-r border-slate-200 font-bold text-left sticky left-0 z-10 text-slate-600 min-w-[140px] bg-slate-50 uppercase tracking-tighter">Viatura / Prefixo</th>
                  {dayArray.map(d => (
                    <th key={d} className="p-1 border-b border-r border-slate-100 font-semibold text-center min-w-[32px] text-slate-500">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleViaturas.length === 0 ? (
                  <tr><td colSpan={days + 1} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhuma viatura localizada.</td></tr>
                ) : visibleViaturas.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="p-2 border-r border-b border-slate-100 font-medium flex flex-col bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-800 font-black">{v.prefix}</span>
                        {/* BOTÃO DO MAPA DETALHADO (NOMES 90º) - Re-implementado com lógica avançada */}
                        <button 
                          onClick={() => safeReport(generateVtrDetailedMonthlyPDF, v, checks, month, true)} 
                          className="text-blue-500 hover:scale-125 transition-all p-1" 
                          title="Gerar Mapa Detalhado (Com Nomes 90º)"
                        >
                          📋
                        </button>
                      </div>
                      <span className={`text-[8px] font-black uppercase mt-0.5 ${
                          v.status === ViaturaStatus.OPERANDO ? 'text-green-600' :
                          v.status === ViaturaStatus.RESERVA ? 'text-yellow-600' : 'text-red-600'
                      }`}>{v.status}</span>
                    </td>
                    {dayArray.map(d => {
                      const dStr = `${month}-${d.toString().padStart(2, '0')}`;
                      const check = checks.find(c => c.viaturaId === v.id && getShiftReferenceDate(c.timestamp) === dStr);
                      const hasCN = check?.entries.some(e => e.status === 'CN');
                      const histStatus = !check ? getHistoricalVtrStatus(v, dStr, checks) : null;
                      const showStatusAsReason = !check && (histStatus === ViaturaStatus.RESERVA || histStatus === ViaturaStatus.BAIXADA);
                      const reasonText = histStatus === ViaturaStatus.RESERVA ? 'RES' : 'BX';
                      const shiftInfo = check ? getProntidaoInfo(new Date(check.timestamp)) : null;
                      
                      const cellStyle = check && shiftInfo ? {
                        backgroundColor: `color-mix(in srgb, ${shiftInfo.hex}, white 88%)`,
                        color: hasCN ? '#dc2626' : shiftInfo.hex,
                        borderColor: `color-mix(in srgb, ${shiftInfo.hex}, white 70%)`
                      } : {};

                      return (
                        <td key={d} style={cellStyle} className={`p-1 border-b border-r border-slate-100 text-center font-black ${
                          !check ? (showStatusAsReason ? 'text-slate-400 bg-slate-50' : 'text-slate-200') : ''
                        }`}>
                          {check ? (hasCN ? 'CN' : 'OK') : (showStatusAsReason ? reasonText : '—')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Abas de Navegação de Relatórios */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm overflow-x-auto max-w-full">
        <button onClick={() => setView('history')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Histórico</button>
        <button onClick={() => setView('monthly')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'monthly' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Mapa Mensal</button>
        <button onClick={() => setView('stats')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'stats' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Eficiência</button>
      </div>

      {view === 'history' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                {isPrivileged && (
                  <select value={filterPosto} onChange={e => { setFilterPosto(e.target.value); setFilterVtr(''); }} className="px-4 py-3 rounded-xl border border-slate-300 font-bold text-xs uppercase bg-slate-50 outline-none focus:border-red-500 transition-all">
                     <option value="">Todas as Unidades</option>
                     {postos.map(p => <option key={p.id} value={p.id}>{p.classification || 'Posto'} {p.name}</option>)}
                  </select>
                )}
                <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full md:w-72 px-4 py-3 rounded-xl border border-slate-300 font-bold text-xs uppercase bg-slate-50 outline-none focus:border-red-500 transition-all">
                   <option value="">Filtrar Viatura</option>
                   {visibleViaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
                </select>
            </div>
            <div className="flex gap-2">
              {/* BOTÃO: RESUMO DE NOVIDADES */}
              <button onClick={() => safeReport(generateNewsReportPDF, checks, viaturas, month, true)} className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase border border-red-100 hover:bg-red-100 transition-colors">Resumo Novidades</button>
              <button onClick={() => safeReport(generateSummaryPDF, filteredHistory, viaturas, true)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase border border-slate-200">Resumo Tela</button>
              <button onClick={() => safeReport(generateSummaryPDF, filteredHistory, viaturas)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-100 hover:bg-red-700 transition-colors">Baixar PDF</button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Data Turno</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Viatura</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em]">Nenhum registro localizado.</td>
                  </tr>
                ) : (
                  filteredHistory.map(check => {
                    const vtrObj = viaturas.find(v => v.id === check.viaturaId);
                    return (
                      <tr key={check.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-black text-xs text-slate-700">{formatDateShort(getShiftReferenceDate(check.timestamp))}</td>
                        <td className="px-6 py-4 text-xs font-black text-slate-900">{vtrObj?.prefix || 'INDISPONÍVEL'}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => safeReport(generateInventoryPDF, check, vtrObj!, true)} 
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase border border-slate-200 hover:bg-white hover:text-blue-600 transition-all"
                          >
                            Visualizar
                          </button>
                          <button 
                            onClick={() => safeReport(generateInventoryPDF, check, vtrObj!)} 
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase shadow-md hover:brightness-110 active:scale-95 transition-all"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'monthly' && renderMonthlyGrid()}
      
      {view === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Indicadores de Eficiência</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Relatório comparativo de preenchimento vinculando a frota operando à sua unidade atual.</p>
            <div className="pt-4 flex gap-2">
              <button onClick={() => safeReport(generateEfficiencyReportPDF, checks, visibleViaturas, month, true, postos)} className="flex-1 py-3 bg-green-50 text-green-700 rounded-xl font-black text-[10px] uppercase hover:bg-green-100 transition-colors">Visualizar PDF</button>
              <button onClick={() => safeReport(generateEfficiencyReportPDF, checks, visibleViaturas, month, false, postos)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-100 hover:bg-green-700 transition-colors">Baixar Relatório</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
