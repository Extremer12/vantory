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
import { Store, Globe, Type, Image as ImageIcon, Link as LinkIcon, Save, Copy, Upload, X, MessageCircle, Moon, Sun, Palette, Layout, Paintbrush, Layers, Instagram, Facebook, Music2, Search, MapPin, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/ImageCropper';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [carouselRatio, setCarouselRatio] = useState('panoramic');
  const [bannerText, setBannerText] = useState('');
  const [headerStyle, setHeaderStyle] = useState('classic');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [buttonRadius, setButtonRadius] = useState('xl');

  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
  const [carouselPreviews, setCarouselPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);
  const isLoadedRef = useRef(false);

  // Cropper state
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

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
      setPrimaryColor((profile as any).store_primary_color || '#000000');
      setCarouselRatio((profile as any).store_carousel_ratio || 'panoramic');
      setCarouselPreviews((profile as any).store_carousel_images || []);
      setBannerText((profile as any).store_banner_text || '');
      setHeaderStyle((profile as any).store_header_style || 'classic');
      setInstagram((profile as any).store_instagram || '');
      setFacebook((profile as any).store_facebook || '');
      setTiktok((profile as any).store_tiktok || '');
      setStoreEmail((profile as any).store_email || '');
      setStoreAddress((profile as any).store_address || '');
      setSeoTitle((profile as any).store_seo_title || '');
      setSeoDescription((profile as any).store_seo_description || '');
      setFontFamily((profile as any).store_font_family || 'Inter');
      setButtonRadius((profile as any).store_button_radius || 'xl');
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

  const handleCarouselSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCroppingImage(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be selected again if needed
    if (carouselInputRef.current) carouselInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const fileName = `carousel_${Date.now()}.jpg`;
    const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
    
    setCarouselFiles(prev => [...prev, croppedFile]);
    setCarouselPreviews(prev => [...prev, URL.createObjectURL(croppedBlob)]);
    
    setIsCropping(false);
    setCroppingImage(null);
  };

  const removeCarouselImage = (index: number) => {
    setCarouselPreviews(prev => prev.filter((_, i) => i !== index));
    // If it was a newly added file, remove it from carouselFiles too
    // This is a bit tricky since preview index might not align perfectly if we have mixed existing and new images
    // For simplicity, we'll re-calculate carouselImages on save
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

        // 1. Upload new carousel images
        const uploadedCarouselUrls: string[] = [];
        for (const file of carouselFiles) {
          const ext = file.name.split('.').pop();
          const fileName = `${user!.id}/carousel_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
          if (uploadError) throw new Error('Error subiendo imagen del carrusel: ' + uploadError.message);
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          uploadedCarouselUrls.push(data.publicUrl);
        }

        // 2. Merge with existing ones (only those still in previews)
        const finalCarouselUrls = [
          ...carouselPreviews.filter(p => p.startsWith('http')), // existing URLs
          ...uploadedCarouselUrls // newly uploaded ones
        ];

        // 3. Update Profile
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
          store_primary_color: primaryColor,
          store_carousel_images: finalCarouselUrls,
          store_carousel_ratio: carouselRatio,
          store_banner_text: bannerText,
          store_header_style: headerStyle,
          store_instagram: instagram,
          store_facebook: facebook,
          store_tiktok: tiktok,
          store_email: storeEmail,
          store_address: storeAddress,
          store_seo_title: seoTitle,
          store_seo_description: seoDescription,
          store_font_family: fontFamily,
          store_button_radius: buttonRadius,
        } as any)
        .eq('id', user!.id);
      
        if (error) throw error;
        
        // Clear file states after success
        setCarouselFiles([]);
        
        return formattedSlug; 
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

  const palettes = [
    { name: 'Industrial', color: '#000000' },
    { name: 'Cobalto', color: '#2563eb' },
    { name: 'Esmeralda', color: '#059669' },
    { name: 'Borgonia', color: '#991b1b' },
    { name: 'Violeta', color: '#7c3aed' },
    { name: 'Ámbar', color: '#d97706' },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuración de Tienda</h1>
            <SectionHelp 
              title="Tu Catálogo Digital"
              description="Diseña una experiencia de compra única para tus clientes. Cada cambio que realices se reflejará instantáneamente en tu tienda pública."
              steps={[
                { title: "Identidad", description: "Configura tu nombre, logo y enlaces para que te reconozcan.", icon: Store },
                { title: "Diseño", description: "Personaliza colores, fuentes y estilos para que coincidan con tu marca.", icon: Palette },
                { title: "Visibilidad", description: "Activa tu tienda cuando estés listo para recibir pedidos.", icon: Globe }
              ]}
            />
          </div>
          <p className="text-muted-foreground mt-1">Gestiona la identidad visual y funcional de tu comercio online.</p>
        </div>
        
        <div className="flex gap-3">
           <Button 
            variant="outline"
            className="gap-2 bg-card border-white/5"
            onClick={() => window.open(publicUrl || '#', '_blank')}
            disabled={!isPublic || !storeSlug}
          >
            <Globe size={18} /> Ver Tienda
          </Button>
          <Button 
            onClick={() => updateProfile.mutate()} 
            disabled={updateProfile.isPending || uploading}
            className="gap-2 shadow-lg shadow-primary/20 min-w-[160px]"
          >
            {uploading || updateProfile.isPending ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <Save size={18} />}
            {uploading || updateProfile.isPending ? 'Guardando...' : 'Guardar Todo'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-8">
        <TabsList className="bg-card/50 border border-white/5 p-1 h-auto flex-wrap md:flex-nowrap gap-1 rounded-2xl backdrop-blur-md">
          <TabsTrigger value="general" className="flex-1 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Store size={16} /> General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Palette size={16} /> Apariencia
          </TabsTrigger>
          <TabsTrigger value="carousel" className="flex-1 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Layers size={16} /> Carrusel
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex-1 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Search size={16} /> SEO & Canales
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-6 mt-0">
              <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-6">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${isPublic ? 'bg-success' : 'bg-muted-foreground'}`} />
                    <div>
                      <h3 className="font-semibold text-foreground">Estado de la Tienda</h3>
                      <p className="text-xs text-muted-foreground">{isPublic ? 'Tu tienda es visible para todo el mundo.' : 'Tu tienda está en modo mantenimiento.'}</p>
                    </div>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 flex items-center gap-2"><Store size={14} /> Nombre Comercial</Label>
                    <Input value={businessName} onChange={e => setBusinessName(e.target.value)} className="bg-white/5 border-white/10 h-11" placeholder="Ej: Moda & Estilo" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 flex items-center gap-2"><LinkIcon size={14} /> URL Personalizada</Label>
                    <div className="flex">
                      <div className="bg-white/5 border border-r-0 border-white/10 px-3 flex items-center text-xs text-muted-foreground rounded-l-md">/s/</div>
                      <Input value={storeSlug} onChange={e => setStoreSlug(e.target.value)} className="bg-white/5 border-white/10 h-11 rounded-l-none" placeholder="mi-tienda" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground/80">Descripción de Bienvenida</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-[100px]" placeholder="Cuenta la historia de tu negocio..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-foreground/80"><MessageCircle size={14} /> WhatsApp de Ventas</Label>
                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="bg-white/5 border-white/10 h-11" placeholder="+54 9 11 ..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-foreground/80"><Mail size={14} /> Email de Contacto</Label>
                    <Input value={storeEmail} onChange={e => setStoreEmail(e.target.value)} className="bg-white/5 border-white/10 h-11" placeholder="contacto@tuweb.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2 text-foreground/80"><MapPin size={14} /> Dirección Física</Label>
                    <Input value={storeAddress} onChange={e => setStoreAddress(e.target.value)} className="bg-white/5 border-white/10 h-11" placeholder="Calle Ejemplo 123, Ciudad" />
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
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-0">
              <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><Palette size={18} className="text-primary" /> Colores y Tema</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setTheme('light')} className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
                      <Sun size={20} /> Claro
                    </button>
                    <button onClick={() => setTheme('dark')} className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
                      <Moon size={20} /> Oscuro
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Paleta Identitaria</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {palettes.map((p) => (
                        <button key={p.name} onClick={() => setPrimaryColor(p.color)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${primaryColor === p.color ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5'}`}>
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
                    <Select value={fontFamily} onValueChange={setFontFamily}>
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
                        <button key={r} onClick={() => setButtonRadius(r)} className={`flex-1 py-3 rounded-xl border-2 transition-all text-sm font-medium ${buttonRadius === r ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
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
                      <button key={s} onClick={() => setHeaderStyle(s)} className={`p-4 rounded-xl border-2 text-center transition-all ${headerStyle === s ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted-foreground'}`}>
                        <span className="text-xs font-bold uppercase tracking-widest">{s === 'classic' ? 'Clásico' : s === 'centered' ? 'Centrado' : 'Minimal'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Carousel Tab */}
            <TabsContent value="carousel" className="space-y-6 mt-0">
              <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><Layers size={18} className="text-primary" /> Imágenes del Carrusel</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {carouselPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                        <img src={preview} className="w-full h-full object-cover" />
                        <button onClick={() => removeCarouselImage(index)} className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <input ref={carouselInputRef} type="file" accept="image/*" className="hidden" onChange={handleCarouselSelect} />
                    <button onClick={() => carouselInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all">
                      <Upload size={24} /> <span className="text-xs font-bold uppercase">Añadir</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Formato Visual</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setCarouselRatio('panoramic')} className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${carouselRatio === 'panoramic' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}>
                        <div className="w-full aspect-[21/9] bg-zinc-800 rounded-md border border-white/10 relative overflow-hidden">
                          <div className="absolute inset-4 bg-primary/20 rounded-sm" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Panorámico (1:1)</span>
                      </button>
                      <button onClick={() => setCarouselRatio('square')} className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${carouselRatio === 'square' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}>
                        <div className="w-full aspect-square bg-zinc-800 rounded-md border border-white/10 relative overflow-hidden">
                          <div className="absolute inset-4 bg-primary/20 rounded-sm" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Cuadrado (3:1)</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Título del Banner</Label>
                    <Input value={bannerText} onChange={e => setBannerText(e.target.value)} className="bg-white/5 border-white/10 h-11" placeholder="Ej: Nueva Colección 2024" />
                    <p className="text-xs text-muted-foreground">Este texto aparecerá resaltado sobre las imágenes del carrusel en modo panorámico.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Channels & SEO Tab */}
            <TabsContent value="channels" className="space-y-6 mt-0">
              <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-6 backdrop-blur-xl space-y-8">
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><MessageCircle size={18} className="text-primary" /> Redes Sociales</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-foreground/80"><Instagram size={14} /> Instagram</Label>
                      <Input value={instagram} onChange={e => setInstagram(e.target.value)} className="bg-white/5 border-white/10" placeholder="@usuario" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-foreground/80"><Facebook size={14} /> Facebook</Label>
                      <Input value={facebook} onChange={e => setFacebook(e.target.value)} className="bg-white/5 border-white/10" placeholder="Página oficial" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-foreground/80"><Music2 size={14} /> TikTok</Label>
                      <Input value={tiktok} onChange={e => setTiktok(e.target.value)} className="bg-white/5 border-white/10" placeholder="@usuario" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-8 border-t border-white/5">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><Search size={18} className="text-primary" /> SEO (Google & WhatsApp)</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título para el Buscador</Label>
                      <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} className="bg-white/5 border-white/10" placeholder="Ej: Tienda de Ropa Online - Mejores Precios" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción Meta</Label>
                      <Textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-[80px]" placeholder="Breve descripción que aparecerá en los resultados de Google..." />
                    </div>
                    <div className="p-4 bg-muted/20 rounded-xl border border-white/5 space-y-2 opacity-60">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Vista Previa Google</p>
                      <p className="text-blue-400 text-sm font-medium leading-none">{seoTitle || businessName || 'Mi Tienda Online'}</p>
                      <p className="text-green-500 text-xs">{publicUrl}</p>
                      <p className="text-muted-foreground text-xs line-clamp-2">{seoDescription || 'Visita nuestra tienda online y descubre los mejores productos.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>

          <div className="lg:col-span-1 space-y-6">
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
                     <Button className="flex-1 h-12 rounded-xl shadow-xl shadow-primary/20" asChild disabled={!isPublic}>
                       {isPublic ? (
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
                         <div className="flex items-center gap-2 font-mono">{primaryColor} <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} /></div>
                       </div>
                       <div className="flex justify-between text-xs">
                         <span className="text-muted-foreground">Fuente:</span>
                         <span className="font-medium">{fontFamily}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                         <span className="text-muted-foreground">Botones:</span>
                         <span className="font-medium underline decoration-primary decoration-2 underline-offset-4">{buttonRadius === '0' ? 'Agudos' : buttonRadius === 'full' ? 'Redondos' : 'Suaves'}</span>
                       </div>
                     </div>
                   </div>

                   {!isPublic && (
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
          </div>
        </div>
      </Tabs>

      {/* Cropper Dialog */}
      <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-zinc-950 border-white/10">
          <DialogHeader className="p-6 border-b border-white/5">
            <DialogTitle>Ajustar Imagen del Carrusel</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {croppingImage && (
              <ImageCropper 
                image={croppingImage} 
                onCropComplete={handleCropComplete}
                aspect={carouselRatio === 'square' ? 1 : 21/9}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
