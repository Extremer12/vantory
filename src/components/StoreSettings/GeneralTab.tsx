import React from 'react';
import { Store, Link as LinkIcon, MessageCircle, Mail, MapPin, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { StoreProfileData } from '@/types/store';

interface GeneralTabProps {
  form: StoreProfileData;
  updateForm: (updates: Partial<StoreProfileData>) => void;
  logoPreview: string | null;
  bannerPreview: string | null;
  logoInputRef: React.RefObject<HTMLInputElement>;
  bannerInputRef: React.RefObject<HTMLInputElement>;
  handleLogoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearLogo: () => void;
  clearBanner: () => void;
}

export function GeneralTab({
  form, updateForm, logoPreview, bannerPreview, 
  logoInputRef, bannerInputRef, handleLogoSelect, handleBannerSelect, 
  clearLogo, clearBanner
}: GeneralTabProps) {
  return (
    <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-6">
      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${form.isPublic ? 'bg-success' : 'bg-muted-foreground'}`} />
          <div>
            <h3 className="font-semibold text-foreground">Estado de la Tienda</h3>
            <p className="text-xs text-muted-foreground">{form.isPublic ? 'Tu tienda es visible para todo el mundo.' : 'Tu tienda está en modo mantenimiento.'}</p>
          </div>
        </div>
        <Switch checked={form.isPublic} onCheckedChange={(v) => updateForm({ isPublic: v })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-foreground/80 flex items-center gap-2"><Store size={14} /> Nombre Comercial</Label>
          <Input value={form.businessName} onChange={e => updateForm({ businessName: e.target.value })} className="bg-white/5 border-white/10 h-11" placeholder="Ej: Moda & Estilo" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground/80 flex items-center gap-2"><LinkIcon size={14} /> URL Personalizada</Label>
          <div className="flex">
            <div className="bg-white/5 border border-r-0 border-white/10 px-3 flex items-center text-xs text-muted-foreground rounded-l-md">/s/</div>
            <Input value={form.storeSlug} onChange={e => updateForm({ storeSlug: e.target.value })} className="bg-white/5 border-white/10 h-11 rounded-l-none" placeholder="mi-tienda" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground/80">Descripción de Bienvenida</Label>
        <Textarea value={form.description} onChange={e => updateForm({ description: e.target.value })} className="bg-white/5 border-white/10 min-h-[100px]" placeholder="Cuenta la historia de tu negocio..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground/80"><MessageCircle size={14} /> WhatsApp de Ventas</Label>
          <Input value={form.whatsapp} onChange={e => updateForm({ whatsapp: e.target.value })} className="bg-white/5 border-white/10 h-11" placeholder="+54 9 11 ..." />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground/80"><Mail size={14} /> Email de Contacto</Label>
          <Input value={form.storeEmail} onChange={e => updateForm({ storeEmail: e.target.value })} className="bg-white/5 border-white/10 h-11" placeholder="contacto@tuweb.com" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2 text-foreground/80"><MapPin size={14} /> Dirección Física</Label>
          <Input value={form.storeAddress} onChange={e => updateForm({ storeAddress: e.target.value })} className="bg-white/5 border-white/10 h-11" placeholder="Calle Ejemplo 123, Ciudad" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/5">
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-foreground/80"><ImageIcon size={14} /> Logotipo</Label>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
          {logoPreview ? (
            <div className="relative group w-32 h-32 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
              <img src={logoPreview} className="w-full h-full object-cover" />
              <button onClick={clearLogo} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={20} className="text-white" /></button>
            </div>
          ) : (
            <button onClick={() => logoInputRef.current?.click()} className="w-32 h-32 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all">
              <Upload size={20} /> <span className="text-[10px] font-bold uppercase">Subir</span>
            </button>
          )}
        </div>
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-foreground/80"><ImageIcon size={14} /> Banner de Fondo</Label>
          <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerSelect} className="hidden" />
          {bannerPreview ? (
            <div className="relative group w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40">
              <img src={bannerPreview} className="w-full h-full object-cover" />
              <button onClick={clearBanner} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={20} className="text-white" /></button>
            </div>
          ) : (
            <button onClick={() => bannerInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all">
              <Upload size={24} /> <span className="text-xs font-bold uppercase">Subir Banner</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
