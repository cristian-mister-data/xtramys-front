// store/slices/rivalAnalysis/rivalAnalysisThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { createReadCache } from '@/utils/readCache';

const rivalAnalysisCache = createReadCache({ ttlMs: 60000 });
const rivalAnalysisKey = (scope, payload) => rivalAnalysisCache.key(`rivalAnalysis:${scope}`, payload);
const clearRivalAnalysisCache = () => rivalAnalysisCache.clear();

export const fetchRivalAnalysesByTeam = createAsyncThunk(
  'rivalAnalysis/fetchByTeam',
  async (equipoId, { rejectWithValue }) => {
    try {
      return await rivalAnalysisCache.read(rivalAnalysisKey('team', { equipoId }), async () => {
        const res = await api.get(`/rival-analysis/team/${equipoId}`);
        return res.data;
      });
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const fetchRivalAnalysisById = createAsyncThunk(
  'rivalAnalysis/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await rivalAnalysisCache.read(rivalAnalysisKey('detail', { id }), async () => {
        const res = await api.get(`/rival-analysis/${id}`);
        return res.data;
      });
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const createRivalAnalysis = createAsyncThunk(
  'rivalAnalysis/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/rival-analysis/create', data);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const updateRivalAnalysis = createAsyncThunk(
  'rivalAnalysis/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/rival-analysis/${id}`, data);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const deleteRivalAnalysis = createAsyncThunk(
  'rivalAnalysis/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/rival-analysis/${id}`);
      clearRivalAnalysisCache();
      return id;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

// ============ TEMPLATE THUNKS ============

export const fetchActiveTemplate = createAsyncThunk(
  'rivalAnalysis/fetchActiveTemplate',
  async (userId, { rejectWithValue }) => {
    try {
      return await rivalAnalysisCache.read(rivalAnalysisKey('active-template', { userId }), async () => {
        const res = await api.get(`/rival-analysis-template/active/${userId}`);
        return res.data;
      });
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const fetchUserTemplates = createAsyncThunk(
  'rivalAnalysis/fetchUserTemplates',
  async (userId, { rejectWithValue }) => {
    try {
      return await rivalAnalysisCache.read(rivalAnalysisKey('user-templates', { userId }), async () => {
        const res = await api.get(`/rival-analysis-template/user/${userId}`);
        return res.data;
      });
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const fetchRecommendedQuestions = createAsyncThunk(
  'rivalAnalysis/fetchRecommendedQuestions',
  async (_, { rejectWithValue }) => {
    try {
      return await rivalAnalysisCache.read(rivalAnalysisKey('recommended'), async () => {
        const res = await api.get('/rival-analysis-template/recommended');
        return res.data;
      });
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const createTemplate = createAsyncThunk(
  'rivalAnalysis/createTemplate',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/rival-analysis-template/create', data);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const createTemplateFromRecommended = createAsyncThunk(
  'rivalAnalysis/createTemplateFromRecommended',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/rival-analysis-template/create-from-recommended', data);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const updateTemplate = createAsyncThunk(
  'rivalAnalysis/updateTemplate',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/rival-analysis-template/${id}`, data);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const setTemplateAsDefault = createAsyncThunk(
  'rivalAnalysis/setTemplateAsDefault',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.put(`/rival-analysis-template/${id}/set-default`);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const deleteTemplate = createAsyncThunk(
  'rivalAnalysis/deleteTemplate',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/rival-analysis-template/${id}`);
      clearRivalAnalysisCache();
      return id;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const addQuestionToTemplate = createAsyncThunk(
  'rivalAnalysis/addQuestionToTemplate',
  async ({ templateId, question }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/rival-analysis-template/${templateId}/question`, question);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const updateQuestionInTemplate = createAsyncThunk(
  'rivalAnalysis/updateQuestionInTemplate',
  async ({ templateId, questionId, question }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/rival-analysis-template/${templateId}/question/${questionId}`, question);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const removeQuestionFromTemplate = createAsyncThunk(
  'rivalAnalysis/removeQuestionFromTemplate',
  async ({ templateId, questionId }, { rejectWithValue }) => {
    try {
      const res = await api.delete(`/rival-analysis-template/${templateId}/question/${questionId}`);
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const reorderTemplateQuestions = createAsyncThunk(
  'rivalAnalysis/reorderTemplateQuestions',
  async ({ templateId, questionIds }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/rival-analysis-template/${templateId}/reorder`, { questionIds });
      clearRivalAnalysisCache();
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);
