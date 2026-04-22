import { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MdSchedule, MdGroup, MdEdit, MdDelete, MdFitnessCenter, MdNote,
  MdMonitorHeart, MdFavorite,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';

const HeroCard = styled.div`
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: 16px;
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

const StatIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg || '#dbeafe'};
  color: ${({ $color }) => $color || '#3b82f6'};
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: 0; }
`;

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
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  margin: 2px;
`;

const Notes = styled.div`
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};
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

  const data = session;

  const linkedExercises = useMemo(() => {
    if (!data?.ejercicios?.length) return [];
    return data.ejercicios.map((ref) => {
      const id = typeof ref === 'string' ? ref : ref?._id;
      const found = exercises.find((e) => e._id === id);
      return found || (typeof ref === 'object' ? ref : { _id: id, nombre: '—' });
    });
  }, [data?.ejercicios, exercises]);

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
          <StatIcon $bg="#dbeafe" $color="#3b82f6"><MdSchedule /></StatIcon>
          <div>
            <StatLabel>{t('session.startTime', 'Inicio')}</StatLabel>
            <StatValue>{data.horaInicio || '—'}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $bg="#fef3c7" $color="#d97706"><MdSchedule /></StatIcon>
          <div>
            <StatLabel>{t('session.endTime', 'Fin')}</StatLabel>
            <StatValue>{data.horaFin || '—'}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $bg="#dcfce7" $color="#16a34a"><MdFitnessCenter /></StatIcon>
          <div>
            <StatLabel>{t('session.exercises', 'Ejercicios')}</StatLabel>
            <StatValue>{linkedExercises.length}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $bg="#f3e8ff" $color="#8b5cf6"><MdGroup /></StatIcon>
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
              {linkedExercises.map((ex, i) => (
                <ExerciseItem key={ex._id || i}>
                  <ExName>{ex.nombre || ex.titulo || `#${i + 1}`}</ExName>
                  <ExMeta>
                    {ex.duracion ? <span>⏱ {ex.duracion} min</span> : null}
                    {ex.categoria ? <span>{ex.categoria}</span> : null}
                    {ex.objetivo ? <span>{ex.objetivo}</span> : null}
                  </ExMeta>
                </ExerciseItem>
              ))}
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
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#16a34a' }}>
                    ✓ {t('session.present', 'Presentes')} ({asistentes.length})
                  </div>
                  {asistentes.map((p, i) => (
                    <PlayerChip key={i} $bg="#dcfce7" $color="#16a34a">
                      {getPlayerName(players, p)}
                    </PlayerChip>
                  ))}
                </div>
              )}
              {ausentes.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#dc2626' }}>
                    ✗ {t('session.absent', 'Ausentes')} ({ausentes.length})
                  </div>
                  {ausentes.map((p, i) => (
                    <PlayerChip key={i} $bg="#fee2e2" $color="#dc2626">
                      {getPlayerName(players, p)}
                    </PlayerChip>
                  ))}
                </div>
              )}
              {justificados.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#d97706' }}>
                    ⚠ {t('session.justified', 'Justificados')} ({justificados.length})
                  </div>
                  {justificados.map((p, i) => (
                    <PlayerChip key={i} $bg="#fef3c7" $color="#d97706">
                      {getPlayerName(players, p)}
                    </PlayerChip>
                  ))}
                </div>
              )}
              {lesionados.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#8b5cf6' }}>
                    🏥 {t('session.injured', 'Lesionados')} ({lesionados.length})
                  </div>
                  {lesionados.map((p, i) => (
                    <PlayerChip key={i} $bg="#f3e8ff" $color="#8b5cf6">
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
                {data.observacionesGenerales || data.observaciones || data.notasGenerales}
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
    </Modal>
  );
}
