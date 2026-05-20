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

export const register = (payload) => api.post('/auth/register', payload).then((res) => res.data);

export const verifyEmail = (correo, codigo) =>
  api.post('/auth/verify-email', { correo, codigo }).then((res) => res.data);

export const resendVerification = (correo) =>
  api.post('/auth/resend-verification', { correo }).then((res) => res.data);

export const forgotPassword = (correo) => api.post('/auth/forgot-password', { correo }).then((res) => res.data);

export const resetPassword = ({ correo, token, nuevaContraseña }) =>
  api.post('/auth/reset-password', { correo, token, nuevaContraseña }).then((res) => res.data);

export const changePassword = ({ userId, contraseñaActual, nuevaContraseña }) =>
  api.post(`/user/${userId}/password`, { contraseñaActual, nuevaContraseña }).then((res) => res.data);

// Cambio de email con verificación por código de 6 dígitos.
// El correo actual sigue activo hasta que se confirma el nuevo.
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

export const google = (idToken) => api.post('/auth/google', { idToken });
export const apple = (payload) => api.post('/auth/apple', payload);

// Endpoint nuevo añadido al backend en la migración a web
export const me = () => api.get('/auth/me').then((res) => res.data);
export const logout = () => api.post('/auth/logout').then((res) => res.data);
