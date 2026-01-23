
import React, { useState, useEffect } from 'react';
import { User, UserRole, Theme } from '../types';
import { THEME_PRESETS, DEFAULT_THEME } from '../constants';
import { DataService } from '../services/dataService';
import { applyThemeToDocument } from '../utils/themeUtils';

interface ThemeManagerProps {
  currentUser: User;
  onThemeChange?: (theme: Theme) => void;
}

const ThemeManager: React.FC<ThemeManagerProps> = ({ currentUser, onThemeChange }) => {
  const [activeThemeId, setActiveThemeId] = useState<string>(DEFAULT_THEME.id);
  const [customTheme, setCustomTheme] = useState<Theme>({
    id: 'custom',
    name: 'Personalizado',
    colors: { ...DEFAULT_THEME.colors }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentTheme();
  }, []);

  const loadCurrentTheme = async () => {
    setLoading(true);
    try {
      const settings = await DataService.getSettings();
      if (settings.activeTheme) {
        setActiveThemeId(settings.activeTheme.id);
        if (settings.activeTheme.id === 'custom') {
          // Garante que o tema custom carregado tenha todas as propriedades, inclusive as novas
          setCustomTheme({
             ...settings.activeTheme,
             colors: { ...DEFAULT_THEME.colors, ...settings.activeTheme.colors }
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: Theme) => {
    setActiveThemeId(preset.id);
    applyThemeToDocument(preset); // Preview imediato
  };

  const handleCustomColorChange = (key: keyof Theme['colors'], value: string) => {
    const updated = {
      ...customTheme,
      colors: { ...customTheme.colors, [key]: value }
    };
    setCustomTheme(updated);
    if (activeThemeId === 'custom') {
      applyThemeToDocument(updated); // Live preview
    }
  };

  const saveTheme = async () => {
    if (!window.confirm("Aplicar e salvar este tema para todos os usuários?")) return;
    
    setLoading(true);
    try {
      const themeToSave = activeThemeId === 'custom' 
        ? customTheme 
        : THEME_PRESETS.find(t => t.id === activeThemeId) || DEFAULT_THEME;

      const currentSettings = await DataService.getSettings();
      
      await DataService.saveSettings({
        ...currentSettings,
        activeTheme: themeToSave
      });

      if (onThemeChange) onThemeChange(themeToSave);

      await DataService.saveLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UPDATE_THEME',
        details: `Tema alterado para: ${themeToSave.name}`
      });

      alert("Tema aplicado com sucesso!");
    } catch (e) {
      alert("Erro ao salvar tema.");
    } finally {
      setLoading(false);
    }
  };

  if (currentUser.role !== UserRole.SUPER) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <div className="text-4xl mb-4">🎨</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h3>
        <p className="text-slate-500 font-bold mt-2">Apenas o Super Usuário pode gerenciar temas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="text-3xl text-[var(--theme-primary)]">🎨</div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Gerenciador de Temas</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personalização Visual do Sistema</p>
              </div>
            </div>
            <button 
              onClick={saveTheme} 
              disabled={loading}
              className="bg-[var(--theme-primary)] text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg disabled:opacity-50 transition-all hover:brightness-110"
            >
              {loading ? 'Salvando...' : 'Aplicar Tema'}
            </button>
        </div>

        <div className="space-y-8">
          {/* Presets */}
          <div>
            <h4 className="text-sm font-black text-slate-700 uppercase mb-4">Temas Predefinidos</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {THEME_PRESETS.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleSelectPreset(theme)}
                  className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                    activeThemeId === theme.id ? 'border-[var(--theme-primary)] ring-4 ring-slate-100' : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: theme.colors.primary }}></div>
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: theme.colors.secondary }}></div>
                    <div className="w-8 h-8 rounded-full shadow-sm border border-slate-200" style={{ backgroundColor: theme.colors.background }}></div>
                  </div>
                  <h5 className="font-bold text-slate-800">{theme.name}</h5>
                  {activeThemeId === theme.id && (
                    <div className="absolute top-2 right-2 text-[var(--theme-primary)] text-xl">✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Builder */}
          <div className={`p-6 rounded-3xl border-2 transition-all ${activeThemeId === 'custom' ? 'border-[var(--theme-primary)] bg-slate-50' : 'border-slate-100 bg-white'}`}>
             <div className="flex items-center gap-3 mb-6">
                <input 
                  type="radio" 
                  checked={activeThemeId === 'custom'} 
                  onChange={() => { setActiveThemeId('custom'); applyThemeToDocument(customTheme); }}
                  className="w-5 h-5 accent-[var(--theme-primary)] cursor-pointer"
                />
                <h4 className="text-sm font-black text-slate-700 uppercase">Criar Tema Personalizado</h4>
             </div>

             <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 ${activeThemeId !== 'custom' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Cor Primária (Destaque)</label>
                   <div className="flex items-center gap-2">
                     <input type="color" value={customTheme.colors.primary} onChange={e => handleCustomColorChange('primary', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                     <span className="text-xs font-mono text-slate-600">{customTheme.colors.primary}</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Cor Secundária (Menu)</label>
                   <div className="flex items-center gap-2">
                     <input type="color" value={customTheme.colors.secondary} onChange={e => handleCustomColorChange('secondary', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                     <span className="text-xs font-mono text-slate-600">{customTheme.colors.secondary}</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Fundo da Página</label>
                   <div className="flex items-center gap-2">
                     <input type="color" value={customTheme.colors.background} onChange={e => handleCustomColorChange('background', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                     <span className="text-xs font-mono text-slate-600">{customTheme.colors.background}</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Superfície (Cards)</label>
                   <div className="flex items-center gap-2">
                     <input type="color" value={customTheme.colors.surface} onChange={e => handleCustomColorChange('surface', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                     <span className="text-xs font-mono text-slate-600">{customTheme.colors.surface}</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Texto Principal</label>
                   <div className="flex items-center gap-2">
                     <input type="color" value={customTheme.colors.textMain} onChange={e => handleCustomColorChange('textMain', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                     <span className="text-xs font-mono text-slate-600">{customTheme.colors.textMain}</span>
                   </div>
                </div>
             </div>

             <div className={`p-4 bg-slate-100 rounded-2xl border border-slate-200 ${activeThemeId !== 'custom' ? 'opacity-50 pointer-events-none' : ''}`}>
                 <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Cores de Prontidão (Dashboard)</h5>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-green-600 uppercase">Prontidão Verde</label>
                       <div className="flex items-center gap-2">
                         <input type="color" value={customTheme.colors.readinessVerde} onChange={e => handleCustomColorChange('readinessVerde', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                         <span className="text-xs font-mono text-slate-600">{customTheme.colors.readinessVerde}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-yellow-600 uppercase">Prontidão Amarela</label>
                       <div className="flex items-center gap-2">
                         <input type="color" value={customTheme.colors.readinessAmarela} onChange={e => handleCustomColorChange('readinessAmarela', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                         <span className="text-xs font-mono text-slate-600">{customTheme.colors.readinessAmarela}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-blue-600 uppercase">Prontidão Azul</label>
                       <div className="flex items-center gap-2">
                         <input type="color" value={customTheme.colors.readinessAzul} onChange={e => handleCustomColorChange('readinessAzul', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0" />
                         <span className="text-xs font-mono text-slate-600">{customTheme.colors.readinessAzul}</span>
                       </div>
                    </div>
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeManager;
