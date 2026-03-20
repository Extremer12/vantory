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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { DataTable } from '@/components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { generateInventoryPDF } from '@/lib/pdf-generator';
import { SectionHelp } from '@/components/SectionHelp';
import { EmptyState } from '@/components/EmptyState';
import { ImageCropper } from '@/components/ImageCropper';

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

  // Cropper State
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isGalleryCrop, setIsGalleryCrop] = useState(false);

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

  const filteredProducts = useMemo(() => products, [products]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten archivos de imagen'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }
    
    setIsGalleryCrop(false);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCroppingImage(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const fileName = isGalleryCrop ? `gallery_${Date.now()}.jpg` : `product_${Date.now()}.jpg`;
    const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
    
    if (isGalleryCrop) {
      setGalleryFiles(prev => [...prev, {
        file: croppedFile,
        preview: URL.createObjectURL(croppedBlob)
      }]);
    } else {
      setImageFile(croppedFile);
      setImagePreview(URL.createObjectURL(croppedBlob));
    }
    
    setIsCropping(false);
    setCroppingImage(null);
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
    if (files.length === 0) return;
    
    // We'll crop them one by one if multiple are selected, or just the first one for now
    // For simplicity and better UX, we'll just handle the first one if multiple are picked
    const file = files[0];
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    
    setIsGalleryCrop(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCroppingImage(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
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
      if (imageFile) imageUrl = await uploadImage();

      let categoryId: string | null = null;
      if (form.category.trim() && form.category !== '__none__') categoryId = form.category.trim();

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
        const { data, error } = await supabase.from('products').insert({ ...productData, user_id: user!.id }).select().single();
        if (error) throw error;
        finalProductId = data.id;
      }

      if (removedGalleryIds.length > 0) await supabase.from('product_images').delete().in('id', removedGalleryIds);

      for (const item of galleryFiles) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${user!.id}/${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('product-images').upload(fileName, item.file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(uploadData.path);
        await supabase.from('product_images').insert({ product_id: finalProductId, user_id: user!.id, image_url: publicUrlData.publicUrl });
      }

      if (existingVariantIds.length > 0) await supabase.from('product_variants').delete().in('id', existingVariantIds);
      if (variants.length > 0) {
        const variantRows = variants.filter(v => v.label.trim() && v.value.trim()).map(v => ({
          product_id: finalProductId,
          user_id: user!.id,
          variant_label: v.label.trim(),
          variant_value: v.value.trim(),
          price_adjustment: parseFloat(v.price_adjustment) || 0,
          stock: parseInt(v.stock) || 0,
        }));
        if (variantRows.length > 0) await supabase.from('product_variants').insert(variantRows);
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
            {row.original.is_public && <Globe className="w-3.5 h-3.5 text-primary" title="Visible en Mi Tienda" />}
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => {
            if (window.confirm(`¿Eliminar "${row.original.name}"?`)) deleteProduct.mutate(row.original.id);
          }}>
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

          <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingProduct(null); clearImage(); } else { setOpen(true); } }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-white/20 shadow-2xl tracking-tight bg-background/95 backdrop-blur-xl">
              <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-white/5">
                <DialogTitle className="text-xl font-bold">{editingProduct ? 'Editar Producto' : 'Agregar Producto'}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form id="product-form" onSubmit={(e) => { e.preventDefault(); saveProduct.mutate(); }} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Imagen del producto</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  {imagePreview ? (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner group">
                      <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <button type="button" onClick={clearImage} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-destructive hover:scale-110 transition-all z-10 backdrop-blur-md border border-white/10"><X size={16} /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground group">
                      <Upload size={22} className="group-hover:text-primary" />
                      <span className="text-sm">Seleccionar imagen principal</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2"><Label className="text-xs text-muted-foreground">Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-white/5 border-white/10" placeholder="Ej: Camiseta deportiva" /></div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs text-muted-foreground">Descripción</Label>
                    <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full min-h-[80px] bg-white/5 border border-white/10 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" placeholder="Escribe detalles del producto aquí..." />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Stock Actual</Label><Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Precio Costo</Label><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Precio Venta</Label><Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} required className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Categoría</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Categoría" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin categoría</SelectItem>
                        {categoriesList?.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              {cat.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-primary">Variantes</Label>
                    <button type="button" onClick={() => setVariants(prev => [...prev, { label: '', value: '', price_adjustment: '0', stock: '0' }])} className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20"><PlusCircle size={14} /> Añadir</button>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_70px_70px_auto] gap-2 items-end">
                      <Input placeholder="Talla" value={v.label} onChange={(e) => { const u = [...variants]; u[i].label = e.target.value; setVariants(u); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      <Input placeholder="M" value={v.value} onChange={(e) => { const u = [...variants]; u[i].value = e.target.value; setVariants(u); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      <Input type="number" placeholder="0" value={v.price_adjustment} onChange={(e) => { const u = [...variants]; u[i].price_adjustment = e.target.value; setVariants(u); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      <Input type="number" placeholder="0" value={v.stock} onChange={(e) => { const u = [...variants]; u[i].stock = e.target.value; setVariants(u); }} className="bg-white/5 border-white/10 h-9 text-sm" />
                      <Button size="icon" variant="ghost" onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))} className="h-9 w-9 hover:text-destructive"><X size={14} /></Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-primary">Galería de Fotos</Label>
                    <label className="cursor-pointer">
                      <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                      <div className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20"><PlusCircle size={14} /> Subir fotos</div>
                    </label>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-2 rounded-xl border border-white/5 bg-white/5 min-h-[60px]">
                    {existingGallery.map((img) => (
                      <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group border border-white/10">
                        <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
                        <button onClick={() => removeExistingImage(img.id)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={10} /></button>
                      </div>
                    ))}
                    {galleryFiles.map((item, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-primary/20 bg-primary/5">
                        <img src={item.preview} alt="New" className="w-full h-full object-cover" />
                        <button onClick={() => removeGalleryFile(idx)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Alerta Stock Bajo</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 col-span-2">
                    <div className="space-y-0.5"><Label className="text-sm font-medium">Publicar en Mi Tienda</Label></div>
                    <span onClick={() => setForm({ ...form, is_public: !form.is_public })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_public ? 'bg-primary' : 'bg-muted'} cursor-pointer`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition ${form.is_public ? 'translate-x-4' : 'translate-x-0'}`} />
                    </span>
                  </div>
                </div>
                </form>
              </div>
              <div className="p-4 px-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" form="product-form" disabled={saveProduct.isPending || uploading}>{uploading ? 'Procesando...' : editingProduct ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground rounded-xl border border-white/10 bg-card">Cargando inventario...</div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><DataTable columns={columns} data={products} searchPlaceholder="Buscar..." pageCount={pageCount} pageIndex={pageIndex} pageSize={pageSize} onPaginationChange={(idx, size) => { setPageIndex(idx); setPageSize(size); }} onSearchChange={setSearchQuery} /></motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => (
                <div key={p.id} className="group relative bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                  <div className="aspect-square overflow-hidden relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-white/[0.02] flex items-center justify-center"><Package size={40} className="text-muted-foreground opacity-20" /></div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-primary" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-destructive" onClick={() => { if (window.confirm(`¿Eliminar ${p.name}?`)) deleteProduct.mutate(p.id); }}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-foreground truncate">{p.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground font-mono">{p.sku || 'SIN SKU'}</span>
                        {p.categories?.name && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">{p.categories.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Precio</span>
                        <span className="text-lg font-black text-primary">${Number(p.sale_price).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right">Stock</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${p.current_stock === 0 ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]' : p.current_stock <= (p.min_stock || 5) ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                          <span className="font-black tabular-nums">{p.current_stock}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && <div className="col-span-full py-20"><EmptyState icon={Package} title="No hay productos" description="Tu inventario está vacío. Comienza agregando tu primer producto." actionLabel="Nuevo Producto" onAction={openCreate} /></div>}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {isCropping && croppingImage && (
        <ImageCropper 
          image={croppingImage} 
          onCropComplete={handleCropComplete} 
          onCancel={() => { setIsCropping(false); setCroppingImage(null); }} 
        />
      )}
    </div>
  );
}
