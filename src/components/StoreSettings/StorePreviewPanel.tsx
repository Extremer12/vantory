import React from 'react';
import { Globe, Copy, Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StoreProfileData } from '@/types/store';

interface StorePreviewPanelProps {
  form: StoreProfileData;
  publicUrl: string | null;
  copyLink: () => void;
}

export function StorePreviewPanel({ form, publicUrl, copyLink }: StorePreviewPanelProps) {
  return (
    <div className="bg-card border border-white/5 shadow-2xl rounded-3xl p-6 backdrop-blur-xl sticky top-24 space-y-6 overflow-hidden">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
      <h3 className="font-bold text-xl flex items-center gap-2 relative z-10"><Globe className="text-primary" /> Tu Ventana al Mundo</h3>
      
      {publicUrl ? (
        <div className="space-y-4 relative z-10">
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 break-all text-sm font-medium text-primary shadow-inner">
            {publicUrl}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 bg-white/5 border-white/10 hover:bg-white/10 h-12 rounded-xl" onClick={copyLink}>
              <Copy size={16} /> Link
            </Button>
            <Button className="flex-1 h-12 rounded-xl shadow-xl shadow-primary/20" asChild disabled={!form.isPublic}>
              {form.isPublic ? (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">Visitar <Globe size={16} className="ml-2" /></a>
              ) : (
                <span>Cerrada</span>
              )}
            </Button>
          </div>
          
          <div className="pt-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resumen del Diseño</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Color Principal:</span>
                <div className="flex items-center gap-2 font-mono">{form.primaryColor} <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.primaryColor }} /></div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fuente:</span>
                <span className="font-medium">{form.fontFamily}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Botones:</span>
                <span className="font-medium underline decoration-primary decoration-2 underline-offset-4">{form.buttonRadius === '0' ? 'Agudos' : form.buttonRadius === 'full' ? 'Redondos' : 'Suaves'}</span>
              </div>
            </div>
          </div>

          {!form.isPublic && (
            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-orange-500 text-xs">
              <p className="flex items-center gap-2 font-bold mb-1"><Layers size={14} /> MODO MANTENIMIENTO</p>
              <p className="opacity-80">Los clientes no pueden ver tus productos hasta que actives la tienda.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
          <Search size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm px-4">Configura un <strong>Enlace</strong> para empezar.</p>
        </div>
      )}
    </div>
  );
}
