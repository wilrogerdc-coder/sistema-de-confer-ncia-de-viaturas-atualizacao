
import React, { useState, useRef } from 'react';
import { Viatura, MaterialItem, Posto, ViaturaStatus } from '../types';

interface InventoryManagerProps {
  viaturas: Viatura[];
  postos: Posto[];
  onSaveViatura: (v: Viatura) => void;
  onDeleteViatura: (id: string) => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ viaturas, postos, onSaveViatura, onDeleteViatura }) => {
  const [editingVtrId, setEditingVtrId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<MaterialItem[]>([]);
  const [compartmentOrder, setCompartmentOrder] = useState<string[]>([]); 
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newVtr, setNewVtr] = useState({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateVtr = async () => {
    if (!newVtr.name || !newVtr.prefix) {
      alert("Por favor, preencha o Prefixo e o Nome da viatura.");
      return;
    }
    if (!window.confirm(`Deseja cadastrar a viatura ${newVtr.prefix}?`)) return;
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
      setNewVtr({ name: '', prefix: '', postoId: '', status: ViaturaStatus.OPERANDO });
      setIsAdding(false);
    } catch (error) {
      alert("Erro ao criar viatura.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingItems = (vtr: Viatura) => {
    if (editingVtrId === vtr.id) {
      setEditingVtrId(null);
      setLocalItems([]);
      setCompartmentOrder([]);
    } else {
      setEditingVtrId(vtr.id);
      setLocalItems([...vtr.items]);
      const uniqueComps = Array.from(new Set(vtr.items.map(i => i.compartment || 'GERAL')));
      if (uniqueComps.length === 0) uniqueComps.push('GAVETA 01');
      setCompartmentOrder(uniqueComps);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ["COMPARTIMENTO", "NOME DO ITEM", "ESPECIFICACAO", "QUANTIDADE"];
    const exampleRow = ["GAVETA 01", "Chave de Mangueira", "Latão", "2"];
    const bom = "\uFEFF"; 
    const csvContent = bom + [headers.join(";"), exampleRow.join(";")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_importacao_viatura.csv";
    link.click();
  };

  const handleExportIndividual = (vtr: Viatura) => {
    const headers = ["COMPARTIMENTO", "NOME DO ITEM", "ESPECIFICACAO", "QUANTIDADE"];
    const rows = vtr.items.map(item => [
      item.compartment, 
      item.name, 
      item.specification, 
      item.quantity
    ]);
    
    const bom = "\uFEFF";
    const csvContent = bom + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Backup_Lista_${vtr.prefix}.csv`;
    link.click();
  };

  const handleExportAllLists = () => {
    if (!window.confirm("Deseja exportar a relação de materiais de toda a frota?")) return;
    const headers = ["VIATURA", "PREFIXO", "COMPARTIMENTO", "MATERIAL", "ESPECIFICACAO", "QUANTIDADE"];
    const rows = viaturas.flatMap(v => 
      v.items.map(item => [
        v.name, 
        v.prefix, 
        item.compartment, 
        item.name, 
        item.specification, 
        item.quantity
      ])
    );
    
    const bom = "\uFEFF";
    const csvContent = bom + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Frota_Completa_Materiais.csv";
    link.click();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) processCSV(text);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const processCSV = (csvText: string) => {
    try {
      const lines = csvText.split(/\r\n|\n/);
      const newItems: MaterialItem[] = [];
      const newCompartments = new Set<string>(compartmentOrder); 
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const separator = line.includes(';') ? ';' : ',';
        const cols = line.split(separator);
        if (cols.length < 2) continue; 
        const compartment = cols[0]?.trim().toUpperCase() || 'GERAL';
        const name = cols[1]?.trim();
        const specification = cols[2]?.trim() || '';
        const quantity = parseInt(cols[3]?.trim()) || 1;
        if (name) {
          newCompartments.add(compartment);
          newItems.push({ id: Math.random().toString(36).substr(2, 9), name, specification, quantity, compartment });
        }
      }
      if (newItems.length === 0) return alert("Nenhum item válido encontrado.");
      if (window.confirm(`Confirmar a importação de ${newItems.length} itens para esta lista?`)) {
        setCompartmentOrder(Array.from(newCompartments));
        setLocalItems(prev => [...prev, ...newItems]);
      }
    } catch (error) {
      alert("Erro ao processar CSV.");
    }
  };

  const handleAddCompartment = () => {
    const name = prompt("Nome da nova gaveta/compartimento:");
    if (name && !compartmentOrder.includes(name.toUpperCase())) {
      setCompartmentOrder([...compartmentOrder, name.toUpperCase()]);
    }
  };

  const handleRenameCompartment = (oldName: string, newName: string) => {
    const normalizedNew = newName.toUpperCase();
    if (!normalizedNew || compartmentOrder.includes(normalizedNew)) return;
    setCompartmentOrder(prev => prev.map(c => c === oldName ? normalizedNew : c));
    setLocalItems(prev => prev.map(item => item.compartment === oldName ? { ...item, compartment: normalizedNew } : item));
  };

  const handleDeleteCompartment = (compName: string) => {
    if (window.confirm(`ATENÇÃO: Você está prestes a EXCLUIR a gaveta "${compName}" e TODOS os itens dentro dela. Confirma?`)) {
      setCompartmentOrder(prev => prev.filter(c => c !== compName));
      setLocalItems(prev => prev.filter(i => i.compartment !== compName));
    }
  };

  const moveCompartment = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...compartmentOrder];
    if (direction === 'up' && index > 0) [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    else if (direction === 'down' && index < newOrder.length - 1) [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    setCompartmentOrder(newOrder);
  };

  const handleAddItemToCompartment = (compName: string) => {
    setLocalItems([...localItems, { id: Math.random().toString(36).substr(2, 9), name: 'Novo Item', specification: '', quantity: 1, compartment: compName }]);
  };

  const handleUpdateLocalItem = (itemId: string, updates: Partial<MaterialItem>) => {
    setLocalItems(localItems.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  const handleRemoveLocalItem = (itemId: string) => {
    if(window.confirm("Deseja remover este item da lista?")) setLocalItems(localItems.filter(i => i.id !== itemId));
  };

  // Nova função para mover itens
  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const items = [...localItems];
    const currentIndex = items.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;

    const currentItem = items[currentIndex];
    let targetIndex = -1;

    // A lógica aqui é encontrar o índice do próximo item QUE PERTENCE AO MESMO COMPARTIMENTO
    // pois o array localItems contém itens de todos os compartimentos misturados ou ordenados
    if (direction === 'up') {
      // Procura o item anterior do mesmo compartimento
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (items[i].compartment === currentItem.compartment) {
          targetIndex = i;
          break;
        }
      }
    } else {
      // Procura o item seguinte do mesmo compartimento
      for (let i = currentIndex + 1; i < items.length; i++) {
        if (items[i].compartment === currentItem.compartment) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex !== -1) {
      // Troca os itens de posição no array principal
      [items[currentIndex], items[targetIndex]] = [items[targetIndex], items[currentIndex]];
      setLocalItems(items);
    }
  };

  const saveAllItems = (vtrId: string) => {
    const vtr = viaturas.find(v => v.id === vtrId);
    if (!vtr) return;
    if (window.confirm(`Confirma a atualização da estrutura de materiais da viatura ${vtr.prefix}?`)) {
      // Ordena primeiro pelos compartimentos (para garantir agrupamento), mas mantém a ordem relativa dos itens dentro do compartimento
      const sortedItems = [...localItems].sort((a, b) => {
        const compA = compartmentOrder.indexOf(a.compartment);
        const compB = compartmentOrder.indexOf(b.compartment);
        // Se forem compartimentos diferentes, ordena pelo compartimento
        if (compA !== compB) return compA - compB;
        // Se for o mesmo compartimento, mantém a ordem original do array localItems (que foi alterada pelo moveItem)
        return 0;
      });
      
      onSaveViatura({ ...vtr, items: sortedItems });
      setEditingVtrId(null);
    }
  };

  const handleUpdateVtrStatus = async (vtrId: string, status: ViaturaStatus) => {
    const vtr = viaturas.find(v => v.id === vtrId);
    if (!vtr || vtr.status === status) return;
    if (window.confirm(`Confirma a alteração do status da viatura ${vtr.prefix} para ${status}?`)) {
      setUpdatingStatusId(vtrId);
      try { await onSaveViatura({ ...vtr, status }); } catch(e) { alert("Erro ao atualizar status."); } finally { setUpdatingStatusId(null); }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 gap-4">
        <div>
           <h3 className="text-xl font-bold text-slate-800 tracking-tighter uppercase">Gestão de Frota</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de materiais e exportação</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handleExportAllLists} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 rounded-2xl font-black uppercase text-[10px] transition-all shadow-sm border border-slate-200 flex items-center justify-center gap-2 group">
             <span>📥</span>
             <span className="group-hover:translate-x-0.5 transition-transform">Exportar Frota (CSV)</span>
          </button>
          <button onClick={() => setIsAdding(true)} className="flex-1 md:flex-none bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] transition-all shadow-lg hover:shadow-red-200 flex items-center justify-center gap-2">
             <span>+</span> Nova Viatura
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95 duration-200">
          <h4 className="font-black mb-6 uppercase tracking-widest text-red-400">Cadastro de Veículo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 pl-1">Prefixo</label><input type="text" placeholder="ABS-20103" value={newVtr.prefix} onChange={e => setNewVtr({...newVtr, prefix: e.target.value.toUpperCase()})} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-red-500" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 pl-1">Nome</label><input type="text" placeholder="Auto Bomba" value={newVtr.name} onChange={e => setNewVtr({...newVtr, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-red-500" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 pl-1">Posto</label><select value={newVtr.postoId} onChange={e => setNewVtr({...newVtr, postoId: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none font-bold"><option value="">Selecione...</option>{postos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 pl-1">Status</label><select value={newVtr.status} onChange={e => setNewVtr({...newVtr, status: e.target.value as ViaturaStatus})} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none font-bold"><option value={ViaturaStatus.OPERANDO}>OPERANDO</option><option value={ViaturaStatus.RESERVA}>RESERVA</option><option value={ViaturaStatus.BAIXADA}>BAIXADA</option></select></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateVtr} disabled={isSaving} className="bg-red-600 px-8 py-3 rounded-xl font-black uppercase text-xs">{isSaving ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => setIsAdding(false)} className="bg-slate-700 px-8 py-3 rounded-xl font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {viaturas.map(v => (
          <div key={v.id} className={`bg-white rounded-[2.5rem] border-2 transition-all shadow-sm ${editingVtrId === v.id ? 'border-red-500 ring-4 ring-red-50 col-span-1 md:col-span-2 shadow-xl' : 'border-slate-100 hover:border-slate-200'} ${updatingStatusId === v.id ? 'opacity-80' : ''}`}>
            <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50">
              <div className="relative">
                <div className="flex items-center gap-3">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{v.prefix}</h4>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${v.status === ViaturaStatus.OPERANDO ? 'border-green-200 bg-green-50 text-green-700' : v.status === ViaturaStatus.RESERVA ? 'border-yellow-200 bg-yellow-50 text-yellow-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{v.status}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{v.name}</p>
              </div>
              <div className="flex gap-2 items-center">
                <select value={v.status} onChange={(e) => handleUpdateVtrStatus(v.id, e.target.value as ViaturaStatus)} disabled={!!updatingStatusId || editingVtrId === v.id} className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-black outline-none focus:border-red-500 cursor-pointer"><option value={ViaturaStatus.OPERANDO}>OPERANDO</option><option value={ViaturaStatus.RESERVA}>RESERVA</option><option value={ViaturaStatus.BAIXADA}>BAIXADA</option></select>
                
                <button onClick={() => handleExportIndividual(v)} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm group" title="Backup da Lista (CSV)">
                  <span className="group-hover:-translate-y-0.5 transition-transform">📤</span>
                </button>
                
                <button onClick={() => startEditingItems(v)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${editingVtrId === v.id ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105'}`}>
                   {editingVtrId === v.id ? 'Fechar Edição' : 'Editar Lista'}
                </button>
                
                {editingVtrId !== v.id && (
                  <button onClick={() => window.confirm(`Deseja EXCLUIR permanentemente a viatura ${v.prefix} do sistema?`) && onDeleteViatura(v.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100 group">
                    <span className="group-hover:scale-110 transition-transform">🗑</span>
                  </button>
                )}
              </div>
            </div>
            {editingVtrId === v.id && (
              <div className="p-6 bg-slate-50/50">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                   <div className="flex flex-wrap gap-2">
                     <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-[9px] font-black uppercase border border-green-100 transition-colors">📥 Modelo CSV</button>
                     <button onClick={handleImportClick} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[9px] font-black uppercase border border-blue-100 transition-colors">📤 Importar CSV</button>
                     <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                     <button onClick={handleAddCompartment} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase transition-colors">📂 Nova Gaveta</button>
                   </div>
                   <button onClick={() => saveAllItems(v.id)} className="px-8 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-200 hover:bg-red-700 hover:scale-105 transition-all">
                      Salvar Alterações
                   </button>
                </div>

                <div className="space-y-6">
                  {compartmentOrder.map((compName, index) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
                      <div className="bg-slate-100 p-3 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex flex-col gap-0.5"><button onClick={() => moveCompartment(index, 'up')} disabled={index === 0} className="w-6 h-4 border rounded text-[8px] bg-white hover:bg-slate-50">▲</button><button onClick={() => moveCompartment(index, 'down')} disabled={index === compartmentOrder.length - 1} className="w-6 h-4 border rounded text-[8px] bg-white hover:bg-slate-50">▼</button></div>
                          <input type="text" value={compName} onChange={(e) => handleRenameCompartment(compName, e.target.value.toUpperCase())} className="bg-transparent font-black text-slate-700 text-xs uppercase px-2 outline-none w-full md:w-64" />
                        </div>
                        <div className="flex gap-2"><button onClick={() => handleAddItemToCompartment(compName)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase">+ Item</button><button onClick={() => handleDeleteCompartment(compName)} className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-600 rounded-lg">🗑</button></div>
                      </div>
                      <div className="p-2 space-y-1">
                        {localItems.filter(i => i.compartment === compName).map((item, idx, arr) => (
                          <div key={item.id} className="flex flex-col md:flex-row gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                            {/* Botões de Mover Item */}
                            <div className="flex flex-col gap-0.5 mr-1">
                              <button onClick={() => moveItem(item.id, 'up')} disabled={idx === 0} className="w-5 h-3 border rounded text-[6px] flex items-center justify-center bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-slate-600">▲</button>
                              <button onClick={() => moveItem(item.id, 'down')} disabled={idx === arr.length - 1} className="w-5 h-3 border rounded text-[6px] flex items-center justify-center bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-slate-600">▼</button>
                            </div>
                            
                            <input value={item.name} onChange={e => handleUpdateLocalItem(item.id, { name: e.target.value })} className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none w-full" placeholder="Nome" />
                            <input value={item.specification} onChange={e => handleUpdateLocalItem(item.id, { specification: e.target.value })} className="flex-1 bg-transparent text-[10px] text-slate-500 outline-none w-full" placeholder="Especificação" />
                            <div className="flex items-center gap-2 w-full md:w-auto"><span className="text-[8px] font-black text-slate-400">Qtd:</span><input type="number" value={item.quantity} onChange={e => handleUpdateLocalItem(item.id, { quantity: parseInt(e.target.value) || 0 })} className="w-12 text-center text-xs font-black bg-white border rounded py-1" /><button onClick={() => handleRemoveLocalItem(item.id)} className="text-slate-300 hover:text-red-500 px-2 font-bold">✕</button></div>
                          </div>
                        ))}
                      </div>
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
