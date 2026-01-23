
import React, { useState } from 'react';
import { Notice, User } from '../types';

interface NoticeManagerProps {
  notices: Notice[];
  onSaveNotice: (n: Notice) => void;
  onDeleteNotice: (id: string) => void;
  currentUser: User;
}

const NoticeManager: React.FC<NoticeManagerProps> = ({ notices, onSaveNotice, onDeleteNotice, currentUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Notice>>({
    title: '', content: '', priority: 'NORMAL', active: true
  });

  const handleCreateOrUpdate = () => {
    if (!formData.title || !formData.content) {
      alert("Título e Conteúdo são obrigatórios.");
      return;
    }

    const noticeToSave: Notice = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      title: formData.title!,
      content: formData.content!,
      priority: formData.priority || 'NORMAL',
      active: formData.active !== undefined ? formData.active : true,
      expirationDate: '', // Removido conceito de validade, aviso é fixo
      createdAt: editingId ? (notices.find(n => n.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      createdBy: editingId ? (notices.find(n => n.id === editingId)?.createdBy || currentUser.name) : currentUser.name
    };

    onSaveNotice(noticeToSave);
    resetForm();
  };

  const startEdit = (n: Notice) => {
    setEditingId(n.id);
    setFormData({ ...n });
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', priority: 'NORMAL', active: true });
    setIsAdding(false);
    setEditingId(null);
  };

  const getPriorityColor = (p: string) => {
    if (p === 'URGENTE') return 'bg-red-100 text-red-700 border-red-200';
    if (p === 'ALTA') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tighter uppercase">Mural de Avisos</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comunicação Interna</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="bg-red-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs shadow-lg transition-all hover:bg-red-700">
              + Novo Aviso
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white animate-in zoom-in-95 duration-200">
          <h4 className="font-black mb-6 uppercase tracking-widest text-red-400">
            {editingId ? 'Editar Aviso' : 'Criar Novo Aviso'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Título</label>
              <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-red-500 transition-colors" placeholder="Ex: Manutenção da Viatura X" />
            </div>
            
            <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Prioridade</label>
               <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as any })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none font-bold">
                 <option value="NORMAL">Normal</option>
                 <option value="ALTA">Alta</option>
                 <option value="URGENTE">Urgente</option>
               </select>
            </div>
            
            <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Status</label>
               <select value={formData.active ? 'true' : 'false'} onChange={e => setFormData({ ...formData, active: e.target.value === 'true' })} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none font-bold">
                 <option value="true">Ativo (Visível no Mural)</option>
                 <option value="false">Inativo (Oculto)</option>
               </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Conteúdo do Aviso</label>
              <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} rows={5} className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-red-500 transition-colors" placeholder="Digite os detalhes aqui..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateOrUpdate} className="bg-red-600 px-8 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-700 transition-colors">Salvar</button>
            <button onClick={resetForm} className="bg-slate-700 px-8 py-3 rounded-xl font-black uppercase text-xs hover:bg-slate-600 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notices.length === 0 ? (
           <div className="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
             <span className="text-4xl block mb-2 opacity-50">📌</span>
             <p className="font-bold text-xs uppercase tracking-widest">Nenhum aviso cadastrado.</p>
           </div>
        ) : (
          notices.map(n => {
            return (
              <div key={n.id} className={`p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${!n.active ? 'opacity-60 grayscale' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${getPriorityColor(n.priority)}`}>
                    {n.priority}
                  </span>
                  <div className="flex gap-2">
                      <button onClick={() => startEdit(n)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center text-slate-500 transition-colors">✎</button>
                      <button onClick={() => window.confirm("Excluir este aviso?") && onDeleteNotice(n.id)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-slate-500 transition-colors">🗑</button>
                  </div>
                </div>
                <h4 className="text-lg font-black text-slate-800 leading-tight mb-2">{n.title}</h4>
                <p className="text-sm text-slate-600 font-medium mb-4 line-clamp-3">{n.content}</p>
                
                <div className="pt-4 border-t border-slate-50 flex flex-col gap-2 mt-auto">
                  <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {n.createdBy.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(n.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex gap-2 mt-1">
                    {!n.active ? (
                        <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded w-fit">Inativo</span>
                    ) : (
                        <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 px-2 py-1 rounded w-fit">Visível no Mural</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NoticeManager;
