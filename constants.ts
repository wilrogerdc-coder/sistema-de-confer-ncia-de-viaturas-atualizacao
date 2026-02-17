
import { Viatura, ProntidaoColor, GB, Subgrupamento, Posto, ViaturaStatus, RolePermissions, UserRole, Theme, HeaderConfig } from './types';

export const PRONTIDAO_CYCLE = [
  { color: ProntidaoColor.VERDE, label: 'Verde', hex: '#10b981' }, // Esmeralda Vibrante
  { color: ProntidaoColor.AMARELA, label: 'Amarela', hex: '#f59e0b' }, // Âmbar Vibrante
  { color: ProntidaoColor.AZUL, label: 'Azul', hex: '#2563eb' } // Safira Vibrante
];

export const INITIAL_GBS: GB[] = [{ id: 'gb1', name: '20º Grupamento de Bombeiros' }];
export const INITIAL_SUBS: Subgrupamento[] = [{ id: 'sub1', gbId: 'gb1', name: '1º Subgrupamento de Bombeiros' }];
export const INITIAL_POSTOS: Posto[] = [{ id: 'posto1', subId: 'sub1', name: 'Birigui', municipio: 'Birigui', classification: 'Pelotão de Bombeiros' }];

// Fix: Definindo INITIAL_VIATURAS que estava faltando mas sendo importado no DataService
export const INITIAL_VIATURAS: Viatura[] = [];

export const RESET_MASTER_TOKEN = "20GB-BOMBEIROS-RESET";

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  secretaria: "SECRETARIA DA SEGURANÇA PÚBLICA",
  policiaMilitar: "POLÍCIA MILITAR DO ESTADO DE SÃO PAULO",
  corpoBombeiros: "CORPO DE BOMBEIROS DO ESTADO DE SÃO PAULO"
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.USER]: ['view_dashboard', 'perform_checklist'],
  [UserRole.ADMIN]: ['view_dashboard', 'perform_checklist', 'view_reports', 'manage_fleet', 'manage_users'],
  [UserRole.SUPER]: [
    'view_dashboard', 'perform_checklist', 'manage_fleet', 'view_reports', 
    'manage_users', 'manage_hierarchy', 'view_audit_logs', 'manage_database', 'manage_parameters', 'manage_themes'
  ]
};

export const PERMISSION_LABELS: Record<string, string> = {
  'view_dashboard': 'Visualizar Dashboard',
  'perform_checklist': 'Realizar Checklists',
  'manage_fleet': 'Gerenciar Frota (Criar/Editar Vtr)',
  'view_reports': 'Acessar Relatórios',
  'manage_users': 'Gerenciar Usuários',
  'manage_hierarchy': 'Gerenciar Hierarquia (GB/SGB/Posto)',
  'view_audit_logs': 'Auditoria e Logs',
  'manage_database': 'Banco de Dados (Backup/Reset)',
  'manage_parameters': 'Parâmetros do Sistema',
  'manage_themes': 'Gerenciar Temas'
};

export const THEME_PRESETS: Theme[] = [
  {
    id: 'modern_red',
    name: 'Modelo 1: Empresarial Red (Padrão)',
    colors: {
      primary: '#e11d48', // Rose Vibrante
      secondary: '#0f172a', // Slate Escuro
      background: '#f8fafc',
      surface: '#ffffff',
      textMain: '#1e293b',
      readinessVerde: '#10b981',
      readinessAmarela: '#f59e0b',
      readinessAzul: '#2563eb'
    }
  },
  {
    id: 'sapphire_blue',
    name: 'Modelo 2: Sapphire Blue (Corporativo)',
    colors: {
      primary: '#2563eb',
      secondary: '#1e293b',
      background: '#f1f5f9',
      surface: '#ffffff',
      textMain: '#0f172a',
      readinessVerde: '#059669',
      readinessAmarela: '#ca8a04',
      readinessAzul: '#1d4ed8'
    }
  },
  {
    id: 'steel_emerald',
    name: 'Modelo 3: Steel Emerald (Futurista)',
    colors: {
      primary: '#059669',
      secondary: '#111827',
      background: '#f9fafb',
      surface: '#ffffff',
      textMain: '#111827',
      readinessVerde: '#10b981',
      readinessAmarela: '#f59e0b',
      readinessAzul: '#3b82f6'
    }
  }
];

export const DEFAULT_THEME = THEME_PRESETS[0];
export const APP_NAME = "Conferência de Materiais";

export const DEFAULT_HEADER = {
  secretaria: "SECRETARIA DA SEGURANÇA PÚBLICA",
  policiaMilitar: "POLÍCIA MILITAR DO ESTADO DE SÃO PAULO",
  corpoBombeiros: "CORPO DE BOMBEIROS DO ESTADO DE SÃO PAULO",
  unidade: "20º GRUPAMENTO DE BOMBEIROS",
  subgrupamento: "1º SUBGRUPAMENTO DE BOMBEIROS",
  pelotao: "PELOTÃO DE BOMBEIROS DE BIRIGUI",
  cidade: "Birigui"
};
