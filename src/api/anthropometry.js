import api from './client';

export const getAnthropometryByTeam = (teamId) => api.get(`/anthropometry/team/${teamId}`);
export const getAnthropometryByPlayer = (playerId) => api.get(`/anthropometry/player/${playerId}`);
export const getAnthropometryHistory = (playerId, params) =>
  api.get(`/anthropometry/player/${playerId}/history`, { params });
export const getAnthropometryPDF = (playerId, params) =>
  api.get(`/anthropometry/player/${playerId}/pdf`, { params, responseType: 'blob' });
export const getAnthropometry = (id) => api.get(`/anthropometry/${id}`);
export const createAnthropometry = (payload) => api.post('/anthropometry/create', payload);
export const updateAnthropometry = (id, payload) => api.post(`/anthropometry/${id}`, payload);
export const deleteAnthropometry = (id) => api.delete(`/anthropometry/${id}`);
