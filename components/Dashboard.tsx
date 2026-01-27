
import React, { useMemo } from 'react';
import { Viatura, InventoryCheck, ProntidaoColor, Posto, LogEntry, Notice } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getProntidaoInfo, formatFullDate, safeDateIso, isNoticeExpired } from '../utils/calendarUtils';
import { DEFAULT_HEADER, PRONTIDAO_CYCLE } from '../constants';

interface DashboardProps {
  viaturas: Viatura[];
  checks: InventoryCheck[];
  postos: Posto[];
  logs: LogEntry[];
  notices: Notice[];
}

const Dashboard: React.FC<DashboardProps> = ({ viaturas, checks, postos, logs, notices }) => {
  const currentProntidao = getProntidaoInfo(new Date());
  const postoName = postos.length > 0 ? postos[0].name : DEFAULT_HEADER.pelotao;

  // Filtragem de avisos ativos e não expirados
  const activeNotices = useMemo(() => {
    return notices
      .filter(n => n.active && !isNoticeExpired(n.expirationDate))
      .sort((a, b) => {
        const priorityMap: Record<string, number> = { 'URGENTE': 0, 'ALTA': 1, 'NORMAL': 2 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      });
  }, [notices]);

  // Statistics
  const totalViaturas = viaturas.length;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayStr = today.toISOString().split('T')[0];

  const checksToday = checks.filter(c => safeDateIso(c.date) === todayStr).length;
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const checksThisMonth = checks.filter(c => {
    const cDate = new Date(safeDateIso(c.date) + 'T12:00:00');
    return cDate >= startOfMonth;
  });
  const checksThisMonthCount = checksThisMonth.length;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const checksThisWeek = checks.filter(c => {
    const cDate = new Date(safeDateIso(c.date) + 'T12:00:00');
    return cDate >= startOfWeek;
  }).length;

  const shiftStats = PRONTIDAO_CYCLE.map(p => {
    let colorVar = '--readiness-azul';
    if (p.color === ProntidaoColor.VERDE) colorVar = '--readiness-verde';
    if (p.color === ProntidaoColor.AMARELA) colorVar = '--readiness-amarela';
    const computedColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || p.hex;
    return {
      name: p.label,
      value: checksThisMonth.filter(c => c.shiftColor === p.label).length,
      color: computedColor
    };
  }).filter(s => s.value > 0);

  const operativeCount = viaturas.filter(v => String(v.status).trim().toUpperCase() === "OPERANDO").length;
  const reserveCount = viaturas.filter(v => String(v.status).trim().toUpperCase() === "RESERVA").length;
  const downCount = viaturas.filter(v => String(v.status).trim().toUpperCase() === "BAIXADA").length;

  const pendingOperativeViaturas = viaturas
    .filter(v => String(v.status).trim().toUpperCase() === "OPERANDO")
    .map((v) => {
      const checkedToday = checks.some(c => c.viaturaId === v.id && safeDateIso(c.date) === todayStr);
      if (checkedToday) return null;
      const vtrChecks = checks.filter(c => c.viaturaId === v.id);
      if (vtrChecks.length === 0) return { name: v.prefix, days: '∞', id: v.id };
      const sorted = [...vtrChecks].sort((a,b) => b.date.localeCompare(a.date));
      const lastDate = new Date(safeDateIso(sorted[0].date) + 'T12:00:00');
      lastDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { name: v.prefix, days: diffDays, id: v.id };
    }).filter(v => v !== null);

  const activeStyle = useMemo(() => {
    let varName = '--readiness-azul';
    if (currentProntidao.color === ProntidaoColor.VERDE) varName = '--readiness-verde';
    if (currentProntidao.color === ProntidaoColor.AMARELA) varName = '--readiness-amarela';
    return {
      headerBg: `linear-gradient(135deg, var(${varName}), color-mix(in srgb, var(${varName}), black 10%))`,
      headerShadow: `0 20px 25px -5px color-mix(in srgb, var(${varName}), white 60%)`,
      badgeBg: `color-mix(in srgb, var(${varName}), transparent 70%)`
    };
  }, [currentProntidao]);

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'URGENTE': return 'bg-red-600 text-white animate-pulse';
      case 'ALTA': return 'bg-orange-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header com Status do Plantão */}
      <div 
        className="relative overflow-hidden rounded-[2.5rem] p-8 text-white transition-all duration-500"
        style={{ background: activeStyle.headerBg, boxShadow: activeStyle.headerShadow }}
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
              <span className="text-4xl">🚒</span>
              <div 
                className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-white"
                style={{ backgroundColor: activeStyle.badgeBg }}
              >
                Prontidão {currentProntidao.label}
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">{postoName}</h1>
            <p className="text-sm font-medium opacity-90 capitalize">{formatFullDate(new Date())} • Turno 07:30 - 07:29</p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Operando</div>
              <div className="text-3xl font-black">{operativeCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Reserva</div>
              <div className="text-3xl font-black">{reserveCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Baixadas</div>
              <div className="text-3xl font-black">{downCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mural de Avisos Dinâmico */}
      {activeNotices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeNotices.map(notice => (
            <div key={notice.id} className={`p-5 rounded-3xl bg-white border-2 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${notice.priority === 'URGENTE' ? 'border-red-500 ring-4 ring-red-50' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${getPriorityBadge(notice.priority)}`}>
                  {notice.priority}
                </span>
                <span className="text-[10px] font-bold text-slate-300">📌</span>
              </div>
              <h4 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tight leading-tight">{notice.title}</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{notice.content}</p>
              <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase">Por: {notice.createdBy.split(' ').pop()}</span>
                <span className="text-[9px] font-bold text-slate-300">{new Date(notice.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-[-10px] top-[-10px] text-6xl opacity-5 group-hover:opacity-10 transition-opacity">📅</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produção Hoje</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-slate-800 tracking-tighter">{checksToday}</span>
                <span className="text-xs font-bold text-slate-400 mb-2">conf.</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-[-10px] top-[-10px] text-6xl opacity-5 group-hover:opacity-10 transition-opacity">📈</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esta Semana</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-slate-800 tracking-tighter">{checksThisWeek}</span>
                <span className="text-xs font-bold text-slate-400 mb-2">conf.</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-[-10px] top-[-10px] text-6xl opacity-5 group-hover:opacity-10 transition-opacity">🏆</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mês</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black tracking-tighter" style={{ color: 'var(--theme-primary)' }}>{checksThisMonthCount}</span>
                <span className="text-xs font-bold text-slate-400 mb-2">conf.</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="text-lg font-black text-slate-800 tracking-tight">Distribuição por Prontidão</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referência: Mês Atual</p>
              </div>
              <div className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">Total: {checksThisMonthCount}</div>
            </div>
            <div className="h-64 w-full">
              {shiftStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shiftStats}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {shiftStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-bold text-slate-600 uppercase ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <span className="text-4xl mb-2">📊</span>
                  <span className="font-bold text-xs uppercase tracking-widest">Sem dados estatísticos neste mês</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl">⚠️</div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Pendências do Dia</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Viaturas Operando não conferidas</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {pendingOperativeViaturas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-4 opacity-50">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">✨</div>
                  <div>
                    <p className="text-slate-800 font-black text-sm">Tudo Limpo!</p>
                    <p className="text-slate-500 text-xs font-medium">Todas as viaturas foram conferidas.</p>
                  </div>
                </div>
              ) : (
                pendingOperativeViaturas.sort((a,b) => b!.days === '∞' ? 1 : a!.days === '∞' ? -1 : 0).map(v => (
                  <div key={v!.id} className="group p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 hover:border-red-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-black text-slate-700 text-sm block">{v!.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando checklist</span>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wide ${v!.days === '∞' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {v!.days === '∞' ? 'Nunca' : `${v!.days}d atraso`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
