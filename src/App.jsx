import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppRouter from './router/AppRouter';
import { fetchMe, logoutThunk } from './store/slices/user/userThunks';
import { setNetworkErrorHandler, setUnauthorizedHandler, setSubscriptionRequiredHandler } from './api/client';
import { setUser, clearUserState, subscriptionRequired } from './store/slices/user/userSlice';
import Toaster from './ui/Toaster';
import i18n from './i18n';
import { saveToken } from './auth/storage';

const ApiUnavailable = ({ checking, onRetry }) => (
  <div style={{
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    background: '#f0f4f8',
    color: '#5a6a7a',
    fontFamily: 'inherit',
  }}>
    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, textAlign: 'center' }}>
      {i18n.t('connection.apiUnavailableTitle')}
    </p>
    <button
      type="button"
      disabled={checking}
      onClick={onRetry}
      style={{
        minWidth: 132,
        padding: '12px 24px',
        border: 0,
        borderRadius: 12,
        background: checking ? '#8dd4e4' : '#00b4d8',
        color: '#fff',
        font: 'inherit',
        fontSize: 15,
        fontWeight: 700,
        cursor: checking ? 'default' : 'pointer',
      }}
    >
      {checking ? i18n.t('connection.reconnecting') : i18n.t('connection.retry')}
    </button>
  </div>
);

const isConnectivityError = (error) => (
  error?.type === 'OFFLINE' ||
  error?.type === 'TIMEOUT' ||
  error?.message === 'Sin conexión a internet' ||
  error?.message === 'La petición ha tardado demasiado'
);

const SESSION_RECHECK_INTERVAL_MS = 5 * 60 * 1000;
const IGNORED_WARNINGS = [
  'accessibilityDisabled is deprecated',
  'keyboardType is deprecated. Use inputMode',
];

if (typeof console !== 'undefined' && !console.__xtramysWarnFilter) {
  const warn = console.warn.bind(console);
  console.warn = (...args) => {
    const message = String(args[0] || '');
    if (IGNORED_WARNINGS.some((ignored) => message.includes(ignored))) return;
    warn(...args);
  };
  console.__xtramysWarnFilter = true;
}

export default function App() {
  const dispatch = useDispatch();
  const bootstrapped = useRef(false);
  const apiUnavailableRef = useRef(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [checkingApi, setCheckingApi] = useState(false);

  const user = useSelector((s) => s.usuario?.user);
  const userLanguage = user?.idioma;

  useEffect(() => {
    if (userLanguage && i18n.language !== userLanguage) {
      i18n.changeLanguage(userLanguage);
    }
  }, [userLanguage]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(logoutThunk());
    });
    setSubscriptionRequiredHandler(() => {
      dispatch(subscriptionRequired());
    });
    setNetworkErrorHandler((type) => {
      if (type === 'OFFLINE' || type === 'TIMEOUT') {
        apiUnavailableRef.current = true;
        setApiUnavailable(true);
      }
    });
  }, [dispatch]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Check for token in URL query parameter on startup
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      saveToken(urlToken);
      // Remove token from URL without reloading/re-routing
      params.delete('token');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }

    const checkSession = (force = false) => {
      dispatch(fetchMe({ force }))
        .unwrap()
        .then(() => {
          apiUnavailableRef.current = false;
          setApiUnavailable(false);
        })
        .catch((error) => {
          if (isConnectivityError(error)) {
            apiUnavailableRef.current = true;
            setApiUnavailable(true);
            return;
          }
          apiUnavailableRef.current = false;
          setApiUnavailable(false);
        });
    };

    checkSession(Boolean(urlToken));

    let lastChecked = Date.now();
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastChecked < SESSION_RECHECK_INTERVAL_MS) return;
      lastChecked = now;
      checkSession();
    };

    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [dispatch]);

  const retryConnection = async () => {
    setCheckingApi(true);
    try {
      await dispatch(fetchMe({ force: true })).unwrap();
      apiUnavailableRef.current = false;
      setApiUnavailable(false);
    } catch (error) {
      const unavailable = isConnectivityError(error);
      apiUnavailableRef.current = unavailable;
      setApiUnavailable(unavailable);
    } finally {
      setCheckingApi(false);
    }
  };

  if (apiUnavailable) {
    return <ApiUnavailable checking={checkingApi} onRetry={retryConnection} />;
  }

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
