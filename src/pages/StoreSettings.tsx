import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SectionHelp } from '@/components/SectionHelp';
import { Store, Globe, Type, Image as ImageIcon, Link as LinkIcon, Save, Copy, Upload, X, MessageCircle, Moon, Sun, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function StoreSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const isLoadedRef = useRef(false);

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load existing profile data
  useEffect(() => {
    if (profile && !isLoadedRef.current) {
      setBusinessName((profile as any).business_name || '');
      setStoreSlug((profile as any).store_slug || '');
      setDescription((profile as any).store_description || '');
      setIsPublic((profile as any).store_public || false);
      setLogoPreview((profile as any).store_logo_url || null);
      setBannerPreview((profile as any).store_banner_url || null);
      setWhatsapp((profile as any).store_whatsapp || '');
      setTheme((profile as any).store_theme || 'dark');
      isLoadedRef.current = true;
    }
  }, [profile]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }
    setBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        let finalLogoUrl = logoPreview ? (logoFile ? null : (profile as any)?.store_logo_url) : null;
        let finalBannerUrl = bannerPreview ? (bannerFile ? null : (profile as any)?.store_banner_url) : null;

        if (logoFile) {
          const ext = logoFile.name.split('.').pop();
          const fileName = `${user!.id}/logo_${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, logoFile);
          if (uploadError) throw new Error('Error subiendo logo: ' + uploadError.message);
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          finalLogoUrl = data.publicUrl;
        }

        if (bannerFile) {
          const ext = bannerFile.name.split('.').pop();
          const fileName = `${user!.id}/banner_${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, bannerFile);
          if (uploadError) throw new Error('Error subiendo banner: ' + uploadError.message);
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          finalBannerUrl = data.publicUrl;
        }

        // Basic slug formatting (lowercase, no spaces)
        const formattedSlug = storeSlug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        const { error } = await supabase
        .from('profiles')
        .update({
          business_name: businessName as any,
          store_slug: (formattedSlug !== '' ? formattedSlug : null) as any,
          store_description: description as any,
          store_logo_url: finalLogoUrl as any,
          store_banner_url: finalBannerUrl as any,
          store_public: isPublic as any,
          store_whatsapp: whatsapp as any,
          store_theme: theme as any,
        } as any)
        .eq('id', user!.id);
      
        if (error) throw error;
        return formattedSlug; // return what we saved
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (savedSlug) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Update local state if the slug was auto-formatted
      if (savedSlug && savedSlug !== storeSlug) {
        setStoreSlug(savedSlug);
      }
      toast.success('Configuración guardada exitosamente');
    },
    onError: (error: any) => {
      if (error.code === '23505') { // Unique violation
        toast.error('Este enlace (slug) ya está en uso. Por favor, elige otro.');
      } else {
        toast.error('Error al guardar: ' + error.message);
      }
    }
  });

  const publicUrl = storeSlug ? `${window.location.origin}/s/${storeSlug}` : null;

  const copyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mi Tienda Online</h1>
          <SectionHelp 
            title="Configuración de Tienda"
            description="Personaliza la apariencia de tu catálogo público para compartirlo con tus clientes y vender más."
            steps={[
              {
                title: "Enlace Único (Slug)",
                description: "Crea una dirección web corta y fácil de recordar (ej. mi-negocio).",
                icon: LinkIcon
              },
              {
                title: "Personalidad de Marca",
                description: "Agrega tu logotipo y un banner atrayente para darle un aspecto profesional a tu catálogo.",
                icon: ImageIcon
              },
              {
                title: "Control de Visibilidad",
                description: "Activa o desactiva la tienda al instante. Si está desactivada, los clientes no podrán acceder a ella.",
                icon: Globe
              }
            ]}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Configura tu catálogo público para tus clientes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl">
            <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(); }} className="space-y-6">
              
              {/* Visibilidad Switch */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div>
                  <h3 className="font-semibold text-foreground">Visibilidad Pública</h3>
                  <p className="text-sm text-muted-foreground">Abre o cierra tu tienda al público general</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${isPublic ? 'text-success' : 'text-muted-foreground'}`}>
                    {isPublic ? 'Activa' : 'Inactiva'}
                  </span>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>

              {/* Basic Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground/80"><Store size={16} /> Nombre de la Tienda</Label>
                  <Input 
                    placeholder="Mi Negocio"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-white/5 border-white/10 focus-visible:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">Este es el título principal de tu catálogo público.</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground/80"><LinkIcon size={16} /> Enlace Personalizado (Slug)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-sm select-none">
                      {window.location.hostname}/s/
                    </span>
                    <Input 
                      placeholder="mi-negocio-online"
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value)}
                      className="bg-white/5 border-white/10 focus-visible:ring-primary"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Usa solo minúsculas, números o guiones.</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground/80"><Type size={16} /> Descripción de la Tienda</Label>
                  <Textarea 
                    placeholder="¡Bienvenidos a nuestra tienda! Aquí encontrarás los mejores productos..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white/5 border-white/10 focus-visible:ring-primary min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">Un breve mensaje de bienvenida o lema para tus clientes.</p>
                </div>
              </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-foreground/80"><MessageCircle size={16} /> Número de WhatsApp</Label>
                    <Input 
                      placeholder="+54 9 11 1234-5678"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="bg-white/5 border-white/10 focus-visible:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Opcional. Si lo incluyes, el botón de "Contactar" en tu tienda enviará mensajes a este número.</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-foreground/80"><Palette size={16} /> Estilo Visual de la Tienda</Label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10'}`}
                      >
                        <Sun size={20} /> Claro
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10'}`}
                      >
                        <Moon size={20} /> Oscuro
                      </button>
                    </div>
                  </div>
                </div>

              {/* Branding (File Uploads) */}
              <div className="space-y-6 pt-4 border-t border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-foreground/80"><ImageIcon size={16} /> Logotipo de la Tienda</Label>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                    {logoPreview ? (
                      <div className="relative w-full aspect-square max-w-[160px] rounded-xl overflow-hidden border border-white/10 bg-black/30">
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={clearLogo} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full aspect-square max-w-[160px] rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground group"
                      >
                        <Upload size={22} className="group-hover:text-primary transition-colors" />
                        <span className="text-sm">Subir Logo</span>
                        <span className="text-xs opacity-50 text-center px-2">JPG o PNG (máx 5MB)</span>
                      </button>
                    )}
                  </div>

                  {/* Banner Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-foreground/80"><ImageIcon size={16} /> Banner Principal</Label>
                    <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerSelect} className="hidden" />
                    {bannerPreview ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/30">
                        <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={clearBanner} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="w-full aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground group"
                      >
                        <Upload size={22} className="group-hover:text-primary transition-colors" />
                        <span className="text-sm">Subir Banner</span>
                        <span className="text-xs opacity-50 text-center px-2">Aspecto horizontal recomendado (máx 5MB)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending || uploading}
                  className="w-full gap-2 shadow-lg shadow-primary/20"
                >
                  <Save size={18} />
                  {uploading || updateProfile.isPending ? 'Guardando Cambios...' : 'Guardar Configuración'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview / Status Panel */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl sticky top-24">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Store className="text-primary" /> Compartir</h3>
            
            {publicUrl ? (
              <div className="space-y-4">
                <p className="text-sm text-foreground/80">
                  Invita a tus clientes copiando el enlace a continuación:
                </p>
                <div className="bg-black/30 p-3 rounded-lg border border-white/10 break-all text-sm font-medium text-primary select-all">
                  {publicUrl}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2 bg-white/5 border-white/10" onClick={copyLink}>
                    <Copy size={16} /> Copiar
                  </Button>
                  <Button className="flex-1" asChild disabled={!isPublic}>
                    {isPublic ? (
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer">Visitar</a>
                    ) : (
                      <span>Visitar</span>
                    )}
                  </Button>
                </div>
                {!isPublic && (
                  <p className="text-xs text-warning mt-2 bg-warning/10 p-2 rounded-md border border-warning/20">
                    Tu tienda está inactiva actualmente. Debes activarla para que el enlace funcione.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                <p className="text-sm">Configura un <strong>Enlace Personalizado</strong> y guarda para obtener el link de tu tienda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
