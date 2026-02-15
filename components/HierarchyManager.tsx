
import React, { useState } from 'react';
import { GB, Subgrupamento, Posto } from '../types';

interface HierarchyManagerProps {
  gbs: GB[];
  subs: Subgrupamento[];
  postos: Posto[];
  onSaveGB: (gb: GB) => void;
  onDeleteGB: (id: string) => void;
  onSaveSub: (sub: Subgrupamento) => void;
  onDeleteSub: (id: string) => void;
  onSavePosto: (posto: Posto) => void;
  onDeletePosto: (id: string) => void;
}

const HierarchyManager: React.FC<HierarchyManagerProps> = ({ 
  gbs, subs, postos, onSaveGB, onDeleteGB, onSaveSub, onDeleteSub, onSavePosto, onDeletePosto 
}) => {
  const [newGb, setNewGb] = useState('');
  const [newSub, setNewSub] = useState({ name: '', gbId: '' });
  const [newPosto, setNewPosto] = useState({ name: '', subId: '', classification: 'Posto', municipio: '' });
  const [editingPosto, setEditingPosto] = useState<Posto | null>(null);

  const handleEditPosto = (p: Posto) => {
    setEditingPosto(p);
  };

  const handleSaveEditPosto = () => {
    if (editingPosto) {
      onSavePosto(editingPosto);
      setEditingPosto(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* GB Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tighter">1. Grupamentos (GB)</h3>
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Nome do Grupamento (Ex: 20º GB)"
            value={newGb}
            onChange={e => setNewGb(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold focus:ring-4 focus:ring-red-50 outline-none"
          />
          <button 
            onClick={() => { if(newGb) onSaveGB({ id: Date.now().toString(), name: newGb }); setNewGb(''); }}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs shadow-lg shadow-red-100"
          >
            Adicionar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gbs.map(gb => (
            <div key={gb.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
              <span className="font-bold text-slate-700">{gb.name}</span>
              <button onClick={() => window.confirm(`Deseja EXCLUIR o grupamento "${gb.name}"?`) && onDeleteGB(gb.id)} className="text-red-500 hover:scale-110 transition-transform">🗑️</button>
            </div>
          ))}
        </div>
      </div>

      {/* Sub Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tighter">2. Subgrupamentos (SGB)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
          <select 
            value={newSub.gbId}
            onChange={e => setNewSub({ ...newSub, gbId: e.target.value })}
            className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none"
          >
            <option value="">Selecione o GB</option>
            {gbs.map(gb => <option key={gb.id} value={gb.id}>{gb.name}</option>)}
          </select>
          <input 
            type="text" 
            placeholder="Nome do Subgrupamento"
            value={newSub.name}
            onChange={e => setNewSub({ ...newSub, name: e.target.value })}
            className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none"
          />
          <button 
            onClick={() => { if(newSub.gbId && newSub.name) { onSaveSub({ id: Date.now().toString(), gbId: newSub.gbId, name: newSub.name }); setNewSub({ name: '', gbId: '' }); }}}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs"
          >
            Adicionar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.map(sub => (
            <div key={sub.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700">{sub.name}</span>
                <button onClick={() => window.confirm(`Excluir subgrupamento "${sub.name}"?`) && onDeleteSub(sub.id)} className="text-red-500">🗑️</button>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase">{gbs.find(g => g.id === sub.gbId)?.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Posto Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tighter">3. Postos / Pelotões / Bases</h3>
        
        {editingPosto ? (
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6 animate-in zoom-in-95">
            <h4 className="text-sm font-black text-blue-800 uppercase mb-4 tracking-widest">Editando Unidade</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
               <input type="text" value={editingPosto.classification} onChange={e => setEditingPosto({...editingPosto, classification: e.target.value})} className="px-4 py-2 rounded-xl border border-blue-200 outline-none font-bold text-xs" placeholder="Classificação" />
               <input type="text" value={editingPosto.name} onChange={e => setEditingPosto({...editingPosto, name: e.target.value})} className="px-4 py-2 rounded-xl border border-blue-200 outline-none font-bold text-xs" placeholder="Nome" />
               <input type="text" value={editingPosto.municipio} onChange={e => setEditingPosto({...editingPosto, municipio: e.target.value})} className="px-4 py-2 rounded-xl border border-blue-200 outline-none font-bold text-xs" placeholder="Município" />
               <div className="flex gap-2">
                 <button onClick={handleSaveEditPosto} className="flex-1 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase">Salvar</button>
                 <button onClick={() => setEditingPosto(null)} className="flex-1 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <select 
              value={newPosto.subId}
              onChange={e => setNewPosto({ ...newPosto, subId: e.target.value })}
              className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none"
            >
              <option value="">Selecione o SGB</option>
              {subs.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
            
            <input 
              type="text" 
              placeholder="Classificação (Ex: Pelotão)"
              value={newPosto.classification}
              onChange={e => setNewPosto({ ...newPosto, classification: e.target.value })}
              className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none"
              list="classification-options"
            />
            <datalist id="classification-options">
              <option value="Posto" />
              <option value="Pelotão" />
              <option value="Base" />
              <option value="Estação" />
            </datalist>

            <input 
              type="text" 
              placeholder="Nome (Ex: de Birigui)"
              value={newPosto.name}
              onChange={e => setNewPosto({ ...newPosto, name: e.target.value })}
              className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none"
            />

            <input 
              type="text" 
              placeholder="Município (Ex: Birigui)"
              value={newPosto.municipio}
              onChange={e => setNewPosto({ ...newPosto, municipio: e.target.value })}
              className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none"
            />
            
            <button 
              onClick={() => { 
                if(newPosto.subId && newPosto.name && newPosto.municipio) { 
                  onSavePosto({ 
                    id: Date.now().toString(), 
                    subId: newPosto.subId, 
                    name: newPosto.name,
                    municipio: newPosto.municipio,
                    classification: newPosto.classification || 'Posto'
                  }); 
                  setNewPosto({ name: '', subId: '', classification: 'Posto', municipio: '' }); 
                } else {
                  alert("Informe Subgrupamento, Nome e Município.");
                }
              }}
              className="bg-red-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs"
            >
              Adicionar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {postos.map(p => (
            <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-slate-400 font-black text-[9px] uppercase block leading-none mb-1">{p.classification || 'Posto'}</span>
                  <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditPosto(p)} className="text-blue-500 hover:scale-110">✏️</button>
                  <button onClick={() => window.confirm(`Excluir unidade "${p.name}"?`) && onDeletePosto(p.id)} className="text-red-500 hover:scale-110">🗑️</button>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase">{subs.find(s => s.id === p.subId)?.name || 'S/V'}</span>
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{p.municipio || 'S/ Município'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HierarchyManager;
