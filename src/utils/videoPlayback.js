import { getVideoById, getVideoDownloadUrl, getVideoStreamUrl, regenerateVideoWithField } from '@/utils/api';
import { ensureMp4Blob } from '@/utils/videoUtils';

const getId = (videoOrId) => {
  if (!videoOrId) return null;
  if (typeof videoOrId === 'string') return videoOrId;
  return videoOrId._id || videoOrId.id || videoOrId.videoId || null;
};

const getKnownUrl = (videoOrId) => {
  if (!videoOrId || typeof videoOrId === 'string') return null;
  return videoOrId.videoUrl || videoOrId.url || null;
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

export async function resolvePlayableVideoUrl(videoOrId) {
  const knownUrl = getKnownUrl(videoOrId);
  const videoId = getId(videoOrId);
  if (videoId?.startsWith?.('job_') || videoId?.startsWith?.('preview_')) {
    return getVideoStreamUrl(videoId);
  }
  if (knownUrl) return knownUrl;
  if (!videoId) return '';

  const metadata = await getVideoById(videoId).catch(() => null);
  const directUrl = metadata?.video?.videoUrl;
  if (directUrl) return directUrl;
  if (metadata?.video?.hasStoredVideo) return getVideoStreamUrl(videoId);

  const result = await regenerateVideoWithField(videoId, null);
  if (result?.success && result?.videoId) {
    return getVideoStreamUrl(result.videoId);
  }

  return getVideoStreamUrl(videoId);
}

export async function triggerVideoDownload(url, filenameBase = 'video') {
  if (!url) throw new Error('No hay URL de vídeo para descargar');

  let href = url;
  let objectUrl = null;
  let extension = extensionFrom('', url);
  const targetUrl = new URL(url, window.location.origin);
  const isSameOrigin = targetUrl.origin === window.location.origin;

  try {
    const response = await fetch(targetUrl.href, { credentials: 'include' });
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