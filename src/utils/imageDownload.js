import api from '@/api/client';
import { toast } from '@/ui/toast';
import { showFileActions } from '@/ui/fileActionDialog';
import { isNative } from '@/platform/capacitor';

const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

function sanitizeFilenamePart(value = 'image') {
  const normalized = String(value || 'image')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_');
  return normalized || 'image';
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

function extensionFromDataUri(src) {
  const mime = /^data:([^;,]+)/i.exec(src)?.[1]?.toLowerCase();
  return IMAGE_EXTENSIONS[mime] || 'png';
}

function triggerAnchorDownload(href, filename, { newTab = false } = {}) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = 'noopener';
  if (newTab) anchor.target = '_blank';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

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

async function saveNativeImageBlob(blob, fileName, mimeType) {
  const data = await blobToBase64(blob);
  if (window.Capacitor.getPlatform() === 'android') {
    const { registerPlugin } = await import('@capacitor/core');
    const VideoSaver = registerPlugin('VideoSaver');
    await VideoSaver.saveImageToGallery({
      data,
      fileName,
      mimeType,
    });
    toast.success('Imagen guardada en Galeria.');
    return;
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Media } = await import('@capacitor-community/media');
  const writeResult = await Filesystem.writeFile({
    path: fileName,
    data,
    directory: Directory.Cache,
  });
  await Media.requestPermissions();
  try {
    await Media.savePhoto({ path: writeResult.uri });
  } catch {
    await Media.savePhoto({ path: String(writeResult.uri).startsWith('file://') ? writeResult.uri : `file://${writeResult.uri}` });
  }
  toast.success('Imagen guardada en Galeria.');
}

async function handleNativeImage(blob, fileName, mimeType, options = {}) {
  await showFileActions({
    fileName,
    kind: 'image',
    title: 'Imagen lista',
    onOpen: options.onDialogOpen,
    onDownload: () => saveNativeImageBlob(blob, fileName, mimeType),
    onShare: async () => {
      await saveNativeImageBlob(blob, fileName, mimeType);
      await shareNativeBlob(blob, fileName);
    },
  });
}

export async function downloadImageSource(src, filenameBase = 'image', options = {}) {
  if (!src) throw new Error('No image source to download');

  const baseName = sanitizeFilenamePart(filenameBase);
  if (/^https?:\/\//i.test(src)) {
    const fallbackExtension = extensionFromUrl(src) || 'png';
    const fallbackFilename = `${baseName}.${fallbackExtension}`;

    try {
      const response = await api.get('/media/image-download', {
        params: { url: src, filename: fallbackFilename },
        responseType: 'blob',
        timeout: 30000,
      });
      const contentType = response.headers?.['content-type'] || response.data?.type || '';
      const extension = IMAGE_EXTENSIONS[String(contentType).toLowerCase()] || fallbackExtension;
      if (isNative) {
        await handleNativeImage(response.data, `${baseName}.${extension}`, contentType || `image/${extension}`, options);
        return;
      }
      const objectUrl = URL.createObjectURL(response.data);
      triggerAnchorDownload(objectUrl, `${baseName}.${extension}`);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    } catch (error) {
      console.warn('[imageDownload] Backend image download failed, falling back to direct anchor:', error?.message || error);
      triggerAnchorDownload(src, fallbackFilename, { newTab: true });
      return;
    }
  }

  const dataUri = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
  if (isNative) {
    const blob = await fetch(dataUri).then((res) => res.blob());
    const extension = extensionFromDataUri(dataUri);
    await handleNativeImage(blob, `${baseName}.${extension}`, blob.type || `image/${extension}`, options);
    return;
  }
  triggerAnchorDownload(dataUri, `${baseName}.${extensionFromDataUri(dataUri)}`);
}
