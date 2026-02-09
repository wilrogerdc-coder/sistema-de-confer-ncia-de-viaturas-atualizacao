
import { InventoryCheck, Viatura, CheckEntry, ViaturaStatus, LogEntry } from '../types';
import { formatFullDate, safeDateIso, getShiftReferenceDate, formatDateShort, getProntidaoInfo } from './calendarUtils';
import { PRONTIDAO_CYCLE, DEFAULT_HEADER } from '../constants';

// Helper robusto para obter o construtor jsPDF
const getJsPDF = () => {
  const w = window as any;
  let jsPDFConstructor = w.jspdf?.jsPDF || w.jsPDF;
  if (!jsPDFConstructor) {
    throw new Error("A biblioteca de PDF não foi carregada. Verifique sua conexão com a internet.");
  }
  return jsPDFConstructor;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

export const generateInventoryPDF = (check: InventoryCheck, viatura: Viatura, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  
  const header = check.headerDetails;
  
  // RECALCULA A COR DA PRONTIDÃO PELO TIMESTAMP PARA GARANTIR FIDELIDADE AO TURNO
  const shiftInfo = getProntidaoInfo(new Date(check.timestamp));
  const themeColor = shiftInfo ? shiftInfo.hex : '#dc2626';
  const rgb = hexToRgb(themeColor);
  
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.03 }));
  doc.setFontSize(30);
  doc.setTextColor(100, 100, 100);
  doc.text("POLÍCIA MILITAR DO ESTADO DE SÃO PAULO", 105, 140, { align: "center", angle: 45 });
  doc.restoreGraphicsState();

  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal'); 
  
  const startX = 105;
  let startY = 10;
  const lineSpacing = 4.2;

  doc.text("SECRETARIA DA SEGURANÇA PUBLICA", startX, startY, { align: "center" });
  startY += lineSpacing;
  doc.text("POLÍCIA MILITAR DO ESTADO DE SÃO PAULO", startX, startY, { align: "center" });
  startY += lineSpacing;
  doc.text("CORPO DE BOMBEIROS DO ESTADO DE SÃO PAULO", startX, startY, { align: "center" });
  startY += lineSpacing;
  doc.text(header.unidade.toUpperCase(), startX, startY, { align: "center" });
  startY += lineSpacing;
  doc.text(header.subgrupamento.toUpperCase(), startX, startY, { align: "center" });
  startY += lineSpacing;
  doc.text(header.pelotao.toUpperCase(), startX, startY, { align: "center" });
  startY += lineSpacing + 1;
  
  // USA A DATA DE REFERÊNCIA DO TURNO (07:30 - 07:29)
  const shiftDateStr = getShiftReferenceDate(check.timestamp);
  doc.text(`${header.cidade}, ${formatFullDate(shiftDateStr)}`, startX, startY, { align: "center" });
  
  doc.setFontSize(11);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONFERÊNCIA DE MATERIAIS: ${viatura.prefix}`, 105, startY + 8, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`PRONTIDÃO: ${shiftInfo.label.toUpperCase()}`, 15, startY + 14);
  doc.text(`REALIZADO EM: ${new Date(check.timestamp).toLocaleString('pt-BR')}`, 15, startY + 18);

  let currentY = startY + 22;

  if (check.justification) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 0, 0);
    doc.text("JUSTIFICATIVA DE REGISTRO / RETIFICAÇÃO:", 15, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    const splitJust = doc.splitTextToSize(check.justification, 180);
    doc.text(splitJust, 15, currentY);
    currentY += (splitJust.length * 4) + 2;
  }

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
        { content: entry?.status || '-', styles: { halign: 'center', fontSize: 7, fontStyle: 'bold', textColor: entry?.status === 'CN' ? [220, 38, 38] : [0, 0, 0] } },
        { content: entry?.observation || '', styles: { fontSize: 6 } }
      ]);
    });
  });

  (doc as any).autoTable({
    startY: currentY,
    head: [['Qt', 'Material / Especificação', 'Stat', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: rgb, fontStyle: 'bold', fontSize: 8, cellPadding: 1 },
    styles: { cellPadding: 0.6, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
    rowPageBreak: 'avoid'
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Checklist_${viatura.prefix}_${shiftDateStr}.pdf`);
  }
};

export const generateSummaryPDF = (checks: InventoryCheck[], viaturas: Viatura[], isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4'); 
  const themeColor = [220, 38, 38]; 

  doc.setFontSize(14);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.text("HISTÓRICO DE CONFERÊNCIAS - CBPMSP", 148, 15, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 148, 20, { align: "center" });

  const tableData = checks.map(check => {
    const vtr = viaturas.find(v => v.id === check.viaturaId);
    const hasCN = check.entries.some(e => e.status === 'CN');
    
    // USA LÓGICA DE TURNO PARA RECALCULAR DATA E COR
    const shiftDate = getShiftReferenceDate(check.timestamp);
    const shiftInfo = getProntidaoInfo(new Date(check.timestamp));

    return [
      formatFullDate(shiftDate),
      vtr ? vtr.prefix : '?',
      shiftInfo.label,
      check.commanderName,
      hasCN ? 'COM NOVIDADES' : 'SEM NOVIDADES'
    ];
  });

  (doc as any).autoTable({
    startY: 25,
    head: [['Data Operacional', 'Viatura', 'Prontidão', 'Comandante', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: themeColor, fontSize: 9 },
    styles: { fontSize: 8 }
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Historico_Conferencias.pdf`);
  }
};

export const generateMonthlyFulfillmentPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string, isPreview: boolean = false) => {
    const JsPDF = getJsPDF();
    const doc = new JsPDF('l', 'mm', 'a4'); 
    const themeColor = [51, 65, 85]; 
    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`FREQUÊNCIA MENSAL DE CONFERÊNCIAS - ${month}/${year}`, 148, 15, { align: "center" });
    doc.setFontSize(8);
    doc.text("Ciclo Operacional: 07:30 às 07:29", 148, 20, { align: "center" });

    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    const head = ['Viatura', 'Status Atual', ...dayHeaders];
    
    const body = viaturas.map(v => {
        const row = [v.prefix, v.status];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            // Busca pelo turno operacional para fidelidade do relatório
            const check = checks.find(c => c.viaturaId === v.id && getShiftReferenceDate(c.timestamp) === dateStr);
            if (check) {
                const hasCN = check.entries.some(e => e.status === 'CN');
                row.push(hasCN ? 'CN' : 'OK');
            } else {
                if (v.status === ViaturaStatus.RESERVA) row.push('RES');
                else if (v.status === ViaturaStatus.BAIXADA) row.push('BX');
                else row.push('—');
            }
        }
        return row;
    });

    (doc as any).autoTable({
        startY: 25,
        head: [head],
        body: body,
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 0.5, halign: 'center' },
        headStyles: { fillColor: themeColor, fontSize: 5 },
        columnStyles: { 
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 20 },
            1: { halign: 'left', fontStyle: 'bold', cellWidth: 20 }
        },
        didParseCell: (data: any) => {
           if (data.section === 'body' && data.column.index > 1) {
              const dayIndex = data.column.index - 1;
              const dateStr = `${year}-${month.toString().padStart(2, '0')}-${dayIndex.toString().padStart(2, '0')}`;
              const checkRow = viaturas[data.row.index];
              const check = checks.find(c => c.viaturaId === checkRow.id && getShiftReferenceDate(c.timestamp) === dateStr);
              
              if (check) {
                  // RECALCULA A COR DA PRONTIDÃO PELO TIMESTAMP
                  const shiftInfo = getProntidaoInfo(new Date(check.timestamp));
                  if (shiftInfo) {
                      const rgb = hexToRgb(shiftInfo.hex);
                      // Fundo suave da cor do turno para fidelidade
                      data.cell.styles.fillColor = [
                        Math.min(255, rgb[0] + 230),
                        Math.min(255, rgb[1] + 230),
                        Math.min(255, rgb[2] + 230)
                      ];
                      
                      const hasCN = check.entries.some(e => e.status === 'CN');
                      if (hasCN) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                      } else {
                        data.cell.styles.textColor = rgb;
                      }
                  }
              }
           }
        }
    });

    if (isPreview) {
      const string = doc.output('bloburl');
      window.open(string);
    } else {
      doc.save(`Frequencia_${monthYear}.pdf`);
    }
};

export const generateNewsReportPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('p', 'mm', 'a4'); 
  const themeColor = [220, 38, 38]; 
  const [year, month] = monthYear.split('-').map(Number);
  
  doc.setFontSize(14);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.text(`RELATÓRIO DE NOVIDADES - ${month}/${year}`, 105, 15, { align: "center" });

  const newsData: any[] = [];
  const monthChecks = checks.filter(c => getShiftReferenceDate(c.timestamp).startsWith(monthYear));

  monthChecks.forEach(check => {
    const vtr = viaturas.find(v => v.id === check.viaturaId);
    const novelties = check.entries.filter(e => e.status === 'CN' || e.status === 'NA');
    
    const dateStr = getShiftReferenceDate(check.timestamp);
    
    novelties.forEach(e => {
      const sourceItems = check.snapshot || vtr?.items || [];
      const item = sourceItems.find(i => i.id === e.itemId);
      newsData.push([
        formatDateShort(dateStr),
        vtr?.prefix || '?',
        item?.name || '?',
        e.status,
        e.observation || 'Não informada.'
      ]);
    });
  });

  if (newsData.length === 0) {
    newsData.push(['-', '-', 'Nenhuma novidade registrada no período.', '-', '-']);
  }

  (doc as any).autoTable({
    startY: 25,
    head: [['Data Operacional', 'Viatura', 'Material', 'Status', 'Descrição da Novidade']],
    body: newsData,
    theme: 'grid',
    headStyles: { fillColor: themeColor, fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 15 },
      4: { cellWidth: 'auto' }
    }
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Relatorio_Novidades_${monthYear}.pdf`);
  }
};

export const generateVtrMonthlyItemsPDF = (checks: InventoryCheck[], viatura: Viatura, monthYear: string, isPreview: boolean = false) => {
    const JsPDF = getJsPDF();
    const doc = new JsPDF('l', 'mm', 'a4'); 
    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const themeColor = [51, 65, 85]; 
    const textColor = [0, 0, 0];

    doc.setFontSize(12);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`CHECK LIST ${viatura.prefix} - RELAÇÃO MENSAL DE MATERIAIS`, 148, 12, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Referência: ${month}/${year} (Lógica de Turnos: 07:30 - 07:29)`, 148, 16, { align: "center" });

    const headDays = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const head = ['Material / Item Operacional', ...headDays];
    
    const body = viatura.items.map(item => {
        const row = [item.name];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${monthYear}-${d.toString().padStart(2, '0')}`;
            const check = checks.find(c => c.viaturaId === viatura.id && getShiftReferenceDate(c.timestamp) === dateStr);
            if (!check) {
                if (String(viatura.status) === ViaturaStatus.RESERVA) row.push('RES');
                else if (String(viatura.status) === ViaturaStatus.BAIXADA) row.push('BX');
                else row.push('');
            } else {
                const entry = check.entries.find(e => e.itemId === item.id);
                row.push(entry?.status || '');
            }
        }
        return row;
    });

    const respRow = [{ content: 'Responsável (Turno)', styles: { halign: 'left', fontStyle: 'bold', fontSize: 6, fillColor: [248, 250, 252] } }];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthYear}-${d.toString().padStart(2, '0')}`;
        const check = checks.find(c => c.viaturaId === viatura.id && getShiftReferenceDate(c.timestamp) === dateStr);
        if (check && check.responsibleNames && check.responsibleNames.length > 0) {
            const fullName = check.responsibleNames[0].trim();
            respRow.push({ content: fullName.toUpperCase(), styles: { cellPadding: 0, halign: 'center', fillColor: [248, 250, 252] } } as any);
        } else {
            respRow.push({ content: '', styles: { fillColor: [248, 250, 252] } } as any);
        }
    }

    const margin = 10;
    const materialColWidth = 75;

    (doc as any).autoTable({
        startY: 18,
        head: [head],
        body: [...body, respRow],
        theme: 'grid',
        styles: { 
          fontSize: 5, 
          cellPadding: 0.6, 
          halign: 'center', 
          textColor: textColor, 
          lineColor: [200, 200, 200], 
          lineWidth: 0.05,
          overflow: 'hidden' 
        },
        headStyles: { fillColor: themeColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 5.5 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: materialColWidth, fontSize: 5.5 } },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index > 0 && data.row.index < body.length) {
              const dayIndex = data.column.index;
              const dateStr = `${monthYear}-${dayIndex.toString().padStart(2, '0')}`;
              const check = checks.find(c => c.viaturaId === viatura.id && getShiftReferenceDate(c.timestamp) === dateStr);
              if (check) {
                  // RECALCULA A COR DA PRONTIDÃO PELO TIMESTAMP
                  const shiftInfo = getProntidaoInfo(new Date(check.timestamp));
                  if (shiftInfo) {
                      const rgb = hexToRgb(shiftInfo.hex);
                      data.cell.styles.fillColor = [Math.min(255, rgb[0] + 240), Math.min(255, rgb[1] + 240), Math.min(255, rgb[2] + 240)];
                  }
              }
              const text = data.cell.text[0];
              if (text === 'CN') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
              else if (text === 'S') { data.cell.styles.textColor = [34, 197, 94]; }
            }
        },
        margin: { left: margin, right: margin }
    });

    if (isPreview) {
      const string = doc.output('bloburl');
      window.open(string);
    } else {
      doc.save(`Mapa_Mensal_${viatura.prefix}_${monthYear}.pdf`);
    }
};

export const generateEfficiencyReportPDF = (checks: InventoryCheck[], viaturas: Viatura[], monthYear: string, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('p', 'mm', 'a4');
  const [year, month] = monthYear.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const themeColor = [34, 197, 94];

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`RELATÓRIO DE EFICIÊNCIA - ${month}/${year}`, 105, 15, { align: "center" });

  const data = viaturas.map(v => {
    const vChecks = checks.filter(c => c.viaturaId === v.id && getShiftReferenceDate(c.timestamp).startsWith(monthYear));
    const uniqueDays = new Set(vChecks.map(c => getShiftReferenceDate(c.timestamp))).size;
    const efficiency = ((uniqueDays / daysInMonth) * 100).toFixed(1);
    
    let statusLabel = 'REGULAR';
    if (uniqueDays === daysInMonth) statusLabel = 'EXCELENTE';
    else if (uniqueDays >= (daysInMonth * 0.8)) statusLabel = 'BOM';
    else if (uniqueDays < (daysInMonth * 0.5)) statusLabel = 'CRÍTICO';

    return [v.prefix, v.name, v.status, `${uniqueDays} / ${daysInMonth}`, `${efficiency}%`, statusLabel];
  });

  (doc as any).autoTable({
    startY: 25,
    head: [['Viatura', 'Tipo', 'Status', 'Dias Conferidos', 'Eficiência', 'Classificação']],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: themeColor, fontSize: 9 },
    styles: { fontSize: 8 }
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Relatorio_Eficiencia_${monthYear}.pdf`);
  }
};

export const generateDailyManualCheckPDF = (viatura: Viatura, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF();
  const rgb = [220, 38, 38]; 
  
  doc.setFontSize(8);
  doc.text("POLÍCIA MILITAR DO ESTADO DE SÃO PAULO", 105, 10, { align: "center" });
  doc.text("CORPO DE BOMBEIROS - CONFERÊNCIA MANUAL DIÁRIA", 105, 14, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`CHECKLIST MANUAL: ${viatura.prefix}`, 105, 22, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Viatura: ${viatura.name}`, 15, 30);
  doc.text(`Data: ____/____/____   Prontidão: ______________   Comandante: ____________________________`, 15, 35);

  const tableData: any[] = [];
  const grouped = viatura.items.reduce((acc, item) => {
    const comp = item.compartment || 'GERAL';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(grouped).forEach(([compartment, items]) => {
    tableData.push([{ content: compartment, colSpan: 3, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', fontSize: 7 } }]);
    (items as any[]).forEach(item => {
      tableData.push([
        item.quantity.toString().padStart(2, '0'),
        { content: `${item.name}${item.specification ? ' (' + item.specification + ')' : ''}`, styles: { fontSize: 7 } },
        { content: '[  ] S  [  ] CN', styles: { halign: 'center', fontSize: 7 } }
      ]);
    });
  });

  (doc as any).autoTable({
    startY: 40,
    head: [['Qt', 'Material / Item Operacional', 'Status (Marcar)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: rgb, fontStyle: 'bold', fontSize: 8 },
    styles: { cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'center' },
    }
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Manual_Diario_${viatura.prefix}.pdf`);
  }
};

export const generateMonthlyManualCheckPDF = (viatura: Viatura, monthYear: string, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4'); 
  const [year, month] = monthYear.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`MAPA MENSAL DE CONFERÊNCIA (MANUAL) - ${viatura.prefix}`, 148, 12, { align: "center" });
  doc.setFontSize(8);
  doc.text(`Mês de Referência: ${month}/${year}`, 148, 16, { align: "center" });

  const headDays = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const head = ['Item', ...headDays];
  
  const body = viatura.items.map(item => {
      const row = [item.name];
      for (let d = 1; d <= daysInMonth; d++) row.push('');
      return row;
  });

  (doc as any).autoTable({
      startY: 20,
      head: [head],
      body: body,
      theme: 'grid',
      styles: { fontSize: 4.5, cellPadding: 0.5, halign: 'center', lineWidth: 0.05 },
      headStyles: { fillColor: [80, 80, 80], fontSize: 5 },
      columnStyles: { 0: { halign: 'left', cellWidth: 60, fontSize: 5 } }
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Mapa_Manual_Mensal_${viatura.prefix}.pdf`);
  }
};

export const generateMaterialAuditPDF = (results: any[], searchTerm: string, isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4');
  const themeColor = [15, 23, 42]; 

  doc.setFontSize(16);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text("AUDITORIA DE MATERIAIS - RESULTADO DE BUSCA", 148, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Termo: "${searchTerm.toUpperCase()}" | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 148, 26, { align: "center" });

  const tableData = results.map(r => [
    r.name,
    r.spec || '-',
    r.qty,
    r.vtrPrefix,
    r.compartment || 'Geral',
    `${r.posto} (${r.sgb})`
  ]);

  (doc as any).autoTable({
    startY: 35,
    head: [['Material', 'Especificação', 'Qtd', 'Viatura', 'Compartimento', 'Localização']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: themeColor, fontSize: 9, halign: 'center' },
    styles: { fontSize: 8, cellPadding: 1.5 },
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Auditoria_Materiais_${searchTerm.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  }
};

export const generateAuditLogPDF = (logs: LogEntry[], isPreview: boolean = false) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF('l', 'mm', 'a4'); 
  const themeColor = [79, 70, 229]; 

  doc.setFontSize(14);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.text("RELATÓRIO DE LOGS DE AUDITORIA", 148, 15, { align: "center" });
  
  const tableData = logs.map(log => [
    new Date(log.timestamp).toLocaleString('pt-BR'),
    log.userName,
    log.action,
    log.details
  ]);

  (doc as any).autoTable({
    startY: 25,
    head: [['Data / Hora', 'Usuário', 'Ação', 'Detalhes']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: themeColor, fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 1.5 },
  });

  if (isPreview) {
    const string = doc.output('bloburl');
    window.open(string);
  } else {
    doc.save(`Relatorio_Logs.pdf`);
  }
};
