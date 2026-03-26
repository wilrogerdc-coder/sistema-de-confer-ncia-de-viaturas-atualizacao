
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 max-w-lg w-full text-center space-y-6">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Ops! Algo deu errado.</h2>
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-left">
              <p className="text-[10px] font-black text-red-600 uppercase mb-1">Detalhes do Erro:</p>
              <code className="text-[10px] font-mono text-red-800 break-all">{this.state.error?.toString()}</code>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-slate-800 transition-all"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
