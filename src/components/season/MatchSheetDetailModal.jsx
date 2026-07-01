import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MdLocationOn, MdEmojiEvents, MdSchedule, MdEdit, MdDelete,
  MdSportsSoccer, MdGroup, MdNote, MdCircle, MdLink, MdOpenInNew, MdPersonSearch, MdStar
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';
import { cdnUrl } from '@/config';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import { getScoutingReports } from '@/api/scouting';

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

const ExternalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;

  &:hover { text-decoration: underline; }
`;

const SetPieceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
`;

const SetPieceImage = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  display: block;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SetPieceTitle = styled.div`
  margin-top: 8px;
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
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
  return getPlayerFullName(p) || '—';
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
  const navigate = useNavigate();
  const players = useSelector((s) => s.player?.players ?? []);
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';

  const data = useMemo(() => match || null, [match]);

  const [scoutingReports, setScoutingReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!open || !data?._id) {
      setScoutingReports([]);
      return;
    }
    const loadScouting = async () => {
      try {
        const { data: reports } = await getScoutingReports({ matchSheet: data._id });
        setScoutingReports(reports || []);
      } catch (err) {
        console.error('Error loading scouting reports', err);
      }
    };
    loadScouting();
  }, [open, data?._id]);

  if (!data) return null;

  const tournamentColor = data?.torneoId?.color || theme.colors.primary;
  const result = getResultBadge(data?.resultado, t, theme);
  const openScouting = () => {
    const params = new URLSearchParams();
    if (data._id) params.set('matchSheet', data._id);
    if (data.rival) params.set('rival', data.rival);
    const rivalId = data.rivalId?._id || data.rivalId;
    if (rivalId) params.set('rivalId', rivalId);
    if (data.competicion) params.set('competition', data.competicion);
    if (data.fechaHora) params.set('date', new Date(data.fechaHora).toISOString().slice(0, 10));
    navigate(`/scouting?${params.toString()}`);
    onClose?.();
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={t('matchSheet.title', 'Ficha de partido')}
      width={760}
      footer={
        <Row style={{ justifyContent: 'space-between', width: '100%' }}>
          {onDelete && (
            <Button type="button" $variant="danger" onClick={() => onDelete(data)}>
              <MdDelete /> {t('edition.delete', 'Eliminar')}
            </Button>
          )}
          <Row style={{ gap: 8 }}>
            <Button type="button" $variant="secondary" onClick={openScouting}>
              <MdPersonSearch /> Scouting
            </Button>
            <Button type="button" $variant="ghost" onClick={onClose}>
              {t('common.close', 'Cerrar')}
            </Button>
            {onEdit && (
              <Button type="button" onClick={() => onEdit(data)}>
                <MdEdit /> {t('edition.edit', 'Editar')}
              </Button>
            )}
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
        {Array.isArray(data.convocados) && data.convocados.length > 0 && (
          <Section>
            <SectionTitle>
              <MdGroup /> {t('matchSheet.fields.called', 'Convocados')} ({data.convocados.length})
            </SectionTitle>
            <Card>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.convocados.map((id) => {
                  const pId = typeof id === 'object' ? id._id : id;
                  const player = players.find(p => p._id === pId);
                  return (
                    <div key={pId} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: theme.colors.backgroundAlt, padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
                      <PlayerAvatar>
                        {player?.foto ? (
                          <img src={cdnUrl(player.foto)} alt="" />
                        ) : (
                          getPlayerInitials(player) || '?'
                        )}
                      </PlayerAvatar>
                      <span>{getPlayerName(players, pId)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Section>
        )}

        {Array.isArray(data.noConvocados) && data.noConvocados.length > 0 && (
          <Section>
            <SectionTitle>
              <MdGroup style={{ opacity: 0.6 }} /> {t('matchSheet.fields.notCalled', 'No convocados')} ({data.noConvocados.length})
            </SectionTitle>
            <Card>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.noConvocados.map((id) => {
                  const pId = typeof id === 'object' ? id._id : id;
                  const player = players.find(p => p._id === pId);
                  return (
                    <div key={pId} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: theme.colors.backgroundAlt, padding: '4px 8px', borderRadius: '6px', fontSize: '13px', opacity: 0.85 }}>
                      <PlayerAvatar>
                        {player?.foto ? (
                          <img src={cdnUrl(player.foto)} alt="" />
                        ) : (
                          getPlayerInitials(player) || '?'
                        )}
                      </PlayerAvatar>
                      <span>{getPlayerName(players, pId)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Section>
        )}

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

        {Array.isArray(data.setPieces) && data.setPieces.length > 0 && (
          <Section>
            <SectionTitle>{t('setPieces.matchTab', 'ABP')}</SectionTitle>
            <SetPieceGrid>
              {data.setPieces.map((sp, i) => {
                const image = normalizeImageSource(sp.customImage || sp.imagen || '');
                return (
                  <Card key={`${sp.strategyId || sp.nombre || i}`}>
                    {image ? <SetPieceImage src={image} alt={sp.nombre || 'ABP'} /> : null}
                    <SetPieceTitle>{sp.nombre || t('setPieces.title', 'ABP')}</SetPieceTitle>
                    {sp.descripcion ? <Muted>{sp.descripcion}</Muted> : null}
                  </Card>
                );
              })}
            </SetPieceGrid>
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

        {data.partidoUrl ? (
          <Section>
            <SectionTitle>
              <MdLink /> {t('matchSheet.fields.matchLink', 'Enlace del partido')}
            </SectionTitle>
            <Card>
              <ExternalLink href={data.partidoUrl} target="_blank" rel="noreferrer">
                <MdOpenInNew />
                <span>{data.partidoUrl}</span>
              </ExternalLink>
            </Card>
          </Section>
        ) : null}

        {!data.goles?.length && !data.tarjetasAmarillas?.length &&
         !data.tarjetasRojas?.length && !data.cambios?.length &&
         !data.notasEntrenador && !data.observaciones && !data.partidoUrl &&
         !scoutingReports.length ? (
          <Muted style={{ textAlign: 'center', padding: 12 }}>
            {t('matchSheet.noEvents', 'Sin eventos registrados')}
          </Muted>
        ) : null}

        {scoutingReports.length > 0 && (
          <Section>
            <SectionTitle>
              <MdPersonSearch /> {t('matchSheet.featuredPlayers', 'Jugadores destacados')}
            </SectionTitle>
            <Card style={{ background: theme.colors.surface }}>
              <Stack $gap={8}>
                {scoutingReports.map((report) => (
                  <div
                    key={report._id}
                    onClick={() => setSelectedReport(report)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: theme.colors.backgroundAlt,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${theme.colors.border}`,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border;
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: theme.colors.text }}>
                        {report.playerName}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                        {[report.position, report.playerTeam].filter(Boolean).join(' - ') || 'Sin posición/equipo'}
                      </div>
                    </div>
                    {report.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: theme.colors.warningSoft, color: theme.colors.warningSoftText, padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                        <MdStar /> {report.rating}/10
                      </div>
                    )}
                  </div>
                ))}
              </Stack>
            </Card>
          </Section>
        )}
      </Stack>
    </Modal>
    <ScoutingDetailModal
      open={!!selectedReport}
      onClose={() => setSelectedReport(null)}
      report={selectedReport}
    />
  </>
  );
}

const FIELD_LABELS = {
  juegoAereo: 'Juego aéreo',
  tomaDecisiones: 'Toma de decisiones',
  visionJuego: 'Visión de juego',
  trabajoDefensivo: 'Trabajo defensivo',
};
const scoreLabel = (field) => FIELD_LABELS[field] || field.charAt(0).toUpperCase() + field.slice(1);

function getRecommendationLabel(val) {
  switch (val) {
    case 'muy_recomendable': return 'Muy recomendable';
    case 'seguir_observando': return 'Seguir observando';
    case 'no_recomendado': return 'No recomendado';
    default: return val || '—';
  }
}

function getPotentialLabel(val) {
  switch (val) {
    case 'bajo': return 'Bajo';
    case 'medio': return 'Medio';
    case 'alto': return 'Alto';
    default: return val || '—';
  }
}

function ScoutingDetailModal({ open, onClose, report }) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!open || !report) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Scouting: ${report.playerName}`}
      width={600}
      footer={
        <Button type="button" onClick={onClose}>
          {t('common.close', 'Cerrar')}
        </Button>
      }
    >
      <Stack $gap={16}>
        <div style={{
          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover})`,
          color: theme.colors.onPrimary,
          padding: '20px',
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadows.md,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{report.playerName}</h3>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              {[report.position, report.playerTeam].filter(Boolean).join(' - ') || 'Sin posición/equipo'}
            </div>
            {report.age && (
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                {report.age} años | Pie: {report.dominantFoot || 'Sin definir'}
              </div>
            )}
          </div>
          {report.rating && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              padding: '8px 12px',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: '800',
              fontSize: '18px'
            }}>
              ⭐ {report.rating}/10
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: theme.colors.backgroundAlt, border: `1px solid ${theme.colors.border}`, padding: '12px', borderRadius: theme.radius.md }}>
            <div style={{ fontSize: '11px', color: theme.colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>Recomendación</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px', color: theme.colors.text }}>{getRecommendationLabel(report.recommendation)}</div>
          </div>
          <div style={{ background: theme.colors.backgroundAlt, border: `1px solid ${theme.colors.border}`, padding: '12px', borderRadius: theme.radius.md }}>
            <div style={{ fontSize: '11px', color: theme.colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>Potencial</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px', color: theme.colors.text }}>{getPotentialLabel(report.potential)}</div>
          </div>
        </div>

        {report.tags && report.tags.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase' }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {report.tags.map(tag => (
                <span key={tag} style={{
                  background: theme.colors.primarySoft,
                  color: theme.colors.primarySoftText,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {(report.strengths || report.improvements) && (
          <div style={{ display: 'grid', gridTemplateColumns: report.strengths && report.improvements ? '1fr 1fr' : '1fr', gap: '12px' }}>
            {report.strengths && (
              <div style={{ background: theme.colors.backgroundAlt, border: `1px solid ${theme.colors.border}`, padding: '12px', borderRadius: theme.radius.md }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.success, marginBottom: '6px', textTransform: 'uppercase' }}>💪 Fortalezas</div>
                <div style={{ fontSize: '13px', color: theme.colors.text, whiteSpace: 'pre-wrap' }}>{report.strengths}</div>
              </div>
            )}
            {report.improvements && (
              <div style={{ background: theme.colors.backgroundAlt, border: `1px solid ${theme.colors.border}`, padding: '12px', borderRadius: theme.radius.md }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.error, marginBottom: '6px', textTransform: 'uppercase' }}>📈 Aspectos a mejorar</div>
                <div style={{ fontSize: '13px', color: theme.colors.text, whiteSpace: 'pre-wrap' }}>{report.improvements}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries({
            Técnica: report.technical,
            Física: report.physical,
            Táctica: report.tactical,
            Mental: report.mental
          }).map(([category, scores]) => {
            if (!scores) return null;
            const entries = Object.entries(scores).filter(([_, v]) => v !== null && v !== '');
            if (entries.length === 0) return null;

            return (
              <div key={category} style={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, padding: '12px', borderRadius: theme.radius.md }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.textSecondary, marginBottom: '8px', textTransform: 'uppercase', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '4px' }}>
                  {category}
                </div>
                <Stack $gap={6}>
                  {entries.map(([field, score]) => (
                    <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: theme.colors.text }}>{scoreLabel(field)}</span>
                      <span style={{ fontWeight: 'bold', color: theme.colors.primary }}>{score}/10</span>
                    </div>
                  ))}
                </Stack>
              </div>
            );
          })}
        </div>

        {report.observations && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.textSecondary, marginBottom: '6px', textTransform: 'uppercase' }}>Observaciones</div>
            <div style={{
              background: theme.colors.backgroundAlt,
              border: `1px solid ${theme.colors.border}`,
              padding: '12px',
              borderRadius: theme.radius.md,
              fontSize: '13px',
              color: theme.colors.text,
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5'
            }}>
              {report.observations}
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
