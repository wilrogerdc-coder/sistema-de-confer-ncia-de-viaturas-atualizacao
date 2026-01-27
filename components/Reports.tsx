
import React, { useState, useMemo } from 'react';
import { InventoryCheck, Viatura, User, UserRole, ViaturaStatus } from '../types';
import { 
  generateInventoryPDF, 
  generateSummaryPDF, 
  generateMonthlyFulfillmentPDF, 
  generateNewsReportPDF,
  generateVtrMonthlyItemsPDF,
  generateEfficiencyReportPDF,
  generateDailyManualCheckPDF,
  generateMonthlyManualCheckPDF
} from '../utils/pdfGenerator';
import { formatDateShort, safeDateIso, formatFullDate } from '../utils/calendarUtils';

interface ReportsProps {
  checks: InventoryCheck[];
  viaturas: Viatura[];
  currentUser: User;
}

const Reports: React.FC<ReportsProps> = ({ checks, viaturas, currentUser }) => {
  const [view, setView] = useState<'history' | 'monthly' | 'stats' | 'manual' | 'incidents'>('history');
  const [filterVtr, setFilterVtr] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const filteredHistory = useMemo(() => {
    return checks.filter(c => {
      const matchesVtr = filterVtr ? c.viaturaId === filterVtr : true;
      return matchesVtr;
    }).reverse();
  }, [checks, filterVtr]);

  const incidentData = useMemo(() => {
    const items: any[] = [];
    const monthChecks = checks.filter(c => safeDateIso(c.date).startsWith(month));
    
    monthChecks.forEach(check => {
        const vtr = viaturas.find(v => v.id === check.viaturaId);
        const novelties = check.entries.filter(e => e.status === 'CN' || e.status === 'NA');
        
        novelties.forEach(e => {
            const sourceItems = check.snapshot || vtr?.items || [];
            const item = sourceItems.find(i => i.id === e.itemId);
            items.push({
                date: check.date,
                vtr: vtr?.prefix || '?',
                material: item?.name || '?',
                status: e.status,
                observation: e.observation || 'N/I'
            });
        });
    });
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [checks, viaturas, month]);

  const getDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const safeReport = (fn: Function, ...args: any[]) => {
    try {
      fn(...args);
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao gerar relatório: ${e.message || "Falha desconhecida"}.`);
    }
  };

  const renderIncidentView = () => (
    <div className="space-y-6 animate-in fade-in">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="flex items-center gap-3">
                <label className="text-xs font-black uppercase text-slate-500">Mês de Referência:</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 font-bold outline-none focus:border-red-500 text-sm" />
            </div>
            <button onClick={() => safeReport(generateNewsReportPDF, checks, viaturas, month)} className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-red-700 transition-all">
                Exportar Consolidação (PDF)
            </button>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Prévia de Novidades Detectadas ({incidentData.length})</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Data</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Vtr</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Material</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Obs.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {incidentData.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase">Nenhuma novidade no período.</td></tr>
                        ) : (
                            incidentData.map((inc, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-600">{formatDateShort(inc.date)}</td>
                                    <td className="px-6 py-4 text-xs font-black text-red-600">{inc.vtr}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-800">{inc.material}</td>
                                    <td className="px-6 py-4 text-[10px] text-slate-500 italic max-w-xs truncate">{inc.observation}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

  const renderMonthlyGrid = () => {
    const days = getDaysInMonth(month);
    const dayArray = Array.from({ length: days }, (_, i) => i + 1);
    
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200 overflow-x-auto space-y-8 animate-in fade-in shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Frequência Mensal de Conferências</h3>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
             <div className="flex items-center gap-2">
               <label className="text-xs font-semibold uppercase text-slate-500">Referência:</label>
               <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 font-medium outline-none focus:border-red-500 text-sm" />
             </div>
             <div className="flex gap-2 flex-wrap">
                <button onClick={() => safeReport(generateMonthlyFulfillmentPDF, checks, viaturas, month)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase hover:bg-slate-900 transition-all">📥 Baixar PDF Completo</button>
             </div>
          </div>
          
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="p-3 border-b border-r border-slate-200 bg-slate-50 font-bold text-left sticky left-0 z-10 text-slate-600 min-w-[120px]">Viatura / Status</th>
                  {dayArray.map(d => (
                    <th key={d} className="p-1 border-b border-r border-slate-100 bg-slate-50 font-semibold text-center min-w-[30px] text-slate-500">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viaturas.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="p-2 border-r border-b border-slate-100 font-medium flex flex-col bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <span className="text-slate-800 font-bold">{v.prefix}</span>
                      <span className={`text-[9px] font-bold uppercase mt-0.5 ${
                          v.status === ViaturaStatus.OPERANDO ? 'text-green-600' :
                          v.status === ViaturaStatus.RESERVA ? 'text-yellow-600' : 'text-red-600'
                      }`}>{v.status}</span>
                    </td>
                    {dayArray.map(d => {
                      const dStr = `${month}-${d.toString().padStart(2, '0')}`;
                      const check = checks.find(c => c.viaturaId === v.id && safeDateIso(c.date) === dStr);
                      const hasCN = check?.entries.some(e => e.status === 'CN');
                      const showStatusAsReason = !check && (v.status === ViaturaStatus.RESERVA || v.status === ViaturaStatus.BAIXADA);
                      const reasonText = v.status === ViaturaStatus.RESERVA ? 'RES' : 'BX';
                      return (
                        <td key={d} className={`p-1 border-b border-r border-slate-100 text-center font-bold ${
                          !check ? (showStatusAsReason ? 'text-slate-400 bg-slate-50' : 'text-slate-200') 
                          : (hasCN ? 'text-red-600 bg-red-50/50' : 'text-green-600 bg-green-50/50')
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

  const renderManualView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-lg font-bold text-slate-800">Conferência Manual Diária</h4>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">Gera uma folha de checklist em branco da viatura selecionada para preenchimento no papel.</p>
        <div className="pt-4 space-y-4">
           <select 
            value={filterVtr} 
            onChange={e => setFilterVtr(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold outline-none focus:border-red-500 text-sm"
          >
            <option value="">Escolha a Viatura...</option>
            {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
          </select>
          <div className="flex gap-2">
            <button 
              disabled={!filterVtr}
              onClick={() => safeReport(generateDailyManualCheckPDF, viaturas.find(v => v.id === filterVtr)!, true)} 
              className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase hover:bg-slate-200 shadow-sm disabled:opacity-50"
            >
              PRÉVIA
            </button>
            <button 
              disabled={!filterVtr}
              onClick={() => safeReport(generateDailyManualCheckPDF, viaturas.find(v => v.id === filterVtr)!)} 
              className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase hover:bg-slate-800 shadow-lg disabled:opacity-50"
            >
              📥 Baixar PDF
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-lg font-bold text-slate-800">Mapa Manual Mensal</h4>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">Gera o mapa mensal vazio para anotações manuais diárias.</p>
        <div className="pt-4 space-y-4">
          <select 
            value={filterVtr} 
            onChange={e => setFilterVtr(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold outline-none focus:border-red-500 text-sm"
          >
            <option value="">Escolha a Viatura...</option>
            {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
          </select>
          <div className="flex gap-2">
            <button 
              disabled={!filterVtr}
              onClick={() => safeReport(generateMonthlyManualCheckPDF, viaturas.find(v => v.id === filterVtr)!, month, true)} 
              className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase hover:bg-slate-200 shadow-sm disabled:opacity-50"
            >
              PRÉVIA
            </button>
            <button 
              disabled={!filterVtr}
              onClick={() => safeReport(generateMonthlyManualCheckPDF, viaturas.find(v => v.id === filterVtr)!, month)} 
              className="flex-[2] py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase hover:bg-red-700 shadow-lg disabled:opacity-50"
            >
              📥 Baixar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm overflow-x-auto max-w-full">
        <button onClick={() => setView('history')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'history' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>HISTÓRICO</button>
        <button onClick={() => setView('monthly')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>MAPA MENSAL</button>
        <button onClick={() => setView('incidents')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'incidents' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>INCIDENTES 🚨</button>
        <button onClick={() => setView('stats')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'stats' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>EFICIÊNCIA</button>
        <button onClick={() => setView('manual')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'manual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>IMPRESSÃO 🖨️</button>
      </div>

      {view === 'history' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full md:w-64 px-4 py-3 rounded-xl border border-slate-300 font-medium text-sm"><option value="">Filtrar Viatura</option>{viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}</select>
            <div className="flex gap-2">
              <button onClick={() => safeReport(generateSummaryPDF, filteredHistory, viaturas)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase shadow-lg">📥 Baixar Resumo Histórico (PDF)</button>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500">Data</th><th className="px-6 py-4 text-xs font-bold text-slate-500">Viatura</th><th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">Ação</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map(check => (
                  <tr key={check.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-sm">{formatDateShort(check.date)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{viaturas.find(v => v.id === check.viaturaId)?.prefix}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => safeReport(generateInventoryPDF, check, viaturas.find(v => v.id === check.viaturaId)!, true)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">PRÉVIA</button>
                      <button onClick={() => safeReport(generateInventoryPDF, check, viaturas.find(v => v.id === check.viaturaId)!)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase">PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'monthly' && renderMonthlyGrid()}
      {view === 'incidents' && renderIncidentView()}
      {view === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-lg font-bold text-slate-800">Relatório de Eficiência</h4>
            <p className="text-sm text-slate-500 font-medium">Avalie a constância das conferências diárias.</p>
            <div className="pt-4 flex gap-2">
              <button onClick={() => safeReport(generateEfficiencyReportPDF, checks, viaturas, month, true)} className="flex-1 py-3 bg-green-50 text-green-700 rounded-xl font-bold text-xs uppercase">PRÉVIA</button>
              <button onClick={() => safeReport(generateEfficiencyReportPDF, checks, viaturas, month)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg">📥 PDF</button>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-lg font-bold text-slate-800">Resumo de Novidades Mensais</h4>
            <p className="text-sm text-slate-500 font-medium">Lista todas inconformidades registradas no mês.</p>
            <div className="pt-4 flex gap-2">
              <button onClick={() => safeReport(generateNewsReportPDF, checks, viaturas, month, true)} className="flex-1 py-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs uppercase">PRÉVIA</button>
              <button onClick={() => safeReport(generateNewsReportPDF, checks, viaturas, month)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg">📥 PDF</button>
            </div>
          </div>
        </div>
      )}
      {view === 'manual' && renderManualView()}
    </div>
  );
};

export default Reports;
