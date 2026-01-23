
import { Viatura, ProntidaoColor, GB, Subgrupamento, Posto, ViaturaStatus, RolePermissions, UserRole, Theme } from './types';

export const PRONTIDAO_CYCLE = [
  { color: ProntidaoColor.VERDE, label: 'Verde', hex: '#22c55e' },
  { color: ProntidaoColor.AMARELA, label: 'Amarela', hex: '#eab308' },
  { color: ProntidaoColor.AZUL, label: 'Azul', hex: '#3b82f6' }
];

export const INITIAL_GBS: GB[] = [{ id: 'gb1', name: '20º Grupamento de Bombeiros' }];
export const INITIAL_SUBS: Subgrupamento[] = [{ id: 'sub1', gbId: 'gb1', name: '1º Subgrupamento de Bombeiros' }];
export const INITIAL_POSTOS: Posto[] = [{ id: 'posto1', subId: 'sub1', name: 'Pelotão de Bombeiros de Birigui' }];

export const RESET_MASTER_TOKEN = "20GB-BOMBEIROS-RESET";

// Matriz de Permissões Padrão (Fallback)
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.USER]: ['view_dashboard', 'perform_checklist'],
  [UserRole.ADMIN]: ['view_dashboard', 'perform_checklist', 'view_reports', 'manage_fleet', 'manage_users', 'manage_notices'],
  [UserRole.SUPER]: [
    'view_dashboard', 'perform_checklist', 'manage_fleet', 'view_reports', 
    'manage_users', 'manage_hierarchy', 'view_audit_logs', 'manage_database', 'manage_parameters', 'manage_themes', 'manage_notices'
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
  'manage_themes': 'Gerenciar Temas',
  'manage_notices': 'Gerenciar Avisos (Mural)'
};

export const THEME_PRESETS: Theme[] = [
  {
    id: 'modern',
    name: 'Moderno (Padrão)',
    colors: {
      primary: '#dc2626',   // Red-600
      secondary: '#0f172a', // Slate-900
      background: '#f8fafc', // Slate-50
      surface: '#ffffff',
      textMain: '#0f172a',
      readinessVerde: '#22c55e',
      readinessAmarela: '#eab308',
      readinessAzul: '#3b82f6'
    }
  },
  {
    id: 'professional',
    name: 'Profissional',
    colors: {
      primary: '#2563eb',   // Blue-600
      secondary: '#1e293b', // Slate-800
      background: '#f1f5f9', // Slate-100
      surface: '#ffffff',
      textMain: '#1e293b',
      readinessVerde: '#15803d', // Verde mais sóbrio
      readinessAmarela: '#ca8a04', // Amarelo ocre
      readinessAzul: '#1d4ed8' // Azul forte
    }
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    colors: {
      primary: '#059669',   // Emerald-600
      secondary: '#171717', // Neutral-900
      background: '#fafafa', // Neutral-50
      surface: '#ffffff',
      textMain: '#171717',
      readinessVerde: '#059669',
      readinessAmarela: '#d97706',
      readinessAzul: '#2563eb'
    }
  }
];

export const DEFAULT_THEME = THEME_PRESETS[0];

export const INITIAL_VIATURAS: Viatura[] = [
  {
    id: 'abs20103',
    name: 'Auto Bomba Salvamento',
    prefix: 'ABS-20103',
    status: ViaturaStatus.OPERANDO,
    postoId: 'posto1',
    items: [
      { id: 'abs_1', name: 'Caixa de Calços', specification: '', quantity: 1, compartment: 'GAVETÃO ATRÁS DA CABINE 01' },
      { id: 'abs_2', name: 'EPR Completos', specification: 'Drager', quantity: 2, compartment: 'GAVETÃO ATRÁS DA CABINE 01' },
      { id: 'abs_3', name: 'Serra Sabre', specification: 'Com duas Baterias', quantity: 1, compartment: 'GAVETÃO ATRÁS DA CABINE 01' },
      { id: 'abs_4', name: 'Alavanca Halligan', specification: '', quantity: 1, compartment: 'GAVETÃO ATRÁS DA CABINE 01' },
      { id: 'abs_5', name: 'Cilindros Reserva EPR', specification: 'Drager', quantity: 4, compartment: 'GAVETA 02' },
      { id: 'abs_6', name: 'Desencarcerador', specification: 'Holmatro', quantity: 1, compartment: 'GAVETA 03' },
      { id: 'abs_7', name: 'Mangueiras Resgate', specification: '', quantity: 1, compartment: 'GAVETA 03' },
      { id: 'abs_8', name: 'Escada Prolongável', specification: 'Fibra', quantity: 1, compartment: 'LATERAL' },
      { id: 'abs_9', name: 'Cones', specification: '', quantity: 6, compartment: 'TRASEIRA' },
      { id: 'abs_10', name: 'Mangueira 63mm', specification: '', quantity: 2, compartment: 'GAVETA 04' },
      { id: 'abs_11', name: 'Mangueira 38mm', specification: '', quantity: 3, compartment: 'GAVETA 04' },
      { id: 'abs_12', name: 'Derivante 63mm', specification: '', quantity: 1, compartment: 'GAVETA 05' },
      { id: 'abs_13', name: 'Esguicho Tipo Pistola', specification: '38mm', quantity: 1, compartment: 'GAVETA 05' }
    ]
  },
  {
    id: 'at20104',
    name: 'Auto Tanque',
    prefix: 'AT-20104',
    status: ViaturaStatus.OPERANDO,
    postoId: 'posto1',
    items: [
      { id: 'at_1', name: 'Calços de Madeira', specification: 'Par', quantity: 2, compartment: 'GAVETA 01' },
      { id: 'at_2', name: 'Chave de Admissão 4"', specification: 'Latão', quantity: 2, compartment: 'GAVETA 01' },
      { id: 'at_3', name: 'Mangueira 63mm', specification: '30 metros', quantity: 2, compartment: 'GAVETA 02' },
      { id: 'at_4', name: 'Mangueira 38mm', specification: '15 metros', quantity: 4, compartment: 'GAVETA 02' },
      { id: 'at_5', name: 'Esguicho Regulável 63mm', specification: '', quantity: 1, compartment: 'GAVETA 03' },
      { id: 'at_6', name: 'Esguicho Regulável 38mm', specification: '', quantity: 1, compartment: 'GAVETA 03' },
      { id: 'at_7', name: 'Derivante 63mm', specification: '', quantity: 1, compartment: 'GAVETA 03' },
      { id: 'at_8', name: 'Adaptador 63mm para 38mm', specification: '', quantity: 1, compartment: 'GAVETA 03' },
      { id: 'at_9', name: 'Mangote de Sucção 4"', specification: 'Lances', quantity: 2, compartment: 'LATERAL' },
      { id: 'at_10', name: 'Ralo de Fundo 4"', specification: '', quantity: 1, compartment: 'TRASEIRA' },
      { id: 'at_11', name: 'Cones de Sinalização', specification: '75cm', quantity: 6, compartment: 'GAVETA 04' },
      { id: 'at_12', name: 'EPR Completo', specification: 'Drager/MSA', quantity: 2, compartment: 'CABINE' },
      { id: 'at_13', name: 'Extintor de Incêndio', specification: 'PQS 6kg', quantity: 1, compartment: 'LATERAL' },
      { id: 'at_14', name: 'Rádio Portátil (HT)', specification: 'Motorola', quantity: 1, compartment: 'CABINE' }
    ]
  }
];

export const APP_NAME = "Conferência de Materiais";

export const DEFAULT_HEADER = {
  unidade: "20º GRUPAMENTO DE BOMBEIROS",
  subgrupamento: "1º SUBGRUPAMENTO DE BOMBEIROS",
  pelotao: "PELOTÃO DE BOMBEIROS DE BIRIGUI",
  cidade: "Birigui"
};
