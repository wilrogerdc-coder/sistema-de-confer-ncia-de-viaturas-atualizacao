
import { Viatura, InventoryCheck, User, UserRole, GB, Subgrupamento, Posto, LogEntry, RolePermissions, SystemSettings, Notice } from '../types';
import { INITIAL_VIATURAS, INITIAL_GBS, INITIAL_SUBS, INITIAL_POSTOS, DEFAULT_ROLE_PERMISSIONS, DEFAULT_THEME } from '../constants';

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzBMjhU8e0wHEZE7bybb9urPEIYY7lMlod0Fn2VMaiZ_4t0Z_b7Ifm0RPz4MqS_gOGafA/exec';

// --- CONFIGURAÇÃO DE URLS ---
// Cole abaixo a URL gerada na nova planilha de Auditoria/Logs entre as aspas.
// Se preenchida, esta URL terá prioridade absoluta para logs.
const DEFAULT_AUDIT_URL = 'https://script.google.com/macros/s/AKfycbxXmKSgtwU70pxm2AkhSVZS31N0Zd6UAObeA0G2U9Zx8V_lsu8UIZruyrucvA3niR2Mjw/exec'; 

const STORAGE_KEY_CACHE = 'vtr_system_cache_v1.7';
const STORAGE_KEY_CONFIG = 'vtr_db_config_v1';

type DataType = 'GB' | 'SUB' | 'POSTO' | 'VIATURA' | 'CHECK' | 'USER' | 'SETUP' | 'CLEAR_ALL' | 'LOG' | 'SETTINGS' | 'NOTICE';

let pendingFetch: Promise<any> | null = null;

const ensureParsed = (val: any, fallback: any = []) => {
  if (typeof val === 'string') {
    try {
      if (val.trim() === '' || val === 'undefined') return fallback;
      return JSON.parse(val);
    } catch (e) {
      console.warn('Falha ao parsear valor JSON:', val);
      return fallback;
    }
  }
  return val || fallback;
};

// Helper para gerenciar URLs
const getDbConfig = () => {
  let config = {
    operationalUrl: DEFAULT_API_URL,
    auditUrl: DEFAULT_AUDIT_URL || DEFAULT_API_URL
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
        const parsed = JSON.parse(stored);
        
        // Banco Operacional: Prioriza LocalStorage (Configuração da Tela) > Padrão do Código
        config.operationalUrl = parsed.operationalUrl || DEFAULT_API_URL;
        
        // Banco Auditoria: Prioriza Padrão do Código (se preenchido) > LocalStorage > Banco Operacional
        // Isso garante a "URL Fixa" se o desenvolvedor definir a constante acima.
        config.auditUrl = DEFAULT_AUDIT_URL || parsed.auditUrl || config.operationalUrl;
    }
  } catch (e) {
    console.error("Erro ao ler config de DB", e);
  }
  
  return config;
};

export const DataService = {
  // Retorna as configurações atuais
  getConfig() {
    return getDbConfig();
  },

  // Salva novas configurações
  saveConfig(operationalUrl: string, auditUrl: string) {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ operationalUrl, auditUrl }));
  },

  // Teste de conexão genérico ou específico
  async testConnection(specificUrl?: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    const urlToTest = specificUrl || getDbConfig().operationalUrl;
    const start = Date.now();
    try {
      const response = await fetch(`${urlToTest}?t=${Date.now()}`, { 
        method: 'GET', 
        cache: 'no-store',
        mode: 'cors'
      });
      
      if (!response.ok) return { success: false, error: `Erro HTTP ${response.status}` };
      
      await response.json(); // Consome o corpo para garantir
      return { success: true, latency: Date.now() - start };
    } catch (e: any) {
      return { success: false, error: 'Falha ao acessar API Google Script.' };
    }
  },

  async setupSpreadsheet(): Promise<void> {
    await this.sendToCloud('SETUP', 'SAVE', { setup: true });
  },

  async clearDatabase(): Promise<void> {
    await this.sendToCloud('CLEAR_ALL', 'DELETE', { confirm: true });
    localStorage.removeItem(STORAGE_KEY_CACHE);
  },

  async fetchAllData(forceRefresh = false): Promise<any> {
    if (!forceRefresh && pendingFetch) return pendingFetch;

    const { operationalUrl } = getDbConfig();

    pendingFetch = (async () => {
      try {
        if (!forceRefresh) {
            const cache = localStorage.getItem(STORAGE_KEY_CACHE);
            if (cache) {
                // Cache logic... (poderia retornar cache aqui se implementado validade)
            }
        }

        const response = await fetch(`${operationalUrl}?t=${Date.now()}`, { 
          method: 'GET', 
          cache: 'no-store',
          mode: 'cors'
        });
        if (!response.ok) throw new Error('Falha na rede');
        const data = await response.json();
        if (data) {
          localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(data));
        }
        return data;
      } catch (e) {
        console.warn("Usando cache local devido a erro de rede:", e);
        const cache = localStorage.getItem(STORAGE_KEY_CACHE);
        return cache ? JSON.parse(cache) : null;
      } finally {
        pendingFetch = null;
      }
    })();

    return pendingFetch;
  },

  async sendToCloud(type: DataType, action: 'SAVE' | 'DELETE', payload: any): Promise<void> {
    const { operationalUrl, auditUrl } = getDbConfig();
    // Direciona LOGs para a URL de Auditoria, todo o resto para Operacional
    const targetUrl = type === 'LOG' ? auditUrl : operationalUrl;

    try {
      const body = JSON.stringify({ type, action, ...payload });
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
      
      const waitTime = action === 'DELETE' ? 3000 : 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (e) {
      console.error(`Erro ao sincronizar ${type}:`, e);
      throw e;
    }
  },

  async saveLog(log: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...log
    };
    await this.sendToCloud('LOG', 'SAVE', entry);
  },

  async getLogs(): Promise<LogEntry[]> {
    const { operationalUrl, auditUrl } = getDbConfig();
    
    // Função auxiliar para processar o retorno, garantindo array
    const processLogData = (data: any) => {
        if (!data) return [];
        // Verifica variações de nome da chave e garante o parse do JSON stringificado se necessário
        const rawLogs = data.logs || data.log || data.LOGS;
        return ensureParsed(rawLogs, []);
    };

    // Se as URLs forem iguais, os logs vêm junto com o fetchAllData (comportamento legado)
    if (operationalUrl === auditUrl) {
        const data = await this.fetchAllData();
        return processLogData(data);
    }

    // Se forem diferentes, faz fetch específico no endpoint de auditoria
    try {
        const response = await fetch(`${auditUrl}?type=LOGS&t=${Date.now()}`, { 
            method: 'GET', 
            cache: 'no-store',
            mode: 'cors'
        });
        if (response.ok) {
            const data = await response.json();
            return processLogData(data);
        }
        return [];
    } catch (e) {
        console.warn("Erro ao buscar logs do endpoint de auditoria:", e);
        return [];
    }
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
    return (data?.postos && data.postos.length > 0) ? data.postos : INITIAL_POSTOS;
  },
  async savePosto(posto: Posto) { await this.sendToCloud('POSTO', 'SAVE', posto); },
  async deletePosto(id: string) { await this.sendToCloud('POSTO', 'DELETE', { id }); },

  async getViaturas(): Promise<Viatura[]> {
    const data = await this.fetchAllData();
    const cloudVtrs = data?.viaturas || [];
    
    if (cloudVtrs.length === 0) return INITIAL_VIATURAS;

    const allVtrs = [...INITIAL_VIATURAS];
    
    const processedCloudVtrs = cloudVtrs.map((v: any) => ({
      ...v,
      items: ensureParsed(v.items, []),
      status: v.status || 'OPERANDO'
    }));

    processedCloudVtrs.forEach((cv: Viatura) => {
      const idx = allVtrs.findIndex(v => v.id === cv.id);
      if (idx > -1) {
        allVtrs[idx] = cv; 
      } else {
        allVtrs.push(cv); 
      }
    });
    return allVtrs;
  },
  async saveViatura(viatura: Viatura) { await this.sendToCloud('VIATURA', 'SAVE', viatura); },
  async deleteViatura(id: string) { await this.sendToCloud('VIATURA', 'DELETE', { id }); },

  async getChecks(): Promise<InventoryCheck[]> {
    const data = await this.fetchAllData();
    const rawChecks = data?.checks || [];
    
    return rawChecks.map((c: any) => ({
      ...c,
      entries: ensureParsed(c.entries, []),
      responsibleNames: ensureParsed(c.responsibleNames, []),
      headerDetails: ensureParsed(c.headerDetails, {
        unidade: '', subgrupamento: '', pelotao: '', cidade: ''
      })
    }));
  },
  async saveCheck(check: InventoryCheck) { await this.sendToCloud('CHECK', 'SAVE', check); },

  async getUsers(forceRefresh = false): Promise<User[]> {
    const data = await this.fetchAllData(forceRefresh);
    const masterUsers: User[] = [
      { id: 'master-1', username: 'admin20gb', name: 'Administrador 20GB', role: UserRole.ADMIN, password: 'admin20gb', scopeLevel: 'GLOBAL' },
      { id: 'master-2', username: 'Cavalieri', name: 'Super Usuário Cavalieri', role: UserRole.SUPER, password: 'tricolor', scopeLevel: 'GLOBAL' }
    ];
    
    const cloudUsers: any[] = data?.users || [];
    const processedUsers = cloudUsers.map(u => ({
      ...u,
      customPermissions: ensureParsed(u.customPermissions, [])
    }));

    const finalUsers = [...processedUsers];
    
    masterUsers.forEach(m => {
      if (!finalUsers.some(u => u.username === m.username)) {
        finalUsers.push(m);
      }
    });

    return finalUsers;
  },
  async saveUser(user: User) { 
    if (['Cavalieri', 'admin20gb'].includes(user.username)) return;
    await this.sendToCloud('USER', 'SAVE', user); 
  },
  async deleteUser(id: string) { 
    await this.sendToCloud('USER', 'DELETE', { id }); 
  },

  async getSettings(): Promise<SystemSettings> {
    const data = await this.fetchAllData();
    const loadedSettings = data?.settings;
    
    const parsed = ensureParsed(loadedSettings, { rolePermissions: DEFAULT_ROLE_PERMISSIONS });
    
    if (parsed[UserRole.USER] && !parsed.rolePermissions) {
        return {
            rolePermissions: parsed,
            activeTheme: DEFAULT_THEME
        };
    }

    return {
        rolePermissions: parsed.rolePermissions || DEFAULT_ROLE_PERMISSIONS,
        activeTheme: parsed.activeTheme || DEFAULT_THEME
    };
  },

  async saveSettings(settings: SystemSettings) {
    await this.sendToCloud('SETTINGS', 'SAVE', settings);
  },

  // --- MÉTODOS DE AVISOS (NOTICES) ---
  async getNotices(): Promise<Notice[]> {
    const data = await this.fetchAllData();
    const rawNotices = data?.notices || data?.notice || data?.NOTICES || [];
    
    return rawNotices.map((n: any) => {
      // Limpeza robusta da data de validade
      let cleanExpirationDate = undefined;
      if (n.expirationDate) {
        // Pega apenas os primeiros 10 chars (YYYY-MM-DD) independente do que vier depois
        const strVal = String(n.expirationDate).trim();
        if (strVal.length >= 10) {
          cleanExpirationDate = strVal.substring(0, 10);
        }
      }

      // Lógica de "Active": Padrão TRUE se undefined/null, senão processa string/bool
      let isActive = true;
      if (n.active !== undefined && n.active !== null) {
        isActive = typeof n.active === 'string' ? n.active.toLowerCase() === 'true' : !!n.active;
      }

      return {
        ...n,
        active: isActive,
        priority: ['NORMAL', 'ALTA', 'URGENTE'].includes(n.priority) ? n.priority : 'NORMAL',
        expirationDate: cleanExpirationDate
      };
    });
  },

  async saveNotice(notice: Notice): Promise<void> {
    await this.sendToCloud('NOTICE', 'SAVE', notice);
  },

  async deleteNotice(id: string): Promise<void> {
    await this.sendToCloud('NOTICE', 'DELETE', { id });
  }
};
