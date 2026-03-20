import { Instagram, Facebook, Music2, Mail, MapPin, Phone, Store } from 'lucide-react';

interface PublicStoreFooterProps {
  profile: any;
  colors: Record<string, string>;
  instagram: string;
  facebook: string;
  tiktok: string;
  storeEmail: string;
  storeAddress: string;
}

export function PublicStoreFooter({
  profile,
  colors,
  instagram,
  facebook,
  tiktok,
  storeEmail,
  storeAddress,
}: PublicStoreFooterProps) {
  return (
    <footer className={`mt-40 bg-card border-t ${colors.border} pt-24 pb-12`}>
      <div className="max-w-[1700px] mx-auto px-6 md:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-20 mb-24">
          <div className="lg:col-span-2 space-y-10">
            <h4 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
              <Store size={32} className="text-primary" />
              {profile.business_name}
            </h4>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {(profile as any).store_description || "Descubre nuestra selección exclusiva de productos diseñados para elevar tu estilo de vida."}
            </p>
            <div className="flex gap-6 items-center">
              {instagram && (
                <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 transition-all text-muted-foreground hover:text-primary">
                  <Instagram size={20} />
                </a>
              )}
              {facebook && (
                <a href={`https://facebook.com/${facebook}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 transition-all text-muted-foreground hover:text-primary">
                  <Facebook size={20} />
                </a>
              )}
              {tiktok && (
                <a href={`https://tiktok.com/@${tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 transition-all text-muted-foreground hover:text-primary">
                  <Music2 size={20} />
                </a>
              )}
            </div>
          </div>
          
          <div className="space-y-8">
            <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Información</h5>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground italic">
              <li className="hover:text-primary cursor-pointer transition-colors">Cómo comprar</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Envíos y Retiros</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Preguntas Frecuentes</li>
            </ul>
          </div>

          <div className="space-y-8">
            <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Contacto</h5>
            <ul className="space-y-5 text-sm font-medium text-muted-foreground">
              {(profile as any).store_whatsapp && (
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0"><Phone size={18} /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">WhatsApp</p><span>{(profile as any).store_whatsapp}</span></div>
                </li>
              )}
              {storeEmail && (
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><Mail size={18} /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Email</p><span>{storeEmail}</span></div>
                </li>
              )}
              {storeAddress && (
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0"><MapPin size={18} /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Ubicación</p><span>{storeAddress}</span></div>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">© 2026 {profile.business_name} — Todos los derechos reservados</p>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">Desarrollado por</span>
            <span className="text-[11px] font-black tracking-tighter uppercase italic text-primary hover:scale-110 transition-transform cursor-pointer">Zion Code</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
