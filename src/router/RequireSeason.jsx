import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchTemporada } from '@/store/slices/season/seasonThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';

const SetupFallback = () => (
  <div style={{ minHeight: '100dvh', background: 'var(--color-background, #f0f4f8)' }} />
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
    if (!force && requestRef.current === key) return;
    requestRef.current = key;
    setStatus('loading');
    Promise.all([
      dispatch(fetchTemporada({ id: seasonId })).unwrap(),
      dispatch(fetchEquiposTemporada({ season: seasonId })).unwrap(),
    ]).then(() => setStatus('ok')).catch(() => setStatus('error'));
  }, [dispatch, seasonId, teamId]);

  useEffect(() => load(false), [load]);

  if (status === 'error') return <ErrorFallback onRetry={() => load(true)} />;
  if (status !== 'ok') return <SetupFallback />;
  return children;
}
