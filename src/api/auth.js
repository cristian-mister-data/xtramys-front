import api from './client';

// El backend acepta tanto cookie httpOnly como Bearer.
// En modo cookie, el backend setea la cookie en login/verify/google/apple.

export const login = ({ correo, contraseña }) =>
  api
    .post('/auth/login', {
      correo: String(correo || '').toLowerCase().replace(/\s+/g, ''),
      contraseña,
    })
    .then((res) => res.data);

export const register = (payload) => api.post('/auth/register', payload);

export const verifyEmail = (correo, codigo) =>
  api.post('/auth/verify-email', { correo, codigo });

export const resendVerification = (correo) =>
  api.post('/auth/resend-verification', { correo });

export const forgotPassword = (correo) => api.post('/auth/forgot-password', { correo });

export const resetPassword = (token, password) =>
  api.post('/auth/reset-password', { token, password });

export const google = (idToken) => api.post('/auth/google', { idToken });
export const apple = (payload) => api.post('/auth/apple', payload);

// Endpoint nuevo añadido al backend en la migración a web
export const me = () => api.get('/auth/me').then((res) => res.data);
export const logout = () => api.post('/auth/logout').then((res) => res.data);
