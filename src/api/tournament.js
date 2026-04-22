import api from './client';

export const getTournamentsByTeam = (teamId) => api.get(`/tournament/equipo/${teamId}`);
export const getTournament = (id) => api.get(`/tournament/${id}`);
export const getTournamentSanctions = (id) => api.get(`/tournament/${id}/sanctions`);
export const createTournament = (payload) => api.post('/tournament/create', payload);
export const updateTournament = (id, payload) => api.post(`/tournament/${id}`, payload);
export const deleteTournament = (id) => api.delete(`/tournament/${id}`);
