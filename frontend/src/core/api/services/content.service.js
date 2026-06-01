import apiClient from '../client';

const BASE_PATH = '/api/v1/content';

export const CONTENT_TYPES = {
  heroBanners: 'hero-banners',
  featuredHotels: 'featured-hotels',
  destinations: 'destinations',
  offers: 'offers',
  memberships: 'memberships',
  about: 'about',
  footer: 'footer',
  siteSettings: 'site-settings',
};

const getContent = (type) => apiClient.get(`${BASE_PATH}/${type}`);

export const getHeroBanners = () => getContent(CONTENT_TYPES.heroBanners);
export const getFeaturedHotels = () => getContent(CONTENT_TYPES.featuredHotels);
export const getDestinations = () => getContent(CONTENT_TYPES.destinations);
export const getOffers = () => getContent(CONTENT_TYPES.offers);
export const getMemberships = () => getContent(CONTENT_TYPES.memberships);
export const getAboutContent = () => getContent(CONTENT_TYPES.about);
export const getFooterContent = () => getContent(CONTENT_TYPES.footer);
export const getSiteSettings = () => getContent(CONTENT_TYPES.siteSettings);

export const getAdminContent = (type, params = {}) => (
  apiClient.get(`${BASE_PATH}/${type}/admin`, { params })
);

export const createContent = (type, data) => apiClient.post(`${BASE_PATH}/${type}`, data);

export const updateContent = (type, id, data) => apiClient.put(`${BASE_PATH}/${type}/${id}`, data);

export const deleteContent = (type, id) => apiClient.delete(`${BASE_PATH}/${type}/${id}`);

export const publishContent = (type, id) => apiClient.patch(`${BASE_PATH}/${type}/${id}/publish`);

export const unpublishContent = (type, id) => apiClient.patch(`${BASE_PATH}/${type}/${id}/unpublish`);

export const reorderContent = (type, items) => apiClient.patch(`${BASE_PATH}/${type}/reorder`, { items });

/** Returns approved+active hotels for the FeaturedHotels picker (superadmin only). */
export const getApprovedHotels = () =>
  apiClient.get(`${BASE_PATH}/featured-hotels/approved-hotels`);
