
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
  | 'manage_fleet' 
  | 'view_reports' 
  | 'manage_users' 
  | 'manage_hierarchy' 
  | 'view_audit_logs' 
  | 'manage_database' 
  | 'manage_parameters'
  | 'manage_themes';

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
  municipio: string; // Município vinculado ao posto para relatórios
  classification?: string; // Posto, Pelotão, etc.
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  password?: string;
  postoId?: string;
  mustChangePassword?: boolean;
  scopeLevel?: ScopeLevel;
  scopeId?: string;
  customPermissions?: PermissionKey[];
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

export interface HeaderConfig {
  secretaria: string;
  policiaMilitar: string;
  corpoBombeiros: string;
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
    secretaria: string;
    policiaMilitar: string;
    corpoBombeiros: string;
    unidade: string; // Nome do GB
    subgrupamento: string; // Nome do SGB
    pelotao: string; // Nome do Posto
    cidade: string; // Município do Posto
  };
  snapshot?: MaterialItem[];
  viaturaStatusAtTime?: ViaturaStatus;
}

export interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
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
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    textMain: string;
    readinessVerde: string;
    readinessAmarela: string;
    readinessAzul: string;
  };
}

export interface SystemSettings {
  rolePermissions: RolePermissions;
  activeTheme?: Theme;
  headerConfig?: HeaderConfig;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'ALTA' | 'URGENTE';
  active: boolean;
  expirationDate: string;
  createdAt: string;
  createdBy: string;
}
