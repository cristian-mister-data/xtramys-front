import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { getPublicMatchSheetSetPieces, getPublicSetPiece } from '@/utils/api';
import SharedSetPieceBoard from '@/components/season/SharedSetPieceBoard';
import { normalizeKits, normalizeRivalKits } from '@/utils/kits';

export default function SetPieceShare() {
  const { t } = useTranslation();
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const isMatchSheet = window.location.pathname.includes('/public/match-sheet-abp/');
    (isMatchSheet ? getPublicMatchSheetSetPieces(token) : getPublicSetPiece(token))
      .then(setData)
      .catch(() => setError('matchPresentation.unavailable'));
  }, [token]);

  if (error)
    return (
      <main style={styles.shell}>
        <p style={styles.error}>{t(error)}</p>
      </main>
    );
  if (!data)
    return (
      <main style={styles.shell}>
        <p style={styles.muted}>{t('matchPresentation.loading')}</p>
      </main>
    );

  if (data.matchSheet) {
    const matchSheet = data.matchSheet;
    const setPieces = matchSheet.setPieces || [];
    const ownKey = matchSheet.equipacionPropiaKey || 'first';
    const rivalKey = matchSheet.equipacionRivalKey || 'first';
    const ownKits = normalizeKits(matchSheet.equipo?.equipaciones);
    const rivalKits = normalizeRivalKits(matchSheet.rivalId?.equipaciones);
    const getKitContext = (setPiece) => ({
      ...(setPiece.pizarraConfig?.kitContext || {}),
      teamId: matchSheet.equipo?._id || null,
      rivalId: matchSheet.rivalId?._id || matchSheet.rivalId || null,
      rivalName: matchSheet.rival || '',
      ownKitKey: ownKey,
      rivalKitKey: rivalKey,
      own: matchSheet.equipacionPropia || ownKits[ownKey],
      ownGoalkeeper:
        matchSheet.equipacionPorteroPropia ||
        ownKits[ownKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'],
      rival: matchSheet.equipacionRival || rivalKits[rivalKey],
      rivalGoalkeeper:
        matchSheet.equipacionPorteroRival ||
        rivalKits[rivalKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'],
    });
    return (
      <main style={styles.shell}>
        <section style={styles.header}>
          <p style={styles.kicker}>Xtramys · {t('matchPresentation.setPieces')}</p>
          <h1 style={styles.title}>
            {matchSheet.equipo?.nombre || t('matchPresentation.team')} vs {matchSheet.rival}
          </h1>
          <p style={styles.desc}>
            {t('matchPresentation.setPieceCount', { count: setPieces.length })}
          </p>
        </section>
        <section style={styles.list}>
          {setPieces.map((setPiece, index) => {
            return (
              <article key={`${setPiece.strategyId || index}`} style={styles.boardCard}>
                <h2 style={styles.cardTitle}>{setPiece.nombre}</h2>
                <SharedSetPieceBoard setPiece={setPiece} kitContext={getKitContext(setPiece)} />
                {setPiece.descripcion ? (
                  <p style={styles.videoDesc}>{setPiece.descripcion}</p>
                ) : null}
              </article>
            );
          })}
        </section>
      </main>
    );
  }

  const setPiece = data.setPiece || {};
  const video = data.video || (data.videos || [])[0] || null;

  return (
    <main style={styles.shell}>
      <section style={styles.header}>
        <p style={styles.kicker}>Xtramys · {t('matchPresentation.setPieces')}</p>
        <h1 style={styles.title}>{setPiece.nombre}</h1>
        {setPiece.descripcion ? <p style={styles.desc}>{setPiece.descripcion}</p> : null}
      </section>

      <section style={styles.boardCard}>
        <SharedSetPieceBoard setPiece={setPiece} video={video} />
      </section>
    </main>
  );
}

const styles = {
  shell: {
    height: '100dvh',
    overflowY: 'auto',
    minHeight: '100vh',
    padding: '40px 24px',
    background: 'linear-gradient(180deg, #eef4ff 0%, #f8fafc 34%, #ffffff 100%)',
    color: '#0f172a',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: { maxWidth: 1200, margin: '0 auto 22px' },
  kicker: {
    margin: 0,
    color: '#2563eb',
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  title: {
    margin: '6px 0',
    fontSize: 'clamp(28px, 4vw, 48px)',
    lineHeight: 1.05,
    letterSpacing: 0,
  },
  desc: { margin: 0, maxWidth: 780, color: '#475569', fontSize: 16, fontWeight: 650 },
  boardCard: {
    width: '100%',
    boxSizing: 'border-box',
    maxWidth: 1440,
    margin: '0 auto',
    borderRadius: 18,
    border: '1px solid rgba(148,163,184,0.35)',
    background: 'rgba(255,255,255,0.88)',
    padding: 14,
    boxShadow: '0 18px 60px rgba(15,23,42,0.12)',
  },
  list: {
    width: '100%',
    maxWidth: 1440,
    margin: '0 auto',
    display: 'grid',
    gap: 24,
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
  cardTitle: { margin: '12px 4px 4px', fontSize: 20, lineHeight: 1.2 },
  muted: { color: '#667085', fontWeight: 700 },
  error: { color: '#b42318', fontWeight: 800 },
  videoDesc: { color: '#64748b', margin: '4px', fontSize: 14 },
};
