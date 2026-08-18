// Helpers de almacenamiento local. Solo se usa para datos no sensibles del usuario
// (perfil, preferencias). El JWT vive en cookie httpOnly cuando AUTH_MODE=cookie.
import { Preferences } from '@capacitor/preferences';
import { isNative } from '@/platform/capacitor';

export const TOKEN_STORAGE_KEY = 'token'; // solo si AUTH_MODE=bearer
export const MARKETING_TOKEN_STORAGE_KEY = 'auth_token';
export const USER_STORAGE_KEY = 'usuario';
export const WORKSPACE_STORAGE_KEY = 'workspace';

const keys = [USER_STORAGE_KEY, TOKEN_STORAGE_KEY, MARKETING_TOKEN_STORAGE_KEY, WORKSPACE_STORAGE_KEY];

const setPreference = (key, value) => {
  if (!isNative) return Promise.resolve();
  return Preferences.set({ key, value }).catch(() => {});
};

const removePreference = (key) => {
  if (!isNative) return;
  Preferences.remove({ key }).catch(() => {});
};

export async function hydrateNativeStorage() {
  if (!isNative) return;
  await Promise.all(keys.map(async (key) => {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null) localStorage.setItem(key, value);
    } catch (_) {
      // La app puede arrancar con la copia de localStorage aunque Preferences falle.
    }
  }));
}

export const saveUser = (user) => {
  try {
    const value = JSON.stringify(user);
    localStorage.setItem(USER_STORAGE_KEY, value);
    setPreference(USER_STORAGE_KEY, value);
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
    keys.forEach((key) => {
      localStorage.removeItem(key);
      removePreference(key);
    });
  } catch (_e) {
    // ignore
  }
};

export const saveToken = async (token) => {
  try {
    if (!token) return;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(MARKETING_TOKEN_STORAGE_KEY, token);
    await Promise.all([
      setPreference(TOKEN_STORAGE_KEY, token),
      setPreference(MARKETING_TOKEN_STORAGE_KEY, token),
    ]);
  } catch (_e) {
    // ignore
  }
};

export const saveWorkspace = (workspace) => {
  try {
    const value = JSON.stringify(workspace);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, value);
    setPreference(WORKSPACE_STORAGE_KEY, value);
  } catch (_e) {
    // Storage is an optimization; the API remains the source of truth.
  }
};

export const loadWorkspace = () => {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
};

export const clearWorkspace = () => {
  try {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    removePreference(WORKSPACE_STORAGE_KEY);
  } catch (_e) {
    // ignore
  }
};

export const loadToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(MARKETING_TOKEN_STORAGE_KEY);
  } catch (_e) {
    return null;
  }
};
