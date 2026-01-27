import { InventoryCheck, Viatura, CheckEntry, ViaturaStatus, LogEntry } from '../types';
import { formatFullDate, safeDateIso } from './calendarUtils';
import { PRONTIDAO_CYCLE, DEFAULT_HEADER } from '../constants';

// Helper robusto para obter o construtor jsPDF
const getJsPDF = () => {
  const w = window as any;
  let jsPDFConstructor = w.jspdf?.jsPDF || w.jsPDF;
  if (!jsPDFConstructor) {
    throw new Error("A biblioteca de PDF não foi carregada. Verifique sua conexão com a internet.");
  }
  const hasAutoTable = w.jspdf?.plugin?.autotable || w.jsPDF?.API?.autoTable || (new jsPDFConstructor() as any).autoTable;
  if (!hasAutoTable) {
    throw new Error("O plugin de tabelas (autoTable) não foi carregado corretamente.");
  }
  return jsPDFConstructor;
};

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

export const generateInventoryPDF = (check: InventoryCheck, viatura: Viatura, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  const header = check.headerDetails;
  const shiftInfo = PRONTIDAO_CYCLE.find(p => p.label === check.shiftColor);
  const themeColor = shiftInfo ? shiftInfo.hex : '#dc2626';
  const rgb = hexToRgb(themeColor);
  
  doc.setFontSize(8);
  doc.text(header.unidade.toUpperCase(), 105, 15, { align: "center" });
  doc.text(header.subgrupamento.toUpperCase(), 105, 19, { align: "center" });
  doc.text(header.pelotao.toUpperCase(), 105, 23, { align: "center" });
  
  doc.setFontSize(11);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONFERÊNCIA DE MATERIAIS: ${viatura.prefix}`, 105, 32, { align: "center" });

  const tableData: any[] = [];
  const itemsToList = check.snapshot || viatura.items;
  const grouped = itemsToList.reduce((acc, item) => {
    const comp = item.compartment || 'GERAL';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(grouped).forEach(([compartment, items]) => {
    tableData.push([{ content: compartment, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', fontSize: 7 } }]);
    (items as any[]).forEach(item => {
      const entry = check.entries.find(e => e.itemId === item.id);
      tableData.push([
        item.quantity.toString().padStart(2, '0'),
        { content: `${item.name}${item.specification ? ' (' + item.specification + ')' : ''}`, styles: { fontSize: 7 } },
        { content: entry?.status || '-', styles: { halign: 'center', fontSize: 7, fontStyle: 'bold' } },
        { content: entry?.observation || '', styles: { fontSize: 6 } }
      ]);
    });
  });

  (doc as any).autoTable({
    startY: 40,
    head: [['Qt', 'Material / Especificação', 'Stat', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: rgb, fontSize: 8 },
    styles: { cellPadding: 0.8 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 90 }, 2: { cellWidth: 12 }, 3: { cellWidth: 'auto' } }
  });

  if (isPreview) window.open(doc.output('bloburl'));
  else doc.save(`Checklist_${viatura.prefix}.pdf`);
};

export const generateVtrMonthlyItemsPDF = (checks: InventoryCheck[], viatura: Viatura, monthYear: string, isPreview: boolean = false) => {
    const JsPDF = getJsPDF();
    const doc = new JsPDF('l', 'mm', 'a4'); 
    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const themeColor = [51, 65, 85]; 

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`CHECK LIST ${viatura.prefix} - RELAÇÃO MENSAL DE MATERIAIS`, 148, 12, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Referência: ${month}/${year}`, 148, 16, { align: "center" });

    const headDays = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const head = ['Material / Item Operacional', ...headDays];
    
    // Corpo: Materiais
    const body = viatura.items.map(item => {
        const row = [item.name];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${monthYear}-${d.toString().padStart(2, '0')}`;
            const check = checks.find(c => c.viaturaId === viatura.id && safeDateIso(c.date) === dateStr);
            if (!check) row.push('');
            else {
                const entry = check.entries.find(e => e.itemId === item.id);
                row.push(entry?.status || '');
            }
        }
        return row;
    });

    // Linha de Responsáveis (Conferentes)
    const respRow = ['Responsável (Conferente)'];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthYear}-${d.toString().padStart(2, '0')}`;
        const check = checks.find(c => c.viaturaId === viatura.id && safeDateIso(c.date) === dateStr);
        // Pegamos o primeiro nome de guerra se existir
        const name = (check && check.responsibleNames && check.responsibleNames.length > 0) 
            ? check.responsibleNames[0].split(' ').pop()?.toUpperCase() || '' 
            : '';
        respRow.push(name);
    }

    (doc as any).autoTable({
        startY: 20,
        head: [head],
        body: [...body, respRow],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 0.5, halign: 'center', overflow: 'hidden' },
        headStyles: { fillColor: themeColor, fontSize: 5 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 70 } },
        didParseCell: (data: any) => {
            // Se for a última linha (Responsáveis) e não for a primeira coluna
            if (data.row.index === body.length && data.column.index > 0) {
                data.cell.styles.minCellHeight = 35; // Altura para o texto vertical
            }
        },
        didDrawCell: (data: any) => {
            // Lógica para rotacionar o nome a 90 graus na última linha
            if (data.row.index === body.length && data.column.index > 0 && data.cell.raw) {
                const text = data.cell.raw.toString();
                if (text) {
                    doc.saveGraphicsState();
                    // Posicionamento centralizado na célula
                    const x = data.cell.x + (data.cell.width / 2);
                    const y = data.cell.y + data.cell.height - 2;
                    doc.setFontSize(4.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(text, x, y, { angle: 90 });
                    doc.restoreGraphicsState();
                    // Limpamos o texto original da célula para não sobrepor
                    data.cell.text = [];
                }
            }
        },
        margin: { left: 10, right: 10 }
    });

    if (isPreview) window.open(doc.output('bloburl'));
    else doc.save(`Relacao_Mensal_${viatura.prefix}.pdf`);
};

export const generateSummaryPDF = (checks: InventoryCheck[], viaturas: Viatura[]) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4'); 
  doc.text("HISTÓRICO DE CONFERÊNCIAS", 148, 15, { align: "center" });
  const tableData = checks.map(c => [
    formatDateShort(c.date),
    viaturas.find(v => v.id === c.viaturaId)?.prefix || '?',
    c.shiftColor,
    c.commanderName,
    c.entries.some(e => e.status === 'CN') ? 'COM NOVIDADES' : 'OK'
  ]);
  (doc as any).autoTable({ startY: 25, head: [['Data', 'Vtr', 'Turno', 'Cmt', 'Status']], body: tableData });
  doc.save(`Resumo_Historico.pdf`);
};

export const generateMonthlyFulfillmentPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string) => {
    const JsPDF = getJsPDF();
    const doc = new JsPDF('l', 'mm', 'a4'); 
    doc.text(`FREQUÊNCIA MENSAL - ${monthYear}`, 148, 15, { align: "center" });
    const [year, month] = monthYear.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    const head = ['Vtr', ...Array.from({ length: days }, (_, i) => (i + 1).toString())];
    const body = viaturas.map(v => {
        const row = [v.prefix];
        for (let d = 1; d <= days; d++) {
            const date = `${monthYear}-${d.toString().padStart(2, '0')}`;
            const check = checks.find(c => c.viaturaId === v.id && safeDateIso(c.date) === date);
            row.push(check ? (check.entries.some(e => e.status === 'CN') ? 'CN' : 'OK') : '—');
        }
        return row;
    });
    (doc as any).autoTable({ startY: 20, head: [head], body: body, styles: { fontSize: 5 } });
    doc.save(`Frequencia_${monthYear}.pdf`);
};

export const generateNewsReportPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string, isPreview: boolean = false) => {
    const JsPDF = getJsPDF();
    const doc = new JsPDF();
    doc.text(`CONSOLIDADO DE NOVIDADES - ${monthYear}`, 105, 15, { align: "center" });
    const news: any[] = [];
    checks.filter(c => safeDateIso(c.date).startsWith(monthYear)).forEach(c => {
        const vtr = viaturas.find(v => v.id === c.viaturaId);
        c.entries.filter(e => e.status === 'CN' || e.status === 'NA').forEach(e => {
            const item = (c.snapshot || vtr?.items || []).find(i => i.id === e.itemId);
            news.push([formatDateShort(c.date), vtr?.prefix, item?.name, e.status, e.observation]);
        });
    });
    (doc as any).autoTable({ startY: 25, head: [['Data', 'Vtr', 'Material', 'Status', 'Obs']], body: news });
    if (isPreview) window.open(doc.output('bloburl'));
    else doc.save(`Novidades_${monthYear}.pdf`);
};

export const generateEfficiencyReportPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  doc.text(`EFICIÊNCIA DE CONFERÊNCIA - ${monthYear}`, 105, 15, { align: "center" });
  const data = viaturas.map(v => {
    const count = checks.filter(c => c.viaturaId === v.id && safeDateIso(c.date).startsWith(monthYear)).length;
    return [v.prefix, count.toString(), `${((count/30)*100).toFixed(1)}%`];
  });
  (doc as any).autoTable({ startY: 25, head: [['Vtr', 'Dias Conferidos', '%']], body: data });
  doc.save(`Eficiencia_${monthYear}.pdf`);
};

export const generateDailyManualCheckPDF = (viatura: Viatura) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  doc.text(`CHECKLIST MANUAL - ${viatura.prefix}`, 105, 15, { align: "center" });
  const body = viatura.items.map(i => [i.quantity, i.name, '[ ] S [ ] CN']);
  (doc as any).autoTable({ startY: 25, head: [['Qtd', 'Material', 'Status']], body: body });
  doc.save(`Manual_${viatura.prefix}.pdf`);
};

export const generateMonthlyManualCheckPDF = (viatura: Viatura, monthYear: string) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4');
  doc.text(`MAPA MENSAL EM BRANCO - ${viatura.prefix}`, 148, 15, { align: "center" });
  doc.save(`Mapa_Manual_${viatura.prefix}.pdf`);
};

// Fix: Adicionando exportação de generateAuditLogPDF solicitada pelo LogManager.tsx
export const generateAuditLogPDF = (logs: LogEntry[]) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("RELATÓRIO DE AUDITORIA E LOGS", 148, 15, { align: "center" });
  
  const tableData = logs.map(l => [
    new Date(l.timestamp).toLocaleString('pt-BR'),
    l.userName,
    l.action,
    l.details
  ]);

  (doc as any).autoTable({
    startY: 25,
    head: [['Data/Hora', 'Usuário', 'Ação', 'Detalhes']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto' }
    }
  });

  doc.save(`Relatorio_Auditoria_${new Date().toISOString().split('T')[0]}.pdf`);
};

const formatDateShort = (dateStr: string) => {
    const parts = safeDateIso(dateStr).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
};
