import api from './client';

export const getOpponentMatchReports = (teamId) => api.get(`/opponent-match-report/team/${teamId}`);
export const createOpponentMatchReport = (payload) => api.post('/opponent-match-report', payload);
export const updateOpponentMatchReport = (id, payload) => api.put(`/opponent-match-report/${id}`, payload);
export const deleteOpponentMatchReport = (id) => api.delete(`/opponent-match-report/${id}`);
