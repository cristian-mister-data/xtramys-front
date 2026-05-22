// Configuración de URLs y modo de auth.
// Vite expone variables que empiezan por VITE_ en import.meta.env

const isDev = import.meta.env.DEV;

// En desarrollo usamos el proxy de Vite (/api) para evitar CORS.
// En producción se usa la URL directa del backend.
export const BACKEND_URL = isDev ? '' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
export const API_URL = isDev ? '/api' : `${BACKEND_URL}/api`;

const CDN_ORIGIN = 'https://cdn.xtramys.com';

// En desarrollo usamos el proxy de Vite (/cdn) para evitar CORS.
// En producción se usa la URL directa del CDN.
export const R2_PUBLIC_URL = isDev
  ? '/cdn'
  : (import.meta.env.VITE_R2_PUBLIC_URL || CDN_ORIGIN);

/**
 * Reescribe una URL del CDN para pasar por el proxy en desarrollo.
 * En producción devuelve la URL sin cambios.
 * Útil para <img>, canvas, fetch, etc.
 */
export function cdnUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (isDev && url.startsWith(CDN_ORIGIN)) {
    return url.replace(CDN_ORIGIN, '/cdn');
  }
  return url;
}

// 'cookie' = JWT en cookie httpOnly + credentials: 'include'
// 'bearer' = JWT en Authorization: Bearer (legacy)
export const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE || 'cookie').toLowerCase();
export const USE_COOKIE_AUTH = AUTH_MODE === 'cookie';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || '';
