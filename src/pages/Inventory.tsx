import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function InventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', cost_price: '', sale_price: '', current_stock: '0', min_stock: '5',
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('products').insert({
        user_id: user!.id,
        name: form.name,
        sku: form.sku || null,
        cost_price: parseFloat(form.cost_price),
        sale_price: parseFloat(form.sale_price),
        current_stock: parseInt(form.current_stock),
        min_stock: parseInt(form.min_stock),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setForm({ name: '', sku: '', cost_price: '', sale_price: '', current_stock: '0', min_stock: '5' });
      toast.success('Producto agregado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto eliminado');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus productos y stock</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus size={16} /> Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Producto</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addProduct.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Stock Actual</Label>
                  <Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Precio Costo</Label>
                  <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Precio Venta</Label>
                  <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Stock Mínimo</Label>
                  <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addProduct.isPending}>
                {addProduct.isPending ? 'Guardando...' : 'Guardar Producto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <th className="px-5 py-3">Producto</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3 text-right">Costo</th>
              <th className="px-5 py-3 text-right">Venta</th>
              <th className="px-5 py-3 text-right">Margen</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground text-sm">Cargando...</td></tr>
            )}
            {!isLoading && (products?.length === 0) && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground text-sm">Sin productos. Agrega el primero.</td></tr>
            )}
            {products?.map((p) => {
              const stock = p.current_stock ?? 0;
              const min = p.min_stock ?? 5;
              const isLow = stock <= min;
              const isOut = stock === 0;
              const margin = ((Number(p.sale_price) - Number(p.cost_price)) / Number(p.sale_price) * 100);
              return (
                <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-sm">{p.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground tabular-nums text-sm">{p.sku || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isOut ? 'bg-destructive/10 text-destructive' : isLow ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-success'}`} />
                      {stock}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-sm">${Number(p.cost_price).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-sm font-medium">${Number(p.sale_price).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-sm text-muted-foreground">{margin.toFixed(1)}%</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => deleteProduct.mutate(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
