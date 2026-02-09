
import React, { useMemo, useState } from 'react';
import { LogEntry, User, UserRole } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { generateAuditLogPDF } from '../utils/pdfGenerator';

interface LogManagerProps {
  logs: LogEntry[];
  currentUser: User;
}

const LogManager: React.FC<LogManagerProps> = ({ logs, currentUser }) => {
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  // 1. Cálculo de Estatísticas Gerais
  const stats = useMemo(() => {
    const totalActions = logs.length;
    const uniqueUsers = new Set(logs.map(l => l.userName)).size;
    
    // Contagem de logins hoje
    const todayStr = new Date().toISOString().split('T')[0];
    const loginsToday = logs.filter(l => 
      l.action === 'LOGIN' && l.timestamp.startsWith(todayStr)
    ).length;

    const lastLog = logs.length > 0 
      ? new Date(logs.sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0].timestamp) 
      : null;

    return { totalActions, uniqueUsers, loginsToday, lastLog };
  }, [logs]);

  // 2. Preparação de Dados para Gráficos
  const chartsData = useMemo(() => {
    // Agrupamento por Tipo de Ação (Categorias)
    const categoryCount: Record<string, number> = {
      'ACESSO': 0,
      'OPERACIONAL': 0,
      'ADMINISTRATIVO': 0,
      'FROTA': 0
    };

    // Agrupamento por Usuário (Top 5)
    const userCount: Record<string, number> = {};

    logs.forEach(log => {
      // Categorias
      if (log.action === 'LOGIN' || log.action === 'LOGOUT') categoryCount['ACESSO']++;
      else if (log.action === 'CHECKLIST') categoryCount['OPERACIONAL']++;
      else if (log.action.includes('USER')) categoryCount['ADMINISTRATIVO']++;
      else if (log.action.includes('VTR') || log.action.includes('GB') || log.action.includes('SUB') || log.action.includes('POSTO')) categoryCount['FROTA']++;
      else categoryCount['ADMINISTRATIVO']++; // Default

      // Usuários
      userCount[log.userName] = (userCount[log.userName] || 0) + 1;
    });

    const pieData = [
      { name: 'Acesso', value: categoryCount['ACESSO'], color: '#3b82f6' }, // Blue
      { name: 'Operacional', value: categoryCount['OPERACIONAL'], color: '#22c55e' }, // Green
      { name: 'Admin', value: categoryCount['ADMINISTRATIVO'], color: '#a855f7' }, // Purple
      { name: 'Frota', value: categoryCount['FROTA'], color: '#ef4444' }, // Red
    ].filter(d => d.value > 0);

    const barData = Object.entries(userCount)
      .map(([name, count]) => ({ name: name.split(' ')[0], full: name, count })) // Pega primeiro nome p/ eixo X
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    return { pieData, barData };
  }, [logs]);

  // 3. Filtragem da Tabela
  const filteredLogs = logs
    .filter(log => {
      const matchUser = filterUser ? log.userName.toLowerCase().includes(filterUser.toLowerCase()) : true;
      const matchAction = filterAction ? log.action === filterAction : true;
      return matchUser && matchAction;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (action.includes('CHECKLIST')) return 'bg-green-100 text-green-700 border-green-200';
    if (action.includes('DELETE') || action.includes('CLEAR')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const actionTypes = Array.from(new Set(logs.map(l => l.action)));

  const handleExportPDF = () => {
    try {
      generateAuditLogPDF(filteredLogs);
    } catch (e: any) {
      alert("Erro ao gerar PDF: " + e.message);
    }
  };

  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="text-4xl mb-4">🚫</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h3>
        <p className="text-slate-500 font-bold mt-2">Apenas o Super Usuário pode acessar os Logs de Auditoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl text-white">📡</div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Central de Auditoria</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Monitoramento e Segurança de Dados</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Última Atividade</p>
           <p className="text-sm font-black text-slate-800">
             {stats.lastLog ? stats.lastLog.toLocaleString('pt-BR') : 'Nenhuma'}
           </p>
        </div>
      </div>

      {/* Cards Estatísticos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">💾</div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Registros</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalActions}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xl">👥</div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuários Únicos</p>
              <p className="text-3xl font-black text-slate-800">{stats.uniqueUsers}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xl">🔐</div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acessos Hoje</p>
              <p className="text-3xl font-black text-slate-800">{stats.loginsToday}</p>
           </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Top Usuários */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
           <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">Usuários Mais Ativos (Top 5)</h4>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartsData.barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                 <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                 />
                 <Bar dataKey="count" fill="#ef4444" radius={[0, 10, 10, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Gráfico de Pizza - Distribuição de Ações */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
           <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">Distribuição de Atividades</h4>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={chartsData.pieData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {chartsData.pieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 'bold', fontSize: '12px' }} />
                 <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6 border-b border-slate-50 pb-6">
           <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
             <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide whitespace-nowrap">Registro Detalhado</h4>
             <button onClick={handleExportPDF} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-2">
                <span>📥</span> Exportar Relatório (PDF)
             </button>
           </div>
           
           <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
              <input 
                type="text" 
                placeholder="Filtrar Usuário..." 
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs outline-none focus:ring-4 focus:ring-red-50 flex-1"
              />
              <select 
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs outline-none bg-white flex-1"
              >
                <option value="">Todas as Ações</option>
                {actionTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
           </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalhes da Operação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredLogs.slice(0, 100).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-black text-slate-700">
                        {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                           {log.userName.charAt(0)}
                         </div>
                         <span className="text-xs font-bold text-slate-800">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] px-2 py-1 rounded-md font-black border uppercase tracking-wider ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed max-w-md truncate group-hover:whitespace-normal group-hover:text-slate-800 transition-all">
                        {log.details}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredLogs.length > 100 && (
            <div className="p-4 text-center bg-slate-50 border-t border-slate-100">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Exibindo os 100 registros mais recentes de {filteredLogs.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogManager;
