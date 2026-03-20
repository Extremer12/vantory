import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Search, Heart, Loader2 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Autoplay from 'embla-carousel-autoplay';
import { usePublicStoreProfile, usePublicStoreProducts } from '@/hooks/usePublicStore';
import { PublicStoreHeader } from '@/components/PublicStoreHeader';
import { PublicStoreFooter } from '@/components/PublicStoreFooter';
import { PublicStoreProductModal } from '@/components/PublicStoreProductModal';

export default function PublicStorePage() {
  const { slug } = useParams<{ slug: string }>();

  // State
  const [cart, setCart] = useState<{product: any, variants: Record<string, any>, quantity: number}[]>(() => {
    if (typeof window !== 'undefined' && slug) {
      const saved = localStorage.getItem(`smart-inventory-cart-${slug}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      localStorage.setItem(`smart-inventory-cart-${slug}`, JSON.stringify(cart));
    }
  }, [cart, slug]);

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
    toast.success('Añadido a la bolsa');
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
  const { data: profile, isLoading: isProfileLoading, error: profileError } = usePublicStoreProfile(slug);

  // Fetch products
  const { data: productsData, isLoading: isProductsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePublicStoreProducts(profile?.id);

  const products = useMemo(() => productsData?.pages.flat() ?? [], [productsData]);
  const categories = useMemo(() => Array.from(new Set(products?.map(p => p.categories?.name).filter(Boolean))) as string[], [products]);
  
  const filteredProducts = useMemo(() => products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.categories?.name === selectedCategory;
    const matchesFavorites = !showFavorites || favorites.includes(p.id);
    return matchesSearch && matchesCategory && matchesFavorites;
  }) || [], [products, searchQuery, selectedCategory, showFavorites, favorites]);

  // Profile configuration values
  const userTheme = profile?.store_theme === 'dark' ? 'dark' : 'light';
  const isDark = userTheme === 'dark';
  const userPrimaryColor = profile?.store_primary_color || '#000000';
  const carouselImages = profile?.store_carousel_images || [];
  const carouselRatio = profile?.store_carousel_ratio || 'panoramic';
  const bannerText = profile?.store_banner_text || "Esenciales para el día a día, elevados.";
  const headerStyle = profile?.store_header_style || 'classic';
  const fontFamily = profile?.store_font_family || 'Inter';
  const buttonRadius = profile?.store_button_radius || 'xl';
  const instagram = profile?.store_instagram || '';
  const facebook = profile?.store_facebook || '';
  const tiktok = profile?.store_tiktok || '';
  const storeEmail = profile?.store_email || '';
  const storeAddress = profile?.store_address || '';
  const seoTitle = profile?.store_seo_title || '';
  const seoDescription = profile?.store_seo_description || '';

  useEffect(() => {
    if (profile) {
      document.title = seoTitle || profile.business_name || 'Tienda Online';
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', seoDescription || profile.store_description || 'Bienvenido a nuestra tienda online.');
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

      <PublicStoreHeader
        cart={cart}
        cartCount={cartCount}
        cartTotal={cartTotal}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        handleCheckout={handleCheckout}
        profile={profile}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        colors={colors}
        headerStyle={headerStyle}
      />

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
                    ) : p.image_url && (
                      <img src={getOptimizedImageUrl(p.image_url, { width: 600, quality: 90 })} alt={p.name} loading="lazy" className={`w-full h-full object-cover transition-opacity duration-500 ${outOfStock ? 'opacity-40' : 'group-hover:opacity-95'}`} />
                    )}
                    {outOfStock && ( <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"> <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white bg-black/60 px-4 py-2 border border-white/10">Agotado</span> </div> )}
                    {!outOfStock && (
                      <div className="absolute inset-x-0 bottom-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 flex flex-col gap-2">
                        <Button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className={`w-full rounded-xl bg-primary text-primary-foreground text-[10px] font-black tracking-widest uppercase h-11 hover:opacity-90 transition-all shadow-2xl shadow-primary/20`}>Añadir rápido</Button>
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

      <PublicStoreFooter
        profile={profile}
        colors={colors}
        instagram={instagram}
        facebook={facebook}
        tiktok={tiktok}
        storeEmail={storeEmail}
        storeAddress={storeAddress}
      />

      <PublicStoreProductModal
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        currentImageIndex={currentImageIndex}
        setCurrentImageIndex={setCurrentImageIndex}
        selectedVariants={selectedVariants}
        setSelectedVariants={setSelectedVariants}
        colors={colors}
        isDark={isDark}
        profile={profile}
        addToCart={addToCart}
      />
    </div>
  );
}
