import api from './client';

export const getTeam = (id) => api.get(`/team/${id}`);
export const getTeamsBySeason = (seasonId) => api.get(`/team/season/${seasonId}`);
export const getPreviousSeasonTeams = (seasonId, userId) =>
  api.get(`/team/previous-season/${seasonId}/${userId}`);
export const createTeam = (payload) => api.post('/team/create', payload);
export const createTeamWithPlayers = (payload) => api.post('/team/create-with-players', payload);
export const updateTeam = (id, payload) => api.post(`/team/${id}`, payload);
export const selectTeam = (id, seasonId) =>
  api.post(`/team/select/${id}`, { temporada: seasonId });
export const deleteTeam = (id) => api.delete(`/team/${id}`);
export const deleteTeamWithData = (id) => api.delete(`/team/with-data/${id}`);
