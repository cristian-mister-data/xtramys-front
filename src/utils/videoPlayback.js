import { getVideoById, getVideoStreamUrl, getTacticalVideo } from '@/utils/api';
import { ensureMp4Blob } from '@/utils/videoUtils';
import { regenerateVideoInBrowser } from '@/utils/localVideoRegenerator';
import { API_URL, USE_COOKIE_AUTH } from '@/config';
import { loadToken } from '@/auth/storage';

const getId = (videoOrId) => {
  if (!videoOrId) return null;
  if (typeof videoOrId === 'string') return /^(https?:|blob:|file:|capacitor:|content:)/i.test(videoOrId) ? null : videoOrId;
  return videoOrId._id || videoOrId.id || videoOrId.videoId || null;
};

const getKnownUrl = (videoOrId) => {
  if (!videoOrId) return null;
  if (typeof videoOrId === 'string') return /^(https?:|blob:|file:|capacitor:|content:)/i.test(videoOrId) ? videoOrId : null;
  return (
    videoOrId.videoUrl ||
    videoOrId.streamUrl ||
    videoOrId.sourceUrl ||
    videoOrId.downloadUrl ||
    videoOrId.fileUrl ||
    videoOrId.mediaUrl ||
    videoOrId.publicUrl ||
    videoOrId.url ||
    videoOrId.video?.videoUrl ||
    videoOrId.video?.streamUrl ||
    null
  );
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
  if (!response.ok) throw new Error(`No se pudo cargar el video (${response.status})`);
  const contentType = response.headers.get('content-type') || '';
  if (!acceptsVideoResponse(contentType, url)) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'La respuesta no es un video valido');
  }
  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error('El video descargado esta vacio');
  return blob;
};

const maybeObjectUrl = async (url, { objectUrl = true } = {}) => {
  const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
  if (isCapacitor) {
    if (isBackendApiUrl(url)) {
      const token = loadToken?.();
      if (token) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${token}`;
      }
    }
    return url;
  }
  if (!objectUrl || !isBackendApiUrl(url) || typeof URL === 'undefined') return url;
  const blob = await fetchVideoBlob(url);
  return URL.createObjectURL(blob);
};

export const isVideoObjectUrl = (url) => typeof url === 'string' && url.startsWith('blob:');

export const revokeVideoObjectUrl = (url) => {
  if (!isVideoObjectUrl(url) || typeof URL === 'undefined') return;
  try {
    URL.revokeObjectURL(url);
  } catch (_) {}
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

const acceptsVideoResponse = (contentType, url) => {
  const type = String(contentType || '').toLowerCase();
  if (!type) return true;
  if (type.startsWith('video/')) return true;
  if (type.includes('application/octet-stream')) return true;
  return /\.(mp4|m4v|mov|webm)(?:\?|#|$)/i.test(String(url || ''));
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result || '').split(',')[1]);
    reader.readAsDataURL(blob);
  });

const isNativeLocalVideoUrl = (url) => /^file:|^capacitor:|^content:/i.test(String(url || ''));
const isNativeCapacitor = () =>
  typeof window !== 'undefined' &&
  !!window.Capacitor &&
  window.Capacitor.getPlatform?.() !== 'web';

const normalizeBase64 = (data) =>
  String(data || '').includes(',')
    ? String(data || '')
        .split(',')
        .pop()
    : String(data || '');

const readNativeLocalVideo = async (sourceUrl) => {
  const { Filesystem } = await import('@capacitor/filesystem');
  const candidates = [sourceUrl];
  if (String(sourceUrl).startsWith('file://')) {
    candidates.push(String(sourceUrl).replace(/^file:\/\//, ''));
  }

  for (const path of candidates) {
    try {
      const file = await Filesystem.readFile({ path });
      return normalizeBase64(file.data);
    } catch (_) {}
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`No se pudo leer el video local (${response.status})`);
  return blobToBase64(await response.blob());
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
  if (metadata?.video?.hasStoredVideo)
    return resolveWithRetry(getVideoStreamUrl(videoId), urlOptions);

  try {
    return await regenerateVideoInBrowser(videoId);
  } catch (error) {
    console.warn('[videoPlayback] No se pudo regenerar el video en navegador:', error);
    return maybeObjectUrl(getVideoStreamUrl(videoId), urlOptions);
  }
}

async function resolveWithRetry(url, options, attempts = 3, delayMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await maybeObjectUrl(url, options);
    } catch (err) {
      const is404 = err?.message?.includes('404') || err?.message?.includes('No se pudo cargar');
      if (i < attempts - 1 && is404) {
        await new Promise((res) => setTimeout(res, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  return '';
}

export async function triggerVideoDownload(url, filenameBase = 'video') {
  if (!url) throw new Error('No hay URL de video para descargar');

  const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
  if (isCapacitor) {
    try {
      const isAndroid = window.Capacitor.getPlatform() === 'android';
      let finalUrl = url;

      if (isBackendApiUrl(url)) {
        const token = loadToken?.();
        if (token && !url.includes('token=')) {
          const separator = url.includes('?') ? '&' : '?';
          finalUrl = `${url}${separator}token=${token}`;
        }
      }

      if (isAndroid && /^https?:\/\//i.test(finalUrl) && (!isBackendApiUrl(finalUrl) || !USE_COOKIE_AUTH)) {
        const { registerPlugin } = await import('@capacitor/core');
        const VideoSaver = registerPlugin('VideoSaver');
        const extension = extensionFrom('', finalUrl);
        await VideoSaver.saveToGallery({
          url: finalUrl,
          fileName: `${sanitizeVideoFilename(filenameBase)}.${extension}`,
          mimeType: extension === 'webm' ? 'video/webm' : 'video/mp4',
        });
        return;
      }

      let contentType = '';
      let mediaBlob = null;
      let base64Data = '';
      const isLocalVideo = isNativeLocalVideoUrl(finalUrl);

      if (isLocalVideo) {
        base64Data = await readNativeLocalVideo(finalUrl);
        contentType = 'video/mp4';
      } else {
        const response = await fetch(finalUrl, {
          credentials: USE_COOKIE_AUTH ? 'include' : 'same-origin',
          headers: isBackendApiUrl(finalUrl) ? getAuthHeaders() : {},
        });
        if (!response.ok) throw new Error(`No se pudo descargar el video (${response.status})`);
        contentType = response.headers.get('content-type') || '';
        if (!acceptsVideoResponse(contentType, finalUrl)) {
          const text = await response.text().catch(() => '');
          throw new Error(text || 'La respuesta descargada no es un video valido');
        }
        mediaBlob = await response.blob();
        if (!mediaBlob || mediaBlob.size === 0) throw new Error('El video descargado esta vacio');
        mediaBlob = await ensureMp4Blob(mediaBlob);
        base64Data = await blobToBase64(mediaBlob);
      }

      if (!base64Data) throw new Error('El video descargado esta vacio');
      const extension = extensionFrom(mediaBlob?.type || contentType, finalUrl);
      const finalFileName = `${sanitizeVideoFilename(filenameBase)}.${extension}`;
      const mimeType = mediaBlob?.type || (extension === 'webm' ? 'video/webm' : 'video/mp4');

      if (isAndroid) {
        const { registerPlugin } = await import('@capacitor/core');
        const VideoSaver = registerPlugin('VideoSaver');
        const canStreamDirectly = /^https?:\/\//i.test(finalUrl) && (!isBackendApiUrl(finalUrl) || !USE_COOKIE_AUTH);
        await VideoSaver.saveToGallery({
          ...(canStreamDirectly ? { url: finalUrl } : { data: base64Data }),
          fileName: finalFileName,
          mimeType,
        });
      } else {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Media } = await import('@capacitor-community/media');

        const saveToIOSPhotos = async (videoPath) => {
          await Media.requestPermissions();
          try {
            await Media.saveVideo({ path: videoPath });
          } catch {
            if (!String(videoPath).startsWith('file://')) {
              await Media.saveVideo({ path: `file://${videoPath}` });
            } else {
              throw new Error('Media.saveVideo failed for all path formats');
            }
          }
        };

        if (base64Data) {
          const writeResult = await Filesystem.writeFile({
            path: finalFileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          await saveToIOSPhotos(writeResult.uri);
        } else {
          const cacheResult = await Filesystem.downloadFile({
            url: finalUrl,
            path: finalFileName,
            directory: Directory.Cache,
          });
          await saveToIOSPhotos(cacheResult.path);
        }
      }
    } catch (capErr) {
      console.error('Capacitor video download error:', capErr);
      throw capErr;
    }
    return;
  }

  // Web download logic
  let href = url;
  let objectUrl = null;
  let extension = extensionFrom('', url);
  let mediaBlob = null;
  const targetUrl = new URL(url, window.location.origin);
  const isSameOrigin = targetUrl.origin === window.location.origin;

  try {
    const response = await fetch(targetUrl.href, {
      credentials: USE_COOKIE_AUTH ? 'include' : 'same-origin',
      headers: isBackendApiUrl(targetUrl.href) ? getAuthHeaders() : {},
    });
    if (!response.ok) throw new Error(`No se pudo descargar el video (${response.status})`);
    const contentType = response.headers.get('content-type') || '';
    if (!acceptsVideoResponse(contentType, targetUrl.href)) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'La respuesta descargada no es un video valido');
    }
    mediaBlob = await response.blob();
    if (!mediaBlob || mediaBlob.size === 0) throw new Error('El video descargado esta vacio');
    mediaBlob = await ensureMp4Blob(mediaBlob);
    extension = extensionFrom(mediaBlob.type || contentType, url);
    objectUrl = URL.createObjectURL(mediaBlob);
    href = objectUrl;
  } catch (error) {
    if (isSameOrigin) throw error;
  }

  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${sanitizeVideoFilename(filenameBase)}.${extension}`;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function downloadResolvedVideo(videoOrId, filenameBase = 'video') {
  const videoId = getId(videoOrId);
  let url = getKnownUrl(videoOrId) || '';

  if (videoId?.startsWith?.('job_') || videoId?.startsWith?.('preview_')) {
    url = getVideoStreamUrl(videoId);
    try {
      const blob = await fetchVideoBlob(url);
      await triggerVideoDownload(isNativeCapacitor() ? url : URL.createObjectURL(blob), filenameBase);
      return url;
    } catch {
      if (videoId.startsWith('preview_')) {
        await new Promise((res) => setTimeout(res, 2000));
        try {
          const blob2 = await fetchVideoBlob(url);
          await triggerVideoDownload(isNativeCapacitor() ? url : URL.createObjectURL(blob2), filenameBase);
          return url;
        } catch {
          await new Promise((res) => setTimeout(res, 3000));
          const blob3 = await fetchVideoBlob(url);
          await triggerVideoDownload(isNativeCapacitor() ? url : URL.createObjectURL(blob3), filenameBase);
          return url;
        }
      }
      throw new Error('No se pudo descargar el video');
    }
  }

  if (!url && videoId) {
    const metadata = await getVideoById(videoId).catch(() => null);
    url = metadata?.video?.videoUrl || metadata?.video?.streamUrl || '';
  }

  if (!url) url = await resolvePlayableVideoUrl(videoOrId);

  await triggerVideoDownload(url, filenameBase);
  return url;
}
