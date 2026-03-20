import { Package, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';

interface InventoryGridProps {
  products: any[];
  openEdit: (product: any) => void;
  deleteProduct: (product: any) => void;
  openCreate: () => void;
}

export function InventoryGrid({ products, openEdit, deleteProduct, openCreate }: InventoryGridProps) {
  return (
    <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((p) => (
        <div key={p.id} className="group relative bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
          <div className="aspect-square overflow-hidden relative">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-white/[0.02] flex items-center justify-center"><Package size={40} className="text-muted-foreground opacity-20" /></div>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-primary" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
              <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-destructive" onClick={() => deleteProduct(p)}><Trash2 size={14} /></Button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-bold text-foreground truncate">{p.name}</h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground font-mono">{p.sku || 'SIN SKU'}</span>
                {p.categories?.name && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">{p.categories.name}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Precio</span>
                <span className="text-lg font-black text-primary">${Number(p.sale_price).toFixed(2)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right">Stock</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${p.current_stock === 0 ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]' : p.current_stock <= (p.min_stock || 5) ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                  <span className="font-black tabular-nums">{p.current_stock}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {products.length === 0 && <div className="col-span-full py-20"><EmptyState icon={Package} title="No hay productos" description="Tu inventario está vacío. Comienza agregando tu primer producto." actionLabel="Nuevo Producto" onAction={openCreate} /></div>}
    </motion.div>
  );
}
