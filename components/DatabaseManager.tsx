import React, { useState, useMemo, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { User, UserRole, Viatura, Posto, Subgrupamento, GB } from '../types';

interface DatabaseManagerProps {
  currentUser: User;
  viaturasCount: number;
  checksCount: number;
  usersCount: number;
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({ currentUser, viaturasCount, checksCount, usersCount }) => {
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; latency?: number; error?: string }>({ loading: false });
  const [auditTestStatus, setAuditTestStatus] = useState<{ loading: boolean; success?: boolean; latency?: number; error?: string }>({ loading: false });
  const [clearLoading, setClearLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  
  const [operationalUrl, setOperationalUrl] = useState('');
  const [auditUrl, setAuditUrl] = useState('');
  const [configChanged, setConfigChanged] = useState(false);

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

  const handleTestConnection = async (type: 'OPS' | 'AUDIT') => {
    if (type === 'OPS') {
        setTestStatus({ loading: true });
        const result = await DataService.testConnection(operationalUrl);
        setTestStatus({ loading: false, success: result.success, latency: result.latency, error: result.error });
    } else {
        setAuditTestStatus({ loading: true });
        const result = await DataService.testConnection(auditUrl);
        setAuditTestStatus({ loading: false, success: result.success, latency: result.latency, error: result.error });
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">📡</span>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">Data Center</h2>
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

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-800 uppercase border-b border-slate-50 pb-2">Diagnóstico de Rede</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banco Operacional</p>
                        <div className="flex items-center gap-2 mt-1">
                            {testStatus.loading ? (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : testStatus.success ? (
                                <span className="text-green-600 font-black text-sm">ON • {testStatus.latency}ms</span>
                            ) : testStatus.error ? (
                                <span className="text-red-500 font-bold text-[10px]">OFF • ERRO</span>
                            ) : (
                                <span className="text-slate-300 font-bold text-sm">AGUARDANDO...</span>
                            )}
                        </div>
                    </div>
                    <button onClick={() => handleTestConnection('OPS')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Testar</button>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banco Auditoria</p>
                        <div className="flex items-center gap-2 mt-1">
                            {auditTestStatus.loading ? (
                                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : auditTestStatus.success ? (
                                <span className="text-purple-600 font-black text-sm">ON • {auditTestStatus.latency}ms</span>
                            ) : auditTestStatus.error ? (
                                <span className="text-red-500 font-bold text-[10px]">OFF • ERRO</span>
                            ) : (
                                <span className="text-slate-300 font-bold text-sm">AGUARDANDO...</span>
                            )}
                        </div>
                    </div>
                    <button onClick={() => handleTestConnection('AUDIT')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Testar</button>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
         <h3 className="text-xl font-black text-slate-800 uppercase">🔗 Configuração de Endpoints</h3>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-slate-500">URL Banco Operacional</label>
               <input type="text" value={operationalUrl} onChange={e => { setOperationalUrl(e.target.value); setConfigChanged(true); }} className="w-full px-4 py-4 rounded-2xl border border-slate-200 text-xs font-mono" />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-slate-500">URL Banco Auditoria (Logs)</label>
               <input type="text" value={auditUrl} onChange={e => { setAuditUrl(e.target.value); setConfigChanged(true); }} className="w-full px-4 py-4 rounded-2xl border border-slate-200 text-xs font-mono" />
            </div>
         </div>
         {configChanged && (
            <button onClick={handleSaveConfig} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs">Salvar e Recarregar</button>
         )}
      </div>
      
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-8">
         <h3 className="text-xl font-black text-slate-800 uppercase mb-4">🔎 Auditoria de Materiais</h3>
         <div className="flex gap-4 mb-6">
            <input type="text" placeholder="Pesquisar item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 px-6 py-4 rounded-2xl border border-slate-200" />
            {!auditLoaded && <button onClick={loadAuditData} className="bg-blue-600 text-white px-8 py-2 rounded-2xl font-black uppercase text-xs">Carregar Dados</button>}
         </div>
         {auditResults.length > 0 && (
            <div className="overflow-x-auto">
               <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50">
                     <tr>
                        <th className="px-6 py-4 font-black uppercase">Material</th>
                        <th className="px-6 py-4 font-black uppercase">Qtd</th>
                        <th className="px-6 py-4 font-black uppercase">Localização</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {auditResults.map(res => (
                        <tr key={res.id}>
                           <td className="px-6 py-4"><p className="font-bold">{res.name}</p></td>
                           <td className="px-6 py-4"><span>{res.qty}</span></td>
                           <td className="px-6 py-4"><p>{res.vtrPrefix} ({res.posto})</p></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <button onClick={handleBackupData} className="p-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xs">📥 Baixar Backup JSON</button>
           <button onClick={handleClearDatabase} className="p-8 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-xs">⚠️ FORMATAR BANCO DE DADOS</button>
      </div>
    </div>
  );
};

export default DatabaseManager;
