/**
 * Generación de vídeo de animación de pizarra táctica, 100% cliente
 * usando canvas.captureStream() + MediaRecorder. No necesita backend.
 *
 * Flujo:
 *  1. El usuario captura keyframes (estados de la pizarra).
 *  2. `generateVideo` interpola entre keyframes sobre el tiempo,
 *     llama a `setFrame(elements)` para actualizar el Stage de Konva,
 *     y registra el stream del <canvas> subyacente en un Blob WebM.
 *
 * Interpolación: easeInOutCubic sobre propiedades compatibles
 * (x, y, rotation, size, thickness, points[]).
 */

export const EASE = {
  linear: (t) => t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2),
};

export const SPEED_TO_DURATIONS = {
  0.5: { move: 1.6, hold: 0.4 },
  1: { move: 0.8, hold: 0.2 },
  2: { move: 0.4, hold: 0.1 },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpElement(a, b, t) {
  if (!a || !b) return a || b;
  const out = { ...b };
  if (typeof a.x === 'number' && typeof b.x === 'number') out.x = lerp(a.x, b.x, t);
  if (typeof a.y === 'number' && typeof b.y === 'number') out.y = lerp(a.y, b.y, t);
  if (typeof a.rotation === 'number' && typeof b.rotation === 'number') {
    out.rotation = lerp(a.rotation, b.rotation, t);
  }
  if (typeof a.size === 'number' && typeof b.size === 'number') out.size = lerp(a.size, b.size, t);
  if (typeof a.thickness === 'number' && typeof b.thickness === 'number') {
    out.thickness = lerp(a.thickness, b.thickness, t);
  }
  if (Array.isArray(a.points) && Array.isArray(b.points) && a.points.length === b.points.length) {
    out.points = a.points.map((pa, i) => ({
      x: lerp(pa.x, b.points[i].x, t),
      y: lerp(pa.y, b.points[i].y, t),
    }));
  }
  return out;
}

/**
 * Dado un instante `time` (en segundos) y los keyframes, devuelve el array
 * de elementos interpolado correspondiente.
 */
export function frameAt({ keyframes, time, moveDuration, holdDuration }) {
  if (!keyframes || keyframes.length === 0) return [];
  const segDuration = moveDuration + holdDuration;
  const segmentIdx = Math.min(Math.floor(time / segDuration), keyframes.length - 2);
  const localT = time - segmentIdx * segDuration;
  const a = keyframes[segmentIdx]?.elements || [];
  const b = keyframes[segmentIdx + 1]?.elements || a;

  // After moveDuration, we hold (snap to b)
  let t;
  if (localT >= moveDuration) {
    t = 1;
  } else {
    t = EASE.easeInOutCubic(Math.max(0, Math.min(1, localT / moveDuration)));
  }

  // Build by id from current (b) to preserve presence/absence
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

/**
 * Ejecuta la grabación. Recibe:
 *  - stageRef: ref con .getStage() o .current (el Stage de konva)
 *  - keyframes: array
 *  - setFrame: (elements) => void (actualiza el estado de la pizarra)
 *  - options: { speed: 0.5|1|2, fps, onProgress, mimeType }
 *
 * Devuelve Promise<{ blob, url, durationSec }>.
 */
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

  const streamCanvas = document.createElement('canvas');
  streamCanvas.width = stage.width();
  streamCanvas.height = stage.height();
  const ctx = streamCanvas.getContext('2d');

  const renderStageToStreamCanvas = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, streamCanvas.width, streamCanvas.height);
    const layers = stage.getLayers();
    layers.forEach((layer) => {
      const c = layer.getCanvas()._canvas;
      ctx.drawImage(c, 0, 0, streamCanvas.width, streamCanvas.height);
    });
  };

  // Draw initial frame to initialise the canvas before captureStream
  renderStageToStreamCanvas();

  // Pick supported mimeType
  const preferred = mimeType || 'video/webm;codecs=vp9';
  const mt = (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(preferred))
    ? preferred
    : (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp8'))
      ? 'video/webm;codecs=vp8'
      : 'video/webm';

  const stream = streamCanvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: mt, videoBitsPerSecond: 4_000_000 });
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

  recorder.start();

  const startTime = performance.now();
  let lastFrame = -1;

  // Render loop
  await new Promise((resolve) => {
    const loop = () => {
      const elapsed = performance.now() - startTime;
      const frameIdx = Math.min(Math.floor(elapsed / frameInterval), totalFrames - 1);

      if (frameIdx !== lastFrame) {
        lastFrame = frameIdx;
        const tSec = Math.min(duration, frameIdx / fps);
        const frameElements = frameAt({ keyframes, time: tSec, moveDuration, holdDuration });
        setFrame(frameElements);
      }

      // draw after paint — wait for React to flush state update
      requestAnimationFrame(() => {
        try {
          stage.batchDraw();
          renderStageToStreamCanvas();
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

  // Small tail so the last frame is flushed
  await new Promise((r) => setTimeout(r, 120));
  recorder.stop();
  return donePromise;
}
