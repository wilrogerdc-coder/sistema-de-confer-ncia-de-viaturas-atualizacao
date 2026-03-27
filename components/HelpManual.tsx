
import React from 'react';
import { APP_VERSION } from '../constants';

/**
 * COMPONENTE: HelpManual
 * Tutorial Detalhado e Guia de Referência do Sistema.
 * Desenvolvido para capacitação técnica de operadores e administradores.
 */
const HelpManual: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-6xl mx-auto">
      <div className="bg-white p-10 md:p-16 rounded-[3rem] border border-slate-200 shadow-2xl relative overflow-hidden">
        
        {/* Marca d'água decorativa */}
        <div className="absolute top-0 right-0 p-10 opacity-5 text-[15rem] pointer-events-none rotate-12">📖</div>
        
        <header className="mb-16 border-b border-slate-100 pb-10">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">🎓</span>
            <div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Tutorial Operacional</h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Guia Completo de Utilização • Versão 2026</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* SEÇÃO 1: CHECKLIST */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg">01</div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">O Checklist de Materiais</h3>
            </div>
            
            <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
              <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-blue-500">
                <p className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-widest">Possibilidades de Preenchimento:</p>
                <ul className="list-none space-y-3">
                  <li className="flex gap-2">
                    <span className="font-black text-emerald-600">S (Sem Novidade):</span> Indica que o item está presente, limpo, testado e em perfeitas condições de uso.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-black text-red-600">CN (Com Novidade):</span> Deve ser marcado quando o item falta, está quebrado ou vencido. <strong>Exige obrigatoriamente um relato</strong> no campo de observação.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-black text-amber-600">NA (Novidade Anterior):</span> Indica que a falta ou defeito já foi reportada e o escalão superior já tem ciência, mas o item ainda não foi reposto.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-slate-800">
                <p className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-widest">Ações Rápidas (BX e RS):</p>
                <p>Se a viatura estiver com status <strong>BAIXADA</strong> ou <strong>RESERVA</strong> no sistema, o formulário exibirá um botão especial de finalização rápida. Ao utilizá-lo, o sistema marca automaticamente todos os itens como <strong>NA</strong>, otimizando o tempo do operador, mas mantendo o registro de inspeção ativo.</p>
              </div>

              <div className="bg-amber-50 p-6 rounded-2xl border-l-4 border-amber-500">
                <p className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-widest">Validação e Justificativa:</p>
                <p>O sistema impede a gravação se houver itens pendentes. Além disso, se você tentar realizar uma conferência retroativa ou se já houver uma conferência para aquela viatura no mesmo turno, o campo <strong>JUSTIFICATIVA</strong> passará a ser obrigatório.</p>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: DASHBOARD */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg">02</div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dashboard Interativo</h3>
            </div>

            <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
              <p>O Dashboard é o cérebro visual do sistema, exibindo em tempo real a situação da frota e a produtividade da unidade.</p>
              
              <div className="bg-slate-50 p-6 rounded-2xl">
                <p className="font-bold text-slate-800 mb-3 uppercase text-[10px] tracking-widest">Interface Customizável (Drag & Drop):</p>
                <p>Você pode <strong>reordenar os painéis</strong> de acordo com sua preferência. Basta clicar e segurar no título de qualquer widget (como "Status Turno" ou "Produtividade") e arrastá-lo para uma nova posição. O sistema reorganiza o layout automaticamente para focar no que é mais importante para você.</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl">
                <p className="font-bold text-slate-800 mb-3 uppercase text-[10px] tracking-widest">Interpretando as Cores:</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                    <span><strong>Verde:</strong> Viatura conferida e operando sem novidades críticas.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span><strong>Vermelho:</strong> Pendência de conferência no turno atual ou material com novidade (CN).</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-slate-900"></div>
                    <span><strong>Preto/Escuro:</strong> Viatura Baixada (Indisponível).</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: RELATÓRIOS */}
          <section className="space-y-8 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg">03</div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatórios e Inteligência de Dados</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-600 text-sm leading-relaxed">
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col gap-4">
                <div className="text-3xl">📄</div>
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Espelho Individual</h4>
                <p>Documento oficial gerado após cada checklist. Contém o status de cada item, observações do conferente e a assinatura digitalizada dos responsáveis.</p>
                <p className="text-[10px] font-bold text-red-600">COR: Segue a cor da prontidão do dia (Verde/Amarelo/Azul).</p>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col gap-4">
                <div className="text-3xl">📅</div>
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Mapa Mensal</h4>
                <p>Grade completa de 30/31 dias para visualização de conformidade mensal. Ideal para conferência de assinaturas e auditorias de longo prazo.</p>
                <p className="text-[10px] font-bold text-red-600">IDENTIFICAÇÃO: Exibe as rubricas verticais no rodapé de cada dia conferido.</p>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col gap-4">
                <div className="text-3xl">🎨</div>
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Cores de Alerta</h4>
                <p>O sistema adota cores automáticas baseadas no status da viatura no momento da geração do PDF para facilitar a triagem visual:</p>
                <ul className="space-y-2 mt-2">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-700"></span> <strong>Vermelho:</strong> Viatura Baixada (BX).</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-600"></span> <strong>Laranja:</strong> Viatura Reserva (RS).</li>
                </ul>
              </div>
            </div>
          </section>

        </div>

        <footer className="mt-24 pt-10 border-t border-slate-100 flex flex-col items-center gap-6">
            <div className="px-6 py-2 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em]">Gestão Operacional de Materiais</div>
            <div className="text-center space-y-2">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Corporativo • Uso Restrito • Auditoria Ativa</p>
                {/* REGRAS DE CRÉDITOS: Implementação dos créditos de desenvolvimento solicitados com versão */}
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-2 duration-1000">Desenvolvido por CAVALIERI 2026 {APP_VERSION}</p>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default HelpManual;
