
import React, { useState, useEffect } from 'react';
import { User, UserRole, RolePermissions, PermissionKey, HeaderConfig } from '../types';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_LABELS, DEFAULT_HEADER_CONFIG } from '../constants';
import { DataService } from '../services/dataService';

interface ParametersManagerProps {
  currentUser: User;
}

/**
 * COMPONENTE DE PARÂMETROS
 * Permite configurar dizeres do cabeçalho de relatórios e permissões de perfil.
 */
const ParametersManager: React.FC<ParametersManagerProps> = ({ currentUser }) => {
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);
  const [headerStrings, setHeaderStrings] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await DataService.getSettings();
      setPermissions(data.rolePermissions || DEFAULT_ROLE_PERMISSIONS);
      setHeaderStrings(data.headerConfig || DEFAULT_HEADER_CONFIG);
    } catch (error) {
      console.error("Erro ao carregar parâmetros", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (role: UserRole, key: PermissionKey) => {
    if (role === UserRole.SUPER && key === 'manage_parameters') return;
    setPermissions(prev => {
      const rolePerms = prev[role] || [];
      const hasPerm = rolePerms.includes(key);
      let newRolePerms = hasPerm ? rolePerms.filter(k => k !== key) : [...rolePerms, key];
      return { ...prev, [role]: newRolePerms };
    });
    setHasChanges(true);
  };

  const handleHeaderChange = (key: keyof HeaderConfig, val: string) => {
    setHeaderStrings(prev => ({ ...prev, [key]: val }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!window.confirm("Confirmar alterações globais de configuração e cabeçalho?")) return;
    setLoading(true);
    try {
      const currentSettings = await DataService.getSettings();
      await DataService.saveSettings({
        ...currentSettings,
        rolePermissions: permissions,
        headerConfig: headerStrings
      });
      
      await DataService.saveLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UPDATE_PARAMS',
        details: 'Dizeres do cabeçalho e matriz de permissões atualizados'
      });
      setHasChanges(false);
      alert("Configurações atualizadas com sucesso!");
    } catch (error) {
      alert("Erro ao salvar parâmetros.");
    } finally {
      setLoading(false);
    }
  };

  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <div className="text-4xl mb-4">🔐</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h3>
        <p className="text-slate-500 font-bold mt-2">Área exclusiva para configuração técnica pelo Super Usuário.</p>
      </div>
    );
  }

  const permissionKeys = Object.keys(PERMISSION_LABELS) as PermissionKey[];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-20">
      {/* Configuração de Cabeçalho PDF */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div className="flex items-center gap-4 mb-8 border-b pb-4">
             <div className="text-3xl">📄</div>
             <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Dizeres do Cabeçalho (PDF)</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuração das linhas iniciais oficiais dos relatórios</p>
             </div>
         </div>
         <div className="grid grid-cols-1 gap-6 max-w-2xl">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Linha 1: Secretaria</label>
                <input type="text" value={headerStrings.secretaria} onChange={e => handleHeaderChange('secretaria', e.target.value.toUpperCase())} className="w-full p-4 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-red-500 bg-slate-50 transition-all" placeholder="SECRETARIA DA SEGURANÇA PÚBLICA" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Linha 2: Força Militar</label>
                <input type="text" value={headerStrings.policiaMilitar} onChange={e => handleHeaderChange('policiaMilitar', e.target.value.toUpperCase())} className="w-full p-4 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-red-500 bg-slate-50 transition-all" placeholder="POLÍCIA MILITAR DO ESTADO DE SÃO PAULO" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Linha 3: Instituição</label>
                <input type="text" value={headerStrings.corpoBombeiros} onChange={e => handleHeaderChange('corpoBombeiros', e.target.value.toUpperCase())} className="w-full p-4 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-red-500 bg-slate-50 transition-all" placeholder="CORPO DE BOMBEIROS DO ESTADO DE SÃO PAULO" />
            </div>
            <p className="text-[9px] text-slate-400 italic">Nota: As demais linhas (GB, SGB, Posto e Município) são vinculadas automaticamente ao cadastro da viatura no momento da conferência.</p>
         </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="text-3xl">⚙️</div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Matriz de Permissões</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Controle de acesso por Perfil</p>
              </div>
            </div>
            {hasChanges && (
                <button onClick={saveSettings} disabled={loading} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg animate-pulse">
                    {loading ? 'Salvando...' : 'Confirmar e Salvar Tudo'}
                </button>
            )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-5 border-b border-r border-slate-200 text-[10px] font-black uppercase text-slate-500 w-1/3">Funcionalidade / Tela</th>
                <th className="p-5 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 text-center">Usuário Padrão</th>
                <th className="p-5 border-b border-slate-200 text-[10px] font-black uppercase text-red-600 text-center">Administrador</th>
                <th className="p-5 border-b border-slate-200 text-[10px] font-black uppercase text-purple-600 text-center">Super Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionKeys.map((key) => (
                <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 border-r border-slate-100 text-xs font-bold text-slate-700">{PERMISSION_LABELS[key]}</td>
                  {[UserRole.USER, UserRole.ADMIN, UserRole.SUPER].map((role) => (
                    <td key={`${role}-${key}`} className="p-4 text-center">
                      <input type="checkbox" checked={permissions[role]?.includes(key)} onChange={() => handleToggle(role, key)} disabled={role === UserRole.SUPER && key === 'manage_parameters'} className="w-5 h-5 accent-red-600 cursor-pointer disabled:opacity-50" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParametersManager;
