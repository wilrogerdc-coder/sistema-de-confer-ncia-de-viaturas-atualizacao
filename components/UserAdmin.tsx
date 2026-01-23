
import React, { useState, useMemo } from 'react';
import { User, UserRole, Posto, GB, Subgrupamento, ScopeLevel, PermissionKey } from '../types';
import { PERMISSION_LABELS } from '../constants';

interface UserAdminProps {
  users: User[];
  gbs: GB[];
  subs: Subgrupamento[];
  postos: Posto[];
  onSaveUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
}

const UserAdmin: React.FC<UserAdminProps> = ({ users, gbs, subs, postos, onSaveUser, onDeleteUser, currentUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', email: '', role: UserRole.USER, password: '', 
    scopeLevel: 'GLOBAL', scopeId: '', customPermissions: []
  });

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (u.username === 'Cavalieri') return false;
      if (currentUser.role === UserRole.ADMIN && u.role === UserRole.SUPER) return false;
      
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term);
      }
      return true;
    });
  }, [users, currentUser, searchTerm]);

  const handleCreateOrUpdate = () => {
    if (!formData.name || !formData.username) {
      alert("Nome e Usuário são obrigatórios.");
      return;
    }

    if (formData.scopeLevel !== 'GLOBAL' && !formData.scopeId) {
      alert("Para escopos limitados (GB, SGB ou Posto), você deve selecionar a unidade específica.");
      return;
    }
    
    if (['Cavalieri', 'admin20gb'].includes(formData.username || '')) {
      alert("Este nome de usuário é reservado pelo sistema.");
      return;
    }

    let finalPassword = '123456';
    let forceChange = false;
    
    if (editingId) {
      const originalUser = users.find(u => u.id === editingId);
      if (formData.password && formData.password.trim() !== '') {
        finalPassword = formData.password;
        forceChange = true;
      } else {
        finalPassword = originalUser?.password || '123456';
        forceChange = originalUser?.mustChangePassword || false;
      }
    } else {
      finalPassword = formData.password || '123456';
      forceChange = true;
    }

    const userToSave: User = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      username: formData.username!,
      email: formData.email,
      role: formData.role || UserRole.USER,
      password: finalPassword,
      mustChangePassword: forceChange,
      scopeLevel: formData.scopeLevel || 'GLOBAL',
      scopeId: formData.scopeId || '',
      customPermissions: formData.customPermissions || [],
      postoId: '' // Campo legado
    };

    onSaveUser(userToSave);
    resetForm();
  };

  const startEdit = (u: User) => {
    if (['Cavalieri', 'admin20gb'].includes(u.username)) {
      alert("Perfil de sistema protegido.");
      return;
    }
    setEditingId(u.id);
    setFormData({ 
      ...u, 
      password: '',
      scopeLevel: u.scopeLevel || 'GLOBAL',
      scopeId: u.scopeId || '',
      customPermissions: u.customPermissions || []
    });
    setIsAdding(true);
  };

  const handleDeleteClick = (u: User) => {
    if (window.confirm(`ATENÇÃO: Deseja EXCLUIR permanentemente o usuário ${u.name}?`)) {
      onDeleteUser(u.id);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', username: '', email: '', role: UserRole.USER, password: '', scopeLevel: 'GLOBAL', scopeId: '', customPermissions: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const toggleCustomPermission = (key: PermissionKey) => {
    setFormData(prev => {
      const current = prev.customPermissions || [];
      if (current.includes(key)) return { ...prev, customPermissions: current.filter(k => k !== key) };
      return { ...prev, customPermissions: [...current, key] };
    });
  };

  const getScopeOptions = () => {
    if (formData.scopeLevel === 'GB') return gbs.map(g => ({ id: g.id, name: g.name }));
    if (formData.scopeLevel === 'SGB') return subs.map(s => ({ id: s.id, name: s.name }));
    if (formData.scopeLevel === 'POSTO') return postos.map(p => ({ id: p.id, name: p.name }));
    return [];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tighter uppercase">Operadores do Sistema</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de acesso e vinculação</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Pesquisar operador..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs outline-none focus:ring-4 focus:ring-red-50 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="bg-red-600 text-white px-5 py-2 rounded-xl font-black uppercase text-xs shadow-lg whitespace-nowrap">
              + Novo Operador
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95 duration-200">
          <h4 className="font-black mb-6 uppercase tracking-widest text-red-400">
            {editingId ? 'Editar Operador' : 'Cadastro de Acesso'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Nome de Guerra</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none" placeholder="Ex: CB PM FULANO" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Usuário (Login)</label>
              <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Perfil de Acesso</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none font-bold">
                <option value={UserRole.USER}>Apenas Checklist</option>
                <option value={UserRole.ADMIN}>Administrador</option>
                {currentUser.role === UserRole.SUPER && <option value={UserRole.SUPER}>Super Usuário</option>}
              </select>
            </div>
            
            {/* Escopo de Visualização */}
            <div className="space-y-1 border border-slate-700 p-2 rounded-xl bg-slate-800/50">
               <label className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-1 block">Nível de Visualização</label>
               <select value={formData.scopeLevel} onChange={e => setFormData({ ...formData, scopeLevel: e.target.value as ScopeLevel, scopeId: '' })} className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 outline-none font-bold text-xs mb-2">
                 <option value="GLOBAL">GLOBAL (Toda Frota)</option>
                 <option value="GB">Nível GB</option>
                 <option value="SGB">Nível SGB</option>
                 <option value="POSTO">Nível Posto/Pelotão</option>
               </select>

               {formData.scopeLevel !== 'GLOBAL' && (
                 <select value={formData.scopeId} onChange={e => setFormData({ ...formData, scopeId: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 outline-none font-bold text-xs">
                    <option value="">Selecione a Unidade...</option>
                    {getScopeOptions().map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                 </select>
               )}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Senha</label>
              <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingId ? "Deixar vazio p/ manter" : "Padrão: 123456"} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">E-mail (Opcional)</label>
              <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none" />
            </div>
          </div>

          {/* Permissões Especiais */}
          <div className="mb-8 p-4 bg-slate-800 rounded-2xl border border-slate-700">
             <h5 className="text-[10px] font-black uppercase text-green-400 tracking-widest mb-4">Permissões Especiais (Adicionais)</h5>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-700 rounded-lg">
                    <input 
                      type="checkbox" 
                      checked={formData.customPermissions?.includes(key)} 
                      onChange={() => toggleCustomPermission(key)}
                      className="accent-green-500 w-4 h-4"
                    />
                    <span className="text-[10px] font-bold uppercase text-slate-300">{PERMISSION_LABELS[key]}</span>
                  </label>
                ))}
             </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreateOrUpdate} className="bg-red-600 px-8 py-3 rounded-xl font-black uppercase text-xs">Salvar</button>
            <button onClick={resetForm} className="bg-slate-700 px-8 py-3 rounded-xl font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Operador</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Escopo de Visão</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Perfil</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum operador encontrado.</td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                let scopeName = 'GLOBAL';
                if (u.scopeLevel === 'GB') scopeName = gbs.find(g => g.id === u.scopeId)?.name || 'GB Não encontrado';
                else if (u.scopeLevel === 'SGB') scopeName = subs.find(s => s.id === u.scopeId)?.name || 'SGB Não encontrado';
                else if (u.scopeLevel === 'POSTO') scopeName = postos.find(p => p.id === u.scopeId)?.name || 'Posto Não encontrado';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-800">{u.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">@{u.username}</p>
                      {u.customPermissions && u.customPermissions.length > 0 && (
                        <span className="text-[8px] bg-green-100 text-green-700 px-1.5 rounded font-bold uppercase mt-1 inline-block">+ {u.customPermissions.length} Permissões Extras</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase w-fit px-2 py-0.5 rounded ${u.scopeLevel === 'GLOBAL' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.scopeLevel || 'GLOBAL'}
                        </span>
                        {u.scopeLevel !== 'GLOBAL' && (
                          <span className="text-[10px] font-bold text-slate-600 mt-0.5">{scopeName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[8px] px-2 py-1 rounded-full font-black border uppercase ${
                        u.role === UserRole.SUPER ? 'bg-purple-100 border-purple-200 text-purple-700' :
                        u.role === UserRole.ADMIN ? 'bg-red-100 border-red-200 text-red-700' :
                        'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(u)} className="p-2 text-slate-300 hover:text-slate-900" title="Editar">✏️</button>
                        <button onClick={() => handleDeleteClick(u)} className="p-2 text-red-200 hover:text-red-600" title="Excluir">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserAdmin;
