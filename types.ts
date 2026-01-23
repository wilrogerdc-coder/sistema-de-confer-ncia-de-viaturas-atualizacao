
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER = 'SUPER'
}

export enum ViaturaStatus {
  OPERANDO = 'OPERANDO',
  RESERVA = 'RESERVA',
  BAIXADA = 'BAIXADA'
}

export type ScopeLevel = 'GLOBAL' | 'GB' | 'SGB' | 'POSTO';

export type PermissionKey = 
  | 'view_dashboard' 
  | 'perform_checklist' 
  | 'manage_fleet' // Criar/Editar/Excluir Viaturas
  | 'view_reports' 
  | 'manage_users' 
  | 'manage_hierarchy' 
  | 'view_audit_logs' 
  | 'manage_database' 
  | 'manage_parameters'
  | 'manage_themes'
  | 'manage_notices'; // Nova permissão

export interface GB {
  id: string;
  name: string;
}

export interface Subgrupamento {
  id: string;
  gbId: string;
  name: string;
}

export interface Posto {
  id: string;
  subId: string;
  name: string;
  classification?: string; // Ex: "Pelotão", "Posto", "Base", "Estação"
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  password?: string;
  postoId?: string; // Mantido para retrocompatibilidade, mas o sistema usará scopeId
  mustChangePassword?: boolean;
  
  // Novos campos de controle
  scopeLevel?: ScopeLevel;
  scopeId?: string; // ID do GB, SGB ou Posto
  customPermissions?: PermissionKey[]; // Permissões adicionais específicas do usuário
}

export interface MaterialItem {
  id: string;
  name: string;
  specification: string;
  quantity: number;
  compartment: string;
}

export interface Viatura {
  id: string;
  name: string;
  prefix: string;
  items: MaterialItem[];
  status: ViaturaStatus;
  postoId?: string;
}

export type CheckStatus = 'S' | 'CN' | 'NA';

export interface CheckEntry {
  itemId: string;
  status: CheckStatus;
  observation?: string;
}

export interface InventoryCheck {
  id: string;
  viaturaId: string;
  date: string;
  shiftColor: string;
  responsibleNames: string[];
  commanderName: string;
  entries: CheckEntry[];
  timestamp: string;
  justification?: string;
  headerDetails: {
    unidade: string;
    subgrupamento: string;
    pelotao: string;
    cidade: string;
  };
  snapshot?: MaterialItem[];
}

export interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'ALTA' | 'URGENTE';
  active: boolean;
  expirationDate?: string; // Data limite de exibição (YYYY-MM-DD) ou undefined/null para indeterminado
  createdAt: string;
  createdBy: string;
}

export enum ProntidaoColor {
  VERDE = 'VERDE',
  AMARELA = 'AMARELA',
  AZUL = 'AZUL'
}

export interface RolePermissions {
  [UserRole.USER]: PermissionKey[];
  [UserRole.ADMIN]: PermissionKey[];
  [UserRole.SUPER]: PermissionKey[];
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;   // Cor de destaque (botões, ativos) - ex: Red-600
    secondary: string; // Cor de fundo lateral/dark - ex: Slate-900
    background: string; // Cor de fundo da página - ex: Slate-50
    surface: string;    // Cor dos cards - ex: White
    textMain: string;   // Texto principal
    
    // Cores de Prontidão Personalizáveis
    readinessVerde: string;
    readinessAmarela: string;
    readinessAzul: string;
  };
}

export interface SystemSettings {
  rolePermissions: RolePermissions;
  activeTheme?: Theme;
}
