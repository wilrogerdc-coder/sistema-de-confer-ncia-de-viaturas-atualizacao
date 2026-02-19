
import React, { useState } from 'react';
import { User } from '../types';
import { DataService } from '../services/dataService';
import { APP_NAME } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

/**
 * COMPONENTE DE LOGIN
 * Gerencia o acesso ao sistema com normalização de strings para evitar falhas de autenticação.
 */
const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /**
   * PROCESSA A TENTATIVA DE LOGIN
   * Realiza normalização do usuário (trim + lowercase) para garantir fidelidade ao banco de dados.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Força recarga de usuários para capturar inclusões manuais ou mestre
      const users = await DataService.getUsers(true);
      const inputUserNormalized = username.trim().toLowerCase();
      
      const user = users.find(u => 
        u.username && String(u.username).trim().toLowerCase() === inputUserNormalized
      );
      
      if (user) {
        const inputPass = password.trim();
        const dbPass = String(user.password || '').trim();

        // Comparação de senha: Respeita espaços mas garante estabilidade de string
        if (dbPass === inputPass) {
          // REGRA: Verificação rigorosa do flag de troca obrigatória
          const needsChange = user.mustChangePassword === true || 
                             String(user.mustChangePassword).trim().toUpperCase() === 'TRUE';

          if (needsChange) {
            setPendingUser(user);
            setShowChangePassword(true);
          } else {
            onLogin(user);
          }
        } else {
          setError('Senha incorreta. Verifique se o Caps Lock está ativado.');
        }
      } else {
        setError('Usuário não localizado no sistema.');
      }
    } catch (err) {
      console.error(err);
      setError('Falha de comunicação com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * REGRA: Processa a troca de senha obrigatória
   */
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    if (!pendingUser) return;

    setLoading(true);
    try {
      const updatedUser: User = { 
        ...pendingUser, 
        password: newPassword, 
        mustChangePassword: false // Reseta o flag após a troca bem-sucedida
      };
      
      await DataService.saveUser(updatedUser);
      alert('Sua senha foi atualizada com sucesso!');
      onLogin(updatedUser);
    } catch (e) {
      setError('Erro ao salvar nova senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (showChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 animate-in fade-in" style={{ backgroundColor: 'var(--theme-secondary)' }}>
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl space-y-6 border border-white/10">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Primeiro Acesso</h2>
            <p className="text-sm text-slate-500 mt-2 font-bold">
              Olá, <span style={{ color: 'var(--theme-primary)' }}>{pendingUser?.name}</span>. Por segurança, altere sua senha.
            </p>
          </div>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nova Senha</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2" style={{ '--tw-ring-color': 'var(--theme-primary)' } as any} placeholder="Mínimo 4 caracteres" autoFocus required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirmar Senha</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2" style={{ '--tw-ring-color': 'var(--theme-primary)' } as any} placeholder="Repita a nova senha" required />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-xs font-bold rounded-r-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-4 text-white rounded-xl font-black uppercase text-sm shadow-xl hover:brightness-110 disabled:opacity-50 transition-all" style={{ backgroundColor: 'var(--theme-primary)' }}>
              {loading ? 'Processando...' : 'Salvar e Acessar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4" style={{ backgroundColor: 'var(--theme-secondary)' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-2xl shadow-xl mb-4 animate-bounce" style={{ backgroundColor: 'var(--theme-primary)' }}>
            <span className="text-4xl text-white">🚒</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{APP_NAME}</h1>
          <p className="text-white/50 mt-1 uppercase tracking-widest text-[10px] font-bold">Corpo de Bombeiros • PMESP</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuário / ID</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 transition-all font-bold" style={{ '--tw-ring-color': 'var(--theme-primary)' } as any} placeholder="Ex: cavalieri" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 transition-all pr-12 font-bold" 
                  style={{ '--tw-ring-color': 'var(--theme-primary)' } as any}
                  placeholder="••••••••"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-xs font-bold rounded-r-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-4 text-white rounded-xl font-black uppercase text-sm shadow-xl hover:brightness-110 disabled:opacity-50 transition-all mt-4" style={{ backgroundColor: 'var(--theme-primary)' }}>
              {loading ? 'Autenticando...' : 'Acessar Terminal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
