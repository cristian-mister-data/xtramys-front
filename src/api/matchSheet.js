import api from './client';

export const getMatchSheetsByTeam = (teamId) => api.get(`/match-sheet/equipo/${teamId}`);
export const getMatchSheet = (id) => api.get(`/match-sheet/${id}`, { skipCache: true });
export const createMatchSheet = (payload) => api.post('/match-sheet/create', payload);
export const updateMatchSheet = (id, payload) => api.post(`/match-sheet/${id}`, payload);
export const deleteMatchSheet = (id) => api.delete(`/match-sheet/${id}`);
export const createFullMatchSheetShareLink = (id) => api.post(`/match-sheet/${id}/full-share-link`);
export const getPublicMatchSheet = (token) => api.get(`/match-sheet/public/${token}`, { skipCache: true });
