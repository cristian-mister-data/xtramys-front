import api from './client';

// Análisis de rivales
export const getRivalAnalyses = () => api.get('/rival-analysis');
export const getRivalAnalysesByTeam = (teamId) => api.get(`/rival-analysis/team/${teamId}`);
export const getRivalAnalysis = (id) => api.get(`/rival-analysis/${id}`);
export const createRivalAnalysis = (payload) => api.post('/rival-analysis/create', payload);
export const updateRivalAnalysis = (id, payload) => api.post(`/rival-analysis/${id}`, payload);
export const deleteRivalAnalysis = (id) => api.delete(`/rival-analysis/${id}`);

// Plantillas
export const getRecommendedTemplates = () => api.get('/rival-analysis-template/recommended');
export const getUserTemplates = (userId) => api.get(`/rival-analysis-template/user/${userId}`);
export const getActiveTemplate = (userId) => api.get(`/rival-analysis-template/active/${userId}`);
export const getTemplate = (id) => api.get(`/rival-analysis-template/${id}`);
export const createTemplate = (payload) => api.post('/rival-analysis-template/create', payload);
export const createTemplateFromRecommended = (payload) =>
  api.post('/rival-analysis-template/create-from-recommended', payload);
export const updateTemplate = (id, payload) => api.put(`/rival-analysis-template/${id}`, payload);
export const setTemplateDefault = (id) => api.put(`/rival-analysis-template/${id}/set-default`);
export const addTemplateQuestion = (id, payload) =>
  api.post(`/rival-analysis-template/${id}/question`, payload);
export const updateTemplateQuestion = (id, questionId, payload) =>
  api.put(`/rival-analysis-template/${id}/question/${questionId}`, payload);
export const deleteTemplateQuestion = (id, questionId) =>
  api.delete(`/rival-analysis-template/${id}/question/${questionId}`);
export const reorderTemplateQuestions = (id, payload) =>
  api.put(`/rival-analysis-template/${id}/reorder`, payload);
export const deleteTemplate = (id) => api.delete(`/rival-analysis-template/${id}`);

// Rivales
export const getRival = (id) => api.get(`/rival/${id}`);
export const getRivalsByTeam = (teamId) => api.get(`/rival/team/${teamId}`);
export const getRivalsByUser = (userId) => api.get(`/rival/user/${userId}`);
export const createRival = (payload) => api.post('/rival/create', payload);
export const updateRival = (id, payload) => api.post(`/rival/${id}`, payload);
export const deleteRival = (id) => api.delete(`/rival/${id}`);
