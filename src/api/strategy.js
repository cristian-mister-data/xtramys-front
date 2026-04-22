import api from './client';

// Estrategias
export const getAllStrategies = () => api.get('/strategy/all');
export const getGlobalStrategies = () => api.get('/strategy/global');
export const getStrategy = (id) => api.get(`/strategy/${id}`);
export const getMyStrategies = (userId) => api.get(`/strategy/user/${userId}`);
export const getStrategiesBySeason = (seasonId) => api.get(`/strategy/season/${seasonId}`);
export const createStrategy = (payload) => api.post('/strategy/create', payload);
export const updateStrategy = (id, payload) => api.post(`/strategy/${id}`, payload);
export const deleteStrategy = (id) => api.delete(`/strategy/${id}`);

// Tipos
export const getStrategyType = (id) => api.get(`/strategyType/${id}`);
export const getStrategyTypes = (userId) => api.get(`/strategyType/user/${userId}`);
export const createStrategyType = (payload) => api.post('/strategyType/create', payload);
export const updateStrategyType = (id, payload) => api.post(`/strategyType/${id}`, payload);
export const deleteStrategyType = (id) => api.delete(`/strategyType/${id}`);

// Carpetas
export const getStrategyFolders = () => api.get('/strategy-folder');
export const getStrategyFoldersFlat = () => api.get('/strategy-folder/flat');
export const getStrategyFolder = (id) => api.get(`/strategy-folder/${id}`);
export const createStrategyFolder = (payload) => api.post('/strategy-folder', payload);
export const updateStrategyFolder = (id, payload) => api.put(`/strategy-folder/${id}`, payload);
export const deleteStrategyFolder = (id) => api.delete(`/strategy-folder/${id}`);
export const moveStrategyToFolder = (payload) => api.post('/strategy-folder/move-strategy', payload);
export const duplicateStrategyToFolder = (payload) =>
  api.post('/strategy-folder/duplicate-strategy', payload);
export const duplicateGlobalStrategy = (payload) =>
  api.post('/strategy-folder/duplicate-global', payload);
