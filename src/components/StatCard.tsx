import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  icon: LucideIcon;
}

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-card rounded-lg p-5 shadow-card animate-fade-in">
      <div className="flex justify-between items-start">
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{value}</div>
      {trend !== undefined && (
        <div className={`text-xs flex items-center gap-1 mt-1 ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}% vs mes anterior
        </div>
      )}
    </div>
  );
}
