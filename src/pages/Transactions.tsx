import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Search, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Receipt, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DataTable } from '@/components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { SectionHelp } from '@/components/SectionHelp';
import { motion } from 'framer-motion';

const typeLabels: Record<string, string> = {
  sale: 'Venta',
  income: 'Ingreso',
  expense: 'Gasto',
  adjustment: 'Ajuste',
};

const typeColors: Record<string, string> = {
  sale: 'text-success bg-success/10 border-success/20',
  income: 'text-success bg-success/10 border-success/20',
  expense: 'text-destructive bg-destructive/10 border-destructive/20',
  adjustment: 'text-muted-foreground bg-muted/10 border-muted/20',
};

const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {new Date(row.original.created_at).toLocaleDateString('es')}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[type]}`}>
          {typeLabels[type]}
        </span>
      );
    },
  },
  {
    accessorFn: (row) => row.products?.name || '—',
    id: 'productName',
    header: 'Producto',
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.description || '—'}</span>,
  },
  {
    accessorKey: 'quantity',
    header: () => <div className="text-right">Cantidad</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.quantity}</div>,
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Monto</div>,
    cell: ({ row }) => {
      const type = row.original.type;
      const isNegative = type === 'expense';
      return (
        <div className={`text-right tabular-nums font-medium ${isNegative ? 'text-destructive' : 'text-success'}`}>
          {isNegative ? '-' : '+'}${Number(row.original.amount).toFixed(2)}
        </div>
      );
    },
  },
];

export default function TransactionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'purchase' | 'expense' | 'income' | 'adjustment'>('all');
  const [form, setForm] = useState({
    type: 'sale' as string,
    product_id: '',
    amount: '',
    quantity: '1',
    description: '',
  });

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: stats } = useQuery({
    queryKey: ['transactions-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user?.id);
      if (error) throw error;
      
      const stats = { sales: 0, purchases: 0, expenses: 0, balance: 0 };
      data.forEach(t => {
        if (t.type === 'sale') stats.sales += Number(t.amount);
        else if (t.type === 'purchase') stats.purchases += Number(t.amount);
        else if (t.type === 'expense') stats.expenses += Number(t.amount);
      });
      stats.balance = stats.sales - (stats.purchases + stats.expenses);
      return stats;
    },
    enabled: !!user,
  });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions', user?.id, pageIndex, pageSize, searchQuery, typeFilter],
    queryFn: async () => {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('transactions')
        .select('*, products(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count };
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const transactions = transactionsData?.data || [];
  const totalCount = transactionsData?.count || 0;
  const pageCount = Math.ceil(totalCount / pageSize);

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
        product_id: form.product_id === 'none' ? null : (form.product_id || null),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Transacciones</h1>
            <SectionHelp 
              title="Historial de Transacciones"
              description="Controla cada movimiento de tu negocio: ventas, compras de stock y gastos operativos."
              steps={[
                { title: "Registrar Movimientos", description: "Ventas (ingresos), compras (egresos) o gastos fijos.", icon: Receipt },
                { title: "Métricas", description: "Tarjetas superiores muestran balance total y ventas.", icon: TrendingUp },
                { title: "Stock", description: "Ventas/compras vinculadas actualizan el stock automáticamente.", icon: History }
              ]}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Historial detallado de flujos de caja y mercancía</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus size={18} /> Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Registrar Movimiento</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addTransaction.mutate(); }} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Tipo de Movimiento</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-white/10 bg-background/90 backdrop-blur-xl">
                    <SelectItem value="sale">Venta</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Producto (Opcional)</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                  <SelectContent className="border-white/10 bg-background/90 backdrop-blur-xl">
                    <SelectItem value="none">Ninguno</SelectItem>
                    {products?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto ($)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="bg-white/5 border-white/10" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="bg-white/5 border-white/10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/5 border-white/10" placeholder="Detalles..." />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={addTransaction.isPending}>
                {addTransaction.isPending ? 'Procesando...' : 'Confirmar Registro'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-card border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><Wallet size={18} className="text-primary" /><span className="text-xs font-bold text-muted-foreground uppercase">Balance</span></div>
          <div className="text-2xl font-bold">${stats?.balance.toFixed(2) || '0.00'}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl bg-card border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><ArrowUpRight size={18} className="text-success" /><span className="text-xs font-bold text-muted-foreground uppercase">Ventas</span></div>
          <div className="text-2xl font-bold text-success">${stats?.sales.toFixed(2) || '0.00'}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-5 rounded-2xl bg-card border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><ArrowDownLeft size={18} className="text-destructive" /><span className="text-xs font-bold text-muted-foreground uppercase">Compras</span></div>
          <div className="text-2xl font-bold text-destructive">${stats?.purchases.toFixed(2) || '0.00'}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-5 rounded-2xl bg-card border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><TrendingDown size={18} className="text-warning" /><span className="text-xs font-bold text-muted-foreground uppercase">Otros</span></div>
          <div className="text-2xl font-bold text-warning">${stats?.expenses.toFixed(2) || '0.00'}</div>
        </motion.div>
      </div>

      <div className="bg-card border border-white/5 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPageIndex(0); }} className="pl-9 bg-white/5 border-white/10" />
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto">
            {['all', 'sale', 'income', 'expense', 'adjustment'].map((f) => (
              <button key={f} onClick={() => { setTypeFilter(f as any); setPageIndex(0); }} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {f === 'all' ? 'Todos' : typeLabels[f] || f}
              </button>
            ))}
          </div>
        </div>

        <DataTable columns={columns} data={transactions} searchPlaceholder="Filtrar..." pageCount={pageCount} pageIndex={pageIndex} pageSize={pageSize} onPaginationChange={(idx, size) => { setPageIndex(idx); setPageSize(size); }} onSearchChange={setSearchQuery} />
      </div>
    </div>
  );
}
