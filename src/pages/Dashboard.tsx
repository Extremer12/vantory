import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ArrowDownRight, Package, AlertTriangle, ShoppingCart, DollarSign, Activity, Image as ImageIcon, LayoutDashboard, BarChart3, Clock, Receipt } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { SectionHelp } from '@/components/SectionHelp';

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

  const totalProducts = products?.length ?? 0;

  const totalSales = transactions
    ?.filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const totalExpenses = transactions
    ?.filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const lowStockCount = products?.filter(
    (p) => (p.current_stock ?? 0) <= (p.min_stock ?? 5)
  ).length ?? 0;

  const recentProducts = products?.slice(0, 6) ?? [];
  const recentTransactions = transactions?.slice(0, 5) ?? [];

  // Build chart data from last 7 transactions
  const chartData = transactions
    ?.slice(0, 7)
    .reverse()
    .map((t, i) => ({
      name: `T${i + 1}`,
      amount: Number(t.amount),
      type: t.type,
    })) ?? [];

  // Top 5 products by stock value
  const topProducts = (products ?? [])
    .map(p => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
      value: Number(p.sale_price) * (p.current_stock ?? 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card/90 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 text-sm shadow-lg">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-semibold text-foreground tabular-nums">${payload[0].value?.toFixed(2)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <SectionHelp 
            title="Panel de Control"
            description="Una vista rápida y potente de la salud financiera y el estado del inventario de tu negocio."
            steps={[
              { title: "Resumen de Métricas", description: "Ventas, gastos y alertas de stock en tiempo real.", icon: LayoutDashboard },
              { title: "Rendimiento", description: "Flujo de caja semanal y valor del inventario.", icon: BarChart3 },
              { title: "Actividad", description: "Últimos productos y transacciones.", icon: Clock }
            ]}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Vista general de tu negocio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ventas Totales" value={`$${totalSales.toFixed(2)}`} trend={12.5} icon={DollarSign} />
        <StatCard label="Gastos" value={`$${totalExpenses.toFixed(2)}`} trend={-2.4} icon={ArrowDownRight} />
        <StatCard label="Productos" value={`${totalProducts}`} icon={Package} />
        <StatCard label="Bajo Stock" value={`${lowStockCount}`} icon={AlertTriangle} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-card rounded-xl border border-white/5 backdrop-blur-xl overflow-hidden p-4 sm:p-5">
          <h3 className="font-semibold text-sm mb-4">Flujo de Caja</h3>
          <div className="h-[200px] sm:h-[240px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#cashGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground">Sin datos</div>}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card rounded-xl border border-white/5 backdrop-blur-xl overflow-hidden p-4 sm:p-5">
          <h3 className="font-semibold text-sm mb-4">Valor en Inventario</h3>
          <div className="h-[200px] sm:h-[240px] w-full">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {topProducts.map((_, idx) => (
                      <Cell key={idx} fill={`hsl(var(--primary) / ${1 - idx * 0.15})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground">Sin datos</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-white/5 backdrop-blur-xl overflow-hidden">
          <div className="p-5 border-b border-white/5 font-semibold text-sm">Productos Recientes</div>
          <div className="divide-y divide-white/5">
            {recentProducts.length === 0 ? (
              <EmptyState 
                icon={Package} 
                title="Sin productos" 
                description="Agrega tu primer producto desde la sección de Inventario." 
              />
            ) : recentProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4 text-muted-foreground opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku || 'Sin SKU'}</p>
                </div>
                <span className="text-sm font-medium">${Number(p.sale_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-white/5 backdrop-blur-xl overflow-hidden">
          <div className="p-5 border-b border-white/5 font-semibold text-sm">Actividad Reciente</div>
          <div className="divide-y divide-white/5">
            {recentTransactions.length === 0 ? (
              <EmptyState 
                icon={Receipt} 
                title="Sin transacciones" 
                description="Aquí aparecerán tus últimas ventas y gastos registrados." 
              />
            ) : recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-primary">
                  <ShoppingCart size={16} />
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-medium">{t.type === 'sale' ? 'Venta' : t.type}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.description || 'Sin descripción'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${Number(t.amount).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
