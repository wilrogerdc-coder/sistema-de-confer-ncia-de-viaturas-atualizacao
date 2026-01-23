
import React from 'react';
import { User, PermissionKey } from '../types';
import { APP_NAME } from '../constants';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
  isFullScreen?: boolean;
  permissions: PermissionKey[];
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeTab, setActiveTab, children, isFullScreen = false, permissions }) => {
  const tabs = [];

  if (permissions.includes('view_dashboard')) {
    tabs.push({ id: 'dashboard', label: 'Início', icon: '📊' });
  }
  if (permissions.includes('perform_checklist')) {
    tabs.push({ id: 'checklist', label: 'Checklist', icon: '📝' });
  }
  if (permissions.includes('manage_fleet')) {
    tabs.push({ id: 'inventory', label: 'Frota', icon: '🚒' });
  }
  if (permissions.includes('view_reports')) {
    tabs.push({ id: 'reports', label: 'Relatórios', icon: '📄' });
  }
  if (permissions.includes('manage_users')) {
    tabs.push({ id: 'users', label: 'Usuários', icon: '👥' });
  }
  if (permissions.includes('manage_hierarchy')) {
    tabs.push({ id: 'hierarchy', label: 'Postos', icon: '🏛️' });
  }
  if (permissions.includes('manage_notices')) {
    tabs.push({ id: 'notices', label: 'Avisos', icon: '📌' });
  }
  if (permissions.includes('view_audit_logs')) {
    tabs.push({ id: 'logs', label: 'Auditoria', icon: '📋' });
  }
  if (permissions.includes('manage_database')) {
    tabs.push({ id: 'database', label: 'Banco de Dados', icon: '📡' });
  }
  if (permissions.includes('manage_parameters')) {
    tabs.push({ id: 'params', label: 'Parâmetros', icon: '⚙️' });
  }
  if (permissions.includes('manage_themes')) {
    tabs.push({ id: 'themes', label: 'Temas', icon: '🎨' });
  }

  // Ajuda disponível para todos
  tabs.push({ id: 'help', label: 'Ajuda / Manual', icon: '❓' });

  if (isFullScreen) {
    return (
      <div className="min-h-screen flex flex-col animate-in fade-in duration-500" style={{ backgroundColor: 'var(--theme-bg)' }}>
        <main className="flex-1 p-0 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-[var(--theme-primary)] selection:text-white" style={{ backgroundColor: 'var(--theme-bg)' }}>
      {/* Sidebar usando Variável de Tema para Fundo */}
      <aside className="hidden md:flex w-64 text-white flex-col sticky top-0 h-screen overflow-y-auto z-50 shadow-2xl transition-colors duration-300" style={{ backgroundColor: 'var(--theme-secondary)' }}>
        <div className="p-6 border-b border-white/10">
          <h1 className="text-lg font-bold flex items-center gap-3 text-[var(--theme-text-inv)]">
            <span className="text-2xl" style={{ color: 'var(--theme-primary)' }}>🚒</span> {APP_NAME}
          </h1>
          <p className="text-[10px] text-white/50 mt-2 uppercase tracking-widest font-semibold pl-1">20º GB • Birigui</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === tab.id 
                  ? 'text-white shadow-lg shadow-black/20' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              style={{ backgroundColor: activeTab === tab.id ? 'var(--theme-primary)' : 'transparent' }}
            >
              <span className={`text-lg transition-transform ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>{tab.icon}</span>
              <span className="font-semibold text-xs uppercase tracking-wide">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10 bg-black/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold border border-white/10 text-white/80">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white/90">{user.name}</p>
              <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full py-2.5 px-4 rounded-lg bg-white/5 hover:bg-red-950/50 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/10 text-white/70"
          >
            Encerrar Sessão
          </button>

          <div className="pt-2 flex flex-col items-center opacity-40">
            <span className="text-[10px] text-white/60 font-medium">v1.5.1</span>
            <span className="text-[8px] text-white/50 font-bold uppercase tracking-widest mt-1">Dev Cavalieri</span>
          </div>
        </div>
      </aside>

      <header className="md:hidden border-b border-slate-200 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm" style={{ backgroundColor: 'var(--theme-surface)' }}>
        <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--theme-text-main)' }}>
          <span style={{ color: 'var(--theme-primary)' }}>🚒</span> {APP_NAME}
        </h1>
        <button 
          onClick={onLogout}
          className="w-8 h-8 rounded-full flex items-center justify-center border"
          style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-bg)', color: 'var(--theme-text-main)' }}
          title="Sair"
        >
          <span className="text-xs">✕</span>
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]" style={{ backgroundColor: 'var(--theme-surface)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-w-[64px] transition-all duration-300 ${
              activeTab === tab.id 
                ? 'scale-105' 
                : 'grayscale'
            }`}
            style={{ color: activeTab === tab.id ? 'var(--theme-primary)' : 'var(--theme-text-main)', opacity: activeTab === tab.id ? 1 : 0.5 }}
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-tight">
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
