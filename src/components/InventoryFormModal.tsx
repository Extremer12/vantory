import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadProductImage } from '@/hooks/useInventory';
import { ImageCropper } from '@/components/ImageCropper';

const emptyForm = { name: '', sku: '', cost_price: '', sale_price: '', current_stock: '0', min_stock: '5', is_public: true, category: '', description: '' };

interface InventoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: any | null;
  user: any;
  categoriesList: any[];
}

export function InventoryFormModal({
  open,
  onOpenChange,
  editingProduct,
  user,
  categoriesList
}: InventoryFormModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    if (open) {
      if (editingProduct) {
        setForm({
          name: editingProduct.name,
          sku: editingProduct.sku || '',
          cost_price: String(editingProduct.cost_price),
          sale_price: String(editingProduct.sale_price),
          current_stock: String(editingProduct.current_stock ?? 0),
          min_stock: String(editingProduct.min_stock ?? 5),
          is_public: editingProduct.is_public ?? true,
          category: editingProduct.category_id || '',
          description: editingProduct.description || '',
        });
        setImagePreview(editingProduct.image_url || null);
        setImageFile(null);
        setExistingGallery(editingProduct.product_images || []);
        setGalleryFiles([]);
        setRemovedGalleryIds([]);
        
        supabase.from('product_variants').select('*').eq('product_id', editingProduct.id).then(({ data }) => {
          if (data && data.length > 0) {
            setVariants(data.map((v: any) => ({ label: v.variant_label, value: v.variant_value, price_adjustment: String(v.price_adjustment || 0), stock: String(v.stock || 0) })));
            setExistingVariantIds(data.map((v: any) => v.id));
          } else {
            setVariants([]);
            setExistingVariantIds([]);
          }
        });
      } else {
        setForm(emptyForm);
        clearImage();
        setGalleryFiles([]);
        setExistingGallery([]);
        setRemovedGalleryIds([]);
        setVariants([]);
        setExistingVariantIds([]);
      }
    }
  }, [open, editingProduct]);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
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
      if (imageFile) imageUrl = await uploadProductImage(imageFile, user.id);

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
        const publicUrl = await uploadProductImage(item.file, user.id);
        await supabase.from('product_images').insert({ product_id: finalProductId, user_id: user!.id, image_url: publicUrl });
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
      onOpenChange(false);
      setUploading(false);
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto agregado');
    },
    onError: (err: any) => {
      setUploading(false);
      toast.error(err.message);
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                  <Button size="icon" variant="ghost" type="button" onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))} className="h-9 w-9 hover:text-destructive"><X size={14} /></Button>
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
                    <button type="button" onClick={() => removeExistingImage(img.id)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={10} /></button>
                  </div>
                ))}
                {galleryFiles.map((item, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-primary/20 bg-primary/5">
                    <img src={item.preview} alt="New" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeGalleryFile(idx)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100"><X size={10} /></button>
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
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="product-form" disabled={saveProduct.isPending || uploading}>{uploading ? 'Procesando...' : editingProduct ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isCropping && croppingImage && (
        <ImageCropper 
          image={croppingImage} 
          onCropComplete={handleCropComplete} 
          onCancel={() => { setIsCropping(false); setCroppingImage(null); }} 
        />
      )}
    </>
  );
}
