/** Shim de expo-file-system (legacy API) para web. Usa localStorage como backend ligero. */
export const documentDirectory = 'webfs://documents/';
export const cacheDirectory = 'webfs://cache/';
export const bundleDirectory = 'webfs://bundle/';

const KEY = (path) => `expo-file-system::${path}`;

export const EncodingType = { UTF8: 'utf8', Base64: 'base64' };

export async function readAsStringAsync(uri, options = {}) {
  // El shim de view-shot devuelve directamente data URLs. Soportar leerlas
  // como base64 o utf8 sin tocar localStorage para que el código vendor
  // (que llama capture() seguido de readAsStringAsync) funcione tal cual.
  if (typeof uri === 'string' && uri.startsWith('data:')) {
    const commaIdx = uri.indexOf(',');
    const meta = uri.slice(5, commaIdx); // p.ej. "image/png;base64"
    const payload = uri.slice(commaIdx + 1);
    const isBase64 = /;base64$/i.test(meta);
    const wantBase64 = options.encoding === EncodingType.Base64 || options.encoding === 'base64';
    if (wantBase64) {
      if (isBase64) return payload;
      // Convertir UTF-8 → base64
      try { return btoa(unescape(encodeURIComponent(payload))); } catch { return payload; }
    }
    if (isBase64) {
      try { return decodeURIComponent(escape(atob(payload))); } catch { return payload; }
    }
    return decodeURIComponent(payload);
  }
  // Soportar blob:/http(s): URIs leyendo el contenido remoto.
  if (typeof uri === 'string' && /^(blob:|https?:)/i.test(uri)) {
    const r = await fetch(uri);
    const wantBase64 = options.encoding === EncodingType.Base64 || options.encoding === 'base64';
    if (wantBase64) {
      const blob = await r.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          const idx = result.indexOf(',');
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    return await r.text();
  }
  const v = localStorage.getItem(KEY(uri));
  if (v == null) throw new Error(`File not found: ${uri}`);
  return v;
}
export async function writeAsStringAsync(uri, contents) {
  localStorage.setItem(KEY(uri), contents);
}
export async function deleteAsync(uri) {
  localStorage.removeItem(KEY(uri));
}
export async function getInfoAsync(uri) {
  const v = localStorage.getItem(KEY(uri));
  return { exists: v != null, isDirectory: false, uri, size: v?.length || 0 };
}
export async function makeDirectoryAsync() { return; }
export async function readDirectoryAsync() { return []; }
export async function copyAsync({ from, to } = {}) {
  // Soporta data:/blob:/http(s):/ y URIs ya guardadas en el "FS" (localStorage).
  if (!from || !to) return;
  let payload;
  if (typeof from === 'string' && (from.startsWith('data:') || /^(blob:|https?:)/i.test(from))) {
    // Re-leer como data URL para preservar binario.
    const r = await fetch(from);
    const blob = await r.blob();
    payload = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    payload = localStorage.getItem(KEY(from));
    if (payload == null) throw new Error(`File not found: ${from}`);
  }
  localStorage.setItem(KEY(to), payload);
  return { uri: to };
}

export async function moveAsync({ from, to } = {}) {
  await copyAsync({ from, to });
  try { localStorage.removeItem(KEY(from)); } catch {}
  return { uri: to };
}

export async function downloadAsync(remoteUri, localUri) {
  const r = await fetch(remoteUri);
  const blob = await r.blob();
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onloadend = () => {
      localStorage.setItem(KEY(localUri), reader.result);
      resolve({ uri: localUri, status: r.status });
    };
    reader.readAsDataURL(blob);
  });
}

// Map global: blobUrl → filename. Permite que expo-media-library recupere
// el nombre de archivo original que el código vendor proporcionó en _localUri.
export const _blobFilenames = new Map();
export function getBlobFilename(blobUrl) {
  return _blobFilenames.get(blobUrl) || null;
}

/**
 * Shim de FileSystem.createDownloadResumable. En nativo descarga a un fichero
 * local con progreso. En web hacemos `fetch` → blob URL para que el código
 * vendor (myVideos.downloadVideo, etc.) pueda pasar `result.uri` a
 * MediaLibrary.createAssetAsync, que dispara la descarga real del browser.
 * Los videos WebM se convierten automáticamente a MP4 antes de entregar la URL.
 */
export function createDownloadResumable(remoteUri, _localUri, _options, onProgress) {
  let cancelled = false;
  return {
    async downloadAsync() {
      const r = await fetch(remoteUri);
      if (!r.ok) throw new Error(`Download failed: ${r.status}`);
      const total = Number(r.headers.get('content-length')) || 0;
      let received = 0;
      let blob;
      if (r.body && r.body.getReader && typeof onProgress === 'function') {
        const reader = r.body.getReader();
        const chunks = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (cancelled) throw new Error('Download cancelled');
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.byteLength;
          try {
            onProgress({
              totalBytesWritten: received,
              totalBytesExpectedToWrite: total || received,
            });
          } catch {}
        }
        blob = new Blob(chunks);
      } else {
        blob = await r.blob();
      }
      // Convertir WebM a MP4 si es necesario
      try {
        const { ensureMp4Blob } = await import('@/utils/videoUtils');
        blob = await ensureMp4Blob(blob);
      } catch (e) {
        console.warn('[expo-file-system shim] ensureMp4Blob import failed', e);
      }
      const url = (typeof URL !== 'undefined' && URL.createObjectURL)
        ? URL.createObjectURL(blob)
        : remoteUri;
      // Guardar el nombre de archivo para que MediaLibrary pueda usarlo
      if (url && url.startsWith('blob:') && _localUri) {
        const filename = String(_localUri).replace(/^.*\//, '');
        if (filename) _blobFilenames.set(url, filename);
      }
      return { uri: url, status: r.status, headers: {} };
    },
    async pauseAsync() { /* no-op web */ },
    async resumeAsync() { return this.downloadAsync(); },
    async cancelAsync() { cancelled = true; },
    savable() { return {}; },
  };
}

export default {
  documentDirectory, cacheDirectory, bundleDirectory,
  readAsStringAsync, writeAsStringAsync, deleteAsync, getInfoAsync,
  makeDirectoryAsync, readDirectoryAsync, downloadAsync, copyAsync, moveAsync,
  createDownloadResumable, EncodingType,
};
