import React from 'react';
import { Palette, Sun, Moon, Type, Layout, Paintbrush } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StoreProfileData } from '@/types/store';

const palettes = [
  { name: 'Industrial', color: '#000000' },
  { name: 'Cobalto', color: '#2563eb' },
  { name: 'Esmeralda', color: '#059669' },
  { name: 'Borgonia', color: '#991b1b' },
  { name: 'Violeta', color: '#7c3aed' },
  { name: 'Ámbar', color: '#d97706' },
];

interface AppearanceTabProps {
  form: StoreProfileData;
  updateForm: (updates: Partial<StoreProfileData>) => void;
}

export function AppearanceTab({ form, updateForm }: AppearanceTabProps) {
  return (
    <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-8">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2"><Palette size={18} className="text-primary" /> Colores y Tema</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => updateForm({ theme: 'light' })} className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${form.theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
            <Sun size={20} /> Claro
          </button>
          <button onClick={() => updateForm({ theme: 'dark' })} className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${form.theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
            <Moon size={20} /> Oscuro
          </button>
        </div>
        
        <div className="space-y-3">
          <Label>Paleta Identitaria</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {palettes.map((p) => (
              <button key={p.name} onClick={() => updateForm({ primaryColor: p.color })} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${form.primaryColor === p.color ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5'}`}>
                <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: p.color }} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2"><Type size={18} className="text-primary" /> Tipografía</h3>
          <Select value={form.fontFamily} onValueChange={(v) => updateForm({ fontFamily: v })}>
            <SelectTrigger className="bg-white/5 border-white/10 h-11">
              <SelectValue placeholder="Selecciona una fuente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter">Inter (Moderna/Limpia)</SelectItem>
              <SelectItem value="Outfit">Outfit (Geométrica/Smart)</SelectItem>
              <SelectItem value="Playfair Display">Playfair (Elegante/Boutique)</SelectItem>
              <SelectItem value="Space Grotesk">Space Grotesk (Tech/Bold)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2"><Layout size={18} className="text-primary" /> Redondez (Bordes)</h3>
          <div className="flex gap-4">
            {['0', 'md', 'xl', 'full'].map((r) => (
              <button key={r} onClick={() => updateForm({ buttonRadius: r })} className={`flex-1 py-3 rounded-xl border-2 transition-all text-sm font-medium ${form.buttonRadius === r ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
                {r === '0' ? 'Agudo' : r === 'full' ? 'Círculo' : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-8 border-t border-white/5">
        <h3 className="font-semibold text-lg flex items-center gap-2"><Paintbrush size={18} className="text-primary" /> Estilo de Navegación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['classic', 'centered', 'minimal'].map((s) => (
            <button key={s} onClick={() => updateForm({ headerStyle: s })} className={`p-4 rounded-xl border-2 text-center transition-all ${form.headerStyle === s ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
              <span className="text-xs font-bold uppercase tracking-widest">{s === 'classic' ? 'Clásico' : s === 'centered' ? 'Centrado' : 'Minimal'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
