// A global memory cache for base64 images
const imageCache = new Map();
const pendingPromises = new Map();
const urlVersions = new Map();

/**
 * Normalizes and fetches a remote image URL, caching its base64 representation.
 * Returns a promise resolving to the base64 string or the original URL on error.
 */
export async function prefetchAndCacheImage(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Already base64 or local path
    return url;
  }

  // Use the versioned URL as the cache key to respect cache busting
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  // If there's a pending promise, return it
  if (pendingPromises.has(url)) {
    return pendingPromises.get(url);
  }

  const promise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Blob read failed"));
        reader.readAsDataURL(blob);
      });
      imageCache.set(url, base64);
      pendingPromises.delete(url);
      return base64;
    } catch (error) {
      console.warn("[prefetchAndCacheImage] Error prefetching image:", url, error);
      pendingPromises.delete(url);
      // Return original url as fallback so the browser can try loading it directly
      return url;
    }
  })();

  pendingPromises.set(url, promise);
  return promise;
}

/**
 * Returns the URL with a unique version query parameter if it has been updated,
 * to force both browser HTTP cache and local image cache invalidation.
 */
export function getVersionedUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;

  // Strip existing version query parameters to have a clean base URL
  const cleanUrl = url.split('?')[0];

  const version = urlVersions.get(cleanUrl);
  if (version) {
    return `${cleanUrl}?v=${version}`;
  }
  return cleanUrl;
}

/**
 * Bumps the local version counter for a given URL and clears it from the cache.
 */
export function bumpUrlVersion(url) {
  if (!url || typeof url !== 'string') return;
  // Use the clean base URL for indexing
  const cleanUrl = url.split('?')[0];
  const newVersion = Date.now();
  urlVersions.set(cleanUrl, newVersion);
  
  // Clean both key variations from the memory cache
  imageCache.delete(cleanUrl);
  imageCache.delete(url);
}
