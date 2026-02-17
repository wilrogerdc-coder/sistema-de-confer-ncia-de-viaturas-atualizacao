
import { ProntidaoColor } from '../types';
import { PRONTIDAO_CYCLE } from '../constants';

/**
 * UTILS: CALENDÁRIO OPERACIONAL (Corte 07:30)
 * Resolve fuso horário e garante rotação de prontidão fiel.
 */

export const getProntidaoInfo = (dateInput: Date | string) => {
  const baseDate = new Date(2026, 0, 1, 7, 30, 0, 0); // Marco Zero do Sistema
  
  let checkDate: Date;
  if (typeof dateInput === 'string') {
    const [y, m, d] = dateInput.split('T')[0].split('-').map(Number);
    checkDate = new Date(y, m - 1, d, 12, 0, 0); 
  } else {
    checkDate = new Date(dateInput);
  }

  const hour = checkDate.getHours();
  const minute = checkDate.getMinutes();
  
  let shiftStartDate = new Date(checkDate);
  // REGRA DE TURNO: Antes das 07:30 pertence ao dia operacional anterior
  if (hour < 7 || (hour === 7 && minute < 30)) {
    shiftStartDate.setDate(shiftStartDate.getDate() - 1);
  }
  shiftStartDate.setHours(7, 30, 0, 0);

  const diffInMs = shiftStartDate.getTime() - baseDate.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  
  const index = ((diffInDays % 3) + 3) % 3;
  return PRONTIDAO_CYCLE[index];
};

export const getShiftReferenceDate = (date: Date | string): string => {
  let d: Date;
  if (typeof date === 'string') {
    const [y, m, d_part] = date.split('T')[0].split('-').map(Number);
    d = new Date(y, m - 1, d_part, 12, 0, 0);
  } else {
    d = new Date(date);
  }

  const hour = d.getHours();
  const minute = d.getMinutes();
  
  // REGRA DE TURNO: Corte 07:30 para data de referência
  if (hour < 7 || (hour === 7 && minute < 30)) {
    d.setDate(d.getDate() - 1);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const safeDateIso = (dateStr: string): string => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

export const formatFullDate = (dateInput: Date | string) => {
  try {
    let dateObj: Date;
    if (typeof dateInput === 'string') {
      const [y, m, d] = dateInput.split('T')[0].split('-').map(Number);
      dateObj = new Date(y, m - 1, d, 12, 0, 0);
    } else {
      dateObj = dateInput;
    }
    
    if (isNaN(dateObj.getTime())) return 'Data Inválida';
    
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
    
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (e) {
    return 'Erro na Data';
  }
};

export const formatDateShort = (dateInput: string) => {
  if (!dateInput) return '-';
  const cleanDate = safeDateIso(dateInput);
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return dateInput; 
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const getDaysInMonth = (monthYear: string): number => {
  const [year, month] = monthYear.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};
