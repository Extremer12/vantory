import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Intento de acceso a ruta inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <div className="w-24 h-24 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-black text-zinc-400">?</span>
         </div>
         <div className="space-y-3">
           <h1 className="text-8xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">404</h1>
           <p className="text-xl font-bold uppercase tracking-[0.2em] text-zinc-500 pr-2">Página no encontrada</p>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mt-4">
             Lo sentimos, la ruta que buscas no existe o ha sido movida. Revisa la URL e inténtalo de nuevo.
           </p>
         </div>
         <div className="pt-8">
           <Button onClick={() => window.location.href = '/'} className="w-full h-14 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-zinc-200 dark:shadow-none hover:opacity-90 transition-all bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
             Volver al inicio
           </Button>
         </div>
      </div>
    </div>
  );
};

export default NotFound;
