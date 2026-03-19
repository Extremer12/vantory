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
  const isInvalid = (margin + tax + fee) >= 100;
  const price = result.finalSalePrice || 0;
  
  const costPct = price > 0 ? (cost / price) * 100 : 0;
  const marginPct = price > 0 ? (result.contributionMargin / price) * 100 : 0;
  const taxPct = price > 0 ? ((price * (tax / 100)) / price) * 100 : 0;
  const feePct = price > 0 ? ((price * (fee / 100)) / price) * 100 : 0;

  const costValue = cost;
  const marginValue = result.contributionMargin;
  const taxValue = price * (tax / 100);
  const feeValue = price * (fee / 100);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <Calculator size={24} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Calculadora Inteligente</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">Simula el precio ideal de venta para asegurar la rentabilidad.</p>
        </div>
        <SectionHelp 
          title="¿Cómo funciona?"
          description="Estructura de precios para garantizar que siempre ganes el porcentaje exacto que deseas."
          steps={[
            { title: "Margen Real", description: "Calculamos el precio para que te quede el porcentaje deseado neto.", icon: Percent },
            { title: "Equilibrio", description: "Descubre cuántas ventas necesitas para cubrir gastos fijos.", icon: Target }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-xl p-6 md:p-8 space-y-8">
            <div className="flex items-center gap-2 mb-6"><DollarSign className="text-primary" size={20} /><h3 className="font-bold text-lg">Entradas</h3></div>
            <div className="space-y-4">
              <Label>Costo del producto ($)</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="bg-background/50 border-white/10" />
            </div>
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center"><Label>Margen Neto (%)</Label><span className="font-mono">{margin}%</span></div>
              <Slider value={[margin]} onValueChange={(vals) => setMargin(vals[0])} max={99} step={1} />
            </div>
            <div className="space-y-6 pt-6 border-t border-white/5">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-warning"><PieChart size={16}/> Deducciones</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><Label className="text-xs">Impuestos</Label><span className="text-sm font-mono">{tax}%</span></div>
                <Slider value={[tax]} onValueChange={(vals) => setTax(vals[0])} max={50} step={0.5} />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><Label className="text-xs">Comisiones</Label><span className="text-sm font-mono">{fee}%</span></div>
                <Slider value={[fee]} onValueChange={(vals) => setFee(vals[0])} max={50} step={0.5} />
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t border-white/5">
              <Label>Costos fijos mensuales ($)</Label>
              <Input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(Number(e.target.value))} className="bg-background/50 border-white/10" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {isInvalid ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <AlertCircle size={48} className="text-destructive mb-4" />
              <h2 className="text-xl font-bold text-destructive">Estructura Inválida</h2>
              <p className="text-destructive/80 mt-2">Deducciones superan el 100%.</p>
            </div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary"/> Precio Sugerido</h2>
                <div className="flex items-baseline gap-2 mb-8"><span className="text-4xl font-black text-primary/70">$</span><span className="text-7xl font-black tracking-tighter tabular-nums">{price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
                <div className="h-4 w-full flex rounded-full overflow-hidden mb-8 bg-background/50 border border-white/5">
                  <div style={{ width: `${costPct}%` }} className="bg-blue-500/80" /><div style={{ width: `${taxPct}%` }} className="bg-yellow-500/80" /><div style={{ width: `${feePct}%` }} className="bg-purple-500/80" /><div style={{ width: `${marginPct}%` }} className="bg-success/80" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <LegendItem dotColor="bg-blue-500" label="Costo" value={costValue} pct={costPct} />
                  <LegendItem dotColor="bg-yellow-500" label="Impuestos" value={taxValue} pct={taxPct} />
                  <LegendItem dotColor="bg-purple-500" label="Comisiones" value={feeValue} pct={feePct} />
                  <LegendItem dotColor="bg-success" label="Ganancia" value={marginValue} pct={marginPct} isBold />
                </div>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard title="Ganancia Neta por Unidad" value={`$${result.contributionMargin.toFixed(2)}`} subtitle={`${result.marginPercentage.toFixed(1)}% del precio`} icon={<DollarSign className="text-success" />} />
                <MetricCard title="Punto de Equilibrio" value={`${result.breakEvenUnits}`} subtitle="Uds para cubrir costos fijos" icon={<Activity className="text-warning" />} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ dotColor, label, value, pct, isBold = false }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${dotColor}`} /><span className="text-[10px] uppercase font-bold text-muted-foreground">{label}</span></div>
      <div className={`text-sm ${isBold ? 'text-success font-black' : 'font-bold'}`}>${value.toFixed(2)}</div>
      <div className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon }: any) {
  return (
    <div className="bg-card/40 border border-white/5 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4"><h3 className="text-xs font-bold uppercase text-muted-foreground">{title}</h3><div className="p-2 bg-background/50 rounded-lg">{icon}</div></div>
      <div className="text-2xl font-black">{value}</div>
      <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
