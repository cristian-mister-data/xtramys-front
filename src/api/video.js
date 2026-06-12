import api from './client';

// === Video (preview server-side desde keyframes + R2 upload) ===
export const generateVideo = (payload) => api.post('/video/generate', payload);
export const getJobStatus = (jobId) => api.get(`/video/job/${jobId}/status`);
export const getVideoShareLink = (videoId) => api.get(`/video/${videoId}/share-link`);
export const presignVideo = (payload) => api.post('/video/presign', payload);
export const proxyUploadVideo = (formData, onUploadProgress) =>
  api.post('/video/proxy-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
export const saveVideo = (payload) => api.post('/video/save', payload);
export const getMyVideos = (params) => api.get('/video/list', { params });
export const getGlobalVideos = () => api.get('/video/global');
export const linkVideoToExercise = (payload) => api.post('/video/link-exercise', payload);
export const linkVideoToStrategy = (payload) => api.post('/video/link-strategy', payload);
export const unlinkVideoFromExercise = (videoId, exerciseId) => api.post('/video/unlink-exercise', { videoId, exerciseId });
export const unlinkVideoFromStrategy = (videoId, strategyId) => api.post('/video/unlink-strategy', { videoId, strategyId });
export const getVideosByExercise = async (exerciseId) => {
  const response = await api.get(`/video/exercise/${exerciseId}`);
  return response.data?.videos || [];
};
export const getVideosByStrategy = async (strategyId) => {
  const response = await api.get(`/video/strategy/${strategyId}`);
  return response.data?.videos || [];
};

// Carpetas de video
export const getVideoFolders = () => api.get('/video-folder');
export const getVideoFoldersFlat = () => api.get('/video-folder/flat');
export const getGlobalVideoFolders = () => api.get('/video-folder/global');
export const getVideoFolder = (id) => api.get(`/video-folder/${id}`);
export const createVideoFolder = (payload) => api.post('/video-folder', payload);
export const updateVideoFolder = (id, payload) => api.put(`/video-folder/${id}`, payload);
export const deleteVideoFolder = (id) => api.delete(`/video-folder/${id}`);
export const moveVideoToFolder = (payload) => api.post('/video-folder/move-video', payload);
export const duplicateVideoToFolder = (payload) =>
  api.post('/video-folder/duplicate-video', payload);

// === Tactical videos (cliente-side: graba el canvas y sube a R2) ===
export const presignTacticalVideo = (payload) => api.post('/tactical-videos/presign', payload);
export const saveTacticalVideo = (payload) => api.post('/tactical-videos', payload);
export const listTacticalVideos = () => api.get('/tactical-videos');
export const getTacticalVideo = (id) => api.get(`/tactical-videos/${id}`);
export const downloadTacticalVideo = (id) => api.get(`/tactical-videos/${id}/download`);
export const updateTacticalVideo = (id, payload) => api.put(`/tactical-videos/${id}`, payload);
export const deleteTacticalVideo = (id) => api.delete(`/tactical-videos/${id}`);

// === Asociaciones genéricas ===
export const getActiveAssociations = (entityType, entityId) =>
  api.get('/associations/active', { params: { entityType, entityId } });
