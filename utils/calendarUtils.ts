
import { ProntidaoColor } from '../types';
import { PRONTIDAO_CYCLE } from '../constants';

/**
 * Calculates the readiness color based on the shift logic:
 * Starts 01/01/2026 07:30 (VERDE).
 * Cycles every 24 hours (07:30 to 07:29 next day).
 * Sequence: VERDE -> AMARELA -> AZUL
 */
export const getProntidaoInfo = (date: Date) => {
  const baseDate = new Date('2026-01-01T07:30:00');
  
  const checkDate = new Date(date);
  const hour = checkDate.getHours();
  const minute = checkDate.getMinutes();
  
  // Define o início da prontidão atual
  let shiftStartDate = new Date(checkDate);
  if (hour < 7 || (hour === 7 && minute < 30)) {
    // Se for antes das 07:30, pertence ao turno que começou ontem
    shiftStartDate.setDate(shiftStartDate.getDate() - 1);
  }
  shiftStartDate.setHours(7, 30, 0, 0);

  const diffInMs = shiftStartDate.getTime() - baseDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  // Ciclo de 3 dias (Verde, Amarela, Azul)
  const index = ((diffInDays % 3) + 3) % 3;
  return PRONTIDAO_CYCLE[index];
};

/**
 * Helper para limpar strings de data (remove parte de tempo ISO se existir)
 */
export const safeDateIso = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  return dateStr;
};

/**
 * Retorna a data de hoje no formato YYYY-MM-DD baseada no horário local do cliente.
 * Essencial para comparações de data consistentes (evita problemas de UTC).
 */
export const getLocalTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Verifica se um aviso expirou comparando a data de validade com a data de hoje local.
 * Retorna TRUE se expirado (data validade < hoje).
 * Retorna FALSE se válido (data validade >= hoje) ou se for indeterminado.
 */
export const isNoticeExpired = (expirationDate?: string): boolean => {
  if (!expirationDate) return false; // Sem data = Indeterminado (Válido)
  
  const cleanExp = safeDateIso(expirationDate);
  if (!cleanExp || cleanExp.trim() === '') return false;

  const today = getLocalTodayISO();
  
  // Comparação léxica de strings ISO (YYYY-MM-DD) funciona corretamente
  // Ex: "2023-10-20" < "2023-10-21" é true (Expirado)
  // Ex: "2023-10-21" < "2023-10-21" é false (Válido até o fim do dia)
  return cleanExp < today;
};

/**
 * Formata uma data (Date object ou string YYYY-MM-DD) para formato legível PT-BR.
 * Resolve o problema de timezone onde a data aparecia como dia anterior.
 * Protege contra Invalid Date.
 */
export const formatFullDate = (dateInput: Date | string) => {
  try {
    let dateObj: Date;

    if (typeof dateInput === 'string') {
      const cleanDate = safeDateIso(dateInput);
      const [y, m, d] = cleanDate.split('-').map(Number);
      
      // Validação básica se o split funcionou
      if (!y || !m || !d) return 'Data Inválida';

      // Cria data local meio-dia para segurança
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
    if (parts.length !== 3) return cleanDate; // Retorna original se falhar parse

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
