import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useParams } from 'react-router-dom';
import { getPublicMatchSheetSetPieces, getPublicSetPiece } from '@/utils/api';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import { getContentImage, usesImportedImage } from '@/utils/contentVisual';
import SetPiecePreview from '@/vendor/matchSheet/SetPiecePreview';
import { normalizeKits, normalizeRivalKits } from '@/utils/kits';

async function resolveVideoSrc(src) {
  if (!src) throw new Error('No hay URL de video disponible.');
  const response = await fetch(src, { method: 'GET', redirect: 'follow' });
  if (!response.ok) throw new Error(`No se pudo cargar el video (${response.status}).`);
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('video/')) throw new Error('El servidor no devolvio un archivo de video.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('El video esta vacio.');
  return URL.createObjectURL(blob);
}

export default function SetPieceShare() {
  const { token } = useParams();
  const { width: viewportWidth } = useWindowDimensions();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const sharePreviewHeight = Math.max(260, Math.min(760, (viewportWidth - 80) * 0.65));

  useEffect(() => {
    const isMatchSheet = window.location.pathname.includes('/public/match-sheet-abp/');
    (isMatchSheet ? getPublicMatchSheetSetPieces(token) : getPublicSetPiece(token))
      .then(setData)
      .catch(() => setError('No se pudo cargar la ABP.'));
  }, [token]);

  const openVideo = async (video, title) => {
    if (!video?.url) return;
    try {
      const url = await resolveVideoSrc(video.url);
      setSelectedVideo({ ...video, title, url, objectUrl: url });
    } catch {
      setError('No se pudo cargar el video.');
    }
  };

  useEffect(() => () => {
    if (selectedVideo?.objectUrl) URL.revokeObjectURL(selectedVideo.objectUrl);
  }, [selectedVideo]);

  const renderVideoModal = () => selectedVideo ? (
    <div style={styles.modal} onClick={() => setSelectedVideo(null)}>
      <div style={styles.modalPanel} onClick={(event) => event.stopPropagation()}>
        <button type="button" style={styles.closeButton} onClick={() => setSelectedVideo(null)}>×</button>
        <h2 style={styles.modalTitle}>{selectedVideo.title}</h2>
        <video key={selectedVideo.url} src={selectedVideo.url} controls autoPlay playsInline style={styles.modalVideo} />
      </div>
    </div>
  ) : null;

  if (error) return <main style={styles.shell}><p style={styles.error}>{error}</p></main>;
  if (!data) return <main style={styles.shell}><p style={styles.muted}>Cargando ABP...</p></main>;

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
      ownGoalkeeper: matchSheet.equipacionPorteroPropia || ownKits[ownKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'],
      rival: matchSheet.equipacionRival || rivalKits[rivalKey],
      rivalGoalkeeper: matchSheet.equipacionPorteroRival || rivalKits[rivalKey === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'],
    });
    return (
      <main style={styles.shell}>
        <section style={styles.header}>
          <p style={styles.kicker}>Xtramys ABP</p>
          <h1 style={styles.title}>{matchSheet.equipo?.nombre || 'Equipo'} vs {matchSheet.rival}</h1>
          <p style={styles.desc}>{setPieces.length} ABP</p>
        </section>
        <section style={styles.list}>
          {setPieces.map((setPiece, index) => {
            const hasVideo = !usesImportedImage(setPiece) && (setPiece.video?.url || setPiece.videoUrl);
            return (
              <article key={`${setPiece.strategyId || index}`} style={styles.boardCard}>
                <button
                  type="button"
                  style={styles.boardButton}
                  onClick={() => {
                    if (setPiece.video?.url) {
                      openVideo(setPiece.video, setPiece.nombre);
                    } else if (setPiece.videoUrl) {
                      window.open(setPiece.videoUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  disabled={!hasVideo}
                >
                  <SetPiecePreview
                    setPiece={setPiece}
                    height={sharePreviewHeight}
                    kitContext={getKitContext(setPiece)}
                  />
                  {hasVideo ? <span style={styles.playBadge}>Ver video</span> : null}
                </button>
                <h2 style={styles.cardTitle}>{setPiece.nombre}</h2>
                {setPiece.descripcion ? <p style={styles.videoDesc}>{setPiece.descripcion}</p> : null}
              </article>
            );
          })}
        </section>
        {renderVideoModal()}
      </main>
    );
  }

  const setPiece = data.setPiece || {};
  const image = normalizeImageSource(getContentImage(setPiece));
  const video = data.video || (data.videos || [])[0] || null;

  return (
    <main style={styles.shell}>
      <section style={styles.header}>
        <p style={styles.kicker}>Xtramys ABP</p>
        <h1 style={styles.title}>{setPiece.nombre}</h1>
        {setPiece.descripcion ? <p style={styles.desc}>{setPiece.descripcion}</p> : null}
      </section>

      <section style={styles.boardCard}>
        <button
          type="button"
          style={styles.boardButton}
          onClick={() => {
            if (video?.url) {
              openVideo(video, setPiece.nombre);
            } else if (setPiece.videoUrl) {
              window.open(setPiece.videoUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          disabled={!(video?.url || setPiece.videoUrl)}
        >
          {image ? <img src={image} alt={setPiece.nombre} style={styles.board} /> : <span style={styles.muted}>Sin grafico</span>}
          {(video?.url || setPiece.videoUrl) ? <span style={styles.playBadge}>Ver video</span> : null}
        </button>
      </section>

      {renderVideoModal()}
    </main>
  );
}

const styles = {
  shell: {
    minHeight: '100vh',
    padding: '40px 24px',
    background: 'linear-gradient(180deg, #eef4ff 0%, #f8fafc 34%, #ffffff 100%)',
    color: '#0f172a',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: { maxWidth: 1200, margin: '0 auto 22px' },
  kicker: { margin: 0, color: '#2563eb', fontWeight: 900, letterSpacing: 0, textTransform: 'uppercase', fontSize: 13 },
  title: { margin: '6px 0', fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: 0 },
  desc: { margin: 0, maxWidth: 780, color: '#475569', fontSize: 16, fontWeight: 650 },
  boardCard: {
    width: '100%',
    boxSizing: 'border-box',
    maxWidth: 1200,
    margin: '0 auto',
    borderRadius: 18,
    border: '1px solid rgba(148,163,184,0.35)',
    background: 'rgba(255,255,255,0.88)',
    padding: 14,
    boxShadow: '0 18px 60px rgba(15,23,42,0.12)',
  },
  list: { width: '100%', maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' },
  cardTitle: { margin: '12px 4px 4px', fontSize: 20, lineHeight: 1.2 },
  boardButton: { position: 'relative', width: '100%', border: 0, padding: 0, margin: 0, background: '#0b1220', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'block' },
  board: { width: '100%', aspectRatio: '16 / 9', objectFit: 'contain', display: 'block' },
  playBadge: { position: 'absolute', right: 14, bottom: 14, padding: '9px 13px', borderRadius: 999, background: '#2563eb', color: '#fff', fontWeight: 850, boxShadow: '0 10px 30px rgba(37,99,235,0.35)' },
  muted: { color: '#667085', fontWeight: 700 },
  error: { color: '#b42318', fontWeight: 800 },
  videoDesc: { color: '#64748b', margin: '4px', fontSize: 14 },
  modal: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalPanel: { position: 'relative', width: 'min(1100px, 96vw)', background: '#0f172a', borderRadius: 18, padding: 16, boxShadow: '0 30px 90px rgba(0,0,0,0.45)' },
  closeButton: { position: 'absolute', top: 10, right: 12, width: 38, height: 38, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: '38px' },
  modalTitle: { margin: '4px 48px 14px 4px', color: '#fff', fontSize: 22 },
  modalVideo: { width: '100%', maxHeight: '78vh', borderRadius: 12, background: '#000', display: 'block' },
};
