import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ArrowDownRight, Package, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: products } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalSales = transactions
    ?.filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const totalExpenses = transactions
    ?.filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const lowStockCount = products?.filter(
    (p) => (p.current_stock ?? 0) <= (p.min_stock ?? 5)
  ).length ?? 0;

  const recentProducts = products?.slice(0, 5) ?? [];

  const chartData = transactions
    ?.slice(0, 10)
    .reverse()
    .map((t) => ({ v: Number(t.amount), type: t.type })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ventas Totales" value={`$${totalSales.toFixed(2)}`} trend={12.5} icon={TrendingUp} />
        <StatCard label="Gastos" value={`$${totalExpenses.toFixed(2)}`} trend={-2.4} icon={ArrowDownRight} />
        <StatCard label="Balance Neto" value={`$${(totalSales - totalExpenses).toFixed(2)}`} trend={8.2} icon={Package} />
        <StatCard label="Bajo Stock" value={`${lowStockCount} items`} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Products */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h3 className="font-medium">Productos Recientes</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No hay productos aún. Agrega tu primer producto en Inventario.
                  </td>
                </tr>
              )}
              {recentProducts.map((p) => {
                const stock = p.current_stock ?? 0;
                const min = p.min_stock ?? 5;
                const isLow = stock <= min;
                const isOut = stock === 0;
                return (
                  <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-sm">{p.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground tabular-nums text-sm">{p.sku || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isOut
                          ? 'bg-destructive/10 text-destructive'
                          : isLow
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOut ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-success'
                        }`} />
                        {stock} en stock
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium text-sm">
                      ${Number(p.sale_price).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cash Flow Chart */}
        <div className="bg-card rounded-lg shadow-card p-5">
          <h3 className="font-medium mb-4">Flujo de Caja</h3>
          <div className="h-[200px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="type" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sin datos aún
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
