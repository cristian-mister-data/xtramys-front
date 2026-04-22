import api from './client';

export const getSeason = (id) => api.get(`/season/${id}`);
export const getSeasonsByUser = (userId) => api.get(`/season/user/${userId}`);
export const getSelectedSeasons = (userId) => api.get(`/season/selected/${userId}`);
export const createSeason = (payload) => api.post('/season/create', payload);
export const createSeasonAndTeam = (payload) => api.post('/season/createSeasonTeam', payload);
export const updateSeason = (id, payload) => api.post(`/season/${id}`, payload);
export const selectSeason = (id, userId) => api.post(`/season/id/${id}/user/${userId}`);
export const deleteSeason = (id) => api.delete(`/season/${id}`);
