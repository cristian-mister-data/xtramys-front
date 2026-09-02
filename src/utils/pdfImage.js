import api from '@/api/client';

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export async function resolvePdfImage(source) {
  if (!source || typeof source !== 'string') return '';
  if (source.startsWith('data:')) return source;
  if (!/^https?:\/\//i.test(source)) return `data:image/png;base64,${source}`;
  try {
    const response = await api.get('/media/image-download', {
      params: { url: source, format: 'jpeg' },
      responseType: 'blob',
      timeout: 15000,
    });
    return await blobToDataUrl(response.data);
  } catch (proxyError) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await blobToDataUrl(await response.blob());
    } catch (directError) {
      console.warn('[resolvePdfImage] Image unavailable', { source, proxy: proxyError?.message, direct: directError?.message });
      return '';
    }
  }
}
