// utils/videoUtils.js — implementación web con canvas + MediaRecorder.
// Los frames se guardan como data URLs en el shim de react-native-fs
// (globalThis.__rnfsFrames). Acá los leemos en orden, los pintamos en
// un canvas a SPEED_TO_FPS[speed] y grabamos a webm via MediaRecorder.
//
// Si el browser graba WebM, se usa FFmpeg.wasm para recodificar a MP4 H.264.
// `outputPath` devuelto es una blob URL (`blob:http://...`). El shim de
// RNFS la trata como entrada válida en unlink (URL.revokeObjectURL).

import { SPEED_TO_FPS } from '@/constants/video';
import RNFS from 'react-native-fs';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let _ffmpegInstance = null;
let _ffmpegLoading = null;

async function getFFmpeg() {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_ffmpegLoading) return _ffmpegLoading;
  _ffmpegLoading = (async () => {
    const ff = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    _ffmpegInstance = ff;
    return ff;
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
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-movflags', '+faststart',
    '-an',
    outputName,
  ]);
  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});
  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Garantiza que un Blob de video sea MP4. Si es WebM lo convierte con FFmpeg.
 * Si FFmpeg falla, devuelve el blob original con warning.
 * Exportado para uso en el shim de expo-file-system.
 */
export async function ensureMp4Blob(blob) {
  const type = blob?.type || '';
  if (type.includes('mp4')) return blob;
  // Intentar convertir si es webm o tipo desconocido
  try {
    return await webmToMp4(blob);
  } catch (e) {
    console.warn('[ensureMp4Blob] FFmpeg conversion failed, returning original blob', e);
    return blob;
  }
}

export const warmUpFFmpeg = () => {};

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

// Carga una data URL en una HTMLImageElement
const loadImage = (dataUrl) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = (e) => reject(e);
  img.src = dataUrl;
});

// Elige el mimeType soportado por el browser. Priorizamos H.264 (mp4) si
// está, luego VP9 (alta calidad/compresión), VP8 y por último cualquier mp4.
const pickMime = () => {
  const candidates = [
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

export const generateVideo = async (framesDir, frameCount, speed = 1) => {
  const fps = SPEED_TO_FPS[speed] || 30;

  if (typeof window === 'undefined' || !window.MediaRecorder) {
    throw new Error('MediaRecorder no disponible en este navegador');
  }

  // Recuperar frames del store
  const store = RNFS.__getFrames ? RNFS.__getFrames() : null;
  if (!store) throw new Error('Store de frames no disponible (RNFS shim)');

  // Listado ordenado por nombre (frame0000.png, frame0001.png, ...)
  const prefix = framesDir.endsWith('/') ? framesDir : framesDir + '/';
  const keys = Array.from(store.keys())
    .filter((k) => k.startsWith(prefix))
    .sort();

  if (keys.length === 0) {
    throw new Error('No hay frames capturados para codificar');
  }

  // Pre-cargar primer frame para obtener dimensiones
  const firstImg = await loadImage(store.get(keys[0]));
  const width = firstImg.naturalWidth || firstImg.width;
  const height = firstImg.naturalHeight || firstImg.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(firstImg, 0, 0, width, height);

  const stream = canvas.captureStream(0); // manual frame requests
  const track = stream.getVideoTracks()[0];
  const mime = pickMime();

  // Bitrate generoso para preservar la fidelidad: ~16 Mbps base, escalado
  // por área respecto a 1080p. Suficiente para detalles de iconos pequeños
  // sobre el campo (líneas, números) sin artefactos visibles.
  const targetBitrate = Math.max(
    8_000_000,
    Math.min(40_000_000, Math.round((width * height) / (1920 * 1080) * 16_000_000)),
  );

  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: targetBitrate } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

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
    const dataUrl = store.get(keys[i]);
    if (!dataUrl) continue;
    const img = await loadImage(dataUrl);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    if (track.requestFrame) track.requestFrame();
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
};

export const uploadToR2 = async () => {
  throw new Error('uploadToR2 no implementado en web');
};

export const generateVideoWithDiagnostics = generateVideo;
