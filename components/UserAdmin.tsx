
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

/**
 * COMPONENTE: UserAdmin
 * Gerencia o cadastro, o escopo de atuação e as PERMISSÕES ADICIONAIS dos usuários.
 * Implementa renomeação para 'Usuários' conforme diretriz sênior.
 */
const UserAdmin: React.FC<UserAdminProps> = ({ users, gbs, subs, postos, onSaveUser, onDeleteUser, currentUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  
  const [filterGb, setFilterGb] = useState<string>('');
  const [filterSgb, setFilterSgb] = useState<string>('');
  const [filterPosto, setFilterPosto] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', role: UserRole.USER, password: '', 
    scopeLevel: 'GLOBAL', scopeId: '', customPermissions: []
  });

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (u.username.toLowerCase() === 'cavalieri' || u.username.toLowerCase() === 'admin20gb') return false;
      
      const matchSearch = searchTerm.trim() === '' || 
                         u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRole = filterRole === '' || u.role === filterRole;

      const userPostoId = u.scopeId || u.postoId;
      const userPosto = postos.find(p => p.id === userPostoId);
      const userSgbId = u.scopeLevel === 'SGB' ? u.scopeId : userPosto?.subId;
      const userSgb = subs.find(s => s.id === userSgbId);
      const userGbId = u.scopeLevel === 'GB' ? u.scopeId : userSgb?.gbId;

      const matchGb = filterGb === '' || userGbId === filterGb;
      const matchSgb = filterSgb === '' || userSgbId === filterSgb;
      const matchPosto = filterPosto === '' || userPostoId === filterPosto;

      return matchSearch && matchRole && matchGb && matchSgb && matchPosto;
    });
  }, [users, searchTerm, filterRole, filterGb, filterSgb, filterPosto, subs, postos]);

  const handleCreateOrUpdate = () => {
    if (!formData.name || !formData.username) return alert("Preencha os campos obrigatórios.");
    onSaveUser({
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      username: formData.username!.toLowerCase().trim(),
      role: formData.role || UserRole.USER,
      password: formData.password || '123456',
      scopeLevel: formData.scopeLevel || 'GLOBAL',
      scopeId: formData.scopeId || '',
      customPermissions: formData.customPermissions || []
    } as User);
    resetForm();
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setFormData({...u});
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({ name: '', username: '', role: UserRole.USER, scopeLevel: 'GLOBAL', scopeId: '', customPermissions: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  // REGRAS DE PERMISSÃO: Toggle granular para permissões adicionais.
  const handleTogglePermission = (p: PermissionKey) => {
    const current = formData.customPermissions || [];
    if (current.includes(p)) {
      setFormData({ ...formData, customPermissions: current.filter(x => x !== p) });
    } else {
      setFormData({ ...formData, customPermissions: [...current, p] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tighter uppercase leading-none">Gerenciamento de Usuários</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Filtrado: {filteredUsers.length} Usuários</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-red-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-red-700 transition-all">+ Novo Usuário</button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-50">
          <input type="text" placeholder="BUSCAR POR NOME..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase outline-none focus:border-red-500" />
          
          <select value={filterGb} onChange={e => { setFilterGb(e.target.value); setFilterSgb(''); setFilterPosto(''); }} className="px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase outline-none bg-slate-50">
             <option value="">TODOS OS GB</option>
             {gbs.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          
          <select value={filterSgb} onChange={e => { setFilterSgb(e.target.value); setFilterPosto(''); }} className="px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase outline-none bg-slate-50">
             <option value="">TODOS OS SGB</option>
             {subs.filter(s => !filterGb || s.gbId === filterGb).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select value={filterPosto} onChange={e => setFilterPosto(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase outline-none bg-slate-50">
             <option value="">TODAS AS UNIDADES</option>
             {postos.filter(p => !filterSgb || p.subId === filterSgb).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase outline-none bg-slate-50">
             <option value="">TODOS PERFIS</option>
             <option value={UserRole.USER}>ACESSO CHECKLIST</option>
             <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
          </select>
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95">
          <h4 className="font-black mb-6 uppercase tracking-widest text-red-400">{editingId ? 'Editar Usuário' : 'Nova Credencial de Acesso'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Nome / Graduação</label>
              <input type="text" placeholder="NOME / GRADUAÇÃO" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-red-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Usuário (Login)</label>
              <input type="text" placeholder="USUÁRIO (LOGIN)" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-red-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Perfil de Acesso</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-red-500">
                  <option value={UserRole.USER}>ACESSO OPERACIONAL (CHECKLIST)</option>
                  <option value={UserRole.ADMIN}>ADMINISTRADOR LOCAL</option>
                  <option value={UserRole.SUPER}>SUPER USUÁRIO MASTER</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Nível de Escopo (Vinculação)</label>
              <select value={formData.scopeLevel} onChange={e => setFormData({ ...formData, scopeLevel: e.target.value as ScopeLevel, scopeId: '' })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-red-500">
                  <option value="GLOBAL">GLOBAL (TODAS AS UNIDADES)</option>
                  <option value="GB">GRUPAMENTO (GB)</option>
                  <option value="SGB">SUBGRUPAMENTO (SGB)</option>
                  <option value="POSTO">POSTO / PELOTÃO / BASE</option>
              </select>
            </div>

            {formData.scopeLevel !== 'GLOBAL' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Seleção da Unidade Vinculada</label>
                <select value={formData.scopeId} onChange={e => setFormData({ ...formData, scopeId: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold outline-none focus:border-red-500">
                    <option value="">Selecione...</option>
                    {formData.scopeLevel === 'GB' && gbs.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    {formData.scopeLevel === 'SGB' && subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    {formData.scopeLevel === 'POSTO' && postos.map(p => <option key={p.id} value={p.id}>{p.classification} {p.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* REGRAS DE EDIÇÃO: Permissões Adicionais para o Usuário */}
          <div className="border-t border-slate-800 pt-6 mb-8">
            <h5 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Permissões Adicionais (Customizadas)</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key) => (
                <label key={key} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={formData.customPermissions?.includes(key)} 
                    onChange={() => handleTogglePermission(key)}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-[10px] font-bold text-slate-300 uppercase">{PERMISSION_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreateOrUpdate} className="bg-red-600 px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg hover:brightness-110 transition-all">Salvar Usuário</button>
            <button onClick={resetForm} className="bg-slate-700 px-8 py-3 rounded-xl font-black uppercase text-xs transition-all">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Usuário</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Permissão / Unidade</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={3} className="p-10 text-center text-slate-300 uppercase font-black text-xs">Nenhum usuário localizado.</td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-xs font-black text-slate-800 uppercase leading-none">{u.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">@{u.username}</p>
                </td>
                <td className="px-6 py-4 text-center">
                   <div className="flex flex-col items-center gap-1">
                      <span className={`text-[8px] px-2 py-0.5 rounded font-black border uppercase ${u.role === UserRole.ADMIN ? 'bg-red-50 text-red-600 border-red-100' : u.role === UserRole.SUPER ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{u.role}</span>
                      <span className={`text-[7px] font-black uppercase tracking-widest ${u.scopeLevel === 'GLOBAL' ? 'text-purple-600' : 'text-blue-500'}`}>
                         Acesso: {u.scopeLevel || 'LOCAL'} ({u.scopeLevel === 'GLOBAL' ? 'GERAL' : 
                           u.scopeLevel === 'GB' ? gbs.find(g => g.id === u.scopeId)?.name :
                           u.scopeLevel === 'SGB' ? subs.find(s => s.id === u.scopeId)?.name :
                           postos.find(p => p.id === u.scopeId)?.name || 'S/V'})
                      </span>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(u)} className="p-2 hover:text-blue-600 transition-colors" title="Editar">✏️</button>
                    <button onClick={() => window.confirm("Excluir conta de acesso?") && onDeleteUser(u.id)} className="p-2 hover:text-red-600 transition-colors" title="Remover">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserAdmin;
