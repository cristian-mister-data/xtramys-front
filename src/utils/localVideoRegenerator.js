import RNFS from '@/shims/react-native-fs';
import { getTacticalVideo, getVideoForEdit, proxyUploadToR2, updateVideo } from '@/utils/api';
import {
  createStreamingVideoEncoder,
  initRecordingSession,
  generateVideo as encodeVideo,
} from '@/utils/videoUtils';
import {
  createVideoRenderCache,
  renderFrameToCanvas,
  getVideoDimensions,
} from '@/utils/videoCanvasRenderer';
import { decomposeFieldId, getAspectForView } from '@/vendor/tacticalBoard/fields/fieldConfigs';
import { applySetPiecePlayerOverlays } from '@/utils/kits';
import { renderVideoFieldImage } from '@/utils/videoFieldImage';
import { loadVideoPlayerPhotos } from '@/utils/videoPlayerPhotos';
import { SPEED_TO_FPS } from '@/constants/video';
import {
  getInterpolatedFrameCount,
  iterateInterpolatedFrames as iterateSharedInterpolatedFrames,
} from '@/utils/videoFrameBuilder';

const CAPTURE_FORMAT = 'jpeg';
const CAPTURE_EXTENSION = 'jpg';
const CAPTURE_QUALITY = 0.97;
const MAX_PREVIEW_CACHE_ENTRIES = 6;

const localRegenerationById = new Map();
const localRegenerationResultCache = new Map();

const yieldToBrowser = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

function getRenderConfig(video, renderWidth) {
  const config = video.config || {};
  const speedMultiplier = config.speedMultiplier || 1;
  const { viewMode } = decomposeFieldId(video.fieldType || 'full');
  const aspect = 1 / getAspectForView(viewMode);
  const fullDimensions = getVideoDimensions(aspect);
  const width = Number.isFinite(renderWidth)
    ? Math.max(2, Math.round(renderWidth / 2) * 2)
    : fullDimensions.width;
  return {
    fps: SPEED_TO_FPS[speedMultiplier] || config.fps || 30,
    moveDuration: 0.9,
    holdDuration: 0.1,
    speedMultiplier,
    extraDurationEnd: 0.5,
    playersWithNumber: config.playersWithNumber !== undefined ? config.playersWithNumber : true,
    showPhotos: config.showPhotos || false,
    viewMode,
    dimensions: {
      width,
      height: Number.isFinite(renderWidth)
        ? Math.max(2, Math.round((width / aspect) / 2) * 2)
        : fullDimensions.height,
    },
  };
}

async function createRenderSession(video, keyframes, renderConfig) {
  const canvas = document.createElement('canvas');
  canvas.width = renderConfig.dimensions.width;
  canvas.height = renderConfig.dimensions.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  const fieldImage = await renderVideoFieldImage(video.fieldType, canvas.width, canvas.height);
  const { playerPhotos, release } = await loadVideoPlayerPhotos(keyframes);

  return {
    canvas,
    ctx,
    fieldImage,
    playerPhotos,
    releasePlayerPhotos: release,
    renderCache: createVideoRenderCache(),
  };
}

function renderSessionFrame(session, frame, renderConfig) {
  renderFrameToCanvas(
    session.ctx,
    session.canvas.width,
    session.canvas.height,
    frame.elements,
    frame.connectors,
    session.fieldImage,
    {
      playersWithNumber: renderConfig.playersWithNumber,
      showPhotos: renderConfig.showPhotos,
      viewMode: renderConfig.viewMode,
      playerPhotos: session.playerPhotos,
      renderCache: session.renderCache,
    },
  );
}

async function renderFramesDirectly(session, createFrames, frameCount, renderConfig, onProgress) {
  let renderedCount = 0;
  let encodedCount = 0;
  let lastProgress = 15;
  let lastYieldAt = performance.now();
  const updateProgress = () => {
    const nextProgress = 15 + Math.round(((renderedCount + encodedCount) / (frameCount * 2)) * 84);
    if (nextProgress <= lastProgress) return;
    lastProgress = Math.min(99, nextProgress);
    onProgress?.(lastProgress, 'generationEncoding');
  };
  const encoder = await createStreamingVideoEncoder({
    speed: renderConfig.speedMultiplier,
    frameCount,
    onProgress: (progress) => {
      encodedCount = Math.max(encodedCount, Math.round(progress * frameCount));
      updateProgress();
    },
  });

  try {
    let index = 0;
    let pendingFrameRun = null;
    const encodePendingFrameRun = async () => {
      if (!pendingFrameRun) return;
      await encoder.addFrame(
        session.canvas,
        pendingFrameRun.index,
        pendingFrameRun.durationFrames,
      );
      pendingFrameRun = null;
    };
    for (const frame of createFrames()) {
      if (frame._reusePreviousFrame && pendingFrameRun) {
        pendingFrameRun.durationFrames += 1;
      } else {
        await encodePendingFrameRun();
        renderSessionFrame(session, frame, renderConfig);
        pendingFrameRun = { index, durationFrames: 1 };
      }
      renderedCount = index + 1;
      updateProgress();
      index += 1;

      if (performance.now() - lastYieldAt >= 50) {
        await yieldToBrowser();
        lastYieldAt = performance.now();
      }
    }
    await encodePendingFrameRun();
    return await encoder.finish();
  } catch (error) {
    encoder.abort?.();
    throw error;
  }
}

async function renderFramesToDirectory(session, createFrames, frameCount, renderConfig, onProgress) {
  const framesDir = await initRecordingSession();

  let index = 0;
  let frameBlob = null;
  for (const frame of createFrames()) {
    if (index === 0 || !frame._reusePreviousFrame) {
      renderSessionFrame(session, frame, renderConfig);
      frameBlob = await new Promise((resolve, reject) => {
        session.canvas.toBlob(
          (nextBlob) => (nextBlob ? resolve(nextBlob) : reject(new Error('Canvas toBlob failed'))),
          `image/${CAPTURE_FORMAT}`,
          CAPTURE_QUALITY,
        );
      });
    }
    await RNFS.moveFile(frameBlob, `${framesDir}/frame${String(index).padStart(4, '0')}.${CAPTURE_EXTENSION}`);

    const currentProgress = 15 + Math.round(((index + 1) / frameCount) * 60);
    onProgress?.(currentProgress, 'generationEncoding');
    index += 1;
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

async function regenerateStoredVideo(videoId, playerOverlays = [], onProgress = null, persistVideo = null, fieldTypeOverride = null, renderWidth = null) {
  onProgress?.(5, 'generationPreparing');
  const response = await getVideoForEdit(videoId);
  let video = response?.success ? response.video : null;
  if (!video?.keyframes?.length) {
    const tacticalResponse = await getTacticalVideo(videoId).catch(() => null);
    const tacticalVideo = tacticalResponse?.data?.video || tacticalResponse?.video;
    if (tacticalVideo?.frames?.length) {
      video = {
        ...tacticalVideo,
        fieldType: fieldTypeOverride || tacticalVideo.fieldType || 'full',
        keyframes: tacticalVideo.frames,
        config: tacticalVideo.config || { speedMultiplier: tacticalVideo.speed || 1 },
      };
    }
  }
  if (!video?.keyframes?.length) {
    throw new Error('No se pudieron cargar los keyframes del video');
  }
  if (fieldTypeOverride) video = { ...video, fieldType: fieldTypeOverride };

  onProgress?.(15, 'generationPreparing');
  const renderConfig = getRenderConfig(video, renderWidth);
  const keyframes = video.keyframes.map((keyframe) => ({
    ...keyframe,
    elements: applySetPiecePlayerOverlays(keyframe.elements || [], playerOverlays),
  }));
  const interpolationArgs = [
    keyframes,
    renderConfig.fps,
    renderConfig.moveDuration,
    renderConfig.holdDuration,
    renderConfig.speedMultiplier,
    renderConfig.extraDurationEnd,
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 1024 ? 12 : 10,
  ];
  const frameCount = getInterpolatedFrameCount(...interpolationArgs);
  if (!frameCount) throw new Error('No hay frames suficientes para regenerar el video');
  const createFrames = () => iterateSharedInterpolatedFrames(...interpolationArgs);
  const renderSession = await createRenderSession(video, keyframes, renderConfig);

  let framesDir = null;
  try {
    let outputPath;
    try {
      ({ outputPath } = await renderFramesDirectly(
        renderSession,
        createFrames,
        frameCount,
        renderConfig,
        onProgress,
      ));
    } catch (streamingError) {
      console.info('[video] Codificacion directa no disponible; usando fallback', streamingError);
      framesDir = await renderFramesToDirectory(
        renderSession,
        createFrames,
        frameCount,
        renderConfig,
        onProgress,
      );
      ({ outputPath } = await encodeVideo(
        framesDir,
        frameCount,
        renderConfig.speedMultiplier,
        (encodeProgress) => {
          const nextProgress = 75 + Math.round(encodeProgress * 24);
          onProgress?.(nextProgress, 'generationFinalizing');
        },
      ));
    }
    let persistedVideo = null;
    if (persistVideo) {
      try {
        persistedVideo = await persistGeneratedVideo(outputPath, persistVideo);
      } catch (error) {
        console.warn('[video] El video local esta listo, pero no se pudo persistir su copia:', error);
      }
    } else if (!playerOverlays.length) {
      const upload = await proxyUploadToR2(outputPath);
      if (upload?.r2Key) await updateVideo(videoId, { r2Key: upload.r2Key });
    }
    onProgress?.(100, 'generationComplete');
    return { outputPath, persistedVideo };
  } finally {
    renderSession.releasePlayerPhotos?.();
    if (framesDir) RNFS.unlink(framesDir).catch(() => {});
  }
}

const localRegenerationListeners = new Map();
const localRegenerationSavedListeners = new Map();

export function regenerateVideoInBrowser(videoId, {
  playerOverlays = [],
  fieldType,
  onProgress,
  persistVideo,
  renderWidth,
  cacheVersion,
  reuseResult = false,
} = {}) {
  if (!videoId) throw new Error('No hay video para regenerar');
  const cacheKey = `${videoId}:${cacheVersion || ''}:${fieldType || ''}:${renderWidth || 'full'}:${JSON.stringify(playerOverlays)}:${persistVideo ? 'persist' : 'preview'}`;

  if (reuseResult && localRegenerationResultCache.has(cacheKey)) {
    onProgress?.(100, 'generationComplete');
    return Promise.resolve(URL.createObjectURL(localRegenerationResultCache.get(cacheKey)));
  }

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
      regenerateStoredVideo(videoId, playerOverlays, triggerProgress, persistVideo, fieldType, renderWidth)
        .then(async (result) => {
          if (result.persistedVideo) {
            const listeners = localRegenerationSavedListeners.get(cacheKey) || [];
            const artifact = { ...result.persistedVideo, url: result.outputPath };
            void Promise.allSettled(
              [...listeners].map((listener) => Promise.resolve().then(() => listener(artifact))),
            ).then((settled) => settled.forEach((entry) => {
              if (entry.status === 'rejected') {
                console.warn('[video] No se pudo guardar la referencia del video de la ficha:', entry.reason);
              }
            }));
          }
          if (reuseResult) {
            const response = await fetch(result.outputPath);
            const cachedBlob = await response.blob();
            URL.revokeObjectURL(result.outputPath);
            localRegenerationResultCache.set(cacheKey, cachedBlob);
            while (localRegenerationResultCache.size > MAX_PREVIEW_CACHE_ENTRIES) {
              const oldestKey = localRegenerationResultCache.keys().next().value;
              localRegenerationResultCache.delete(oldestKey);
            }
            return URL.createObjectURL(cachedBlob);
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
export function isCachedRegeneratedVideoUrl(_url) {
  return false;
}
