import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'sale' as string,
    product_id: '',
    amount: '',
    quantity: '1',
    description: '',
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, products(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: products } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, name, sale_price');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('transactions').insert({
        user_id: user!.id,
        type: form.type,
        product_id: form.product_id || null,
        amount: parseFloat(form.amount),
        quantity: parseInt(form.quantity),
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setForm({ type: 'sale', product_id: '', amount: '', quantity: '1', description: '' });
      toast.success('Transacción registrada');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const typeLabels: Record<string, string> = {
    sale: 'Venta',
    income: 'Ingreso',
    expense: 'Gasto',
    adjustment: 'Ajuste',
  };

  const typeColors: Record<string, string> = {
    sale: 'text-success',
    income: 'text-success',
    expense: 'text-destructive',
    adjustment: 'text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transacciones</h1>
          <p className="text-sm text-muted-foreground">Historial de ventas, ingresos y gastos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus size={16} /> Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Transacción</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addTransaction.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Venta</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.type === 'sale' || form.type === 'income' || form.type === 'adjustment') && (
                <div className="space-y-2">
                  <Label>Producto (opcional)</Label>
                  <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto ($)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
                {addTransaction.isPending ? 'Guardando...' : 'Registrar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Producto</th>
              <th className="px-5 py-3">Descripción</th>
              <th className="px-5 py-3 text-right">Cantidad</th>
              <th className="px-5 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">Cargando...</td></tr>
            )}
            {!isLoading && (transactions?.length === 0) && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">Sin transacciones aún.</td></tr>
            )}
            {transactions?.map((t) => (
              <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-5 py-3.5 text-sm tabular-nums text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString('es')}
                </td>
                <td className={`px-5 py-3.5 text-sm font-medium ${typeColors[t.type]}`}>
                  {typeLabels[t.type]}
                </td>
                <td className="px-5 py-3.5 text-sm">{(t as any).products?.name || '—'}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.description || '—'}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-sm">{t.quantity}</td>
                <td className={`px-5 py-3.5 text-right tabular-nums text-sm font-medium ${typeColors[t.type]}`}>
                  {t.type === 'expense' ? '-' : '+'}${Number(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
