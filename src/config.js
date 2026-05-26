// Configuración de URLs y modo de auth.
// Vite expone variables que empiezan por VITE_ en import.meta.env

const isDev = import.meta.env.DEV;
const rawBackendUrl = import.meta.env.VITE_BACKEND_URL;
const backendUrl = rawBackendUrl ? rawBackendUrl.replace(/\/+$/, '') : '';

const PROD_FALLBACK = 'https://api.xtramys.com';

// BACKEND_URL: usado para apiBase (wellness/prewellness) y generación de enlaces.
// En desarrollo sin VITE_BACKEND_URL → '' (mismo origen / Vite proxy).
// En producción sin VITE_BACKEND_URL → fallback duro a api.xtramys.com.
export const BACKEND_URL = backendUrl || (isDev ? '' : PROD_FALLBACK);

// API_URL: usado para el api principal (axios con baseURL).
// En desarrollo usa proxy de Vite (/api) → evita CORS.
// En producción usa BACKEND_URL + /api.
export const API_URL = isDev ? '/api' : `${BACKEND_URL}/api`;

if (!backendUrl && !isDev) {
  console.warn(
    '[config] VITE_BACKEND_URL no está definido. Usando fallback de producción:',
    PROD_FALLBACK
  );
}

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
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
export const PAYPAL_PLAN_ID = import.meta.env.VITE_PAYPAL_PLAN_ID || 'P-5AW56002RB445332ENIKY7PA';
