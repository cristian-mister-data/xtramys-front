// utils/api.js — adapter for vendor RN code: re-exports host video API and
// stubs el resto de funciones aún no portadas al backend web.

import {
  saveVideo,
  createVideoFolder,
  getVideoFoldersFlat,
} from '@/api/video';
import * as videoApi from '@/api/video';
import api, { apiBase } from '@/api/client';

export * from '@/api/video';
export { saveVideo, createVideoFolder };

// Adapters de nombres
export const proxyUploadToR2 = async () => {
  throw new Error('proxyUploadToR2: not implemented on web');
};
export const getAllVideoFoldersFlat = async () => {
  const res = await getVideoFoldersFlat();
  return res?.data ?? res;
};
export const updateVideo = async (videoId, payload) => saveVideo({ ...payload, _id: videoId });

// Stubs: registra warning, no rompe la UI.
const stub = (name, fallback = { data: null }) => async (..._args) => {
  console.warn(`[utils/api] ${name}() no implementado en web`);
  return fallback;
};
// Stubs silenciosos: para endpoints intencionalmente no soportados en web.
const silentStub = (_name, fallback = { data: null }) => async (..._args) => fallback;

// URLs de video (usadas en <video src> y <a href>)
export const getVideoStreamUrl = (videoId) => `/api/video/stream/${videoId}`;
export const getVideoDownloadUrl = (videoId) => `/api/video/download/${videoId}`;
export const getReadyDownloadUrl = (videoId) => `/api/video/download/${videoId}`;
export const getPreWellnessFormUrl = (token) => `${window.location.origin}/public/pre-wellness/${token}`;

// Lesiones / video / ejercicios / estrategias / wellness — pendientes de migrar al host web.
export const regenerateVideoWithField = stub('regenerateVideoWithField');
export const unlinkVideoFromExercise = stub('unlinkVideoFromExercise');
export const unlinkVideoFromStrategy = stub('unlinkVideoFromStrategy');
export const getVideoForEdit = stub('getVideoForEdit');
export const duplicateVideoForEdit = stub('duplicateVideoForEdit');
export const deleteVideo = stub('deleteVideo');
export const getVideoFolderById = stub('getVideoFolderById');
export const listVideos = silentStub('listVideos', { data: [] });
export const listGlobalVideos = silentStub('listGlobalVideos', { data: [] });
export const listVideoFolders = silentStub('listVideoFolders', { data: [] });

export const getAllExercises = stub('getAllExercises', { data: [] });
export const getAllStrategies = stub('getAllStrategies', { data: [] });

export const getSessionWellnessStats = async (sessionId) => {
  try {
    const response = await api.get(`/wellness/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.warn('Error getting wellness stats:', error);
    throw error;
  }
};

export const getSessionPreWellnessStats = async (sessionId) => {
  try {
    const response = await apiBase.get(`/prewellness/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.warn('Error getting pre-wellness stats:', error);
    throw error;
  }
};

export const getWellnessRange = async (teamId, from, to) => {
  try {
    const response = await api.get(`/wellness/range`, { params: { teamId, from, to } });
    return response.data;
  } catch (error) {
    console.warn('Error getting wellness range:', error);
    throw error;
  }
};

export const getPreWellnessRange = async (teamId, from, to) => {
  try {
    const response = await apiBase.get(`/prewellness/range`, { params: { teamId, from, to } });
    return response.data;
  } catch (error) {
    console.warn('Error getting pre-wellness range:', error);
    throw error;
  }
};

// ============ WELLNESS TEMPLATES API ============
export const getWellnessTemplates = async (type = null) => {
  try {
    const params = type ? { type } : {};
    const response = await api.get('/wellness-template', { params });
    return response.data;
  } catch (error) {
    console.warn('Error getting wellness templates:', error);
    throw error;
  }
};

export const createWellnessTemplate = async (templateData) => {
  try {
    const response = await api.post('/wellness-template', templateData);
    return response.data;
  } catch (error) {
    console.warn('Error creating wellness template:', error);
    throw error;
  }
};

export const updateWellnessTemplate = async (templateId, templateData) => {
  try {
    const response = await api.put(`/wellness-template/${templateId}`, templateData);
    return response.data;
  } catch (error) {
    console.warn('Error updating wellness template:', error);
    throw error;
  }
};

export const deleteWellnessTemplate = async (templateId) => {
  try {
    const response = await api.delete(`/wellness-template/${templateId}`);
    return response.data;
  } catch (error) {
    console.warn('Error deleting wellness template:', error);
    throw error;
  }
};

export const duplicateWellnessTemplate = async (templateId, newName) => {
  try {
    const response = await api.post(`/wellness-template/${templateId}/duplicate`, { newName });
    return response.data;
  } catch (error) {
    console.warn('Error duplicating wellness template:', error);
    throw error;
  }
};

export const setDefaultWellnessTemplate = async (templateId) => {
  try {
    const response = await api.post(`/wellness-template/${templateId}/set-default`);
    return response.data;
  } catch (error) {
    console.warn('Error setting default wellness template:', error);
    throw error;
  }
};

// ============ WELLNESS LINK / RESPONSES ============
export const generateWellnessLink = async (sessionId, expiryHours = 72) => {
  try {
    const response = await api.post(`/wellness/session/${sessionId}/generate-link`, { expiryHours });
    return response.data;
  } catch (error) {
    console.warn('Error generating wellness link:', error);
    throw error;
  }
};

export const generatePreWellnessLink = async (sessionId, expiryHours = 72, templateId = null, questions = null) => {
  try {
    const body = { expiryHours };
    if (templateId) body.templateId = templateId;
    if (questions && questions.length > 0) body.questions = questions;
    const response = await apiBase.post(`/prewellness/session/${sessionId}/generate-link`, body);
    return response.data;
  } catch (error) {
    console.warn('Error generating pre-wellness link:', error);
    throw error;
  }
};

export const toggleWellnessLink = async (sessionId, active) => {
  try {
    const response = await api.post(`/wellness/session/${sessionId}/toggle-link`, { active });
    return response.data;
  } catch (error) {
    console.warn('Error toggling wellness link:', error);
    throw error;
  }
};

export const togglePreWellnessLink = async (sessionId, active) => {
  try {
    const response = await apiBase.post(`/prewellness/session/${sessionId}/toggle-link`, { active });
    return response.data;
  } catch (error) {
    console.warn('Error toggling pre-wellness link:', error);
    throw error;
  }
};

export const deleteWellnessResponse = async (responseId) => {
  try {
    const response = await api.delete(`/wellness/response/${responseId}`);
    return response.data;
  } catch (error) {
    console.warn('Error deleting wellness response:', error);
    throw error;
  }
};

export const deletePreWellnessResponse = async (responseId) => {
  try {
    const response = await apiBase.delete(`/prewellness/response/${responseId}`);
    return response.data;
  } catch (error) {
    console.warn('Error deleting pre-wellness response:', error);
    throw error;
  }
};

export const updateSessionPreWellness = async (sessionId, preWellnessData) => {
  try {
    const response = await apiBase.put(`/prewellness/session/${sessionId}`, preWellnessData);
    return response.data;
  } catch (error) {
    console.warn('Error updating pre-wellness:', error);
    throw error;
  }
};

// ============ Player history (wellness / pre-wellness / antropometría) ============
// Implementaciones reales replicando misterdata/src/utils/api.js
export const getPlayerWellnessHistory = async (playerId, teamId) => {
  try {
    const params = teamId ? { teamId } : {};
    const response = await api.get(`/wellness/player/${playerId}`, { params });
    return response.data;
  } catch (error) {
    console.warn('Error getting player wellness history:', error);
    throw error;
  }
};

export const getPlayerPreWellnessHistory = async (playerId, teamId) => {
  try {
    const params = teamId ? { teamId } : {};
    const response = await apiBase.get(`/prewellness/player/${playerId}`, { params });
    return response.data;
  } catch (error) {
    console.warn('Error getting player pre-wellness history:', error);
    throw error;
  }
};

export const getPlayerAnthropometry = async (playerId) => {
  try {
    const response = await api.get(`/anthropometry/player/${playerId}`);
    return response.data;
  } catch (error) {
    console.warn('Error getting player anthropometry:', error);
    throw error;
  }
};

export const getPlayerAnthropometryPDF = async (playerId) => {
  try {
    const response = await api.get(`/anthropometry/player/${playerId}/pdf`);
    return response.data;
  } catch (error) {
    console.warn('Error getting player anthropometry PDF data:', error);
    throw error;
  }
};

export default videoApi;
