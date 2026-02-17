
import React, { useMemo, useState } from 'react';
import { LogEntry, User, UserRole } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import { generateAuditLogPDF } from '../utils/pdfGenerator';

interface LogManagerProps {
  logs: LogEntry[];
  currentUser: User;
  onRefresh?: () => void;
}

/**
 * COMPONENTE DE AUDITORIA MASTER
 * Responsável pela visualização e análise de ações realizadas no sistema.
 */
const LogManager: React.FC<LogManagerProps> = ({ logs, currentUser, onRefresh }) => {
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'intelligence'>('intelligence');
  const [isSyncing, setIsSyncing] = useState(false);

  // Garantia de que logs seja sempre um array iterável
  const safeLogs = useMemo(() => {
    return Array.isArray(logs) ? logs : [];
  }, [logs]);

  /**
   * Geração de estatísticas para os cartões de inteligência.
   */
  const stats = useMemo(() => {
    if (!safeLogs.length) return { totalActions: 0, uniqueUsers: 0, loginsToday: 0, peakHour: '-' };
    const totalActions = safeLogs.length;
    const uniqueUsers = new Set(safeLogs.map(l => l.userName || 'Sistema')).size;
    const todayStr = new Date().toISOString().split('T')[0];
    const loginsToday = safeLogs.filter(l => (l.action || '').toUpperCase() === 'LOGIN' && String(l.timestamp).startsWith(todayStr)).length;
    
    const hours = safeLogs.map(l => {
        try { return new Date(l.timestamp).getHours(); } catch(e) { return 0; }
    });
    const hourCounts: Record<number, number> = {};
    hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
    const peakHourEntry = Object.entries(hourCounts).sort((a,b) => b[1] - a[1])[0];
    const peakHour = peakHourEntry ? `${peakHourEntry[0].padStart(2, '0')}:00` : '-';
    
    return { totalActions, uniqueUsers, loginsToday, peakHour };
  }, [safeLogs]);

  /**
   * Processamento de dados para os gráficos de monitoramento.
   */
  const intelligenceData = useMemo(() => {
    if (!safeLogs.length) return { pieData: [], barData: [], timelineData: [] };
    const categoryCount: Record<string, number> = { 'ACESSO': 0, 'OPERACIONAL': 0, 'ADMINISTRATIVO': 0, 'FROTA': 0 };
    const userCount: Record<string, number> = {};
    const timeline: Record<string, number> = {};
    
    safeLogs.forEach(log => {
      const action = (log.action || '').toUpperCase();
      const userName = log.userName || 'Anônimo';
      const date = log.timestamp ? String(log.timestamp).split('T')[0] : 'Desconhecida';

      // Categorização baseada no tipo de ação
      if (action === 'LOGIN' || action === 'LOGOUT') categoryCount['ACESSO']++;
      else if (action === 'CHECKLIST') categoryCount['OPERACIONAL']++;
      else if (action.includes('USER')) categoryCount['ADMINISTRATIVO']++;
      else if (action.includes('VTR') || action.includes('GB') || action.includes('SUB') || action.includes('POSTO')) categoryCount['FROTA']++;
      else categoryCount['ADMINISTRATIVO']++;
      
      userCount[userName] = (userCount[userName] || 0) + 1;
      timeline[date] = (timeline[date] || 0) + 1;
    });

    const pieData = [
      { name: 'Acesso', value: categoryCount['ACESSO'], color: '#3b82f6' },
      { name: 'Operacional', value: categoryCount['OPERACIONAL'], color: '#22c55e' },
      { name: 'Admin', value: categoryCount['ADMINISTRATIVO'], color: '#a855f7' },
      { name: 'Frota', value: categoryCount['FROTA'], color: '#ef4444' },
    ].filter(d => d.value > 0);

    const barData = Object.entries(userCount)
      .map(([name, count]) => ({ name: name.split(' ')[0] || '?', full: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const timelineData = Object.entries(timeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-15); 

    return { pieData, barData, timelineData };
  }, [safeLogs]);

  /**
   * Filtragem e ordenação dos logs para a tabela de atividades.
   */
  const filteredLogs = useMemo(() => {
    return [...safeLogs]
      .filter(log => {
        const matchUser = filterUser ? (log.userName || '').toLowerCase().includes(filterUser.toLowerCase()) : true;
        const matchAction = filterAction ? log.action === filterAction : true;
        return matchUser && matchAction;
      })
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }, [safeLogs, filterUser, filterAction]);

  /**
   * Força a sincronização direta com o banco de dados independente.
   */
  const handleManualRefresh = async () => {
    setIsSyncing(true);
    if (onRefresh) {
        await onRefresh();
    }
    // Feedback visual de carregamento
    setTimeout(() => setIsSyncing(false), 800);
  };

  // Verificação de permissão Super Usuário
  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
        <div className="text-4xl mb-4">🔐</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Área de Auditoria Restrita</h3>
        <p className="text-slate-500 font-bold mt-2">Acesso exclusivo ao Super Usuário para monitoramento global.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Cabeçalho da Auditoria */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner">🛡️</div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter leading-none">Controle de Auditoria</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${safeLogs.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                Status: Sincronizado com Banco de Logs
            </p>
          </div>
        </div>
        <div className="flex gap-2 relative z-10">
            {/* Botão de atualização solicitada para sincronia fiel */}
            <button 
                onClick={handleManualRefresh} 
                disabled={isSyncing} 
                className={`px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase border border-white/10 transition-all active:scale-95 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSyncing ? '🔄 Sincronizando...' : '📥 Atualizar Atividades'}
            </button>
            <button onClick={() => generateAuditLogPDF(filteredLogs)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Relatório PDF</button>
        </div>
      </div>

      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
         <button onClick={() => setViewMode('intelligence')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'intelligence' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Visão Inteligente</button>
         <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Lista Cronológica</button>
      </div>

      {viewMode === 'intelligence' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações Registradas</p><p className="text-3xl font-black">{stats.totalActions}</p></div>
             <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pico de Uso</p><p className="text-3xl font-black text-blue-600">{stats.peakHour}</p></div>
             <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operadores Ativos</p><p className="text-3xl font-black">{stats.uniqueUsers}</p></div>
             <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acessos Hoje</p><p className="text-3xl font-black text-green-600">{stats.loginsToday}</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest text-center">Frequência de Uso</h4>
               <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={intelligenceData.timelineData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" hide /><YAxis hide /><Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} /><Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} /></LineChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest text-center">Engajamento por Operador</h4>
               <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={intelligenceData.barData} layout="vertical"><XAxis type="number" hide />
                {/* Fixed invalid fontBold prop by using fontWeight: "bold" */}
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9, fontWeight: "bold"}} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} /><Bar dataKey="count" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={15} /></BarChart></ResponsiveContainer></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <input type="text" placeholder="Filtrar por operador..." value={filterUser} onChange={e => setFilterUser(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-slate-200 font-bold text-xs outline-none flex-1 focus:ring-4 focus:ring-blue-50 transition-all" />
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-slate-200 font-bold text-xs outline-none bg-white flex-1 cursor-pointer transition-all"><option value="">Filtrar Ação</option>{Array.from(new Set(safeLogs.map(l => l.action).filter(Boolean))).sort().map(type => <option key={type} value={type}>{type}</option>)}</select>
          </div>
          {/* Tabela de Logs Fiel ao Banco de Dados */}
          <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th><th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operador Responsável</th><th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ação Realizada</th><th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalhes do Evento</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredLogs.length === 0 ? (<tr><td colSpan={4} className="p-12 text-center text-slate-300 font-bold uppercase text-xs tracking-[0.2em]">Nenhum registro localizado no banco de dados.</td></tr>) : filteredLogs.slice(0, 100).map(log => (<tr key={log.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4 whitespace-nowrap"><p className="text-xs font-black text-slate-700">{log.timestamp ? new Date(log.timestamp).toLocaleDateString('pt-BR') : '-'}</p><p className="text-[9px] font-bold text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR') : '-'}</p></td><td className="px-6 py-4 text-xs font-bold text-slate-800 uppercase">{log.userName || 'Sistema'}</td><td className="px-6 py-4"><span className="text-[8px] px-2 py-1 rounded bg-slate-100 border border-slate-200 font-black uppercase text-slate-500">{log.action || 'INFO'}</span></td><td className="px-6 py-4 text-[10px] text-slate-600 font-semibold max-w-xs">{log.details || '-'}</td></tr>))}</tbody></table></div>
        </div>
      )}
    </div>
  );
};

export default LogManager;
