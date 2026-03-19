import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  Plus, Trash2, LayoutGrid, List, Search, Upload, Pencil, Download, 
  Share2, FileText, Box, Package, TrendingUp, AlertTriangle, Globe, 
  Image as ImageIcon, X, PlusCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { DataTable } from '@/components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { generateInventoryPDF } from '@/lib/pdf-generator';
import { SectionHelp } from '@/components/SectionHelp';
import { EmptyState } from '@/components/EmptyState';

const emptyForm = { name: '', sku: '', cost_price: '', sale_price: '', current_stock: '0', min_stock: '5', is_public: true, category: '', description: '' };

export default function InventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  // Gallery State
  const [galleryFiles, setGalleryFiles] = useState<{file: File, preview: string}[]>([]);
  const [existingGallery, setExistingGallery] = useState<{id: string, image_url: string}[]>([]);
  const [removedGalleryIds, setRemovedGalleryIds] = useState<string[]>([]);

  // Variants state
  const [variants, setVariants] = useState<{label: string, value: string, price_adjustment: string, stock: string}[]>([]);
  const [existingVariantIds, setExistingVariantIds] = useState<string[]>([]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch categories for the dropdown
  const { data: categoriesList } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', user?.id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', user?.id, pageIndex, pageSize, searchQuery],
    queryFn: async () => {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('products')
        .select('*, categories(name), product_images(id, image_url)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count };
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      toast.info('Generando PDF...');
      
      // Fetch ALL products for the report
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

  const products = productsData?.data || [];
  const totalCount = productsData?.count || 0;
  const pageCount = Math.ceil(totalCount / pageSize);

  const filteredProducts = useMemo(() => {
    // With server-side search, we don't need to filter on the client anymore
    // but the grid view still uses filteredProducts, so we'll just return products
    return products;
  }, [products]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten archivos de imagen'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, imageFile);
    if (error) throw new Error('Error subiendo imagen: ' + error.message);
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return publicUrl;
  };

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    clearImage();
    setGalleryFiles([]);
    setExistingGallery([]);
    setRemovedGalleryIds([]);
    setVariants([]);
    setExistingVariantIds([]);
    setOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku || '',
      cost_price: String(product.cost_price),
      sale_price: String(product.sale_price),
      current_stock: String(product.current_stock ?? 0),
      min_stock: String(product.min_stock ?? 5),
      is_public: product.is_public ?? true,
      category: product.category_id || '',
      description: product.description || '',
    });
    setImagePreview(product.image_url || null);
    setImageFile(null);
    setExistingGallery(product.product_images || []);
    setGalleryFiles([]);
    setRemovedGalleryIds([]);
    // Load existing variants
    supabase.from('product_variants').select('*').eq('product_id', product.id).then(({ data }) => {
      if (data && data.length > 0) {
        setVariants(data.map((v: any) => ({ label: v.variant_label, value: v.variant_value, price_adjustment: String(v.price_adjustment || 0), stock: String(v.stock || 0) })));
        setExistingVariantIds(data.map((v: any) => v.id));
      } else {
        setVariants([]);
        setExistingVariantIds([]);
      }
    });
    setOpen(true);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setGalleryFiles(prev => [...prev, ...newFiles]);
  };

  const removeGalleryFile = (index: number) => {
    setGalleryFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const removeExistingImage = (id: string) => {
    setExistingGallery(prev => prev.filter(img => img.id !== id));
    setRemovedGalleryIds(prev => [...prev, id]);
  };

  const saveProduct = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let imageUrl: string | null = editingProduct?.image_url || null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      let categoryId: string | null = null;
      if (form.category.trim() && form.category !== '__none__') {
        categoryId = form.category.trim();
      }

      const productData = {
        name: form.name,
        sku: form.sku || null,
        cost_price: parseFloat(form.cost_price),
        sale_price: parseFloat(form.sale_price),
        current_stock: parseInt(form.current_stock),
        min_stock: parseInt(form.min_stock),
        image_url: imageUrl,
        is_public: form.is_public,
        category_id: categoryId,
        description: form.description || null,
      };

      let finalProductId: string;

      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
        finalProductId = editingProduct.id;
      } else {
        const { data, error } = await supabase.from('products').insert({
          ...productData,
          user_id: user!.id,
        }).select().single();
        if (error) throw error;
        finalProductId = data.id;
      }

      // Handle Gallery Images
      // 1. Remove deleted images
      if (removedGalleryIds.length > 0) {
        await supabase.from('product_images').delete().in('id', removedGalleryIds);
      }

      // 2. Upload new gallery images
      for (const item of galleryFiles) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${user!.id}/${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, item.file);
        
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(uploadData.path);

        await supabase.from('product_images').insert({
          product_id: finalProductId,
          user_id: user!.id,
          image_url: publicUrlData.publicUrl
        });
      }

      // Handle Variants
      // 1. Delete existing variants
      if (existingVariantIds.length > 0) {
        await supabase.from('product_variants').delete().in('id', existingVariantIds);
      }
      // 2. Insert current variants
      if (variants.length > 0) {
        const variantRows = variants.filter(v => v.label.trim() && v.value.trim()).map(v => ({
          product_id: finalProductId,
          user_id: user!.id,
          variant_label: v.label.trim(),
          variant_value: v.value.trim(),
          price_adjustment: parseFloat(v.price_adjustment) || 0,
          stock: parseInt(v.stock) || 0,
        }));
        if (variantRows.length > 0) {
          await supabase.from('product_variants').insert(variantRows);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setForm(emptyForm);
      setEditingProduct(null);
      clearImage();
      setUploading(false);
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto agregado');
    },
    onError: (err: any) => {
      setUploading(false);
      toast.error(err.message);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto eliminado');
    },
    onError: () => toast.error('Error al eliminar. Verifica que no tenga transacciones asociadas.'),
  });

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
            {row.original.is_public && (
              <Globe className="w-3.5 h-3.5 text-primary" title="Visible en Mi Tienda" />
            )}
          </div>
          {row.original.categories?.name && (
            <span className="text-[10px] text-muted-foreground uppercase">{row.original.categories.name}</span>
          )}
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
      id: 'margin',
      header: () => <div className="text-right">Margen</div>,
      accessorFn: (row) => {
        const margin = ((Number(row.sale_price) - Number(row.cost_price)) / Number(row.sale_price) * 100);
        return isNaN(margin) ? 0 : margin;
      },
      cell: ({ row }) => {
        const cost = Number(row.original.cost_price);
        const sale = Number(row.original.sale_price);
        const margin = ((sale - cost) / sale * 100);
        return <div className="text-right tabular-nums text-primary font-medium">{isNaN(margin) ? '0.0' : margin.toFixed(1)}%</div>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              if (window.confirm(`¿Eliminar "${row.original.name}"?`)) deleteProduct.mutate(row.original.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inventario</h1>
            <SectionHelp 
              title="Gestión de Inventario"
              description="Administra tus productos, controla el stock y descarga reportes detallados para tu negocio."
              steps={[
                {
                  title: "Agregar Productos",
                  description: "Usa el botón 'Nuevo Producto' para registrar artículos con su SKU, precio de costo y venta.",
                  icon: Package
                },
                {
                  title: "Control de Stock",
                  description: "El sistema resaltará automáticamente en amarillo los productos con stock bajo y en rojo los agotados.",
                  icon: AlertTriangle
                },
                {
                  title: "Vistas y Búsqueda",
                  description: "Cambia entre vista de tabla para detalles técnicos o vista de galería para identificar productos visualmente.",
                  icon: Box
                },
                {
                  title: "Reportes PDF",
                  description: "Genera reportes profesionales de todo tu inventario con un solo clic desde el botón de Exportar.",
                  icon: TrendingUp
                }
              ]}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Gestiona productos con vista técnica o galería visual</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-lg backdrop-blur-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            >
              <List size={18} />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 transition-colors" disabled={isExporting}>
                <Download size={16} /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-white/10 bg-background/80 backdrop-blur-xl">
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 focus:bg-primary focus:text-primary-foreground cursor-pointer">
                <FileText size={16} /> Descargar PDF
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  const shareText = `Inventario de ${profile?.business_name || 'mi negocio'}: ${totalCount} productos.`;
                  if (navigator.share) {
                    navigator.share({
                      title: 'Reporte de Inventario',
                      text: shareText,
                      url: window.location.href
                    }).catch(console.error);
                  } else {
                    navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
                      .then(() => toast.success('Copiado al portapapeles'))
                      .catch(() => toast.error('No se pudo copiar al portapapeles'));
                  }
                }} 
                className="gap-2 focus:bg-primary focus:text-primary-foreground cursor-pointer"
              >
                <Share2 size={16} /> Compartir Reporte
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={openCreate} className="gap-1.5 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
            <Plus size={16} /> Nuevo Producto
          </Button>

          <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingProduct(null); clearImage(); } else { setOpen(true); } }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-white/20 shadow-2xl tracking-tight">
              <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-white/5">
                <DialogTitle className="text-xl font-bold">{editingProduct ? 'Editar Producto' : 'Agregar Producto'}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form id="product-form" onSubmit={(e) => { e.preventDefault(); saveProduct.mutate(); }} className="space-y-6">
                {/* Image Upload Zone */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Imagen del producto</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  {imagePreview ? (
                    <div className="relative w-full aspect-video sm:aspect-[21/9] rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner group">
                      <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button type="button" onClick={clearImage} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-destructive hover:scale-110 transition-all z-10 backdrop-blur-md border border-white/10">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-28 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground group"
                    >
                      <Upload size={22} className="group-hover:text-primary transition-colors" />
                      <span className="text-sm">Seleccionar imagen</span>
                      <span className="text-xs opacity-50">JPG, PNG o WebP · máx. 5MB</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-white/5 border-white/10 focus-visible:ring-primary" placeholder="Ej: Camiseta deportiva" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs text-muted-foreground">Descripción Detallada</Label>
                    <textarea 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })} 
                      className="w-full min-h-[100px] bg-white/5 border border-white/10 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      placeholder="Escribe detalles, ingredientes, talles, etc."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="bg-white/5 border-white/10 focus-visible:ring-primary" placeholder="Opcional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Stock Actual</Label>
                    <Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} className="bg-white/5 border-white/10 focus-visible:ring-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Precio Costo</Label>
                    <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required className="bg-white/5 border-white/10 focus-visible:ring-primary" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Precio Venta</Label>
                    <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} required className="bg-white/5 border-white/10 focus-visible:ring-primary" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Categoría</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10 focus:ring-primary">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin categoría</SelectItem>
                        {categoriesList?.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              {cat.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Variants Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-primary">Variantes</Label>
                    <button
                      type="button"
                      onClick={() => setVariants(prev => [...prev, { label: '', value: '', price_adjustment: '0', stock: '0' }])}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20"
                    >
                      <PlusCircle size={14} /> Añadir Variante
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Ej: Talla S, Color Rojo. Opcionales.</p>
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_80px_80px_auto] gap-2 items-end">
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-[10px] text-muted-foreground">Etiqueta</Label>}
                        <Input placeholder="Talla" value={v.label} onChange={(e) => { const updated = [...variants]; updated[i].label = e.target.value; setVariants(updated); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-[10px] text-muted-foreground">Valor</Label>}
                        <Input placeholder="M" value={v.value} onChange={(e) => { const updated = [...variants]; updated[i].value = e.target.value; setVariants(updated); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-[10px] text-muted-foreground">+Precio</Label>}
                        <Input type="number" step="0.01" placeholder="0" value={v.price_adjustment} onChange={(e) => { const updated = [...variants]; updated[i].price_adjustment = e.target.value; setVariants(updated); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-[10px] text-muted-foreground">Stock</Label>}
                        <Input type="number" placeholder="0" value={v.stock} onChange={(e) => { const updated = [...variants]; updated[i].stock = e.target.value; setVariants(updated); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))} className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Gallery Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-primary">Galería de Imágenes</Label>
                    <label className="cursor-pointer">
                      <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        <PlusCircle size={14} /> Añadir Fotos
                      </div>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 rounded-xl border border-white/5 bg-white/5 min-h-[100px]">
                    {existingGallery.map((img) => (
                      <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group border border-white/10">
                        <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeExistingImage(img.id)}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {galleryFiles.map((item, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-primary/20 bg-primary/5">
                        <img src={item.preview} alt="New Gallery" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeGalleryFile(idx)}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {(existingGallery.length === 0 && galleryFiles.length === 0) && (
                      <div className="col-span-full flex flex-col items-center justify-center py-4 text-muted-foreground opacity-50">
                        <ImageIcon size={24} className="mb-1" />
                        <p className="text-[10px] uppercase font-bold tracking-widest">Sin fotos adicionales</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Stock Mínimo</Label>
                    <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="bg-white/5 border-white/10 focus-visible:ring-primary" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 col-span-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Visible en Mi Tienda</Label>
                      <p className="text-xs text-muted-foreground">Mostrar este producto en el catálogo público</p>
                    </div>
                    <span onClick={() => setForm({ ...form, is_public: !form.is_public })} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${form.is_public ? 'bg-primary' : 'bg-muted'}`} role="switch" aria-checked={form.is_public}>
                      <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${form.is_public ? 'translate-x-4' : 'translate-x-0'}`} />
                    </span>
                  </div>
                </div>
                </form>
              </div>
              <div className="p-4 px-6 border-t border-white/5 bg-white/5 flex justify-end gap-3 backdrop-blur-xl">
                <Button 
                  variant="ghost" 
                  onClick={() => setOpen(false)}
                  className="hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  form="product-form" 
                  className="min-w-[140px] shadow-lg shadow-primary/20" 
                  disabled={saveProduct.isPending || uploading}
                >
                  {uploading ? 'Subiendo...' : saveProduct.isPending ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Guardar Producto'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground rounded-xl border border-white/10 bg-card backdrop-blur-md">
          Cargando inventario...
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DataTable 
                columns={columns} 
                data={products || []} 
                searchPlaceholder="Buscar por nombre o SKU..." 
                pageCount={pageCount}
                pageIndex={pageIndex}
                pageSize={pageSize}
                onPageChange={setPageIndex}
              />
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en galería..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPageIndex(0);
                  }}
                  className="pl-9 h-10 bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                />
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-card/50 backdrop-blur-md overflow-hidden">
                  <EmptyState icon={Package} title="Sin productos" description="No se encontraron productos. Agrega tu primer producto para empezar." />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                  {products.map((p: any, i) => {
                    const stock = p.current_stock ?? 0;
                    const min = p.min_stock ?? 5;
                    const isLow = stock <= min;
                    const isOut = stock === 0;

                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="group relative flex flex-col bg-card border border-white/5 rounded-2xl overflow-hidden hover:shadow-card-hover transition-all duration-300 backdrop-blur-xl"
                      >
                        <div className="relative aspect-square w-full bg-black/20 overflow-hidden flex items-center justify-center">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-muted-foreground opacity-20" />
                          )}
                          <div className="absolute top-2 left-2">
                            {p.is_public && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/90 text-primary-foreground backdrop-blur-md shadow-md" title="Visible en Mi Tienda">
                                <Globe size={12} />
                              </span>
                            )}
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md backdrop-blur-md ${
                              isOut ? 'bg-destructive/90 text-white' : isLow ? 'bg-warning/90 text-black' : 'bg-success/90 text-white'
                            }`}>
                              {stock} uds
                            </span>
                          </div>
                          {/* Edit overlay on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-all bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil size={18} />
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-semibold text-foreground truncate text-sm" title={p.name}>{p.name}</h3>
                          {p.categories?.name && (
                            <p className="text-[10px] text-primary/80 font-bold uppercase tracking-wider">{p.categories.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground mb-3 tabular-nums">{p.sku || 'Sin SKU'}</p>
                          <div className="mt-auto flex items-end justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Precio</p>
                              <p className="font-bold text-primary tabular-nums">${Number(p.sale_price).toFixed(2)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all rounded-full"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar "${p.name}"?`)) deleteProduct.mutate(p.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-end space-x-2 py-4 border-t border-white/5">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Página {pageIndex + 1} de {pageCount || 1}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
                      disabled={pageIndex === 0}
                      className="border-white/10 bg-background/50 hover:bg-white/10"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageIndex(prev => prev + 1)}
                      disabled={pageIndex >= pageCount - 1}
                      className="border-white/10 bg-background/50 hover:bg-white/10"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
