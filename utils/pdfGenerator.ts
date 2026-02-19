import { InventoryCheck, Viatura, CheckEntry, ViaturaStatus, LogEntry, Posto } from '../types';
import { formatFullDate, getShiftReferenceDate, formatDateShort, getProntidaoInfo, getDaysInMonth } from './calendarUtils';
import { PRONTIDAO_CYCLE, DEFAULT_HEADER } from '../constants';

/**
 * MOTOR DE RELATÓRIOS PDF (NÍVEL SÊNIOR)
 * Implementa fidelidade documental militar com colunas simétricas e assinaturas verticais.
 */

const getJsPDF = () => {
  const w = window as any;
  const JsPDF = w.jspdf?.jsPDF || w.jsPDF;
  if (!JsPDF) {
    alert("Erro crítico: A biblioteca de geração de PDF não carregou. Recarregue a página.");
    throw new Error("jsPDF missing");
  }
  return JsPDF;
};

const safeUpper = (val: any): string => String(val || '').toUpperCase();

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const addPageNumbers = (doc: any) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
};

/**
 * RELATÓRIO 1: ESPELHO INDIVIDUAL DE CONFERÊNCIA REALIZADA (Relatório do Checklist)
 * Responsável por exibir o resultado final de uma conferência de materiais.
 */
export const generateInventoryPDF = (check: InventoryCheck, viatura: Viatura, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  const header = check.headerDetails || DEFAULT_HEADER;
  const shiftInfo = getProntidaoInfo(check.timestamp);
  
  // REGRA DE CORES: Define a cor do cabeçalho baseada na prontidão ou status da viatura (Baixada/Reserva)
  let rgb = hexToRgb(shiftInfo.hex);
  if (check.viaturaStatusAtTime === ViaturaStatus.BAIXADA) {
    rgb = [185, 28, 28]; // Red-700
  } else if (check.viaturaStatusAtTime === ViaturaStatus.RESERVA) {
    rgb = [234, 88, 12]; // Orange-600
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold'); 
  let startY = 15;
  
  /**
   * REGRA DE CABEÇALHO:
   * Removidas informações de Grupamento (GB) e Subgrupamento (SGB).
   * Mantidas as instâncias superiores (Secretaria, PM e CB).
   */
  const headerLines = [
    header.secretaria,
    header.policiaMilitar,
    header.corpoBombeiros
  ];

  headerLines.forEach(line => {
    if (line) {
      doc.text(safeUpper(line), 105, startY, { align: "center" });
      startY += 5;
    }
  });
  
  startY += 12;
  
  /**
   * REGRA DE TÍTULO:
   * 1. Exibir apenas 'CONFERÊNCIA DE MATERIAIS' em destaque.
   * 2. Exibir o prefixo da viatura logo abaixo em fonte maior.
   * 3. Mantém a aplicação dinâmica de cores (rgb) conforme o status.
   */
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setFontSize(16); // Fonte maior para o título principal
  doc.text("CONFERÊNCIA DE MATERIAIS", 105, startY, { align: "center" });
  
  startY += 8;
  doc.setFontSize(14); // Fonte destacada para o prefixo
  doc.text(safeUpper(viatura.prefix), 105, startY, { align: "center" });
  
  // Reset de estilos para o corpo do relatório
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`PRONTIDÃO: ${safeUpper(shiftInfo.label)}`, 15, startY + 12);
  doc.text(`REALIZADO EM: ${new Date(check.timestamp).toLocaleString('pt-BR')}`, 15, startY + 17);
  doc.text(`CONFERENTE: ${safeUpper(check.responsibleNames.join(' / '))}`, 15, startY + 22);
  doc.text(`COMANDANTE DA VTR: ${safeUpper(check.commanderName)}`, 15, startY + 27);
  doc.text(`STATUS DA VTR: ${safeUpper(check.viaturaStatusAtTime || ViaturaStatus.OPERANDO)}`, 15, startY + 32);

  // REGRA: Exibir justificativa caso tenha sido preenchida (Casos retroativos ou duplicados)
  let tableStartY = startY + 37;
  if (check.justification) {
    doc.setFont('helvetica', 'bold');
    doc.text("JUSTIFICATIVA:", 15, startY + 37);
    doc.setFont('helvetica', 'normal');
    doc.text(safeUpper(check.justification), 40, startY + 37, { maxWidth: 155 });
    tableStartY += 8;
  }

  const tableData: any[] = [];
  /**
   * SNAPSHOT DE MATERIAIS:
   * Agrupamento por compartimento utilizando os itens salvos no momento do check.
   */
  const grouped = (check.snapshot || viatura.items).reduce((acc, item) => {
    const comp = item.compartment || 'GERAL';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(grouped).forEach(([comp, items]) => {
    tableData.push([{ content: safeUpper(comp), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
    items.forEach(item => {
      const entry = check.entries.find(e => e.itemId === item.id);
      tableData.push([
        item.quantity.toString().padStart(2, '0'), 
        `${item.name}${item.specification ? ' (' + item.specification + ')' : ''}`, 
        { content: entry?.status || '-', styles: { halign: 'center', fontStyle: 'bold', textColor: entry?.status === 'CN' ? [200, 0, 0] : [0,0,0] } }, 
        entry?.observation || ''
      ]);
    });
  });

  // Geração da Tabela Automática
  (doc as any).autoTable({
    startY: tableStartY,
    head: [['Qt', 'Material / Equipamento', 'Status', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: rgb },
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 90 }, 2: { cellWidth: 15 }, 3: { cellWidth: 'auto' } }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Legenda: S (Sem Novidade), CN (Com Novidade), NA (Novidade Anterior)", 15, finalY);

  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Conferencia_${viatura.prefix}.pdf`);
};

/**
 * RELATÓRIO 2: MAPA MENSAL DETALHADO (CONFERÊNCIAS REALIZADAS)
 */
export const generateVtrDetailedMonthlyPDF = (viatura: Viatura, checks: InventoryCheck[], monthYear: string, isPreview: boolean = false, allPostos: Posto[] = []) => {
    const JsPDF = getJsPDF();
    const doc = new JsPDF('l', 'mm', 'a4'); 
    const daysInMonth = getDaysInMonth(monthYear);
    const posto = allPostos.find(p => p.id === viatura.postoId);
    const postoInfo = posto ? `${posto.classification || 'Pelotão'} de Bombeiros de ${posto.name}` : '';

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(safeUpper(DEFAULT_HEADER.corpoBombeiros), 148, 12, { align: "center" });
    doc.text(`MAPA MENSAL DE CONFERÊNCIA DETALHADO: ${viatura.prefix} - ${safeUpper(postoInfo)} - ${monthYear}`, 148, 18, { align: "center" });

    const grouped = viatura.items.reduce((acc, item) => {
        const comp = item.compartment || 'GERAL';
        if (!acc[comp]) acc[comp] = [];
        acc[comp].push(item);
        return acc;
    }, {} as Record<string, any[]>);

    const body: any[] = [];
    Object.entries(grouped).forEach(([comp, items]) => {
        body.push([{ content: safeUpper(comp), colSpan: daysInMonth + 1, styles: { fillColor: [230, 230, 230], fontStyle: 'bold', halign: 'left' } }]);
        items.forEach(item => {
            const row: any[] = [safeUpper(item.name)];
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${monthYear}-${d.toString().padStart(2, '0')}`;
                
                // REGRA: Seleciona a ÚLTIMA conferência do dia caso haja duplicidade
                const dayChecks = checks.filter(c => c.viaturaId === viatura.id && getShiftReferenceDate(c.timestamp) === dateStr);
                const check = dayChecks.length > 0 ? [...dayChecks].sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0] : null;
                
                row.push(check ? (check.entries.find(e => e.itemId === item.id)?.status || '-') : '');
            }
            body.push(row);
        });
    });

    body.push([{ content: 'Responsável pela conferência do Dia', styles: { halign: 'left', fontStyle: 'bold', minCellHeight: 40, valign: 'middle' } }, ...Array(daysInMonth).fill('')]);
    const dayWidth = 222 / daysInMonth; 

    (doc as any).autoTable({
        startY: 25,
        margin: { left: 10, right: 10 },
        head: [['Material / Especificação', ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))]],
        body,
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 0.5, halign: 'center', valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: [180, 0, 0], textColor: 255 }, 
        columnStyles: { 0: { cellWidth: 55, halign: 'left', fontStyle: 'bold' }, ...Object.fromEntries(Array.from({length: daysInMonth}, (_, i) => [i + 1, { cellWidth: dayWidth }])) },
        didDrawCell: (data: any) => {
            if (data.row.index === body.length - 1 && data.column.index > 0) {
                const day = data.column.index;
                const dateStr = `${monthYear}-${day.toString().padStart(2, '0')}`;
                
                // REGRA: Busca o responsável da última conferência do dia
                const dayChecks = checks.filter(c => c.viaturaId === viatura.id && getShiftReferenceDate(c.timestamp) === dateStr);
                const check = dayChecks.length > 0 ? [...dayChecks].sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0] : null;

                if (check?.responsibleNames?.[0]) {
                    doc.saveGraphicsState();
                    doc.setFontSize(4.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(60, 60, 60);
                    const textX = data.cell.x + (data.cell.width / 2) + 1.2;
                    const textY = data.cell.y + data.cell.height - 1.5; 
                    doc.text(safeUpper(check.responsibleNames[0]), textX, textY, { angle: 90 });
                    doc.restoreGraphicsState();
                }
            }
        },
        didParseCell: (data: any) => {
            if (data.row.index === body.length - 1) {
                data.cell.styles.minCellHeight = 40;
                data.cell.styles.valign = 'bottom';
            }
        }
    });

    addPageNumbers(doc);
    if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Mapa_Mensal_${viatura.prefix}.pdf`);
};

/**
 * RELATÓRIO 3: FORMULÁRIO PARA CONFERÊNCIA MANUAL DIÁRIA
 */
export const generateManualDailyPDF = (viatura: Viatura, postos: Posto[]) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  const title = `FORMULÁRIO DE CONFERÊNCIA MANUAL: ${viatura.prefix}`;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(safeUpper(DEFAULT_HEADER.corpoBombeiros), 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(safeUpper(title), 105, 22, { align: "center" });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATA: ____/____/2026   PRONTIDÃO: ( ) VERDE  ( ) AMARELA  ( ) AZUL`, 15, 30);
  doc.text(`COMANDANTE DA VTR: ________________________________________________`, 15, 35);
  doc.text(`CONFERENTE: ________________________________________________________`, 15, 40);

  const tableData: any[] = [];
  const grouped = viatura.items.reduce((acc, item) => {
    const comp = item.compartment || 'GERAL';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(grouped).forEach(([comp, items]) => {
    tableData.push([{ content: safeUpper(comp), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
    items.forEach(item => {
      tableData.push([
        item.quantity.toString().padStart(2, '0'),
        `${item.name}${item.specification ? ' (' + item.specification + ')' : ''}`,
        '[   ]',
        '____________________'
      ]);
    });
  });

  (doc as any).autoTable({
    startY: 45,
    head: [['Qt', 'Material / Equipamento', 'S/CN', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [180, 0, 0] },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 90 }, 2: { cellWidth: 15 }, 3: { cellWidth: 'auto' } }
  });

  addPageNumbers(doc);
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * RELATÓRIO 4: FORMULÁRIO PARA CONFERÊNCIA MANUAL MENSAL
 */
export const generateManualMonthlyPDF = (viatura: Viatura, monthYear: string, postos: Posto[]) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4');
  const daysInMonth = getDaysInMonth(monthYear);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(safeUpper(DEFAULT_HEADER.corpoBombeiros), 148, 12, { align: "center" });
  doc.text(`MAPA MENSAL DE CONFERÊNCIA (MANUAL): ${viatura.prefix} - ${monthYear}`, 148, 18, { align: "center" });

  const grouped = viatura.items.reduce((acc, item) => {
      const comp = item.compartment || 'GERAL';
      if (!acc[comp]) acc[comp] = [];
      acc[comp].push(item);
      return acc;
  }, {} as Record<string, any[]>);

  const body: any[] = [];
  Object.entries(grouped).forEach(([comp, items]) => {
      body.push([{ content: safeUpper(comp), colSpan: daysInMonth + 1, styles: { fillColor: [230, 230, 230], fontStyle: 'bold', halign: 'left' } }]);
      items.forEach(item => {
          body.push([safeUpper(item.name), ...Array(daysInMonth).fill('')]);
      });
  });

  body.push([{ content: 'Responsável (Rubrica)', styles: { halign: 'left', fontStyle: 'bold', minCellHeight: 30, valign: 'middle' } }, ...Array(daysInMonth).fill('')]);

  const dayWidth = 222 / daysInMonth; 

  (doc as any).autoTable({
      startY: 25,
      margin: { left: 10, right: 10 },
      head: [['Material / Especificação', ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))]],
      body,
      theme: 'grid',
      styles: { fontSize: 5, cellPadding: 0.5, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [180, 0, 0], textColor: 255 },
      columnStyles: { 0: { cellWidth: 55, halign: 'left', fontStyle: 'bold' }, ...Object.fromEntries(Array.from({length: daysInMonth}, (_, i) => [i + 1, { cellWidth: dayWidth }])) }
  });

  addPageNumbers(doc);
  window.open(doc.output('bloburl'), '_blank');
};

export const generateAuditLogPDF = (logs: LogEntry[]) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l');
  doc.setFont('helvetica', 'bold');
  doc.text("LOGS DE AUDITORIA DO SISTEMA", 10, 20);
  const data = logs.map(l => [new Date(l.timestamp).toLocaleString('pt-BR'), l.userName, l.action, l.details]);
  (doc as any).autoTable({ startY: 30, head: [['Data / Hora', 'Usuário', 'Ação', 'Detalhes']], body: data, headStyles: { fillColor: [50, 50, 50] } });
  addPageNumbers(doc);
  doc.save(`Auditoria.pdf`);
};

export const generateSummaryPDF = (checks: InventoryCheck[], viaturas: Viatura[], isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l'); 
  doc.setFont('helvetica', 'bold');
  doc.text("HISTÓRICO GERAL DE CONFERÊNCIAS", 148, 20, { align: "center" });
  const data = checks.map(c => [formatDateShort(getShiftReferenceDate(c.timestamp)), viaturas.find(v => v.id === c.viaturaId)?.prefix || '?', c.commanderName]);
  (doc as any).autoTable({ startY: 30, head: [['Data', 'Vtr', 'Comandante']], body: data, headStyles: { fillColor: [180, 0, 0] } });
  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Resumo_Geral.pdf`);
};

/**
 * RELATÓRIO 5: RESUMO DE NOVIDADES (CN)
 * REGRA: Adicionada coluna 'Conferente' conforme solicitação.
 */
export const generateNewsReportPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string, isPreview: boolean = false, filterVtrId?: string) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(safeUpper(DEFAULT_HEADER.corpoBombeiros), 105, 15, { align: "center" });
  doc.text(`RELATÓRIO DE NOVIDADES (CN): ${monthYear}`, 105, 22, { align: "center" });

  const novelties: any[] = [];
  
  const filteredChecks = filterVtrId 
    ? checks.filter(c => c.viaturaId === filterVtrId && getShiftReferenceDate(c.timestamp).startsWith(monthYear))
    : checks.filter(c => getShiftReferenceDate(c.timestamp).startsWith(monthYear));

  filteredChecks.forEach(check => {
    const vtr = viaturas.find(v => v.id === check.viaturaId);
    check.entries.forEach(entry => {
      if (entry.status === 'CN') {
        const item = check.snapshot?.find(i => i.id === entry.itemId) || vtr?.items.find(i => i.id === entry.itemId);
        novelties.push([
          formatDateShort(getShiftReferenceDate(check.timestamp)),
          vtr?.prefix || '?',
          item?.name || 'Item Desconhecido',
          entry.observation || 'Sem descrição',
          safeUpper(check.responsibleNames.join(' / '))
        ]);
      }
    });
  });

  (doc as any).autoTable({
    startY: 30,
    head: [['Data', 'Vtr', 'Material', 'Observação', 'Conferente']],
    body: novelties,
    theme: 'grid',
    headStyles: { fillColor: [180, 0, 0] },
    styles: { fontSize: 7 }
  });

  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Novidades_${monthYear}.pdf`);
};

/**
 * RELATÓRIO 6: AUDITORIA GLOBAL DE MATERIAL
 */
export const generateMaterialAuditPDF = (results: any[], searchTerm: string, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l'); 
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`AUDITORIA DE MATERIAL: ${safeUpper(searchTerm)}`, 148, 15, { align: "center" });
  
  const body = results.map(r => [
    r.name,
    r.spec,
    r.qty,
    r.vtrPrefix,
    r.compartment,
    r.posto,
    r.sgb
  ]);

  (doc as any).autoTable({
    startY: 25,
    head: [['Material', 'Especificação', 'Qtd', 'Viatura', 'Compartimento', 'Unidade', 'SGB']],
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [50, 50, 50] },
    styles: { fontSize: 7 }
  });

  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Auditoria_Material_${searchTerm}.pdf`);
};