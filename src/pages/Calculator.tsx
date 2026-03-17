import { useState } from 'react';
import { calculatePricingEngine } from '@/lib/pricing-engine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CalculatorPage() {
  const [cost, setCost] = useState(10);
  const [margin, setMargin] = useState(30);
  const [tax, setTax] = useState(0);
  const [fee, setFee] = useState(0);
  const [fixedCosts, setFixedCosts] = useState(0);

  const result = calculatePricingEngine(cost, margin, tax, fee, fixedCosts);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calculadora de Precios</h1>
        <p className="text-sm text-muted-foreground">Calcula tu precio de venta óptimo y punto de equilibrio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-card rounded-lg shadow-card p-5 space-y-4">
            <h3 className="font-medium text-sm">Parámetros</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Costo bruto ($)</Label>
                <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Margen deseado (%)</Label>
                <Input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Impuestos (%)</Label>
                <Input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Comisión plataforma (%)</Label>
                <Input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Costos fijos mensuales ($)</Label>
                <Input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg shadow-card p-5 space-y-4">
            <h3 className="font-medium text-sm">Resultado</h3>
            <div className="space-y-3">
              <ResultRow label="Precio de venta" value={`$${result.finalSalePrice.toFixed(2)}`} highlight />
              <ResultRow label="Margen de contribución" value={`$${result.contributionMargin.toFixed(2)}`} />
              <ResultRow label="Margen real" value={`${result.marginPercentage.toFixed(1)}%`} />
              {result.breakEvenUnits > 0 && (
                <ResultRow label="Punto de equilibrio" value={`${result.breakEvenUnits} unidades`} />
              )}
            </div>
          </div>

          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              Para no perder dinero, debes vender a <strong className="text-foreground">${result.finalSalePrice.toFixed(2)}</strong> como mínimo.
              {result.breakEvenUnits > 0 && (
                <> Necesitas vender <strong className="text-foreground">{result.breakEvenUnits} unidades</strong> para cubrir tus costos fijos.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-semibold ${highlight ? 'text-lg text-primary' : 'text-sm'}`}>
        {value}
      </span>
    </div>
  );
}
