// utils/videoUtils.js — implementación web para generar vídeo táctico.
// Los frames se guardan como data URLs en el shim de react-native-fs
// o Blob en el shim de react-native-fs (globalThis.__rnfsFrames). La ruta
// principal usa WebCodecs + muxing MP4, y FFmpeg/MediaRecorder quedan como
// fallback de compatibilidad.
// `outputPath` devuelto es una blob URL (`blob:http://...`). El shim de
// RNFS la trata como entrada válida en unlink (URL.revokeObjectURL).

import { SPEED_TO_FPS } from '@/constants/video';
import RNFS from 'react-native-fs';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { cdnUrl } from '@/config';

let _ffmpegInstance = null;
let _ffmpegLoading = null;

async function getFFmpeg() {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_ffmpegLoading) return _ffmpegLoading;
  _ffmpegLoading = (async () => {
    try {
      const ff = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      _ffmpegInstance = ff;
      return ff;
    } catch (error) {
      _ffmpegLoading = null;
      throw error;
    }
  })();
  return _ffmpegLoading;
}

// Convierte un blob WebM a MP4 H.264 usando FFmpeg.wasm
async function webmToMp4(webmBlob) {
  const ff = await getFFmpeg();
  const inputName = 'input.webm';
  const outputName = 'output.mp4';
  await ff.writeFile(inputName, await fetchFile(webmBlob));
  await ff.exec([
    '-i',
    inputName,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-tune',
    'animation',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    outputName,
  ]);
  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});
  return new Blob([data], { type: 'video/mp4' });
}

/**
 * Garantiza que un Blob de video sea MP4. Si es WebM lo convierte con FFmpeg.
 * Si FFmpeg falla, devuelve el blob original con warning.
 * Exportado para uso en el shim de expo-file-system.
 */
export async function ensureMp4Blob(blob) {
  const type = blob?.type || '';
  if (type.includes('mp4')) return blob;
  if (blob && blob.size > 8) {
    try {
      const header = await blob.slice(4, 8).arrayBuffer();
      const bytes = new Uint8Array(header);
      if (bytes[0] === 0x66 && bytes[1] === 0x74 && bytes[2] === 0x79 && bytes[3] === 0x70) {
        return blob;
      }
    } catch (_) {}
  }
  try {
    return await webmToMp4(blob);
  } catch (e) {
    console.warn('[ensureMp4Blob] FFmpeg conversion failed, returning original blob', e);
    return blob;
  }
}

export const warmUpFFmpeg = () => {
  if (isMobileBrowser()) return;
  const run = () => getFFmpeg().catch(() => {});
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    window.requestIdleCallback(run, { timeout: 3000 });
    return;
  }
  setTimeout(run, 1000);
};

export const initRecordingSession = async () => {
  const sessionId = Date.now();
  return `/virtual/frames_${sessionId}`;
};

export const captureFrame = async (_ref, currentElements, frameIndex) => {
  // No usado por el flujo actual (videoRecorder hace captureRef + moveFile),
  // pero mantengo la firma para compatibilidad.
  return {
    timestamp: frameIndex * (1000 / 30),
    filePath: `frame_${frameIndex}.png`,
    elements: currentElements,
  };
};

const isBlob = (value) => typeof Blob !== 'undefined' && value instanceof Blob;

/** Mejor downsampling / composición 2D sin coste por frame relevante. */
function applyHighQualityCanvas2D(context) {
  if (!context) return;
  context.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in context) {
    try {
      context.imageSmoothingQuality = 'high';
    } catch {
      /* ignore */
    }
  }
}

// Carga una URL/dataURL/objectURL en una HTMLImageElement
const loadImage = (sourceUrl, crossOrigin = false) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = typeof sourceUrl === 'string' ? cdnUrl(sourceUrl) : sourceUrl;
  });

async function loadFrameImage(source) {
  if (typeof createImageBitmap === 'function') {
    if (isBlob(source)) {
      try {
        const image = await createImageBitmap(source);
        return { image, width: image.width, height: image.height, close: () => image.close?.() };
      } catch (_) {}
    }
    if (typeof source === 'string' && source.startsWith('data:')) {
      try {
        const blob = await (await fetch(source)).blob();
        const image = await createImageBitmap(blob);
        return { image, width: image.width, height: image.height, close: () => image.close?.() };
      } catch (_) {}
    }
  }

  if (isBlob(source)) {
    const objectUrl = URL.createObjectURL(source);
    try {
      const image = await loadImage(objectUrl);
      return {
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        close: () => URL.revokeObjectURL(objectUrl),
      };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  const isExternalUrl = typeof source === 'string' && source.startsWith('http');
  const image = await loadImage(source, isExternalUrl);
  return {
    image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    close: () => {},
  };
}

const yieldToBrowser = () =>
  new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(finish, 0));
    }
    setTimeout(finish, 32);
  });

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

async function waitForEncoderQueue(
  encoder,
  getProgressCount,
  maxQueueSize = 24,
  stallTimeoutMs = 2500,
) {
  let lastQueueSize = encoder.encodeQueueSize;
  let lastProgressCount = getProgressCount();
  let lastActivityAt = nowMs();

  while (encoder.encodeQueueSize > maxQueueSize) {
    await yieldToBrowser();
    const queueSize = encoder.encodeQueueSize;
    const progressCount = getProgressCount();

    if (queueSize < lastQueueSize || progressCount > lastProgressCount) {
      lastQueueSize = queueSize;
      lastProgressCount = progressCount;
      lastActivityAt = nowMs();
      continue;
    }

    if (nowMs() - lastActivityAt > stallTimeoutMs) {
      throw new Error('WebCodecs encoder bloqueado esperando cola');
    }
  }
}

async function waitForEncoderFlush(encoder, getProgressCount, totalFrames, stallTimeoutMs = 2500) {
  let finished = false;
  let failure = null;
  const flushPromise = encoder
    .flush()
    .then(() => {
      finished = true;
    })
    .catch((error) => {
      failure = error;
    });
  let lastProgressCount = getProgressCount();
  let lastActivityAt = nowMs();

  while (!finished) {
    if (failure) throw failure;
    await yieldToBrowser();

    const progressCount = getProgressCount();
    if (progressCount > lastProgressCount) {
      lastProgressCount = progressCount;
      lastActivityAt = nowMs();
      continue;
    }

    const timeout = progressCount >= totalFrames ? 5000 : stallTimeoutMs;
    if (nowMs() - lastActivityAt > timeout) {
      throw new Error('WebCodecs encoder bloqueado al finalizar');
    }
  }

  await flushPromise;
}

function getSortedFrameKeys(framesDir) {
  const store = RNFS.__getFrames ? RNFS.__getFrames() : null;
  if (!store) throw new Error('Store de frames no disponible (RNFS shim)');

  const prefix = framesDir.endsWith('/') ? framesDir : framesDir + '/';
  const keys = Array.from(store.keys())
    .filter((key) => key.startsWith(prefix))
    .sort();

  if (keys.length === 0) {
    throw new Error('No hay frames capturados para codificar');
  }

  return { store, keys };
}

function dataUrlToBytes(dataUrl) {
  const commaIndex = dataUrl.indexOf(',');
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return base64ToBytes(payload);
}

function base64ToBytes(payload) {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function frameSourceToBytes(source) {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (isBlob(source)) return new Uint8Array(await source.arrayBuffer());
  if (typeof source === 'string' && source.startsWith('data:')) return dataUrlToBytes(source);
  return fetchFile(source);
}

function getVideoBitrate(width, height) {
  const area = Math.max(1, width * height);
  const ref = 1920 * 1080;
  return Math.max(14_000_000, Math.min(52_000_000, Math.round((area / ref) * 24_000_000)));
}

function getFrameFileExtension(source, key = '') {
  const normalizedKey = String(key).toLowerCase();
  if (normalizedKey.endsWith('.jpg') || normalizedKey.endsWith('.jpeg')) return 'jpg';
  if (normalizedKey.endsWith('.webp')) return 'webp';
  if (normalizedKey.endsWith('.png')) return 'png';
  if (isBlob(source)) {
    if (source.type.includes('jpeg') || source.type.includes('jpg')) return 'jpg';
    if (source.type.includes('webp')) return 'webp';
  }
  return 'png';
}

async function getWebCodecsConfig(width, height, fps) {
  if (typeof window === 'undefined' || !window.VideoEncoder || !window.VideoFrame) {
    throw new Error('WebCodecs no disponible en este navegador');
  }

  const baseConfig = {
    width,
    height,
    bitrate: getVideoBitrate(width, height),
    framerate: fps,
    latencyMode: 'quality',
    avc: { format: 'avc' },
  };

  const hardwareOptions = ['prefer-hardware', 'no-preference'];
  const codecCandidates = [
    'avc1.640028',
    'avc1.64001f',
    'avc1.4d401f',
    'avc1.42001f',
    'avc1.42e01f',
  ];

  for (const hw of hardwareOptions) {
    for (const codec of codecCandidates) {
      const config = { ...baseConfig, hardwareAcceleration: hw, codec };
      if (!window.VideoEncoder.isConfigSupported) return config;
      const support = await window.VideoEncoder.isConfigSupported(config);
      if (support.supported) return support.config || config;
    }
  }

  throw new Error('H.264 WebCodecs no soportado');
}

async function generateVideoWithWebCodecs(framesDir, frameCount, speed = 1, onProgress) {
  const fps = SPEED_TO_FPS[speed] || 30;
  const { store, keys } = getSortedFrameKeys(framesDir);
  const firstFrame = await loadFrameImage(store.get(keys[0]));
  const sourceWidth = firstFrame.width;
  const sourceHeight = firstFrame.height;
  const width = sourceWidth % 2 === 0 ? sourceWidth : sourceWidth + 1;
  const height = sourceHeight % 2 === 0 ? sourceHeight : sourceHeight + 1;
  const config = await getWebCodecsConfig(width, height, fps);
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height, frameRate: fps },
    fastStart: 'in-memory',
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  applyHighQualityCanvas2D(ctx);
  const frameDurationUs = Math.round(1_000_000 / fps);
  let encoderError = null;
  // Contar frames realmente codificados (no sólo encolados) para progreso preciso
  let encodedCount = 0;
  const totalFrames = keys.length;
  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
      encodedCount++;
      // Progreso real: 0 → 0.97 según frames efectivamente codificados
      onProgress?.(Math.min(0.97, (encodedCount / totalFrames) * 0.97));
    },
    error: (error) => {
      encoderError = error;
    },
  });

  encoder.configure(config);

  try {
    for (let index = 0; index < keys.length; index++) {
      const dataUrl = store.get(keys[index]);
      if (!dataUrl) continue;
      const frameImage = index === 0 ? firstFrame : await loadFrameImage(dataUrl);
      try {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(frameImage.image, 0, 0, sourceWidth, sourceHeight);

        const frame = new window.VideoFrame(canvas, {
          timestamp: index * frameDurationUs,
          duration: frameDurationUs,
        });
        encoder.encode(frame, {
          keyFrame: index === 0 || index % Math.max(1, Math.round(fps)) === 0,
        });
        frame.close();
      } finally {
        if (index !== 0) frameImage.close();
      }

      // Back-pressure con límite: si el encoder del navegador se atasca, cae a FFmpeg.
      await waitForEncoderQueue(encoder, () => encodedCount);
      if (index % 8 === 0) await yieldToBrowser();
      if (encoderError) throw encoderError;
    }

    await waitForEncoderFlush(encoder, () => encodedCount, totalFrames);
    if (encoderError) throw encoderError;
    onProgress?.(0.99);
    muxer.finalize();

    for (const key of keys) store.delete(key);

    return {
      outputPath: URL.createObjectURL(new Blob([target.buffer], { type: 'video/mp4' })),
      frameCount: keys.length || frameCount,
      mimeType: 'video/mp4',
    };
  } finally {
    firstFrame.close();
    if (encoder.state !== 'closed') encoder.close();
  }
}

export async function createStreamingVideoEncoder({ speed = 1, frameCount = 0, onProgress } = {}) {
  if (typeof window === 'undefined' || !window.VideoEncoder || !window.VideoFrame) {
    throw new Error('WebCodecs no disponible en este navegador');
  }

  const fps = SPEED_TO_FPS[speed] || 30;
  const target = new ArrayBufferTarget();
  const frameDurationUs = Math.round(1_000_000 / fps);
  const keyFrameInterval = Math.max(1, Math.round(fps));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  let encoder = null;
  let muxer = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let outputWidth = 0;
  let outputHeight = 0;
  let encodedCount = 0;
  let submittedCount = 0;
  let encoderError = null;

  const setup = async (frameImage) => {
    sourceWidth = frameImage.width;
    sourceHeight = frameImage.height;
    outputWidth = sourceWidth % 2 === 0 ? sourceWidth : sourceWidth + 1;
    outputHeight = sourceHeight % 2 === 0 ? sourceHeight : sourceHeight + 1;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    applyHighQualityCanvas2D(ctx);

    const config = await getWebCodecsConfig(outputWidth, outputHeight, fps);
    muxer = new Muxer({
      target,
      video: { codec: 'avc', width: outputWidth, height: outputHeight, frameRate: fps },
      fastStart: 'in-memory',
    });
    encoder = new window.VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
        encodedCount++;
        const denominator = Math.max(1, frameCount || submittedCount);
        onProgress?.(Math.min(0.99, encodedCount / denominator));
      },
      error: (error) => {
        encoderError = error;
      },
    });
    encoder.configure(config);
  };

  const addFrame = async (frameSource, index = submittedCount) => {
    if (encoderError) throw encoderError;
    const frameImage = await loadFrameImage(frameSource);
    try {
      if (!encoder) await setup(frameImage);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      ctx.drawImage(frameImage.image, 0, 0, sourceWidth, sourceHeight);

      const frame = new window.VideoFrame(canvas, {
        timestamp: index * frameDurationUs,
        duration: frameDurationUs,
      });
      encoder.encode(frame, { keyFrame: index === 0 || index % keyFrameInterval === 0 });
      submittedCount++;
      frame.close();

      if (encoder.encodeQueueSize > 48) {
        await waitForEncoderQueue(encoder, () => encodedCount, 32, 1500);
      }
      if (encoderError) throw encoderError;
    } finally {
      frameImage.close();
    }
  };

  const finish = async () => {
    if (!encoder || !muxer) throw new Error('No hay frames para codificar');
    await waitForEncoderFlush(encoder, () => encodedCount, submittedCount || frameCount, 2000);
    if (encoderError) throw encoderError;
    onProgress?.(0.995);
    muxer.finalize();
    if (encoder.state !== 'closed') encoder.close();

    return {
      outputPath: URL.createObjectURL(new Blob([target.buffer], { type: 'video/mp4' })),
      frameCount: submittedCount || frameCount,
      mimeType: 'video/mp4',
    };
  };

  const abort = () => {
    if (encoder && encoder.state !== 'closed') encoder.close();
  };

  return { addFrame, finish, abort };
}

async function generateVideoWithFFmpeg(framesDir, frameCount, speed = 1, onProgress) {
  const fps = SPEED_TO_FPS[speed] || 30;
  const { store, keys } = getSortedFrameKeys(framesDir);
  const ff = await getFFmpeg();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const inputPrefix = `frame_${id}_`;
  const outputName = `video_${id}.mp4`;
  const writtenFiles = [];
  const firstSource = store.get(keys[0]);
  const frameExtension = getFrameFileExtension(firstSource, keys[0]);

  try {
    for (let index = 0; index < keys.length; index++) {
      const frameSource = store.get(keys[index]);
      if (!frameSource) continue;
      const fileName = `${inputPrefix}${String(index).padStart(4, '0')}.${frameExtension}`;
      await ff.writeFile(fileName, await frameSourceToBytes(frameSource));
      writtenFiles.push(fileName);
      onProgress?.(Math.min(0.4, ((index + 1) / keys.length) * 0.4));
      if (index % 8 === 0) await yieldToBrowser();
    }

    const progressHandler = ({ progress }) => {
      const normalizedProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
      onProgress?.(0.4 + normalizedProgress * 0.55);
    };

    ff.on('progress', progressHandler);
    try {
      await ff.exec([
        '-framerate',
        String(fps),
        '-start_number',
        '0',
        '-i',
        `${inputPrefix}%04d.${frameExtension}`,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '18',
        '-tune',
        'animation',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        outputName,
      ]);
    } finally {
      ff.off('progress', progressHandler);
    }
    onProgress?.(0.95);

    const data = await ff.readFile(outputName);
    const finalBlob = new Blob([data], { type: 'video/mp4' });
    onProgress?.(0.98);

    for (const key of keys) store.delete(key);

    return {
      outputPath: URL.createObjectURL(finalBlob),
      frameCount: keys.length || frameCount,
      mimeType: 'video/mp4',
    };
  } finally {
    for (const fileName of writtenFiles) {
      await ff.deleteFile(fileName).catch(() => {});
    }
    await ff.deleteFile(outputName).catch(() => {});
  }
}

// Elige el mimeType soportado por el browser. Priorizamos H.264 (mp4) si
// está, luego VP9 (alta calidad/compresión), VP8 y por último cualquier mp4.
const pickMime = () => {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1.640033', // H.264 high profile
    'video/mp4;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const m of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
};

async function generateVideoWithMediaRecorder(framesDir, frameCount, speed = 1, onProgress) {
  const fps = SPEED_TO_FPS[speed] || 30;

  if (typeof window === 'undefined' || !window.MediaRecorder) {
    throw new Error('MediaRecorder no disponible en este navegador');
  }

  const { store, keys } = getSortedFrameKeys(framesDir);

  // Pre-cargar primer frame para obtener dimensiones
  const firstFrame = await loadFrameImage(store.get(keys[0]));
  const width = firstFrame.width;
  const height = firstFrame.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  applyHighQualityCanvas2D(ctx);
  ctx.drawImage(firstFrame.image, 0, 0, width, height);
  firstFrame.close();

  const stream = canvas.captureStream(0); // manual frame requests
  const track = stream.getVideoTracks()[0];
  const mime = pickMime();

  // Bitrate generoso para preservar la fidelidad: ~16 Mbps base, escalado
  // por área respecto a 1080p. Suficiente para detalles de iconos pequeños
  // sobre el campo (líneas, números) sin artefactos visibles.
  const targetBitrate = getVideoBitrate(width, height);

  const recorder = new MediaRecorder(
    stream,
    mime ? { mimeType: mime, videoBitsPerSecond: targetBitrate } : undefined,
  );
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start();

  const frameInterval = 1000 / fps;
  const startTime = performance.now();

  // Pintar primer frame
  if (track.requestFrame) track.requestFrame();

  for (let i = 0; i < keys.length; i++) {
    const target = startTime + i * frameInterval;
    const now = performance.now();
    if (target > now) {
      await new Promise((r) => setTimeout(r, target - now));
    }
    const frameSource = store.get(keys[i]);
    if (!frameSource) continue;
    const frameImage = await loadFrameImage(frameSource);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(frameImage.image, 0, 0, width, height);
    frameImage.close();
    if (track.requestFrame) track.requestFrame();
    onProgress?.(Math.min(0.95, ((i + 1) / keys.length) * 0.95));
  }

  // Mantener el último frame visible un instante para que el encoder lo capture
  await new Promise((r) => setTimeout(r, frameInterval * 2));

  recorder.stop();
  await stopped;

  const rawMime = mime || 'video/webm';
  const rawBlob = new Blob(chunks, { type: rawMime });

  // Limpiar frames del store antes de la conversión
  for (const k of keys) store.delete(k);

  // Si el browser grabó WebM, recodificamos a MP4 con FFmpeg.wasm
  const isWebm = !rawMime.includes('mp4');
  let finalBlob = rawBlob;
  let finalMime = rawMime;
  if (isWebm) {
    try {
      finalBlob = await webmToMp4(rawBlob);
      finalMime = 'video/mp4';
    } catch (e) {
      console.warn('[videoUtils] FFmpeg WebM→MP4 failed, falling back to WebM', e);
      finalBlob = rawBlob;
      finalMime = rawMime;
    }
  }

  const outputPath = URL.createObjectURL(finalBlob);
  return { outputPath, frameCount: keys.length, mimeType: finalMime };
}

const isMobileBrowser = () =>
  /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  ('ontouchstart' in window && window.innerWidth < 1280);

const isNativeAndroid = () =>
  typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() === 'android';

const isNativeApp = () =>
  typeof window !== 'undefined' &&
  window.Capacitor?.getPlatform &&
  window.Capacitor.getPlatform() !== 'web';

async function generateVideoWithNativeAndroid(framesDir, frameCount, speed = 1, onProgress) {
  const { registerPlugin } = await import('@capacitor/core');
  const NativeVideoEncoder = registerPlugin('NativeVideoEncoder');
  const fps = SPEED_TO_FPS[speed] || 30;
  const { store, keys } = getSortedFrameKeys(framesDir);
  const frames = [];

  for (let index = 0; index < keys.length; index++) {
    frames.push(await RNFS.readFile(keys[index], 'base64'));
    onProgress?.(Math.min(0.35, ((index + 1) / keys.length) * 0.35));
    if (index % 6 === 0) await yieldToBrowser();
  }

  const result = await NativeVideoEncoder.encodeFrames({ frames, fps });
  if (!result?.data) throw new Error('El encoder nativo no devolvio video');
  onProgress?.(0.95);

  const videoBlob = new Blob([base64ToBytes(result.data)], { type: 'video/mp4' });
  if (!videoBlob.size) throw new Error('El video nativo generado esta vacio');

  for (const key of keys) store.delete(key);

  return {
    outputPath: URL.createObjectURL(videoBlob),
    frameCount: keys.length || frameCount,
    mimeType: 'video/mp4',
  };
}

export const generateVideo = async (framesDir, frameCount, speed = 1, onProgress) => {
  let result;
  if (isNativeAndroid()) {
    result = await generateVideoWithNativeAndroid(framesDir, frameCount, speed, onProgress);
  } else {
    try {
      result = await generateVideoWithWebCodecs(framesDir, frameCount, speed, onProgress);
    } catch (webCodecsError) {
      if (!String(webCodecsError?.message || '').includes('H.264 WebCodecs no soportado')) {
        console.info('[videoUtils] WebCodecs falló, usando fallback', webCodecsError);
      }
      if (isMobileBrowser() && !isNativeApp()) {
        console.info('[videoUtils] Skip FFmpeg on mobile (30MB+ WASM), using MediaRecorder');
        result = generateVideoWithMediaRecorder(framesDir, frameCount, speed, onProgress);
      } else {
        try {
          result = await generateVideoWithFFmpeg(framesDir, frameCount, speed, onProgress);
        } catch (ffmpegError) {
          if (isNativeApp()) throw ffmpegError;
          console.info(
            '[videoUtils] FFmpeg directo falló, usando MediaRecorder fallback',
            ffmpegError,
          );
          result = generateVideoWithMediaRecorder(framesDir, frameCount, speed, onProgress);
        }
      }
    }
  }

  return result;
};

export const generateVideoWithDiagnostics = generateVideo;
