
import React, { useState, useEffect } from 'react';
import { User, UserRole, RolePermissions, PermissionKey } from '../types';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_LABELS } from '../constants';
import { DataService } from '../services/dataService';

interface ParametersManagerProps {
  currentUser: User;
}

const ParametersManager: React.FC<ParametersManagerProps> = ({ currentUser }) => {
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_ROLE_PERMISSIONS);
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
    } catch (error) {
      console.error("Erro ao carregar parâmetros", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (role: UserRole, key: PermissionKey) => {
    // Evita retirar permissão de gerenciar parâmetros do SUPER para não trancar o sistema
    if (role === UserRole.SUPER && key === 'manage_parameters') return;

    setPermissions(prev => {
      const rolePerms = prev[role] || [];
      const hasPerm = rolePerms.includes(key);
      
      let newRolePerms;
      if (hasPerm) {
        newRolePerms = rolePerms.filter(k => k !== key);
      } else {
        newRolePerms = [...rolePerms, key];
      }

      return { ...prev, [role]: newRolePerms };
    });
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!window.confirm("Confirmar alterações nas permissões globais?")) return;
    setLoading(true);
    try {
      // Get current settings to preserve other properties (like activeTheme)
      const currentSettings = await DataService.getSettings();
      await DataService.saveSettings({
        ...currentSettings,
        rolePermissions: permissions
      });
      
      await DataService.saveLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UPDATE_PARAMS',
        details: 'Matriz de permissões atualizada'
      });
      setHasChanges(false);
      alert("Parâmetros atualizados com sucesso!");
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
        <p className="text-slate-500 font-bold mt-2">Apenas o desenvolvedor master pode alterar os parâmetros.</p>
      </div>
    );
  }

  const permissionKeys = Object.keys(PERMISSION_LABELS) as PermissionKey[];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="text-3xl">⚙️</div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Parâmetros do Sistema</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Definição de Permissões Globais</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setPermissions(DEFAULT_ROLE_PERMISSIONS)} 
                className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase"
              >
                Restaurar Padrão
              </button>
              <button 
                onClick={saveSettings} 
                disabled={!hasChanges || loading}
                className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-5 border-b border-r border-slate-200 text-[10px] font-black uppercase text-slate-500 w-1/3">Funcionalidade / Tela</th>
                <th className="p-5 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 text-center">
                  Usuário <br/><span className="text-[8px] opacity-70">Padrão</span>
                </th>
                <th className="p-5 border-b border-slate-200 text-[10px] font-black uppercase text-red-600 text-center">
                  Admin <br/><span className="text-[8px] opacity-70">Gestor</span>
                </th>
                <th className="p-5 border-b border-slate-200 text-[10px] font-black uppercase text-purple-600 text-center">
                  Super <br/><span className="text-[8px] opacity-70">Master</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionKeys.map((key) => (
                <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 border-r border-slate-100 text-xs font-bold text-slate-700">
                    {PERMISSION_LABELS[key]}
                  </td>
                  {[UserRole.USER, UserRole.ADMIN, UserRole.SUPER].map((role) => {
                    const isChecked = permissions[role]?.includes(key);
                    const isLocked = role === UserRole.SUPER && key === 'manage_parameters';
                    return (
                      <td key={`${role}-${key}`} className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleToggle(role, key)}
                          disabled={isLocked}
                          className="w-5 h-5 accent-red-600 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                    );
                  })}
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
