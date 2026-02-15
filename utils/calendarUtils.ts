
import { ProntidaoColor } from '../types';
import { PRONTIDAO_CYCLE } from '../constants';

/**
 * Calcula a cor da prontidão baseada na lógica de turnos:
 * Início em 01/01/2026 07:30 (VERDE).
 * Ciclos de 24 horas (07:30 às 07:29 do dia seguinte).
 * Sequência: VERDE -> AMARELA -> AZUL
 */
export const getProntidaoInfo = (date: Date) => {
  // Criar data base usando componentes locais para garantir precisão de fuso horário
  const baseDate = new Date(2026, 0, 1, 7, 30, 0, 0);
  
  const checkDate = new Date(date);
  const hour = checkDate.getHours();
  const minute = checkDate.getMinutes();
  
  // Define o início do turno operacional atual
  let shiftStartDate = new Date(checkDate);
  if (hour < 7 || (hour === 7 && minute < 30)) {
    // Se for antes das 07:30, pertence ao turno que começou no dia anterior
    shiftStartDate.setDate(shiftStartDate.getDate() - 1);
  }
  shiftStartDate.setHours(7, 30, 0, 0);

  // Calcula a diferença em dias considerando o horário local
  const diffInMs = shiftStartDate.getTime() - baseDate.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  
  // Ciclo de 3 dias (Verde, Amarela, Azul)
  const index = ((diffInDays % 3) + 3) % 3;
  return PRONTIDAO_CYCLE[index];
};

/**
 * Retorna a Data de Referência Operacional (Shift Date)
 * Baseado no turno de 24h que inicia as 07:30.
 */
export const getShiftReferenceDate = (date: Date | string): string => {
  const d = new Date(date);
  const hour = d.getHours();
  const minute = d.getMinutes();
  
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
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  return dateStr;
};

export const getLocalTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isNoticeExpired = (expirationDate?: string): boolean => {
  if (!expirationDate) return false;
  const cleanExp = safeDateIso(expirationDate);
  if (!cleanExp || cleanExp.trim() === '') return false;
  const today = getLocalTodayISO();
  return cleanExp < today;
};

export const formatFullDate = (dateInput: Date | string) => {
  try {
    let dateObj: Date;
    if (typeof dateInput === 'string') {
      const cleanDate = safeDateIso(dateInput);
      const [y, m, d] = cleanDate.split('-').map(Number);
      if (!y || !m || !d) return 'Data Inválida';
      dateObj = new Date(y, m - 1, d, 12, 0, 0);
    } else {
      dateObj = dateInput;
    }
    if (isNaN(dateObj.getTime())) return 'Data Inválida';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  } catch (e) {
    return 'Data Inválida';
  }
};

export const formatDateShort = (dateInput: string) => {
  if (!dateInput) return '-';
  try {
    const cleanDate = safeDateIso(dateInput);
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return dateInput; 
    const [y, m, d] = parts.map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  } catch (e) {
    return dateInput;
  }
};

export const isRetroactiveOrFuture = (selectedDate: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(selectedDate);
  target.setHours(0, 0, 0, 0);
  return target.getTime() !== today.getTime();
};
