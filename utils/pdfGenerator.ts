
import { InventoryCheck, Viatura, CheckEntry, ViaturaStatus, LogEntry, Posto } from '../types';
import { formatFullDate, safeDateIso, getShiftReferenceDate, formatDateShort, getProntidaoInfo } from './calendarUtils';
import { PRONTIDAO_CYCLE, DEFAULT_HEADER } from '../constants';

/**
 * UTILS: GERADOR DE PDF (pdfGenerator.ts) - VERSÃO ENGENHARIA AVANÇADA V2.7
 * Foco: Fidelidade institucional, correção de hierarquia e numeração de páginas.
 */

const getJsPDF = () => {
  const w = window as any;
  let jsPDFConstructor = w.jspdf?.jsPDF || w.jsPDF;
  if (!jsPDFConstructor) {
    throw new Error("Biblioteca jsPDF não localizada no escopo global.");
  }
  return jsPDFConstructor;
};

/**
 * Utilitário para garantir caixa alta segura em strings.
 */
const safeUpper = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).toUpperCase();
};

/**
 * Conversão de Hex para RGB para compatibilidade jsPDF.
 */
const hexToRgb = (hex: string): [number, number, number] => {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

/**
 * ADICIONA NUMERAÇÃO DE PÁGINAS EM TODOS OS RELATÓRIOS
 * Posiciona o contador no rodapé centralizado em todas as páginas do documento.
 */
const addPageNumbers = (doc: any) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Sistema SiscoV • Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
};

export const getHistoricalVtrStatus = (vtr: Viatura, dateStr: string, checks: InventoryCheck[]) => {
    const dayCheck = checks.find(c => c.viaturaId === vtr.id && getShiftReferenceDate(c.timestamp) === dateStr);
    if (dayCheck && dayCheck.viaturaStatusAtTime) return dayCheck.viaturaStatusAtTime;
    return vtr.status;
};

/**
 * RELATÓRIO 1: ESPELHO DE CONFERÊNCIA INDIVIDUAL (HISTÓRICO)
 * REESTRUTURADO: 7 Linhas de cabeçalho com dados fixos e dinâmicos.
 */
export const generateInventoryPDF = (check: InventoryCheck, viatura: Viatura, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  
  // Recupera o cabeçalho gravado no momento do checklist (ou padrão caso legado)
  const header = check.headerDetails || DEFAULT_HEADER;
  const shiftInfo = getProntidaoInfo(new Date(check.timestamp));
  const rgb = hexToRgb(shiftInfo.hex);
  const shiftDateStr = getShiftReferenceDate(check.timestamp);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal'); 
  let startY = 10;
  
  // --- CONSTRUÇÃO DO CABEÇALHO OFICIAL (7 LINHAS) ---
  const headerLines = [
    header.secretaria,       // Linha 1: SSP (Padrão)
    header.policiaMilitar,   // Linha 2: PMESP (Padrão)
    header.corpoBombeiros,   // Linha 3: CBPMESP (Padrão)
    header.unidade,          // Linha 4: Grupamento (GB)
    header.subgrupamento,    // Linha 5: Subgrupamento (SGB)
    header.pelotao           // Linha 6: Unidade Operacional (Ex: ESTAÇÃO DE BOMBEIROS JUSSARA)
  ];

  headerLines.forEach(line => {
    if (line) {
      doc.text(safeUpper(line), 105, startY, { align: "center" });
      startY += 4.2;
    }
  });
  
  // Linha 7: Município e Data (Ex: BIRIGUI, 24 DE MAIO DE 2024)
  const localidadeEData = `${safeUpper(header.cidade)}, ${safeUpper(formatFullDate(shiftDateStr))}`;
  doc.text(localidadeEData, 105, startY, { align: "center" });
  
  // Título do Relatório
  startY += 8;
  doc.setFontSize(11);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONFERÊNCIA DE MATERIAIS: ${viatura.prefix}`, 105, startY, { align: "center" });
  
  // Dados de Referência do Registro
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`PRONTIDÃO: ${safeUpper(shiftInfo.label)}`, 15, startY + 6);
  doc.text(`REGISTRO OFICIAL: ${new Date(check.timestamp).toLocaleString('pt-BR')}`, 15, startY + 10);

  let currentY = startY + 18;

  // Justificativa do Registro (caso exista)
  if (check.justification) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text("JUSTIFICATIVA DO REGISTRO:", 15, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(0, 0, 0);
    const splitJust = doc.splitTextToSize(check.justification, 180);
    doc.text(splitJust, 15, currentY);
    currentY += (splitJust.length * 4) + 2;
  }

  // Tabela de Itens (Snapshot do momento da conferência)
  const tableData: any[] = [];
  const itemsToList = check.snapshot || viatura.items;
  const grouped = itemsToList.reduce((acc, item) => {
    const comp = item.compartment || 'GERAL';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(grouped).forEach(([compartment, items]) => {
    tableData.push([{ content: safeUpper(compartment), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', fontSize: 7 } }]);
    items.forEach(item => {
      const entry = check.entries.find(e => e.itemId === item.id);
      tableData.push([
        item.quantity.toString().padStart(2, '0'),
        { content: `${item.name}${item.specification ? ' (' + item.specification + ')' : ''}`, styles: { fontSize: 7 } },
        { content: entry?.status || '-', styles: { halign: 'center', fontSize: 7, fontStyle: 'bold', textColor: entry?.status === 'CN' ? [220, 38, 38] : [0,0,0] } },
        { content: entry?.observation || '', styles: { fontSize: 6 } }
      ]);
    });
  });

  (doc as any).autoTable({
    startY: currentY,
    head: [['Qt', 'Material / Equipamento', 'Status', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: rgb, fontStyle: 'bold', fontSize: 8 },
    styles: { cellPadding: 0.8 },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 90 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 'auto' } },
    margin: { left: 15, right: 15 }
  });

  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Checklist_${viatura.prefix}.pdf`);
};

/**
 * RELATÓRIO 3: MAPA MENSAL DETALHADO (NOMES 90º)
 */
export const generateVtrDetailedMonthlyPDF = (viatura: Viatura, checks: InventoryCheck[], monthYear: string, isPreview: boolean = false) => {
    const JsPDF = getJsPDF();
    const doc = new JsPDF('l', 'mm', 'a4'); 
    
    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`MAPA MENSAL DE CONFERÊNCIA DETALHADO: ${viatura.prefix} - ${monthYear}`, 148, 12, { align: "center" });

    const body: any[] = viatura.items.map(item => {
        const row: any[] = [safeUpper(item.name)];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${monthYear}-${d.toString().padStart(2, '0')}`;
            const check = checks.find(c => c.viaturaId === viatura.id && getShiftReferenceDate(c.timestamp) === dateStr);
            if (check) {
                const entry = check.entries.find(e => e.itemId === item.id);
                row.push(entry?.status || '-');
            } else {
                const hStatus = getHistoricalVtrStatus(viatura, dateStr, checks);
                row.push(hStatus === ViaturaStatus.RESERVA ? 'RES' : hStatus === ViaturaStatus.BAIXADA ? 'BX' : '');
            }
        }
        return row;
    });

    const conferenteRow: any[] = ['CONFERENTE'];
    for (let d = 1; d <= daysInMonth; d++) conferenteRow.push(''); 
    body.push(conferenteRow);

    const dayColWidth = 222 / daysInMonth; 

    (doc as any).autoTable({
        startY: 20,
        head: [['Material / Especificação', ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString())]],
        body,
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 0.5, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [51, 65, 85], fontSize: 5 },
        columnStyles: { 0: { cellWidth: 55, halign: 'left', fontStyle: 'bold' }, ...Object.fromEntries(Array.from({length: daysInMonth}, (_, i) => [i + 1, { cellWidth: dayColWidth }])) },
        margin: { left: 10, right: 10 },
        
        didDrawCell: (data: any) => {
            const isLastRow = data.row.index === body.length - 1;
            const isDayColumn = data.column.index > 0;

            if (isLastRow && isDayColumn) {
                const day = data.column.index;
                const dateStr = `${monthYear}-${day.toString().padStart(2, '0')}`;
                const check = checks.find(c => c.viaturaId === viatura.id && getShiftReferenceDate(c.timestamp) === dateStr);
                
                if (check && Array.isArray(check.responsibleNames) && check.responsibleNames.length > 0) {
                    const name = safeUpper(check.responsibleNames[0]);
                    if (name) {
                        doc.saveGraphicsState();
                        doc.setFontSize(4);
                        doc.setFont('helvetica', 'bold');
                        const x = data.cell.x + (data.cell.width / 2) + 1;
                        const y = data.cell.y + data.cell.height - 2;
                        doc.text(name, x, y, { angle: 90, align: 'left' });
                        doc.restoreGraphicsState();
                    }
                }
            }
        },
        didParseCell: (data: any) => {
            if (data.row.index === body.length - 1) {
                data.cell.styles.minCellHeight = 28; 
                if (data.column.index > 0) data.cell.styles.valign = 'bottom';
            }
        }
    });

    addPageNumbers(doc);
    if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Mapa_Mensal_${viatura.prefix}.pdf`);
};

/**
 * RELATÓRIO DE EFICIÊNCIA OPERACIONAL
 * Corrigido: Vinculação fiel do posto para evitar unidades trocadas.
 */
export const generateEfficiencyReportPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string, isPreview: boolean = false, allPostos: Posto[] = []) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('p', 'mm', 'a4');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(`EFICIÊNCIA OPERACIONAL POR UNIDADE - ${monthYear}`, 105, 15, { align: "center" });
  
  const data = viaturas.map(v => {
    const vChecks = checks.filter(c => c.viaturaId === v.id && getShiftReferenceDate(c.timestamp).startsWith(monthYear));
    const uniqueDays = new Set(vChecks.map(c => getShiftReferenceDate(c.timestamp))).size;
    
    const posto = allPostos.find(p => p.id === v.postoId);
    const unitLabel = posto ? safeUpper(posto.name) : 'S/ VINCULAÇÃO';

    return [
      v.prefix, 
      unitLabel, 
      `${uniqueDays} dias`, 
      `${((uniqueDays / 30) * 100).toFixed(1)}%`
    ];
  });
  
  (doc as any).autoTable({ 
    startY: 25, 
    head: [['Viatura', 'Unidade / Posto', 'Dias Conferidos', 'Eficiência']], 
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] },
    styles: { fontSize: 8 }
  });
  
  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Eficiencia_${monthYear}.pdf`);
};

/**
 * DEMAIS RELATÓRIOS (Numeração de páginas aplicada)
 */
export const generateNewsReportPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`RESUMO DE NOVIDADES - ${monthYear}`, 105, 15, { align: "center" });
  const data = checks.filter(c => getShiftReferenceDate(c.timestamp).startsWith(monthYear)).flatMap(c => {
    const vtr = viaturas.find(v => v.id === c.viaturaId);
    return c.entries.filter(e => e.status === 'CN').map(e => [
      formatDateShort(getShiftReferenceDate(c.timestamp)),
      vtr?.prefix || '?',
      e.observation || 'S/ detalhes'
    ]);
  });
  (doc as any).autoTable({ startY: 25, head: [['Data', 'Vtr', 'Novidade']], body: data });
  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Novidades.pdf`);
};

export const generateSummaryPDF = (checks: InventoryCheck[], viaturas: Viatura[], isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l'); 
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("HISTÓRICO GERAL DE CONFERÊNCIAS", 148, 15, { align: "center" });
  const data = checks.map(c => [formatDateShort(getShiftReferenceDate(c.timestamp)), viaturas.find(v => v.id === c.viaturaId)?.prefix || '?', c.commanderName]);
  (doc as any).autoTable({ startY: 25, head: [['Data', 'Vtr', 'Comandante']], body: data });
  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Resumo_Geral.pdf`);
};

export const generateMaterialAuditPDF = (results: any[], searchTerm: string, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l'); 
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`AUDITORIA: ${safeUpper(searchTerm)}`, 148, 15, { align: "center" });
  const data = results.map(r => [r.name, r.qty, r.vtrPrefix, r.posto]);
  (doc as any).autoTable({ startY: 25, head: [['Material', 'Qtd', 'Vtr', 'Posto']], body: data });
  addPageNumbers(doc);
  if (isPreview) window.open(doc.output('bloburl'), '_blank'); else doc.save(`Auditoria.pdf`);
};

export const generateAuditLogPDF = (logs: LogEntry[]) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("LOGS DO SISTEMA", 10, 15);
  const data = logs.map(l => [new Date(l.timestamp).toLocaleString('pt-BR'), l.userName, l.action, l.details]);
  (doc as any).autoTable({ startY: 25, head: [['Data', 'Usuário', 'Ação', 'Detalhes']], body: data });
  addPageNumbers(doc);
  doc.save(`Logs.pdf`);
};
