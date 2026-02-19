
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  
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
    loadData(true);
  }, []);

  // Recarga de dados ao mudar de aba para garantir sincronia
  useEffect(() => {
    if (user && !isInitializing) {
      loadData(false);
    }
  }, [activeTab]);

  /**
   * Carrega todos os dados das planilhas/cloud.
   */
  const loadData = async (initialLoad = false) => {
    if (initialLoad) setIsInitializing(true);
    else setIsLoading(true);

    try {
      const [vtrs, chks, usrs, g, s, p, l, settings] = await Promise.all([
        DataService.getViaturas(),
        DataService.getChecks(),
        DataService.getUsers(),
        DataService.getGBS(),
        DataService.getSubs(),
        DataService.getPostos(),
        DataService.getLogs(),
        DataService.getSettings()
      ]);
      setViaturas(vtrs || []);
      setChecks(chks || []);
      setUsers(usrs || []);
      setGbs(g || []);
      setSubs(s || []);
      setPostos(p || []);
      setLogs(l || []);
      setRolePermissions(settings.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
      if (settings.activeTheme) applyThemeToDocument(settings.activeTheme);
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    } finally {
      if (initialLoad) setTimeout(() => setIsInitializing(false), 800);
      else setIsLoading(false);
    }
  };

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
    if (!user.scopeLevel || user.scopeLevel === 'GLOBAL') return viaturas;
    return viaturas.filter(v => {
      const vtrPostoId = v.postoId;
      if (!vtrPostoId) return false;
      const posto = postos.find(p => p.id === vtrPostoId);
      if (!posto) return false;
      if (user.scopeLevel === 'POSTO') return posto.id === user.scopeId;
      if (user.scopeLevel === 'SGB') return posto.subId === user.scopeId;
      if (user.scopeLevel === 'GB') {
        const sub = subs.find(s => s.id === posto.subId);
        return sub?.gbId === user.scopeId;
      }
      return false;
    });
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
      await loadData();
    } catch (e) { alert("Erro ao salvar."); } finally { setIsLoading(false); }
  };

  const handleDeleteViatura = async (id: string) => {
    const vtr = viaturas.find(v => v.id === id);
    setIsLoading(true);
    await DataService.deleteViatura(id);
    if (user) await DataService.saveLog({ userId: user.username, userName: user.name, action: 'DEL_VTR', details: `Vtr removida da frota: ${vtr?.prefix}` });
    await loadData();
  };

  const handleCompleteCheck = async (check: InventoryCheck) => {
    setIsLoading(true);
    await DataService.saveCheck(check);
    if (user) {
        const vtr = viaturas.find(v => v.id === check.viaturaId);
        await DataService.saveLog({ userId: user.username, userName: user.name, action: 'CHECKLIST', details: `Conferência realizada: ${vtr?.prefix} (Status: ${check.viaturaStatusAtTime})` });
    }
    await loadData();
    setIsFullScreen(false); 
  };

  const handleSaveUser = async (u: User) => {
    setIsLoading(true);
    await DataService.saveUser(u);
    if (user) await DataService.saveLog({ userId: user.username, userName: user.name, action: 'SAVE_USER', details: `Cadastro/Edição de usuário: ${u.username}` });
    await loadData();
  };

  const handleDeleteUser = async (id: string) => {
    const u = users.find(usr => usr.id === id);
    if (['Cavalieri', 'admin20gb'].includes(u?.username || '')) return;
    setIsLoading(true);
    await DataService.deleteUser(id);
    if (user) await DataService.saveLog({ userId: user.username, userName: user.name, action: 'DEL_USER', details: `Usuário removido: ${u?.username}` });
    await loadData();
  };

  const handleSaveGB = async (gb: GB) => { await DataService.saveGB(gb); await loadData(); };
  const handleDeleteGB = async (id: string) => { await DataService.deleteGB(id); await loadData(); };
  const handleSaveSub = async (sub: Subgrupamento) => { await DataService.saveSub(sub); await loadData(); };
  const handleDeleteSub = async (id: string) => { await DataService.deleteSub(id); await loadData(); };
  const handleSavePosto = async (p: Posto) => { await DataService.savePosto(p); await loadData(); };
  const handleDeletePosto = async (id: string) => { await DataService.deletePosto(id); await loadData(); };

  // Tela de carregamento inicial
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ backgroundColor: 'var(--theme-secondary)' }}>
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(255,255,255,0.2)] animate-pulse" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>🚒</div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tighter text-white">{APP_NAME}</h1>
          <p className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] animate-pulse">Sincronizando Cloud Master...</p>
        </div>
      </div>
    );
  }

  // Se não houver usuário logado, exibe tela de Login
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} isFullScreen={isFullScreen} permissions={currentUserPermissions} gbs={gbs} subs={subs} postos={postos}>
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 z-[100] overflow-hidden bg-slate-100">
          <div className="h-full animate-[loading_2s_ease-in-out_infinite]" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
        </div>
      )}
      
      {/* Roteamento de Abas */}
      {activeTab === 'dashboard' && currentUserPermissions.includes('view_dashboard') && <Dashboard viaturas={visibleViaturas} checks={checks} postos={postos} subs={subs} gbs={gbs} logs={logs} currentUser={user} />}
      
      {activeTab === 'checklist' && currentUserPermissions.includes('perform_checklist') && <Checklist viaturas={visibleViaturas} checks={checks} onComplete={handleCompleteCheck} onFullScreenChange={setIsFullScreen} postos={postos} subs={subs} gbs={gbs} />}
      
      {activeTab === 'inventory' && currentUserPermissions.includes('manage_fleet') && <InventoryManager viaturas={visibleViaturas} postos={postos} onSaveViatura={handleSaveViatura} onDeleteViatura={handleDeleteViatura} currentUser={user} />}
      
      {activeTab === 'reports' && currentUserPermissions.includes('view_reports') && <Reports checks={checks} viaturas={viaturas} currentUser={user} postos={postos} />}
      
      {activeTab === 'users' && currentUserPermissions.includes('manage_users') && <UserAdmin users={users} gbs={gbs} subs={subs} postos={postos} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} currentUser={user} />}
      
      {activeTab === 'hierarchy' && currentUserPermissions.includes('manage_hierarchy') && <HierarchyManager gbs={gbs} subs={subs} postos={postos} onSaveGB={handleSaveGB} onDeleteGB={handleDeleteGB} onSaveSub={handleSaveSub} onDeleteSub={handleDeleteSub} onSavePosto={handleSavePosto} onDeletePosto={handleDeletePosto} />}
      
      {activeTab === 'logs' && currentUserPermissions.includes('view_audit_logs') && <LogManager logs={logs} currentUser={user} onRefresh={() => loadData(false)} />}
      
      {activeTab === 'params' && currentUserPermissions.includes('manage_parameters') && <ParametersManager currentUser={user} />}
      
      {activeTab === 'themes' && currentUserPermissions.includes('manage_themes') && <ThemeManager currentUser={user} onThemeChange={applyThemeToDocument} />}
      
      {activeTab === 'database' && currentUserPermissions.includes('manage_database') && <DatabaseManager currentUser={user} viaturas={viaturas} checks={checks} users={users} logs={logs} postos={postos} subs={subs} gbs={gbs} />}
      
      {activeTab === 'help' && <HelpManual />}
    </Layout>
  );
};

export default App;
