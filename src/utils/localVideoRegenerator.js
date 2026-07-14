import React from 'react';
import { createRoot } from 'react-dom/client';
import RNFS from '@/shims/react-native-fs';
import { getTacticalVideo, getVideoForEdit, proxyUploadToR2, updateVideo } from '@/utils/api';
import { initRecordingSession, generateVideo as encodeVideo } from '@/utils/videoUtils';
import { renderFrameToCanvas, getVideoDimensions } from '@/utils/videoCanvasRenderer';
import { decomposeFieldId, getAspectForView } from '@/vendor/tacticalBoard/fields/fieldConfigs';
import FieldSVGRenderer from '@/vendor/tacticalBoard/fields/FieldSVGRenderer';
import { applySetPiecePlayerOverlays } from '@/utils/kits';
import { cdnUrl } from '@/config';
import { SPEED_TO_FPS } from '@/constants/video';
import { buildInterpolatedFrames as buildSharedInterpolatedFrames } from '@/utils/videoFrameBuilder';

const CAPTURE_FORMAT = 'jpeg';
const CAPTURE_EXTENSION = 'jpg';
const CAPTURE_QUALITY = 0.97;

const localRegenerationById = new Map();

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderBoardFieldImage(fieldType, width, height) {
  const { lineType, viewMode } = decomposeFieldId(fieldType || 'full');
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(React.createElement(FieldSVGRenderer, { lineType, viewMode, width, height }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const svg = host.querySelector('svg');
    if (!svg) return null;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    try {
      return await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    root.unmount();
    host.remove();
  }
}

function getRenderConfig(video) {
  const config = video.config || {};
  const speedMultiplier = config.speedMultiplier || 1;
  const { viewMode } = decomposeFieldId(video.fieldType || 'full');
  const aspect = 1 / getAspectForView(viewMode);
  return {
    fps: SPEED_TO_FPS[speedMultiplier] || config.fps || 30,
    moveDuration: 0.9,
    holdDuration: 0.1,
    speedMultiplier,
    extraDurationEnd: 0.5,
    playersWithNumber: config.playersWithNumber !== undefined ? config.playersWithNumber : true,
    showPhotos: config.showPhotos || false,
    viewMode,
    dimensions: getVideoDimensions(aspect),
  };
}

async function renderFramesToDirectory(video, frames, renderConfig, onProgress) {
  const framesDir = await initRecordingSession();
  const canvas = document.createElement('canvas');
  canvas.width = renderConfig.dimensions.width;
  canvas.height = renderConfig.dimensions.height;
  const ctx = canvas.getContext('2d');
  const fieldImage = await renderBoardFieldImage(video.fieldType, canvas.width, canvas.height);
  const playerPhotos = {};
  const photoSources = new Set();
  frames.forEach((frame) => (frame.elements || []).forEach((element) => {
    const source = element.photoUrl || element.playerData?.foto;
    if (element.type === 'player' && source) photoSources.add(source);
  }));
  await Promise.all([...photoSources].map(async (source) => {
    const image = await loadImage(cdnUrl(source));
    if (!image) return;
    playerPhotos[source] = image;
    playerPhotos[cdnUrl(source)] = image;
  }));

  for (let index = 0; index < frames.length; index++) {
    await new Promise((resolve) => setTimeout(resolve, 1));
    const frame = frames[index];
    renderFrameToCanvas(ctx, canvas.width, canvas.height, frame.elements, frame.connectors, fieldImage, {
      playersWithNumber: renderConfig.playersWithNumber,
      showPhotos: renderConfig.showPhotos,
      viewMode: renderConfig.viewMode,
      playerPhotos,
    });
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((nextBlob) => (nextBlob ? resolve(nextBlob) : reject(new Error('Canvas toBlob failed'))), `image/${CAPTURE_FORMAT}`, CAPTURE_QUALITY);
    });
    await RNFS.moveFile(blob, `${framesDir}/frame${String(index).padStart(4, '0')}.${CAPTURE_EXTENSION}`);

    const currentProgress = 15 + Math.round((index / frames.length) * 60);
    onProgress?.(currentProgress, 'generationEncoding');
  }

  return framesDir;
}

async function persistGeneratedVideo(outputPath, persistVideo) {
  if (!persistVideo) return null;

  let upload = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      upload = await proxyUploadToR2(outputPath);
      if (upload?.r2Key) break;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  const r2Key = upload?.r2Key;
  if (!r2Key) throw new Error('No se pudo guardar el vídeo generado');

  if (!upload?.videoUrl) throw new Error('No se pudo obtener la URL del vídeo generado');
  return { r2Key, videoUrl: upload.videoUrl };
}

async function regenerateStoredVideo(videoId, playerOverlays = [], onProgress = null, persistVideo = null) {
  onProgress?.(5, 'generationPreparing');
  const response = await getVideoForEdit(videoId);
  let video = response?.success ? response.video : null;
  if (!video?.keyframes?.length) {
    const tacticalResponse = await getTacticalVideo(videoId).catch(() => null);
    const tacticalVideo = tacticalResponse?.data?.video || tacticalResponse?.video;
    if (tacticalVideo?.frames?.length) {
      video = {
        ...tacticalVideo,
        fieldType: tacticalVideo.fieldType || 'full',
        keyframes: tacticalVideo.frames,
        config: tacticalVideo.config || { speedMultiplier: tacticalVideo.speed || 1 },
      };
    }
  }
  if (!video?.keyframes?.length) {
    throw new Error('No se pudieron cargar los keyframes del video');
  }

  onProgress?.(15, 'generationPreparing');
  const renderConfig = getRenderConfig(video);
  const keyframes = video.keyframes.map((keyframe) => ({
    ...keyframe,
    elements: applySetPiecePlayerOverlays(keyframe.elements || [], playerOverlays),
  }));
  const frames = buildSharedInterpolatedFrames(
    keyframes,
    renderConfig.fps,
    renderConfig.moveDuration,
    renderConfig.holdDuration,
    renderConfig.speedMultiplier,
    renderConfig.extraDurationEnd,
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 1024 ? 12 : 10,
  );
  if (!frames.length) throw new Error('No hay frames suficientes para regenerar el video');

  const framesDir = await renderFramesToDirectory(video, frames, renderConfig, onProgress);
  try {
    const { outputPath } = await encodeVideo(
      framesDir,
      frames.length,
      renderConfig.speedMultiplier,
      (encodeProgress) => {
        const nextProgress = 75 + Math.round(encodeProgress * 24);
        onProgress?.(nextProgress, 'generationFinalizing');
      }
    );
    let persistedVideo = null;
    if (persistVideo) {
      persistedVideo = await persistGeneratedVideo(outputPath, persistVideo);
    } else if (!playerOverlays.length) {
      const upload = await proxyUploadToR2(outputPath);
      if (upload?.r2Key) await updateVideo(videoId, { r2Key: upload.r2Key });
    }
    onProgress?.(100, 'generationComplete');
    return { outputPath, persistedVideo };
  } finally {
    RNFS.unlink(framesDir).catch(() => {});
  }
}

const localRegenerationListeners = new Map();
const localRegenerationSavedListeners = new Map();

export function regenerateVideoInBrowser(videoId, { playerOverlays = [], onProgress, persistVideo } = {}) {
  if (!videoId) throw new Error('No hay video para regenerar');
  const cacheKey = `${videoId}:${JSON.stringify(playerOverlays)}:${persistVideo ? 'persist' : 'preview'}`;

  if (onProgress) {
    if (!localRegenerationListeners.has(cacheKey)) {
      localRegenerationListeners.set(cacheKey, new Set());
    }
    localRegenerationListeners.get(cacheKey).add(onProgress);
  }
  if (persistVideo?.onSaved) {
    if (!localRegenerationSavedListeners.has(cacheKey)) {
      localRegenerationSavedListeners.set(cacheKey, new Set());
    }
    localRegenerationSavedListeners.get(cacheKey).add(persistVideo.onSaved);
  }

  if (!localRegenerationById.has(cacheKey)) {
    const triggerProgress = (progress, phase) => {
      const listeners = localRegenerationListeners.get(cacheKey);
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener(progress, phase);
          } catch (e) {
            console.warn(e);
          }
        });
      }
    };

    localRegenerationById.set(
      cacheKey,
      regenerateStoredVideo(videoId, playerOverlays, triggerProgress, persistVideo)
        .then(async (result) => {
          if (result.persistedVideo) {
            const listeners = localRegenerationSavedListeners.get(cacheKey) || [];
            await Promise.all([...listeners].map((listener) => listener({
              ...result.persistedVideo,
              url: result.outputPath,
            })));
          }
          return result.outputPath;
        })
        .finally(() => {
          localRegenerationById.delete(cacheKey);
          localRegenerationListeners.delete(cacheKey);
          localRegenerationSavedListeners.delete(cacheKey);
        }),
    );
  }
  return localRegenerationById.get(cacheKey);
}

// Compatibilidad con consumidores antiguos: las URLs persistidas viven en el
// video de la ficha, no en una caché de memoria del navegador.
export function isCachedRegeneratedVideoUrl() {
  return false;
}
