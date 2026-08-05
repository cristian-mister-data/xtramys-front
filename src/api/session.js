import api from './client';

export const getSession = (id) => api.get(`/session/${id}`);
export const getSessionsByTeam = (teamId) => api.get(`/session/team/${teamId}`);
export const createSession = (payload) => api.post('/session/create', payload);
export const createSessionsBulk = (payload) => api.post('/session/team/create', payload);
export const updateSession = (id, payload) => api.post(`/session/${id}`, payload);
export const deleteSession = (id) => api.delete(`/session/${id}`);
export const uploadSessionPdf = (id, payload) => api.post(`/session/${id}/pdf`, payload);
export const getSessionPdf = (id) => api.get(`/session/${id}/pdf`, { responseType: 'blob', skipCache: true });
export const analyzeSessionPdf = (payload) => api.post('/session/import/analyze', payload, { timeout: 180000 });
