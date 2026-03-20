import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PublicStoreProductModalProps {
  selectedProduct: any;
  setSelectedProduct: (product: any) => void;
  currentImageIndex: number;
  setCurrentImageIndex: (index: number | ((prev: number) => number)) => void;
  selectedVariants: Record<string, any>;
  setSelectedVariants: (variants: any | ((prev: any) => any)) => void;
  colors: Record<string, string>;
  isDark: boolean;
  profile: any;
  addToCart: (product: any, variants: any) => void;
}

export function PublicStoreProductModal({
  selectedProduct,
  setSelectedProduct,
  currentImageIndex,
  setCurrentImageIndex,
  selectedVariants,
  setSelectedVariants,
  colors,
  isDark,
  profile,
  addToCart,
}: PublicStoreProductModalProps) {
  return (
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
  );
}
