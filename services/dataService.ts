
import { Viatura, InventoryCheck, User, UserRole, GB, Subgrupamento, Posto, LogEntry, RolePermissions, SystemSettings, ViaturaStatus } from '../types';
import { INITIAL_VIATURAS, INITIAL_GBS, INITIAL_SUBS, INITIAL_POSTOS, DEFAULT_ROLE_PERMISSIONS, DEFAULT_THEME } from '../constants';

/**
 * SERVIÇO DE DADOS (dataService.ts) - CAMADA DE PERSISTÊNCIA SÊNIOR
 * Gerencia a comunicação com os backends Google Apps Script.
 */

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzgw3C6AtmRpataS93D9XXRO4ssm-FnIdamtCCafPrZOQzmJYXNMQrdR14JiLMx4pNA_A/exec';

/** 
 * REGRA: URL do Banco de Auditoria (Logs de Sistema)
 * Configurada para a nova implantação conforme colunas: ID, TIMESTAMP, USER_ID, USER_NAME, ACTION, DETAILS.
 */
const DEFAULT_AUDIT_URL = 'https://script.google.com/macros/s/AKfycbzyjlL_75LKaoRNqLivp14q9nhZl0Khxwl_IXbcju4UpltOiQkwgRiwVT8-qJOg0SKf/exec'; 

const STORAGE_KEY_CACHE = 'vtr_system_cache_v1.7';
const STORAGE_KEY_CONFIG = 'vtr_db_config_v1';
const STORAGE_KEY_LAST_SYNC = 'vtr_last_sync_time';

type DataType = 'GB' | 'SUB' | 'POSTO' | 'VIATURA' | 'CHECK' | 'USER' | 'SETUP' | 'CLEAR_ALL' | 'LOG' | 'SETTINGS';

let pendingFetch: Promise<any> | null = null;
let isPendingForced = false;

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

  /**
   * HELPER: Fetch com timeout para evitar travamentos do sistema.
   */
  async fetchWithTimeout(resource: string, options: any = {}, timeout = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  },

  async testConnection(specificUrl?: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    const urlToTest = specificUrl || getDbConfig().operationalUrl;
    const start = Date.now();
    try {
      const response = await this.fetchWithTimeout(`${urlToTest}?t=${Date.now()}`, { method: 'GET', cache: 'no-store' }, 8000);
      if (!response.ok) return { success: false, error: `Erro HTTP ${response.status}` };
      await response.json();
      return { success: true, latency: Date.now() - start };
    } catch (e: any) {
      return { success: false, error: 'Falha ao acessar API.' };
    }
  },

  /**
   * NORMALIZAÇÃO DE DADOS
   * Garante que IDs sejam strings e enums estejam em caixa alta para evitar falhas de comparação.
   */
  normalizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const normalized = { ...data };

    if (Array.isArray(normalized.viaturas)) {
      normalized.viaturas = normalized.viaturas.map((v: any) => ({
        ...v,
        id: String(v.id || ''),
        postoId: v.postoId ? String(v.postoId) : undefined
      }));
    }

    if (Array.isArray(normalized.users)) {
      normalized.users = normalized.users.map((u: any) => {
        const level = String(u.scopeLevel || u.SCOPE_LEVEL || u.scope_level || u.nivel || 'GLOBAL').toUpperCase();
        const id = u.scopeId || u.SCOPE_ID || u.scope_id || u.postoId || u.POSTO_ID || u.posto_id || u.unidadeId || '';
        
        return {
          ...u,
          id: String(u.id || u.ID || ''),
          username: String(u.username || u.USUARIO || u.usuario || '').toLowerCase().trim(),
          scopeLevel: level,
          scopeId: id ? String(id) : undefined
        };
      });
    }

    if (Array.isArray(normalized.gbs)) {
      normalized.gbs = normalized.gbs.map((g: any) => ({ ...g, id: String(g.id || '') }));
    }

    if (Array.isArray(normalized.subs)) {
      normalized.subs = normalized.subs.map((s: any) => ({
        ...s,
        id: String(s.id || ''),
        gbId: String(s.gbId || '')
      }));
    }

    if (Array.isArray(normalized.postos)) {
      normalized.postos = normalized.postos.map((p: any) => ({
        ...p,
        id: String(p.id || ''),
        subId: String(p.subId || '')
      }));
    }

    return normalized;
  },

  async fetchAllData(forceRefresh = false): Promise<any> {
    // REGRA: Se houver um fetch em andamento, só o reaproveitamos se não estivermos forçando atualização
    // ou se o fetch atual já for um fetch forçado (evitando múltiplas requisições idênticas simultâneas).
    if (pendingFetch) {
      if (!forceRefresh) return pendingFetch;
      if (isPendingForced) return pendingFetch;
    }

    const { operationalUrl } = getDbConfig();
    if (!operationalUrl) {
      console.error("[DataService] URL operacional não configurada.");
      return null;
    }

    // Se não for forçado, tenta o cache primeiro
    if (!forceRefresh) {
      const cache = localStorage.getItem(STORAGE_KEY_CACHE);
      if (cache) {
        try {
          const parsed = JSON.parse(cache);
          if (parsed && typeof parsed === 'object' && (parsed.viaturas || parsed.users)) {
            console.log("[DataService] Usando cache local válido.");
            return this.normalizeData(parsed);
          }
        } catch (e) {
          console.warn("[DataService] Cache corrompido, ignorando...");
        }
      }
    }

    isPendingForced = forceRefresh;
    pendingFetch = (async () => {
      let attempts = 0;
      const maxAttempts = forceRefresh ? 3 : 1; 
      
      while (attempts < maxAttempts) {
        try {
          const separator = operationalUrl.includes('?') ? '&' : '?';
          // REGRA: Cache 'no-store' e timestamp dinâmico para garantir que o GAS não retorne cache do servidor
          const response = await this.fetchWithTimeout(`${operationalUrl}${separator}t=${Date.now()}&force=${forceRefresh}`, { 
            method: 'GET', 
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
          }, 20000); // Timeout de 20s para dados operacionais
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const rawData = await response.json();
          
          // Validação do objeto retornado
          if (rawData && typeof rawData === 'object' && (rawData.viaturas || rawData.users)) {
            const data = this.normalizeData(rawData);
            console.log(`[DataService] Sincronização ${forceRefresh ? 'FORÇADA' : 'NORMAL'} concluída com sucesso.`);
            localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(data));
            localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
            return data;
          }
          throw new Error('Dados inválidos ou incompletos recebidos da nuvem');
        } catch (e) {
          attempts++;
          console.warn(`[DataService] Tentativa ${attempts} de fetch falhou:`, e);
          
          if (attempts >= maxAttempts) {
            try {
              const cache = localStorage.getItem(STORAGE_KEY_CACHE);
              if (cache) {
                console.log("[DataService] Falha na rede. Usando cache de emergência.");
                return this.normalizeData(JSON.parse(cache));
              }
              return null;
            } catch (parseErr) {
              return null;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempts));
        }
      }
    })().finally(() => {
      pendingFetch = null;
      isPendingForced = false;
    });
    return pendingFetch;
  },

  async sendToCloud(type: DataType, action: 'SAVE' | 'DELETE', payload: any): Promise<void> {
    const { operationalUrl, auditUrl } = getDbConfig();
    const targetUrl = type === 'LOG' ? auditUrl : operationalUrl;
    try {
      const body = JSON.stringify({ type, action, ...payload });
      // REGRA: O GAS exige text/plain para requisições cross-origin simples sem preflight
      await this.fetchWithTimeout(targetUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body 
      }, 10000); // Timeout de 10s para envios
      console.log(`[DataService] Requisição de ${type} enviada via ${action}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (e) { 
      console.error(`Erro ao enviar ${type}:`, e);
      throw e; 
    }
  },

  /**
   * REGRA DE GRAVAÇÃO: Salva log no banco de auditoria.
   * IMPORTANTE: As chaves devem ser em MAIÚSCULO para corresponder aos cabeçalhos da planilha (ID, TIMESTAMP...).
   */
  async saveLog(log: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const { auditUrl } = getDbConfig();
    const entry = {
        ID: "L-" + Math.random().toString(36).substr(2, 7).toUpperCase(),
        TIMESTAMP: new Date().toISOString(),
        USER_ID: String(log.userId || ''),
        USER_NAME: String(log.userName || ''),
        ACTION: String(log.action || ''),
        DETAILS: String(log.details || '')
    };
    try {
      const body = JSON.stringify({ type: 'LOG', action: 'SAVE', ...entry });
      // REGRA: Usamos POST com mode 'no-cors' para garantir o envio sem interrupções de Preflight no GAS
      await this.fetchWithTimeout(auditUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body,
        mode: 'no-cors'
      }, 5000); // Timeout curto para logs silenciosos
    } catch (e) {
      console.error("Erro ao persistir log operacional:", e);
    }
  },

  /**
   * REGRA DE RECUPERAÇÃO: Captura dados da planilha 'logs'.
   * Normaliza os nomes das colunas (MAIÚSCULO) para as propriedades minúsculas do sistema.
   */
  async getLogs(forceRefresh = false): Promise<LogEntry[]> {
    const { auditUrl } = getDbConfig();
    if (!auditUrl) return [];
    
    try {
        const separator = auditUrl.includes('?') ? '&' : '?';
        const response = await this.fetchWithTimeout(`${auditUrl}${separator}type=LOGS&t=${Date.now()}&force=${forceRefresh}`, { 
          method: 'GET', 
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        }, 12000); // Timeout de 12s para logs
        
        if (response.ok) {
            const data = await response.json();
            const rawList = Array.isArray(data) ? data : [];
            
            return rawList.map((l: any) => ({
                id: String(l.ID || l.id || '-'),
                userId: String(l.USER_ID || l.userId || ''),
                userName: String(l.USER_NAME || l.userName || 'Sistema'),
                action: String(l.ACTION || l.action || 'INFO'),
                details: String(l.DETAILS || l.details || '-'),
                timestamp: String(l.TIMESTAMP || l.timestamp || new Date().toISOString())
            }));
        } else {
          console.warn(`[DataService] Servidor de logs retornou status ${response.status}`);
        }
    } catch (e: any) {
      // REGRA: Silenciamos o erro de rede para evitar poluição no console se for apenas instabilidade
      const isNetworkError = e.name === 'TypeError' && (e.message === 'Failed to fetch' || e.message === 'NetworkError when attempting to fetch resource.');
      if (isNetworkError) {
        console.warn("[DataService] Falha de conexão com o servidor de auditoria. Verifique sua rede ou CORS.");
      } else {
        console.error("Erro ao buscar logs no servidor remoto:", e);
      }
    }
    return [];
  },

  async getGBS(forceRefresh = false): Promise<GB[]> {
    const data = await this.fetchAllData(forceRefresh);
    const rawList = data?.gbs || data?.gb || data?.grupamentos || data?.GBS || data?.GB || data?.GRUPAMENTOS || [];
    const list = Array.isArray(rawList) ? rawList : [];
    return list.length > 0 ? list.map((item: any) => ({
      id: String(item.id || item.ID || ''),
      name: String(item.name || item.NAME || item.NOME || '')
    })) : INITIAL_GBS;
  },
  async saveGB(gb: GB) { await this.sendToCloud('GB', 'SAVE', gb); },
  async deleteGB(id: string) { await this.sendToCloud('GB', 'DELETE', { id }); },

  async getSubs(forceRefresh = false): Promise<Subgrupamento[]> {
    const data = await this.fetchAllData(forceRefresh);
    const rawList = data?.subs || data?.sub || data?.subgrupamentos || data?.SUBS || data?.SUB || data?.SUBGRUPAMENTOS || [];
    const list = Array.isArray(rawList) ? rawList : [];
    return list.length > 0 ? list.map((item: any) => ({
      id: String(item.id || item.ID || ''),
      gbId: String(item.gbId || item.GB_ID || item.gb_id || ''),
      name: String(item.name || item.NAME || item.NOME || '')
    })) : INITIAL_SUBS;
  },
  async saveSub(sub: Subgrupamento) { await this.sendToCloud('SUB', 'SAVE', sub); },
  async deleteSub(id: string) { await this.sendToCloud('SUB', 'DELETE', { id }); },

  async getPostos(forceRefresh = false): Promise<Posto[]> {
    const data = await this.fetchAllData(forceRefresh);
    const rawList = data?.postos || data?.posto || data?.unidades || data?.POSTOS || data?.POSTO || data?.UNIDADES || [];
    const list = Array.isArray(rawList) ? rawList : [];
    return list.length > 0 ? list.map((item: any) => ({
      id: String(item.id || item.ID || ''),
      subId: String(item.subId || item.SUB_ID || item.sub_id || ''),
      name: String(item.name || item.NAME || item.NOME || ''),
      municipio: String(item.municipio || item.MUNICIPIO || ''),
      classification: String(item.classification || item.CLASSIFICATION || item.classificacao || '')
    })) : INITIAL_POSTOS;
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

  async getViaturas(forceRefresh = false): Promise<Viatura[]> {
    const data = await this.fetchAllData(forceRefresh);
    const rawCloudVtrs = data?.viaturas || data?.bancomateriais || data?.['bancomateriais viatura'] || data?.bancomateriais_viatura || data?.VIATURAS || [];
    const cloudVtrs = Array.isArray(rawCloudVtrs) ? rawCloudVtrs : [];
    
    if (cloudVtrs.length === 0) return INITIAL_VIATURAS;
    
    return cloudVtrs.map((v: any) => ({
      id: String(v.id || v.ID || Math.random().toString(36).substr(2, 9)),
      name: String(v.name || v.NOME || v.Nome || ''),
      prefix: String(v.prefix || v.PREFIXO || v.Prefixo || ''),
      status: (v.status || v.STATUS || v.Status || ViaturaStatus.OPERANDO) as ViaturaStatus,
      postoId: String(v.postoId || v.POSTO_ID || v.posto_id || v.PostoID || v.Unidade || ''),
      items: ensureParsed(v.items || v.ITEMS || v.materiais || v.MATERIAIS || v.Materiais, [])
    }));
  },
  async saveViatura(viatura: Viatura) { 
    const payload = { ...viatura, items: JSON.stringify(viatura.items) };
    await this.sendToCloud('VIATURA', 'SAVE', payload); 
  },
  async deleteViatura(id: string) { await this.sendToCloud('VIATURA', 'DELETE', { id }); },

  async getChecks(forceRefresh = false): Promise<InventoryCheck[]> {
    const data = await this.fetchAllData(forceRefresh);
    const rawList = data?.checks || data?.conferencias || data?.CHECKS || data?.CONFERENCIAS || [];
    const rawChecks = Array.isArray(rawList) ? rawList : [];
    return rawChecks.map((c: any) => ({ 
        id: String(c.id || c.ID || ''),
        viaturaId: String(c.viaturaId || c.VIATURA_ID || c.viatura_id || ''),
        date: String(c.date || c.DATE || c.DATA || c.date || ''),
        shiftColor: String(c.shiftColor || c.SHIFT_COLOR || c.COR_TURNO || c.turno || ''),
        responsibleNames: ensureParsed(c.responsibleNames || c.RESPONSIBLE_NAMES || c.responsaveis || [], []),
        commanderName: String(c.commanderName || c.COMMANDER_NAME || c.comandante || ''),
        entries: ensureParsed(c.entries || c.ENTRIES || c.itens || [], []), 
        timestamp: String(c.timestamp || c.TIMESTAMP || c.data_hora || ''),
        headerDetails: ensureParsed(c.headerDetails || c.HEADER_DETAILS || c.cabecalho || null, null), 
        snapshot: ensureParsed(c.snapshot || c.SNAPSHOT || c.foto_inventario || [], [])
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
    const rawCloudUsers = data?.users || data?.usuarios || [];
    const cloudUsers = Array.isArray(rawCloudUsers) ? rawCloudUsers : [];
    const processedUsers = cloudUsers.map(u => ({ ...u, customPermissions: ensureParsed(u.customPermissions, []) }));
    const finalUsers = [...processedUsers];
    masterUsers.forEach(m => { 
      const exists = finalUsers.some(u => u && u.username && String(u.username).toLowerCase() === m.username.toLowerCase());
      if (!exists) finalUsers.push(m); 
    });
    return finalUsers;
  },
  async saveUser(user: User) { 
    if (['cavalieri', 'admin20gb'].includes(user.username.toLowerCase())) return; 
    const payload = { ...user, customPermissions: JSON.stringify(user.customPermissions || []) };
    await this.sendToCloud('USER', 'SAVE', payload); 
  },
  async deleteUser(id: string) { await this.sendToCloud('USER', 'DELETE', { id }); },

  async getSettings(forceRefresh = false): Promise<SystemSettings> {
    const data = await this.fetchAllData(forceRefresh);
    const loadedSettings = data?.settings || data?.config || data?.configuracoes || {};
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
  },

  async clearDatabase() {
    await this.sendToCloud('CLEAR_ALL', 'DELETE', {});
    localStorage.removeItem(STORAGE_KEY_CACHE);
    localStorage.removeItem(STORAGE_KEY_LAST_SYNC);
  },

  /**
   * FUNÇÃO DE SINCRONIZAÇÃO GLOBAL (syncData)
   * Garante que o cache local seja limpo e os dados sejam buscados diretamente da nuvem.
   */
  async syncData(): Promise<any> {
    console.log("[DataService] Iniciando sincronização global forçada...");
    // REMOVIDO: localStorage.removeItem(STORAGE_KEY_CACHE); 
    // Motivo: Se o fetch falhar, perdemos o acesso aos dados. 
    // fetchAllData(true) já ignora o cache para a busca.
    return await this.fetchAllData(true);
  },

  getLastSyncTime(): string | null {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  }
};
