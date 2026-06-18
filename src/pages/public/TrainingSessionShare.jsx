import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicTrainingSession } from '@/utils/api';
import {
  STRENGTH_EXERCISES,
  getSectionForExercise,
  getStrengthExerciseImage,
  getStrengthExerciseImageUrl,
  getStrengthExerciseVideoUrl,
} from '@/data/strengthExercises';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';

const getId = (value) => String(value?._id || value?.id || value || '');
const clean = (value) => String(value || '').trim();
const time = (value) => (value ? String(value).slice(0, 5) : '--:--');

function assetUrl(value, apiBase = '') {
  if (!value) return '';
  const raw = typeof value === 'object'
    ? value.uri || value.default || value.src || value.url || value.path || value.imagen
    : value;
  const src = normalizeImageSource(raw);
  if (!src || typeof src !== 'string') return '';
  if (src.startsWith('/assets/') || src.startsWith('/cdn/')) return src;
  if (src.startsWith('/') && apiBase) return `${apiBase}${src}`;
  return src;
}

function videoUrl(video) {
  return video?.url || video?.videoUrl || video?.streamUrl || video?.signedUrl || video?.sourceUrl || '';
}

async function resolveVideoSrc(src) {
  if (!src) throw new Error('No hay URL de video disponible.');
  const response = await fetch(src, { method: 'GET', redirect: 'follow' });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `No se pudo cargar el video (${response.status}).`);
  }
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('video/')) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'El servidor no devolvio un archivo de video.');
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error('El video esta vacio.');
  return URL.createObjectURL(blob);
}

function playerName(player) {
  return getPlayerFullName(player) || player?.nombre || player?.name || getId(player);
}

function parseObservations(session) {
  const byExercise = {};
  const general = [];
  const addGeneral = (value) => {
    if (clean(value)) general.push(clean(value));
  };
  const addItem = (item) => {
    if (!item) return;
    if (typeof item === 'string') return addGeneral(item);
    const text = clean(item.observacion || item.observaciones || item.text || item.note || item.value);
    const id = getId(item.ejercicioId || item.ejercicio || item.exerciseId || item.exercise);
    if (id && text) byExercise[id] = text;
    else addGeneral(text);
  };

  addGeneral(session?.observacionesGenerales);
  addGeneral(session?.notasGenerales);
  addGeneral(session?.notas);

  const raw = session?.observaciones;
  if (typeof raw === 'string') addGeneral(raw);
  else if (Array.isArray(raw)) raw.forEach(addItem);
  else if (raw && typeof raw === 'object') {
    addGeneral(raw.general || raw.generales || raw.observacionesGenerales || raw.notes || raw.notas || raw.text);
    const grouped = raw.porEjercicio || raw.ejercicios || raw.byExercise || raw.items;
    if (Array.isArray(grouped)) grouped.forEach(addItem);
    else addItem(raw);
  }

  return { general: general.join('\n'), byExercise };
}

function formatDate(value) {
  if (!value) return 'Fecha pendiente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha pendiente';
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TrainingSessionShare() {
  const { token } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [media, setMedia] = useState(null);

  useEffect(() => {
    let mounted = true;
    getPublicTrainingSession(token)
      .then((res) => { if (mounted) setData(res); })
      .catch(() => { if (mounted) setError('No se pudo cargar el entrenamiento'); });
    return () => { mounted = false; };
  }, [token]);

  const session = data?.session;
  const players = data?.players || [];
  const apiBase = data?.apiBase || '';
  const observations = useMemo(() => parseObservations(session), [session]);
  const playerById = useMemo(() => new Map(players.map((p) => [getId(p), playerName(p)])), [players]);

  const regularPlayers = useMemo(() => {
    const ids = new Set((session?.jugadores || []).map(getId));
    return players.filter((p) => ids.has(getId(p)));
  }, [players, session]);

  const extraPlayers = useMemo(() => {
    const ids = new Set((session?.jugadoresExtras || []).map(getId));
    return players.filter((p) => ids.has(getId(p)));
  }, [players, session]);

  const exercises = useMemo(() => {
    if (!data) return [];
    const byId = new Map((data.exercises || []).map((exercise) => [getId(exercise), exercise]));
    const detail = data.session?.ejerciciosDetalle || [];
    const orderedIds = detail.map((d) => getId(d.ejercicio)).filter(Boolean);
    const ids = orderedIds.length ? orderedIds : (data.session?.ejercicios || []).map(getId);

    return ids
      .map((id, index) => {
        const exercise = byId.get(id);
        if (!exercise) return null;
        const itemDetail = detail.find((d) => getId(d.ejercicio) === id) || { orden: index + 1 };
        const videos = data.videosByExercise?.[id] || [];
        return { ...exercise, detail: itemDetail, publicVideos: videos };
      })
      .filter(Boolean)
      .sort((a, b) => (a.detail?.orden || 0) - (b.detail?.orden || 0));
  }, [data]);

  const strengthExercises = useMemo(() => {
    const items = session?.ejerciciosFuerza || [];
    return items
      .map((item, index) => {
        const base = STRENGTH_EXERCISES.find((exercise) => exercise.id === item.id);
        return base ? { ...base, ...item, orden: item.orden ?? index + 1 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [session]);

  if (error) {
    return <Shell><StateCard title="Enlace no disponible" text={error} /></Shell>;
  }
  if (!data) {
    return <Shell><StateCard title="Cargando entrenamiento" text="Preparando la sesion compartida..." /></Shell>;
  }

  const totalPlayers = regularPlayers.length + extraPlayers.length;
  const date = formatDate(session?.fecha);
  const start = time(session?.horaInicio);
  const end = time(session?.horaFin);
  const teamName = data.team?.nombre || 'Equipo';
  const teamBadge = assetUrl(data.team?.escudo, apiBase);

  return (
    <Shell>
      <section className="hero" aria-label="Resumen del entrenamiento">
        <div className="heroGlow" />
        <div className="heroTop">
          <div className="badgeBox">
            {teamBadge ? <SafeImage src={teamBadge} alt={teamName} /> : <span>{teamName.slice(0, 2).toUpperCase()}</span>}
          </div>
          <div>
            <p className="eyebrow">Sesion compartida</p>
            <h1>{teamName}</h1>
            <p className="heroDate">{date}</p>
          </div>
        </div>
        <div className="heroStats">
          <Metric label="Horario" value={`${start} - ${end}`} />
          <Metric label="Campo" value={exercises.length} />
          <Metric label="Fuerza" value={strengthExercises.length} />
          <Metric label="Jugadores" value={totalPlayers} />
        </div>
      </section>

      <section className="layout">
        <aside className="sideStack">
          <Panel title={`Jugadores (${totalPlayers})`}>
            <PlayerGroup title="Plantilla" players={regularPlayers} />
            {extraPlayers.length > 0 && <PlayerGroup title="Extras" players={extraPlayers} tone="warm" />}
          </Panel>
          <Panel title="Observaciones">
            {observations.general ? <p className="pre">{observations.general}</p> : <p className="muted">Sin observaciones generales.</p>}
          </Panel>
        </aside>

        <main className="mainStack">
          <SectionHeader
            kicker="Bloque principal"
            title="Ejercicios de campo"
            text="Pulsa un grafico para abrir su video. Si no tiene video, se abre la imagen ampliada."
          />

          {exercises.length ? (
            <div className="exerciseList">
              {exercises.map((exercise, index) => (
                <ExerciseCard
                  key={getId(exercise)}
                  exercise={exercise}
                  index={index}
                  isLast={index === exercises.length - 1}
                  observations={observations}
                  playerById={playerById}
                  apiBase={apiBase}
                  onMedia={setMedia}
                />
              ))}
            </div>
          ) : (
            <EmptyBlock text="No hay ejercicios de campo en esta sesion." />
          )}

          <SectionHeader
            kicker="Gimnasio y prevencion"
            title="Ejercicios de fuerza"
            text="Imagenes optimizadas y video accesible desde cada tarjeta."
          />

          {strengthExercises.length ? (
            <div className="strengthGrid">
              {strengthExercises.map((exercise) => (
                <StrengthCard key={`${exercise.id}-${exercise.orden}`} exercise={exercise} t={t} onMedia={setMedia} />
              ))}
            </div>
          ) : (
            <EmptyBlock text="No hay ejercicios de fuerza en esta sesion." />
          )}
        </main>
      </section>

      {media && <MediaModal media={media} onClose={() => setMedia(null)} />}
    </Shell>
  );
}

function ExerciseCard({ exercise, index, isLast, observations, playerById, apiBase, onMedia }) {
  const id = getId(exercise);
  const detail = exercise.detail || {};
  const videos = exercise.publicVideos || [];
  const primaryVideo = videos.find((video) => videoUrl(video)) || null;
  const img = assetUrl(exercise.imagen, apiBase);
  const poster = assetUrl(primaryVideo?.thumbnailUrl || primaryVideo?.thumbnail, apiBase);
  const media = primaryVideo
    ? { type: 'video', title: primaryVideo.nombre || exercise.nombre, src: videoUrl(primaryVideo), poster }
    : img
      ? { type: 'image', title: exercise.nombre, src: img }
      : null;
  const note = detail.observacion || observations.byExercise[id];
  const pills = [
    exercise.numeroJugadores && `${exercise.numeroJugadores} jugadores`,
    exercise.equipos && `${exercise.equipos} equipos`,
    exercise.dimensiones,
    exercise.tiempo && `${exercise.tiempo} min`,
    !isLast && detail.tiempoDescanso > 0 && `Descanso ${detail.tiempoDescanso} min`,
  ].filter(Boolean);

  return (
    <article className="exerciseCard">
      <button
        type="button"
        className="exerciseMedia"
        onClick={() => media && onMedia(media)}
        disabled={!media}
        aria-label={primaryVideo ? `Ver video de ${exercise.nombre}` : `Ampliar grafico de ${exercise.nombre}`}
      >
        {img ? <SafeImage src={img} alt={exercise.nombre || 'Grafico del ejercicio'} /> : <span className="emptyMedia">Sin imagen</span>}
        <span className={primaryVideo ? 'mediaBadge video' : 'mediaBadge'}>{primaryVideo ? 'Ver video' : 'Ampliar'}</span>
      </button>

      <div className="exerciseBody">
        <div className="exerciseHead">
          <span className="number">{detail.orden || index + 1}</span>
          <div>
            <h3>{exercise.nombre || 'Ejercicio sin nombre'}</h3>
            {pills.length > 0 && <div className="pills">{pills.map((pill) => <span key={pill}>{pill}</span>)}</div>}
          </div>
        </div>

        <InfoGrid items={[
          ['Objetivo', exercise.objetivo],
          ['Descripcion', exercise.descripcion],
          ['Observacion', note],
        ]} />

        <TeamAssignments teams={detail.teamAssignments || []} playerById={playerById} />

        {primaryVideo && (
          <button className="watchBtn" type="button" onClick={() => onMedia(media)}>
            Reproducir video
          </button>
        )}
      </div>
    </article>
  );
}

function StrengthCard({ exercise, t, onMedia }) {
  const section = getSectionForExercise(exercise.id);
  const localImage = getStrengthExerciseImage(exercise);
  const fallbackImage = getStrengthExerciseImageUrl(exercise);
  const img = assetUrl(localImage || fallbackImage);
  const video = getStrengthExerciseVideoUrl(exercise);
  const name = t(exercise.i18nKey, exercise.name || exercise.id);
  const sectionName = section?.section?.i18nKey ? t(section.section.i18nKey, section.section.id) : exercise.section;
  const categoryName = section?.category?.i18nKey ? t(section.category.i18nKey, section.category.id) : '';

  return (
    <article className="strengthCard">
      <button
        type="button"
        className="strengthMedia"
        onClick={() => onMedia({ type: 'video', title: name, src: video, poster: img })}
        aria-label={`Ver video de ${name}`}
      >
        {img ? <SafeImage src={img} alt={name} /> : <span className="emptyMedia">Sin imagen</span>}
        <span className="mediaBadge video">Video</span>
      </button>
      <div className="strengthBody">
        <p className="eyebrow">{categoryName}</p>
        <h3>{exercise.orden}. {name}</h3>
        <div className="pills">
          <span>{sectionName}</span>
          <span>Nivel {exercise.level}</span>
          {exercise.tiempoDescanso > 0 && <span>Descanso {exercise.tiempoDescanso} min</span>}
        </div>
        {exercise.observacion && <p className="strengthNote">{exercise.observacion}</p>}
      </div>
    </article>
  );
}

function InfoGrid({ items }) {
  const rows = items.filter(([, value]) => clean(value));
  if (!rows.length) return null;
  return (
    <div className="infoGrid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <b>{label}</b>
          <p>{value}</p>
        </div>
      ))}
    </div>
  );
}

function TeamAssignments({ teams, playerById }) {
  const rows = (teams || []).filter((team) => (team.players?.length || team.extraPlayers?.length));
  if (!rows.length) return null;
  return (
    <div className="teamsBox">
      <h4>Equipos asignados</h4>
      <div className="teamGrid">
        {rows.map((team, i) => {
          const names = [...(team.players || []), ...(team.extraPlayers || [])]
            .map((id) => playerById.get(getId(id)) || `Jugador ${String(getId(id)).slice(-4)}`)
            .filter(Boolean);
          return (
            <div className="teamCard" key={`${team.teamNumber || i}-${names.join('-')}`}>
              <strong>Equipo {team.teamNumber || i + 1}</strong>
              <p>{names.join(', ')}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function PlayerGroup({ title, players, tone = 'default' }) {
  return (
    <div className="playerGroup">
      <h3>{title}</h3>
      {players.length ? (
        <div className="players">
          {players.map((player) => (
            <span className={tone} key={getId(player)}>
              {player.dorsal != null && <b>{player.dorsal}</b>}
              {playerName(player)}
            </span>
          ))}
        </div>
      ) : (
        <p className="muted">Sin jugadores.</p>
      )}
    </div>
  );
}

function SectionHeader({ kicker, title, text }) {
  return (
    <header className="sectionTitle">
      <p>{kicker}</p>
      <h2>{title}</h2>
      <span>{text}</span>
    </header>
  );
}

function Metric({ value, label }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyBlock({ text }) {
  return <div className="emptyBlock">{text}</div>;
}

function StateCard({ title, text }) {
  return (
    <div className="stateCard">
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

function MediaModal({ media, onClose }) {
  const [failed, setFailed] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(media.type === 'video' ? '' : media.src);
  const [loading, setLoading] = useState(media.type === 'video');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (media.type !== 'video') return undefined;
    let mounted = true;
    let objectUrl = '';

    setLoading(true);
    setFailed(false);
    setMessage('');

    resolveVideoSrc(media.src)
      .then((url) => {
        objectUrl = url;
        if (mounted) setResolvedSrc(url);
      })
      .catch((error) => {
        if (mounted) {
          setFailed(true);
          setMessage(error?.message || 'No se pudo reproducir el video.');
        }
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.src, media.type]);

  return (
    <div className="mediaModal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="mediaBox" onClick={(e) => e.stopPropagation()}>
        <button className="close" type="button" onClick={onClose} aria-label="Cerrar">x</button>
        <h3>{media.title}</h3>
        {media.type === 'video' ? (
          <>
            {loading ? (
              <div className="videoError"><p>Preparando video...</p></div>
            ) : !failed ? (
              <video
                src={resolvedSrc}
                poster={media.poster}
                controls
                playsInline
                autoPlay
                preload="metadata"
                onError={() => setFailed(true)}
              />
            ) : (
              <div className="videoError">
                <p>{message || 'No se pudo reproducir el video en el navegador.'}</p>
                <a href={media.src} target="_blank" rel="noreferrer">Abrir video</a>
              </div>
            )}
          </>
        ) : (
          <SafeImage src={media.src} alt={media.title || ''} />
        )}
      </div>
    </div>
  );
}

function SafeImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="emptyMedia">Sin imagen</span>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function Shell({ children }) {
  return <main className="sharePage"><style>{css}</style>{children}</main>;
}

const css = `
  :root { color-scheme: light dark; }
  .sharePage {
    min-height: 100dvh;
    padding: clamp(16px, 3vw, 40px);
    color: #172033;
    background:
      radial-gradient(circle at top left, rgba(32, 116, 229, .24), transparent 34rem),
      radial-gradient(circle at 90% 8%, rgba(20, 184, 166, .18), transparent 28rem),
      linear-gradient(135deg, #f8fbff 0%, #eef4fb 46%, #f8fafc 100%);
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .hero, .layout { width: min(1360px, 100%); margin: 0 auto; }
  .hero {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.52);
    border-radius: 34px;
    padding: clamp(22px, 4vw, 44px);
    color: #fff;
    background: linear-gradient(135deg, #0f2f64 0%, #1458c8 52%, #07a695 100%);
    box-shadow: 0 26px 70px rgba(15, 47, 100, .25);
  }
  .heroGlow { position: absolute; inset: auto -10% -45% 35%; height: 320px; background: rgba(255,255,255,.18); filter: blur(50px); transform: rotate(-10deg); }
  .heroTop, .heroStats, .exerciseHead, .pills, .players, .teamGrid { position: relative; display: flex; gap: 14px; }
  .heroTop { align-items: center; }
  .badgeBox {
    width: clamp(68px, 10vw, 112px);
    height: clamp(68px, 10vw, 112px);
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 28px;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.35);
    font-weight: 900;
    font-size: 28px;
  }
  .badgeBox img { width: 100%; height: 100%; object-fit: cover; }
  .eyebrow, .sectionTitle p { margin: 0; text-transform: uppercase; letter-spacing: .14em; font-size: 12px; font-weight: 900; color: #24b8a8; }
  .hero .eyebrow { color: #c7f9f1; }
  .hero h1 { margin: 4px 0; font-size: clamp(34px, 7vw, 76px); line-height: .95; letter-spacing: -.05em; }
  .heroDate { margin: 0; color: #dbeafe; font-weight: 700; text-transform: capitalize; }
  .heroStats { margin-top: clamp(22px, 4vw, 38px); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .metric {
    padding: 16px;
    border-radius: 22px;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.26);
    backdrop-filter: blur(10px);
  }
  .metric strong { display: block; font-size: clamp(20px, 3vw, 32px); letter-spacing: -.03em; }
  .metric span { color: #dbeafe; font-size: 12px; font-weight: 800; text-transform: uppercase; }
  .layout { display: grid; grid-template-columns: minmax(280px, 360px) 1fr; align-items: start; gap: clamp(16px, 3vw, 28px); margin-top: 28px; }
  .sideStack, .mainStack { display: grid; gap: 18px; }
  .panel, .exerciseCard, .strengthCard, .emptyBlock, .stateCard {
    border: 1px solid rgba(148, 163, 184, .28);
    border-radius: 28px;
    background: rgba(255,255,255,.78);
    box-shadow: 0 20px 50px rgba(15, 23, 42, .08);
    backdrop-filter: blur(14px);
  }
  .panel { padding: 20px; }
  .panel h2, .sectionTitle h2 { margin: 0; color: #102449; letter-spacing: -.03em; }
  .panel h2 { font-size: 18px; }
  .playerGroup { margin-top: 16px; }
  .playerGroup:first-of-type { margin-top: 0; }
  .playerGroup h3 { margin: 0 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .players, .pills { flex-wrap: wrap; }
  .players span, .pills span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border-radius: 999px;
    background: #eef5ff;
    color: #194987;
    font-size: 12px;
    font-weight: 800;
  }
  .players span.warm { background: #fff7ed; color: #a8550d; }
  .players b { min-width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: currentColor; color: #fff; font-size: 11px; }
  .muted { color: #64748b; }
  .pre { margin: 0; white-space: pre-wrap; line-height: 1.6; color: #334155; }
  .sectionTitle {
    display: grid;
    gap: 4px;
    margin-top: 8px;
  }
  .sectionTitle h2 { font-size: clamp(26px, 4vw, 42px); }
  .sectionTitle span { color: #64748b; line-height: 1.5; }
  .exerciseList { display: grid; gap: 18px; }
  .exerciseCard { display: grid; grid-template-columns: minmax(300px, 44%) 1fr; overflow: hidden; }
  .exerciseMedia, .strengthMedia {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 270px;
    padding: 16px;
    border: 0;
    border-right: 1px solid rgba(148, 163, 184, .24);
    background: linear-gradient(135deg, #eaf2ff, #f8fbff);
    cursor: pointer;
  }
  .exerciseMedia:disabled { cursor: default; }
  .exerciseMedia img, .strengthMedia img { width: 100%; height: 100%; max-height: 420px; object-fit: contain; }
  .emptyMedia { color: #94a3b8; font-weight: 900; text-transform: uppercase; }
  .mediaBadge {
    position: absolute;
    left: 16px;
    bottom: 16px;
    padding: 9px 12px;
    border-radius: 999px;
    background: #102449;
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    box-shadow: 0 10px 22px rgba(15, 23, 42, .22);
  }
  .mediaBadge.video { background: #0f766e; }
  .exerciseBody { padding: clamp(18px, 3vw, 28px); }
  .exerciseHead { align-items: flex-start; margin-bottom: 18px; }
  .number {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 16px;
    color: #fff;
    background: #1458c8;
    font-weight: 950;
  }
  .exerciseHead h3 { margin: 0 0 10px; color: #102449; font-size: clamp(20px, 3vw, 30px); line-height: 1.1; letter-spacing: -.03em; }
  .infoGrid { display: grid; gap: 12px; }
  .infoGrid b, .teamsBox h4 {
    display: block;
    margin: 0 0 5px;
    color: #0f766e;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .08em;
  }
  .infoGrid p, .teamCard p { margin: 0; color: #334155; line-height: 1.55; }
  .teamsBox { margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(148, 163, 184, .28); }
  .teamGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin-top: 10px; }
  .teamCard { padding: 12px; border-radius: 18px; background: #f8fafc; border: 1px solid rgba(148, 163, 184, .28); }
  .teamCard strong { display: block; margin-bottom: 4px; color: #1458c8; }
  .watchBtn {
    margin-top: 18px;
    padding: 12px 16px;
    border: 0;
    border-radius: 999px;
    background: #0f766e;
    color: #fff;
    font-weight: 900;
    cursor: pointer;
  }
  .strengthGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
  .strengthCard { overflow: hidden; }
  .strengthMedia { min-height: 210px; border-right: 0; border-bottom: 1px solid rgba(148, 163, 184, .24); }
  .strengthBody { padding: 18px; }
  .strengthBody h3 { min-height: 58px; margin: 5px 0 12px; color: #102449; font-size: 18px; line-height: 1.2; letter-spacing: -.02em; }
  .strengthNote { margin: 12px 0 0; color: #334155; line-height: 1.45; }
  .emptyBlock, .stateCard { padding: 28px; color: #64748b; text-align: center; }
  .stateCard { width: min(560px, 100%); margin: 20vh auto 0; }
  .stateCard h1 { margin: 0 0 8px; color: #102449; }
  .mediaModal {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: grid;
    place-items: center;
    padding: 18px;
    background: rgba(2, 6, 23, .88);
  }
  .mediaBox {
    position: relative;
    width: min(1120px, 96vw);
    max-height: 94dvh;
    overflow: auto;
    padding: 18px;
    border-radius: 26px;
    background: #020617;
    color: #fff;
    box-shadow: 0 34px 90px rgba(0,0,0,.45);
  }
  .mediaBox h3 { margin: 0 54px 14px 0; font-size: clamp(18px, 3vw, 28px); }
  .mediaBox video, .mediaBox img { width: 100%; max-height: 80dvh; object-fit: contain; border-radius: 18px; background: #000; }
  .close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 999px;
    background: #fff;
    color: #020617;
    font-size: 20px;
    font-weight: 900;
    cursor: pointer;
  }
  .videoError {
    display: grid;
    place-items: center;
    gap: 12px;
    min-height: 300px;
    border-radius: 18px;
    background: #0f172a;
    text-align: center;
  }
  .videoError a { color: #67e8f9; font-weight: 900; }
  button:focus-visible, a:focus-visible { outline: 3px solid #67e8f9; outline-offset: 3px; }
  @media (max-width: 980px) {
    .layout, .exerciseCard { grid-template-columns: 1fr; }
    .sideStack { order: 2; }
    .exerciseMedia { border-right: 0; border-bottom: 1px solid rgba(148, 163, 184, .24); }
  }
  @media (max-width: 720px) {
    .sharePage { padding: 12px; }
    .hero { border-radius: 26px; }
    .heroTop { align-items: flex-start; }
    .heroStats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .metric { padding: 13px; }
    .panel, .exerciseCard, .strengthCard, .emptyBlock { border-radius: 22px; }
    .exerciseMedia { min-height: 220px; }
    .teamGrid, .strengthGrid { grid-template-columns: 1fr; }
  }
  @media (prefers-color-scheme: dark) {
    .sharePage {
      color: #e5e7eb;
      background:
        radial-gradient(circle at top left, rgba(32, 116, 229, .28), transparent 28rem),
        radial-gradient(circle at 90% 8%, rgba(20, 184, 166, .18), transparent 24rem),
        #020617;
    }
    .panel, .exerciseCard, .strengthCard, .emptyBlock, .stateCard { background: rgba(15, 23, 42, .82); border-color: rgba(148,163,184,.22); box-shadow: none; }
    .panel h2, .sectionTitle h2, .exerciseHead h3, .strengthBody h3, .stateCard h1 { color: #f8fafc; }
    .sectionTitle span, .muted { color: #94a3b8; }
    .pre, .infoGrid p, .teamCard p, .strengthNote { color: #cbd5e1; }
    .exerciseMedia, .strengthMedia { background: linear-gradient(135deg, #0f172a, #111827); }
    .players span, .pills span, .teamCard { background: rgba(30, 41, 59, .78); border-color: rgba(148,163,184,.2); }
  }
`;
