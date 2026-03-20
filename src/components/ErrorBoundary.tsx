import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
          <div className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-3xl shadow-xl shadow-zinc-200/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
             </div>
             <div className="space-y-3">
               <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">Oops!</h1>
               <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                 Lo sentimos, ha ocurrido un error inesperado al intentar cargar esta página. 
                 Nuestro equipo ya ha sido notificado si el problema persiste.
               </p>
             </div>
             <div className="pt-6">
               <Button onClick={() => window.location.reload()} className="w-full h-12 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl transition-all">
                 Volver a intentar
               </Button>
               <button onClick={() => window.location.href = '/'} className="mt-4 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors w-full text-center py-2">
                 Ir al inicio
               </button>
             </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
