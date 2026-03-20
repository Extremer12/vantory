import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInventory } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, Trash2, Globe, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { generateInventoryPDF } from '@/lib/pdf-generator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { InventoryHeader } from '@/components/InventoryHeader';
import { InventoryGrid } from '@/components/InventoryGrid';
import { InventoryFormModal } from '@/components/InventoryFormModal';

export default function InventoryPage() {
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const [isExporting, setIsExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);

  const {
    profile,
    categoriesList,
    productsData,
    isLoading,
    deleteProduct
  } = useInventory(user, pageIndex, pageSize, searchQuery);

  const products = productsData?.data || [];
  const totalCount = productsData?.count || 0;
  const pageCount = Math.ceil(totalCount / pageSize);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      toast.info('Generando PDF...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });
        
      if (error) throw error;
      generateInventoryPDF(data || [], profile?.business_name);
      toast.success('PDF descargado correctamente');
    } catch (err: any) {
      toast.error('Error al generar PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const openCreate = () => {
    setEditingProduct(null);
    setOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setOpen(true);
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'image_url',
      header: '',
      cell: ({ row }) => {
        const url = row.original.image_url;
        return url ? (
          <img src={url} alt={row.original.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
            <ImageIcon className="w-5 h-5 text-muted-foreground opacity-50" />
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Producto',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_public && <span title="Visible en Mi Tienda"><Globe className="w-3.5 h-3.5 text-primary" /></span>}
          </div>
          {row.original.categories?.name && <span className="text-[10px] text-muted-foreground uppercase">{row.original.categories.name}</span>}
        </div>
      ),
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.sku || '—'}</span>,
    },
    {
      accessorKey: 'current_stock',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.original.current_stock ?? 0;
        const min = row.original.min_stock ?? 5;
        const isLow = stock <= min;
        const isOut = stock === 0;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isOut ? 'bg-destructive/10 text-destructive border-destructive/20' 
            : isLow ? 'bg-warning/10 text-warning border-warning/20' 
            : 'bg-success/10 text-success border-success/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-success'}`} />
            {stock}
          </span>
        );
      },
    },
    {
      accessorKey: 'cost_price',
      header: () => <div className="text-right">Costo</div>,
      cell: ({ row }) => <div className="text-right tabular-nums text-muted-foreground">${Number(row.original.cost_price).toFixed(2)}</div>,
    },
    {
      accessorKey: 'sale_price',
      header: () => <div className="text-right">Venta</div>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">${Number(row.original.sale_price).toFixed(2)}</div>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setProductToDelete(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <InventoryHeader 
        profile={profile}
        totalCount={totalCount}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isExporting={isExporting}
        handleExportPDF={handleExportPDF}
        openCreate={openCreate}
      />

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground rounded-xl border border-white/10 bg-card">Cargando inventario...</div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DataTable 
                columns={columns} 
                data={products} 
                searchPlaceholder="Buscar..." 
                pageCount={pageCount} 
                pageIndex={pageIndex} 
                pageSize={pageSize} 
                onPageChange={(idx) => setPageIndex(idx)}
                onPageSizeChange={(size) => setPageSize(size)}
                onSearchChange={setSearchQuery}
              />
            </motion.div>
          ) : (
            <InventoryGrid 
              products={products}
              openEdit={openEdit}
              openCreate={openCreate}
              deleteProduct={setProductToDelete}
            />
          )}
        </AnimatePresence>
      )}

      {user && (
        <InventoryFormModal 
          open={open}
          onOpenChange={setOpen}
          editingProduct={editingProduct}
          user={user}
          categoriesList={categoriesList || []}
        />
      )}

      <AlertDialog open={!!productToDelete} onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}>
        <AlertDialogContent className="border-white/10 bg-zinc-950">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente "{productToDelete?.name}" de tu inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (productToDelete) deleteProduct.mutate(productToDelete.id);
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
