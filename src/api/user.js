import api from './client';

export const getUser = (id) => api.get(`/user/${id}`);
export const updateUser = (id, payload) => api.post(`/user/${id}`, payload);
export const uploadUserImage = (id, formData) =>
  api.post(`/user/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteUserImage = (id) => api.delete(`/user/${id}/image`);
