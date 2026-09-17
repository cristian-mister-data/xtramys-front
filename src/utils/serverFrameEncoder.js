import api from '@/api/client';
import { SPEED_TO_FPS } from '@/constants/video';

const MAX_FRAME_BYTES = 4 * 1024 * 1024;

// Cede el hilo de la WebView entre operaciones de imagen pesadas.
const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 16));

// El canvas original decide cada píxel. El servidor sólo comprime los PNG a H.264.
export function createServerFrameEncoder({ speed = 1, frameCount, onProgress } = {}) {
  const sessionId =
    crypto.randomUUID?.() ||
    Array.from(crypto.getRandomValues(new Uint8Array(18)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
  const path = `/video/frame-encoding/${sessionId}`;
  const controller = new AbortController();
  let started = false;
  let starting = null;
  let ended = false;
  let submitted = 0;
  let batch = [];

  const assertActive = () => {
    if (ended || controller.signal.aborted) throw new Error('Generación de vídeo cancelada');
  };
  const pause = (ms) =>
    new Promise((resolve, reject) => {
      if (controller.signal.aborted) return reject(new Error('Generación de vídeo cancelada'));
      const cancel = () => {
        clearTimeout(timer);
        reject(new Error('Generación de vídeo cancelada'));
      };
      const timer = setTimeout(() => {
        controller.signal.removeEventListener('abort', cancel);
        resolve();
      }, ms);
      controller.signal.addEventListener('abort', cancel, { once: true });
    });
  const request = async (method, url, data, extra = {}) => {
    for (let attempt = 0; ; attempt++) {
      assertActive();
      try {
        return await api.request({
          method,
          url,
          data,
          timeout: 45000,
          signal: controller.signal,
          skipCache: true,
          ...extra,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          attempt >= 2 ||
          !(
            error.type === 'OFFLINE' ||
            error.type === 'TIMEOUT' ||
            error.status >= 500 ||
            error.status === 429
          )
        )
          throw error;
        // Los índices del bloque hacen seguro reintentar una respuesta perdida.
        await pause(1000 * (attempt + 1));
      }
    }
  };
  const flush = async () => {
    if (!batch.length) return;
    const response = await request('put', `${path}/frames`, { frames: batch });
    batch = [];
    onProgress?.(Math.min(0.98, response.data.nextFrame / frameCount));
  };
  const release = () => api.delete(path, { timeout: 10000 }).catch(() => {});

  const addFrame = async (canvas, index = submitted, durationFrames = 1) => {
    assertActive();
    if (
      index !== submitted ||
      !Number.isInteger(durationFrames) ||
      durationFrames < 1 ||
      submitted + durationFrames > frameCount
    )
      throw new Error('Secuencia de fotogramas inválida');
    if (!started) {
      starting = request('put', path, {
        width: canvas.width,
        height: canvas.height,
        fps: SPEED_TO_FPS[speed] || 30,
        frameCount,
      });
      await starting;
      started = true;
    }
    await yieldToUi();
    // WebKit puede aplazar la exportación asíncrona del canvas hasta recibir
    // un toque. La exportación síncrona evita depender de ese callback.
    const dataUrl = canvas.toDataURL('image/png');
    const separator = dataUrl.indexOf(',');
    if (separator < 0) throw new Error('No se pudo preparar el fotograma');
    const data = dataUrl.slice(separator + 1);
    const frameBytes = Math.ceil((data.length * 3) / 4);
    assertActive();
    if (frameBytes > MAX_FRAME_BYTES) throw new Error('El fotograma supera el tamaño permitido');
    batch.push({ index, durationFrames, data });
    submitted += durationFrames;
    // El progreso no espera al flush del lote: así la UI avanza aunque haya
    // una subida de red pendiente y no requiere interacción táctil.
    onProgress?.(Math.min(0.98, submitted / frameCount));
    // Una petición por frame evita serializaciones grandes y mantiene una
    // confirmación de progreso constante incluso en dispositivos lentos.
    await flush();
    await yieldToUi();
  };

  const finish = async () => {
    assertActive();
    if (!started || submitted !== frameCount) throw new Error('Faltan fotogramas del vídeo');
    await flush();
    let response = await request('post', `${path}/finish`);
    const deadline = Date.now() + 180000;
    while (response.data.status !== 'completed') {
      if (response.data.status === 'failed')
        throw new Error(response.data.error || 'No se pudo crear el vídeo');
      if (Date.now() >= deadline)
        throw new Error('Se agotó el tiempo de generación. Vuelve a intentarlo.');
      await pause(1000);
      response = await request('get', path);
    }
    const downloaded = await request('get', `${path}/video`, undefined, {
      responseType: 'blob',
      timeout: 120000,
    });
    assertActive();
    const blob = downloaded.data;
    const header =
      blob instanceof Blob ? new Uint8Array(await blob.slice(0, 12).arrayBuffer()) : [];
    if (header[4] !== 0x66 || header[5] !== 0x74 || header[6] !== 0x79 || header[7] !== 0x70) {
      throw new Error('El servidor no devolvió un MP4 válido');
    }
    assertActive();
    ended = true;
    void release();
    onProgress?.(1);
    return { outputPath: URL.createObjectURL(blob), mimeType: 'video/mp4', frameCount };
  };

  const abort = () => {
    if (ended) return;
    ended = true;
    controller.abort();
    batch = [];
    if (starting) void starting.catch(() => {}).then(release);
  };
  return { addFrame, finish, abort };
}
