// Cliente HTTP. Soporta dos modos de auth:
// - cookie: cookies httpOnly emitidas por el backend (recomendado para web)
// - bearer: Authorization: Bearer <token> en localStorage (legacy / móvil)
import axios from 'axios';
import i18n from '../i18n';
import { API_URL, BACKEND_URL, USE_COOKIE_AUTH } from '../config';
import { loadToken } from '../auth/storage';

let _networkErrorHandler = null;
export const setNetworkErrorHandler = (h) => {
  _networkErrorHandler = h;
};

let _onUnauthorized = null;
export const setUnauthorizedHandler = (h) => {
  _onUnauthorized = h;
};

let _onSubscriptionRequired = null;
export const setSubscriptionRequiredHandler = (h) => {
  _onSubscriptionRequired = h;
};

let _lastWarning = { key: '', at: 0 };

function shouldLogWarning(key) {
  const now = Date.now();
  if (_lastWarning.key === key && now - _lastWarning.at < 5000) return false;
  _lastWarning = { key, at: now };
  return true;
}

function classifyNetworkError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) return 'TIMEOUT';
    return 'OFFLINE';
  }
  const status = error.response.status;
  const url = error.config?.url || '';
  const isAuthRoute = url.includes('/auth/');
  const isPasswordChangeRoute = /\/user\/[^/]+\/password(?:\?|$)/.test(url);
  if (status === 401 && !isAuthRoute && !isPasswordChangeRoute) return 'SESSION_EXPIRED';
  if (status >= 500) return 'SERVER_ERROR';
  return null;
}

const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const LONG_TIMEOUT_ROUTES = ['/video-folder/move-video', '/video/proxy-upload', '/video/generate'];
const GET_CACHE_TTL_MS = 30000;
const getResponseCache = new Map();
const getInflight = new Map();
let getCacheVersion = 0;

const CACHE_BYPASS_ROUTES = [
  '/auth/',
  '/stripe',
  '/paypal',
  '/payment',
  '/video/job/',
  '/video/stream',
  '/video/download',
  '/video/proxy-upload',
  '/video/presign',
  '/video/generate',
  '/media/download',
];

function serializeParams(params) {
  if (!params) return '';
  if (params instanceof URLSearchParams) return params.toString();
  if (typeof params === 'string') return params;
  return Object.keys(params)
    .sort()
    .map((key) => {
      const value = params[key];
      if (value === undefined) return '';
      const normalized = value && typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${encodeURIComponent(key)}=${encodeURIComponent(normalized)}`;
    })
    .filter(Boolean)
    .join('&');
}

function getCacheKey(config) {
  const method = String(config.method || 'get').toLowerCase();
  if (method !== 'get') return null;
  if (config.skipCache || config.cache === false || config.signal) return null;
  if (config.responseType && config.responseType !== 'json') return null;

  const url = String(config.url || '');
  if (!url || CACHE_BYPASS_ROUTES.some(route => url.includes(route))) return null;

  const params = serializeParams(config.params);
  return `${config.baseURL || ''}${url}${params ? `?${params}` : ''}`;
}

function cloneCachedResponse(response, config) {
  return {
    ...response,
    config,
    request: response.request,
    headers: response.headers,
    data: response.data,
  };
}

function clearGetCache() {
  getCacheVersion += 1;
  getResponseCache.clear();
  getInflight.clear();
}

function attachGetCache(config) {
  const cacheKey = getCacheKey(config);
  if (!cacheKey) return config;

  const now = Date.now();
  const cached = getResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    config.adapter = async () => cloneCachedResponse(cached.response, config);
    return config;
  }

  const inflight = getInflight.get(cacheKey);
  if (inflight) {
    config.adapter = async () => cloneCachedResponse(await inflight, config);
    return config;
  }

  const originalAdapter = config.adapter || axios.defaults.adapter;
  const requestCacheVersion = getCacheVersion;
  config.adapter = async (adapterConfig) => {
    const adapter = axios.getAdapter(originalAdapter);
    const request = adapter(adapterConfig)
      .then((response) => {
        if (requestCacheVersion === getCacheVersion) {
          getResponseCache.set(cacheKey, {
            expiresAt: Date.now() + GET_CACHE_TTL_MS,
            response,
          });
        }
        return response;
      })
      .finally(() => {
        getInflight.delete(cacheKey);
      });

    getInflight.set(cacheKey, request);
    return request;
  };

  return config;
}

function shouldRetryRequest(error) {
  const config = error.config || {};
  const method = String(config.method || 'get').toLowerCase();
  if (!RETRYABLE_METHODS.has(method)) return false;
  if (config.__retryCount >= 2) return false;
  if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') return false;
  if (!error.response) return true;
  return RETRYABLE_STATUS.has(error.response.status);
}

function retryDelay(attempt) {
  return 300 * (2 ** Math.max(0, attempt - 1));
}

function attachInterceptors(instance) {
  instance.interceptors.request.use(
    (config) => {
      const method = String(config.method || 'get').toLowerCase();
      if (!RETRYABLE_METHODS.has(method)) clearGetCache();

      // Send token in Authorization header as a fallback/additional option,
      // even if cookie auth is enabled. This ensures authentication works
      // if cookies are blocked by browser settings or privacy extensions.
      const token = loadToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      
      const isLongTimeout = LONG_TIMEOUT_ROUTES.some(route => config.url?.includes(route));
      if (isLongTimeout && !config.timeout) {
        config.timeout = 60000;
      }
      
      return attachGetCache(config);
    },
    (error) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    (r) => r,
    async (error) => {
      if (shouldRetryRequest(error)) {
        const config = error.config;
        config.__retryCount = (config.__retryCount || 0) + 1;
        await new Promise((resolve) => setTimeout(resolve, retryDelay(config.__retryCount)));
        return instance.request(config);
      }

      const url = error.config?.url || 'unknown';
      const method = (error.config?.method || 'unknown').toUpperCase();
      const errorType = classifyNetworkError(error);

      if (errorType && _networkErrorHandler) _networkErrorHandler(errorType, `${method} ${url}`);
      if (errorType === 'SESSION_EXPIRED' && _onUnauthorized) _onUnauthorized();
      if (error.response?.status === 402 && _onSubscriptionRequired) _onSubscriptionRequired();

      const errorCode = error.response?.data?.code;
      let translatedMessage;
      const isPasswordChangeRoute = /\/user\/[^/]+\/password(?:\?|$)/.test(url);

      if (isPasswordChangeRoute && error.response?.status === 401) {
        translatedMessage = i18n.t('errors.CURRENT_PASSWORD_INCORRECT');
      } else if (errorCode) {
        const key = `errors.${errorCode}`;
        translatedMessage = i18n.exists(key) ? i18n.t(key) : null;
      }

      if (!translatedMessage) {
        switch (errorType) {
          case 'TIMEOUT':
            translatedMessage = i18n.t('connection.timeoutMessage');
            break;
          case 'OFFLINE':
            translatedMessage = i18n.t('connection.offlineMessage');
            break;
          case 'SERVER_ERROR':
            translatedMessage = i18n.t('connection.serverErrorMessage');
            break;
          case 'SESSION_EXPIRED':
            translatedMessage = i18n.t('connection.sessionExpiredMessage');
            break;
        }
      }

      const cleanError = new Error(
        translatedMessage ||
          error.response?.data?.mensaje ||
          error.response?.data?.message ||
          error.message,
      );
      cleanError.status = error.response?.status;
      cleanError.code = errorCode;
      cleanError.type = errorType;
      cleanError.data = error.response?.data;
      cleanError.originalError = error;
      return Promise.reject(cleanError);
    },
  );
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: USE_COOKIE_AUTH,
});

const apiBase = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
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
      const { data } = await api.get(`/video/job/${currentJobId}/status`, { timeout: 15000 });
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
