
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Viatura, InventoryCheck, GB, Subgrupamento, Posto, LogEntry, RolePermissions, PermissionKey, Theme, Notice } from './types';
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
import NoticeManager from './components/NoticeManager';
import HelpManual from './components/HelpManual';
import { APP_NAME } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [gbs, setGbs] = useState<GB[]>([]);
  const [subs, setSubs] = useState<Subgrupamento[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]); 
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);

  useEffect(() => {
    // Inicializa o tema padrão antes de carregar
    applyThemeToDocument(DEFAULT_THEME);
    setIsInitializing(true);
    loadData(true);
  }, []);

  useEffect(() => {
    if (user && !isInitializing) {
      loadData(false);
    }
  }, [activeTab]);

  const loadData = async (initialLoad = false) => {
    if (initialLoad) setIsInitializing(true);
    else setIsLoading(true);

    try {
      const [vtrs, chks, usrs, g, s, p, l, settings, ntc] = await Promise.all([
        DataService.getViaturas(),
        DataService.getChecks(),
        DataService.getUsers(),
        DataService.getGBS(),
        DataService.getSubs(),
        DataService.getPostos(),
        DataService.getLogs(),
        DataService.getSettings(),
        DataService.getNotices()
      ]);
      setViaturas(vtrs || []);
      setChecks(chks || []);
      setUsers(usrs || []);
      setGbs(g || []);
      setSubs(s || []);
      setPostos(p || []);
      setLogs(l || []);
      setNotices(ntc || []); 
      setRolePermissions(settings.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
      
      // Aplica o tema salvo se existir
      if (settings.activeTheme) {
        applyThemeToDocument(settings.activeTheme);
      }

    } catch (e) {
      console.error("Erro ao carregar dados", e);
    } finally {
      if (initialLoad) setTimeout(() => setIsInitializing(false), 1000);
      else setIsLoading(false);
    }
  };

  // Cálculo das permissões efetivas do usuário logado
  const currentUserPermissions = useMemo<PermissionKey[]>(() => {
    if (!user) return [];
    const basePermissions = rolePermissions[user.role] || [];
    const custom = user.customPermissions || [];
    return Array.from(new Set([...basePermissions, ...custom]));
  }, [user, rolePermissions]);

  // Filtragem de viaturas baseada no escopo do usuário (GB, SGB, Posto)
  const visibleViaturas = useMemo(() => {
    if (!user) return [];
    if (!user.scopeLevel || user.scopeLevel === 'GLOBAL') return viaturas;

    return viaturas.filter(v => {
      const posto = postos.find(p => p.id === v.postoId);
      if (!posto) return false;

      if (user.scopeLevel === 'POSTO') {
        return posto.id === user.scopeId;
      }

      if (user.scopeLevel === 'SGB') {
        return posto.subId === user.scopeId;
      }

      if (user.scopeLevel === 'GB') {
        const sub = subs.find(s => s.id === posto.subId);
        return sub?.gbId === user.scopeId;
      }
      
      return false;
    });
  }, [viaturas, user, postos, subs]);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    DataService.saveLog({
      userId: loggedUser.id,
      userName: loggedUser.name,
      action: 'LOGIN',
      details: `Acesso via: ${navigator.platform}`
    });
    if (loggedUser.role === UserRole.USER) setActiveTab('checklist');
    else setActiveTab('dashboard');
  };
  
  const handleLogout = () => {
    if (user) {
      DataService.saveLog({ userId: user.id, userName: user.name, action: 'LOGOUT', details: 'Sessão encerrada.' });
    }
    setUser(null);
    setActiveTab('dashboard');
    setIsFullScreen(false);
  };

  const handleSaveViatura = async (vtr: Viatura) => {
    setIsLoading(true);
    try {
      await DataService.saveViatura(vtr);
      if (user) {
        await DataService.saveLog({ userId: user.id, userName: user.name, action: 'SAVE_VTR', details: `Vtr ${vtr.prefix} status: ${vtr.status} - Lista de Materiais alterada/salva.` });
      }
      await loadData();
    } catch (e) {
      alert("Erro ao salvar no banco.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteViatura = async (id: string) => {
    const vtr = viaturas.find(v => v.id === id);
    setIsLoading(true);
    await DataService.deleteViatura(id);
    if (user) {
      await DataService.saveLog({ userId: user.id, userName: user.name, action: 'DEL_VTR', details: `Vtr removida: ${vtr?.prefix}` });
    }
    await loadData();
  };

  const handleCompleteCheck = async (check: InventoryCheck) => {
    setIsLoading(true);
    await DataService.saveCheck(check);
    if (user) {
        await DataService.saveLog({ userId: user.id, userName: user.name, action: 'CHECKLIST', details: `Vtr conferida: ${check.viaturaId}` });
    }
    await loadData();
    setIsFullScreen(false); 
  };

  const handleSaveUser = async (u: User) => {
    setIsLoading(true);
    await DataService.saveUser(u);
    if (user) {
      await DataService.saveLog({ userId: user.id, userName: user.name, action: 'SAVE_USER', details: `Perfil salvo: ${u.username}` });
    }
    await loadData();
  };

  const handleDeleteUser = async (id: string) => {
    const u = users.find(usr => usr.id === id);
    if (['Cavalieri', 'admin20gb'].includes(u?.username || '')) return;
    setIsLoading(true);
    await DataService.deleteUser(id);
    if (user) {
      await DataService.saveLog({ userId: user.id, userName: user.name, action: 'DEL_USER', details: `Usuário removido: ${u?.username}` });
    }
    await loadData();
  };

  // --- Funções de Avisos ---
  const handleSaveNotice = async (n: Notice) => {
    setIsLoading(true);
    // Atualização Otimista: Exibe imediatamente para o usuário
    setNotices(prev => {
      const exists = prev.some(item => item.id === n.id);
      if (exists) return prev.map(item => item.id === n.id ? n : item);
      return [...prev, n];
    });

    try {
      await DataService.saveNotice(n);
      if (user) {
        await DataService.saveLog({ userId: user.id, userName: user.name, action: 'SAVE_NOTICE', details: `Aviso publicado/editado: ${n.title}` });
      }
      // Reload silencioso para confirmar dados
      const updatedNotices = await DataService.getNotices();
      if(updatedNotices && updatedNotices.length > 0) setNotices(updatedNotices);
    } catch (e) {
      console.error(e);
      // Reverter se necessário ou alertar
      alert("Aviso salvo localmente, mas houve erro na sincronização com a nuvem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    setIsLoading(true);
    // Atualização Otimista
    setNotices(prev => prev.filter(n => n.id !== id));

    try {
      await DataService.deleteNotice(id);
      if (user) {
        await DataService.saveLog({ userId: user.id, userName: user.name, action: 'DEL_NOTICE', details: `Aviso removido ID: ${id}` });
      }
      const updatedNotices = await DataService.getNotices();
      setNotices(updatedNotices);
    } catch (e) {
      alert("Erro ao deletar aviso na nuvem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGB = async (gb: GB) => { await DataService.saveGB(gb); await loadData(); };
  const handleDeleteGB = async (id: string) => { await DataService.deleteGB(id); await loadData(); };
  const handleSaveSub = async (sub: Subgrupamento) => { await DataService.saveSub(sub); await loadData(); };
  const handleDeleteSub = async (id: string) => { await DataService.deleteSub(id); await loadData(); };
  const handleSavePosto = async (p: Posto) => { await DataService.savePosto(p); await loadData(); };
  const handleDeletePosto = async (id: string) => { await DataService.deletePosto(id); await loadData(); };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ backgroundColor: 'var(--theme-secondary)' }}>
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(255,255,255,0.2)] animate-pulse" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>🚒</div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center animate-spin"><span className="text-slate-900 text-xs font-bold">↻</span></div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tighter text-white">{APP_NAME}</h1>
          <p className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] animate-pulse">Sincronizando Cloud...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isFullScreen={isFullScreen}
      permissions={currentUserPermissions}
    >
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 z-[100] overflow-hidden bg-slate-100">
          <div className="h-full animate-[loading_2s_ease-in-out_infinite]" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
        </div>
      )}
      <style>{`@keyframes loading { 0% { width: 0; transform: translateX(-100%); } 50% { width: 70%; transform: translateX(50%); } 100% { width: 100%; transform: translateX(100%); } }`}</style>

      {/* Renderiza apenas se tiver permissão */}
      {activeTab === 'dashboard' && currentUserPermissions.includes('view_dashboard') && 
        <Dashboard viaturas={visibleViaturas} checks={checks} postos={postos} logs={logs} notices={notices} />}
      
      {activeTab === 'checklist' && currentUserPermissions.includes('perform_checklist') && 
        <Checklist viaturas={visibleViaturas} checks={checks} onComplete={handleCompleteCheck} onFullScreenChange={setIsFullScreen} />}
      
      {activeTab === 'inventory' && currentUserPermissions.includes('manage_fleet') && 
        <InventoryManager viaturas={visibleViaturas} postos={postos} onSaveViatura={handleSaveViatura} onDeleteViatura={handleDeleteViatura} />}
      
      {activeTab === 'reports' && currentUserPermissions.includes('view_reports') && 
        <Reports checks={checks} viaturas={visibleViaturas} currentUser={user} />}
      
      {activeTab === 'users' && currentUserPermissions.includes('manage_users') && 
        <UserAdmin users={users} gbs={gbs} subs={subs} postos={postos} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} currentUser={user} />}
      
      {activeTab === 'hierarchy' && currentUserPermissions.includes('manage_hierarchy') && 
        <HierarchyManager gbs={gbs} subs={subs} postos={postos} onSaveGB={handleSaveGB} onDeleteGB={handleDeleteGB} onSaveSub={handleSaveSub} onDeleteSub={handleDeleteSub} onSavePosto={handleSavePosto} onDeletePosto={handleDeletePosto} />}
      
      {activeTab === 'notices' && currentUserPermissions.includes('manage_notices') && 
        <NoticeManager notices={notices} onSaveNotice={handleSaveNotice} onDeleteNotice={handleDeleteNotice} currentUser={user} />}
      
      {activeTab === 'logs' && currentUserPermissions.includes('view_audit_logs') && 
        <LogManager logs={logs} currentUser={user} />}
      
      {activeTab === 'params' && currentUserPermissions.includes('manage_parameters') && 
        <ParametersManager currentUser={user} />}
      
      {activeTab === 'themes' && currentUserPermissions.includes('manage_themes') && 
        <ThemeManager currentUser={user} onThemeChange={applyThemeToDocument} />}
      
      {activeTab === 'database' && currentUserPermissions.includes('manage_database') && 
        <DatabaseManager currentUser={user} viaturasCount={viaturas.length} checksCount={checks.length} usersCount={users.length} />}

      {activeTab === 'help' && <HelpManual />}
    </Layout>
  );
};

export default App;
