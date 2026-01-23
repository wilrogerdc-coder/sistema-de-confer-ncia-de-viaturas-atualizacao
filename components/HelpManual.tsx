
import React, { useState } from 'react';

const HelpManual: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState('intro');

  const topics = [
    { id: 'intro', title: 'Visão Geral', icon: '🏠' },
    { id: 'checklist', title: 'Realizar Checklist', icon: '📝' },
    { id: 'dashboard', title: 'Entendendo o Dashboard', icon: '📊' },
    { id: 'reports', title: 'Relatórios e PDFs', icon: '📄' },
    { id: 'fleet', title: 'Gestão de Frota', icon: '🚒' },
    { id: 'admin', title: 'Administração', icon: '⚙️' },
  ];

  const renderContent = () => {
    switch (activeTopic) {
      case 'intro':
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Bem-vindo ao Sistema de Conferência</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Este sistema foi desenvolvido para modernizar e agilizar o controle de inventário das viaturas do Corpo de Bombeiros. 
              Ele substitui as planilhas de papel e livros de parte por uma solução digital integrada, segura e auditável.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-2">Principais Funcionalidades</h4>
                <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                  <li>Checklist diário digital via celular ou tablet.</li>
                  <li>Histórico completo de conferências.</li>
                  <li>Controle de prontidão (Verde, Amarela, Azul).</li>
                  <li>Relatórios automáticos em PDF.</li>
                  <li>Auditoria de ações e logs de segurança.</li>
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-2">Primeiros Passos</h4>
                <p className="text-xs text-slate-600">
                  Ao fazer login, você será direcionado para a tela condizente com seu perfil. 
                  Usuários operacionais vão direto para o <strong>Checklist</strong>, enquanto administradores veem o <strong>Dashboard</strong>.
                </p>
              </div>
            </div>
          </div>
        );

      case 'checklist':
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Como Realizar o Checklist</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-slate-800">Seleção da Viatura</h4>
                  <p className="text-xs text-slate-600 mt-1">Na aba "Checklist", você verá os cartões das viaturas. Viaturas com borda verde já foram conferidas hoje. Viaturas com borda normal aguardam conferência. Clique em <strong>"Iniciar Checklist"</strong>.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-slate-800">Conferência dos Itens</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    A lista é dividida por compartimentos (Gavetas). Clique no nome da gaveta para expandir.
                    Para cada item, selecione o status:
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">S (Sem Novidade)</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded">CN (Com Novidade)</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded">NA (Novidade Anterior)</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 italic">Nota: Se marcar CN ou NA, será obrigatório descrever o problema no campo de observação.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-slate-800">Finalização</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Ao final da lista, preencha o nome do <strong>Comandante da Viatura</strong> e os nomes dos membros da <strong>Equipe</strong>.
                    Se estiver fazendo uma conferência retroativa (data passada) ou uma segunda conferência no mesmo dia, o sistema pedirá uma <strong>Justificativa</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Entendendo o Dashboard</h3>
            <p className="text-sm text-slate-600">O painel principal oferece uma visão macro da operação em tempo real.</p>

            <div className="grid grid-cols-1 gap-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2 bg-slate-50 rounded-r-xl">
                <h4 className="font-bold text-slate-800">Status do Plantão</h4>
                <p className="text-xs text-slate-600">No topo, você vê a Prontidão atual (Verde, Amarela, Azul) baseada no ciclo automático de datas, e o status da frota (Quantas Vtr Operando, Reserva, Baixada).</p>
              </div>
              <div className="border-l-4 border-red-500 pl-4 py-2 bg-slate-50 rounded-r-xl">
                <h4 className="font-bold text-slate-800">Pendências do Dia</h4>
                <p className="text-xs text-slate-600">
                  Lista crítica que mostra quais viaturas marcadas como <strong>OPERANDO</strong> ainda não receberam checklist no dia de hoje.
                  O objetivo é manter esta lista vazia.
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2 bg-slate-50 rounded-r-xl">
                <h4 className="font-bold text-slate-800">Mural de Avisos</h4>
                <p className="text-xs text-slate-600">
                  Exibe comunicados importantes cadastrados pelos administradores (ex: Viatura baixada, mudança de escala, etc).
                </p>
              </div>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Central de Relatórios</h3>
            <p className="text-sm text-slate-600">A aba "Relatórios" permite extrair dados para controle e arquivo físico.</p>

            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">1. Histórico</h4>
                <p className="text-xs text-slate-600">
                  Lista cronológica de todos os checklists. Use para encontrar uma conferência antiga e reimprimir o PDF (Espelho do Checklist).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">2. Mapa Mensal (Frequência)</h4>
                <p className="text-xs text-slate-600">
                  Gera uma grade mostrando todos os dias do mês.
                  <br />
                  <span className="text-green-600 font-bold">OK</span> = Conferido sem novidade.
                  <br />
                  <span className="text-red-600 font-bold">CN</span> = Conferido com novidade.
                  <br />
                  <span className="text-slate-400">RES/BX</span> = Viatura estava em reserva ou baixada.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">3. Para Impressão (Mapas em Branco)</h4>
                <p className="text-xs text-slate-600">
                  Gera formulários PDF em branco para uso manual, caso o sistema esteja indisponível ou para pranchetas físicas.
                  Inclui o "Checklist Diário Manual" e o "Mapa Mensal em Branco".
                </p>
              </div>
            </div>
          </div>
        );

      case 'fleet':
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Frota</h3>
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded inline-block">Permissão: Admin/Super</p>
            
            <p className="text-sm text-slate-600">
              Nesta tela você cria viaturas e gerencia a lista de materiais de cada uma.
            </p>

            <ul className="space-y-4 mt-4">
              <li className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <span className="font-bold text-slate-800 block mb-1">Editar Lista de Materiais</span>
                <p className="text-xs text-slate-600">
                  Clique em "Editar Lista" no cartão da viatura. Você pode adicionar gavetas, itens, renomear ou arrastar itens para mudar a ordem.
                  <strong>Importante:</strong> As alterações só valem para checklists futuros. Checklists passados mantêm a lista original (histórico preservado).
                </p>
              </li>
              <li className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <span className="font-bold text-slate-800 block mb-1">Importação via CSV</span>
                <p className="text-xs text-slate-600">
                  Para listas grandes, use a importação.
                  1. Baixe o <strong>Modelo CSV</strong>.
                  2. Preencha no Excel (respeite as colunas: Compartimento; Nome; Especificação; Quantidade).
                  3. Salve como CSV (separado por ponto e vírgula).
                  4. Clique em "Importar Lista".
                </p>
              </li>
            </ul>
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-6 animate-in fade-in">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Administração do Sistema</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                <h4 className="font-bold text-purple-900">Usuários</h4>
                <p className="text-xs text-purple-800 mt-1">
                  Crie logins para a tropa.
                  <br/><strong>Perfil USER:</strong> Apenas realiza checklist.
                  <br/><strong>Perfil ADMIN:</strong> Gerencia viaturas e usuários.
                  <br/><strong>Perfil SUPER:</strong> Acesso total (banco de dados, temas, auditoria).
                </p>
              </div>
              
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                <h4 className="font-bold text-orange-900">Banco de Dados e Backup</h4>
                <p className="text-xs text-orange-800 mt-1">
                  Na aba "Banco de Dados" (Super Usuário), é possível configurar URLs separadas para dados e logs (performance), fazer backup JSON de tudo e resetar o sistema.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <h4 className="font-bold text-indigo-900">Auditoria (Logs)</h4>
                <p className="text-xs text-indigo-800 mt-1">
                  Todas as ações (Login, Checklist salvo, Edição de Vtr) são gravadas. O Super Usuário pode ver quem fez o que e quando, garantindo a integridade das informações.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar de Tópicos */}
      <div className="w-full lg:w-64 flex flex-col gap-2 bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-y-auto">
        <div className="mb-4 px-2">
          <h2 className="text-lg font-black text-slate-800 tracking-tighter">Ajuda & Tutorial</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Guia do Usuário v1.0</p>
        </div>
        {topics.map(topic => (
          <button
            key={topic.id}
            onClick={() => setActiveTopic(topic.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
              activeTopic === topic.id 
                ? 'bg-slate-800 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-xl">{topic.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wide">{topic.title}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none grayscale">
          {topics.find(t => t.id === activeTopic)?.icon}
        </div>
        <div className="max-w-3xl relative z-10">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default HelpManual;
