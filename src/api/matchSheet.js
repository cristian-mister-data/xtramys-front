import api from './client';

export const getMatchSheetsByTeam = (teamId) => api.get(`/match-sheet/equipo/${teamId}`);
export const getMatchSheet = (id) => api.get(`/match-sheet/${id}`);
export const createMatchSheet = (payload) => api.post('/match-sheet/create', payload);
export const updateMatchSheet = (id, payload) => api.post(`/match-sheet/${id}`, payload);
export const deleteMatchSheet = (id) => api.delete(`/match-sheet/${id}`);
