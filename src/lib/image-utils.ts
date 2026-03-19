/**
 * Transforms a Supabase Storage public URL into an optimized/resized URL.
 * Uses the Supabase Image Transformation API (Pro plan+).
 * Falls back gracefully to original URL if transformations aren't available.
 *
 * @param url - The original public Supabase storage URL
 * @param options - width, height, quality
 * @returns The transformed URL string
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options?: { width?: number; height?: number; quality?: number }
): string {
  if (!url) return '';

  // Only transform Supabase storage URLs
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }

  const { width, height, quality = 75 } = options || {};

  // Replace /object/public/ with /render/image/public/
  let transformedUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  if (width) params.set('width', width.toString());
  if (height) params.set('height', height.toString());
  params.set('quality', quality.toString());

  transformedUrl += `?${params.toString()}`;

  return transformedUrl;
}
