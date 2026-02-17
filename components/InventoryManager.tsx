
import React, { useState, useMemo } from 'react';
import { Viatura, MaterialItem, Posto, ViaturaStatus, User, UserRole } from '../types';

interface InventoryManagerProps {
  viaturas: Viatura[];
  postos: Posto[];
  onSaveViatura: (v: Viatura) => void;
  onDeleteViatura: (id: string) => void;
  currentUser: User;
}

/**
 * COMPONENTE: InventoryManager
 * Gerencia o cadastro e a edição das viaturas da frota.
 * Permite vinculação hierárquica a Postos específicos.
 */
const InventoryManager: React.FC<InventoryManagerProps> = ({ viaturas, postos, onSaveViatura, onDeleteViatura, currentUser }) => {
  const [editingVtr, setEditingVtr] = useState<Viatura | null>(null);
  const [filterPosto, setFilterPosto] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newVtr, setNewVtr] = useState({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });

  const isGlobalUser = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER || currentUser.scopeLevel === 'GLOBAL';

  const filteredViaturas = useMemo(() => {
    let list = viaturas;
    if (!isGlobalUser) {
      const linkedPostoId = currentUser.scopeId || currentUser.postoId;
      list = list.filter(v => v.postoId === linkedPostoId);
    } else if (filterPosto) {
      list = list.filter(v => v.postoId === filterPosto);
    }
    return list;
  }, [viaturas, filterPosto, currentUser, isGlobalUser]);

  const handleCreateVtr = async () => {
    if (!newVtr.name || !newVtr.prefix) return alert("Prefixo e Nome são obrigatórios.");
    setIsSaving(true);
    try {
      const scopeId = newVtr.postoId || currentUser.scopeId || currentUser.postoId || '';
      await onSaveViatura({
        id: Math.random().toString(36).substr(2, 9),
        name: newVtr.name,
        prefix: newVtr.prefix,
        postoId: scopeId,
        status: newVtr.status,
        items: []
      });
      setIsAdding(false);
      setNewVtr({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });
    } finally { setIsSaving(false); }
  };

  const handleUpdateVtr = async () => {
    if (!editingVtr?.name || !editingVtr?.prefix) return alert("Prefixo e Nome são obrigatórios.");
    setIsSaving(true);
    try {
      await onSaveViatura(editingVtr);
      setEditingVtr(null);
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
           <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tighter uppercase leading-none">Gestão de Frota</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Frota Visível: {filteredViaturas.length} Viaturas</p>
           </div>
           
           {isGlobalUser ? (
             <select 
                value={filterPosto} 
                onChange={e => setFilterPosto(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-[10px] uppercase outline-none focus:border-red-500 bg-slate-50 transition-all min-w-[200px]"
             >
                <option value="">TODAS AS UNIDADES</option>
                {postos.map(p => <option key={p.id} value={p.id}>{p.classification || 'Posto'} {p.name}</option>)}
             </select>
           ) : (
             <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase border border-blue-100">
                UNIDADE: {postos.find(p => p.id === (currentUser.scopeId || currentUser.postoId))?.name || 'Sede'}
             </div>
           )}
        </div>
        
        {isGlobalUser && (
          <button onClick={() => { setIsAdding(true); setEditingVtr(null); }} className="w-full lg:w-auto bg-red-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:brightness-110 active:scale-95 transition-all">+ Nova Viatura</button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95">
          <h4 className="font-black mb-6 uppercase tracking-widest text-red-400">Novo Cadastro Operacional</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <input type="text" placeholder="Prefixo (Ex: ABS-2010)" value={newVtr.prefix} onChange={e => setNewVtr({...newVtr, prefix: e.target.value.toUpperCase()})} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none font-bold" />
            <input type="text" placeholder="Nome (Ex: Auto Bomba)" value={newVtr.name} onChange={e => setNewVtr({...newVtr, name: e.target.value})} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none font-bold" />
            <select value={newVtr.postoId} onChange={e => setNewVtr({...newVtr, postoId: e.target.value})} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold">
                <option value="">Vincular Unidade...</option>
                {postos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={newVtr.status} onChange={e => setNewVtr({...newVtr, status: e.target.value as ViaturaStatus})} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold">
                <option value={ViaturaStatus.OPERANDO}>OPERANDO</option>
                <option value={ViaturaStatus.RESERVA}>RESERVA</option>
                <option value={ViaturaStatus.BAIXADA}>BAIXADA</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateVtr} disabled={isSaving} className="bg-red-600 px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg transition-all">{isSaving ? 'Salvando...' : 'Salvar Dados'}</button>
            <button onClick={() => setIsAdding(false)} className="bg-slate-700 px-8 py-3 rounded-xl font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {editingVtr && (
        <div className="bg-blue-900 p-8 rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95">
          <h4 className="font-black mb-6 uppercase tracking-widest text-blue-400">Editar Viatura / Vinculação</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <input type="text" placeholder="Prefixo" value={editingVtr.prefix} onChange={e => setEditingVtr({...editingVtr, prefix: e.target.value.toUpperCase()})} className="px-4 py-3 rounded-xl bg-blue-800 border border-blue-700 text-white outline-none font-bold" />
            <input type="text" placeholder="Nome" value={editingVtr.name} onChange={e => setEditingVtr({...editingVtr, name: e.target.value})} className="px-4 py-3 rounded-xl bg-blue-800 border border-blue-700 text-white outline-none font-bold" />
            <select value={editingVtr.postoId} onChange={e => setEditingVtr({...editingVtr, postoId: e.target.value})} className="px-4 py-3 rounded-xl bg-blue-800 border border-blue-700 text-white font-bold">
                <option value="">Vincular Unidade...</option>
                {postos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={editingVtr.status} onChange={e => setEditingVtr({...editingVtr, status: e.target.value as ViaturaStatus})} className="px-4 py-3 rounded-xl bg-blue-800 border border-blue-700 text-white font-bold">
                <option value={ViaturaStatus.OPERANDO}>OPERANDO</option>
                <option value={ViaturaStatus.RESERVA}>RESERVA</option>
                <option value={ViaturaStatus.BAIXADA}>BAIXADA</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleUpdateVtr} disabled={isSaving} className="bg-blue-600 px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg transition-all">{isSaving ? 'Gravando...' : 'Atualizar Dados'}</button>
            <button onClick={() => setEditingVtr(null)} className="bg-slate-700 px-8 py-3 rounded-xl font-black uppercase text-xs">Descartar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
        {filteredViaturas.length === 0 ? (
          <div className="col-span-full py-20 text-center opacity-40">
            <p className="font-black uppercase text-slate-400 tracking-widest">Nenhuma viatura localizada nesta consulta.</p>
          </div>
        ) : filteredViaturas.map(v => (
          <div key={v.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-6 flex justify-between items-center group hover:border-red-500 transition-all shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${v.status === ViaturaStatus.OPERANDO ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}></span>
                <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{v.prefix}</h4>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{postos.find(p => p.id === v.postoId)?.name || 'UNIDADE NÃO DEFINIDA'}</p>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${v.status === ViaturaStatus.OPERANDO ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{v.status}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingVtr(v)} className="p-3 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl transition-all text-xs font-black uppercase">Editar</button>
              {isGlobalUser && <button onClick={() => window.confirm("Excluir Viatura permanentemente?") && onDeleteViatura(v.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryManager;
