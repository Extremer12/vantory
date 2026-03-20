import React from 'react';
import { MessageCircle, Search, Instagram, Facebook, Music2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StoreProfileData } from '@/types/store';

interface ChannelsTabProps {
  form: StoreProfileData;
  updateForm: (updates: Partial<StoreProfileData>) => void;
  publicUrl: string | null;
}

export function ChannelsTab({ form, updateForm, publicUrl }: ChannelsTabProps) {
  return (
    <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-8">
      <div className="space-y-6">
        <h3 className="font-semibold text-lg flex items-center gap-2"><MessageCircle size={18} className="text-primary" /> Redes Sociales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground/80"><Instagram size={14} /> Instagram</Label>
            <Input value={form.instagram} onChange={e => updateForm({ instagram: e.target.value })} className="bg-white/5 border-white/10" placeholder="@usuario" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground/80"><Facebook size={14} /> Facebook</Label>
            <Input value={form.facebook} onChange={e => updateForm({ facebook: e.target.value })} className="bg-white/5 border-white/10" placeholder="Página oficial" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground/80"><Music2 size={14} /> TikTok</Label>
            <Input value={form.tiktok} onChange={e => updateForm({ tiktok: e.target.value })} className="bg-white/5 border-white/10" placeholder="@usuario" />
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-8 border-t border-white/5">
        <h3 className="font-semibold text-lg flex items-center gap-2"><Search size={18} className="text-primary" /> SEO (Google & WhatsApp)</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título para el Buscador</Label>
            <Input value={form.seoTitle} onChange={e => updateForm({ seoTitle: e.target.value })} className="bg-white/5 border-white/10" placeholder="Ej: Tienda de Ropa Online - Mejores Precios" />
          </div>
          <div className="space-y-2">
            <Label>Descripción Meta</Label>
            <Textarea value={form.seoDescription} onChange={e => updateForm({ seoDescription: e.target.value })} className="bg-white/5 border-white/10 min-h-[80px]" placeholder="Breve descripción que aparecerá en los resultados de Google..." />
          </div>
          <div className="p-4 bg-muted/20 rounded-xl border border-white/5 space-y-2 opacity-60">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Vista Previa Google</p>
            <p className="text-blue-400 text-sm font-medium leading-none">{form.seoTitle || form.businessName || 'Mi Tienda Online'}</p>
            <p className="text-green-500 text-xs">{publicUrl}</p>
            <p className="text-muted-foreground text-xs line-clamp-2">{form.seoDescription || 'Visita nuestra tienda online y descubre los mejores productos.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
