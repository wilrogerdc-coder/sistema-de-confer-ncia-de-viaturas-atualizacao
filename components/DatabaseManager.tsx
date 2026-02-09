
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
  
  // Configuração de URLs
  const [operationalUrl, setOperationalUrl] = useState('');
  const [auditUrl, setAuditUrl] = useState('');
  const [configChanged, setConfigChanged] = useState(false);
  const [auditTestStatus, setAuditTestStatus] = useState<{ loading: boolean; success?: boolean; error?: string } | null>(null);

  // Estados para Auditoria de Materiais
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
      console.error("Erro ao carregar auditoria", e);
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

  // Estatísticas da busca atual
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

  const handleSaveConfig = () => {
    if (!operationalUrl) {
        alert("A URL do Banco Operacional é obrigatória.");
        return;
    }
    DataService.saveConfig(operationalUrl, auditUrl || operationalUrl);
    setConfigChanged(false);
    alert("Configurações de conexão salvas com sucesso!");
    window.location.reload(); // Recarrega para aplicar novos serviços
  };

  const handleBackupData = async () => {
    setBackupLoading(true);
    try {
        const data = await DataService.fetchAllData(true);
        const fileName = `Backup_Completo_SiscoV_${new Date().toISOString().split('T')[0]}.json`;
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        alert("Erro ao gerar backup.");
    } finally {
        setBackupLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    const confirmation = prompt("⚠️ PERIGO: ISSO APAGARÁ TODOS OS DADOS DA PLANILHA!\n\nRecomendamos fazer o BACKUP JSON antes.\n\nPara confirmar, digite 'DELETAR TUDO' abaixo:");
    if (confirmation?.trim().toUpperCase() !== 'DELETAR TUDO') {
      alert("Ação cancelada.");
      return;
    }
    setClearLoading(true);
    try {
      await DataService.clearDatabase();
      alert("Banco de dados resetado com sucesso!");
      window.location.reload();
    } catch (e) {
      alert("Erro ao tentar limpar o banco.");
    } finally {
      setClearLoading(false);
    }
  };

  const safeReport = (fn: Function, ...args: any[]) => {
    try {
      fn(...args);
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao gerar PDF: ${e.message}`);
    }
  };

  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
        <div className="text-4xl mb-4 grayscale opacity-50">🔐</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h3>
        <p className="text-slate-500 font-bold mt-2">Área exclusiva do Super Usuário.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header e Status de Conexão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Principal de Título */}
        <div className="lg:col-span-2 bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">📡</span>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter">Data Center</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel de Controle Cloud</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Viaturas</p>
                        <p className="text-2xl font-black">{viaturasCount}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Checklists</p>
                        <p className="text-2xl font-black">{checksCount}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Usuários</p>
                        <p className="text-2xl font-black">{usersCount}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Card de Diagnóstico de Rede */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">Status da API</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Latência do Google Apps Script</p>
            </div>
            
            <div className="flex flex-col items-center justify-center py-6">
                {testStatus.loading ? (
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                ) : testStatus.success ? (
                    <div className="text-center">
                        <div className="text-4xl mb-2">🟢</div>
                        <p className="text-2xl font-black text-slate-800">{testStatus.latency}ms</p>
                        <p className="text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-1 rounded-full mt-2">Conexão Estável</p>
                    </div>
                ) : testStatus.error ? (
                     <div className="text-center">
                        <div className="text-4xl mb-2">🔴</div>
                        <p className="text-xs font-black text-red-600 uppercase">{testStatus.error}</p>
                    </div>
                ) : (
                    <div className="text-center opacity-40">
                        <div className="text-4xl mb-2">⚪</div>
                        <p className="text-xs font-bold uppercase">Aguardando Teste</p>
                    </div>
                )}
            </div>

            <button onClick={() => handleTestConnection('OPS')} disabled={testStatus.loading} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-colors">
                {testStatus.loading ? 'Pingando...' : 'Testar Conexão'}
            </button>
        </div>
      </div>

      {/* Configuração de Conexões */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
         <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
               🔗 Parametrização de Bancos de Dados
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1">Configure os endpoints para separação de dados operacionais e logs de auditoria.</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Banco Operacional */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Banco Operacional (Principal)</label>
                  <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">Viaturas, Usuários, Checklists</span>
               </div>
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={operationalUrl} 
                    onChange={e => { setOperationalUrl(e.target.value); setConfigChanged(true); }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 outline-none focus:border-blue-500"
                  />
                  <button onClick={() => handleTestConnection('OPS')} className="px-4 bg-slate-100 rounded-xl text-lg hover:bg-blue-100 transition-colors" title="Testar Operacional">⚡</button>
               </div>
            </div>

            {/* Banco Auditoria */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Banco de Auditoria (Logs)</label>
                  <span className="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-bold">Logs de Acesso, Histórico</span>
               </div>
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={auditUrl} 
                    onChange={e => { setAuditUrl(e.target.value); setConfigChanged(true); }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 outline-none focus:border-purple-500"
                  />
                  <button onClick={() => handleTestConnection('AUDIT')} className="px-4 bg-slate-100 rounded-xl text-lg hover:bg-purple-100 transition-colors" title="Testar Auditoria">
                    {auditTestStatus?.loading ? '...' : (auditTestStatus?.success ? '✅' : (auditTestStatus?.error ? '❌' : '⚡'))}
                  </button>
               </div>
            </div>
         </div>

         {configChanged && (
            <div className="flex justify-end pt-4 animate-in fade-in">
               <button onClick={handleSaveConfig} className="bg-green-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-green-700 transition-all">
                  Salvar Configurações
               </button>
            </div>
         )}

         {/* Instruções */}
         <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h4 className="text-sm font-black text-slate-700 uppercase mb-4">📖 Instruções de Implementação dos 2 Bancos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed font-medium">
               <div>
                  <strong className="block text-blue-700 mb-1">Passo 1: Banco Operacional</strong>
                  <p className="mb-2">Mantenha a planilha original. Ela armazenará as abas: <code>GBS, SUBS, POSTOS, VIATURAS, CHECKS, USERS, SETTINGS</code>.</p>
                  <p>O Script deve conter as funções <code>doGet</code> e <code>doPost</code> padrão para manipular estes dados.</p>
               </div>
               <div>
                  <strong className="block text-purple-700 mb-1">Passo 2: Banco de Auditoria</strong>
                  <p className="mb-2">Crie uma <strong>nova planilha</strong> Google separada. Crie uma aba chamada <code>LOGS</code>.</p>
                  <p>Implemente um Script App nesta nova planilha que aceite requisições <code>type="LOG"</code> no <code>doPost</code> e retorne os logs no <code>doGet</code>.</p>
               </div>
               <div className="md:col-span-2 bg-white p-3 rounded-xl border border-slate-200 mt-2">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Nota Técnica:</p>
                  <p>Se a URL de Auditoria for deixada em branco ou for igual à Operacional, o sistema funcionará em modo "Banco Único", salvando tudo na planilha principal.</p>
               </div>
            </div>
         </div>
      </div>

      {/* Auditoria Global */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                        🔎 Auditoria de Materiais
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Busca em tempo real em toda a frota</p>
                </div>
                
                {!auditLoaded ? (
                    <button onClick={loadAuditData} disabled={isLoadingAudit} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-200 hover:scale-105 transition-transform">
                        {isLoadingAudit ? 'Sincronizando Inventário...' : 'Carregar Inventário Global'}
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-bold text-green-600 uppercase">Inventário Sincronizado</span>
                    </div>
                )}
            </div>
        </div>

        {auditLoaded && (
            <div className="p-8 space-y-6">
                <div className="relative group">
                    <input 
                    type="text" 
                    placeholder="Digite o nome do material (ex: mangueira, desencarcerador...)" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-6 py-5 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold text-lg text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-all"
                    autoFocus
                    />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl opacity-30 group-focus-within:opacity-100 group-focus-within:text-blue-500 transition-all">🔍</span>
                </div>

                {auditResults.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">📊</div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Registros</p>
                                    <p className="text-3xl font-black text-blue-900">{auditResults.length}</p>
                                </div>
                            </div>
                            <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">∑</div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Qtd. Total</p>
                                    <p className="text-3xl font-black text-indigo-900">{auditStats.totalQty}</p>
                                </div>
                            </div>
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🚒</div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Viaturas</p>
                                    <p className="text-3xl font-black text-emerald-900">{auditStats.uniqueVtrs}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button onClick={() => safeReport(generateMaterialAuditPDF, auditResults, searchTerm, true)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-colors">Visualizar PDF</button>
                            <button onClick={() => safeReport(generateMaterialAuditPDF, auditResults, searchTerm)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-colors">Baixar Relatório</button>
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Material / Espec.</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">Qtd</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Localização</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">Unidade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {auditResults.map(res => (
                                        <tr key={res.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{res.name}</p>
                                                {res.spec && <p className="text-[10px] font-semibold text-slate-400">{res.spec}</p>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-6 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm">{res.qty}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded uppercase border border-red-200">{res.vtrPrefix}</span>
                                                    <span className="text-xs font-bold text-slate-600">{res.compartment}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-700">{res.posto}</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-semibold">{res.sgb}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {searchTerm.trim() !== '' && auditResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                        <span className="text-5xl mb-2 opacity-50">🔍</span>
                        <p className="text-sm font-bold uppercase">Nenhum resultado encontrado</p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Zona de Perigo e Manutenção */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Backup */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
               <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">💾</div>
                   <div>
                       <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Backup Local</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Segurança de Dados</p>
                   </div>
               </div>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">
                   Baixe uma cópia completa de todos os dados (Viaturas, Checklists, Usuários, Logs) em formato JSON. Recomendado antes de realizar limpezas.
               </p>
               <button onClick={handleBackupData} disabled={backupLoading} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase shadow-lg transition-all flex items-center justify-center gap-2">
                   {backupLoading ? 'Gerando Arquivo...' : (
                       <>
                        <span>📥</span> Baixar Backup Completo (.JSON)
                       </>
                   )}
               </button>
           </div>

           {/* Reset */}
           <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 space-y-4 relative overflow-hidden">
               <div className="absolute -right-4 -top-4 text-9xl opacity-5 text-red-900">⚠️</div>
               <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-200 text-red-700 rounded-xl flex items-center justify-center text-xl">🗑️</div>
                        <div>
                            <h4 className="text-lg font-black text-red-800 uppercase tracking-tight">Zona de Perigo</h4>
                            <p className="text-[10px] font-bold text-red-400 uppercase">Limpeza de Sistema</p>
                        </div>
                    </div>
                    <p className="text-xs text-red-700/70 font-bold leading-relaxed">
                        Esta ação irá apagar permanentemente todos os registros da planilha na nuvem e limpar o cache local. Esta ação é irreversível.
                    </p>
                    <button onClick={handleClearDatabase} disabled={clearLoading} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase shadow-xl shadow-red-200 mt-4 transition-all">
                        {clearLoading ? 'Apagando tudo...' : '⚠️ FORMATAR BANCO DE DADOS'}
                    </button>
               </div>
           </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
