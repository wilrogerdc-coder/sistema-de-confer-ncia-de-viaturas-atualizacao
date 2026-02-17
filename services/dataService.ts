
import { Viatura, InventoryCheck, User, UserRole, GB, Subgrupamento, Posto, LogEntry, RolePermissions, SystemSettings } from '../types';
import { INITIAL_VIATURAS, INITIAL_GBS, INITIAL_SUBS, INITIAL_POSTOS, DEFAULT_ROLE_PERMISSIONS, DEFAULT_THEME } from '../constants';

/**
 * SERVIÇO DE DADOS (dataService.ts) - CAMADA DE PERSISTÊNCIA NÍVEL AVANÇADO
 * Gerencia a comunicação entre o Frontend e o backend em Google Apps Script.
 */

// URL do Banco Operacional (Atualizada conforme solicitação do usuário)
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzgw3C6AtmRpataS93D9XXRO4ssm-FnIdamtCCafPrZOQzmJYXNMQrdR14JiLMx4pNA_A/exec';
// URL do Banco de Auditoria (Mantida conforme solicitação do usuário)
const DEFAULT_AUDIT_URL = 'https://script.google.com/macros/s/AKfycbzrfHg2aBDIVs0SP6EBdyU5mopFHwMMLWK_wPEQg9NCSyH5ddwuRvOZNp7GsEUSmtKp/exec'; 

const STORAGE_KEY_CACHE = 'vtr_system_cache_v1.7';
const STORAGE_KEY_CONFIG = 'vtr_db_config_v1';

type DataType = 'GB' | 'SUB' | 'POSTO' | 'VIATURA' | 'CHECK' | 'USER' | 'SETUP' | 'CLEAR_ALL' | 'LOG' | 'SETTINGS';

let pendingFetch: Promise<any> | null = null;

/**
 * Utilitário para conversão de strings JSON vindas da planilha em objetos JavaScript.
 */
const ensureParsed = (val: any, fallback: any = []) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      if (val.trim() === '' || val === 'undefined' || val === 'null') return fallback;
      const parsed = JSON.parse(val);
      return (typeof parsed === 'object' && parsed !== null) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }
  return (typeof val === 'object' && val !== null) ? val : fallback;
};

const getDbConfig = () => {
  let config = { operationalUrl: DEFAULT_API_URL, auditUrl: DEFAULT_AUDIT_URL };
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
        const parsed = JSON.parse(stored);
        config.operationalUrl = parsed.operationalUrl || DEFAULT_API_URL;
        config.auditUrl = parsed.auditUrl || DEFAULT_AUDIT_URL;
    }
  } catch (e) {}
  return config;
};

export const DataService = {
  getConfig() { return getDbConfig(); },
  saveConfig(operationalUrl: string, auditUrl: string) { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ operationalUrl, auditUrl })); },

  async testConnection(specificUrl?: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    const urlToTest = specificUrl || getDbConfig().operationalUrl;
    const start = Date.now();
    try {
      const response = await fetch(`${urlToTest}?t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
      if (!response.ok) return { success: false, error: `Erro HTTP ${response.status}` };
      await response.json();
      return { success: true, latency: Date.now() - start };
    } catch (e: any) {
      return { success: false, error: 'Falha ao acessar API.' };
    }
  },

  async setupSpreadsheet(): Promise<void> { await this.sendToCloud('SETUP', 'SAVE', { setup: true }); },
  async clearDatabase(): Promise<void> { await this.sendToCloud('CLEAR_ALL', 'DELETE', { confirm: true }); localStorage.removeItem(STORAGE_KEY_CACHE); },

  async fetchAllData(forceRefresh = false): Promise<any> {
    if (!forceRefresh && pendingFetch) return pendingFetch;
    const { operationalUrl } = getDbConfig();
    pendingFetch = (async () => {
      try {
        const response = await fetch(`${operationalUrl}?t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
        if (!response.ok) throw new Error('Falha na rede');
        const data = await response.json();
        if (data) localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(data));
        return data;
      } catch (e) {
        const cache = localStorage.getItem(STORAGE_KEY_CACHE);
        return cache ? JSON.parse(cache) : null;
      } finally { pendingFetch = null; }
    })();
    return pendingFetch;
  },

  /**
   * Envia dados para a nuvem. 
   * TÉCNICO: Utiliza 'text/plain' para evitar Preflight OPTIONS do CORS, 
   * que não é suportado por Web Apps do Google Apps Script em requisições POST.
   */
  async sendToCloud(type: DataType, action: 'SAVE' | 'DELETE', payload: any): Promise<void> {
    const { operationalUrl, auditUrl } = getDbConfig();
    const targetUrl = type === 'LOG' ? auditUrl : operationalUrl;
    try {
      const body = JSON.stringify({ type, action, ...payload });
      // Usar text/plain evita o preflight request (OPTIONS) que causa erro em Apps Script
      const response = await fetch(targetUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body 
      });
      
      // Como Apps Script pode redirecionar, o fetch lida automaticamente se não houver erro de CORS.
      // Se a conexão falhar aqui, o catch capturará.
      console.log(`[DataService] Requisição de ${type} enviada via ${action}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (e) { 
      console.error(`Erro ao enviar ${type}:`, e);
      throw e; 
    }
  },

  async saveLog(log: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const { auditUrl } = getDbConfig();
    const entry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        userName: log.userName,
        acao: log.action,
        detalhes: log.details
    };
    try {
      const body = JSON.stringify({ type: 'LOG', action: 'SAVE', ...entry });
      await fetch(auditUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    } catch (e) {}
  },

  async getLogs(): Promise<LogEntry[]> {
    const { auditUrl } = getDbConfig();
    try {
        const response = await fetch(`${auditUrl}?type=LOGS&t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            const rawList = Array.isArray(data) ? data : (data.data || []);
            return rawList.map((l: any) => ({
                id: l.id || l.timestamp,
                userId: l.userId || '',
                userName: l.operador || l.userName || 'Sistema',
                action: l.acao || l.logAction || 'INFO',
                details: l.detalhes || l.details || '-',
                timestamp: l.timestamp || l.data || new Date().toISOString()
            }));
        }
    } catch (e) {}
    return [];
  },

  async getGBS(): Promise<GB[]> {
    const data = await this.fetchAllData();
    return (data?.gbs && data.gbs.length > 0) ? data.gbs : INITIAL_GBS;
  },
  async saveGB(gb: GB) { await this.sendToCloud('GB', 'SAVE', gb); },
  async deleteGB(id: string) { await this.sendToCloud('GB', 'DELETE', { id }); },

  async getSubs(): Promise<Subgrupamento[]> {
    const data = await this.fetchAllData();
    return (data?.subs && data.subs.length > 0) ? data.subs : INITIAL_SUBS;
  },
  async saveSub(sub: Subgrupamento) { await this.sendToCloud('SUB', 'SAVE', sub); },
  async deleteSub(id: string) { await this.sendToCloud('SUB', 'DELETE', { id }); },

  async getPostos(): Promise<Posto[]> {
    const data = await this.fetchAllData();
    const rawPostos = data?.postos || [];
    return rawPostos.length > 0 ? rawPostos : INITIAL_POSTOS;
  },
  
  async savePosto(posto: Posto) { 
    await this.sendToCloud('POSTO', 'SAVE', {
      id: posto.id,
      subId: posto.subId,
      name: posto.name,
      classification: posto.classification,
      municipio: posto.municipio || '' 
    }); 
  },
  
  async deletePosto(id: string) { await this.sendToCloud('POSTO', 'DELETE', { id }); },

  async getViaturas(): Promise<Viatura[]> {
    const data = await this.fetchAllData();
    const cloudVtrs = data?.viaturas || [];
    if (cloudVtrs.length === 0) return INITIAL_VIATURAS;
    return cloudVtrs.map((v: any) => ({ ...v, items: ensureParsed(v.items, []) }));
  },
  async saveViatura(viatura: Viatura) { 
    const payload = { ...viatura, items: JSON.stringify(viatura.items) };
    await this.sendToCloud('VIATURA', 'SAVE', payload); 
  },
  async deleteViatura(id: string) { await this.sendToCloud('VIATURA', 'DELETE', { id }); },

  async getChecks(): Promise<InventoryCheck[]> {
    const data = await this.fetchAllData();
    const rawChecks = data?.checks || [];
    return rawChecks.map((c: any) => ({ 
        ...c, 
        entries: ensureParsed(c.entries, []), 
        responsibleNames: ensureParsed(c.responsibleNames, []), 
        headerDetails: ensureParsed(c.headerDetails, null), 
        snapshot: ensureParsed(c.snapshot, [])
    }));
  },

  async saveCheck(check: InventoryCheck) { 
    const payload = {
      ...check,
      entries: JSON.stringify(check.entries),
      responsibleNames: JSON.stringify(check.responsibleNames),
      headerDetails: JSON.stringify(check.headerDetails),
      snapshot: JSON.stringify(check.snapshot || [])
    };
    await this.sendToCloud('CHECK', 'SAVE', payload); 
  },

  async getUsers(forceRefresh = false): Promise<User[]> {
    const data = await this.fetchAllData(forceRefresh);
    const masterUsers: User[] = [
      { id: 'master-1', username: 'admin20gb', name: 'Administrador 20GB', role: UserRole.ADMIN, password: 'admin20gb', scopeLevel: 'GLOBAL' },
      { id: 'master-2', username: 'cavalieri', name: 'Super Usuário Cavalieri', role: UserRole.SUPER, password: 'tricolor', scopeLevel: 'GLOBAL' }
    ];
    const cloudUsers: any[] = data?.users || [];
    const processedUsers = cloudUsers.map(u => ({ ...u, customPermissions: ensureParsed(u.customPermissions, []) }));
    const finalUsers = [...processedUsers];
    masterUsers.forEach(m => { if (!finalUsers.some(u => u.username.toLowerCase() === m.username.toLowerCase())) finalUsers.push(m); });
    return finalUsers;
  },
  async saveUser(user: User) { 
    if (['cavalieri', 'admin20gb'].includes(user.username.toLowerCase())) return; 
    const payload = { ...user, customPermissions: JSON.stringify(user.customPermissions || []) };
    await this.sendToCloud('USER', 'SAVE', payload); 
  },
  async deleteUser(id: string) { await this.sendToCloud('USER', 'DELETE', { id }); },

  async getSettings(): Promise<SystemSettings> {
    const data = await this.fetchAllData();
    const loadedSettings = data?.settings || {};
    return {
      rolePermissions: ensureParsed(loadedSettings.rolePermissions, DEFAULT_ROLE_PERMISSIONS),
      activeTheme: ensureParsed(loadedSettings.activeTheme, DEFAULT_THEME),
      headerConfig: ensureParsed(loadedSettings.headerConfig, null)
    };
  },
  async saveSettings(settings: SystemSettings) { 
    const payload = {
      rolePermissions: JSON.stringify(settings.rolePermissions),
      activeTheme: JSON.stringify(settings.activeTheme),
      headerConfig: JSON.stringify(settings.headerConfig)
    };
    await this.sendToCloud('SETTINGS', 'SAVE', payload); 
  }
};
