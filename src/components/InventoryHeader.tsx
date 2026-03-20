import { LayoutGrid, List, FileText, Share2, Download, Plus, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SectionHelp } from '@/components/SectionHelp';
import { toast } from 'sonner';

interface InventoryHeaderProps {
  profile: any;
  totalCount: number;
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  isExporting: boolean;
  handleExportPDF: () => void;
  openCreate: () => void;
}

export function InventoryHeader({
  profile,
  totalCount,
  viewMode,
  setViewMode,
  isExporting,
  handleExportPDF,
  openCreate
}: InventoryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inventario</h1>
          <SectionHelp 
            title="Gestión de Inventario"
            description="Administra tus productos, controla el stock y descarga reportes detallados para tu negocio."
            steps={[
              { title: "Agregar Productos", description: "Usa el botón 'Nuevo Producto' para registrar artículos.", icon: Package },
              { title: "Control de Stock", description: "Visualiza rápidamente niveles bajos con indicadores de color.", icon: AlertTriangle },
              { title: "Reportes PDF", description: "Genera reportes profesionales con un solo clic.", icon: TrendingUp }
            ]}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Gestiona productos con vista técnica o galería visual</p>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-lg backdrop-blur-md">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}><List size={18} /></button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10" disabled={isExporting}><Download size={16} /> Exportar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-white/10 bg-background/80 backdrop-blur-xl">
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer"><FileText size={16} /> Descargar PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
                const shareText = `Inventario de ${profile?.business_name || 'mi negocio'}: ${totalCount} productos.`;
                if (navigator.share) navigator.share({ title: 'Reporte de Inventario', text: shareText, url: window.location.href }).catch(console.error);
                else navigator.clipboard.writeText(`${shareText}\n${window.location.href}`).then(() => toast.success('Copiado al portapapeles')).catch(() => toast.error('No se pudo copiar'));
              }} className="gap-2 cursor-pointer"><Share2 size={16} /> Compartir Reporte</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" onClick={openCreate} className="gap-1.5 shadow-lg shadow-primary/20"><Plus size={16} /> Nuevo Producto</Button>
      </div>
    </div>
  );
}
