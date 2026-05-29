import { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MdLocationOn, MdEmojiEvents, MdSchedule, MdEdit, MdDelete,
  MdSportsSoccer, MdGroup, MdNote, MdCircle,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';
import { cdnUrl } from '@/config';
import { getPlayerInitials } from '@/utils/playerHelpers';

const HeroCard = styled.div`
  background: ${({ $color, theme }) =>
    `linear-gradient(135deg, ${$color || theme.colors.primary}, ${theme.colors.primaryHover})`};
  color: ${({ theme }) => theme.colors.onPrimary};
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: 16px;
  box-shadow: ${({ theme }) => theme.shadows.md};
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
  box-shadow: 0 0 0 1px rgba(255,255,255,0.25);
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

const TONE_BG = {
  info: 'infoSoft', success: 'successSoft', warning: 'warningSoft',
  error: 'errorSoft', purple: 'purpleSoft', primary: 'primarySoft',
};
const TONE_FG = {
  info: 'infoSoftText', success: 'successSoftText', warning: 'warningSoftText',
  error: 'errorSoftText', purple: 'purpleSoftText', primary: 'primarySoftText',
};

const StatIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${({ $bg, $tone, theme }) =>
    $bg || (theme.colors[TONE_BG[$tone]] ?? theme.colors.primarySoft)};
  color: ${({ $color, $tone, theme }) =>
    $color || (theme.colors[TONE_FG[$tone]] ?? theme.colors.primarySoftText)};
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
  background: ${({ $bg, $tone, theme }) =>
    $bg || (theme.colors[TONE_BG[$tone]] ?? theme.colors.backgroundAlt)};
  color: ${({ $color, $tone, theme }) =>
    $color || (theme.colors[TONE_FG[$tone]] ?? theme.colors.textSecondary)};
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

const PlayerAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CambioRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

function getResultBadge(resultado, t, theme) {
  switch (resultado) {
    case 'Victoria': return { bg: theme.colors.success, label: t('matchSheet.win', 'Victoria') };
    case 'Empate': return { bg: theme.colors.warning, label: t('matchSheet.draw', 'Empate') };
    case 'Derrota': return { bg: theme.colors.error, label: t('matchSheet.loss', 'Derrota') };
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
  const theme = useTheme();
  const players = useSelector((s) => s.player?.players ?? []);
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';

  const data = useMemo(() => match || null, [match]);
  if (!data) return null;

  const tournamentColor = data?.torneoId?.color || theme.colors.primary;
  const result = getResultBadge(data?.resultado, t, theme);

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
          <StatIcon $tone="info"><MdLocationOn /></StatIcon>
          <div>
            <StatLabel>{t('matchSheet.fields.location', 'Ubicación')}</StatLabel>
            <StatValue>{translateLocation(data.ubicacion, t)}</StatValue>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $tone="purple"><MdSchedule /></StatIcon>
          <div>
            <StatLabel>{t('matchSheet.fields.dateTime', 'Fecha')}</StatLabel>
            <StatValue>
              {data.fechaHora ? new Date(data.fechaHora).toLocaleDateString(locale) : '—'}
            </StatValue>
          </div>
        </StatCard>
        {data.torneoId?.nombre ? (
          <StatCard>
            <StatIcon
              $bg={(data.torneoId.color || theme.colors.primary) + '22'}
              $color={data.torneoId.color || theme.colors.primary}
            >
              <MdEmojiEvents />
            </StatIcon>
            <div>
              <StatLabel>{t('matchSheet.fields.tournament', 'Torneo')}</StatLabel>
              <StatValue>{data.torneoId.nombre}</StatValue>
            </div>
          </StatCard>
        ) : data.competicion === 'amistoso' && (
          <StatCard>
            <StatIcon $tone="warning"><MdEmojiEvents /></StatIcon>
            <div>
              <StatLabel>{t('matchSheet.fields.tournament', 'Competición')}</StatLabel>
              <StatValue>{t('matchSheet.friendly', 'Amistoso')}</StatValue>
            </div>
          </StatCard>
        )}
        {Array.isArray(data.convocados) && data.convocados.length > 0 && (
          <StatCard>
            <StatIcon $tone="success"><MdGroup /></StatIcon>
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
                  <Minute $tone="success">{g.minuto}&apos;</Minute>
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
                  <Minute $tone="error">{g.minuto}&apos;</Minute>
                  <PlayerName>{g.descripcion || t('matchSheet.rivalGoal', 'Gol del rival')}</PlayerName>
                </EventItem>
              ))}
            </Card>
          </Section>
        )}

        {Array.isArray(data.tarjetasAmarillas) && data.tarjetasAmarillas.length > 0 && (
          <Section>
            <SectionTitle>
              <MdCircle style={{ color: theme.colors.warning }} />
              {t('matchSheet.fields.yellowCards', 'Tarjetas amarillas')} ({data.tarjetasAmarillas.length})
            </SectionTitle>
            <Card>
              {data.tarjetasAmarillas.map((c, i) => (
                <EventItem key={i}>
                  <Minute $tone="warning">{c.minuto}&apos;</Minute>
                  <PlayerName>{getPlayerName(players, c.jugador)}</PlayerName>
                </EventItem>
              ))}
            </Card>
          </Section>
        )}

        {Array.isArray(data.tarjetasRojas) && data.tarjetasRojas.length > 0 && (
          <Section>
            <SectionTitle>
              <MdCircle style={{ color: theme.colors.error }} />
              {t('matchSheet.fields.redCards', 'Tarjetas rojas')} ({data.tarjetasRojas.length})
            </SectionTitle>
            <Card>
              {data.tarjetasRojas.map((c, i) => (
                <EventItem key={i}>
                  <Minute $tone="error">{c.minuto}&apos;</Minute>
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
              {data.cambios.map((c, i) => {
                const salePlayer = players.find((x) => x._id === (typeof c.sale === 'object' ? c.sale?._id : c.sale));
                const entraPlayer = players.find((x) => x._id === (typeof c.entra === 'object' ? c.entra?._id : c.entra));
                return (
                  <EventItem key={i}>
                    <Minute>{c.minuto}&apos;</Minute>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <CambioRow>
                        <span style={{ color: theme.colors.error, fontWeight: 'bold', fontSize: '13px' }}>↓</span>
                        <PlayerAvatar>
                          {salePlayer?.foto ? (
                            <img src={cdnUrl(salePlayer.foto)} alt="" />
                          ) : (
                            getPlayerInitials(salePlayer) || '?'
                          )}
                        </PlayerAvatar>
                        <PlayerName style={{ color: theme.colors.error }}>
                          {getPlayerName(players, c.sale)}
                        </PlayerName>
                      </CambioRow>
                      <CambioRow>
                        <span style={{ color: theme.colors.success, fontWeight: 'bold', fontSize: '13px' }}>↑</span>
                        <PlayerAvatar>
                          {entraPlayer?.foto ? (
                            <img src={cdnUrl(entraPlayer.foto)} alt="" />
                          ) : (
                            getPlayerInitials(entraPlayer) || '?'
                          )}
                        </PlayerAvatar>
                        <PlayerName style={{ color: theme.colors.success }}>
                          {getPlayerName(players, c.entra)}
                        </PlayerName>
                      </CambioRow>
                    </div>
                  </EventItem>
                );
              })}
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
