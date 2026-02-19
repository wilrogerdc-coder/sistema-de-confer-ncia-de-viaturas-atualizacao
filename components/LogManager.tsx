
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
  onRefresh?: () => void;
}

/**
 * COMPONENTE: LogManager (NÍVEL SÊNIOR)
 * Gerencia a auditoria do sistema e a visualização de rastreabilidade.
 * 
 * REGRAS IMPLEMENTADAS:
 * 1. ORDENAÇÃO: Garante que os registros mais recentes (última linha da planilha) apareçam no topo.
 * 2. SINCRONIZAÇÃO: Botão dinâmico que informa o status de conexão com o Banco.
 * 3. ABA DADOS BRUTOS: Exibe chaves normalizadas garantindo que o mapeamento ID, TIMESTAMP funcionou.
 */
const LogManager: React.FC<LogManagerProps> = ({ logs, currentUser, onRefresh }) => {
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'intelligence' | 'raw'>('list');
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * REGRA DE INTEGRIDADE: Ordenação Cronológica Inversa
   * Garante a visualização do log mais recente primeiro na tela.
   */
  const safeLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    return [...logs].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });
  }, [logs]);

  /**
   * REGRA: Atualização de Dados Remotos
   * Força a recarga dos dados vindo da URL de Auditoria configurada no DataService.
   */
  const handleRefresh = async () => {
    if (onRefresh) {
      setIsSyncing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Erro na sincronização de auditoria:", error);
      } finally {
        // Delay visual para confirmação tátil do status sincronizado
        setTimeout(() => setIsSyncing(false), 1000);
      }
    }
  };

  /**
   * REGRA DE FILTRAGEM: Busca por Usuário ou Tipo de Ação.
   */
  const filteredLogs = useMemo(() => {
    return safeLogs.filter(log => {
      const matchUser = filterUser ? (log.userName || '').toLowerCase().includes(filterUser.toLowerCase()) : true;
      const matchAction = filterAction ? log.action === filterAction : true;
      return matchUser && matchAction;
    });
  }, [safeLogs, filterUser, filterAction]);

  /**
   * REGRA DE INTELIGÊNCIA: Processamento de Gráficos (Dashboard Técnico).
   */
  const intelligenceData = useMemo(() => {
    if (!safeLogs.length) return { pieData: [], barData: [] };
    
    const categoryCount: Record<string, number> = { 'ACESSO': 0, 'OPERACIONAL': 0, 'ADMINISTRATIVO': 0, 'FROTA': 0 };
    const userCount: Record<string, number> = {};
    
    safeLogs.forEach(log => {
      const action = (log.action || '').toUpperCase();
      const userName = log.userName || 'Sistema';

      if (['LOGIN', 'LOGOUT'].includes(action)) categoryCount['ACESSO']++;
      else if (action === 'CHECKLIST') categoryCount['OPERACIONAL']++;
      else if (action.includes('USER') || action.includes('PARAMS') || action.includes('DB')) categoryCount['ADMINISTRATIVO']++;
      else categoryCount['FROTA']++;
      
      userCount[userName] = (userCount[userName] || 0) + 1;
    });

    const pieData = [
      { name: 'Acessos', value: categoryCount['ACESSO'], color: '#3b82f6' },
      { name: 'Operações', value: categoryCount['OPERACIONAL'], color: '#10b981' },
      { name: 'Gestão', value: categoryCount['ADMINISTRATIVO'], color: '#a855f7' },
      { name: 'Frota', value: categoryCount['FROTA'], color: '#f43f5e' },
    ].filter(d => d.value > 0);

    const barData = Object.entries(userCount)
      .map(([name, count]) => ({ name: name.split(' ')[0], full: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { pieData, barData };
  }, [safeLogs]);

  // BLOQUEIO DE SEGURANÇA: Restrito ao Super Usuário Master.
  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
        <div className="text-4xl mb-4">🔐</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito à Auditoria</h3>
        <p className="text-slate-500 font-bold mt-2">Esta tela é exclusiva para monitoramento técnico do Super Usuário.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER: COMANDO E STATUS DO BANCO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/5">🛡️</div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter leading-none">Console de Auditoria</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
                {isSyncing ? 'ATUALIZANDO BANCO...' : `BANCO SINCRONIZADO • ${safeLogs.length} EVENTOS`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 relative z-10">
            {/* REGRA: Botão de Sincronização em tempo real */}
            <button 
                onClick={handleRefresh} 
                disabled={isSyncing}
                className={`px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase border border-white/10 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${isSyncing ? 'ring-2 ring-amber-500/50' : ''}`}
            >
              {isSyncing ? '🔄 Sincronizando...' : '📥 Sincronizar Logs'}
            </button>
            <button onClick={() => generateAuditLogPDF(filteredLogs)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Relatório PDF</button>
        </div>
      </div>

      {/* NAVEGAÇÃO INTERNA */}
      <div className="flex flex-wrap p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm gap-1">
         <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Linha do Tempo</button>
         <button onClick={() => setViewMode('intelligence')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'intelligence' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Estatísticas</button>
         <button onClick={() => setViewMode('raw')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'raw' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Dados Brutos (DB)</button>
      </div>

      {/* ABA: DADOS BRUTOS (PARA CONFERÊNCIA FIEL AO BANCO) */}
      {viewMode === 'raw' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
           <div className="mb-4 border-b border-slate-100 pb-3 flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tighter">Exploração de Dados Brutos (Fiel à Planilha)</h4>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">TABELA: AuditoriaConferenciaMat</span>
           </div>
           <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-left font-mono">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr className="text-[8px] text-slate-500 uppercase font-black">
                   <th className="px-4 py-3 border-r">ID</th>
                   <th className="px-4 py-3 border-r">TIMESTAMP</th>
                   <th className="px-4 py-3 border-r">USER_ID</th>
                   <th className="px-4 py-3 border-r">USER_NAME</th>
                   <th className="px-4 py-3 border-r">ACTION</th>
                   <th className="px-4 py-3">DETAILS</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 text-[9px]">
                 {safeLogs.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="p-16 text-center text-slate-300 font-bold uppercase tracking-[0.2em]">
                        {isSyncing ? 'Buscando registros remotos...' : "Base vazia ou desconectada. Clique em 'Sincronizar Logs'."}
                     </td>
                   </tr>
                 ) : safeLogs.map((log, index) => (
                   <tr key={log.id || index} className="hover:bg-slate-50">
                     <td className="px-4 py-2 border-r whitespace-nowrap">{log.id}</td>
                     <td className="px-4 py-2 border-r whitespace-nowrap">{log.timestamp}</td>
                     <td className="px-4 py-2 border-r whitespace-nowrap">{log.userId}</td>
                     <td className="px-4 py-2 border-r whitespace-nowrap font-bold">{log.userName}</td>
                     <td className="px-4 py-2 border-r whitespace-nowrap">{log.action}</td>
                     <td className="px-4 py-2 break-words text-slate-500">{log.details}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* ABA: LINHA DO TEMPO (TRATADA) */}
      {viewMode === 'list' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="relative flex-1">
                <input 
                    type="text" 
                    placeholder="Filtrar por Responsável..." 
                    value={filterUser} 
                    onChange={e => setFilterUser(e.target.value)} 
                    className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-slate-200 font-bold text-xs outline-none focus:ring-4 focus:ring-blue-50 transition-all bg-white" 
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">👤</span>
            </div>
            <select 
                value={filterAction} 
                onChange={e => setFilterAction(e.target.value)} 
                className="px-4 py-2.5 rounded-2xl border border-slate-200 font-bold text-xs outline-none bg-white flex-1 cursor-pointer transition-all hover:border-blue-300"
            >
                <option value="">TODAS AS AÇÕES</option>
                {Array.from(new Set(safeLogs.map(l => l.action).filter(Boolean))).sort().map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalhes da Operação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase text-xs tracking-[0.2em]">
                        {isSyncing ? 'Sincronizando registros remotos...' : 'Nenhum registro localizado no banco.'}
                    </td>
                  </tr>
                ) : filteredLogs.map(log => {
                    const isCritical = ['DEL_VTR', 'DEL_USER', 'CLEAR_ALL', 'FORMATAR'].includes(log.action);
                    return (
                        <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${isCritical ? 'bg-red-50/30' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <p className="text-xs font-black text-slate-700">{log.timestamp ? new Date(log.timestamp).toLocaleDateString('pt-BR') : '-'}</p>
                                <p className="text-[9px] font-bold text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR') : '-'}</p>
                            </td>
                            <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-800 uppercase">{log.userName || 'Sistema'}</p>
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">ID: {log.userId?.slice(0, 8) || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[8px] px-2 py-1 rounded-lg font-black uppercase border transition-all ${
                                    isCritical ? 'bg-red-600 text-white border-red-600 shadow-md' : 
                                    log.action === 'LOGIN' ? 'bg-green-100 text-green-700 border-green-200' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    {log.action || 'INFO'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-[10px] text-slate-600 font-semibold max-w-md break-words">
                                {log.details || '-'}
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: ANÁLISE ESTATÍSTICA (GRÁFICOS) */}
      {viewMode === 'intelligence' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-8 tracking-widest text-center">Natureza das Atividades</h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={intelligenceData.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {intelligenceData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-8 tracking-widest text-center">Operadores mais Ativos</h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={intelligenceData.barData} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 9, fontWeight: "bold"}} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogManager;
