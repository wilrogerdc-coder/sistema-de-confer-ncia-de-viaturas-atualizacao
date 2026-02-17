import React, { useMemo, useState } from 'react';
import { User, PermissionKey, GB, Subgrupamento, Posto } from '../types';
import { APP_NAME } from '../constants';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
  isFullScreen?: boolean;
  permissions: PermissionKey[];
  gbs?: GB[];
  subs?: Subgrupamento[];
  postos?: Posto[];
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeTab, setActiveTab, children, isFullScreen = false, permissions, postos = [] }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = useMemo(() => {
    const t = [];
    if (permissions.includes('view_dashboard')) t.push({ id: 'dashboard', label: 'Início', icon: '📊' });
    if (permissions.includes('perform_checklist')) t.push({ id: 'checklist', label: 'Checklist', icon: '📝' });
    // REGRA: Menu renomeado de 'Pátio' para 'VIATURAS' conforme solicitado pelo usuário.
    if (permissions.includes('manage_fleet')) t.push({ id: 'inventory', label: 'VIATURAS', icon: '🚒' });
    if (permissions.includes('view_reports')) t.push({ id: 'reports', label: 'Relatórios', icon: '📄' });
    if (permissions.includes('manage_users')) t.push({ id: 'users', label: 'Usuários', icon: '👥' });
    if (permissions.includes('manage_hierarchy')) t.push({ id: 'hierarchy', label: 'Unidades', icon: '🏛️' });
    if (permissions.includes('view_audit_logs')) t.push({ id: 'logs', label: 'Auditoria', icon: '🛡️' });
    if (permissions.includes('manage_database')) t.push({ id: 'database', label: 'Cloud', icon: '📡' });
    if (permissions.includes('manage_parameters')) t.push({ id: 'params', label: 'Parâmetros', icon: '⚙️' });
    if (permissions.includes('manage_themes')) t.push({ id: 'themes', label: 'Visual', icon: '🎨' });
    t.push({ id: 'help', label: 'Ajuda', icon: '❓' });
    return t;
  }, [permissions]);

  const unitLabel = useMemo(() => {
    if (user.role === 'SUPER') return 'CENTRO DE COMANDO MASTER';
    const pId = user.scopeId || user.postoId;
    const p = postos.find(posto => posto.id === pId);
    return (p?.name || 'UNIDADE OPERACIONAL').toUpperCase();
  }, [user, postos]);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  if (isFullScreen) return <div className="min-h-screen bg-[var(--theme-bg)] flex flex-col overflow-hidden">{children}</div>;

  const sidebarContent = (
    <>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-red-600 to-transparent opacity-40"></div>
      
      <div className="p-8 border-b border-white/5 bg-black/20">
        <h1 className="text-xl font-black flex items-center gap-3 tracking-tighter uppercase leading-none">
          <span className="text-3xl drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">🚒</span> 
          <div className="flex flex-col">
              <span className="text-red-500">{APP_NAME.split(' ')[0]}</span>
              <span className="text-[9px] tracking-[0.3em] text-white/30">Sincronizado</span>
          </div>
        </h1>
        <p className="text-[8px] text-white/20 mt-4 uppercase tracking-[0.4em] font-black leading-none">{unitLabel}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto hide-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => handleTabClick(tab.id)} 
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 group relative overflow-hidden ${
              activeTab === tab.id 
              ? 'bg-red-600 text-white shadow-lg scale-[1.02] border border-white/10' 
              : 'text-white/40 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className={`text-xl transition-transform duration-500 group-hover:scale-110 ${activeTab === tab.id ? 'animate-pulse' : ''}`}>{tab.icon}</span>
            <span className="font-black text-[10px] uppercase tracking-[0.2em]">{tab.label}</span>
            {activeTab === tab.id && <div className="absolute right-0 w-1 h-6 bg-white rounded-l-full"></div>}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5 space-y-6 bg-black/20">
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-sm font-black text-white shadow-xl uppercase">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-black text-white truncate uppercase tracking-tighter">{user.name}</p>
            <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black mt-1">ID: {user.username.slice(0,8)}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout} 
          className="w-full py-3.5 rounded-xl bg-rose-950/20 hover:bg-red-600 text-rose-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 border border-rose-900/30 active:scale-95 shadow-lg"
        >
          Encerrar Sessão
        </button>

        <div className="pt-2 text-center">
            {/* REGRA: Créditos de desenvolvimento no rodapé do menu lateral */}
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20">Cavalieri - 2026</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--theme-bg)] font-sans relative">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[var(--theme-secondary)] text-white shadow-lg z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚒</span>
          <span className="font-black text-sm uppercase tracking-tighter">{APP_NAME.split(' ')[0]}</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl active:scale-90 transition-all"
        >
          <span className="text-2xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* MOBILE ASIDE (DRAWER) */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-[var(--theme-secondary)] text-white z-[70] shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 text-white flex-col sticky top-0 h-screen bg-[var(--theme-secondary)] shadow-2xl z-50 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-[var(--theme-bg)]">
        <div className="max-w-[1300px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;