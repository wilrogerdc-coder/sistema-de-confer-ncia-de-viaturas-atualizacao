
import React, { useState, useMemo, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { User, UserRole, Viatura, Posto, Subgrupamento, GB, InventoryCheck, LogEntry } from '../types';
import { generateMaterialAuditPDF } from '../utils/pdfGenerator';

interface DatabaseManagerProps {
  currentUser: User;
  viaturas: Viatura[];
  checks: InventoryCheck[];
  users: User[];
  logs: LogEntry[];
  postos: Posto[];
  subs: Subgrupamento[];
  gbs: GB[];
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({ 
  currentUser, viaturas, checks, users, logs, postos, subs, gbs 
}) => {
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; latency?: number; error?: string }>({ loading: false });
  const [clearLoading, setClearLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  
  const [operationalUrl, setOperationalUrl] = useState('');
  const [auditUrl, setAuditUrl] = useState('');
  const [configChanged, setConfigChanged] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const config = DataService.getConfig();
    setOperationalUrl(config.operationalUrl || '');
    setAuditUrl(config.auditUrl || '');
  }, []);

  const auditResults = useMemo(() => {
    if (!searchTerm.trim() || !Array.isArray(viaturas) || viaturas.length === 0) return [];
    
    const results: any[] = [];
    const lowerSearch = searchTerm.toLowerCase();

    viaturas.forEach(vtr => {
      if (!vtr || !Array.isArray(vtr.items)) return;
      vtr.items.forEach(item => {
        if (!item) return;
        const name = item.name || '';
        const spec = item.specification || '';
        if (name.toLowerCase().includes(lowerSearch) || spec.toLowerCase().includes(lowerSearch)) {
          const posto = Array.isArray(postos) ? postos.find(p => p.id === vtr.postoId) : null;
          const sub = Array.isArray(subs) ? subs.find(s => s.id === posto?.subId) : null;
          const gb = Array.isArray(gbs) ? gbs.find(g => g.id === sub?.gbId) : null;

          results.push({
            id: `${vtr.id}-${item.id}`,
            name: name,
            spec: spec,
            qty: item.quantity || 0,
            vtrPrefix: vtr.prefix || '?',
            compartment: item.compartment || 'GERAL',
            posto: posto?.name || 'Não vinculado',
            sgb: sub?.name || '-',
            gb: gb?.name || '-'
          });
        }
      });
    });
    return results;
  }, [searchTerm, viaturas, postos, subs, gbs]);

  const auditStats = useMemo(() => {
    const totalQty = auditResults.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    const uniqueVtrs = new Set(auditResults.map(r => r.vtrPrefix)).size;
    return { totalQty, uniqueVtrs };
  }, [auditResults]);

  const handleTestConnection = async (type: 'OPS' | 'AUDIT') => {
    const url = type === 'OPS' ? operationalUrl : auditUrl;
    setTestStatus({ loading: true });
    const result = await DataService.testConnection(url);
    setTestStatus({ loading: false, success: result.success, latency: result.latency, error: result.error });
  };

  const handleSaveConfig = () => {
    if (!operationalUrl) {
        alert("A URL do Banco Operacional é obrigatória.");
        return;
    }
    DataService.saveConfig(operationalUrl, auditUrl || operationalUrl);
    setConfigChanged(false);
    alert("Configurações salvas com sucesso!");
    window.location.reload();
  };

  const handleBackupData = async () => {
    setBackupLoading(true);
    try {
        const data = await DataService.fetchAllData(true);
        const fileName = `Backup_SiscoV_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.body.appendChild(document.createElement('a'));
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        document.body.removeChild(link);
    } catch (e) { alert("Erro ao gerar backup."); } finally { setBackupLoading(false); }
  };

  const handleClearDatabase = async () => {
    const confirmation = prompt("⚠️ PERIGO: ISSO APAGARÁ TUDO!\n\nDigite 'DELETAR TUDO' para confirmar:");
    if (confirmation?.trim().toUpperCase() !== 'DELETAR TUDO') return;
    setClearLoading(true);
    try {
      await DataService.clearDatabase();
      alert("Banco resetado com sucesso!");
      window.location.reload();
    } catch (e) { alert("Erro ao limpar banco."); } finally { setClearLoading(false); }
  };

  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 mt-8 animate-in fade-in duration-500">
        <div className="text-4xl mb-4 grayscale opacity-50">🔐</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h3>
        <p className="text-slate-500 font-bold mt-2">Área exclusiva para configuração técnica pelo Super Usuário.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">📡</span>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase leading-tight">Data Center</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle Cloud do Sistema</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10 text-center">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Viaturas</p>
                        <p className="text-2xl font-black">{Array.isArray(viaturas) ? viaturas.length : 0}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10 text-center">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Histórico</p>
                        <p className="text-2xl font-black">{Array.isArray(checks) ? checks.length : 0}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10 text-center">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Membros</p>
                        <p className="text-2xl font-black">{Array.isArray(users) ? users.length : 0}</p>
                    </div>
                </div>
            </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">Status da API</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Diagnóstico de Rede</p>
            </div>
            <div className="flex flex-col items-center justify-center py-6">
                {testStatus.loading ? (
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                ) : testStatus.success ? (
                    <div className="text-center animate-in zoom-in">
                        <div className="text-4xl mb-2">🟢</div>
                        <p className="text-2xl font-black text-slate-800">{testStatus.latency}ms</p>
                        <p className="text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-1 rounded-full mt-2">Conexão Estável</p>
                    </div>
                ) : (
                    <div className="text-center opacity-40">
                        <div className="text-4xl mb-2">⚪</div>
                        <p className="text-xs font-bold uppercase">Aguardando Teste</p>
                    </div>
                )}
            </div>
            <button onClick={() => handleTestConnection('OPS')} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-colors">Testar Conexão</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
         <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">🔗 Parametrização de Bancos</h3>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Banco Operacional</label>
               <input type="text" value={operationalUrl} onChange={e => { setOperationalUrl(e.target.value); setConfigChanged(true); }} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:ring-4 focus:ring-blue-50 transition-all" />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Banco de Auditoria</label>
               <input type="text" value={auditUrl} onChange={e => { setAuditUrl(e.target.value); setConfigChanged(true); }} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:ring-4 focus:ring-purple-50 transition-all" />
            </div>
         </div>
         {configChanged && (
            <div className="flex justify-end pt-4 animate-in slide-in-from-right">
                <button onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg transition-all">Salvar Configurações</button>
            </div>
         )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">🔎 Auditoria de Materiais Global</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Busca baseada nas informações do banco de dados operacional carregado</p>
        </div>
        <div className="p-8 space-y-6">
            <div className="relative group">
                <input type="text" placeholder="Pesquisar material em toda a frota..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-6 py-5 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold text-lg text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner" />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl opacity-30 group-focus-within:opacity-100">🔍</span>
            </div>
            
            {auditResults.length > 0 ? (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4"><p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Itens</p><p className="text-3xl font-black text-blue-900">{auditResults.length}</p></div>
                        <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4"><p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Qtd. Total</p><p className="text-3xl font-black text-indigo-900">{auditStats.totalQty}</p></div>
                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4"><p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Vtrs</p><p className="text-3xl font-black text-emerald-900">{auditStats.uniqueVtrs}</p></div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => generateMaterialAuditPDF(auditResults, searchTerm, true)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">Visualizar PDF</button>
                        <button onClick={() => generateMaterialAuditPDF(auditResults, searchTerm)} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-slate-900">Baixar Relatório</button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 border-b border-slate-200">
                                <tr><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Material / Especificação</th><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 text-center">Qtd</th><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Viatura / Local</th><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Unidade Vinculada</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {auditResults.map(res => (
                                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4"><p className="text-sm font-bold text-slate-800">{res.name}</p><p className="text-[10px] font-semibold text-slate-400">{res.spec}</p></td>
                                        <td className="px-6 py-4 text-center"><span className="inline-flex items-center justify-center w-8 h-6 bg-slate-900 text-white text-xs font-bold rounded-lg">{res.qty}</span></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded uppercase border border-red-200">{res.vtrPrefix}</span><span className="text-xs font-bold text-slate-600">{res.compartment}</span></div></td>
                                        <td className="px-6 py-4"><p className="text-xs font-bold text-slate-700">{res.posto}</p><p className="text-[9px] text-slate-400 uppercase font-semibold">{res.sgb}</p></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : searchTerm.trim() ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    Nenhum material correspondente encontrado na frota.
                </div>
            ) : (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs">
                    Digite o nome de um material para auditar sua distribuição.
                </div>
            )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
               <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Backup Local</h4>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">Baixe uma cópia JSON instantânea de todos os dados carregados no navegador para segurança e auditoria externa.</p>
               <button onClick={handleBackupData} disabled={backupLoading} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase shadow-lg transition-all">📥 Baixar Backup JSON</button>
           </div>
           <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 space-y-4">
               <h4 className="text-lg font-black text-red-800 uppercase tracking-tight">Zona de Perigo</h4>
               <p className="text-xs text-red-700/70 font-bold leading-relaxed">Apagar permanentemente todos os registros do banco de dados na nuvem. Esta ação não pode ser desfeita.</p>
               <button onClick={handleClearDatabase} disabled={clearLoading} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase shadow-xl shadow-red-200 mt-4 transition-all">⚠️ FORMATAR BANCO DE DADOS</button>
           </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
