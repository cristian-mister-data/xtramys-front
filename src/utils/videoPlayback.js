import { getVideoById, getVideoDownloadUrl, getVideoStreamUrl, getTacticalVideo } from '@/utils/api';
import { ensureMp4Blob } from '@/utils/videoUtils';
import { regenerateVideoInBrowser } from '@/utils/localVideoRegenerator';
import { API_URL, USE_COOKIE_AUTH } from '@/config';
import { loadToken } from '@/auth/storage';

const getId = (videoOrId) => {
  if (!videoOrId) return null;
  if (typeof videoOrId === 'string') return videoOrId;
  return videoOrId._id || videoOrId.id || videoOrId.videoId || null;
};

const getKnownUrl = (videoOrId) => {
  if (!videoOrId || typeof videoOrId === 'string') return null;
  return videoOrId.videoUrl || videoOrId.streamUrl || videoOrId.sourceUrl || videoOrId.url || null;
};

const getAuthHeaders = () => {
  if (USE_COOKIE_AUTH) return {};
  const token = loadToken?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const isBackendApiUrl = (url) => {
  if (!url || typeof window === 'undefined') return false;
  try {
    const target = new URL(url, window.location.origin);
    const api = new URL(API_URL, window.location.origin);
    return target.origin === api.origin && target.pathname.startsWith(api.pathname);
  } catch (_) {
    return false;
  }
};

const fetchVideoBlob = async (url) => {
  const response = await fetch(url, {
    credentials: USE_COOKIE_AUTH ? 'include' : 'same-origin',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`No se pudo cargar el vídeo (${response.status})`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !contentType.toLowerCase().startsWith('video/')) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'La respuesta no es un vídeo válido');
  }
  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error('El vídeo descargado está vacío');
  return blob;
};

const maybeObjectUrl = async (url, { objectUrl = true } = {}) => {
  if (!objectUrl || !isBackendApiUrl(url) || typeof URL === 'undefined') return url;
  const blob = await fetchVideoBlob(url);
  return URL.createObjectURL(blob);
};

export const isVideoObjectUrl = (url) => typeof url === 'string' && url.startsWith('blob:');

export const revokeVideoObjectUrl = (url) => {
  if (!isVideoObjectUrl(url) || typeof URL === 'undefined') return;
  try { URL.revokeObjectURL(url); } catch (_) {}
};

export const sanitizeVideoFilename = (name = 'video') => {
  const safe = String(name || 'video')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ');
  return safe || 'video';
};

const extensionFrom = (contentType, url) => {
  const mime = String(contentType || '').toLowerCase();
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'mp4';
  const match = String(url || '').match(/\.([a-z0-9]{2,5})(?:\?|#|$)/i);
  return match ? match[1].toLowerCase() : 'mp4';
};

export async function resolvePlayableVideoUrl(videoOrId, options = {}) {
  const { playerOverlays, ...urlOptions } = options || {};
  const knownUrl = getKnownUrl(videoOrId);
  const videoId = getId(videoOrId);
  if (videoId?.startsWith?.('job_') || videoId?.startsWith?.('preview_')) {
    return resolveWithRetry(getVideoStreamUrl(videoId), urlOptions);
  }
  if (knownUrl && !playerOverlays) return maybeObjectUrl(knownUrl, urlOptions);
  if (!videoId) return '';

  const metadata = await getVideoById(videoId).catch(() => null);
  let directUrl = metadata?.video?.videoUrl || metadata?.video?.streamUrl;
  if (!directUrl && !metadata) {
    const tacMetadata = await getTacticalVideo(videoId).catch(() => null);
    directUrl = tacMetadata?.video?.videoUrl || tacMetadata?.data?.video?.videoUrl;
  }
  if (metadata?.video?.type === 'tactical' && directUrl && !playerOverlays?.length) {
    return maybeObjectUrl(directUrl, urlOptions);
  }

  if (playerOverlays?.length && directUrl) return maybeObjectUrl(directUrl, urlOptions);

  if (directUrl) return maybeObjectUrl(directUrl, urlOptions);
  if (metadata?.video?.hasStoredVideo) return resolveWithRetry(getVideoStreamUrl(videoId), urlOptions);

  try {
    const localUrl = await regenerateVideoInBrowser(videoId);
    return urlOptions.objectUrl === false ? localUrl : localUrl;
  } catch (error) {
    console.warn('[videoPlayback] No se pudo regenerar el video en navegador:', error);
    return maybeObjectUrl(getVideoStreamUrl(videoId), urlOptions);
  }
}

async function resolveWithRetry(url, options, attempts = 3, delayMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await maybeObjectUrl(url, options);
      return result;
    } catch (err) {
      const is404 = err?.message?.includes('404') || err?.message?.includes('No se pudo cargar');
      if (i < attempts - 1 && is404) {
        await new Promise(res => setTimeout(res, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function triggerVideoDownload(url, filenameBase = 'video') {
  if (!url) throw new Error('No hay URL de vídeo para descargar');

  let href = url;
  let objectUrl = null;
  let extension = extensionFrom('', url);
  const targetUrl = new URL(url, window.location.origin);
  const isSameOrigin = targetUrl.origin === window.location.origin;

  try {
    const response = await fetch(targetUrl.href, {
      credentials: USE_COOKIE_AUTH ? 'include' : 'same-origin',
      headers: isBackendApiUrl(targetUrl.href) ? getAuthHeaders() : {},
    });
    if (!response.ok) {
      throw new Error(`No se pudo descargar el vídeo (${response.status})`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('video/')) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'La respuesta descargada no es un vídeo válido');
    }
    let blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('El vídeo descargado está vacío');
    }
    // Convertir WebM→MP4 si es necesario
    try {
      blob = await ensureMp4Blob(blob);
    } catch (e) {
      console.warn('[videoPlayback] ensureMp4Blob failed, using original blob', e);
    }
    extension = extensionFrom(blob.type || contentType, url);
    objectUrl = URL.createObjectURL(blob);
    href = objectUrl;
  } catch (error) {
    if (isSameOrigin) throw error;
    // Cross-origin R2 without CORS for fetch can still be downloaded/opened by anchor.
  }

  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${sanitizeVideoFilename(filenameBase)}.${extension}`;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (objectUrl) {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

export async function downloadResolvedVideo(videoOrId, filenameBase = 'video') {
  const videoId = getId(videoOrId);
  let url = '';

  if (videoId?.startsWith?.('job_') || videoId?.startsWith?.('preview_')) {
    url = getVideoStreamUrl(videoId);
    try {
      const blob = await fetchVideoBlob(url);
      await triggerVideoDownload(URL.createObjectURL(blob), filenameBase);
      return url;
    } catch {
      if (videoId.startsWith('preview_')) {
        await new Promise(res => setTimeout(res, 2000));
        try {
          const blob2 = await fetchVideoBlob(url);
          await triggerVideoDownload(URL.createObjectURL(blob2), filenameBase);
          return url;
        } catch {
          await new Promise(res => setTimeout(res, 3000));
          const blob3 = await fetchVideoBlob(url);
          await triggerVideoDownload(URL.createObjectURL(blob3), filenameBase);
          return url;
        }
      }
      throw new Error('No se pudo descargar el vídeo');
    }
  }

  if (!url && videoId) {
    const knownUrl = getKnownUrl(videoOrId);
    const metadata = knownUrl ? { video: { videoUrl: knownUrl } } : await getVideoById(videoId).catch(() => null);
    if (metadata?.video?.videoUrl) {
      url = getVideoDownloadUrl(videoId);
    }
  }

  if (!url) {
    url = await resolvePlayableVideoUrl(videoOrId);
  }

  await triggerVideoDownload(url, filenameBase);
  return url;
}
