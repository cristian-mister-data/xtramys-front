// Configuración de URLs y modo de auth.
// Vite expone variables que empiezan por VITE_ en import.meta.env

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
export const API_URL = `${BACKEND_URL}/api`;
export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://cdn.xtramys.com';

// 'cookie' = JWT en cookie httpOnly + credentials: 'include'
// 'bearer' = JWT en Authorization: Bearer (legacy)
export const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE || 'cookie').toLowerCase();
export const USE_COOKIE_AUTH = AUTH_MODE === 'cookie';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || '';
