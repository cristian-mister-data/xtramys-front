import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchTemporadasUsuario, fetchTemporadaUsuarioSeleccionada } from '@/store/slices/season/seasonThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';

const SetupFallback = () => (
  <div style={{ minHeight: '100dvh', background: '#f0f4f8' }} />
);

const ErrorFallback = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
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
      {t('connection.apiUnavailableTitle')}
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
      {t('connection.retry')}
    </button>
  </div>
  );
};

export default function RequireSeason({ children }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.usuario.user);
  const userId = user?._id || user?.id;
  const isClubAdmin = user?.role === 'club_admin';
  const isClubCoach = user?.role === 'user' && !!user?.clubId;
  const hasPendingCoachSetup = isClubCoach && user?.coachSetupCompleted === false;
  const supervising = useSelector((state) => state.usuario.supervising);
  const season = useSelector((state) => state.season.season);
  const seasons = useSelector((state) => state.season.seasons || []);
  const loading = useSelector((state) => state.season.loading);
  // 'idle' | 'loading' | 'ok' | 'empty' | 'error' | 'coach-setup'
  const [status, setStatus] = useState('idle');
  const [needsCoachSetup, setNeedsCoachSetup] = useState(false);
  const requestedUserRef = useRef(null);
  const latestRequestRef = useRef(0);

  const runCheck = useCallback((force = false) => {
    if (!userId) {
      requestedUserRef.current = null;
      setNeedsCoachSetup(false);
      setStatus('idle');
      return;
    }

    if (!force && requestedUserRef.current === userId) return;

    requestedUserRef.current = userId;
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    setNeedsCoachSetup(false);
    setStatus('loading');
    dispatch(fetchTemporadasUsuario({ usuario: userId }))
      .unwrap()
      .then(async (data) => {
        if (latestRequestRef.current !== requestId) return;
        // Fetch selected season after getting all seasons
        if (data && data.length > 0) {
          const selectedSeason = await dispatch(fetchTemporadaUsuarioSeleccionada({ usuario: userId })).unwrap();
          if (isClubCoach) {
            const sel = selectedSeason || data.find(s => s.seleccionada) || data[0];
            if (sel) {
              const loadedTeams = await dispatch(fetchEquiposTemporada({ season: sel._id })).unwrap();
              if (latestRequestRef.current !== requestId) return;
              setNeedsCoachSetup(Boolean(hasPendingCoachSetup || (sel.isCurrentClubSeason && (!loadedTeams || loadedTeams.length === 0))));
            }
          }
        }
        setStatus(data && data.length > 0 ? 'ok' : 'empty');
      })
      .catch((error) => {
        if (latestRequestRef.current !== requestId) return;
        console.warn('Error checking user seasons:', error);
        // Network/server error — do NOT redirect to /season/create.
        // Show a retry screen so we don't loop on connectivity issues.
        setStatus('error');
      });
  }, [dispatch, userId, isClubCoach, hasPendingCoachSetup]);

  useEffect(() => {
    runCheck(false);
  }, [runCheck]);

  // For club_admin: check if they have created their initial season yet
  // If not, redirect them to /season/create for the first-time setup
  if (isClubAdmin) {
    // Still loading season info
    if (status === 'idle' || status === 'loading' || loading) {
      return <SetupFallback />;
    }
    const hasSeason = Boolean(season?._id) || seasons.length > 0;
    if (!hasSeason && status === 'empty') {
      return <Navigate to="/season/create" state={{ from: location }} replace />;
    }
    return children;
  }

  // When supervising a coach, skip the coach-setup redirect
  if (supervising) {
    if (status === 'idle' || status === 'loading' || loading) {
      return <SetupFallback />;
    }
    return children;
  }

  // For club coaches: check if they need to complete the setup flow
  if (isClubCoach && status === 'ok' && (needsCoachSetup || hasPendingCoachSetup) && !loading) {
    return <Navigate to="/coach-setup" state={{ from: location }} replace />;
  }

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
