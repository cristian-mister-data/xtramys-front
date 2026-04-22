import api from './client';

export const getInjuries = () => api.get('/injury');
export const getInjury = (id) => api.get(`/injury/${id}`);
export const getInjuriesByTeam = (teamId) => api.get(`/injury/team/${teamId}`);
export const createInjury = (payload) => api.post('/injury/create', payload);
export const updateInjury = (id, payload) => api.post(`/injury/${id}`, payload);
export const deleteInjury = (id) => api.delete(`/injury/${id}`);
