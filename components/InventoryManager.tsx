import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Viatura, MaterialItem, Posto, ViaturaStatus, User, UserRole } from '../types';

interface InventoryManagerProps {
  viaturas: Viatura[];
  postos: Posto[];
  onSaveViatura: (v: Viatura) => void;
  onDeleteViatura: (id: string) => void;
  currentUser: User;
}

/**
 * COMPONENTE: InventoryManager (NÍVEL SÊNIOR)
 * Gerencia o pátio de viaturas e a composição detalhada de materiais.
 * 
 * REGRAS APLICADAS:
 * 1. Renomeação de Frota para VIATURAS.
 * 2. Novas viaturas iniciam sem materiais ou gavetas.
 * 3. Botão explícito para "Adicionar Gaveta".
 * 4. Créditos: Desenvolvido por CAVALIERI 2026.
 * 5. Sem alça de deslize (scrollbars ocultas).
 */
const InventoryManager: React.FC<InventoryManagerProps> = ({ viaturas, postos, onSaveViatura, onDeleteViatura, currentUser }) => {
  const [editingVtr, setEditingVtr] = useState<Viatura | null>(null);
  const [filterPosto, setFilterPosto] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newVtr, setNewVtr] = useState({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });
  
  // Estados para gestão de itens e gavetas
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<Partial<MaterialItem>>({ name: '', specification: '', quantity: 1, compartment: '' });
  const [compartmentOrder, setCompartmentOrder] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<MaterialItem | null>(null);
  
  // Estado para nova gaveta
  const [newGavetaName, setNewGavetaName] = useState('');

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

  // Sincroniza ordem das gavetas quando entra em modo edição
  useEffect(() => {
    if (editingVtr) {
      const uniqueComps = Array.from(new Set(editingVtr.items.map(i => i.compartment || 'GERAL')));
      setCompartmentOrder(uniqueComps);
    } else {
      setCompartmentOrder([]);
    }
  }, [editingVtr?.id]);

  // REGRA DE AGRUPAMENTO: Organiza os materiais respeitando a ordem definida das gavetas (mesmo as vazias)
  const groupedItems = useMemo(() => {
    if (!editingVtr) return {};
    
    // Inicializa o mapa com a ordem definida (preservando gavetas vazias no UI)
    const groups = compartmentOrder.reduce((acc, comp) => {
      acc[comp] = [];
      return acc;
    }, {} as Record<string, MaterialItem[]>);

    // Aloca os itens existentes
    editingVtr.items.forEach(item => {
      const comp = item.compartment || 'GERAL';
      if (!groups[comp]) {
        groups[comp] = [];
        // Se aparecer um item em gaveta não listada na ordem, adiciona ao final
        setCompartmentOrder(prev => prev.includes(comp) ? prev : [...prev, comp]);
      }
      groups[comp].push(item);
    });

    return groups;
  }, [editingVtr?.items, compartmentOrder]);

  /**
   * REGRA: Criação de Viatura Limpa
   * Garante que a viatura venha sem nenhum item ou gaveta pré-definida.
   */
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
        items: [] // REGRA: Lista estritamente limpa.
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
      setEditingItemId(null);
      setCompartmentOrder([]);
    } finally { setIsSaving(false); }
  };

  /**
   * REGRA: Adicionar Gaveta Manualmente
   */
  const handleAddGaveta = () => {
    const name = newGavetaName.trim().toUpperCase();
    if (!name) return alert("Informe o nome da gaveta.");
    if (compartmentOrder.includes(name)) return alert("Gaveta já existente.");
    
    setCompartmentOrder(prev => [...prev, name]);
    setNewGavetaName('');
    // Também preenche o formulário de item para facilitar a primeira adição
    setItemForm(prev => ({ ...prev, compartment: name }));
  };

  const moveCompartment = (direction: 'up' | 'down', index: number) => {
    const newOrder = [...compartmentOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCompartmentOrder(newOrder);
  };

  const handleAddItem = () => {
    if (!itemForm.name || !itemForm.compartment) return alert("Nome e Compartimento são obrigatórios.");
    if (!editingVtr) return;
    
    const newItem: MaterialItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: itemForm.name,
      specification: itemForm.specification || '',
      quantity: Number(itemForm.quantity) || 1,
      compartment: itemForm.compartment.toUpperCase()
    };
    
    setEditingVtr({
      ...editingVtr,
      items: [...editingVtr.items, newItem]
    });
    setItemForm({ name: '', specification: '', quantity: 1, compartment: itemForm.compartment });
  };

  const handleMoveItem = (itemId: string, newComp: string) => {
    if (!editingVtr) return;
    const updatedItems = editingVtr.items.map(i => 
        i.id === itemId ? { ...i, compartment: newComp.toUpperCase() } : i
    );
    setEditingVtr({ ...editingVtr, items: updatedItems });
    // Se a gaveta de destino não existir na ordem (ex: via select), adiciona
    if (!compartmentOrder.includes(newComp.toUpperCase())) {
        setCompartmentOrder(prev => [...prev, newComp.toUpperCase()]);
    }
  };

  const handleUpdateItem = () => {
    if (!editingVtr || !editingItemId) return;
    const updatedItems = editingVtr.items.map(i => 
      i.id === editingItemId ? { ...i, ...itemForm, compartment: itemForm.compartment?.toUpperCase() || 'GERAL' } as MaterialItem : i
    );
    setEditingVtr({ ...editingVtr, items: updatedItems });
    setEditingItemId(null);
    setItemForm({ name: '', specification: '', quantity: 1, compartment: '' });
  };

  const handleRemoveItem = (id: string) => {
    if (!editingVtr) return;
    setEditingVtr({
      ...editingVtr,
      items: editingVtr.items.filter(i => i.id !== id)
    });
  };

  const onDragStart = (item: MaterialItem) => setDraggedItem(item);
  const onDropItem = (compName: string) => {
    if (draggedItem && draggedItem.compartment !== compName) {
        handleMoveItem(draggedItem.id, compName);
    }
    setDraggedItem(null);
  };

  const handleExportCSV = () => {
    if (!editingVtr || editingVtr.items.length === 0) return alert("Não há itens para exportar.");
    const headers = "Nome,Especificacao,Quantidade,Compartimento\n";
    const rows = editingVtr.items.map(i => `"${i.name}","${i.specification}",${i.quantity},"${i.compartment}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Materiais_${editingVtr.prefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingVtr) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const importedItems: MaterialItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (parts && parts.length >= 4) {
            importedItems.push({
              id: Math.random().toString(36).substr(2, 9),
              name: parts[0].replace(/"/g, ''),
              specification: parts[1].replace(/"/g, ''),
              quantity: parseInt(parts[2]) || 1,
              compartment: parts[3].replace(/"/g, '').toUpperCase()
            });
          }
        }
        if (importedItems.length > 0) {
          setEditingVtr({ ...editingVtr, items: [...editingVtr.items, ...importedItems] });
        }
      } catch (err) { alert("Erro ao processar CSV."); }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-2 sm:px-0">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER DE GESTÃO */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200 gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
           <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-blue-950 tracking-tighter uppercase leading-none">Gestão de Viaturas</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Frota Ativa: {filteredViaturas.length} Unidades</p>
           </div>
           {isGlobalUser ? (
             <select value={filterPosto} onChange={e => setFilterPosto(e.target.value)} className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-[10px] uppercase outline-none focus:border-red-500 bg-slate-50 transition-all min-w-[200px] text-blue-950">
                <option value="">TODAS AS UNIDADES</option>
                {postos.map(p => <option key={p.id} value={p.id}>{p.classification || 'Posto'} {p.name}</option>)}
             </select>
           ) : (
             <div className="w-full md:w-auto px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-black text-[10px] uppercase border border-blue-100 text-center">
                UNIDADE: {postos.find(p => p.id === (currentUser.scopeId || currentUser.postoId))?.name || 'Sede'}
             </div>
           )}
        </div>
        {isGlobalUser && (
          <button onClick={() => { setIsAdding(true); setEditingVtr(null); }} className="w-full lg:w-auto bg-red-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:brightness-110 active:scale-95 transition-all">+ Nova Viatura</button>
        )}
      </div>

      {/* MODO ADIÇÃO DE VIATURA */}
      {isAdding && (
        <div className="bg-slate-800 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95">
          <h4 className="font-black mb-6 uppercase tracking-widest text-red-400">Novo Cadastro Operacional</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <input type="text" placeholder="Prefixo (Ex: ABS-2010)" value={newVtr.prefix} onChange={e => setNewVtr({...newVtr, prefix: e.target.value.toUpperCase()})} className="w-full px-4 py-3.5 rounded-xl bg-slate-700 border border-slate-600 text-white outline-none font-bold" />
            <input type="text" placeholder="Nome (Ex: Auto Bomba)" value={newVtr.name} onChange={e => setNewVtr({...newVtr, name: e.target.value})} className="w-full px-4 py-3.5 rounded-xl bg-slate-700 border border-slate-600 text-white outline-none font-bold" />
            <select value={newVtr.postoId} onChange={e => setNewVtr({...newVtr, postoId: e.target.value})} className="w-full px-4 py-3.5 rounded-xl bg-slate-700 border border-slate-600 text-white font-bold outline-none">
                <option value="">Vincular Unidade...</option>
                {postos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={newVtr.status} onChange={e => setNewVtr({...newVtr, status: e.target.value as ViaturaStatus})} className="w-full px-4 py-3.5 rounded-xl bg-slate-700 border border-slate-600 text-white font-bold outline-none">
                <option value={ViaturaStatus.OPERANDO}>OPERANDO</option>
                <option value={ViaturaStatus.RESERVA}>RESERVA</option>
                <option value={ViaturaStatus.BAIXADA}>BAIXADA</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleCreateVtr} disabled={isSaving} className="w-full sm:w-auto bg-red-600 px-8 py-4 rounded-xl font-black uppercase text-xs shadow-lg transition-all">{isSaving ? 'Salvando...' : 'Salvar Viatura'}</button>
            <button onClick={() => setIsAdding(false)} className="w-full sm:w-auto bg-slate-600 px-8 py-4 rounded-xl font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODO EDIÇÃO AVANÇADA DE VIATURA E MATERIAIS */}
      {editingVtr && (
        <div className="bg-blue-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95 space-y-8">
          <div className="flex justify-between items-start border-b border-white/10 pb-6">
            <div>
              <h4 className="font-black uppercase tracking-widest text-blue-400">Edição Técnica: {editingVtr.prefix}</h4>
              <p className="text-[10px] text-blue-200 uppercase font-bold tracking-widest">Ajustes de Parâmetros e Inventário</p>
            </div>
            <button onClick={() => setEditingVtr(null)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input type="text" value={editingVtr.prefix} onChange={e => setEditingVtr({...editingVtr, prefix: e.target.value.toUpperCase()})} className="w-full px-4 py-3.5 rounded-xl bg-blue-800 border border-blue-700 text-white outline-none font-bold" />
              <input type="text" value={editingVtr.name} onChange={e => setEditingVtr({...editingVtr, name: e.target.value})} className="w-full px-4 py-3.5 rounded-xl bg-blue-800 border border-blue-700 text-white outline-none font-bold" />
              <select value={editingVtr.postoId} onChange={e => setEditingVtr({...editingVtr, postoId: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-blue-800 border border-blue-700 text-white font-bold outline-none">
                  {postos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={editingVtr.status} onChange={e => setEditingVtr({...editingVtr, status: e.target.value as ViaturaStatus})} className="w-full px-4 py-3 rounded-xl bg-blue-800 border border-blue-700 text-white font-bold outline-none">
                  <option value={ViaturaStatus.OPERANDO}>OPERANDO</option>
                  <option value={ViaturaStatus.RESERVA}>RESERVA</option>
                  <option value={ViaturaStatus.BAIXADA}>BAIXADA</option>
              </select>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h4 className="font-black uppercase tracking-widest text-emerald-400">Inventário Operacional ({editingVtr.items.length} Itens)</h4>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleExportCSV} className="flex-1 sm:flex-none bg-white/10 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-white/20 transition-all">Exportar CSV</button>
                    <label className="flex-1 sm:flex-none bg-emerald-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-500 transition-all cursor-pointer text-center">
                        Importar CSV
                        <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="hidden" />
                    </label>
                </div>
            </div>

            {/* ÁREA DE GESTÃO DE COMPARTIMENTOS (GAVETAS) */}
            <div className="bg-white/5 p-5 rounded-2xl mb-6 border border-white/10">
                <div className="flex flex-col sm:flex-row items-end gap-3">
                    <div className="flex-1 w-full">
                        <label className="text-[9px] font-bold text-blue-300 uppercase ml-1">Registrar Nova Gaveta</label>
                        <input type="text" placeholder="NOME DA GAVETA (EX: GAVETA 01)" value={newGavetaName} onChange={e => setNewGavetaName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-blue-950/30 border border-blue-800 text-xs font-bold outline-none text-white focus:border-blue-400 transition-all" />
                    </div>
                    <button onClick={handleAddGaveta} className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-[10px] uppercase transition-all shadow-md">Adicionar Gaveta</button>
                </div>
            </div>

            {/* FORMULÁRIO DE ITEM */}
            <div className="bg-white/5 p-5 rounded-2xl mb-8 border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
                    <div className="sm:col-span-4">
                        <label className="text-[9px] font-bold text-blue-300 uppercase ml-1">Material</label>
                        <input type="text" placeholder="Nome do Material" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-blue-950/30 border border-blue-800 text-xs font-bold outline-none text-white focus:border-blue-400 transition-all" />
                    </div>
                    <div className="sm:col-span-4">
                        <label className="text-[9px] font-bold text-blue-300 uppercase ml-1">Especificação</label>
                        <input type="text" placeholder="Especificação técnica" value={itemForm.specification} onChange={e => setItemForm({...itemForm, specification: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-blue-950/30 border border-blue-800 text-xs font-bold outline-none text-white focus:border-blue-400 transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-[9px] font-bold text-blue-300 uppercase ml-1">Quantidade</label>
                        <input type="number" placeholder="Qt" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 1})} className="w-full px-4 py-3 rounded-xl bg-blue-950/30 border border-blue-800 text-xs font-bold outline-none text-white focus:border-blue-400 transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-[9px] font-bold text-blue-300 uppercase ml-1">Vincular à Gaveta</label>
                        <select value={itemForm.compartment} onChange={e => setItemForm({...itemForm, compartment: e.target.value.toUpperCase()})} className="w-full px-4 py-3 rounded-xl bg-blue-950/30 border border-blue-800 text-xs font-bold outline-none text-white focus:border-blue-400 transition-all">
                            <option value="">Selecione...</option>
                            {compartmentOrder.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    {editingItemId ? (
                        <>
                            <button onClick={() => { setEditingItemId(null); setItemForm({ name: '', specification: '', quantity: 1, compartment: '' }); }} className="px-6 py-2.5 bg-slate-600 rounded-xl font-black text-[10px] uppercase hover:bg-slate-500 transition-all">Cancelar</button>
                            <button onClick={handleUpdateItem} className="px-8 py-2.5 bg-blue-500 rounded-xl font-black text-[10px] uppercase hover:bg-blue-400 transition-all shadow-lg">Confirmar Alteração</button>
                        </>
                    ) : (
                        <button onClick={handleAddItem} className="w-full sm:w-auto px-12 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-[10px] uppercase transition-all shadow-md">Adicionar Item</button>
                    )}
                </div>
            </div>

            {/* LISTA AGRUPADA COM REORDENAÇÃO E SUPORTE A GAVETAS VAZIAS */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
                {compartmentOrder.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                        <p className="text-blue-300/50 font-black uppercase text-xs tracking-widest">Aguardando registro de materiais ou gavetas.</p>
                    </div>
                ) : compartmentOrder.map((compName, idx) => (
                    <div 
                        key={compName} 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropItem(compName)}
                        className={`space-y-3 p-4 rounded-3xl transition-all ${draggedItem && draggedItem.compartment !== compName ? 'bg-white/5 border border-dashed border-blue-400/30 ring-2 ring-blue-500/10 scale-[0.99]' : 'bg-transparent'}`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <h5 className="font-black text-[11px] text-blue-300 uppercase tracking-[0.3em] bg-blue-950 px-3 py-1 rounded-lg border border-blue-800">{compName}</h5>
                                <span className="text-[8px] font-bold text-blue-400 opacity-50">({groupedItems[compName]?.length || 0} ITENS)</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => moveCompartment('up', idx)} disabled={idx === 0} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-20 transition-all text-[10px]">▲</button>
                                <button onClick={() => moveCompartment('down', idx)} disabled={idx === compartmentOrder.length - 1} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-20 transition-all text-[10px]">▼</button>
                                <button onClick={() => { if(confirm("Remover esta gaveta?")) setCompartmentOrder(prev => prev.filter(c => c !== compName)) }} className="p-1.5 bg-white/5 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px]">🗑</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {groupedItems[compName]?.length === 0 && (
                                <div className="p-4 border border-dashed border-white/5 rounded-2xl text-center">
                                    <p className="text-[8px] font-black uppercase text-white/20">Gaveta Vazia</p>
                                </div>
                            )}
                            {(groupedItems[compName] || []).map(item => (
                                <div 
                                    key={item.id} 
                                    draggable
                                    onDragStart={() => onDragStart(item)}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-center group cursor-move ${editingItemId === item.id ? 'bg-blue-600 border-white shadow-xl' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <div className="flex-1 w-full sm:w-auto">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 flex items-center justify-center bg-blue-950/50 rounded-lg text-[10px] font-black border border-white/10">{item.quantity}</span>
                                            <p className="text-xs font-black uppercase tracking-tight">{item.name}</p>
                                        </div>
                                        {item.specification && (
                                            <p className="text-[10px] text-white/40 font-bold mt-1 ml-10 italic">{item.specification}</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-none border-white/5">
                                        <div className="flex flex-col items-end">
                                            <label className="text-[8px] font-black text-blue-300 uppercase opacity-40 mb-1">Mover Gaveta</label>
                                            <select 
                                                value={item.compartment} 
                                                onChange={(e) => handleMoveItem(item.id, e.target.value)}
                                                className="bg-blue-950/50 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none focus:border-blue-400 transition-all"
                                            >
                                                {compartmentOrder.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <button onClick={() => { setEditingItemId(item.id); setItemForm(item); }} className="p-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase">Edição</button>
                                            <button onClick={() => handleRemoveItem(item.id)} className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white rounded-xl transition-all text-[9px] font-black">✕</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Desenvolvido por CAVALIERI 2026</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button onClick={handleUpdateVtr} disabled={isSaving} className="w-full sm:w-auto bg-emerald-600 px-10 py-4 rounded-xl font-black uppercase text-xs shadow-lg transition-all hover:brightness-110">{isSaving ? 'Gravando...' : 'Finalizar Configuração'}</button>
              <button onClick={() => { setEditingVtr(null); setCompartmentOrder([]); }} className="w-full sm:w-auto bg-slate-700 px-10 py-4 rounded-xl font-black uppercase text-xs">Descartar</button>
            </div>
          </div>
        </div>
      )}

      {/* GRID DE CARDS DAS VIATURAS */}
      {!editingVtr && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-10">
          {filteredViaturas.length === 0 ? (
            <div className="col-span-full py-20 text-center opacity-40">
              <p className="font-black uppercase text-slate-500 tracking-widest text-xs">Nenhuma viatura localizada nesta unidade.</p>
            </div>
          ) : filteredViaturas.map(v => (
            <div key={v.id} className="bg-white rounded-[2rem] border-2 border-slate-100 p-5 sm:p-6 flex flex-col justify-between group hover:border-blue-500 transition-all shadow-sm gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-[6rem] pointer-events-none -mr-4 -mt-4 text-blue-900">🚒</div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${v.status === ViaturaStatus.OPERANDO ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'} shadow-sm`}></span>
                  <h4 className="text-2xl font-black text-blue-950 tracking-tighter uppercase">{v.prefix}</h4>
                </div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-3">{postos.find(p => p.id === v.postoId)?.name || 'UNIDADE INDEFINIDA'}</p>
                <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${v.status === ViaturaStatus.OPERANDO ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{v.status}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{v.items?.length || 0} ITENS NO INVENTÁRIO</span>
                </div>
              </div>
              <div className="flex gap-2 relative z-10">
                <button onClick={() => setEditingVtr(v)} className="flex-1 py-3 px-5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-blue-100">Configurar Viatura</button>
                {isGlobalUser && <button onClick={() => window.confirm("Excluir Viatura permanentemente?") && onDeleteViatura(v.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] text-center mt-10">Desenvolvido por CAVALIERI 2026</p>
    </div>
  );
};

export default InventoryManager;