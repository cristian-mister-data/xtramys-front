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

export const getSessionWellnessStats = stub('getSessionWellnessStats', { data: null });
export const getSessionPreWellnessStats = stub('getSessionPreWellnessStats', { data: null });
export const getWellnessRange = stub('getWellnessRange', { data: [] });
export const getPreWellnessRange = stub('getPreWellnessRange', { data: [] });
export const getWellnessTemplates = stub('getWellnessTemplates', { data: [] });
export const createWellnessTemplate = stub('createWellnessTemplate');
export const updateWellnessTemplate = stub('updateWellnessTemplate');
export const deleteWellnessTemplate = stub('deleteWellnessTemplate');
export const duplicateWellnessTemplate = stub('duplicateWellnessTemplate');
export const setDefaultWellnessTemplate = stub('setDefaultWellnessTemplate');
export const generateWellnessLink = stub('generateWellnessLink', { data: { token: '' } });
export const generatePreWellnessLink = stub('generatePreWellnessLink', { data: { token: '' } });
export const toggleWellnessLink = stub('toggleWellnessLink');
export const togglePreWellnessLink = stub('togglePreWellnessLink');
export const deleteWellnessResponse = stub('deleteWellnessResponse');
export const deletePreWellnessResponse = stub('deletePreWellnessResponse');
export const updateSessionPreWellness = stub('updateSessionPreWellness');

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
