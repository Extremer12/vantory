import { ShoppingCart, Search, Menu, Minus, Plus, MessageCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface PublicStoreHeaderProps {
  cart: any[];
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  updateQuantity: (id: string, variants: any, delta: number) => void;
  removeFromCart: (id: string, variants: any) => void;
  handleCheckout: (profile: any) => void;
  profile: any;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  colors: Record<string, string>;
  headerStyle: string;
}

export function PublicStoreHeader({
  cart,
  cartCount,
  cartTotal,
  isCartOpen,
  setIsCartOpen,
  updateQuantity,
  removeFromCart,
  handleCheckout,
  profile,
  searchQuery,
  setSearchQuery,
  colors,
  headerStyle,
}: PublicStoreHeaderProps) {
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
}
