import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Globe, Save, Palette, Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/ImageCropper';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionHelp } from '@/components/SectionHelp';

import { useStoreSettings } from '@/hooks/useStoreSettings';
import { StoreProfileData, initialStoreProfileData } from '@/types/store';

import { GeneralTab } from '@/components/StoreSettings/GeneralTab';
import { AppearanceTab } from '@/components/StoreSettings/AppearanceTab';
import { CarouselTab } from '@/components/StoreSettings/CarouselTab';
import { ChannelsTab } from '@/components/StoreSettings/ChannelsTab';
import { StorePreviewPanel } from '@/components/StoreSettings/StorePreviewPanel';

export default function StoreSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile, isLoading } = useStoreSettings(user);

  const [form, setForm] = useState<StoreProfileData>(initialStoreProfileData);
  const updateForm = (updates: Partial<StoreProfileData>) => setForm(prev => ({ ...prev, ...updates }));

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

  // Cropper
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (profile && !isLoadedRef.current) {
      setForm({
        businessName: (profile as any).business_name || '',
        storeSlug: (profile as any).store_slug || '',
        description: (profile as any).store_description || '',
        isPublic: (profile as any).store_public || false,
        whatsapp: (profile as any).store_whatsapp || '',
        theme: (profile as any).store_theme || 'dark',
        primaryColor: (profile as any).store_primary_color || '#000000',
        carouselRatio: (profile as any).store_carousel_ratio || 'panoramic',
        bannerText: (profile as any).store_banner_text || '',
        headerStyle: (profile as any).store_header_style || 'classic',
        instagram: (profile as any).store_instagram || '',
        facebook: (profile as any).store_facebook || '',
        tiktok: (profile as any).store_tiktok || '',
        storeEmail: (profile as any).store_email || '',
        storeAddress: (profile as any).store_address || '',
        seoTitle: (profile as any).store_seo_title || '',
        seoDescription: (profile as any).store_seo_description || '',
        fontFamily: (profile as any).store_font_family || 'Inter',
        buttonRadius: (profile as any).store_button_radius || 'xl',
      });
      setLogoPreview((profile as any).store_logo_url || null);
      setBannerPreview((profile as any).store_banner_url || null);
      setCarouselPreviews((profile as any).store_carousel_images || []);
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

  const clearLogo = () => { setLogoFile(null); setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = ''; };
  const clearBanner = () => { setBannerFile(null); setBannerPreview(null); if (bannerInputRef.current) bannerInputRef.current.value = ''; };

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

        const formattedSlug = form.storeSlug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        const uploadedCarouselUrls: string[] = [];
        for (const file of carouselFiles) {
          const ext = file.name.split('.').pop();
          const fileName = `${user!.id}/carousel_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
          if (uploadError) throw new Error('Error subiendo imagen del carrusel: ' + uploadError.message);
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          uploadedCarouselUrls.push(data.publicUrl);
        }

        const finalCarouselUrls = [
          ...carouselPreviews.filter(p => p.startsWith('http')),
          ...uploadedCarouselUrls
        ];

        const { error } = await supabase
        .from('profiles')
        .update({
          business_name: form.businessName as any,
          store_slug: (formattedSlug !== '' ? formattedSlug : null) as any,
          store_description: form.description as any,
          store_logo_url: finalLogoUrl as any,
          store_banner_url: finalBannerUrl as any,
          store_public: form.isPublic as any,
          store_whatsapp: form.whatsapp as any,
          store_theme: form.theme as any,
          store_primary_color: form.primaryColor,
          store_carousel_images: finalCarouselUrls,
          store_carousel_ratio: form.carouselRatio,
          store_banner_text: form.bannerText,
          store_header_style: form.headerStyle,
          store_instagram: form.instagram,
          store_facebook: form.facebook,
          store_tiktok: form.tiktok,
          store_email: form.storeEmail,
          store_address: form.storeAddress,
          store_seo_title: form.seoTitle,
          store_seo_description: form.seoDescription,
          store_font_family: form.fontFamily,
          store_button_radius: form.buttonRadius,
        } as any)
        .eq('id', user!.id);
      
        if (error) throw error;
        setCarouselFiles([]);
        return formattedSlug; 
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (savedSlug) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (savedSlug && savedSlug !== form.storeSlug) {
        updateForm({ storeSlug: savedSlug });
      }
      toast.success('Configuración guardada exitosamente');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este enlace (slug) ya está en uso. Por favor, elige otro.');
      } else {
        toast.error('Error al guardar: ' + error.message);
      }
    }
  });

  const publicUrl = form.storeSlug ? `${window.location.origin}/s/${form.storeSlug}` : null;

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
            disabled={!form.isPublic || !form.storeSlug}
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
            <TabsContent value="general" className="space-y-6 mt-0">
               <GeneralTab 
                 form={form} 
                 updateForm={updateForm}
                 logoPreview={logoPreview}
                 bannerPreview={bannerPreview}
                 logoInputRef={logoInputRef}
                 bannerInputRef={bannerInputRef}
                 handleLogoSelect={handleLogoSelect}
                 handleBannerSelect={handleBannerSelect}
                 clearLogo={clearLogo}
                 clearBanner={clearBanner}
               />
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6 mt-0">
               <AppearanceTab form={form} updateForm={updateForm} />
            </TabsContent>

            <TabsContent value="carousel" className="space-y-6 mt-0">
               <CarouselTab 
                 form={form}
                 updateForm={updateForm}
                 carouselPreviews={carouselPreviews}
                 carouselInputRef={carouselInputRef}
                 handleCarouselSelect={handleCarouselSelect}
                 removeCarouselImage={removeCarouselImage}
               />
            </TabsContent>

            <TabsContent value="channels" className="space-y-6 mt-0">
               <ChannelsTab form={form} updateForm={updateForm} publicUrl={publicUrl} />
            </TabsContent>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <StorePreviewPanel form={form} publicUrl={publicUrl} copyLink={copyLink} />
          </div>
        </div>
      </Tabs>

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
                aspect={form.carouselRatio === 'square' ? 1 : 21/9}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
