
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Viatura, InventoryCheck, GB, Subgrupamento, Posto, LogEntry, RolePermissions, PermissionKey, Theme, ViaturaStatus } from './types';
import { DataService } from './services/dataService';
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_THEME } from './constants';
import { applyThemeToDocument } from './utils/themeUtils';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Checklist from './components/Checklist';
import InventoryManager from './components/InventoryManager';
import Reports from './components/Reports';
import UserAdmin from './components/UserAdmin';
import HierarchyManager from './components/HierarchyManager';
import DatabaseManager from './components/DatabaseManager';
import LogManager from './components/LogManager';
import ParametersManager from './components/ParametersManager';
import ThemeManager from './components/ThemeManager';
import HelpManual from './components/HelpManual';
import { APP_NAME } from './constants';

const App: React.FC = () => {
  // Estados de Usuário e Navegação
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'30days' | 'all'>('30days');
  
  // Estados de Dados Core
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [gbs, setGbs] = useState<GB[]>([]);
  const [subs, setSubs] = useState<Subgrupamento[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);

  // Inicialização do sistema e tema
  useEffect(() => {
    applyThemeToDocument(DEFAULT_THEME);
    setIsInitializing(true);
    // REGRA: Na carga inicial, FORÇAMOS a sincronização total para garantir que o login 
    // tenha acesso aos dados mais recentes (senhas, permissões, etc) da nuvem.
    // Isso atende à solicitação de carregar dados completos "antes de digitar a senha".
    loadData(true, true);
  }, []);

  // Recarga de dados ao mudar de aba ou login para garantir sincronia e integridade
  useEffect(() => {
    if (user && !isInitializing) {
      loadData(false);
    }
  }, [activeTab, user]);

  /**
   * Carrega todos os dados das planilhas/cloud.
   */
  const loadData = async (initialLoad = false, forceRefresh = false) => {
    if (initialLoad) {
      setIsInitializing(true);
      setLoadError(null);
    } else {
      setIsLoading(true);
    }

    try {
      const force = forceRefresh;
      
      if (forceRefresh) {
        await DataService.syncData();
      }

      const [vtrs, chks, usrs, g, s, p, l, settings] = await Promise.all([
        DataService.getViaturas(force),
        DataService.getChecks(force),
        DataService.getUsers(force),
        DataService.getGBS(force),
        DataService.getSubs(force),
        DataService.getPostos(force),
        DataService.getLogs(force),
        DataService.getSettings(force)
      ]);

      // REGRA: Se os dados essenciais (viaturas ou usuários) vierem nulos, houve falha na sincronização
      if (!vtrs || !usrs) {
        if (initialLoad) {
          setLoadError('Não foi possível estabelecer conexão com o banco de dados. Verifique sua internet e tente novamente.');
          return;
        }
      }

      setViaturas(vtrs || []);
      setChecks(chks || []);
      setUsers(usrs || []);
      setGbs(g || []);
      setSubs(s || []);
      setPostos(p || []);
      setLogs(l || []);
      setRolePermissions(settings.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
      if (settings.activeTheme) applyThemeToDocument(settings.activeTheme);
      setLastSync(DataService.getLastSyncTime());
      setLoadError(null);
    } catch (e) {
      console.error("Erro ao carregar dados", e);
      if (initialLoad) {
        setLoadError('Erro crítico ao carregar informações. Por favor, recarregue a página.');
      }
    } finally {
      if (initialLoad) {
        // Pequeno delay para garantir que o estado do React se estabilize
        setTimeout(() => setIsInitializing(false), 1000);
      } else {
        setIsLoading(false);
      }
    }
  };

  /**
   * REGRA DE PERFORMANCE: Filtra os checklists baseados no período selecionado.
   * Por padrão, exibe apenas os últimos 30 dias para garantir fluidez no carregamento inicial.
   */
  const filteredChecksByPeriod = useMemo(() => {
    if (periodFilter === 'all') return checks;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return checks.filter(c => {
      try {
        const checkDate = new Date(c.timestamp);
        return checkDate >= thirtyDaysAgo;
      } catch (e) {
        return true; // Se a data for inválida, mantém no histórico
      }
    });
  }, [checks, periodFilter]);

  /**
   * Resolve as permissões reais do usuário (Role + Custom).
   */
  const currentUserPermissions = useMemo<PermissionKey[]>(() => {
    if (!user) return [];
    const basePermissions = rolePermissions[user.role] || [];
    const custom = user.customPermissions || [];
    return Array.from(new Set([...basePermissions, ...custom]));
  }, [user, rolePermissions]);

  /**
   * Frota visível para as telas de OPERAÇÃO (Checklist/Dashboard).
   * Respeita o nível de escopo do usuário (Global, GB, SGB ou Posto).
   */
  const visibleViaturas = useMemo(() => {
    if (!user) return [];
    
    // REGRA: Usuários SUPER sempre veem tudo, independente do escopo configurado.
    if (user.role === UserRole.SUPER) return viaturas;

    // Normalização defensiva do nível de escopo
    const level = String(user.scopeLevel || 'GLOBAL').toUpperCase();
    
    if (level === 'GLOBAL') return viaturas;
    
    const filtered = viaturas.filter(v => {
      const vtrPostoId = v.postoId;
      if (!vtrPostoId) return false;
      
      const posto = postos.find(p => String(p.id) === String(vtrPostoId));
      if (!posto) return false;
      
      if (level === 'POSTO') return user.scopeId ? String(posto.id) === String(user.scopeId) : false;
      if (level === 'SGB') return user.scopeId ? String(posto.subId) === String(user.scopeId) : false;
      if (level === 'GB') {
        const sub = subs.find(s => String(s.id) === String(posto.subId));
        return sub && user.scopeId ? String(sub.gbId) === String(user.scopeId) : false;
      }
      return false;
    });

    if (viaturas.length > 0 && filtered.length === 0) {
      console.warn(`[App] Usuário ${user.username} (Nível: ${user.role}, Escopo: ${level}/${user.scopeId || 'NÃO DEFINIDO'}) não possui viaturas visíveis. Verifique se o ID do escopo está correto no cadastro.`);
    }

    return filtered;
  }, [viaturas, user, postos, subs]);

  // Handlers de Login e Logout
  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    // REGRA: Gravando username no campo userId para rastreabilidade em gráficos de auditoria
    DataService.saveLog({ userId: loggedUser.username, userName: loggedUser.name, action: 'LOGIN', details: `Acesso via: ${navigator.platform}` });
    setActiveTab('dashboard');
  };
  
  const handleLogout = () => {
    // REGRA: Gravando username no campo userId conforme solicitação de auditoria
    if (user) DataService.saveLog({ userId: user.username, userName: user.name, action: 'LOGOUT', details: 'Sessão encerrada.' });
    setUser(null);
    setActiveTab('dashboard');
    setIsFullScreen(false);
  };

  // Funções de Persistência (Salvamento de Vtrs, Checks, Usuários e Hierarquia)
  const handleSaveViatura = async (vtr: Viatura) => {
    setIsLoading(true);
    try {
      const oldVtr = viaturas.find(v => v.id === vtr.id);
      await DataService.saveViatura(vtr);
      if (user) {
        if (oldVtr && oldVtr.status !== vtr.status) {
           await DataService.saveLog({ userId: user.username, userName: user.name, action: 'STATUS_VTR', details: `${vtr.prefix}: Status alterado de ${oldVtr.status} para ${vtr.status}` });
        } else {
           await DataService.saveLog({ userId: user.username, userName: user.name, action: 'SAVE_VTR', details: `Configuração da Vtr ${vtr.prefix} atualizada.` });
        }
      }
      await loadData(false, true);
    } catch (e) { alert("Erro ao salvar."); } finally { setIsLoading(false); }
  };

  const handleDeleteViatura = async (id: string) => {
    const vtr = viaturas.find(v => v.id === id);
    setIsLoading(true);
    await DataService.deleteViatura(id);
    if (user) await DataService.saveLog({ userId: user.username, userName: user.name, action: 'DEL_VTR', details: `Vtr removida da frota: ${vtr?.prefix}` });
    await loadData(false, true);
  };

  const handleCompleteCheck = async (check: InventoryCheck) => {
    setIsLoading(true);
    await DataService.saveCheck(check);
    if (user) {
        const vtr = viaturas.find(v => v.id === check.viaturaId);
        await DataService.saveLog({ userId: user.username, userName: user.name, action: 'CHECKLIST', details: `Conferência realizada: ${vtr?.prefix} (Status: ${check.viaturaStatusAtTime})` });
    }
    await loadData(false, true);
    setIsFullScreen(false); 
  };

  const handleSaveUser = async (u: User) => {
    setIsLoading(true);
    await DataService.saveUser(u);
    if (user) await DataService.saveLog({ userId: user.username, userName: user.name, action: 'SAVE_USER', details: `Cadastro/Edição de usuário: ${u.username}` });
    await loadData(false, true);
  };

  const handleDeleteUser = async (id: string) => {
    const u = users.find(usr => usr.id === id);
    if (['Cavalieri', 'admin20gb'].includes(u?.username || '')) return;
    setIsLoading(true);
    await DataService.deleteUser(id);
    if (user) await DataService.saveLog({ userId: user.username, userName: user.name, action: 'DEL_USER', details: `Usuário removido: ${u?.username}` });
    await loadData(false, true);
  };

  const handleSaveGB = async (gb: GB) => { await DataService.saveGB(gb); await loadData(false, true); };
  const handleDeleteGB = async (id: string) => { await DataService.deleteGB(id); await loadData(false, true); };
  const handleSaveSub = async (sub: Subgrupamento) => { await DataService.saveSub(sub); await loadData(false, true); };
  const handleDeleteSub = async (id: string) => { await DataService.deleteSub(id); await loadData(false, true); };
  const handleSavePosto = async (p: Posto) => { await DataService.savePosto(p); await loadData(false, true); };
  const handleDeletePosto = async (id: string) => { await DataService.deletePosto(id); await loadData(false, true); };

  // Tela de carregamento inicial
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700 p-6" style={{ backgroundColor: 'var(--theme-secondary)' }}>
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(255,255,255,0.2)] animate-pulse" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>🚒</div>
        </div>
        <div className="text-center space-y-4 max-w-md w-full">
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase">{APP_NAME}</h1>
          <p className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] animate-pulse">Sincronizando Cloud Master...</p>
          
          {loadError && (
            <div className="bg-red-500/20 border border-red-500/50 p-6 rounded-2xl text-center animate-in zoom-in">
              <p className="text-red-200 text-sm font-bold mb-4">{loadError}</p>
              <button 
                onClick={() => loadData(true, true)}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase text-xs transition-all shadow-lg"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
        <div className="mt-12 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
          CAVALIERI - 2026 v1.3.9
        </div>
      </div>
    );
  }

  // Se não houver usuário logado, exibe tela de Login
  if (!user) return (
    <Login 
      onLogin={handleLogin} 
      users={users} 
      onSync={() => loadData(false, true)} 
      isSyncing={isLoading} 
    />
  );

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onSync={() => loadData(false, true)}
      isSyncing={isLoading}
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isFullScreen={isFullScreen} 
      permissions={currentUserPermissions} 
      gbs={gbs} 
      subs={subs} 
      postos={postos}
      lastSync={lastSync}
    >
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 z-[100] overflow-hidden bg-slate-100">
          <div className="h-full animate-[loading_2s_ease-in-out_infinite]" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
        </div>
      )}
      
      {/* Roteamento de Abas */}
      {activeTab === 'dashboard' && currentUserPermissions.includes('view_dashboard') && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={() => setPeriodFilter('30days')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${periodFilter === '30days' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>Últimos 30 Dias</button>
              <button onClick={() => setPeriodFilter('all')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${periodFilter === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>Todo o Período</button>
            </div>
          </div>
          <Dashboard viaturas={visibleViaturas} checks={filteredChecksByPeriod} postos={postos} subs={subs} gbs={gbs} logs={logs} currentUser={user} />
        </div>
      )}
      
      {activeTab === 'checklist' && currentUserPermissions.includes('perform_checklist') && <Checklist viaturas={visibleViaturas} checks={filteredChecksByPeriod} onComplete={handleCompleteCheck} onFullScreenChange={setIsFullScreen} postos={postos} subs={subs} gbs={gbs} />}
      
      {activeTab === 'inventory' && currentUserPermissions.includes('manage_fleet') && <InventoryManager viaturas={visibleViaturas} checks={filteredChecksByPeriod} postos={postos} onSaveViatura={handleSaveViatura} onDeleteViatura={handleDeleteViatura} currentUser={user} />}
      
      {activeTab === 'reports' && currentUserPermissions.includes('view_reports') && <Reports checks={filteredChecksByPeriod} viaturas={viaturas} currentUser={user} postos={postos} />}
      
      {activeTab === 'users' && currentUserPermissions.includes('manage_users') && <UserAdmin users={users} gbs={gbs} subs={subs} postos={postos} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} currentUser={user} />}
      
      {activeTab === 'hierarchy' && currentUserPermissions.includes('manage_hierarchy') && <HierarchyManager gbs={gbs} subs={subs} postos={postos} onSaveGB={handleSaveGB} onDeleteGB={handleDeleteGB} onSaveSub={handleSaveSub} onDeleteSub={handleDeleteSub} onSavePosto={handleSavePosto} onDeletePosto={handleDeletePosto} />}
      
      {activeTab === 'logs' && currentUserPermissions.includes('view_audit_logs') && <LogManager logs={logs} currentUser={user} onRefresh={() => loadData(false, true)} />}
      
      {activeTab === 'params' && currentUserPermissions.includes('manage_parameters') && <ParametersManager currentUser={user} />}
      
      {activeTab === 'themes' && currentUserPermissions.includes('manage_themes') && <ThemeManager currentUser={user} onThemeChange={applyThemeToDocument} />}
      
      {activeTab === 'database' && currentUserPermissions.includes('manage_database') && <DatabaseManager currentUser={user} viaturas={viaturas} checks={checks} users={users} logs={logs} postos={postos} subs={subs} gbs={gbs} />}
      
      {activeTab === 'help' && <HelpManual />}
    </Layout>
  );
};

export default App;
