// Cliente HTTP. Soporta dos modos de auth:
// - cookie: cookies httpOnly emitidas por el backend (recomendado para web)
// - bearer: Authorization: Bearer <token> en localStorage (legacy / móvil)
import axios from 'axios';
import { API_URL, BACKEND_URL, USE_COOKIE_AUTH } from '../config';
import { TOKEN_STORAGE_KEY } from '../auth/storage';

let _networkErrorHandler = null;
export const setNetworkErrorHandler = (h) => {
  _networkErrorHandler = h;
};

let _onUnauthorized = null;
export const setUnauthorizedHandler = (h) => {
  _onUnauthorized = h;
};

function classifyNetworkError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) return 'TIMEOUT';
    return 'OFFLINE';
  }
  const status = error.response.status;
  const url = error.config?.url || '';
  const isAuthRoute = url.includes('/auth/');
  if (status === 401 && !isAuthRoute) return 'SESSION_EXPIRED';
  if (status >= 500) return 'SERVER_ERROR';
  return null;
}

function attachInterceptors(instance) {
  instance.interceptors.request.use(
    (config) => {
      if (!USE_COOKIE_AUTH) {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    (r) => r,
    (error) => {
      const url = error.config?.url || 'unknown';
      const method = (error.config?.method || 'unknown').toUpperCase();

      if (error.response) {
        console.warn(
          `[API ${method} ${url}] ${error.response.status}:`,
          error.response.data?.mensaje || error.response.data?.message || error.response.statusText,
        );
      } else {
        console.warn(`[API ${method} ${url}] ${error.message}`);
      }

      const errorType = classifyNetworkError(error);
      if (errorType && _networkErrorHandler) _networkErrorHandler(errorType, `${method} ${url}`);
      if (errorType === 'SESSION_EXPIRED' && _onUnauthorized) _onUnauthorized();

      const cleanError = new Error(
        error.response?.data?.mensaje ||
          error.response?.data?.message ||
          (errorType === 'TIMEOUT'
            ? 'La petición ha tardado demasiado'
            : errorType === 'OFFLINE'
              ? 'Sin conexión a internet'
              : errorType === 'SERVER_ERROR'
                ? 'Error del servidor'
                : error.message),
      );
      cleanError.status = error.response?.status;
      cleanError.code = error.response?.data?.code;
      cleanError.type = errorType;
      cleanError.data = error.response?.data;
      cleanError.originalError = error;
      return Promise.reject(cleanError);
    },
  );
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: USE_COOKIE_AUTH,
});

const apiBase = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  withCredentials: USE_COOKIE_AUTH,
});

attachInterceptors(api);
attachInterceptors(apiBase);

export default api;
export { api, apiBase };

// =====================
// Helper: polling de jobs de video asíncronos
// =====================
export const pollJobUntilDone = async (
  jobId,
  { intervalMs = 1500, maxAttempts = 80, signal } = {},
) => {
  let currentJobId = jobId;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new Error('Video generation cancelled');
    try {
      const { data } = await api.get(`/video/job/${currentJobId}/status`, { timeout: 10000 });
      if (data.status === 'completed') return data;
      if (data.status === 'failed') throw new Error(data.error || 'Error generando video');
      if (data.status === 'expired') throw new Error('Video expirado, intente de nuevo');
      if (data.jobId && String(data.jobId) !== String(currentJobId)) {
        currentJobId = String(data.jobId);
      }
    } catch (err) {
      if (signal?.aborted) throw new Error('Video generation cancelled');
      if (err.type !== 'OFFLINE' && err.type !== 'TIMEOUT') throw err;
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error('Tiempo de espera agotado generando video');
};
