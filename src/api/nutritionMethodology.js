import api from './client';

// Nutrition (legacy un plan + multi-plan nuevo)
export const getNutritionByUser = (userId) => api.get(`/nutrition/user/${userId}`);
export const createNutrition = (payload) => api.post('/nutrition', payload);
export const updateNutritionByUser = (userId, payload) => api.put(`/nutrition/user/${userId}`, payload);
export const updateNutritionPreseason = (userId, payload) =>
  api.put(`/nutrition/user/${userId}/preseason`, payload);
export const updateNutritionSeason = (userId, payload) =>
  api.put(`/nutrition/user/${userId}/season`, payload);
export const updateNutritionReference = (userId, payload) =>
  api.put(`/nutrition/user/${userId}/reference`, payload);
export const deleteNutritionByUser = (userId) => api.delete(`/nutrition/user/${userId}`);

export const getAllNutritionPlans = (userId) => api.get(`/nutrition/all/user/${userId}`);
export const getNutritionPlan = (id) => api.get(`/nutrition/${id}`);
export const updateNutritionPlan = (id, payload) => api.put(`/nutrition/${id}`, payload);
export const duplicateNutritionPlan = (id) => api.post(`/nutrition/${id}/duplicate`);
export const deleteNutritionPlan = (id) => api.delete(`/nutrition/${id}`);

// Methodology
export const getMethodologies = (userId) => api.get(`/methodology/user/${userId}`);
export const getMethodology = (id) => api.get(`/methodology/${id}`);
export const createMethodology = (payload) => api.post('/methodology', payload);
export const updateMethodology = (id, payload) => api.put(`/methodology/${id}`, payload);
export const updateMethodologyCategory = (id, categoryId, payload) =>
  api.put(`/methodology/${id}/category/${categoryId}`, payload);
export const duplicateMethodology = (id) => api.post(`/methodology/${id}/duplicate`);
export const deleteMethodology = (id) => api.delete(`/methodology/${id}`);

// Goalkeeper Methodology
export const getGkMethodologies = (userId) => api.get(`/goalkeeper-methodology/user/${userId}`);
export const getGkMethodology = (id) => api.get(`/goalkeeper-methodology/${id}`);
export const createGkMethodology = (payload) => api.post('/goalkeeper-methodology', payload);
export const updateGkMethodology = (id, payload) =>
  api.put(`/goalkeeper-methodology/${id}`, payload);
export const duplicateGkMethodology = (id) => api.post(`/goalkeeper-methodology/${id}/duplicate`);
export const deleteGkMethodology = (id) => api.delete(`/goalkeeper-methodology/${id}`);
