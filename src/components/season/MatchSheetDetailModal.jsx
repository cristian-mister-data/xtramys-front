import { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MdLocationOn, MdEmojiEvents, MdSchedule, MdEdit, MdDelete,
  MdSportsSoccer, MdGroup, MdNote, MdCircle,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';

const HeroCard = styled.div`
  background: ${({ $color }) => `linear-gradient(135deg, ${$color || '#1a237e'}, #3949ab)`};
  color: #fff;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: 16px;
`;

const HeroTitle = styled.div`
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ResultBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $bg }) => $bg};
  color: #fff;
  margin-left: 8px;
`;

const ScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 28px;
  font-weight: 800;
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

const EventItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: 0; }
`;

const Minute = styled.span`
  display: inline-block;
  min-width: 36px;
  padding: 2px 6px;
  border-radius: 6px;
  background: ${({ $bg }) => $bg || '#e5e7eb'};
  color: ${({ $color }) => $color || '#374151'};
  font-size: 12px;
  font-weight: 700;
  text-align: center;
`;

const PlayerName = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
`;

const Notes = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-wrap;
  line-height: 1.5;
`;

function getResultBadge(resultado, t) {
  switch (resultado) {
    case 'Victoria': return { bg: '#10b981', label: t('matchSheet.win', 'Victoria') };
    case 'Empate': return { bg: '#f59e0b', label: t('matchSheet.draw', 'Empate') };
    case 'Derrota': return { bg: '#ef4444', label: t('matchSheet.loss', 'Derrota') };
    default: return null;
  }
}

function translateLocation(loc, t) {
  switch (loc) {
    case 'local': return t('matchSheet.modals.home', 'Local');
    case 'visitante': return t('matchSheet.modals.away', 'Visitante');
    case 'neutral': return t('matchSheet.modals.neutral', 'Neutral');
    default: return loc || '—';
  }
}

function formatDate(iso, locale) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getPlayerName(players, id) {
  if (!id) return '—';
  const p = players.find((x) => x._id === id || x._id === id?._id);
  if (!p) return id?.nombre || '—';
  return [p.nombre, p.apellidos].filter(Boolean).join(' ') || '—';
}

export default function MatchSheetDetailModal({
  open,
  onClose,
  match,
  onEdit,
  onDelete,
}) {
  const { t, i18n } = useTranslation();
  const players = useSelector((s) => s.player?.players ?? []);
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';

  const data = useMemo(() => match || null, [match]);
  if (!data) return null;

  const tournamentColor = data?.torneoId?.color || '#1a237e';
  const result = getResultBadge(data?.resultado, t);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('matchSheet.title', 'Ficha de partido')}
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
      <HeroCard $color={tournamentColor}>
        <HeroTitle>
          <MdSportsSoccer /> vs {data.rival || '—'}
          {result && <ResultBadge $bg={result.bg}>{result.label}</ResultBadge>}
        </HeroTitle>
        {(data.golesPropios != null || data.golesRival != null) && (
          <ScoreRow>
            <span>{data.golesPropios ?? 0}</span>
            <span style={{ opacity: 0.7, fontSize: 18 }}>—</span>
            <span>{data.golesRival ?? 0}</span>
          </ScoreRow>
        )}
        <div style={{ marginTop: 10, opacity: 0.9, fontSize: 13 }}>
          {formatDate(data.fechaHora, locale)}
        </div>
      </HeroCard>

      <StatsGrid>
        <StatCard>
          <StatIcon $bg="#dbeafe" $color="#3b82f6"><MdLocationOn /></StatIcon>
          <div>
            <StatLabel>{t('matchSheet.fields.location', 'Ubicación')}</StatLabel>
            <StatValue>{translateLocation(data.ubicacion, t)}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $bg="#f3e8ff" $color="#8b5cf6"><MdSchedule /></StatIcon>
          <div>
            <StatLabel>{t('matchSheet.fields.dateTime', 'Fecha')}</StatLabel>
            <StatValue>
              {data.fechaHora ? new Date(data.fechaHora).toLocaleDateString(locale) : '—'}
            </StatValue>
          </div>
        </StatCard>
        {data.torneoId?.nombre ? (
          <StatCard>
            <StatIcon $bg={tournamentColor + '22'} $color={tournamentColor}>
              <MdEmojiEvents />
            </StatIcon>
            <div>
              <StatLabel>{t('matchSheet.fields.tournament', 'Torneo')}</StatLabel>
              <StatValue>{data.torneoId.nombre}</StatValue>
            </div>
          </StatCard>
        ) : data.competicion === 'amistoso' && (
          <StatCard>
            <StatIcon $bg="#fef3c7" $color="#d97706"><MdEmojiEvents /></StatIcon>
            <div>
              <StatLabel>{t('matchSheet.fields.tournament', 'Competición')}</StatLabel>
              <StatValue>{t('matchSheet.friendly', 'Amistoso')}</StatValue>
            </div>
          </StatCard>
        )}
        {Array.isArray(data.convocados) && data.convocados.length > 0 && (
          <StatCard>
            <StatIcon $bg="#dcfce7" $color="#16a34a"><MdGroup /></StatIcon>
            <div>
              <StatLabel>{t('matchSheet.fields.called', 'Convocados')}</StatLabel>
              <StatValue>{data.convocados.length}</StatValue>
            </div>
          </StatCard>
        )}
      </StatsGrid>

      <Stack $gap={12}>
        {Array.isArray(data.goles) && data.goles.length > 0 && (
          <Section>
            <SectionTitle>
              <MdSportsSoccer /> {t('matchSheet.fields.goals', 'Goles')} ({data.goles.length})
            </SectionTitle>
            <Card>
              {data.goles.map((g, i) => (
                <EventItem key={i}>
                  <Minute $bg="#dcfce7" $color="#16a34a">{g.minuto}&apos;</Minute>
                  <PlayerName>{getPlayerName(players, g.jugador)}</PlayerName>
                </EventItem>
              ))}
            </Card>
          </Section>
        )}

        {Array.isArray(data.golesRivalDetalle) && data.golesRivalDetalle.length > 0 && (
          <Section>
            <SectionTitle>
              <MdSportsSoccer /> {t('matchSheet.rivalGoals.title', 'Goles del rival')} ({data.golesRivalDetalle.length})
            </SectionTitle>
            <Card>
              {data.golesRivalDetalle.map((g, i) => (
                <EventItem key={i}>
                  <Minute $bg="#fee2e2" $color="#dc2626">{g.minuto}&apos;</Minute>
                  <PlayerName>{g.descripcion || t('matchSheet.rivalGoal', 'Gol del rival')}</PlayerName>
                </EventItem>
              ))}
            </Card>
          </Section>
        )}

        {Array.isArray(data.tarjetasAmarillas) && data.tarjetasAmarillas.length > 0 && (
          <Section>
            <SectionTitle>
              <MdCircle style={{ color: '#FFC107' }} />
              {t('matchSheet.fields.yellowCards', 'Tarjetas amarillas')} ({data.tarjetasAmarillas.length})
            </SectionTitle>
            <Card>
              {data.tarjetasAmarillas.map((c, i) => (
                <EventItem key={i}>
                  <Minute $bg="#fef3c7" $color="#d97706">{c.minuto}&apos;</Minute>
                  <PlayerName>{getPlayerName(players, c.jugador)}</PlayerName>
                </EventItem>
              ))}
            </Card>
          </Section>
        )}

        {Array.isArray(data.tarjetasRojas) && data.tarjetasRojas.length > 0 && (
          <Section>
            <SectionTitle>
              <MdCircle style={{ color: '#F44336' }} />
              {t('matchSheet.fields.redCards', 'Tarjetas rojas')} ({data.tarjetasRojas.length})
            </SectionTitle>
            <Card>
              {data.tarjetasRojas.map((c, i) => (
                <EventItem key={i}>
                  <Minute $bg="#fee2e2" $color="#dc2626">{c.minuto}&apos;</Minute>
                  <PlayerName>{getPlayerName(players, c.jugador)}</PlayerName>
                </EventItem>
              ))}
            </Card>
          </Section>
        )}

        {Array.isArray(data.cambios) && data.cambios.length > 0 && (
          <Section>
            <SectionTitle>
              {t('matchSheet.fields.changes', 'Cambios')} ({data.cambios.length})
            </SectionTitle>
            <Card>
              {data.cambios.map((c, i) => (
                <EventItem key={i}>
                  <Minute>{c.minuto}&apos;</Minute>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <PlayerName style={{ color: '#dc2626' }}>
                      ↓ {getPlayerName(players, c.sale)}
                    </PlayerName>
                    <PlayerName style={{ color: '#16a34a' }}>
                      ↑ {getPlayerName(players, c.entra)}
                    </PlayerName>
                  </div>
                </EventItem>
              ))}
            </Card>
          </Section>
        )}

        {data.notasEntrenador || data.observaciones ? (
          <Section>
            <SectionTitle>
              <MdNote /> {t('matchSheet.fields.coachNotes', 'Notas')}
            </SectionTitle>
            <Card>
              <Notes>{data.notasEntrenador || data.observaciones}</Notes>
            </Card>
          </Section>
        ) : null}

        {!data.goles?.length && !data.tarjetasAmarillas?.length &&
         !data.tarjetasRojas?.length && !data.cambios?.length &&
         !data.notasEntrenador && !data.observaciones ? (
          <Muted style={{ textAlign: 'center', padding: 12 }}>
            {t('matchSheet.noEvents', 'Sin eventos registrados')}
          </Muted>
        ) : null}
      </Stack>
    </Modal>
  );
}
