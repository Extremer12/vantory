export interface StoreProfileData {
  businessName: string;
  storeSlug: string;
  description: string;
  isPublic: boolean;
  whatsapp: string;
  theme: 'light' | 'dark';
  primaryColor: string;
  carouselRatio: string;
  bannerText: string;
  headerStyle: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  storeEmail: string;
  storeAddress: string;
  seoTitle: string;
  seoDescription: string;
  fontFamily: string;
  buttonRadius: string;
}

export const initialStoreProfileData: StoreProfileData = {
  businessName: '',
  storeSlug: '',
  description: '',
  isPublic: false,
  whatsapp: '',
  theme: 'dark',
  primaryColor: '#000000',
  carouselRatio: 'panoramic',
  bannerText: '',
  headerStyle: 'classic',
  instagram: '',
  facebook: '',
  tiktok: '',
  storeEmail: '',
  storeAddress: '',
  seoTitle: '',
  seoDescription: '',
  fontFamily: 'Inter',
  buttonRadius: 'xl',
};
