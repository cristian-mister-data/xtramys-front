/**
 * Generación de vídeo de animación de pizarra táctica, 100% cliente.
 *
 * Calidad máxima para fotos de jugadores:
 *  - Usa stage.toCanvas({ pixelRatio: 4 }) que crea un canvas nuevo a 4×
 *    resolución, renderizando TODOS los nodos (imágenes, clips, formas)
 *    a resolución nativa alta.
 *  - Las fotos CDN (500×500) se renderizan a ~160×160 px reales en el vídeo.
 *  - Bitrate 32 Mbps VP9, 30 fps, timeslice 100 ms.
 */

import { flushSync } from 'react-dom';

export const EASE = {
  linear: (t) => t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2),
};

export const SPEED_TO_DURATIONS = {
  0.5: { move: 1.6, hold: 0.4 },
  1: { move: 0.8, hold: 0.2 },
  2: { move: 0.4, hold: 0.1 },
};

/** Resolución de captura: 4× = las fotos de jugadores se ven nítidas. */
const VIDEO_PIXEL_RATIO = 4;

function applyHighQualityCanvas2D(context) {
  if (!context) return;
  context.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in context) {
    try { context.imageSmoothingQuality = 'high'; } catch { /* ignore */ }
  }
}

/** Bitrate máximo para VP9/WebM — calidad cinematográfica. */
const VIDEO_BITRATE = 32_000_000;

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpPointArray(aPts, bPts, t) {
  if (!Array.isArray(aPts) || !Array.isArray(bPts)) return undefined;
  const n = Math.min(aPts.length, bPts.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const pa = aPts[i], pb = bPts[i];
    if (pa && pb && typeof pa.x === 'number' && typeof pb.x === 'number')
      out.push({ x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t) });
  }
  const longer = aPts.length >= bPts.length ? aPts : bPts;
  for (let i = n; i < longer.length; i++) out.push({ ...longer[i] });
  return out;
}

function interpElement(a, b, t) {
  if (!a || !b) return a || b;
  const out = { ...b };
  const pair = (key) => { if (typeof a[key] === 'number' && typeof b[key] === 'number') out[key] = lerp(a[key], b[key], t); };
  ['x', 'y', 'w', 'h', 'radius', 'rotation', 'size', 'thickness', 'fontSize'].forEach(pair);
  const points = lerpPointArray(a.points, b.points, t);
  if (points) out.points = points;
  return out;
}

export function frameAt({ keyframes, time, moveDuration, holdDuration }) {
  if (!keyframes || keyframes.length === 0) return [];
  const segDuration = moveDuration + holdDuration;
  const segmentIdx = Math.min(Math.floor(time / segDuration), keyframes.length - 2);
  const localT = time - segmentIdx * segDuration;
  const a = keyframes[segmentIdx]?.elements || [];
  const b = keyframes[segmentIdx + 1]?.elements || a;
  let t;
  if (localT >= moveDuration) {
    t = 1;
  } else {
    t = EASE.easeInOutCubic(Math.max(0, Math.min(1, localT / moveDuration)));
  }
  const aMap = new Map(a.map((e) => [e.id, e]));
  return b.map((be) => {
    const ae = aMap.get(be.id);
    return ae ? interpElement(ae, be, t) : be;
  });
}

export function totalDuration({ keyframes, moveDuration, holdDuration, tailSeconds = 0.5 }) {
  if (!keyframes || keyframes.length < 2) return 0;
  return (keyframes.length - 1) * (moveDuration + holdDuration) + tailSeconds;
}

function pickMimeType(preferred) {
  const codecs = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm;codecs=h264',
    'video/webm',
  ];
  if (preferred && MediaRecorder.isTypeSupported(preferred)) return preferred;
  for (const c of codecs) { if (MediaRecorder.isTypeSupported(c)) return c; }
  return 'video/webm';
}

/**
 * Renderiza el stage a resolución 4× usando stage.toCanvas().
 * Esto crea un canvas nuevo donde TODOS los nodos (incluidas las
 * imágenes de fotos de jugadores) se renderizan a 4× su tamaño visual,
 * aprovechando la resolución completa de la imagen CDN original.
 */
function renderHiResFrame(stage, ctx, outW, outH) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, outW, outH);
  try {
    const hiRes = stage.toCanvas({ pixelRatio: VIDEO_PIXEL_RATIO });
    ctx.drawImage(hiRes, 0, 0);
  } catch {
    // Fallback: captura directa de los canvas de las capas
    const layers = stage.getLayers();
    layers.forEach((layer) => {
      const c = layer.getCanvas()._canvas;
      ctx.drawImage(c, 0, 0, outW, outH);
    });
  }
}

export async function recordStageAnimation({
  stage,
  keyframes,
  setFrame,
  speed = 1,
  fps = 30,
  onProgress,
  mimeType,
}) {
  if (!stage) throw new Error('Missing konva stage');
  if (!keyframes || keyframes.length < 2) throw new Error('Se necesitan al menos 2 keyframes');
  if (typeof MediaRecorder === 'undefined') throw new Error('Tu navegador no soporta grabación de vídeo');

  const { move: moveDuration, hold: holdDuration } = SPEED_TO_DURATIONS[speed] || SPEED_TO_DURATIONS[1];
  const duration = totalDuration({ keyframes, moveDuration, holdDuration });
  const totalFrames = Math.max(1, Math.ceil(duration * fps));

  const sw = Math.max(1, stage.width());
  const sh = Math.max(1, stage.height());
  const outW = sw * VIDEO_PIXEL_RATIO;
  const outH = sh * VIDEO_PIXEL_RATIO;

  const streamCanvas = document.createElement('canvas');
  streamCanvas.width = outW;
  streamCanvas.height = outH;
  const ctx = streamCanvas.getContext('2d', { alpha: false });
  applyHighQualityCanvas2D(ctx);

  // Render initial frame
  renderHiResFrame(stage, ctx, outW, outH);

  const mt = pickMimeType(mimeType);
  const stream = streamCanvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: mt,
    videoBitsPerSecond: VIDEO_BITRATE,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

  const frameInterval = 1000 / fps;
  let doneResolve, doneReject;
  const donePromise = new Promise((resolve, reject) => { doneResolve = resolve; doneReject = reject; });

  recorder.onerror = (evt) => {
    const msg = evt?.error?.message || (evt instanceof ErrorEvent ? evt.message : null) || 'Error de grabación';
    doneReject(new Error(msg));
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mt });
    const url = URL.createObjectURL(blob);
    doneResolve({ blob, url, durationSec: duration, mimeType: mt });
  };

  recorder.start(100);

  const startTime = performance.now();
  let lastFrame = -1;

  await new Promise((resolve) => {
    const loop = () => {
      const elapsed = performance.now() - startTime;
      const frameIdx = Math.min(Math.floor(elapsed / frameInterval), totalFrames - 1);

      if (frameIdx !== lastFrame) {
        lastFrame = frameIdx;
        const tSec = Math.min(duration, frameIdx / fps);
        const frameElements = frameAt({ keyframes, time: tSec, moveDuration, holdDuration });
        flushSync(() => { setFrame(frameElements); });
      }

      requestAnimationFrame(() => {
        try {
          renderHiResFrame(stage, ctx, outW, outH);
        } catch { /* ignore */ }

        if (onProgress) onProgress(Math.min(1, elapsed / (duration * 1000)));

        if (elapsed >= duration * 1000) {
          resolve();
        } else {
          requestAnimationFrame(loop);
        }
      });
    };
    requestAnimationFrame(loop);
  });

  await new Promise((r) => setTimeout(r, Math.max(120, Math.round(1000 / fps) * 2)));
  recorder.stop();
  return donePromise;
}