
import React, { useState, useRef } from 'react';
import { Viatura, MaterialItem, Posto, ViaturaStatus } from '../types';

interface InventoryManagerProps {
  viaturas: Viatura[];
  postos: Posto[];
  onSaveViatura: (v: Viatura) => void;
  onDeleteViatura: (id: string) => void;
}

/**
 * COMPONENTE DE GESTÃO DE FROTA
 * Permite criar, editar metadados (prefixo/unidade) e gerenciar a lista de materiais.
 * Fidelidade Histórica: Ao mudar o posto da viatura, conferências antigas mantêm o histórico.
 */
const InventoryManager: React.FC<InventoryManagerProps> = ({ viaturas, postos, onSaveViatura, onDeleteViatura }) => {
  const [editingVtrId, setEditingVtrId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<MaterialItem[]>([]);
  const [compartmentOrder, setCompartmentOrder] = useState<string[]>([]); 
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newVtr, setNewVtr] = useState({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });
  const [editMeta, setEditMeta] = useState({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateVtr = async () => {
    if (!newVtr.name || !newVtr.prefix) return alert("Prefixo e Nome são obrigatórios.");
    setIsSaving(true);
    try {
      const vtr: Viatura = {
        id: Math.random().toString(36).substr(2, 9),
        name: newVtr.name,
        prefix: newVtr.prefix,
        postoId: newVtr.postoId,
        status: newVtr.status,
        items: []
      };
      await onSaveViatura(vtr);
      setIsAdding(false);
      setNewVtr({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });
    } finally { setIsSaving(false); }
  };

  const startEditingMeta = (vtr: Viatura) => {
    setIsEditingMeta(vtr.id);
    setEditMeta({ name: vtr.name, prefix: vtr.prefix, postoId: vtr.postoId || '', status: vtr.status });
  };

  const handleSaveMeta = async (vtr: Viatura) => {
    if (!editMeta.prefix || !editMeta.name) return alert("Prefixo e Nome obrigatórios.");
    if (window.confirm("ATENÇÃO: Mudar a unidade da viatura afetará apenas conferências FUTURAS. Históricos passados serão preservados. Confirmar?")) {
        setIsSaving(true);
        try {
            await onSaveViatura({ ...vtr, ...editMeta });
            setIsEditingMeta(null);
        } finally { setIsSaving(false); }
    }
  };

  const startEditingItems = (vtr: Viatura) => {
    if (editingVtrId === vtr.id) {
      setEditingVtrId(null);
      setLocalItems([]);
    } else {
      setEditingVtrId(vtr.id);
      setLocalItems([...vtr.items]);
      setCompartmentOrder(Array.from(new Set(vtr.items.map(i => i.compartment || 'GERAL'))));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 gap-4">
        <div>
           <h3 className="text-xl font-bold text-slate-800 tracking-tighter uppercase">Gestão de Frota</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de unidades e materiais</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-red-700 transition-all">+ Nova Viatura</button>
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95 duration-200">
          <h4 className="font-black mb-6 uppercase tracking-widest text-red-400">Novo Cadastro de Veículo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <input type="text" placeholder="Prefixo (Ex: ABS-20103)" value={newVtr.prefix} onChange={e => setNewVtr({...newVtr, prefix: e.target.value.toUpperCase()})} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none" />
            <input type="text" placeholder="Nome (Ex: Auto Bomba)" value={newVtr.name} onChange={e => setNewVtr({...newVtr, name: e.target.value})} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none" />
            <select value={newVtr.postoId} onChange={e => setNewVtr({...newVtr, postoId: e.target.value})} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none font-bold">
                <option value="">Selecione a Unidade...</option>
                {postos.map(p => <option key={p.id} value={p.id}>{p.name} ({p.municipio})</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateVtr} disabled={isSaving} className="bg-red-600 px-8 py-3 rounded-xl font-black uppercase text-xs">{isSaving ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => setIsAdding(false)} className="bg-slate-700 px-8 py-3 rounded-xl font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {viaturas.map(v => (
          <div key={v.id} className={`bg-white rounded-[2.5rem] border-2 transition-all shadow-sm ${editingVtrId === v.id ? 'border-red-500 ring-4 ring-red-50 col-span-2' : 'border-slate-100 hover:border-slate-200'}`}>
            <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-50">
              <div className="flex-1 w-full">
                {isEditingMeta === v.id ? (
                  <div className="space-y-2 animate-in slide-in-from-left duration-300">
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={editMeta.prefix} onChange={e => setEditMeta({...editMeta, prefix: e.target.value.toUpperCase()})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-black" placeholder="Prefixo" />
                        <input type="text" value={editMeta.name} onChange={e => setEditMeta({...editMeta, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" placeholder="Nome" />
                    </div>
                    <select value={editMeta.postoId} onChange={e => setEditMeta({...editMeta, postoId: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50">
                        <option value="">Sem Unidade Vinculada</option>
                        {postos.map(p => <option key={p.id} value={p.id}>{p.classification || 'Posto'} {p.name} - {p.municipio}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <button onClick={() => handleSaveMeta(v)} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md">Confirmar Alterações</button>
                        <button onClick={() => setIsEditingMeta(null)} className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{v.prefix}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.name}</span>
                    </div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">
                        Unidade Atual: {postos.find(p => p.id === v.postoId)?.name || 'NÃO VINCULADA'} 
                        {postos.find(p => p.id === v.postoId)?.municipio && ` (${postos.find(p => p.id === v.postoId)?.municipio})`}
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditingMeta(v)} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-800 hover:text-white transition-all" title="Remanejar / Editar Dados">⚙️</button>
                <button onClick={() => startEditingItems(v)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${editingVtrId === v.id ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                   {editingVtrId === v.id ? 'Fechar' : 'Editar Materiais'}
                </button>
              </div>
            </div>
            {editingVtrId === v.id && (
              <div className="p-6 bg-slate-50/50 space-y-6">
                <div className="flex gap-2">
                    <button onClick={() => onSaveViatura({...v, items: localItems})} className="ml-auto px-6 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Salvar Todos os Materiais</button>
                </div>
                <div className="space-y-2">
                    {localItems.map(item => (
                        <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-4 group">
                            <span className="text-[10px] font-black text-slate-400 min-w-[100px] uppercase">{item.compartment}</span>
                            <span className="flex-1 text-xs font-bold text-slate-700">{item.name}</span>
                            <button onClick={() => setLocalItems(localItems.filter(i => i.id !== item.id))} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryManager;
