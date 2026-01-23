
import { Theme } from '../types';

export const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement;
  
  // Aplica as cores como variáveis CSS globais
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-bg', theme.colors.background);
  root.style.setProperty('--theme-surface', theme.colors.surface);
  root.style.setProperty('--theme-text-main', theme.colors.textMain);
  
  // Cores de Prontidão (com fallback para o padrão se a propriedade não existir no tema antigo)
  root.style.setProperty('--readiness-verde', theme.colors.readinessVerde || '#22c55e');
  root.style.setProperty('--readiness-amarela', theme.colors.readinessAmarela || '#eab308');
  root.style.setProperty('--readiness-azul', theme.colors.readinessAzul || '#3b82f6');
  
  // Define uma variável para texto invertido (usado sobre secondary)
  // Simplificação: se secondary for escuro, texto é branco.
  root.style.setProperty('--theme-text-inv', '#ffffff');
};
