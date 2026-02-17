
import React, { useMemo, useState } from 'react';
import { Viatura, InventoryCheck, ProntidaoColor, Posto, User, ViaturaStatus, UserRole, Subgrupamento, GB, LogEntry } from '../types';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { getProntidaoInfo, formatFullDate, getShiftReferenceDate } from '../utils/calendarUtils';

interface DashboardProps {
  viaturas: Viatura[];
  checks: InventoryCheck[];
  postos: Posto[];
  subs: Subgrupamento[];
  gbs: GB[];
  logs: LogEntry[];
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ viaturas, checks, postos, currentUser }) => {
  const [chartScope, setChartScope] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [widgetOrder, setWidgetOrder] = useState<string[]>(['stats-turno', 'stats-prontidao', 'produtividade', 'pendencias']);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const currentProntidao = getProntidaoInfo(new Date());

  const headerInfo = useMemo(() => {
    if (currentUser.role === UserRole.SUPER) return { name: 'CENTRO DE COMANDO GLOBAL', label: 'MONITORAMENTO CLOUD MASTER' };
    if (currentUser.role === UserRole.ADMIN) return { name: 'GESTÃO E AUDITORIA REGIONAL', label: 'AUDITORIA DE ATIVOS E FROTA' };
    const unitName = postos.find(p => p.id === currentUser.scopeId || p.id === currentUser.postoId)?.name || 'UNIDADE OPERACIONAL';
    return { name: unitName.toUpperCase(), label: 'SESSÃO OPERACIONAL ATIVA' };
  }, [currentUser, postos]);

  const visibleViaturas = useMemo(() => {
    if (currentUser.role === UserRole.SUPER) return viaturas;
    const scopeId = currentUser.scopeId || currentUser.postoId;
    return viaturas.filter(v => v.postoId === scopeId);
  }, [viaturas, currentUser]);

  const operativeViaturas = useMemo(() => 
    visibleViaturas.filter(v => v.status === ViaturaStatus.OPERANDO)
  , [visibleViaturas]);

  const operationalTodayStr = getShiftReferenceDate(new Date());

  const checksToday = useMemo(() => {
      return checks.filter(c => getShiftReferenceDate(c.timestamp) === operationalTodayStr);
  }, [checks, operationalTodayStr]);

  const statsToday = useMemo(() => {
      const conferred = operativeViaturas.filter(v => checksToday.some(c => c.viaturaId === v.id)).length;
      const missing = operativeViaturas.length - conferred;
      return [
          { name: 'Conferidas', value: conferred, color: '#10b981' },
          { name: 'Faltantes', value: missing, color: '#ef4444' }
      ];
  }, [operativeViaturas, checksToday]);

  const readinessStats = useMemo(() => {
      const verde = checks.filter(c => c.shiftColor === 'Verde').length;
      const amarela = checks.filter(c => c.shiftColor === 'Amarela').length;
      const azul = checks.filter(c => c.shiftColor === 'Azul').length;
      return [
          { name: 'Verde', value: verde, color: '#10b981' },
          { name: 'Amarela', value: amarela, color: '#f59e0b' },
          { name: 'Azul', value: azul, color: '#2563eb' }
      ].filter(d => d.value > 0);
  }, [checks]);

  const productivityData = useMemo(() => {
    let length = 7;
    if (chartScope === 'monthly') length = 30;
    if (chartScope === 'yearly') length = 12;

    if (chartScope === 'yearly') {
        return Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (11 - i));
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthChecks = checks.filter(c => getShiftReferenceDate(c.timestamp).startsWith(monthStr));
            return {
                name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
                verde: monthChecks.filter(c => c.shiftColor === 'Verde').length,
                amarela: monthChecks.filter(c => c.shiftColor === 'Amarela').length,
                azul: monthChecks.filter(c => c.shiftColor === 'Azul').length
            };
        });
    } else {
        return Array.from({ length }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (length - 1 - i));
            const dateStr = getShiftReferenceDate(d);
            const dayChecks = checks.filter(c => getShiftReferenceDate(c.timestamp) === dateStr);
            return {
                name: dateStr.split('-').reverse().slice(0, 2).join('/'),
                verde: dayChecks.filter(c => c.shiftColor === 'Verde').length,
                amarela: dayChecks.filter(c => c.shiftColor === 'Amarela').length,
                azul: dayChecks.filter(c => c.shiftColor === 'Azul').length
            };
        });
    }
  }, [checks, chartScope]);

  const activeStyle = useMemo(() => {
    const varName = currentProntidao.color === ProntidaoColor.VERDE ? '--readiness-verde' : currentProntidao.color === ProntidaoColor.AMARELA ? '--readiness-amarela' : '--readiness-azul';
    return {
      gradient: `linear-gradient(135deg, var(${varName}), color-mix(in srgb, var(${varName}), #000 45%))`,
      glow: `0 20px 50px -15px color-mix(in srgb, var(${varName}), transparent 55%)`,
      badge: `color-mix(in srgb, var(${varName}), #fff 15%)`
    };
  }, [currentProntidao]);

  const handleDragStart = (id: string) => setDraggedWidget(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!draggedWidget || draggedWidget === targetId) return;
    const newList = [...widgetOrder];
    const dragIdx = newList.indexOf(draggedWidget);
    const targetIdx = newList.indexOf(targetId);
    newList.splice(dragIdx, 1);
    newList.splice(targetIdx, 0, draggedWidget);
    setWidgetOrder(newList);
    setDraggedWidget(null);
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case 'stats-turno':
        return (
          <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={handleDragOver} onDrop={() => handleDrop(id)} className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex flex-col items-center cursor-move transition-transform active:scale-95">
            <h3 className="text-xs font-black text-slate-800 tracking-tighter uppercase mb-3 text-center">Conferências (Hoje)</h3>
            <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={statsToday} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value">
                            {statsToday.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '8px' }} />
                        <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center">
                <p className="text-xl font-black text-emerald-500 leading-none">{statsToday[0].value} / {operativeViaturas.length}</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status Turno</p>
            </div>
          </div>
        );
      case 'stats-prontidao':
        return (
          <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={handleDragOver} onDrop={() => handleDrop(id)} className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex flex-col items-center cursor-move transition-transform active:scale-95">
            <h3 className="text-xs font-black text-slate-800 tracking-tighter uppercase mb-3 text-center">Total Acumulado</h3>
            <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={readinessStats} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value">
                            {readinessStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '8px' }} />
                        <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center">
                <p className="text-xl font-black text-slate-800 leading-none">{checks.length}</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registros Cloud</p>
            </div>
          </div>
        );
      case 'produtividade':
        return (
          <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={handleDragOver} onDrop={() => handleDrop(id)} className="xl:col-span-2 bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden relative cursor-move transition-transform active:scale-[0.98]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
                <h3 className="text-sm font-black text-slate-800 tracking-tighter uppercase">Produtividade Sincronizada</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['weekly', 'monthly', 'yearly'].map(s => (
                    <button key={s} onClick={(e) => { e.stopPropagation(); setChartScope(s as any); }} className={`px-2 py-1 rounded-md text-[7px] font-black uppercase transition-all ${chartScope === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                      {s === 'weekly' ? '7D' : s === 'monthly' ? '30D' : '12M'}
                    </button>
                  ))}
                </div>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productivityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 7, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="verde" stroke="#10b981" strokeWidth={3} dot={{ r: 2 }} name="Verde" />
                  <Line type="monotone" dataKey="amarela" stroke="#f59e0b" strokeWidth={3} dot={{ r: 2 }} name="Amarela" />
                  <Line type="monotone" dataKey="azul" stroke="#2563eb" strokeWidth={3} dot={{ r: 2 }} name="Azul" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'pendencias':
        return (
          <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={handleDragOver} onDrop={() => handleDrop(id)} className="xl:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col min-h-[300px] cursor-move transition-transform active:scale-[0.99]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 text-2xl shadow-inner">⚠️</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Pendências Operacionais ({operativeViaturas.length} OP)</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Viaturas operando pendentes de conferência no sistema</p>
                  </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {operativeViaturas.filter(v => !checksToday.some(c => c.viaturaId === v.id)).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-90">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner border-2 border-emerald-100">✓</div>
                  <p className="text-slate-800 font-black text-base px-6 uppercase tracking-tighter">Pátio operacional em conformidade.</p>
                  <p className="text-[7px] font-bold text-emerald-500 uppercase tracking-[0.3em] mt-2 bg-emerald-50 px-4 py-1 rounded-full">Sistema em Dia</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {operativeViaturas.filter(v => !checksToday.some(c => c.viaturaId === v.id)).map(v => {
                      const vtrChecks = checks.filter(c => c.viaturaId === v.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
                      const lastDate = vtrChecks.length > 0 ? new Date(vtrChecks[0].timestamp) : null;
                      const diffDays = lastDate ? Math.ceil(Math.abs(new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : '∞';
                      return (
                        <div key={v.id} className="p-4 bg-slate-50 hover:bg-white hover:border-red-500 border-2 border-slate-100 rounded-2xl flex justify-between items-center transition-all group shadow-sm hover:shadow-xl cursor-default">
                          <div>
                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest block mb-1">Viatura</span>
                              <span className="font-black text-slate-800 text-lg tracking-tighter uppercase group-hover:text-red-600 transition-colors">{v.prefix}</span>
                          </div>
                          <div className="text-right">
                              <span className={`text-[7px] font-black px-3 py-1 rounded-lg uppercase shadow-md ${diffDays === '∞' ? 'bg-red-600 text-white shadow-red-200' : 'bg-amber-500 text-white shadow-amber-200'}`}>
                              {diffDays === '∞' ? 'NUNCA' : `${diffDays}D`}
                              </span>
                          </div>
                        </div>
                      );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* HEADER DENSE */}
      <div 
        className="relative overflow-hidden rounded-[2rem] p-8 text-white shadow-2xl transition-all duration-1000 border border-white/10" 
        style={{ background: activeStyle.gradient, boxShadow: activeStyle.glow }}
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 text-[18rem] pointer-events-none -mr-20 -mt-20 rotate-12">🚒</div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
              <div className="px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] backdrop-blur-3xl border border-white/20" style={{ backgroundColor: activeStyle.badge }}>
                PRONTIDÃO {currentProntidao.label}
              </div>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_#fff]"></span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-[0.85] drop-shadow-xl">{headerInfo.name}</h1>
            <p className="text-sm font-medium opacity-80 uppercase tracking-[0.2em] ml-1">{formatFullDate(new Date())}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 w-full lg:w-auto">
            {[
              { label: 'Operando', val: operativeViaturas.length },
              { label: 'Reserva', val: visibleViaturas.filter(v => v.status === ViaturaStatus.RESERVA).length },
              { label: 'Baixadas', val: visibleViaturas.filter(v => v.status === ViaturaStatus.BAIXADA).length }
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-2xl rounded-2xl p-4 text-center border border-white/10 shadow-inner hover:bg-white/20 transition-all cursor-default group">
                <p className="text-[8px] font-black uppercase opacity-60 mb-1.5 tracking-widest">{stat.label}</p>
                <p className="text-4xl font-black group-hover:scale-105 transition-transform duration-500 leading-none">{stat.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {widgetOrder.map(id => renderWidget(id))}
      </div>
    </div>
  );
};

export default Dashboard;
