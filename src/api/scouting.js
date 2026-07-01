import api from './client';

export const getScoutingReports = (params = {}) => api.get('/scouting', { params });
export const getScoutingReport = (id) => api.get(`/scouting/${id}`);
export const createScoutingReport = (payload) => api.post('/scouting/create', payload);
export const updateScoutingReport = (id, payload) => api.post(`/scouting/${id}`, payload);
export const deleteScoutingReport = (id) => api.delete(`/scouting/${id}`);
