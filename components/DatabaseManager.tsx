
import React, { useState, useMemo, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { User, UserRole, Viatura, Posto, Subgrupamento, GB } from '../types';
import { generateMaterialAuditPDF } from '../utils/pdfGenerator';

interface DatabaseManagerProps {
  currentUser: User;
  viaturasCount: number;
  checksCount: number;
  usersCount: number;
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({ currentUser, viaturasCount, checksCount, usersCount }) => {
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; latency?: number; error?: string }>({ loading: false });
  const [clearLoading, setClearLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  
  const [operationalUrl, setOperationalUrl] = useState('');
  const [auditUrl, setAuditUrl] = useState('');
  const [configChanged, setConfigChanged] = useState(false);
  const [auditTestStatus, setAuditTestStatus] = useState<{ loading: boolean; success?: boolean; error?: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [subs, setSubs] = useState<Subgrupamento[]>([]);
  const [gbs, setGbs] = useState<GB[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);

  useEffect(() => {
    const config = DataService.getConfig();
    setOperationalUrl(config.operationalUrl);
    setAuditUrl(config.auditUrl);
  }, []);

  const loadAuditData = async () => {
    setIsLoadingAudit(true);
    try {
      const [vtrs, p, s, g] = await Promise.all([
        DataService.getViaturas(),
        DataService.getPostos(),
        DataService.getSubs(),
        DataService.getGBS()
      ]);
      setViaturas(vtrs);
      setPostos(p);
      setSubs(s);
      setGbs(g);
      setAuditLoaded(true);
    } catch (e) {
      alert("Erro ao sincronizar dados da nuvem.");
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const auditResults = useMemo(() => {
    if (!searchTerm.trim() || viaturas.length === 0) return [];
    const results: any[] = [];
    const lowerSearch = searchTerm.toLowerCase();

    viaturas.forEach(vtr => {
      vtr.items.forEach(item => {
        if (item.name.toLowerCase().includes(lowerSearch) || item.specification.toLowerCase().includes(lowerSearch)) {
          const posto = postos.find(p => p.id === vtr.postoId);
          const sub = subs.find(s => s.id === posto?.subId);
          const gb = gbs.find(g => g.id === sub?.gbId);

          results.push({
            id: `${vtr.id}-${item.id}`,
            name: item.name,
            spec: item.specification,
            qty: item.quantity,
            vtrPrefix: vtr.prefix,
            compartment: item.compartment,
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
    if (type === 'OPS') {
        setTestStatus({ loading: true });
        const result = await DataService.testConnection(operationalUrl);
        setTestStatus({ loading: false, success: result.success, latency: result.latency, error: result.error });
    } else {
        setAuditTestStatus({ loading: true });
        const result = await DataService.testConnection(auditUrl);
        setAuditTestStatus({ loading: false, success: result.success, error: result.error });
    }
  };

  const handleSaveConfig = async () => {
    if (!operationalUrl) {
        alert("A URL do Banco Operacional é obrigatória.");
        return;
    }
    DataService.saveConfig(operationalUrl, auditUrl || operationalUrl);
    
    await DataService.saveLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'UPDATE_DB_CONFIG',
      details: `Configuração de URLs atualizada. OPS: ${operationalUrl.substring(0, 30)}... AUDIT: ${auditUrl.substring(0, 30)}...`
    });

    setConfigChanged(false);
    alert("Configurações de conexão salvas com sucesso!");
    window.location.reload(); 
  };

  const handleBackupData = async () => {
    setBackupLoading(true);
    try {
        const data = await DataService.fetchAllData(true);
        const fileName = `Backup_Completo_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    } catch (e) {
        alert("Erro ao gerar backup.");
    } finally {
        setBackupLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    const confirmation = prompt("⚠️ PERIGO: ISSO APAGARÁ TODOS OS DADOS!\n\nPara confirmar, digite 'DELETAR TUDO' abaixo:");
    if (confirmation?.trim().toUpperCase() !== 'DELETAR TUDO') return;
    
    setClearLoading(true);
    try {
      await DataService.clearDatabase();
      await DataService.saveLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'FORMAT_DB',
        details: 'O usuário realizou a formatação completa do banco de dados na nuvem.'
      });
      alert("Banco de dados resetado!");
      window.location.reload();
    } catch (e) {
      alert("Erro ao tentar limpar o banco.");
    } finally {
      setClearLoading(false);
    }
  };

  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">📡</span>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter">Data Center</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel de Controle Cloud</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Viaturas</p>
                        <p className="text-2xl font-black">{viaturasCount}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Checklists</p>
                        <p className="text-2xl font-black">{checksCount}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Usuários</p>
                        <p className="text-2xl font-black">{usersCount}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-black text-slate-800 uppercase mb-1">Status da API</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-6">
                {testStatus.loading ? (
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                ) : testStatus.success ? (
                    <div className="text-center">
                        <div className="text-4xl mb-2">🟢</div>
                        <p className="text-2xl font-black text-slate-800">{testStatus.latency}ms</p>
                    </div>
                ) : (
                    <div className="text-center opacity-40">
                        <div className="text-4xl mb-2">⚪</div>
                    </div>
                )}
            </div>
            <button onClick={() => handleTestConnection('OPS')} disabled={testStatus.loading} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase">
                {testStatus.loading ? 'Pingando...' : 'Testar Conexão'}
            </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
         <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">🔗 Parametrização de Bancos de Dados</h3>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Banco Operacional</label>
               <div className="flex gap-2">
                  <input type="text" value={operationalUrl} onChange={e => { setOperationalUrl(e.target.value); setConfigChanged(true); }} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono outline-none" />
                  <button onClick={() => handleTestConnection('OPS')} className="px-4 bg-slate-100 rounded-xl">⚡</button>
               </div>
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Banco de Auditoria</label>
               <div className="flex gap-2">
                  <input type="text" value={auditUrl} onChange={e => { setAuditUrl(e.target.value); setConfigChanged(true); }} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono outline-none" />
                  <button onClick={() => handleTestConnection('AUDIT')} className="px-4 bg-slate-100 rounded-xl">⚡</button>
               </div>
            </div>
         </div>

         {configChanged && (
            <div className="flex justify-end pt-4">
               <button onClick={handleSaveConfig} className="bg-green-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs">Salvar Configurações</button>
            </div>
         )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-8">
         <h3 className="text-xl font-black text-slate-800 uppercase mb-4">🔎 Auditoria de Materiais</h3>
         <div className="flex gap-4 mb-6">
            <input type="text" placeholder="Pesquisar material..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none" />
            {!auditLoaded && <button onClick={loadAuditData} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs">Carregar Dados</button>}
         </div>
         {auditResults.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
               <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b">
                     <tr>
                        <th className="px-4 py-2 font-black uppercase text-slate-400">Material</th>
                        <th className="px-4 py-2 font-black uppercase text-slate-400 text-center">Qtd</th>
                        <th className="px-4 py-2 font-black uppercase text-slate-400">Local</th>
                     </tr>
                  </thead>
                  <tbody>
                     {auditResults.map(res => (
                        <tr key={res.id} className="border-b last:border-0">
                           <td className="px-4 py-3 font-bold">{res.name}</td>
                           <td className="px-4 py-3 text-center font-black">{res.qty}</td>
                           <td className="px-4 py-3 text-slate-500 font-medium">{res.vtrPrefix} ({res.posto})</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
               <h4 className="text-lg font-black text-slate-800 uppercase">Backup Local</h4>
               <button onClick={handleBackupData} disabled={backupLoading} className="w-full py-4 bg-slate-800 text-white rounded-xl font-black text-xs uppercase">Baixar Backup (.JSON)</button>
           </div>
           <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 space-y-4">
               <h4 className="text-lg font-black text-red-800 uppercase">Zona de Perigo</h4>
               <button onClick={handleClearDatabase} disabled={clearLoading} className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase">⚠️ FORMATAR BANCO DE DADOS</button>
           </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
