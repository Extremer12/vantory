import { useState } from 'react';
import { calculatePricingEngine } from '@/lib/pricing-engine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { SectionHelp } from '@/components/SectionHelp';
import { Calculator, Percent, DollarSign, Target, TrendingUp, PieChart, Activity, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CalculatorPage() {
  const [cost, setCost] = useState<number>(100);
  const [margin, setMargin] = useState<number>(30);
  const [tax, setTax] = useState<number>(21);
  const [fee, setFee] = useState<number>(5);
  const [fixedCosts, setFixedCosts] = useState<number>(500);

  const result = calculatePricingEngine(cost, margin, tax, fee, fixedCosts);

  // Error handling if deductions > 100%
  const isInvalid = (margin + tax + fee) >= 100;

  // Breakdown Calculation (Proportions of Final Sale Price)
  const price = result.finalSalePrice || 0;
  
  // Percentages relative to the final sale price (which is 100%)
  const costPct = price > 0 ? (cost / price) * 100 : 0;
  const marginPct = price > 0 ? (result.contributionMargin / price) * 100 : 0; // Notice: contribution margin is your profit
  const taxPct = price > 0 ? ((price * (tax / 100)) / price) * 100 : 0;
  const feePct = price > 0 ? ((price * (fee / 100)) / price) * 100 : 0;

  const costValue = cost;
  const marginValue = result.contributionMargin;
  const taxValue = price * (tax / 100);
  const feeValue = price * (fee / 100);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <Calculator size={24} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Calculadora Inteligente</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">
            Simula el precio ideal de venta para asegurar la rentabilidad de tus productos basándose en tus costos, impuestos y comisiones.
          </p>
        </div>
        <SectionHelp 
          title="¿Cómo funciona?"
          description="Esta herramienta utiliza la fórmula de margen sobre venta (Mark-up inverso), la forma correcta de calcular precios para garantizar que siempre ganes el porcentaje exacto que deseas tras todas las deducciones."
          steps={[
            { title: "Margen Real", description: "Si quieres ganar un 30%, calcularemos el precio final para que, luego de restar costos e impuestos, te quede exactamente el 30%.", icon: Percent },
            { title: "Punto de Equilibrio", description: "Descubre cuántos productos idénticos debes vender al mes para cubrir tus costos fijos.", icon: Target }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-xl p-6 md:p-8 space-y-8">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="text-primary" size={20} />
              <h3 className="font-bold text-lg">Estructura de Costos</h3>
            </div>

            {/* Variable 1: Costo */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-foreground/80">Costo del producto</Label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    className="pl-7 font-mono text-right bg-background/50 border-white/10 focus-visible:ring-primary"
                    value={cost === 0 ? '' : cost}
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Variable 2: Margen */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-foreground/80">Margen de Ganancia Neto</Label>
                <div className="relative w-24">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  <Input 
                    type="number" 
                    className="pr-7 font-mono text-right bg-background/50 border-white/10 focus-visible:ring-success/50"
                    value={margin === 0 ? '' : margin}
                    onChange={(e) => setMargin(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <Slider 
                value={[margin]} 
                onValueChange={(vals) => setMargin(vals[0])} 
                max={99} 
                step={1} 
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">Porcentaje de ganancia pura después de todos los descuentos.</p>
            </div>

            {/* Deducciones */}
            <div className="space-y-6 pt-6 border-t border-white/5">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-warning"><PieChart size={16}/> Comisiones e Impuestos</h4>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Impuestos (IVA, Ingresos, etc)</Label>
                  <span className="text-sm font-mono">{tax}%</span>
                </div>
                <Slider value={[tax]} onValueChange={(vals) => setTax(vals[0])} max={50} step={0.5} className="py-2" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Comisión Plataforma (MercadoLibre, Tarjetas)</Label>
                  <span className="text-sm font-mono">{fee}%</span>
                </div>
                <Slider value={[fee]} onValueChange={(vals) => setFee(vals[0])} max={50} step={0.5} className="py-2" />
              </div>
            </div>

            {/* Costos fijos */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-foreground/80">Costos fijos mensuales</Label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    className="pl-7 font-mono text-right bg-background/50 border-white/10"
                    value={fixedCosts === 0 ? '' : fixedCosts}
                    onChange={(e) => setFixedCosts(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Alquiler, sueldos, servicios. Usado para calcular el Punto de Equilibrio.</p>
            </div>

          </div>
        </div>

        {/* Right Column: Dashboard Results */}
        <div className="lg:col-span-7 space-y-6">
          
          {isInvalid ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <AlertCircle className="w-16 h-16 text-destructive mb-4" />
              <h2 className="text-xl font-bold text-destructive mb-2">Estructura Inválida</h2>
              <p className="text-destructive/80 max-w-md">La suma de tu margen, impuestos y comisiones es igual o superior al 100%. Es matemáticamente imposible vender el producto sin perder dinero bajo estos parámetros.</p>
            </motion.div>
          ) : (
            <>
              {/* Main Metric Hero */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-card to-card/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
              >
                {/* Background glow */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-2 relative z-10 flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary"/> Precio de Venta Sugerido
                </h2>
                
                <div className="flex items-baseline gap-2 mb-6 relative z-10">
                  <span className="text-4xl font-black text-primary/70">$</span>
                  <span className="text-7xl font-black tracking-tighter text-foreground tabular-nums">
                    {price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Visual Component Breakdown */}
                <div className="mt-10 relative z-10">
                  <div className="flex justify-between items-end mb-3">
                    <h3 className="text-sm font-medium text-foreground">Composición del Precio</h3>
                    <span className="text-xs text-muted-foreground font-mono">100% = ${price.toFixed(2)}</span>
                  </div>
                  
                  {/* The segmented Bar */}
                  <div className="h-6 w-full flex rounded-full overflow-hidden mb-6 bg-background/50 border border-white/5 shadow-inner">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${costPct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} title="Costo" className="h-full bg-blue-500/80 hover:bg-blue-500 transition-colors" />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${taxPct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} title="Impuestos" className="h-full bg-yellow-500/80 border-l border-background/20 hover:bg-yellow-500 transition-colors" />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${feePct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} title="Comisiones" className="h-full bg-purple-500/80 border-l border-background/20 hover:bg-purple-500 transition-colors" />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${marginPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} title="Ganancia Neta" className="h-full bg-success/80 border-l border-background/20 hover:bg-success transition-colors" />
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <LegendItem dotColor="bg-blue-500" label="Costo" value={costValue} pct={costPct} />
                    <LegendItem dotColor="bg-yellow-500" label="Impuestos" value={taxValue} pct={taxPct} />
                    <LegendItem dotColor="bg-purple-500" label="Comisiones" value={feeValue} pct={feePct} />
                    <LegendItem dotColor="bg-success" label="Ganancia Neta" value={marginValue} pct={marginPct} isBold />
                  </div>
                </div>
              </motion.div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard 
                  title="Ganancia Limpia por Unidad" 
                  value={`$${result.contributionMargin.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                  subtitle={`Representa el ${result.marginPercentage.toFixed(1)}% del precio venta`}
                  icon={<DollarSign className="text-success" size={24} />}
                  delay={0.1}
                />
                <MetricCard 
                  title="Punto de Equilibrio Mensual" 
                  value={result.breakEvenUnits > 0 ? `${result.breakEvenUnits.toLocaleString()}` : '0'} 
                  subtitle={result.breakEvenUnits > 0 ? "Unidades para cubrir costos fijos" : "Configura tus costos fijos primero"}
                  icon={<Activity className="text-warning" size={24} />}
                  delay={0.2}
                  unit={result.breakEvenUnits > 0 ? "uds" : ""}
                />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// Helper components for the visual breakdown
function LegendItem({ dotColor, label, value, pct, isBold = false }: { dotColor: string, label: string, value: number, pct: number, isBold?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <span className={`text-xs ${isBold ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      <div className="pl-4">
        <span className={`tabular-nums block tracking-tight ${isBold ? 'font-black text-lg text-success' : 'font-semibold text-sm'}`}>
          ${isNaN(value) ? '0.00' : value.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </span>
        <span className="text-[10px] text-muted-foreground/70 font-mono">{isNaN(pct) ? '0' : pct.toFixed(1)}% de la vta.</span>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, delay = 0, unit = "" }: { title: string, value: string, subtitle: string, icon: React.ReactNode, delay?: number, unit?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card/30 backdrop-blur-sm border border-white/5 rounded-2xl p-6 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-foreground/80 leading-tight">{title}</h3>
        <div className="p-2 bg-background/50 rounded-lg shrink-0">
          {icon}
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">{value}</span>
          {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}
