import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePublicStoreProfile(slug: string | undefined) {
  return useQuery<any, Error>({
    queryKey: ['public-store', slug],
    queryFn: async () => {
      const normalizedSlug = slug?.toLowerCase().trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('store_slug', normalizedSlug)
        .eq('store_public', true)
        .maybeSingle();
        
      if (error) throw error;
      if (!data) throw new Error('Tienda no encontrada.');
      return data;
    },
    retry: 1,
    enabled: !!slug,
  });
}

export function usePublicStoreProducts(profileId: string | undefined) {
  const PAGE_SIZE = 12;
  
  return useInfiniteQuery<any[], Error>({
    queryKey: ['public-products', profileId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name), product_images(image_url), product_variants(*)')
        .eq('user_id', profileId!)
        .eq('is_public', true)
        .order('name')
        .range(from, to);
        
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    initialPageParam: 0,
    enabled: !!profileId,
  });
}
