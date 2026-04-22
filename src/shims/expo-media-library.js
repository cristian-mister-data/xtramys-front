/**
 * Shim de expo-media-library para web.
 *
 * En nativo, `createAssetAsync(uri)` guarda el archivo en la galería del
 * dispositivo. En web no hay galería, así que disparamos una descarga real
 * del browser (anchor `download`) usando el blob URL que produce nuestro
 * MediaRecorder en `videoUtils.js`. Soportamos también `data:` URLs.
 */
export const PermissionStatus = { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' };
export async function requestPermissionsAsync() { return { status: PermissionStatus.GRANTED, granted: true }; }
export async function getPermissionsAsync() { return { status: PermissionStatus.GRANTED, granted: true }; }

function inferExtensionFromUri(uri) {
  if (!uri) return 'webm';
  if (uri.startsWith('data:')) {
    const match = /^data:([^;,]+)/.exec(uri);
    const mime = match ? match[1] : '';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    return 'bin';
  }
  // blob: o http(s) — buscamos extensión "real"
  const m = /\.([a-z0-9]{2,5})(?:\?|#|$)/i.exec(uri);
  if (m) return m[1].toLowerCase();
  return 'webm';
}

async function triggerBrowserDownload(uri, filename) {
  if (typeof document === 'undefined') return;
  // Para data: y blob: el browser puede descargar directamente con <a download>.
  // Para http(s) cross-origin, en general también funciona si el server lo permite.
  let href = uri;
  // Si nos pasaron un Blob como uri no estandarizado, convertir
  if (typeof uri !== 'string' && uri && typeof URL !== 'undefined' && uri instanceof Blob) {
    href = URL.createObjectURL(uri);
  }
  const a = document.createElement('a');
  a.href = href;
  a.download = filename || 'xtramys-video.' + inferExtensionFromUri(typeof uri === 'string' ? uri : '');
  a.style.display = 'none';
  document.body.appendChild(a);
  // Pequeño delay para que el browser registre el anchor antes del click programático.
  await new Promise((r) => setTimeout(r, 0));
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    // No revocamos blob URL aquí: el código vendor puede seguir usándola
    // (preview, segundo guardado, etc.). RNFS.unlink la revoca.
  }, 100);
}

export async function saveToLibraryAsync(uri) {
  await triggerBrowserDownload(uri);
}

export async function createAssetAsync(uri) {
  await triggerBrowserDownload(uri);
  return { id: 'web', uri, mediaType: uri && /\.(mp4|webm|mov)$/i.test(uri) ? 'video' : 'unknown' };
}

export async function getAlbumAsync() { return null; }
export async function createAlbumAsync(name, asset) { return { id: name, title: name, assetCount: asset ? 1 : 0 }; }
export async function addAssetsToAlbumAsync() { return true; }
export const MediaType = { photo: 'photo', video: 'video', audio: 'audio', unknown: 'unknown' };

export default {
  PermissionStatus, requestPermissionsAsync, getPermissionsAsync,
  saveToLibraryAsync, createAssetAsync, getAlbumAsync, createAlbumAsync,
  addAssetsToAlbumAsync, MediaType,
};
