import api from '@/api/client';

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

export async function downloadImageSource(src, filenameBase = 'image') {
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
  triggerAnchorDownload(dataUri, `${baseName}.${extensionFromDataUri(dataUri)}`);
}
