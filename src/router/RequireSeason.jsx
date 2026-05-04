import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTemporadasUsuario } from '@/store/slices/season/seasonThunks';

const SetupFallback = () => (
  <div style={{ minHeight: '100dvh', background: '#f0f4f8' }} />
);

const ErrorFallback = ({ onRetry }) => (
  <div style={{
    minHeight: '100dvh',
    background: '#f0f4f8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    color: '#5a6a7a',
    fontFamily: 'inherit',
  }}>
    <p style={{ margin: 0, fontSize: 16, fontWeight: 600, textAlign: 'center' }}>
      No se pudo conectar con el servidor
    </p>
    <button
      type="button"
      onClick={onRetry}
      style={{
        padding: '12px 28px',
        border: 0,
        borderRadius: 12,
        background: '#00b4d8',
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Reintentar
    </button>
  </div>
);

export default function RequireSeason({ children }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const userId = useSelector((state) => state.usuario.user?._id);
  const season = useSelector((state) => state.season.season);
  const seasons = useSelector((state) => state.season.seasons || []);
  const loading = useSelector((state) => state.season.loading);
  // 'idle' | 'loading' | 'ok' | 'empty' | 'error'
  const [status, setStatus] = useState('idle');
  const requestedUserRef = useRef(null);
  const latestRequestRef = useRef(0);

  const runCheck = useCallback((force = false) => {
    if (!userId) {
      requestedUserRef.current = null;
      setStatus('idle');
      return;
    }

    if (!force && requestedUserRef.current === userId) return;

    requestedUserRef.current = userId;
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    setStatus('loading');
    dispatch(fetchTemporadasUsuario({ usuario: userId }))
      .unwrap()
      .then((data) => {
        if (latestRequestRef.current !== requestId) return;
        setStatus(data && data.length > 0 ? 'ok' : 'empty');
      })
      .catch((error) => {
        if (latestRequestRef.current !== requestId) return;
        console.warn('Error checking user seasons:', error);
        // Network/server error — do NOT redirect to /season/create.
        // Show a retry screen so we don't loop on connectivity issues.
        setStatus('error');
      });
  }, [dispatch, userId]);

  useEffect(() => {
    runCheck(false);
  }, [runCheck]);

  const hasSeason = Boolean(season?._id) || seasons.length > 0;

  if (status === 'error') {
    return <ErrorFallback onRetry={() => {
      runCheck(true);
    }} />;
  }

  if (status === 'idle' || status === 'loading' || loading) {
    return <SetupFallback />;
  }

  if (!hasSeason && status === 'empty') {
    return <Navigate to="/season/create" state={{ from: location }} replace />;
  }

  return children;
}
