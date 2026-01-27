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
import { formatDateShort, safeDateIso } from '../utils/calendarUtils';

interface ReportsProps {
  checks: InventoryCheck[];
  viaturas: Viatura[];
  currentUser: User;
}

const Reports: React.FC<ReportsProps> = ({ checks, viaturas, currentUser }) => {
  const [view, setView] = useState<'history' | 'monthly' | 'detailed' | 'incidents' | 'manual'>('history');
  const [filterVtr, setFilterVtr] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  const filteredHistory = useMemo(() => {
    return checks.filter(c => {
      const matchesVtr = filterVtr ? c.viaturaId === filterVtr : true;
      return matchesVtr;
    }).reverse();
  }, [checks, filterVtr]);

  const safeReport = (fn: Function, ...args: any[]) => {
    try {
      fn(...args);
    } catch (e: any) {
      alert(`Erro ao gerar relatório: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm overflow-x-auto max-w-full">
        <button onClick={() => setView('history')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'history' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>HISTÓRICO</button>
        <button onClick={() => setView('monthly')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>MAPA GERAL</button>
        <button onClick={() => setView('detailed')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'detailed' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>DETALHADO VTR</button>
        <button onClick={() => setView('incidents')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'incidents' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>INCIDENTES 🚨</button>
        <button onClick={() => setView('manual')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'manual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>MANUAL 🖨️</button>
      </div>

      {view === 'history' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full md:w-64 px-4 py-3 rounded-xl border border-slate-300 font-medium text-sm">
                <option value="">Filtrar Viatura</option>
                {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
            </select>
            <button onClick={() => safeReport(generateSummaryPDF, filteredHistory, viaturas)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase shadow-lg">📥 Baixar PDF Histórico</button>
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

      {view === 'detailed' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
           <h3 className="text-xl font-black text-slate-800 uppercase">Relação Mensal de Materiais (B4)</h3>
           <p className="text-xs text-slate-500 font-medium">Este relatório gera a grade completa de materiais de uma viatura específica para o mês selecionado, incluindo nomes dos conferentes.</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400">Viatura:</label>
                 <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-red-500">
                    <option value="">Selecione a Viatura...</option>
                    {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400">Mês/Ano:</label>
                 <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-red-500" />
              </div>
           </div>
           <div className="flex gap-3 pt-4">
              <button disabled={!filterVtr} onClick={() => safeReport(generateVtrMonthlyItemsPDF, checks, viaturas.find(v => v.id === filterVtr)!, month, true)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 disabled:opacity-50">Visualizar Prévia</button>
              <button disabled={!filterVtr} onClick={() => safeReport(generateVtrMonthlyItemsPDF, checks, viaturas.find(v => v.id === filterVtr)!, month)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50">📥 Gerar PDF Oficial</button>
           </div>
        </div>
      )}

      {view === 'monthly' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Mapa Geral de Frequência</h3>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
          </div>
          <button onClick={() => safeReport(generateMonthlyFulfillmentPDF, checks, viaturas, month)} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-xs mb-4">📥 Baixar Mapa Geral (PDF)</button>
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase">Este relatório mostra o status consolidado de todas as viaturas do dia 1 ao 31.</p>
        </div>
      )}

      {view === 'incidents' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6 animate-in fade-in">
           <div className="flex justify-between items-center">
             <h3 className="text-lg font-bold text-slate-800">Consolidado de Novidades</h3>
             <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
           </div>
           <button onClick={() => safeReport(generateNewsReportPDF, checks, viaturas, month)} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">📥 Baixar Relatório de Novidades (PDF)</button>
        </div>
      )}

      {view === 'manual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800">Checklist Diário em Branco</h4>
            <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full px-4 py-2 rounded-lg border text-sm"><option value="">Viatura...</option>{viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}</select>
            <button disabled={!filterVtr} onClick={() => safeReport(generateDailyManualCheckPDF, viaturas.find(v => v.id === filterVtr)!)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase disabled:opacity-50">📥 Gerar PDF para Prancheta</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
