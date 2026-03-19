import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Tag, Check, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#64748b', '#78716c',
];

export default function CategoriesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Count products per category
  const { data: productCounts } = useQuery({
    queryKey: ['category-product-counts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category_id')
        .eq('user_id', user?.id);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error('El nombre es requerido');
      const { error } = await supabase.from('categories').insert({
        user_id: user!.id,
        name: newName.trim(),
        color: newColor,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      toast.success('Categoría creada');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      if (!name.trim()) throw new Error('El nombre es requerido');
      const { error } = await supabase.from('categories').update({
        name: name.trim(),
        color,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingId(null);
      toast.success('Categoría actualizada');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // First unlink products
      await supabase.from('products').update({ category_id: null } as any).eq('category_id', id);
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Categoría eliminada');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || PRESET_COLORS[0]);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Categorías</h1>
        <p className="text-sm text-muted-foreground mt-1">Organiza tus productos en categorías con colores.</p>
      </div>

      {/* Create Form */}
      <div className="bg-card border border-white/5 shadow-xl rounded-2xl p-5 backdrop-blur-xl">
        <form 
          onSubmit={(e) => { e.preventDefault(); createCategory.mutate(); }}
          className="flex flex-col sm:flex-row items-end gap-3"
        >
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre de la categoría</label>
            <Input
              placeholder="Ej: Maquillaje, Tecnología..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-white/5 border-white/10 focus-visible:ring-primary h-10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-lg transition-all duration-200 border-2 ${newColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={!newName.trim() || createCategory.isPending}
            className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 shrink-0"
          >
            <Plus size={16} className="mr-1.5" /> Crear
          </Button>
        </form>
      </div>

      {/* Category List */}
      <div className="bg-card border border-white/5 shadow-xl rounded-2xl backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">Cargando categorías...</div>
        ) : !categories || categories.length === 0 ? (
          <EmptyState icon={Tag} title="Sin categorías" description="Crea tu primera categoría para organizar tu inventario." />
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatePresence>
              {categories.map((cat: any) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  {editingId === cat.id ? (
                    /* Edit Mode */
                    <>
                      <div
                        className="w-5 h-5 rounded-md shrink-0 border border-white/20"
                        style={{ backgroundColor: editColor }}
                      />
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-white/5 border-white/10 h-9 text-sm flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`w-5 h-5 rounded transition-all ${editColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-background scale-110' : 'hover:scale-110'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateCategory.mutate({ id: cat.id, name: editName, color: editColor })}
                          className="h-8 w-8 text-success hover:bg-success/10 rounded-lg"
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="h-8 w-8 text-muted-foreground hover:bg-white/5 rounded-lg"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* View Mode */
                    <>
                      <div
                        className="w-5 h-5 rounded-md shrink-0 border border-white/10 shadow-inner"
                        style={{ backgroundColor: (cat as any).color || '#64748b' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 shrink-0">
                        <Package size={12} />
                        {productCounts?.[cat.id] || 0}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(cat)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('¿Eliminar esta categoría? Los productos se desvincularán pero no se borrarán.')) {
                              deleteCategory.mutate(cat.id);
                            }
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
