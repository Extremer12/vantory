import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { 
  ShoppingBag, Search, ChevronRight, Menu, X, Instagram, Facebook, Music2, 
  Mail, MapPin, MessageCircle, Phone, ArrowRight, Star, 
  ArrowLeft, ShoppingCart, Globe, LayoutGrid, List, Check, Store,
  Minus, Plus, Loader2, Heart, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { toast } from 'sonner';
import Autoplay from 'embla-carousel-autoplay';

const CloseIcon = X;

export default function PublicStorePage() {
  const { slug } = useParams<{ slug: string }>();

  // State
  const [cart, setCart] = useState<{product: any, variants: Record<string, any>, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (slug) {
      const stored = localStorage.getItem(`smart-inventory-favorites-${slug}`);
      if (stored) {
        try { setFavorites(JSON.parse(stored)); } catch (e) {}
      }
    }
  }, [slug]);

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      if (slug) localStorage.setItem(`smart-inventory-favorites-${slug}`, JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const addToCart = (product: any, variants: Record<string, any> = {}) => {
    setCart(prev => {
      const variantHash = JSON.stringify(variants);
      const existing = prev.find(item => item.product.id === product.id && JSON.stringify(item.variants || {}) === variantHash);
      if (existing) {
        return prev.map(item => (item.product.id === product.id && JSON.stringify(item.variants || {}) === variantHash) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, variants, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, variants: Record<string, any>, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && JSON.stringify(item.variants || {}) === JSON.stringify(variants)) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: newQ > 0 ? newQ : item.quantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string, variants: Record<string, any>) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && JSON.stringify(item.variants || {}) === JSON.stringify(variants))));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const variantAdjustment = Object.values(item.variants || {}).reduce((vSum: number, v: any) => vSum + (Number(v.price_adjustment) || 0), 0);
    return sum + ((Number(item.product.sale_price) + variantAdjustment) * item.quantity);
  }, 0);
  
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = (profile: any) => {
    const wnumber = profile.store_whatsapp ? profile.store_whatsapp.replace(/\D/g, '') : '';
    const baseUrl = wnumber ? `https://wa.me/${wnumber}` : `https://wa.me/`;
    let text = `Hola! Quiero hacer el siguiente pedido en *${profile.business_name || 'tu tienda'}*:\n\n`;
    cart.forEach(item => {
      const variantText = Object.keys(item.variants || {}).length > 0 
        ? ` (${Object.values(item.variants).map((v: any) => v.variant_value).join(', ')})` : '';
      const variantAdjustment = Object.values(item.variants || {}).reduce((vSum: number, v: any) => vSum + (Number(v.price_adjustment) || 0), 0);
      const itemPrice = Number(item.product.sale_price) + variantAdjustment;
      text += `• ${item.quantity}x ${item.product.name}${variantText} ($${itemPrice.toFixed(2)})\n`;
    });
    text += `\n💵 *Total: $${cartTotal.toFixed(2)}*\n\n¿Me confirman disponibilidad por favor?`;
    window.open(`${baseUrl}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Fetch store profile
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery<any, Error>({
    queryKey: ['public-store', slug],
    queryFn: async () => {
      const normalizedSlug = slug?.toLowerCase().trim();
      const { data, error } = await supabase.from('profiles').select('*').eq('store_slug', normalizedSlug).eq('store_public', true).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Tienda no encontrada.');
      return data;
    },
    retry: 1,
  });

  // Fetch products
  const PAGE_SIZE = 12;
  const { data: productsData, isLoading: isProductsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<any[], Error>({
    queryKey: ['public-products', profile?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase.from('products').select('*, categories(name), product_images(image_url), product_variants(*)').eq('user_id', profile!.id).eq('is_public', true).order('name').range(from, to);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    initialPageParam: 0,
    enabled: !!profile?.id,
  });

  const products = useMemo(() => productsData?.pages.flat() ?? [], [productsData]);
  const categories = useMemo(() => Array.from(new Set(products?.map(p => p.categories?.name).filter(Boolean))) as string[], [products]);
  
  const filteredProducts = useMemo(() => products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.categories?.name === selectedCategory;
    const matchesFavorites = !showFavorites || favorites.includes(p.id);
    return matchesSearch && matchesCategory && matchesFavorites;
  }) || [], [products, searchQuery, selectedCategory, showFavorites, favorites]);

  const userTheme = (profile as any)?.store_theme === 'dark' ? 'dark' : 'light';
  const isDark = userTheme === 'dark';
  const userPrimaryColor = (profile as any)?.store_primary_color || '#000000';
  const carouselImages = (profile as any)?.store_carousel_images || [];
  const carouselRatio = (profile as any)?.store_carousel_ratio || 'panoramic';
  const bannerText = (profile as any)?.store_banner_text || "Esenciales para el día a día, elevados.";
  const headerStyle = (profile as any)?.store_header_style || 'classic';
  const fontFamily = (profile as any)?.store_font_family || 'Inter';
  const buttonRadius = (profile as any)?.store_button_radius || 'xl';
  const instagram = (profile as any)?.store_instagram || '';
  const facebook = (profile as any)?.store_facebook || '';
  const tiktok = (profile as any)?.store_tiktok || '';
  const storeEmail = (profile as any)?.store_email || '';
  const storeAddress = (profile as any)?.store_address || '';
  const seoTitle = (profile as any)?.store_seo_title || '';
  const seoDescription = (profile as any)?.store_seo_description || '';

  useEffect(() => {
    if (profile) {
      document.title = seoTitle || (profile as any).business_name || 'Tienda Online';
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', seoDescription || (profile as any).store_description || 'Bienvenido a nuestra tienda online.');
    }
  }, [profile, seoTitle, seoDescription]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', userPrimaryColor);
    const radiusMap: Record<string, string> = { '0': '0px', 'md': '0.375rem', 'xl': '0.75rem', 'full': '9999px' };
    document.documentElement.style.setProperty('--radius', radiusMap[buttonRadius] || '0.75rem');

    if (fontFamily !== 'Inter') {
       const link = document.createElement('link');
       link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;500;600;700;800;900&display=swap`;
       link.rel = 'stylesheet';
       document.head.appendChild(link);
       document.documentElement.style.setProperty('--font-family', `'${fontFamily}', sans-serif`);
    } else {
       document.documentElement.style.setProperty('--font-family', 'var(--font-sans)');
    }
  }, [userPrimaryColor, buttonRadius, fontFamily]);

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-900">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-900" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-center px-4">
        <h1 className="text-2xl font-light mb-2">Oops</h1>
        <p className="text-zinc-500 text-sm">Esta tienda no existe o no está disponible.</p>
      </div>
    );
  }

  const colors = {
    bg: isDark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]',
    text: isDark ? 'text-zinc-100' : 'text-zinc-900',
    textMuted: isDark ? 'text-zinc-500' : 'text-zinc-400',
    border: isDark ? 'border-zinc-800' : 'border-zinc-200',
    card: isDark ? 'bg-[#111]' : 'bg-white',
    hover: isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100',
    btnBg: isDark ? 'bg-zinc-100' : 'bg-zinc-900',
    btnText: isDark ? 'text-zinc-900' : 'text-white',
  };

  const renderHeader = () => {
    const commonBag = (
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <button className="relative flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all hover:scale-105 active:scale-95 group">
            <span className="hidden sm:inline">Bolsa</span>
            <div className={`p-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300`}>
              <ShoppingCart className="w-5 h-5" />
            </div>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-[9px] flex items-center justify-center rounded-full bg-primary text-primary-foreground font-black shadow-lg animate-in zoom-in-50 duration-300">
                {cartCount}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent className={`w-full sm:max-w-md p-0 border-l ${colors.border} ${colors.bg} shadow-2xl overflow-hidden flex flex-col`}>
          <SheetHeader className={`p-8 border-b ${colors.border}`}>
            <SheetTitle className={`text-xl font-light tracking-widest uppercase ${colors.text}`}>Tu Bolsa ({cartCount})</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {cart.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-20 ${colors.textMuted} space-y-4`}>
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="text-sm tracking-widest uppercase">Tu bolsa está vacía.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex gap-6 group">
                  <div className={`w-24 h-28 ${colors.card} bg-opacity-50 overflow-hidden flex items-center justify-center border ${colors.border} rounded-xl shadow-sm group-hover:shadow-md transition-shadow`}>
                    {item.product.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 flex flex-col py-1">
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-bold tracking-tight ${colors.text}`}>{item.product.name}</span>
                      <span className={`text-sm font-mono ${colors.text}`}>
                        ${(Number(item.product.sale_price) + Object.values(item.variants || {}).reduce((s: number, v: any) => s + (Number(v.price_adjustment) || 0), 0)).toFixed(2)}
                      </span>
                    </div>
                    {Object.keys(item.variants || {}).length > 0 && (
                      <span className={`text-[11px] mt-1.5 uppercase tracking-wider ${colors.textMuted}`}>
                        {Object.values(item.variants).map((v: any) => v.variant_value).join(' / ')}
                      </span>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      <div className={`flex items-center border ${colors.border} rounded-md bg-zinc-50/5 overflow-hidden`}>
                        <button onClick={() => updateQuantity(item.product.id, item.variants || {}, -1)} className={`p-2 ${colors.hover}`}><Minus size={10} /></button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.variants || {}, 1)} className={`p-2 ${colors.hover}`}><Plus size={10} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id, item.variants || {})} className={`text-[10px] font-bold tracking-tighter hover:text-red-500 uppercase transition-colors`}>Quitar</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <SheetFooter className={`p-8 border-t ${colors.border} flex-col gap-6 bg-white/5 backdrop-blur-md`}>
            <div className="flex justify-between items-center w-full">
              <span className={`text-xs tracking-widest uppercase font-bold ${colors.textMuted}`}>Total Estimado</span>
              <span className={`text-2xl font-black ${colors.text} tabular-nums`}>${cartTotal.toFixed(2)}</span>
            </div>
            <Button 
              onClick={() => handleCheckout(profile)}
              disabled={cartCount === 0}
              className={`w-full h-14 rounded-xl text-xs tracking-[0.2em] uppercase font-black bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-xl shadow-primary/20`}
            >
              <MessageCircle className="w-5 h-5 mr-3" /> Pedir por WhatsApp
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );

    const logo = (
      <div className="flex-shrink-0 flex items-center justify-center">
        {(profile as any).store_logo_url ? (
          <div className="bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/10 shadow-lg hover:border-primary/40 transition-colors">
            <img src={(profile as any).store_logo_url} alt={profile.business_name} className="h-10 md:h-12 w-auto object-contain" />
          </div>
        ) : (
          <span className="text-2xl font-black tracking-tighter uppercase italic">{profile.business_name || 'Tienda'}</span>
        )}
      </div>
    );

    const searchInput = (
      <div className="flex items-center border-b border-white/10 focus-within:border-primary pb-1 transition-all group">
        <Search className={`w-4 h-4 mr-2 ${colors.textMuted} group-focus-within:text-primary transition-colors`} />
        <input 
          type="text" 
          placeholder="Buscar..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`bg-transparent outline-none text-[13px] w-32 md:w-48 ${colors.text} placeholder:text-zinc-500 font-medium`}
        />
      </div>
    );

    if (headerStyle === 'centered') {
      return (
        <header className={`sticky top-0 z-50 w-full backdrop-blur-3xl bg-opacity-70 border-b ${colors.border} px-6 md:px-12 py-5 flex items-center justify-between ${colors.bg}`}>
          <div className="flex-1 hidden md:flex items-center">{searchInput}</div>
          {logo}
          <div className="flex-1 flex items-center justify-end gap-6">{commonBag}</div>
        </header>
      );
    }

    if (headerStyle === 'minimal') {
      return (
        <header className={`sticky top-0 z-50 w-full backdrop-blur-3xl bg-opacity-70 border-b ${colors.border} px-6 md:px-12 py-4 flex items-center justify-between ${colors.bg}`}>
          {logo}
          <div className="flex items-center gap-8">
            <button className={`${colors.textMuted} hover:${colors.text} transition-colors md:hidden`}><Menu size={20} /></button>
            <div className="hidden md:flex items-center gap-10">{searchInput}</div>
            {commonBag}
          </div>
        </header>
      );
    }

    return (
      <header className={`sticky top-0 z-50 w-full backdrop-blur-3xl bg-opacity-70 border-b ${colors.border} px-6 md:px-20 py-6 flex items-center justify-between ${colors.bg}`}>
        <div className="flex items-center gap-12">
          {logo}
          <div className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em]">{searchInput}</div>
        </div>
        <div className="flex items-center gap-8">{commonBag}</div>
      </header>
    );
  };

  return (
    <div className="min-h-screen transition-colors duration-500 pb-20 overflow-x-hidden" style={{ 
      backgroundColor: isDark ? '#000000' : '#f8fafc',
      fontFamily: 'var(--font-family)'
    }}>
      <style>{`
        :root {
          --primary: ${userPrimaryColor};
          --primary-foreground: ${isDark ? '#000000' : '#ffffff'};
          --radius: var(--button-radius);
        }
        .bg-primary { background-color: var(--primary) !important; }
        .text-primary { color: var(--primary) !important; }
        .border-primary { border-color: var(--primary) !important; }
      `}</style>

      {renderHeader()}

      <div className={`md:hidden px-6 py-6 border-b ${colors.border} ${isDark ? 'bg-zinc-900/10' : 'bg-zinc-50/30'}`}>
        <div className={`flex items-center border-b ${colors.border} pb-2 focus-within:border-zinc-500 transition-all`}>
          <Search className={`w-4 h-4 mr-3 ${colors.textMuted}`} />
          <input 
            type="text" 
            placeholder="Buscar productos..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`bg-transparent outline-none text-sm w-full ${colors.text} placeholder:text-zinc-500 font-medium`}
          />
        </div>
      </div>

      <main className="max-w-[1700px] mx-auto px-6 md:px-16 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {carouselImages.length > 0 ? (
          <div className="mb-24 relative group">
            <Carousel opts={{ loop: true, align: 'start' }} plugins={[Autoplay({ delay: 5000 })]}
              className={`w-full ${carouselRatio === 'square' ? 'h-[250px] md:h-[450px]' : 'h-[200px] md:h-[300px]'} rounded-[2rem] overflow-hidden border border-white/10 shadow-3xl transition-all duration-700`}
            >
              <CarouselContent className="h-full -ml-4">
                {carouselImages.map((img: string, idx: number) => (
                  <CarouselItem key={idx} className={`h-full relative pl-4 ${carouselRatio === 'square' ? 'basis-1/2 md:basis-1/3' : 'basis-full'}`}>
                    <div className="relative h-full w-full rounded-2xl overflow-hidden group/item shadow-lg border border-white/5">
                      {carouselRatio === 'panoramic' && (
                        <div className="absolute inset-0 z-0">
                          <img src={img} alt="" className="w-full h-full object-cover blur-3xl opacity-40 scale-125" />
                        </div>
                      )}
                      <img src={img} alt={`Banner ${idx}`} className={`relative z-10 w-full h-full object-cover transition-transform duration-1000 group-hover/item:scale-105`} />
                      {carouselRatio === 'panoramic' && (
                        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end p-8 md:p-16 text-center">
                           <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter uppercase mb-2 max-w-4xl drop-shadow-2xl">{bannerText}</h2>
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <CarouselPrevious className="static h-12 w-12 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 -translate-x-0" />
                <CarouselNext className="static h-12 w-12 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 translate-x-0" />
              </div>
            </Carousel>
            <div className="absolute -inset-4 bg-primary/20 blur-[100px] -z-10 opacity-30" />
          </div>
        ) : (
          <div className="mb-24 md:mb-32 text-center max-w-4xl mx-auto space-y-10 relative py-20">
            <div className="relative z-10">
              <div className="inline-block px-5 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-8 border border-primary/20 backdrop-blur-md">Bienvenido</div>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] mb-10 uppercase text-balance">{bannerText}</h1>
              <div className="h-1.5 w-24 bg-primary mx-auto rounded-full shadow-[0_0_20px_var(--primary)]" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] -z-10 rounded-full" />
          </div>
        )}

        {categories.length > 0 && (
          <div className={`flex items-center justify-center gap-8 md:gap-14 overflow-x-auto pb-6 scrollbar-hide mb-16 text-[11px] font-bold uppercase tracking-[0.2em] ${colors.textMuted}`}>
            <button onClick={() => { setSelectedCategory(null); setShowFavorites(false); }}
              className={`pb-2 border-b-2 transition-all whitespace-nowrap ${selectedCategory === null && !showFavorites ? `text-primary border-primary` : 'border-transparent hover:text-zinc-400'}`}
            >Colección Completa</button>
            <button onClick={() => { setSelectedCategory(null); setShowFavorites(true); }}
              className={`pb-2 border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${showFavorites ? `text-primary border-primary` : 'border-transparent hover:text-zinc-400'}`}
            ><Heart size={14} className={showFavorites ? "fill-current text-primary" : ""} /> Favoritos</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFavorites(false); }}
                className={`pb-2 border-b-2 transition-all whitespace-nowrap ${selectedCategory === cat && !showFavorites ? `text-primary border-primary` : 'border-transparent hover:text-zinc-400'}`}
              >{cat}</button>
            ))}
          </div>
        )}

        {isProductsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
            {[...Array(10)].map((_, i) => ( <div key={i} className={`aspect-square animate-pulse bg-zinc-500/5 rounded-2xl`} /> ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-16 md:gap-x-10 md:gap-y-20">
            {filteredProducts.map((p) => {
              const outOfStock = !p.current_stock || p.current_stock === 0;
              return (
                <div key={p.id} className="group relative flex flex-col cursor-pointer" onClick={() => { setSelectedProduct(p); setCurrentImageIndex(0); setSelectedVariants({}); }}>
                  <div className={`relative aspect-square w-full mb-6 overflow-hidden bg-card border border-white/5 rounded-2xl shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 ease-out`}>
                    <button onClick={(e) => toggleFavorite(p.id, e)} className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/20 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
                      <Heart size={16} className={favorites.includes(p.id) ? 'fill-primary text-primary' : ''} />
                    </button>
                    {p.product_images?.[0]?.image_url ? (
                      <img src={getOptimizedImageUrl(p.product_images[0].image_url, { width: 600, quality: 90 })} alt={p.name} loading="lazy" className={`w-full h-full object-cover transition-opacity duration-500 ${outOfStock ? 'opacity-40' : 'group-hover:opacity-95'}`} />
                    ) : (p as any).image_url && (
                      <img src={getOptimizedImageUrl((p as any).image_url, { width: 600, quality: 90 })} alt={p.name} loading="lazy" className={`w-full h-full object-cover transition-opacity duration-500 ${outOfStock ? 'opacity-40' : 'group-hover:opacity-95'}`} />
                    )}
                    {outOfStock && ( <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"> <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white bg-black/60 px-4 py-2 border border-white/10">Agotado</span> </div> )}
                    {!outOfStock && (
                      <div className="absolute inset-x-0 bottom-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 flex flex-col gap-2">
                        <Button onClick={(e) => { e.stopPropagation(); addToCart(p); toast.success('Añadido a la bolsa'); }} className={`w-full rounded-xl bg-primary text-primary-foreground text-[10px] font-black tracking-widest uppercase h-11 hover:opacity-90 transition-all shadow-2xl shadow-primary/20`}>Añadir rápido</Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                     <div className="flex items-center justify-between">
                        <h3 className={`text-xs md:text-[13px] font-bold uppercase tracking-[0.1em] ${colors.text}`}>{p.name}</h3>
                        {p.categories?.name && <span className="text-[9px] font-bold text-primary tracking-widest uppercase opacity-60 ml-2">{p.categories.name}</span>}
                     </div>
                     <p className={`text-lg font-black tracking-tighter tabular-nums ${colors.textMuted}`}>${Number(p.sale_price).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-40 flex flex-col items-center justify-center text-center space-y-8">
            <div className={`w-16 h-16 rounded-full border border-dashed border-zinc-500/50 flex items-center justify-center ${colors.textMuted}`}>
              <Search size={24} className="opacity-30" />
            </div>
            <p className={`text-xl font-light tracking-wide ${colors.textMuted}`}>No se encontraron piezas en esta curaduría.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory(null); setShowFavorites(false); }} className={`px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-xs font-bold tracking-[0.3em] uppercase hover:opacity-80 transition-opacity`}>Limpiar filtros</button>
          </div>
        )}

        {hasNextPage && !searchQuery && !selectedCategory && (
          <div className="flex justify-center mt-32">
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className={`px-10 py-4 border border-zinc-500/20 text-[11px] font-black tracking-[0.4em] uppercase hover:bg-zinc-500/5 transition-colors ${colors.text}`}>
              {isFetchingNextPage ? 'Cargando...' : 'Ver más productos'}
            </button>
          </div>
        )}
      </main>

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

      <Dialog open={!!selectedProduct} onOpenChange={(v) => !v && setSelectedProduct(null)}>
        <DialogContent className={`w-full max-w-7xl h-[100dvh] sm:h-[90vh] p-0 overflow-hidden border border-white/10 rounded-3xl shadow-3xl ${isDark ? 'bg-zinc-950/40 backdrop-blur-3xl' : 'bg-white/80 backdrop-blur-3xl'} [&>button]:hidden`}>
          <DialogTitle className="sr-only">{selectedProduct?.name}</DialogTitle>
          {selectedProduct && (
            <div className="flex flex-col lg:flex-row h-full w-full">
              <div className={`relative w-full lg:w-[55%] h-1/2 lg:h-full flex items-center justify-center overflow-hidden bg-zinc-50/5 group/modalimg border-r border-white/5`}>
                 <img src={(() => {
                   const allImages = [selectedProduct.image_url, ...(selectedProduct.product_images || []).map((i: any) => i.image_url)].filter(Boolean);
                   return allImages[currentImageIndex] || selectedProduct.image_url;
                 })()} className="w-full h-full object-cover transition-opacity duration-300" alt={selectedProduct.name} />
                {(() => {
                  const allImages = [selectedProduct.image_url, ...(selectedProduct.product_images || []).map((i: any) => i.image_url)].filter(Boolean);
                  if (allImages.length <= 1) return null;
                  return (
                    <div className="absolute inset-x-0 bottom-8 flex justify-center gap-4 px-6 opacity-0 group-hover/modalimg:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1)); }} className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all`}><ChevronLeft size={20} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1)); }} className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all`}><ChevronRight size={20} /></button>
                    </div>
                  );
                })()}
              </div>

              <div className="flex-1 flex flex-col h-1/2 lg:h-full relative overflow-y-auto custom-scrollbar bg-white/[0.02]">
                <button onClick={() => setSelectedProduct(null)} className={`absolute top-6 right-6 z-20 p-3 rounded-full ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} backdrop-blur-md transition-all border border-white/10 active:scale-90`}><X size={22} strokeWidth={2.5} /></button>
                <div className="p-10 md:p-20 flex-col flex h-full">
                  <div className="mb-12">
                    {selectedProduct.categories?.name && (
                      <div className="flex items-center gap-4 mb-6"><div className="h-[1px] w-8 bg-primary" /><p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">{selectedProduct.categories.name}</p></div>
                    )}
                    <h2 className={`text-4xl md:text-7xl font-black tracking-tighter mb-8 leading-[0.9] uppercase ${colors.text}`}>{selectedProduct.name}</h2>
                    <p className={`text-3xl font-mono text-primary font-black`}>${(Number(selectedProduct.sale_price) + Object.values(selectedVariants).reduce((s: number, v: any) => s + (Number(v.price_adjustment) || 0), 0)).toFixed(2)}</p>
                  </div>

                  {selectedProduct.product_variants && selectedProduct.product_variants.length > 0 && (
                    <div className="mb-14 space-y-8">
                      {Array.from(new Set(selectedProduct.product_variants.map((v: any) => v.variant_label))).map((label: any) => {
                         const variantsForLabel = selectedProduct.product_variants.filter((v: any) => v.variant_label === label);
                         return (
                           <div key={label}>
                             <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${colors.textMuted}`}>{label}</h4>
                             <div className="flex flex-wrap gap-3">
                               {variantsForLabel.map((v: any) => {
                                 const isSelected = selectedVariants[label]?.id === v.id;
                                 const outOfStock = v.stock === 0;
                                 return (
                                   <button key={v.id} disabled={outOfStock} onClick={() => setSelectedVariants(prev => ({ ...prev, [label]: v }))}
                                     className={`px-6 py-3 text-xs font-bold tracking-widest border transition-all ${isSelected ? `border-primary bg-primary text-primary-foreground scale-105 shadow-xl` : outOfStock ? `opacity-20 cursor-not-allowed border-zinc-500/20` : `border-zinc-500/30 hover:border-zinc-500`}`}
                                   >{v.variant_value}</button>
                                 );
                               })}
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  )}

                  <div className={`text-base md:text-lg leading-relaxed mb-16 font-light ${colors.textMuted} max-w-xl`}>{selectedProduct.description || "Esta pieza está disponible para tu curaduría personal. Consulta detalles adicionales bajo solicitud."}</div>
                  <div className="mt-auto pt-10 border-t border-zinc-500/10 space-y-6">
                    <Button onClick={() => {
                        const requiredLabels = Array.from(new Set((selectedProduct.product_variants || []).map((v: any) => v.variant_label))) as string[];
                        const missing = requiredLabels.filter(label => !selectedVariants[label]);
                        if (missing.length > 0) { toast.error(`Por favor selecciona: ${missing.join(', ')}`); return; }
                        addToCart(selectedProduct, selectedVariants);
                        toast.success('Añadido a la bolsa');
                      }}
                      className={`w-full h-16 rounded-2xl text-[11px] tracking-[0.4em] uppercase font-black ${colors.btnBg} ${colors.btnText} hover:opacity-90 transition-all shadow-2xl shadow-black/20`}
                    >Añadir a la bolsa</Button>
                    <button onClick={() => {
                        const wnumber = profile.store_whatsapp ? profile.store_whatsapp.replace(/\D/g, '') : '';
                        const baseUrl = wnumber ? `https://wa.me/${wnumber}` : `https://wa.me/`;
                        const variantText = Object.keys(selectedVariants).length > 0 ? ` (${Object.values(selectedVariants).map((v: any) => v.variant_value).join(', ')})` : '';
                        const text = `¡Hola! Me interesa esta pieza única: *${selectedProduct.name}${variantText}*. ¿Podrían darme más información?`;
                        window.open(`${baseUrl}?text=${encodeURIComponent(text)}`, '_blank');
                      }} className={`w-full text-center text-[10px] tracking-[0.3em] font-black uppercase underline underline-offset-8 decoration-2 decoration-primary/40 hover:decoration-primary ${colors.textMuted} hover:${colors.text} transition-all`}>Consultar por WhatsApp</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
