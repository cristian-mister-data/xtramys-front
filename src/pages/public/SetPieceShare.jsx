import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicSetPiece } from '@/utils/api';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';

export default function SetPieceShare() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicSetPiece(token).then(setData).catch(() => setError('No se pudo cargar la ABP.'));
  }, [token]);

  if (error) return <main style={styles.shell}><p style={styles.error}>{error}</p></main>;
  if (!data) return <main style={styles.shell}><p style={styles.muted}>Cargando ABP...</p></main>;

  const setPiece = data.setPiece || {};
  const image = normalizeImageSource(setPiece.imagen);
  const videos = data.videos || [];

  return (
    <main style={styles.shell}>
      <section style={styles.header}>
        <p style={styles.kicker}>Xtramys ABP</p>
        <h1 style={styles.title}>{setPiece.nombre}</h1>
        {setPiece.descripcion ? <p style={styles.desc}>{setPiece.descripcion}</p> : null}
      </section>

      <section style={styles.boardCard}>
        {image ? <img src={image} alt={setPiece.nombre} style={styles.board} /> : <p style={styles.muted}>Sin grafico</p>}
      </section>

      {videos.length > 0 && (
        <section style={styles.videos}>
          {videos.map((video) => (
            <article key={video._id} style={styles.videoCard}>
              <div>
                <strong>{video.nombre}</strong>
                {video.descripcion ? <p style={styles.videoDesc}>{video.descripcion}</p> : null}
              </div>
              {video.url ? <video src={video.url} controls style={styles.video} /> : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

const styles = {
  shell: {
    minHeight: '100vh',
    padding: '32px',
    background: '#f6f8fb',
    color: '#101828',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: { maxWidth: 1180, margin: '0 auto 18px' },
  kicker: { margin: 0, color: '#2563eb', fontWeight: 800, letterSpacing: 0 },
  title: { margin: '4px 0', fontSize: 34, lineHeight: 1.1 },
  desc: { margin: 0, maxWidth: 780, color: '#475467', fontSize: 16 },
  boardCard: {
    maxWidth: 1180,
    margin: '0 auto',
    borderRadius: 10,
    border: '1px solid #d0d5dd',
    background: '#fff',
    padding: 16,
    boxShadow: '0 12px 36px rgba(16,24,40,0.08)',
  },
  board: { width: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block' },
  muted: { color: '#667085', fontWeight: 700 },
  error: { color: '#b42318', fontWeight: 800 },
  videos: { maxWidth: 1180, margin: '18px auto 0', display: 'grid', gap: 14 },
  videoCard: { border: '1px solid #d0d5dd', borderRadius: 10, background: '#fff', padding: 14 },
  videoDesc: { color: '#667085', margin: '4px 0 10px' },
  video: { width: '100%', maxHeight: 420, borderRadius: 8, background: '#000' },
};
