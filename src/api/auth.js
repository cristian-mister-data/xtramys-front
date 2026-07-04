import api from './client';
import { BACKEND_URL } from '../config';
import { createReadCache } from '@/utils/readCache';

// El backend acepta tanto cookie httpOnly como Bearer.
// En modo cookie, el backend setea la cookie en login/verify/google/apple.

const ME_CACHE_TTL_MS = 5 * 60 * 1000;
const ME_STORAGE_KEY = 'auth_me_cache_v1';
const meReadCache = createReadCache({ ttlMs: ME_CACHE_TTL_MS });

const readStoredMe = () => {
  try {
    const cached = JSON.parse(window.localStorage.getItem(ME_STORAGE_KEY) || 'null');
    if (cached?.data && Date.now() - cached.at < ME_CACHE_TTL_MS) return cached.data;
  } catch {
    // ignore storage errors
  }
  return null;
};

const writeStoredMe = (data) => {
  try {
    window.localStorage.setItem(ME_STORAGE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // ignore storage errors
  }
};

const clearMeCache = () => {
  meReadCache.clear();
  try {
    window.localStorage.removeItem(ME_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

export const login = ({ correo, contraseña }) =>
  api
    .post('/auth/login', {
      correo: String(correo || '').toLowerCase().replace(/\s+/g, ''),
      contraseña,
    })
    .then((res) => {
      clearMeCache();
      return res.data;
    });

export const register = (payload) => api.post('/auth/register', payload).then((res) => {
  clearMeCache();
  return res.data;
});

export const verifyEmail = (correo, codigo) =>
  api.post('/auth/verify-email', { correo, codigo }).then((res) => {
    clearMeCache();
    return res.data;
  });

export const resendVerification = (correo) =>
  api.post('/auth/resend-verification', { correo }).then((res) => res.data);

export const forgotPassword = (correo) => api.post('/auth/forgot-password', { correo }).then((res) => res.data);

export const resetPassword = ({ correo, token, nuevaContraseña }) =>
  api.post('/auth/reset-password', { correo, token, nuevaContraseña }).then((res) => res.data);

export const changePassword = ({ userId, contraseñaActual, nuevaContraseña }) =>
  api.post(`/user/${userId}/password`, { contraseñaActual, nuevaContraseña }).then((res) => res.data);

// Cambio de email con verificación por código de 6 dígitos.
export const requestEmailChange = ({ userId, nuevoCorreo }) =>
  api.post(`/user/${userId}/email-change/request`, {
    nuevoCorreo: String(nuevoCorreo || '').toLowerCase().replace(/\s+/g, ''),
  }).then((res) => res.data);

export const confirmEmailChange = ({ userId, codigo }) =>
  api.post(`/user/${userId}/email-change/confirm`, { codigo }).then((res) => res.data);

export const resendEmailChangeCode = ({ userId }) =>
  api.post(`/user/${userId}/email-change/resend`).then((res) => res.data);

export const cancelEmailChange = ({ userId }) =>
  api.post(`/user/${userId}/email-change/cancel`).then((res) => res.data);

// Google OAuth: sends idToken from @react-oauth/google (client-side flow)
export const google = (idToken) => api.post('/auth/google', { idToken }).then((res) => {
  clearMeCache();
  return res.data;
});

// Google OAuth: server-side redirect URL
// Usage: window.location.href = getGoogleOAuthURL(lang, nextPath)
export const getGoogleOAuthURL = (lang = 'es', nextPath = '/', redirectBase = window.location.origin) => {
  const base = BACKEND_URL || window.location.origin;
  const next = encodeURIComponent(nextPath);
  const redirectBaseParam = encodeURIComponent(redirectBase);
  return `${base}/api/auth/google?lang=${lang}&next=${next}&redirectBase=${redirectBaseParam}`;
};

export const apple = (payload) => api.post('/auth/apple', payload).then((res) => {
  clearMeCache();
  return res;
});

export const me = ({ force = false } = {}) => {
  if (force) clearMeCache();
  const stored = !force ? readStoredMe() : null;
  if (stored) return Promise.resolve(stored);
  return meReadCache.read('auth:me', () => api.get('/auth/me').then((res) => {
    writeStoredMe(res.data);
    return res.data;
  }));
};
export const logout = () => api.post('/auth/logout').then((res) => {
  clearMeCache();
  return res.data;
});

export const listAdminUsers = () =>
  api.get('/auth/support/users', { cache: false })
    .then((res) => res.data)
    .catch((err) => {
      if (err?.status !== 404) throw err;
      return api.get('/user/support/users', { cache: false }).then((res) => res.data);
    });

export const impersonateUser = (userId) =>
  api.post(`/auth/support/impersonate/${userId}`)
    .catch((err) => {
      if (err?.status !== 404) throw err;
      return api.post(`/user/support/impersonate/${userId}`);
    })
    .then((res) => {
      clearMeCache();
      return res.data;
    });

export { clearMeCache };

export const acceptClubInvite = ({ correo, token }) =>
  api.post('/auth/accept-club-invite', { correo, token }).then((res) => {
    clearMeCache();
    return res.data;
  });
