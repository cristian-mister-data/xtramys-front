import api from './client';

export const getSession = (id) => api.get(`/session/${id}`);
export const getSessionsByTeam = (teamId) => api.get(`/session/team/${teamId}`);
export const createSession = (payload) => api.post('/session/create', payload);
export const createSessionsBulk = (payload) => api.post('/session/team/create', payload);
export const updateSession = (id, payload) => api.post(`/session/${id}`, payload);
export const deleteSession = (id) => api.delete(`/session/${id}`);
const pdfRequest = (url, file, filename) => api.post(url, file, {
  headers: { 'Content-Type': 'application/pdf' },
  params: { filename: filename || file?.name || 'sesion-entrenamiento.pdf' },
  timeout: 180000,
});

export const uploadSessionPdf = (id, file, filename) => pdfRequest(`/session/${id}/pdf`, file, filename);
export const getSessionPdf = (id) => api.get(`/session/${id}/pdf`, { responseType: 'blob', skipCache: true });
