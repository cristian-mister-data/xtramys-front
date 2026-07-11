import api from './client';

export const getPlayersByTeam = (teamId) => api.get(`/player/team/${teamId}`);
export const getPlayersByUser = (userId) => api.get(`/player/${userId}`);
export const getPlayerStats = (id) => api.get(`/player/stats/${id}`);
export const createPlayer = (payload) => api.post('/player/create', payload);
export const updatePlayer = (id, payload) => api.post(`/player/${id}`, payload);
export const deletePlayer = (id) => api.delete(`/player/${id}`);
export const deactivatePlayer = (id, motivo = '') => api.post(`/player/${id}/deactivate`, { motivo });
export const activatePlayer = (id) => api.post(`/player/${id}/activate`);
