
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
import { DataService } from '../services/dataService';

interface ReportsProps {
  checks: InventoryCheck[];
  viaturas: Viatura[];
  currentUser: User;
}

const Reports: React.FC<ReportsProps> = ({ checks, viaturas, currentUser }) => {
  const [view, setView] = useState<'history' | 'monthly' | 'detailed' | 'efficiency' | 'manual'>('history');
  const [filterVtr, setFilterVtr] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  const filteredHistory = useMemo(() => {
    return checks.filter(c => {
      const matchesVtr = filterVtr ? c.viaturaId === filterVtr : true;
      return matchesVtr;
    }).reverse();
  }, [checks, filterVtr]);

  const safeReport = async (fn: Function, reportName: string, ...args: any[]) => {
    try {
      await fn(...args);
      // Log de geração de relatório
      DataService.saveLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'REPORT_GEN',
        details: `Gerou relatório: ${reportName}`
      });
    } catch (e: any) {
      alert(`Erro ao gerar relatório: ${e.message}`);
    }
  };

  const renderMonthlyGrid = () => {
    const [year, m] = month.split('-').map(Number);
    const daysInMonth = new Date(year, m, 0).getDate();
    const dayArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 overflow-x-auto shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Mapa Mensal de Frequência</h3>
          <div className="flex gap-2">
            <button onClick={() => safeReport(generateMonthlyFulfillmentPDF, 'Mapa Mensal', checks, viaturas, month)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Baixar PDF</button>
          </div>
        </div>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-2 border border-slate-200 font-black text-left sticky left-0 z-10 bg-slate-50">Viatura</th>
              {dayArray.map(d => (
                <th key={d} className="p-1 border border-slate-200 text-center min-w-[25px]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viaturas.map(v => (
              <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-2 border border-slate-200 font-bold bg-white sticky left-0 z-10">{v.prefix}</td>
                {dayArray.map(d => {
                  const dateStr = `${month}-${d.toString().padStart(2, '0')}`;
                  const check = checks.find(c => c.viaturaId === v.id && safeDateIso(c.date) === dateStr);
                  const hasCN = check?.entries.some(e => e.status === 'CN');
                  return (
                    <td key={d} className={`p-1 border border-slate-100 text-center font-black ${
                      check ? (hasCN ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50') : 'text-slate-200'
                    }`}>
                      {check ? (hasCN ? 'CN' : 'OK') : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm overflow-x-auto max-w-full">
        <button onClick={() => setView('history')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'history' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>HISTÓRICO</button>
        <button onClick={() => setView('monthly')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>MAPA GERAL</button>
        <button onClick={() => setView('detailed')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'detailed' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>DETALHADO VTR</button>
        <button onClick={() => setView('efficiency')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'efficiency' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>EFICIÊNCIA 📈</button>
        <button onClick={() => setView('manual')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${view === 'manual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>MANUAL 🖨️</button>
      </div>

      {view === 'history' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full md:w-64 px-4 py-3 rounded-xl border border-slate-300 font-medium text-sm">
                <option value="">Filtrar Viatura</option>
                {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
            </select>
            <div className="flex gap-2">
                <button onClick={() => safeReport(generateSummaryPDF, 'Resumo Histórico', filteredHistory, viaturas)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase shadow-lg">Baixar Histórico PDF</button>
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
                      <button onClick={() => safeReport(generateInventoryPDF, 'Checklist Preview', check, viaturas.find(v => v.id === check.viaturaId)!, true)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">PRÉVIA</button>
                      <button onClick={() => safeReport(generateInventoryPDF, 'Checklist PDF', check, viaturas.find(v => v.id === check.viaturaId)!)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase">PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'monthly' && renderMonthlyGrid()}

      {view === 'detailed' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relação Mensal de Materiais (Detalhado)</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400">Viatura:</label>
                 <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm bg-slate-50">
                    <option value="">Selecione...</option>
                    {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400">Mês de Referência:</label>
                 <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm bg-slate-50" />
              </div>
           </div>
           <div className="flex gap-3 pt-4">
              <button disabled={!filterVtr} onClick={() => safeReport(generateVtrMonthlyItemsPDF, 'Mensal Detalhado Preview', checks, viaturas.find(v => v.id === filterVtr)!, month, true)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase text-xs disabled:opacity-50">PRÉVIA</button>
              <button disabled={!filterVtr} onClick={() => safeReport(generateVtrMonthlyItemsPDF, 'Mensal Detalhado PDF', checks, viaturas.find(v => v.id === filterVtr)!, month)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg disabled:opacity-50">GERAR PDF (Nomes a 90º)</button>
           </div>
        </div>
      )}

      {view === 'efficiency' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-black text-slate-800 uppercase text-sm">Relatório de Eficiência</h4>
            <p className="text-xs text-slate-500 font-medium">Consolida a produtividade e constância de conferências no mês.</p>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm mb-4" />
            <div className="flex gap-2">
               <button onClick={() => safeReport(generateEfficiencyReportPDF, 'Eficiência Preview', checks, viaturas, month, true)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase">PRÉVIA</button>
               <button onClick={() => safeReport(generateEfficiencyReportPDF, 'Eficiência PDF', checks, viaturas, month)} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase">PDF</button>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-black text-slate-800 uppercase text-sm">Resumo de Novidades</h4>
            <p className="text-xs text-slate-500 font-medium">Lista todas as ocorrências (CN e NA) registradas no mês.</p>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm mb-4" />
            <div className="flex gap-2">
               <button onClick={() => safeReport(generateNewsReportPDF, 'Novidades Preview', checks, viaturas, month, true)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase">PRÉVIA</button>
               <button onClick={() => safeReport(generateNewsReportPDF, 'Novidades PDF', checks, viaturas, month)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase">PDF</button>
            </div>
          </div>
        </div>
      )}

      {view === 'manual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-black text-slate-800 uppercase text-sm">Conferência Diária Manual</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Gera uma folha de checklist em branco para uso em prancheta.</p>
            <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full px-4 py-3 rounded-xl border text-sm font-bold bg-slate-50">
                <option value="">Escolha a Vtr...</option>
                {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
            </select>
            <div className="flex gap-2">
                <button disabled={!filterVtr} onClick={() => safeReport(generateDailyManualCheckPDF, 'Manual Diário Preview', viaturas.find(v => v.id === filterVtr)!, true)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase disabled:opacity-50">PRÉVIA</button>
                <button disabled={!filterVtr} onClick={() => safeReport(generateDailyManualCheckPDF, 'Manual Diário PDF', viaturas.find(v => v.id === filterVtr)!)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50">PDF</button>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-black text-slate-800 uppercase text-sm">Mapa Mensal em Branco</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Gera o mapa de frequência vazio para preenchimento manual.</p>
            <select value={filterVtr} onChange={e => setFilterVtr(e.target.value)} className="w-full px-4 py-3 rounded-xl border text-sm font-bold bg-slate-50">
                <option value="">Escolha a Vtr...</option>
                {viaturas.map(v => <option key={v.id} value={v.id}>{v.prefix}</option>)}
            </select>
            <div className="flex gap-2">
                <button disabled={!filterVtr} onClick={() => safeReport(generateMonthlyManualCheckPDF, 'Manual Mensal Preview', viaturas.find(v => v.id === filterVtr)!, month, true)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase disabled:opacity-50">PRÉVIA</button>
                <button disabled={!filterVtr} onClick={() => safeReport(generateMonthlyManualCheckPDF, 'Manual Mensal PDF', viaturas.find(v => v.id === filterVtr)!, month)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50">PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
