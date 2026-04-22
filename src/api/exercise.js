import api from './client';

// Ejercicios
export const getAllExercises = () => api.get('/exercise/all');
export const getGlobalExercises = () => api.get('/exercise/global');
export const getExercise = (id) => api.get(`/exercise/${id}`);
export const getMyExercises = (userId) => api.get(`/exercise/user/${userId}`);
export const createExercise = (payload) => api.post('/exercise/create', payload);
export const updateExercise = (id, payload) => api.post(`/exercise/${id}`, payload);
export const deleteExercise = (id) => api.delete(`/exercise/${id}`);

// Tipos
export const getExerciseType = (id) => api.get(`/exerciseType/${id}`);
export const getExerciseTypes = (userId) => api.get(`/exerciseType/user/${userId}`);
export const createExerciseType = (payload) => api.post('/exerciseType/create', payload);
export const updateExerciseType = (id, payload) => api.post(`/exerciseType/${id}`, payload);
export const deleteExerciseType = (id) => api.delete(`/exerciseType/${id}`);

// Carpetas
export const getExerciseFolders = () => api.get('/exercise-folder');
export const getExerciseFoldersFlat = () => api.get('/exercise-folder/flat');
export const getGlobalExerciseFolders = () => api.get('/exercise-folder/global');
export const getExerciseFolder = (id) => api.get(`/exercise-folder/${id}`);
export const createExerciseFolder = (payload) => api.post('/exercise-folder', payload);
export const updateExerciseFolder = (id, payload) => api.put(`/exercise-folder/${id}`, payload);
export const deleteExerciseFolder = (id) => api.delete(`/exercise-folder/${id}`);
export const moveExerciseToFolder = (payload) => api.post('/exercise-folder/move-exercise', payload);
export const duplicateExerciseToFolder = (payload) =>
  api.post('/exercise-folder/duplicate-exercise', payload);
export const duplicateGlobalExercise = (payload) =>
  api.post('/exercise-folder/duplicate-global', payload);
