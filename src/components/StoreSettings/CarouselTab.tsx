import React from 'react';
import { Layers, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StoreProfileData } from '@/types/store';

interface CarouselTabProps {
  form: StoreProfileData;
  updateForm: (updates: Partial<StoreProfileData>) => void;
  carouselPreviews: string[];
  carouselInputRef: React.RefObject<HTMLInputElement>;
  handleCarouselSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeCarouselImage: (index: number) => void;
}

export function CarouselTab({
  form, updateForm, carouselPreviews, carouselInputRef, handleCarouselSelect, removeCarouselImage
}: CarouselTabProps) {
  return (
    <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-8">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2"><Layers size={18} className="text-primary" /> Imágenes del Carrusel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {carouselPreviews.map((preview, index) => (
            <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
              <img src={preview} className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => removeCarouselImage(index)} 
                className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <input ref={carouselInputRef} type="file" accept="image/*" className="hidden" onChange={handleCarouselSelect} />
          <button 
            type="button"
            onClick={() => carouselInputRef.current?.click()} 
            className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all"
          >
            <Upload size={24} /> <span className="text-xs font-bold uppercase">Añadir</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Formato Visual</Label>
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => updateForm({ carouselRatio: 'panoramic' })} 
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${form.carouselRatio === 'panoramic' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}
            >
              <div className="w-full aspect-[21/9] bg-zinc-800 rounded-md border border-white/10 relative overflow-hidden">
                <div className="absolute inset-4 bg-primary/20 rounded-sm" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Panorámico (1:1)</span>
            </button>
            <button 
              type="button"
              onClick={() => updateForm({ carouselRatio: 'square' })} 
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${form.carouselRatio === 'square' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}
            >
              <div className="w-full aspect-square bg-zinc-800 rounded-md border border-white/10 relative overflow-hidden">
                <div className="absolute inset-4 bg-primary/20 rounded-sm" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Cuadrado (3:1)</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-semibold">Título del Banner</Label>
          <Input 
            value={form.bannerText} 
            onChange={e => updateForm({ bannerText: e.target.value })} 
            className="bg-white/5 border-white/10 h-11" 
            placeholder="Ej: Nueva Colección 2024" 
          />
          <p className="text-xs text-muted-foreground">Este texto aparecerá resaltado sobre las imágenes del carrusel en modo panorámico.</p>
        </div>
      </div>
    </div>
  );
}
