/** Shim de expo-sharing para web.
 *  Estrategia: si Web Share API soporta archivos los compartimos; si no,
 *  forzamos descarga del navegador (mejor UX que abrir el data: en pestaña).
 *  Soporta URIs `webfs://...` (nuestro expo-file-system shim sobre localStorage). */

const WEBFS_PREFIX = 'webfs://';
const KEY = (path) => `expo-file-system::${path}`;

function inferMime(uri, fallback) {
  if (fallback) return fallback;
  if (/\.pdf($|\?)/i.test(uri)) return 'application/pdf';
  if (/\.png($|\?)/i.test(uri)) return 'image/png';
  if (/\.jpe?g($|\?)/i.test(uri)) return 'image/jpeg';
  return 'application/octet-stream';
}

function inferFileName(uri, dialogTitle) {
  if (dialogTitle && /\.[a-z0-9]{2,5}$/i.test(dialogTitle)) return dialogTitle;
  try {
    const tail = uri.split(/[\\/]/).pop() || '';
    if (tail && /\.[a-z0-9]{2,5}$/i.test(tail)) return tail;
  } catch {}
  return dialogTitle || 'file';
}

async function uriToBlob(uri, mimeHint) {
  // webfs://: leer de localStorage. Puede ser data URL o texto plano.
  if (typeof uri === 'string' && uri.startsWith(WEBFS_PREFIX)) {
    const payload = localStorage.getItem(KEY(uri));
    if (payload == null) throw new Error(`File not found: ${uri}`);
    if (payload.startsWith('data:')) {
      const r = await fetch(payload);
      return await r.blob();
    }
    return new Blob([payload], { type: mimeHint || 'application/octet-stream' });
  }
  // data:/blob:/http(s): fetch directo.
  const r = await fetch(uri);
  return await r.blob();
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch {}
    try { URL.revokeObjectURL(url); } catch {}
  }, 1500);
}

export async function isAvailableAsync() {
  // Devolvemos true porque siempre podemos hacer fallback a descarga.
  return true;
}

export async function shareAsync(uri, options = {}) {
  const mime = inferMime(uri, options.mimeType);
  const fileName = inferFileName(uri, options.dialogTitle);
  let blob;
  try {
    blob = await uriToBlob(uri, mime);
  } catch (e) {
    console.warn('[expo-sharing] no se pudo leer el recurso', uri, e);
    return;
  }
  // Intentar Web Share API con archivo si está disponible.
  try {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      const file = new File([blob], fileName, { type: blob.type || mime });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: options.dialogTitle || fileName });
        return;
      }
    }
  } catch (e) {
    if (e?.name === 'AbortError') return; // usuario canceló
    // continuar al fallback
  }
  // Fallback universal: descarga directa del navegador.
  triggerDownload(blob, fileName);
}

export default { isAvailableAsync, shareAsync };
