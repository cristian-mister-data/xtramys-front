import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import AppRouter from './router/AppRouter';
import { fetchMe, logoutThunk } from './store/slices/user/userThunks';
import { setNetworkErrorHandler, setUnauthorizedHandler, setSubscriptionRequiredHandler } from './api/client';
import { setUser, clearUserState, subscriptionRequired } from './store/slices/user/userSlice';
import Toaster from './ui/Toaster';

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
      No se pudo conectar con el servidor
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
      {checking ? 'Conectando...' : 'Reintentar'}
    </button>
  </div>
);

const isConnectivityError = (error) => (
  error?.type === 'OFFLINE' ||
  error?.type === 'TIMEOUT' ||
  error?.message === 'Sin conexión a internet' ||
  error?.message === 'La petición ha tardado demasiado'
);

export default function App() {
  const dispatch = useDispatch();
  const bootstrapped = useRef(false);
  const apiUnavailableRef = useRef(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [checkingApi, setCheckingApi] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(logoutThunk());
    });
    setSubscriptionRequiredHandler(() => {
      dispatch(subscriptionRequired());
    });
    setNetworkErrorHandler((type, ctx) => {
      if (type === 'OFFLINE' || type === 'TIMEOUT') {
        if (!apiUnavailableRef.current) {
          console.warn('[Network]', type, ctx);
        }
        apiUnavailableRef.current = true;
        setApiUnavailable(true);
        return;
      }
      console.warn('[Network]', type, ctx);
    });
  }, [dispatch]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    dispatch(fetchMe())
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
  }, [dispatch]);

  const retryConnection = async () => {
    setCheckingApi(true);
    try {
      await dispatch(fetchMe()).unwrap();
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
