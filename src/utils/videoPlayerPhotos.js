import { api } from '@/api/client';
import { cdnUrl } from '@/config';

const loadImageElement = (url, crossOrigin = false) => new Promise((resolve, reject) => {
  const image = new Image();
  if (crossOrigin) image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = url;
});

async function loadPlayerPhoto(source, objectUrls) {
  const directUrl = cdnUrl(source);
  const isRemote = /^https?:\/\//i.test(String(directUrl || ''));
  try {
    return await loadImageElement(directUrl, isRemote);
  } catch (directError) {
    if (!/^https?:\/\//i.test(String(source || '')) || typeof URL === 'undefined') {
      throw directError;
    }
    const response = await api.get('/media/image-download', {
      params: { url: source },
      responseType: 'blob',
      timeout: 15000,
    });
    const objectUrl = URL.createObjectURL(response.data);
    objectUrls.push(objectUrl);
    return loadImageElement(objectUrl);
  }
}

export async function loadVideoPlayerPhotos(keyframes = []) {
  const sources = new Set();
  keyframes.forEach((frame) => (frame.elements || []).forEach((element) => {
    const source = element.photoUrl || element.playerData?.foto;
    if (element.type === 'player' && source) sources.add(source);
  }));

  const playerPhotos = {};
  const objectUrls = [];
  await Promise.all([...sources].map(async (source) => {
    try {
      const image = await loadPlayerPhoto(source, objectUrls);
      playerPhotos[source] = image;
      playerPhotos[cdnUrl(source)] = image;
    } catch (error) {
      console.warn(`[video] No se pudo cargar la foto del jugador ${source}:`, error);
    }
  }));

  return {
    playerPhotos,
    release() {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    },
  };
}
