import api from './client';

export const shareContent = (payload) => api.post('/shared-content/share', payload);
export const updateSharing = (id, payload) => api.put(`/shared-content/${id}`, payload);
export const unshareContent = (id) => api.delete(`/shared-content/${id}`);
export const getSharedWithMe = (contentType) => api.get('/shared-content/shared-with-me', { params: { contentType } });
export const getSharingDetails = (contentType, contentId) => api.get(`/shared-content/${contentType}/${contentId}`);
