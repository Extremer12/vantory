import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  icon: LucideIcon;
}

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative bg-card rounded-xl p-5 shadow-card border border-white/5 backdrop-blur-xl overflow-hidden group"
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-[30px] group-hover:bg-primary/20 transition-colors duration-500" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <span className="text-muted-foreground text-sm font-medium">{label}</span>
          <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight tabular-nums mt-4 text-foreground">{value}</div>
        {trend !== undefined && (
          <div className={`text-xs font-medium flex items-center gap-1 mt-2 px-2 py-1 rounded-full w-fit ${trend >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(trend)}% vs mes anterior</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
