
import React, { useMemo } from 'react';
import { Viatura, InventoryCheck, ProntidaoColor, Posto, LogEntry, Notice, User, Subgrupamento, GB } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getProntidaoInfo, formatFullDate, safeDateIso } from '../utils/calendarUtils';
import { DEFAULT_HEADER, PRONTIDAO_CYCLE } from '../constants';

interface DashboardProps {
  viaturas: Viatura[];
  checks: InventoryCheck[];
  postos: Posto[];
  subs: Subgrupamento[];
  gbs: GB[];
  logs: LogEntry[];
  notices: Notice[];
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ viaturas, checks, postos, subs, gbs, logs, notices, currentUser }) => {
  const currentProntidao = getProntidaoInfo(new Date());

  // Lógica para determinar o nome da unidade no cabeçalho baseada no escopo
  const headerInfo = useMemo(() => {
    if (!currentUser.scopeLevel || currentUser.scopeLevel === 'GLOBAL') {
      return {
        name: postos.length > 0 ? postos[0].name : DEFAULT_HEADER.pelotao,
        isGlobal: true,
        label: 'Acesso Global'
      };
    }

    let scopeName = 'Unidade Desconhecida';
    if (currentUser.scopeLevel === 'POSTO') {
      scopeName = postos.find(p => p.id === currentUser.scopeId)?.name || 'Posto não localizado';
    } else if (currentUser.scopeLevel === 'SGB') {
      scopeName = subs.find(s => s.id === currentUser.scopeId)?.name || 'Subgrupamento não localizado';
    } else if (currentUser.scopeLevel === 'GB') {
      scopeName = gbs.find(g => g.id === currentUser.scopeId)?.name || 'Grupamento não localizado';
    }

    return {
      name: scopeName,
      isGlobal: false,
      label: `Nível ${currentUser.scopeLevel}`
    };
  }, [currentUser, postos, subs, gbs]);

  // Filtra os checks baseados nas viaturas visíveis para que as estatísticas reflitam o escopo
  const filteredChecks = useMemo(() => {
    const visibleVtrIds = new Set(viaturas.map(v => v.id));
    return checks.filter(c => visibleVtrIds.has(c.viaturaId));
  }, [checks, viaturas]);

  const today = new Date();
  today.setHours(0,0,0,0);
  const todayStr = today.toISOString().split('T')[0];

  // Volume de Produção usando os checks filtrados
  const checksToday = filteredChecks.filter(c => safeDateIso(c.date) === todayStr).length;
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const checksThisMonth = filteredChecks.filter(c => {
    const cDate = new Date(safeDateIso(c.date) + 'T12:00:00');
    return cDate >= startOfMonth;
  });
  const checksThisMonthCount = checksThisMonth.length;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const checksThisWeek = filteredChecks.filter(c => {
    const cDate = new Date(safeDateIso(c.date) + 'T12:00:00');
    return cDate >= startOfWeek;
  }).length;

  // Dados para o Gráfico - Usando checks filtrados
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

  // Contadores de viaturas (já filtradas em App.tsx)
  const operativeCount = viaturas.filter(v => String(v.status).trim().toUpperCase() === "OPERANDO").length;
  const reserveCount = viaturas.filter(v => String(v.status).trim().toUpperCase() === "RESERVA").length;
  const downCount = viaturas.filter(v => String(v.status).trim().toUpperCase() === "BAIXADA").length;

  const pendingOperativeViaturas = viaturas
    .filter(v => String(v.status).trim().toUpperCase() === "OPERANDO")
    .map((v): { name: string; days: string | number; id: string } | null => {
      const checkedToday = filteredChecks.some(c => c.viaturaId === v.id && safeDateIso(c.date) === todayStr);
      if (checkedToday) return null;

      const vtrChecks = filteredChecks.filter(c => c.viaturaId === v.id);
      if (vtrChecks.length === 0) return { name: v.prefix, days: '∞', id: v.id };
      
      const sorted = [...vtrChecks].sort((a,b) => b.date.localeCompare(a.date));
      const lastDate = new Date(safeDateIso(sorted[0].date) + 'T12:00:00');
      lastDate.setHours(0,0,0,0);
      
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { name: v.prefix, days: diffDays, id: v.id };
    }).filter((v): v is { name: string; days: string | number; id: string } | null => v !== null);

  const activeStyle = useMemo(() => {
    let varName = '--readiness-azul';
    if (currentProntidao.color === ProntidaoColor.VERDE) varName = '--readiness-verde';
    if (currentProntidao.color === ProntidaoColor.AMARELA) varName = '--readiness-amarela';

    return {
      headerBg: `linear-gradient(135deg, var(${varName}), color-mix(in srgb, var(${varName}), black 10%))`,
      headerShadow: `0 20px 25px -5px color-mix(in srgb, var(${varName}), white 60%)`,
      badgeBg: `color-mix(in srgb, var(${varName}), transparent 70%)`,
      textColor: `color-mix(in srgb, var(${varName}), black 40%)`,
      lightBg: `color-mix(in srgb, var(${varName}), white 90%)`,
      borderColor: `color-mix(in srgb, var(${varName}), white 50%)`,
      pendingColor: 'var(--readiness-amarela)',
      lateColor: 'var(--readiness-verde)'
    };
  }, [currentProntidao]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header com Status do Plantão e Indicador de Escopo */}
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
                className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-white flex items-center gap-2"
                style={{ backgroundColor: activeStyle.badgeBg }}
              >
                Prontidão {currentProntidao.label}
                {headerInfo.isGlobal && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full border border-white/20 animate-pulse">Exibição Global</span>
                )}
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">
              {headerInfo.name}
            </h1>
            <p className="text-sm font-medium opacity-90 capitalize">
              {formatFullDate(new Date())} • {headerInfo.label}
            </p>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Estatísticas e Gráfico */}
        <div className="xl:col-span-2 space-y-6">
          {/* Cards de Produção */}
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

          {/* Gráfico de Prontidão */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="text-lg font-black text-slate-800 tracking-tight">Distribuição por Prontidão</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referência: Mês Atual ({headerInfo.name})</p>
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
                  <span className="font-bold text-xs uppercase tracking-widest">Sem dados estatísticos para este escopo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Pendências */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl">⚠️</div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Pendências do Dia</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrado por: {headerInfo.name}</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {pendingOperativeViaturas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-4 opacity-50">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">✨</div>
                  <div>
                    <p className="text-slate-800 font-black text-sm">Tudo Limpo!</p>
                    <p className="text-slate-500 text-xs font-medium">Todas as viaturas vinculadas foram conferidas.</p>
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
                    <div className="mt-3 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 w-1/4 animate-pulse"></div>
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
