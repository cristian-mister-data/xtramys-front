// utils/api.js — adapter for vendor RN code: re-exports host video API and
// stubs el resto de funciones aún no portadas al backend web.

import * as videoApi from '@/api/video';
import api, { apiBase } from '@/api/client';
import { pollJobUntilDone } from '@/api/client';
import { API_URL } from '@/config';
export {
  generateVideo,
  getJobStatus,
  presignVideo,
  proxyUploadVideo,
  linkVideoToExercise,
  linkVideoToStrategy,
  getVideosByExercise,
  getVideosByStrategy,
  presignTacticalVideo,
  saveTacticalVideo,
  listTacticalVideos,
  getTacticalVideo,
  downloadTacticalVideo,
  updateTacticalVideo,
  deleteTacticalVideo,
  getActiveAssociations,
} from '@/api/video';

// =====================
// Funciones de video — mirror EXACTO de misterdata/src/utils/api.js.
// El backend ya devuelve { success, video, videoId } / { success, videos } /
// { success, folder } / { success, folders }, así que basta con devolver
// response.data sin envolver (el envoltorio rompía el shape esperado por
// vendor + forzaba success:true incluso en fallos).
// =====================

export const saveVideo = async (videoData) => {
  try {
    const response = await api.post('/video/save', videoData, {
      timeout: 45000,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.warn('Error saving video:', error);
    throw error;
  }
};

export const listVideos = async (filters = {}) => {
  try {
    const response = await api.get('/video/list', { params: filters });
    return response.data;
  } catch (error) {
    console.warn('Error listing videos:', error);
    throw error;
  }
};

export const getMyVideos = listVideos; // alias (algunos consumidores legacy)

export const getVideoById = async (videoId) => {
  try {
    const response = await api.get(`/video/${videoId}`);
    return response.data;
  } catch (error) {
    console.warn('Error getting video:', error);
    throw error;
  }
};

export const getVideoForEdit = async (videoId) => {
  try {
    const response = await api.get(`/video/${videoId}/edit`, { timeout: 45000 });
    return response.data;
  } catch (error) {
    console.warn('Error getting video for edit:', error);
    return { success: false, error: error.message };
  }
};

export const duplicateVideoForEdit = async (videoId, payload = {}) => {
  try {
    const response = await api.post(`/video/${videoId}/duplicate-for-edit`, payload, {
      timeout: 45000,
    });
    return response.data;
  } catch (error) {
    console.warn('Error duplicating video for edit:', error);
    throw error;
  }
};

export const updateVideo = async (videoId, videoData) => {
  try {
    const response = await api.put(`/video/${videoId}`, videoData, {
      timeout: 45000,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.warn('Error updating video:', error);
    throw error;
  }
};

export const deleteVideo = async (videoId) => {
  try {
    const response = await api.delete(`/video/${videoId}`);
    return response.data;
  } catch (error) {
    console.warn('Error deleting video:', error);
    throw error;
  }
};

// =====================
// Carpetas de video
// =====================

export const createVideoFolder = async (folderData) => {
  try {
    const response = await api.post('/video-folder', folderData);
    return response.data;
  } catch (error) {
    console.warn('Error creating video folder:', error);
    throw error;
  }
};

export const listVideoFolders = async (parentFolder = null, lang = null) => {
  try {
    const params = {};
    if (parentFolder !== null) params.parentFolder = parentFolder;
    if (lang) params.lang = lang;
    const response = await api.get('/video-folder', { params });
    return response.data;
  } catch (error) {
    console.warn('Error listing video folders:', error);
    throw error;
  }
};

export const getVideoFolderById = async (folderId, lang = null) => {
  try {
    const params = lang ? { lang } : {};
    const response = await api.get(`/video-folder/${folderId}`, { params });
    return response.data;
  } catch (error) {
    console.warn('Error getting video folder:', error);
    throw error;
  }
};

export const updateVideoFolder = async (folderId, folderData) => {
  try {
    const response = await api.put(`/video-folder/${folderId}`, folderData);
    return response.data;
  } catch (error) {
    console.warn('Error updating video folder:', error);
    throw error;
  }
};

export const deleteVideoFolder = async (folderId, moveVideosTo = null) => {
  try {
    const response = await api.delete(`/video-folder/${folderId}`, {
      data: { moveVideosTo },
    });
    return response.data;
  } catch (error) {
    console.warn('Error deleting video folder:', error);
    throw error;
  }
};

export const moveVideoToFolder = async (videoId, folderId) => {
  try {
    const response = await api.post('/video-folder/move-video', { videoId, folderId });
    return response.data;
  } catch (error) {
    console.warn('Error moving video to folder:', error);
    throw error;
  }
};

export const duplicateVideoToFolder = async (videoId, folderId) => {
  try {
    const response = await api.post('/video-folder/duplicate-video', { videoId, folderId });
    return response.data;
  } catch (error) {
    console.warn('Error duplicating video to folder:', error);
    throw error;
  }
};

export const getAllVideoFoldersFlat = async (lang = null) => {
  try {
    const params = lang ? { lang } : {};
    const response = await api.get('/video-folder/flat', { params });
    return response.data;
  } catch (error) {
    console.warn('Error getting all video folders:', error);
    throw error;
  }
};
// Alias para vendor que importa el nombre antiguo:
export const getVideoFolders = listVideoFolders;
export const getVideoFoldersFlat = getAllVideoFoldersFlat;
export const getVideoFolder = getVideoFolderById;

export const getGlobalVideoFolders = async (lang = null) => {
  try {
    const params = lang ? { lang } : {};
    const response = await api.get('/video-folder/global', { params });
    return response.data;
  } catch (error) {
    console.warn('Error getting global video folders:', error);
    throw error;
  }
};

export const listGlobalVideos = async (folderId = null) => {
  try {
    const params = {};
    if (folderId) params.folderId = folderId;
    const response = await api.get('/video/global', { params });
    return response.data;
  } catch (error) {
    console.warn('Error listing global videos:', error);
    throw error;
  }
};
export const getGlobalVideos = listGlobalVideos;

// =====================
// Stubs / no implementados en web
// =====================
const stub = (name, fallback = { data: null }) => async (..._args) => {
  console.warn(`[utils/api] ${name}() no implementado en web`);
  return fallback;
};

export const proxyUploadToR2 = async (localVideoPath) => {
  if (!localVideoPath) throw new Error('No hay archivo de vídeo para subir');

  const fileResponse = await fetch(localVideoPath);
  if (!fileResponse.ok) {
    throw new Error(`No se pudo leer el vídeo generado: ${fileResponse.status}`);
  }

  const blob = await fileResponse.blob();
  if (!blob || blob.size === 0) {
    throw new Error('El vídeo generado está vacío');
  }

  const contentType = blob.type || 'video/webm';
  const response = await api.post('/video/proxy-upload', blob, {
    timeout: 120000,
    headers: { 'Content-Type': contentType },
    transformRequest: [(data) => data],
  });
  return response.data;
};

// Regenera el MP4 server-side a partir de los keyframes guardados.
// Mirror de misterdata: si el backend encola un job, hacemos polling.
let _activeVideoPollController = null;
export const regenerateVideoWithField = async (videoId, fieldImageData = null) => {
  if (_activeVideoPollController) {
    _activeVideoPollController.abort();
  }
  const controller = new AbortController();
  _activeVideoPollController = controller;
  try {
    const response = await api.post(
      `/video/${videoId}/regenerate`,
      { fieldImageData },
      { timeout: 120000 }
    );
    const result = response.data;
    if (result.status === 'processing' && result.jobId) {
      const done = await pollJobUntilDone(result.jobId, { signal: controller.signal });
      return { success: true, videoId: done.videoId };
    }
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Video generation cancelled');
    }
    console.warn('Error regenerating video:', error);
    throw error;
  } finally {
    if (_activeVideoPollController === controller) {
      _activeVideoPollController = null;
    }
  }
};

export const unlinkVideoFromExercise = stub('unlinkVideoFromExercise');
export const unlinkVideoFromStrategy = stub('unlinkVideoFromStrategy');

export const getAllExercises = async () => {
  try {
    const response = await api.get('/exercise/all');
    return response.data;
  } catch (error) {
    console.warn('Error loading all exercises:', error);
    throw error;
  }
};

export const getAllStrategies = async () => {
  try {
    const response = await api.get('/strategy/all');
    return response.data;
  } catch (error) {
    console.warn('Error loading all strategies:', error);
    throw error;
  }
};

// URLs de video — absolutas al backend (en dev no hay proxy /api en Vite,
// así que usar relativas devolvía el index.html del SPA).
export const getVideoStreamUrl = (videoId) => `${API_URL}/video/stream/${videoId}`;
export const getVideoDownloadUrl = (videoId) => `${API_URL}/video/download/${videoId}`;
export const getReadyDownloadUrl = (videoId) => `${API_URL}/video/download/${videoId}`;
export const getPreWellnessFormUrl = (token) =>
  `${window.location.origin}/public/pre-wellness/${token}`;

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
