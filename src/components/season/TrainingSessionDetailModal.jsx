import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MdSchedule, MdGroup, MdEdit, MdDelete, MdFitnessCenter, MdNote,
  MdMonitorHeart, MdFavorite, MdClose, MdZoomIn,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';

const HeroCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.success}, ${({ theme }) => theme.mode === 'dark' ? theme.colors.successSoftText : '#059669'});
  color: ${({ theme }) => theme.mode === 'dark' ? theme.colors.text : '#ffffff'};
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: 16px;
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const HeroTitle = styled.div`
  font-size: 22px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeroSub = styled.div`
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.9;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TONE_BG = {
  info: 'infoSoft', success: 'successSoft', warning: 'warningSoft',
  error: 'errorSoft', purple: 'purpleSoft', primary: 'primarySoft',
};
const TONE_FG = {
  info: 'infoSoftText', success: 'successSoftText', warning: 'warningSoftText',
  error: 'errorSoftText', purple: 'purpleSoftText', primary: 'primarySoftText',
};
const TONE_SOLID = {
  info: 'info', success: 'success', warning: 'warning', error: 'error', purple: 'purple', primary: 'primary',
};

const StatIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${({ $tone, theme }) => theme.colors[TONE_BG[$tone] || 'primarySoft']};
  color: ${({ $tone, theme }) => theme.colors[TONE_FG[$tone] || 'primarySoftText']};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const Section = styled.div`
  margin-bottom: 14px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
`;

const ExerciseItem = styled.div`
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: 0; }

  @media (max-width: 560px) {
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 10px;
  }
`;

const ExerciseThumbButton = styled.button`
  position: relative;
  width: 112px;
  height: 74px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  overflow: hidden;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.sm};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #16743a;
  }

  &:hover span,
  &:focus-visible span {
    opacity: 1;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  @media (max-width: 560px) {
    width: 92px;
    height: 62px;
  }
`;

const ExerciseThumbEmpty = styled.div`
  width: 112px;
  height: 74px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.textMuted};

  @media (max-width: 560px) {
    width: 92px;
    height: 62px;
  }
`;

const ThumbOverlay = styled.span`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.38);
  opacity: 0;
  transition: opacity 140ms ease;
`;

const ExerciseInfo = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
`;

const normalizeTextValue = (value) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.observacion || item.text || JSON.stringify(item);
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (value && typeof value === 'object') {
    return value.observacion || value.text || JSON.stringify(value);
  }
  return '';
};

const ExName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const ExMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const PlayerChip = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $tone, theme }) => theme.colors[TONE_BG[$tone] || 'primarySoft']};
  color: ${({ $tone, theme }) => theme.colors[TONE_FG[$tone] || 'primarySoftText']};
  margin: 2px;
`;

const AttendanceLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${({ $tone, theme }) => theme.colors[TONE_SOLID[$tone] || 'text']};
`;

const Notes = styled.div`
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};
`;

const ZoomOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal + 2};
  background: rgba(2, 6, 23, 0.92);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 18px;

  @media (max-width: 640px) {
    padding: 12px;
  }
`;

const ZoomHeader = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: #ffffff;
  padding: 0 0 14px;
`;

const ZoomTitle = styled.div`
  min-width: 0;
  font-size: 16px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ZoomClose = styled.button`
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: 0 0 auto;

  &:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
`;

const ZoomStage = styled.div`
  min-height: 0;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y pinch-zoom;
`;

const ZoomImage = styled.img`
  display: block;
  max-width: min(1180px, 100%);
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  background: #16743a;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);

  @media (max-width: 760px) {
    max-width: 100%;
    max-height: calc(100dvh - 92px);
  }
`;

function getPlayerName(players, ref) {
  if (!ref) return '—';
  const id = typeof ref === 'string' ? ref : ref?._id;
  const p = players.find((x) => x._id === id);
  if (p) return [p.nombre, p.apellidos].filter(Boolean).join(' ') || '—';
  return ref?.nombre || '—';
}

function formatDateOnly(iso, locale) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function TrainingSessionDetailModal({
  open,
  onClose,
  session,
  onEdit,
  onDelete,
  onOpenWellness,
  onOpenPreWellness,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  const players = useSelector((s) => s.player?.players ?? []);
  const exercises = useSelector((s) => s.exercise?.exercises ?? []);
  const [zoomImage, setZoomImage] = useState(null);

  const data = session;

  const linkedExercises = useMemo(() => {
    if (!data?.ejercicios?.length) return [];
    return data.ejercicios.map((ref) => {
      const id = typeof ref === 'string' ? ref : ref?._id;
      const found = exercises.find((e) => e._id === id);
      return found || (typeof ref === 'object' ? ref : { _id: id, nombre: '—' });
    });
  }, [data?.ejercicios, exercises]);

  useEffect(() => {
    if (!zoomImage) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setZoomImage(null);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [zoomImage]);

  if (!data) return null;

  const asistentes = data.asistentes || data.jugadoresAsistencia || [];
  const ausentes = data.ausentes || [];
  const justificados = data.justificados || [];
  const lesionados = data.lesionados || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('session.detail', 'Detalle del entrenamiento')}
      width={760}
      footer={
        <Row style={{ justifyContent: 'space-between', width: '100%' }}>
          <Button type="button" $variant="danger" onClick={() => onDelete?.(data)}>
            <MdDelete /> {t('edition.delete', 'Eliminar')}
          </Button>
          <Row style={{ gap: 8 }}>
            <Button type="button" $variant="ghost" onClick={onClose}>
              {t('common.close', 'Cerrar')}
            </Button>
            <Button type="button" onClick={() => onEdit?.(data)}>
              <MdEdit /> {t('edition.edit', 'Editar')}
            </Button>
          </Row>
        </Row>
      }
    >
      <HeroCard>
        <HeroTitle>
          <MdFitnessCenter /> {t('season.training', 'Entrenamiento')}
        </HeroTitle>
        <HeroSub>{formatDateOnly(data.fecha, locale)}</HeroSub>
      </HeroCard>

      <StatsGrid>
        <StatCard>
          <StatIcon $tone="info"><MdSchedule /></StatIcon>
          <div>
            <StatLabel>{t('session.startTime', 'Inicio')}</StatLabel>
            <StatValue>{data.horaInicio || '—'}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $tone="warning"><MdSchedule /></StatIcon>
          <div>
            <StatLabel>{t('session.endTime', 'Fin')}</StatLabel>
            <StatValue>{data.horaFin || '—'}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $tone="success"><MdFitnessCenter /></StatIcon>
          <div>
            <StatLabel>{t('session.exercises', 'Ejercicios')}</StatLabel>
            <StatValue>{linkedExercises.length}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $tone="purple"><MdGroup /></StatIcon>
          <div>
            <StatLabel>{t('session.attendees', 'Asistentes')}</StatLabel>
            <StatValue>{asistentes.length}</StatValue>
          </div>
        </StatCard>
      </StatsGrid>

      <Stack $gap={12}>
        {/* Wellness / Pre-wellness shortcuts */}
        <Section>
          <SectionTitle>
            <MdMonitorHeart /> {t('session.wellnessSection', 'Wellness')}
          </SectionTitle>
          <Card>
            <Row $gap={8} $wrap>
              <Button
                type="button"
                $variant="secondary"
                onClick={() => onOpenPreWellness?.(data)}
              >
                <MdFavorite /> {t('preWellness.title', 'Pre-Wellness')}
              </Button>
              <Button
                type="button"
                $variant="secondary"
                onClick={() => onOpenWellness?.(data)}
              >
                <MdMonitorHeart /> {t('session.wellness', 'Wellness post')}
              </Button>
            </Row>
          </Card>
        </Section>

        {linkedExercises.length > 0 && (
          <Section>
            <SectionTitle>
              <MdFitnessCenter /> {t('session.exercises', 'Ejercicios')} ({linkedExercises.length})
            </SectionTitle>
            <Card>
              {linkedExercises.map((ex, i) => {
                const imageSrc = ex.imagen ? normalizeImageSource(ex.imagen) : '';
                const exerciseName = ex.nombre || ex.titulo || `#${i + 1}`;
                return (
                <ExerciseItem key={ex._id || i}>
                  {imageSrc ? (
                    <ExerciseThumbButton
                      type="button"
                      onClick={() => setZoomImage({ src: imageSrc, title: exerciseName })}
                      aria-label={t('common.open', 'Abrir')}
                    >
                      <img src={imageSrc} alt="" />
                      <ThumbOverlay>
                        <MdZoomIn size={24} />
                      </ThumbOverlay>
                    </ExerciseThumbButton>
                  ) : (
                    <ExerciseThumbEmpty>
                      <MdFitnessCenter size={22} />
                    </ExerciseThumbEmpty>
                  )}
                  <ExerciseInfo>
                  <ExName>{exerciseName}</ExName>
                  <ExMeta>
                    {ex.duracion ? <span>⏱ {ex.duracion} min</span> : null}
                    {ex.categoria ? <span>{ex.categoria}</span> : null}
                    {ex.objetivo ? <span>{ex.objetivo}</span> : null}
                  </ExMeta>
                  </ExerciseInfo>
                </ExerciseItem>
                );
              })}
            </Card>
          </Section>
        )}

        {(asistentes.length > 0 || ausentes.length > 0 || justificados.length > 0 || lesionados.length > 0) && (
          <Section>
            <SectionTitle>
              <MdGroup /> {t('session.attendance', 'Asistencia')}
            </SectionTitle>
            <Card>
              {asistentes.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <AttendanceLabel $tone="success">
                    ✓ {t('session.present', 'Presentes')} ({asistentes.length})
                  </AttendanceLabel>
                  {asistentes.map((p, i) => (
                    <PlayerChip key={i} $tone="success">
                      {getPlayerName(players, p)}
                    </PlayerChip>
                  ))}
                </div>
              )}
              {ausentes.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <AttendanceLabel $tone="error">
                    ✗ {t('session.absent', 'Ausentes')} ({ausentes.length})
                  </AttendanceLabel>
                  {ausentes.map((p, i) => (
                    <PlayerChip key={i} $tone="error">
                      {getPlayerName(players, p)}
                    </PlayerChip>
                  ))}
                </div>
              )}
              {justificados.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <AttendanceLabel $tone="warning">
                    ⚠ {t('session.justified', 'Justificados')} ({justificados.length})
                  </AttendanceLabel>
                  {justificados.map((p, i) => (
                    <PlayerChip key={i} $tone="warning">
                      {getPlayerName(players, p)}
                    </PlayerChip>
                  ))}
                </div>
              )}
              {lesionados.length > 0 && (
                <div>
                  <AttendanceLabel $tone="purple">
                    🏥 {t('session.injured', 'Lesionados')} ({lesionados.length})
                  </AttendanceLabel>
                  {lesionados.map((p, i) => (
                    <PlayerChip key={i} $tone="purple">
                      {getPlayerName(players, p)}
                    </PlayerChip>
                  ))}
                </div>
              )}
            </Card>
          </Section>
        )}

        {(data.observacionesGenerales || data.observaciones || data.notasGenerales) && (
          <Section>
            <SectionTitle>
              <MdNote /> {t('session.notes', 'Observaciones')}
            </SectionTitle>
            <Card>
              <Notes>
                {normalizeTextValue(data.observacionesGenerales ?? data.observaciones ?? data.notasGenerales)}
              </Notes>
            </Card>
          </Section>
        )}

        {linkedExercises.length === 0 && asistentes.length === 0 &&
         !data.observacionesGenerales && !data.observaciones && (
          <Muted style={{ textAlign: 'center', padding: 12 }}>
            {t('session.noDetails', 'Sin ejercicios ni asistencia registrados')}
          </Muted>
        )}
      </Stack>
      {zoomImage ? (
        <ZoomOverlay
          role="dialog"
          aria-modal="true"
          aria-label={zoomImage.title}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setZoomImage(null);
          }}
        >
          <ZoomHeader>
            <ZoomTitle>{zoomImage.title}</ZoomTitle>
            <ZoomClose type="button" onClick={() => setZoomImage(null)} aria-label={t('common.close', 'Cerrar')}>
              <MdClose size={24} />
            </ZoomClose>
          </ZoomHeader>
          <ZoomStage>
            <ZoomImage src={zoomImage.src} alt={zoomImage.title} />
          </ZoomStage>
        </ZoomOverlay>
      ) : null}
    </Modal>
  );
}
