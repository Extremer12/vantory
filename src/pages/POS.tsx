import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SectionHelp } from '@/components/SectionHelp';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Package, Image as ImageIcon, MousePointer2, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  name: string;
  sale_price: number;
  quantity: number;
  image_url?: string | null;
  stock: number;
}

export default function POSPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const addToCart = (product: any) => {
    if ((product.current_stock ?? 0) <= 0) {
      toast.error('Producto sin stock');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= (product.current_stock ?? 0)) {
          toast.error('No hay más stock disponible');
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        sale_price: Number(product.sale_price),
        quantity: 1,
        image_url: (product as any).image_url,
        stock: product.current_stock ?? 0
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty > item.stock) {
          toast.error('Stock máximo alcanzado');
          return item;
        }
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) return;
      
      // We process each item as a transaction. 
      // Ideally we'd have a 'sales' table with 'sale_items', 
      // but following the existing 'transactions' pattern:
      const transactions = cart.map(item => ({
        user_id: user!.id,
        product_id: item.id,
        type: 'sale',
        amount: item.sale_price * item.quantity,
        quantity: item.quantity,
        description: `Venta POS: ${item.name} x${item.quantity}`
      }));

      const { error } = await supabase.from('transactions').insert(transactions);
      if (error) throw error;

      for (const item of cart) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ current_stock: item.stock - item.quantity })
          .eq('id', item.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setCart([]);
      toast.success('Venta procesada con éxito', {
        icon: <CheckCircle2 className="text-success" />
      });
    },
    onError: (err: any) => toast.error('Error al procesar venta: ' + err.message)
  });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Punto de Venta</h1>
            <SectionHelp 
              title="Caja Registradora (POS)"
              description="Realiza ventas rápidas seleccionando productos visualmente y procesando el pago en segundos."
              steps={[
                {
                  title: "Selección de Productos",
                  description: "Haz clic en cualquier producto de la galería para añadirlo al carrito. Puedes buscar por nombre o SKU.",
                  icon: MousePointer2
                },
                {
                  title: "Gestión del Carrito",
                  description: "Ajusta las cantidades o elimina productos desde la barra lateral derecha antes de confirmar.",
                  icon: ShoppingCart
                },
                {
                  title: "Finalizar Venta",
                  description: "Al presionar 'Finalizar Venta', el sistema restará el stock automáticamente y registrará el ingreso.",
                  icon: CreditCard
                }
              ]}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Registra ventas de forma rápida y sencilla</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Product Browser */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50 backdrop-blur-md border-white/10"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Cargando productos...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <motion.button
                    key={product.id}
                    layout
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(product)}
                    className="flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden hover:shadow-card-hover transition-all text-left group relative"
                  >
                    <div className="aspect-square bg-black/20 relative overflow-hidden">
                      {(product as any).image_url ? (
                        <img src={(product as any).image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                          <ImageIcon size={32} />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-md border ${
                          (product.current_stock ?? 0) <= (product.min_stock ?? 5) 
                            ? 'bg-destructive/20 text-destructive border-destructive/20' 
                            : 'bg-success/20 text-success border-success/20'
                        }`}>
                          {product.current_stock} disp
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{product.sku || 'Sin SKU'}</p>
                      <p className="font-bold text-primary">${Number(product.sale_price).toFixed(2)}</p>
                    </div>
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-96 flex flex-col bg-card border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-card">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-semibold">Carrito de Venta</h2>
            <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
              {cart.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-50"
                >
                  <ShoppingCart size={40} strokeWidth={1.5} />
                  <p className="text-sm">El carrito está vacío</p>
                </motion.div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5 group"
                  >
                    <div className="w-12 h-12 rounded-md bg-black/20 overflow-hidden shrink-0 border border-white/10">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{item.name}</h4>
                      <p className="text-xs text-primary font-bold">${(item.sale_price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-black/20 rounded-lg p-0.5">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:text-primary transition-colors disabled:opacity-20"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold w-6 text-center tabular-nums">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:text-primary transition-colors disabled:opacity-20"
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 bg-white/5 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-muted-foreground text-sm uppercase tracking-wider font-medium">Total</span>
              <span className="text-3xl font-bold tracking-tighter text-primary">${total.toFixed(2)}</span>
            </div>
            <Button
              className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20"
              disabled={cart.length === 0 || checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
            >
              {checkoutMutation.isPending ? 'Procesando...' : 'Finalizar Venta'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
