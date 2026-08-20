import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchTemporada } from '@/store/slices/season/seasonThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';

const SetupFallback = () => (
  <div style={{
    minHeight: '100dvh',
    background: 'var(--color-background, #0b0f19)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  }}>
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.1)',
      borderTopColor: '#ff6b35',
      animation: 'spin 0.8s linear infinite',
    }} />
    <span style={{ fontSize: 14, opacity: 0.7, fontFamily: 'sans-serif', color: '#fff' }}>Cargando...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ErrorFallback = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <div style={{
      minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24,
      background: 'var(--color-background, #f0f4f8)', color: 'var(--color-text, #5a6a7a)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 16px', fontWeight: 600 }}>{t('connection.apiUnavailableTitle')}</p>
        <button type="button" onClick={onRetry} style={{
          padding: '12px 28px', border: 0, borderRadius: 12, background: '#00b4d8',
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          {t('connection.retry')}
        </button>
      </div>
    </div>
  );
};

export default function RequireSeason({ children }) {
  const dispatch = useDispatch();
  const workspace = useSelector((state) => state.workspace.selected);
  const workspaceLoaded = useSelector((state) => state.workspace.loaded);
  const workspaceLoading = useSelector((state) => state.workspace.loading);
  const user = useSelector((state) => state.usuario.user);
  const supervising = useSelector((state) => state.usuario.supervising);

  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
  const isClubAdmin = user?.role === 'club_admin' || user?.clubRole === 'admin';

  const seasonId = workspace?.team?.temporada?._id || workspace?.team?.temporada || null;
  const teamId = workspace?.team?._id || workspace?.teamId || null;
  const [status, setStatus] = useState('idle');
  const requestRef = useRef('');

  const load = useCallback((force = false) => {
    if (!seasonId || !teamId) {
      setStatus('ok');
      return;
    }
    const key = `${teamId}:${seasonId}`;
    if (!force && requestRef.current === key && status === 'ok') return;
    requestRef.current = key;
    setStatus('loading');
    Promise.all([
      dispatch(fetchTemporada({ id: seasonId })).unwrap(),
      dispatch(fetchEquiposTemporada({ season: seasonId })).unwrap(),
    ]).then(() => setStatus('ok')).catch(() => setStatus('error'));
  }, [dispatch, seasonId, teamId, status]);

  useEffect(() => {
    if (isDemo || (isClubAdmin && !supervising)) {
      setStatus('ok');
      return;
    }
    // Al recargar, el workspace persistido puede apuntar a un equipo
    // eliminado o perteneciente a otra cuenta. Esperamos a que WorkspaceGate
    // valide la lista accesible antes de pedir temporada/equipos.
    if (!workspaceLoaded || workspaceLoading) {
      setStatus('loading');
      return;
    }
    load(false);
  }, [isClubAdmin, isDemo, load, supervising, workspaceLoaded, workspaceLoading]);

  // Si es usuario demo o administrador de club no supervisando, no requiere cargar temporada previa.
  if (isDemo || (isClubAdmin && !supervising)) return children;

  if (status === 'error') return <ErrorFallback onRetry={() => load(true)} />;
  if (status !== 'ok') return <SetupFallback />;
  return children;
}
