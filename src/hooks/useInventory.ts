import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useInventory(user: any, pageIndex: number, pageSize: number, searchQuery: string) {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', user?.id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const productsQuery = useQuery({
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

  const deleteProductMutation = useMutation({
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

  return {
    profile: profileQuery.data,
    categoriesList: categoriesQuery.data,
    productsData: productsQuery.data,
    isLoading: productsQuery.isLoading,
    deleteProduct: deleteProductMutation,
    queryClient
  };
}

export const uploadProductImage = async (imageFile: File, userId: string): Promise<string> => {
  const ext = imageFile.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(fileName, imageFile);
  if (error) throw new Error('Error subiendo imagen: ' + error.message);
  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
  return publicUrl;
};
