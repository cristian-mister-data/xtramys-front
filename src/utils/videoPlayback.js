import { getVideoById, getVideoDownloadUrl, getVideoStreamUrl, getTacticalVideo } from '@/utils/api';
import { ensureMp4Blob } from '@/utils/videoUtils';
import { regenerateVideoInBrowser } from '@/utils/localVideoRegenerator';
import { API_URL, USE_COOKIE_AUTH } from '@/config';
import { loadToken } from '@/auth/storage';
import { toast } from '@/ui/toast';
import { showFileActions } from '@/ui/fileActionDialog';

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
  if (!response.ok) throw new Error(`No se pudo cargar el video (${response.status})`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !contentType.toLowerCase().startsWith('video/')) {
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

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => resolve(String(reader.result || '').split(',')[1]);
  reader.readAsDataURL(blob);
});

async function shareNativeBlob(blob, fileName) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const writeResult = await Filesystem.writeFile({
    path: fileName,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });
  await Share.share({ title: fileName, url: writeResult.uri, dialogTitle: fileName });
}

async function saveNativeVideoBlob(blob, fileName, mimeType) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const base64Data = await blobToBase64(blob);

  if (window.Capacitor.getPlatform() === 'android') {
    const { registerPlugin } = await import('@capacitor/core');
    const VideoSaver = registerPlugin('VideoSaver');
    await VideoSaver.saveToGallery({ data: base64Data, fileName, mimeType });
    toast.success('Video guardado en Galeria.');
    return;
  }

  await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Documents });
  toast.success('Video guardado en Documentos.');
}

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
        await new Promise(res => setTimeout(res, delayMs * (i + 1)));
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

      const extension = extensionFrom('', finalUrl);
      const finalFileName = `${sanitizeVideoFilename(filenameBase)}.${extension}`;
      const mimeType = extension === 'webm' ? 'video/webm' : 'video/mp4';
      
      const isBlob = finalUrl.startsWith('blob:');
      let base64Data = null;

      if (isBlob) {
        const response = await fetch(finalUrl);
        const blob = await response.blob();
        base64Data = await blobToBase64(blob);
      }

      if (isAndroid) {
        try {
          const { registerPlugin } = await import('@capacitor/core');
          const VideoSaver = registerPlugin('VideoSaver');
          
          if (isBlob) {
            await VideoSaver.saveToGallery({
              data: base64Data,
              fileName: sanitizeVideoFilename(filenameBase),
              mimeType
            });
          } else {
            await VideoSaver.saveToGallery({
              url: finalUrl,
              fileName: sanitizeVideoFilename(filenameBase),
              mimeType
            });
          }
          toast.success('Vídeo guardado en la galería.');
        } catch (saveErr) {
          console.error('VideoSaver plugin failed:', saveErr);
          toast.error('Error al guardar el vídeo en la galería: ' + saveErr.message);
        }
      } else {
        // iOS
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Media } = await import('@capacitor-community/media');

        if (isBlob) {
          const writeResult = await Filesystem.writeFile({
            path: finalFileName,
            data: base64Data,
            directory: Directory.Cache
          });
          try {
            await Media.requestPermissions();
            await Media.saveVideo({ path: writeResult.uri });
            toast.success('Vídeo guardado en la galería.');
          } catch (iosMediaErr) {
            console.warn('iOS Media.saveVideo failed, saving to Documents:', iosMediaErr);
            await Filesystem.writeFile({
              path: finalFileName,
              data: base64Data,
              directory: Directory.Documents
            });
            toast.success('Vídeo guardado en Documentos.');
          }
        } else {
          try {
            const cacheResult = await Filesystem.downloadFile({
              url: finalUrl,
              path: finalFileName,
              directory: Directory.Cache
            });
            await Media.requestPermissions();
            await Media.saveVideo({ path: cacheResult.path });
            toast.success('Vídeo guardado en la galería.');
          } catch (iosMediaErr) {
            console.warn('iOS Media.saveVideo failed, saving to Documents:', iosMediaErr);
            try {
              await Filesystem.downloadFile({
                url: finalUrl,
                path: finalFileName,
                directory: Directory.Documents
              });
              toast.success('Vídeo guardado en Documentos.');
            } catch (docErr) {
              toast.error('Error al guardar el vídeo: ' + docErr.message);
            }
          }
        }
      }
    } catch (capErr) {
      console.error('Capacitor video download error:', capErr);
      toast.error('Error al descargar video: ' + capErr.message);
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
    if (!contentType.toLowerCase().startsWith('video/')) {
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
      throw new Error('No se pudo descargar el video');
    }
  }

  if (!url && videoId) {
    const knownUrl = getKnownUrl(videoOrId);
    const metadata = knownUrl ? { video: { videoUrl: knownUrl } } : await getVideoById(videoId).catch(() => null);
    if (metadata?.video?.videoUrl) url = getVideoDownloadUrl(videoId);
  }

  if (!url) url = await resolvePlayableVideoUrl(videoOrId);

  await triggerVideoDownload(url, filenameBase);
  return url;
}
