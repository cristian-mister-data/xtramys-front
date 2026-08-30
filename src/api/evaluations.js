import api from './client';

export const listEvaluations = async () => (await api.get('/evaluations', { skipCache: true })).data;
export const createEvaluation = async (data) => (await api.post('/evaluations', data)).data;
export const updateEvaluationRemote = async (id, data) => (await api.put(`/evaluations/${id}`, data)).data;
export const deleteEvaluationRemote = async (id) => (await api.delete(`/evaluations/${id}`)).data;
