import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { Loader2, Store, Package, MessageCircle, MapPin, Search, ShoppingCart, Plus, Minus, Trash2, ChevronLeft, ChevronRight, X as CloseIcon, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function PublicStorePage() {
  const { slug } = useParams<{ slug: string }>();

  // UI State
  const [cart, setCart] = useState<{product: any, variants: Record<string, any>, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});

  // Favorites State
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (slug) {
      const stored = localStorage.getItem(`smart-inventory-favorites-${slug}`);
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing favorites', e);
        }
      }
    }
  }, [slug]);

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      if (slug) {
        localStorage.setItem(`smart-inventory-favorites-${slug}`, JSON.stringify(newFavs));
      }
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
        return { ...item, quantity: newQ > 0 ? newQ : 1 };
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
        ? ` (${Object.values(item.variants).map((v: any) => v.variant_value).join(', ')})` 
        : '';
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
    queryFn: async (): Promise<any> => {
      const normalizedSlug = slug?.toLowerCase().trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('store_slug', normalizedSlug)
        .eq('store_public', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Tienda no encontrada. Verifica el enlace o asegúrate de que tu tienda sea pública.');
      return data;
    },
    retry: 1,
  });

  // Fetch products with pagination (12 per page)
  const PAGE_SIZE = 12;
  const {
    data: productsData,
    isLoading: isProductsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<any[], Error>({
    queryKey: ['public-products', profile?.id],
    queryFn: async ({ pageParam = 0 }): Promise<any[]> => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name), product_images(image_url), product_variants(*)')
        .eq('user_id', profile!.id)
        .eq('is_public', true)
        .order('name')
        .range(from, to);
      
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page returned fewer than PAGE_SIZE, there are no more pages
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!profile?.id,
  });

  // Flatten all pages into a single products array
  const products = useMemo(
    () => productsData?.pages.flat() ?? [],
    [productsData]
  );

  const categories = useMemo(
    () => Array.from(new Set(products?.map(p => p.categories?.name).filter(Boolean))) as string[],
    [products]
  );
  
  const filteredProducts = useMemo(
    () => products?.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || p.categories?.name === selectedCategory;
      const matchesFavorites = !showFavorites || favorites.includes(p.id);
      return matchesSearch && matchesCategory && matchesFavorites;
    }) || [],
    [products, searchQuery, selectedCategory, showFavorites, favorites]
  );

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] text-muted-foreground gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="tracking-widest text-sm font-medium uppercase text-white/50 animate-pulse">Cargando experiencia...</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-card/40 border border-black/5 dark:border-white/5 rounded-[2rem] p-10 max-w-md w-full shadow-2xl backdrop-blur-3xl"
        >
          <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-black/10 dark:border-white/10 shadow-inner">
            <Store className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight text-foreground">Oops!</h1>
          <p className="text-muted-foreground leading-relaxed font-medium">La tienda que buscas no existe o se encuentra inactiva en este momento.</p>
        </motion.div>
      </div>
    );
  }

  const themeMode = (profile as any)?.store_theme === 'light' ? 'light' : 'dark';

  const t = {
    wrapper: themeMode === 'light' ? "bg-[#fcfcfd] text-slate-900" : "bg-[#09090b] text-white",
    card: themeMode === 'light' 
      ? "bg-white border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1" 
      : "bg-[#121214] border-white/5 shadow-[0_2px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:border-white/10",
    textMuted: themeMode === 'light' ? "text-slate-400" : "text-white/40",
    textSub: themeMode === 'light' ? "text-slate-600" : "text-white/60",
    heroGradient: themeMode === 'light' ? "from-[#fcfcfd] via-[#fcfcfd]/90 to-transparent" : "from-[#09090b] via-[#09090b]/90 to-transparent",
    emptyIconBg: themeMode === 'light' ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5",
  };

  return (
    <div className={`min-h-screen ${t.wrapper} relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary`}>
      
      {/* Subtle Background Glow for Premium feel */}
      <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none opacity-20 select-none z-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[600px] bg-primary/30 blur-[140px] rounded-full mix-blend-screen" />
      </div>

      {/* Hero Header */}
      <div className="relative w-full h-[320px] md:h-[400px] flex flex-col justify-end">
        {/* Banner Image or Fallback Gradient */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          {(profile as any).store_banner_url ? (
            <img 
              src={(profile as any).store_banner_url} 
              alt="Banner referencial" 
              className="w-full h-full object-cover opacity-50" 
            />
          ) : (
            <div className={`w-full h-full ${themeMode === 'light' ? 'bg-slate-100' : 'bg-white/5'}`} />
          )}
          {/* Smooth Fade to Background Color */}
          <div className={`absolute inset-0 bg-gradient-to-t ${t.heroGradient}`} />
        </div>

        {/* Hero Content (Centered) */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center px-4 translate-y-12 sm:translate-y-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-[1.5rem] sm:rounded-[2rem] ${themeMode === 'light' ? 'bg-white/80 border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.08)]' : 'bg-black/50 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)]'} backdrop-blur-2xl border-2 overflow-hidden flex-shrink-0 flex items-center justify-center relative ring-4 ring-background`}
          >
            {(profile as any).store_logo_url ? (
              <img src={(profile as any).store_logo_url} alt={`Logo de ${profile.business_name}`} className="w-full h-full object-cover" />
            ) : (
              <img 
                src="/images/lgsinfondo-conletras.png" 
                alt="Vantory Logo" 
                className="w-4/5 h-auto object-contain" 
              />
            )}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 sm:mt-6 text-center max-w-2xl px-4"
          >
            <h1 className={`text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter ${themeMode === 'light' ? 'text-slate-900' : 'text-white'} mb-3 sm:mb-4 drop-shadow-sm`}>
              {profile.business_name || 'Mi Tienda'}
            </h1>
            
            {(profile as any).store_description && (
              <p className={`text-sm sm:text-base md:text-lg ${t.textSub} leading-relaxed max-w-xl mx-auto font-medium`}>
                {(profile as any).store_description}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-32 pb-32">
        
        {/* Toolbar / Header */}
        <div className="flex flex-col gap-8 mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                Nuestra Colección
              </h2>
            </div>
            
            {/* Minimalist Search Bar */}
            <div className="relative w-full md:max-w-md group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${t.textMuted} z-10 transition-all group-focus-within:text-primary group-focus-within:scale-110`} />
              <input 
                type="text"
                placeholder="Buscar piezas exclusivas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-12 pl-12 pr-4 rounded-2xl border ${themeMode === 'light' ? 'bg-white/60 border-slate-200 focus:border-primary/50 focus:bg-white focus:shadow-[0_8px_30px_rgba(0,0,0,0.04)]' : 'bg-black/20 border-white/5 focus:border-white/20 focus:bg-black/40 focus:shadow-[0_8px_30px_rgba(0,0,0,0.2)]'} outline-none transition-all duration-300 text-sm font-medium backdrop-blur-md`}
              />
            </div>
          </div>

          {/* Elegant Categories Horizontal Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar mask-edges">
              <button
                onClick={() => { setSelectedCategory(null); setShowFavorites(false); }}
                className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap border tracking-wide flex-shrink-0 ${
                  selectedCategory === null && !showFavorites
                    ? `bg-foreground text-background border-foreground shadow-lg` 
                    : `${themeMode === 'light' ? 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 backdrop-blur-md' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white backdrop-blur-md'}`
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => { setSelectedCategory(null); setShowFavorites(true); }}
                className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex items-center gap-2 border tracking-wide flex-shrink-0 ${
                  showFavorites
                    ? 'bg-rose-500 border-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,0.3)]' 
                    : `${themeMode === 'light' ? 'bg-white/60 border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 backdrop-blur-md' : 'bg-white/5 border-white/5 text-white/60 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 backdrop-blur-md'}`
                }`}
              >
                <Heart size={14} className={showFavorites ? "fill-white" : ""} /> Favoritos
              </button>
              <div className={`h-6 w-px mx-2 ${themeMode === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setShowFavorites(false); }}
                  className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap border tracking-wide flex-shrink-0 ${
                    selectedCategory === cat && !showFavorites
                      ? `bg-foreground text-background border-foreground shadow-lg` 
                      : `${themeMode === 'light' ? 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 backdrop-blur-md' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white backdrop-blur-md'}`
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid */}
        {isProductsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 md:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`rounded-[1.5rem] sm:rounded-[2rem] aspect-[4/5] animate-pulse border ${themeMode === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'}`} />
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <motion.div 
            initial="hidden"
            animate="show"
            key={`${selectedCategory}-${searchQuery}`}
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 md:gap-8"
          >
            {filteredProducts.map((p) => {
              const isOutOfStock = !p.current_stock || p.current_stock === 0;
              return (
                <motion.div
                  key={p.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 1, y: 0 }
                  }}
                  onClick={() => {
                    setSelectedProduct(p);
                    setCurrentImageIndex(0);
                    setSelectedVariants({});
                  }}
                  className={`group relative flex flex-col rounded-[2rem] p-2 overflow-hidden transition-all duration-500 cursor-pointer ${t.card}`}
                >
                  <div className={`relative aspect-[4/5] w-full overflow-hidden rounded-[1.2rem] sm:rounded-[1.5rem] ${themeMode === 'light' ? 'bg-slate-50' : 'bg-[#0a0a0b]'}`}>
                    {/* Add Heart Button Overlay */}
                    <button
                      onClick={(e) => toggleFavorite(p.id, e)}
                      className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-30 p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${
                        favorites.includes(p.id)
                          ? 'bg-white text-rose-500 shadow-xl scale-100'
                          : 'bg-black/20 text-white hover:bg-white hover:text-rose-500 hover:scale-110'
                      }`}
                    >
                      <Heart size={14} className={favorites.includes(p.id) ? "fill-current" : "sm:w-4 sm:h-4"} />
                    </button>

                    {(p as any).image_url ? (
                      <img 
                        src={getOptimizedImageUrl((p as any).image_url, { width: 400, quality: 75 })} 
                        alt={p.name}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-700 ease-[0.22,1,0.36,1] group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-60' : ''}`} 
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${themeMode === 'light' ? 'bg-slate-100' : 'bg-white/5'}`}>
                        <Package className={`w-12 h-12 ${themeMode === 'light' ? 'text-slate-300' : 'text-white/20'}`} />
                      </div>
                    )}
                    
                    {/* Out of Stock Overlay */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                        <div className="bg-destructive text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                          Agotado
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-3 pt-5 pb-3 flex flex-col flex-1 relative z-20">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      {p.categories?.name && (
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>{p.categories.name}</p>
                      )}
                    </div>
                    <h3 className={`font-semibold text-[15px] tracking-tight line-clamp-2 leading-snug mb-4 flex-grow ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`} title={p.name}>
                      {p.name}
                    </h3>
                    
                    <div className="mt-auto flex items-end justify-between gap-2 sm:gap-3">
                      <div className="flex flex-col">
                        <span className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mb-0.5 ${t.textMuted}`}>Precio</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-lg sm:text-xl md:text-2xl font-black tracking-tighter ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            ${Number(p.sale_price).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <Button 
                        size="icon"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                          toast.success(`${p.name} añadido al carrito`);
                        }}
                        className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-none flex-shrink-0 ${
                          isOutOfStock 
                            ? (themeMode === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/30')
                            : `bg-foreground hover:bg-foreground/90 text-background hover:scale-105 active:scale-95`
                        }`}
                      >
                        <ShoppingCart size={16} className="sm:w-4.5 sm:h-4.5" /> 
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-lg mx-auto py-20 px-8 flex flex-col items-center justify-center text-center rounded-[2.5rem] ${themeMode === 'light' ? 'bg-white border border-slate-100 shadow-2xl shadow-slate-200/50' : 'bg-[#121214] border border-white/5 shadow-2xl shadow-black'}`}
          >
            <div className={`w-24 h-24 mb-8 rounded-[2rem] flex items-center justify-center ${t.emptyIconBg} shadow-inner`}>
              <Search size={36} className={t.textMuted} />
            </div>
            
            <h3 className={`text-2xl font-black tracking-tight mb-3 ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Sin resultados</h3>
            <p className={`${t.textSub} mb-10 text-base max-w-xs leading-relaxed font-medium`}>
              No pudimos encontrar "<span className={`font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>{searchQuery}</span>". Navega por nuestras categorías exclusivas.
            </p>
            
            <Button 
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className={`h-12 px-8 rounded-full font-bold tracking-wide transition-all shadow-xl bg-foreground text-background hover:scale-105 hover:shadow-2xl`}
            >
              Ver Colección Completa
            </Button>
          </motion.div>
        )}

        {/* Load More Button */}
        {hasNextPage && !searchQuery && !selectedCategory && (
          <div className="flex justify-center mt-10 mb-4">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              className={`h-12 px-8 rounded-full font-semibold text-sm transition-all duration-300 ${
                themeMode === 'light'
                  ? 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  : 'border-white/10 hover:bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              {isFetchingNextPage ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando...</>
              ) : (
                'Cargar más productos'
              )}
            </Button>
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button className="h-16 w-16 rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-foreground hover:bg-foreground/90 hover:scale-105 hover:-translate-y-1 transition-all duration-300 relative group border-none">
                <ShoppingCart size={24} className="text-background" />
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-4 ring-background">
                  {cartCount}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent className={`w-full sm:max-w-md flex flex-col p-0 border-none ${themeMode === 'light' ? 'bg-[#fcfcfd]' : 'bg-[#09090b] text-white'} shadow-[auto_0_40px_rgba(0,0,0,0.2)]`}>
              
              <SheetHeader className={`p-6 border-b ${themeMode === 'light' ? 'bg-white/80 border-slate-100 backdrop-blur-xl' : 'bg-[#121214]/80 border-white/5 backdrop-blur-xl'} sticky top-0 z-10`}>
                <SheetTitle className={`text-2xl font-black flex items-center gap-3 tracking-tight ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  Tu Resumen
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.product.id} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border ${themeMode === 'light' ? 'bg-white border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]' : 'bg-[#121214] border-white/5'}`}>
                    
                    <div className="w-20 h-24 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center border border-black/5 dark:border-white/5">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
                      <div>
                        <div className={`font-bold text-sm leading-tight line-clamp-2 ${themeMode === 'light' ? 'text-slate-900' : 'text-foreground'}`}>
                          {item.product.name}
                        </div>
                        {Object.keys(item.variants || {}).length > 0 && (
                          <div className={`text-xs mt-1 font-medium ${themeMode === 'light' ? 'text-slate-500' : 'text-white/50'}`}>
                            {Object.values(item.variants).map((v: any) => v.variant_value).join(' / ')}
                          </div>
                        )}
                        <p className={`font-black text-base mt-1 tracking-tight ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          ${(Number(item.product.sale_price) + Object.values(item.variants || {}).reduce((sum: number, v: any) => sum + (Number(v.price_adjustment) || 0), 0)).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className={`flex items-center rounded-xl border ${themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/10'}`}>
                          <button onClick={() => updateQuantity(item.product.id, item.variants || {}, -1)} className={`p-2 transition-colors ${themeMode === 'light' ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50' : 'text-white/50 hover:text-white hover:bg-white/10'} rounded-l-xl`}>
                            <Minus size={14} />
                          </button>
                          <span className={`w-8 text-center text-xs font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.variants || {}, 1)} className={`p-2 transition-colors ${themeMode === 'light' ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50' : 'text-white/50 hover:text-white hover:bg-white/10'} rounded-r-xl`}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id, item.variants || {})} className="p-2 text-rose-500/70 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              <SheetFooter className={`p-6 border-t ${themeMode === 'light' ? 'bg-white border-slate-100' : 'bg-[#121214] border-white/5'}`}>
                <div className="w-full space-y-5">
                  <div className="flex justify-between items-end">
                    <span className={`font-semibold text-sm uppercase tracking-wide ${themeMode === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Total</span>
                    <span className={`text-4xl font-black tracking-tighter ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>${cartTotal.toFixed(2)}</span>
                  </div>
                  
                  <Button 
                    onClick={() => handleCheckout(profile)}
                    className="w-full h-14 rounded-2xl font-bold tracking-wide transition-all duration-300 gap-2 shadow-[0_8px_20px_rgba(37,211,102,0.3)] bg-[#25D366] hover:bg-[#20bd5a] hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)] text-white hover:scale-[1.02] text-base"
                  >
                    <MessageCircle size={22} className="mr-1" /> 
                    Pedir por WhatsApp
                  </Button>
                </div>
              </SheetFooter>

            </SheetContent>
          </Sheet>
        </div>
      )}
      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(v) => !v && setSelectedProduct(null)}>
        <DialogContent className={`w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden border-none flex flex-col sm:rounded-[2.5rem] shadow-2xl ${themeMode === 'light' ? 'bg-[#fcfcfd] text-slate-900' : 'bg-[#09090b] text-white'}`}>
          <DialogTitle className="sr-only">Detalle del Producto</DialogTitle>
          <DialogDescription className="sr-only">Información detallada del producto y opciones de variante</DialogDescription>
          {selectedProduct && (
            <div className="flex flex-col md:flex-row h-full w-full">
              
              {/* Image Section (Carousel) - Left Side */}
              <div className={`relative w-full aspect-[4/5] md:aspect-auto md:w-[45%] lg:w-1/2 flex-shrink-0 ${themeMode === 'light' ? 'bg-slate-100' : 'bg-[#121214]'} flex items-center justify-center overflow-hidden group/modalimg`}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={(() => {
                      const allImages = [selectedProduct.image_url, ...(selectedProduct.product_images || []).map((i: any) => i.image_url)].filter(Boolean);
                      return allImages[currentImageIndex] || selectedProduct.image_url;
                    })()}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full object-cover absolute inset-0" 
                  />
                </AnimatePresence>

                {/* Carousel Controls */}
                {(() => {
                  const allImages = [selectedProduct.image_url, ...(selectedProduct.product_images || []).map((i: any) => i.image_url)].filter(Boolean);
                  if (allImages.length <= 1) return null;
                  return (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all duration-300 z-10 opacity-0 group-hover/modalimg:opacity-100 shadow-lg border border-white/10"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all duration-300 z-10 opacity-0 group-hover/modalimg:opacity-100 shadow-lg border border-white/10"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  );
                })()}

                {/* Image Pills (Indicators) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/20 backdrop-blur-md px-3 py-2 rounded-full">
                  {(() => {
                    const allImages = [selectedProduct.image_url, ...(selectedProduct.product_images || []).map((i: any) => i.image_url)].filter(Boolean);
                    if (allImages.length <= 1) return null;
                    return allImages.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`h-2 rounded-full transition-all duration-500 ${currentImageIndex === idx ? 'w-8 bg-white shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                      />
                    ));
                  })()}
                </div>
              </div>

              {/* Info Section - Right Side */}
              <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 custom-scrollbar">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1">
                      {selectedProduct.categories?.name && (
                        <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${themeMode === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
                          {selectedProduct.categories.name}
                        </p>
                      )}
                      <h2 className={`text-3xl md:text-4xl font-black tracking-tighter leading-tight mb-2 ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {selectedProduct.name}
                      </h2>
                    </div>
                    {/* Close Button Desktop */}
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className={`hidden md:flex flex-shrink-0 w-12 h-12 rounded-full items-center justify-center transition-all duration-300 ${themeMode === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'}`}
                    >
                      <CloseIcon size={20} />
                    </button>
                  </div>
                  
                  <div className="flex items-end gap-3 mb-8">
                    <span className={`text-5xl font-black tracking-tighter ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      ${(Number(selectedProduct.sale_price) + Object.values(selectedVariants).reduce((sum: number, v: any) => sum + (Number(v.price_adjustment) || 0), 0)).toFixed(2)}
                    </span>
                    {selectedProduct.sku && (
                      <span className={`mb-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg ${themeMode === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-white/40'}`}>SKU: {selectedProduct.sku}</span>
                    )}
                  </div>

                  <div className={`w-full h-px ${themeMode === 'light' ? 'bg-slate-100' : 'bg-white/5'} mb-8`} />

                  {/* Variants Section */}
                  {selectedProduct.product_variants && selectedProduct.product_variants.length > 0 && (
                    <div className="mb-8 space-y-6">
                      {Array.from(new Set(selectedProduct.product_variants.map((v: any) => v.variant_label))).map((label: any) => {
                        const variantsForLabel = selectedProduct.product_variants.filter((v: any) => v.variant_label === label);
                        return (
                          <div key={label} className="space-y-3">
                            <h4 className={`text-xs font-bold uppercase tracking-widest ${themeMode === 'light' ? 'text-slate-900' : 'text-white/80'}`}>
                              {label}
                            </h4>
                            <div className="flex flex-wrap gap-2.5">
                              {variantsForLabel.map((v: any) => {
                                const isSelected = selectedVariants[label]?.id === v.id;
                                const outOfStock = v.stock === 0;
                                return (
                                  <button
                                    key={v.id}
                                    disabled={outOfStock}
                                    onClick={() => setSelectedVariants(prev => ({ ...prev, [label]: v }))}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                                      isSelected 
                                        ? 'bg-foreground text-background shadow-[0_4px_15px_rgba(0,0,0,0.1)] scale-105 border-transparent' 
                                        : outOfStock 
                                          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-none text-slate-400 dark:bg-white/5 dark:text-white/30'
                                          : `${themeMode === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50' : 'bg-[#121214] border-white/10 text-white/70 hover:border-white/20 hover:bg-white/5'} border`
                                    }`}
                                  >
                                    {v.variant_value}
                                    {v.price_adjustment > 0 && <span className="ml-1 text-[10px] opacity-70">(+${v.price_adjustment})</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <div className={`w-full h-px ${themeMode === 'light' ? 'bg-slate-100' : 'bg-white/5'} mt-8`} />
                    </div>
                  )}

                  <div className="prose prose-sm md:prose-base max-w-none">
                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 ${themeMode === 'light' ? 'text-slate-900' : 'text-white/80'}`}>
                      Los Detalles
                    </h4>
                    <p className={`text-base leading-relaxed whitespace-pre-line font-medium ${themeMode === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                      {selectedProduct.description || "Este producto no cuenta con una descripción detallada en este momento. Sin embargo, nuestro equipo puede brindarte toda la información que necesites vía WhatsApp."}
                    </p>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className={`p-6 border-t flex flex-col sm:flex-row gap-4 relative z-20 ${themeMode === 'light' ? 'bg-[#fcfcfd]/80 border-slate-100 backdrop-blur-xl' : 'bg-[#09090b]/80 border-white/5 backdrop-blur-xl'}`}>
                  <Button 
                    onClick={() => {
                      // Check variants
                      const requiredLabels = Array.from(new Set((selectedProduct.product_variants || []).map((v: any) => v.variant_label))) as string[];
                      const missing = requiredLabels.filter(label => !selectedVariants[label]);
                      if (missing.length > 0) {
                        toast.error(`Por favor selecciona: ${missing.join(', ')}`);
                        return;
                      }
                      
                      addToCart(selectedProduct, selectedVariants);
                      toast.success(`${selectedProduct.name} añadido al carrito`);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 h-14 rounded-2xl text-base font-bold transition-all duration-300 shadow-xl bg-foreground text-background hover:scale-[1.02] hover:shadow-2xl"
                  >
                    Añadir a mi bolsa
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const wnumber = profile.store_whatsapp ? profile.store_whatsapp.replace(/\D/g, '') : '';
                      const baseUrl = wnumber ? `https://wa.me/${wnumber}` : `https://wa.me/`;
                      
                      const variantText = Object.keys(selectedVariants).length > 0 
                        ? ` (${Object.values(selectedVariants).map((v: any) => v.variant_value).join(', ')})` 
                        : '';
                      const variantAdjustment = Object.values(selectedVariants).reduce((sum: number, v: any) => sum + (Number(v.price_adjustment) || 0), 0);
                      const finalPrice = Number(selectedProduct.sale_price) + variantAdjustment;
                      
                      const text = `¡Hola! Me interesa este producto: *${selectedProduct.name}${variantText}* ($${finalPrice.toFixed(2)})\n\n¿Podrían darme más detalles?`;
                      window.open(`${baseUrl}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className={`flex-1 sm:flex-initial sm:px-8 h-14 rounded-2xl text-base font-bold border-2 transition-all duration-300 hover:scale-[1.02] ${themeMode === 'light' ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-white/10 hover:bg-white/5 text-white/80'}`}
                  >
                    Consultar Dudas
                  </Button>
                </div>
              </div>

              {/* Close Button Mobile */}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 md:hidden w-10 h-10 rounded-full bg-black/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-black/40 transition-all duration-300 z-50 shadow-lg border border-white/10"
              >
                <CloseIcon size={20} />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
