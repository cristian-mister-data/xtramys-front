// Helpers de almacenamiento local. Solo se usa para datos no sensibles del usuario
// (perfil, preferencias). El JWT vive en cookie httpOnly cuando AUTH_MODE=cookie.

export const TOKEN_STORAGE_KEY = 'token'; // solo si AUTH_MODE=bearer
export const USER_STORAGE_KEY = 'usuario';

export const saveUser = (user) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (_e) {
    // ignorar fallos de storage (modo privado, etc.)
  }
};

export const loadUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
};

export const clearUser = () => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (_e) {
    // ignore
  }
};

export const saveToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (_e) {
    // ignore
  }
};

export const loadToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (_e) {
    return null;
  }
};
