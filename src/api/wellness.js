import api, { apiBase } from './client';

// === Wellness POST-sesión ===
// Públicas
export const getWellnessFormDataPublic = (token) =>
  api.get(`/wellness/public/form/${token}`);
export const getWellnessAvailablePlayersPublic = (token) =>
  api.get(`/wellness/public/available-players/${token}`);
export const submitWellnessPublic = (token, payload) =>
  api.post(`/wellness/public/submit/${token}`, payload);

// Protegidas
export const getWellnessSession = (sessionId) => api.get(`/wellness/session/${sessionId}`);
export const getWellnessRange = (params) => api.get('/wellness/range', { params });
export const getWellnessByPlayer = (playerId) => api.get(`/wellness/player/${playerId}`);
export const updateWellnessSession = (sessionId, payload) =>
  api.put(`/wellness/session/${sessionId}`, payload);
export const generateWellnessLink = (sessionId, payload) =>
  api.post(`/wellness/session/${sessionId}/generate-link`, payload);
export const toggleWellnessLink = (sessionId, payload) =>
  api.post(`/wellness/session/${sessionId}/toggle-link`, payload);
export const deleteWellnessResponse = (responseId) =>
  api.delete(`/wellness/response/${responseId}`);

// Plantillas
export const getWellnessTemplates = (params) => api.get('/wellness-template', { params });
export const getDefaultWellnessTemplate = (type) => api.get(`/wellness-template/default/${type}`);
export const getWellnessTemplate = (id) => api.get(`/wellness-template/${id}`);
export const createWellnessTemplate = (payload) => api.post('/wellness-template', payload);
export const duplicateWellnessTemplate = (id) =>
  api.post(`/wellness-template/${id}/duplicate`);
export const setWellnessTemplateDefault = (id) =>
  api.post(`/wellness-template/${id}/set-default`);
export const updateWellnessTemplate = (id, payload) =>
  api.put(`/wellness-template/${id}`, payload);
export const deleteWellnessTemplate = (id) => api.delete(`/wellness-template/${id}`);

// === PreWellness ===
export const getPreWellnessFormDataPublic = (token) =>
  apiBase.get(`/prewellness/public/form/${token}`);
export const getPreWellnessAvailablePlayersPublic = (token) =>
  apiBase.get(`/prewellness/public/available-players/${token}`);
export const submitPreWellnessPublic = (token, payload) =>
  apiBase.post(`/prewellness/public/submit/${token}`, payload);

export const getPreWellnessSession = (sessionId) =>
  api.get(`/prewellness/session/${sessionId}`);
export const getPreWellnessRange = (params) =>
  api.get('/prewellness/range', { params });
export const getPreWellnessByPlayer = (playerId) =>
  api.get(`/prewellness/player/${playerId}`);
export const updatePreWellnessSession = (sessionId, payload) =>
  api.put(`/prewellness/session/${sessionId}`, payload);
export const generatePreWellnessLink = (sessionId, payload) =>
  api.post(`/prewellness/session/${sessionId}/generate-link`, payload);
export const togglePreWellnessLink = (sessionId, payload) =>
  api.post(`/prewellness/session/${sessionId}/toggle-link`, payload);
export const deletePreWellnessResponse = (responseId) =>
  api.delete(`/prewellness/response/${responseId}`);
