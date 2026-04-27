import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import Modal from '@/ui/Modal';
import { Button, Stack, Muted } from '@/ui/primitives';
import { fetchTournamentSanctions } from '@/store/slices/tournament/tournamentThunks';
import { tournamentTypeInfo, formatDateShort } from './tournamentHelpers';
import {
  computeStandings,
  groupKnockoutMatches,
  isMatchPlayed,
  summarizeSanction,
} from './tournamentDetailHelpers';

const EMPTY = [];

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 14px;
  overflow-x: auto;
`;

const Tab = styled.button`
  padding: 10px 14px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  cursor: pointer;
  white-space: nowrap;
`;

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $bg }) => $bg || '#f1f5f9'};
  margin-bottom: 16px;
`;

const HeroIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
`;

const HeroTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const HeroSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
`;

const InfoCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const InfoLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.text};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th, td { padding: 8px 6px; text-align: center; }
  th { color: ${({ theme }) => theme.colors.textSecondary}; font-weight: 600; font-size: 11px; text-transform: uppercase; }
  td:nth-child(2), th:nth-child(2) { text-align: left; }
  tbody tr { border-top: 1px solid ${({ theme }) => theme.colors.border}; }
  tbody tr:hover { background: ${({ theme }) => theme.colors.background}; }
`;

const PtsCell = styled.td`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`;

const RoundBlock = styled.div`
  margin-bottom: 18px;
`;

const RoundTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 8px;
`;

const Fixture = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  margin-bottom: 6px;
`;

const Side = styled.div`
  flex: 1;
  font-weight: 600;
  text-align: ${({ $right }) => ($right ? 'right' : 'left')};
`;

const Score = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.primary};
  min-width: 56px;
  text-align: center;
`;

const SanctionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  margin-bottom: 6px;
`;

const Name = styled.div`
  flex: 1;
  font-weight: 600;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $bg }) => $bg || '#e5e7eb'};
  color: ${({ $color }) => $color || '#111'};
  font-size: 11px;
  font-weight: 700;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
`;

const TabPanel = styled.div`
  /* Internal scroll so the modal panel does NOT grow to fill the
     viewport. Together with Modal's own max-height this keeps the
     dialog compact, matching the create/edit form modal. */
  max-height: 60vh;
  overflow-y: auto;
  /* Compensate Modal Body horizontal padding so scrollbar sits at the
     edge of the panel like in the form modal. */
  margin: 0 -4px;
  padding: 0 4px;
`;

export default function TournamentDetailModal({
  open,
  onClose,
  tournament,
  onEdit,
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const matchSheets = useSelector((s) => s.matchSheet?.matchSheets ?? EMPTY);
  const sanctions = useSelector((s) => s.tournament?.sanctions ?? EMPTY);
  const loadingSanctions = useSelector((s) => s.tournament?.loadingSanctions);

  const [tab, setTab] = useState('info');

  useEffect(() => {
    if (open) setTab('info');
  }, [open, tournament?._id]);

  useEffect(() => {
    if (open && tab === 'sanctions' && tournament?._id) {
      dispatch(fetchTournamentSanctions(tournament._id));
    }
  }, [open, tab, tournament?._id, dispatch]);

  const typeInfo = tournamentTypeInfo(tournament?.tipo);
  const formato = tournament?.formato || 'liga';
  const showStandings = formato === 'liga' || formato === 'grupos+eliminatoria';
  const showBrackets = formato === 'eliminatoria' || formato === 'grupos+eliminatoria';

  const standings = useMemo(
    () => (showStandings && tournament ? computeStandings(matchSheets, tournament._id) : []),
    [matchSheets, tournament, showStandings],
  );

  const brackets = useMemo(
    () => (showBrackets && tournament ? groupKnockoutMatches(matchSheets, tournament._id) : []),
    [matchSheets, tournament, showBrackets],
  );

  const tournamentMatches = useMemo(() => (
    matchSheets.filter((m) => {
      const tid = m?.torneoId?._id || m?.torneoId;
      return tid && tournament && String(tid) === String(tournament._id);
    })
  ), [matchSheets, tournament]);

  if (!tournament) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tournament.nombre}
      width={620}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
          {onEdit ? (
            <Button $variant="secondary" onClick={() => onEdit(tournament)}>
              ✏️ {t('common.edit', 'Editar')}
            </Button>
          ) : null}
          <Button $variant="ghost" onClick={onClose}>{t('common.close', 'Cerrar')}</Button>
        </div>
      }
    >
      <Hero $bg={`${tournament.color || typeInfo.color}22`}>
        <HeroIcon>{typeInfo.icon}</HeroIcon>
        <div style={{ flex: 1 }}>
          <HeroTitle>{tournament.nombre}</HeroTitle>
          <HeroSub>
            {t(typeInfo.labelKey, typeInfo.value)}
            {' • '}
            {tournament.estado === 'activo'
              ? t('tournaments.active', 'Activo')
              : t('tournaments.finished', 'Finalizado')}
            {tournament.fechaInicio ? ` • ${formatDateShort(tournament.fechaInicio, i18n.language === 'en' ? 'en-US' : 'es-ES')}` : ''}
          </HeroSub>
        </div>
      </Hero>

      <Tabs>
        <Tab $active={tab === 'info'} onClick={() => setTab('info')}>
          {t('tournaments.info', 'Información')}
        </Tab>
        {showStandings && (
          <Tab $active={tab === 'standings'} onClick={() => setTab('standings')}>
            {t('tournaments.standings', 'Clasificación')}
          </Tab>
        )}
        {showBrackets && (
          <Tab $active={tab === 'brackets'} onClick={() => setTab('brackets')}>
            {t('tournaments.brackets', 'Brackets')}
          </Tab>
        )}
        <Tab $active={tab === 'sanctions'} onClick={() => setTab('sanctions')}>
          {t('tournaments.sanctions', 'Sanciones')}
        </Tab>
      </Tabs>

      {tab === 'info' && (
        <TabPanel>
          <Stack $gap={12}>
          <InfoGrid>
            <InfoCard>
              <InfoLabel>{t('tournaments.format', 'Formato')}</InfoLabel>
              <InfoValue>{tournament.formato || '—'}</InfoValue>
            </InfoCard>
            <InfoCard>
              <InfoLabel>{t('tournaments.type', 'Tipo')}</InfoLabel>
              <InfoValue>{tournament.tipo || '—'}</InfoValue>
            </InfoCard>
            <InfoCard>
              <InfoLabel>{t('tournaments.matches', 'Partidos')}</InfoLabel>
              <InfoValue>{tournamentMatches.length}</InfoValue>
            </InfoCard>
            {tournament.tieneGrupos && (
              <InfoCard>
                <InfoLabel>{t('tournaments.groups', 'Grupos')}</InfoLabel>
                <InfoValue>{tournament.numGrupos || '—'}</InfoValue>
              </InfoCard>
            )}
            {tournament.cicloAmarillas && (
              <InfoCard>
                <InfoLabel>{t('tournaments.yellowCycle', 'Ciclo amarillas')}</InfoLabel>
                <InfoValue>{tournament.cicloAmarillas}</InfoValue>
              </InfoCard>
            )}
            <InfoCard>
              <InfoLabel>{t('tournaments.startDate', 'Inicio')}</InfoLabel>
              <InfoValue>
                {tournament.fechaInicio
                  ? formatDateShort(tournament.fechaInicio, i18n.language === 'en' ? 'en-US' : 'es-ES')
                  : '—'}
              </InfoValue>
            </InfoCard>
            <InfoCard>
              <InfoLabel>{t('tournaments.endDate', 'Fin')}</InfoLabel>
              <InfoValue>
                {tournament.fechaFin
                  ? formatDateShort(tournament.fechaFin, i18n.language === 'en' ? 'en-US' : 'es-ES')
                  : '—'}
              </InfoValue>
            </InfoCard>
          </InfoGrid>
          {tournament.descripcion ? (
            <div>
              <InfoLabel style={{ marginBottom: 4 }}>{t('tournaments.description', 'Descripción')}</InfoLabel>
              <Muted style={{ lineHeight: 1.5 }}>{tournament.descripcion}</Muted>
            </div>
          ) : null}
        </Stack>
        </TabPanel>
      )}

      {tab === 'standings' && showStandings && (
        <TabPanel>
        {standings.length === 0 ? (
          <EmptyState>{t('tournaments.noStandings', 'Aún no hay partidos jugados para calcular la clasificación')}</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('tournaments.team', 'Equipo')}</th>
                <th>J</th>
                <th>G</th>
                <th>E</th>
                <th>P</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => (
                <tr key={row.equipo}>
                  <td>{idx + 1}</td>
                  <td>{row.equipo}</td>
                  <td>{row.J}</td>
                  <td>{row.G}</td>
                  <td>{row.E}</td>
                  <td>{row.P}</td>
                  <td>{row.GF}</td>
                  <td>{row.GC}</td>
                  <td>{row.DG > 0 ? `+${row.DG}` : row.DG}</td>
                  <PtsCell>{row.Pts}</PtsCell>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        </TabPanel>
      )}

      {tab === 'brackets' && showBrackets && (
        <TabPanel>
        {brackets.length === 0 ? (
          <EmptyState>{t('tournaments.noBrackets', 'Aún no hay partidos eliminatorios para mostrar')}</EmptyState>
        ) : (
          <div>
            {brackets.map((round) => (
              <RoundBlock key={round.round}>
                <RoundTitle>{round.label}</RoundTitle>
                {round.matches.map((m) => (
                  <Fixture key={m._id}>
                    <Side>{m.equipoNombre || t('tournaments.us', 'Nosotros')}</Side>
                    <Score>
                      {isMatchPlayed(m)
                        ? `${m.golesPropios ?? '-'} : ${m.golesRival ?? '-'}`
                        : 'vs'}
                    </Score>
                    <Side $right>{m.rival || '—'}</Side>
                  </Fixture>
                ))}
              </RoundBlock>
            ))}
          </div>
        )}
        </TabPanel>
      )}

      {tab === 'sanctions' && (
        <TabPanel>
        {loadingSanctions ? (
          <EmptyState>{t('common.loading', 'Cargando...')}</EmptyState>
        ) : sanctions.length === 0 ? (
          <EmptyState>{t('tournaments.noSanctions', 'Sin sanciones registradas')}</EmptyState>
        ) : (
          <div>
            {sanctions.map((s) => {
              const pendientes = (s.sanciones || []).filter((x) => x.estado === 'pendiente');
              return (
                <SanctionRow key={s.playerId}>
                  <Name>{s.playerName}</Name>
                  <Pill $bg="#fef3c7" $color="#92400e">🟨 {s.amarillasTotal || 0}</Pill>
                  <Pill $bg="#fee2e2" $color="#991b1b">🟥 {s.rojasTotal || 0}</Pill>
                  {s.sancionado ? (
                    <Pill $bg="#fecaca" $color="#7f1d1d">
                      {t('tournaments.suspended', 'Sancionado')}
                      {s.partidosSancion ? ` (${s.partidosSancion})` : ''}
                    </Pill>
                  ) : s.alertaProximaSancion ? (
                    <Pill $bg="#fed7aa" $color="#9a3412">⚠ {t('tournaments.warning', 'Aviso')}</Pill>
                  ) : null}
                  {pendientes.length > 0 && (
                    <Pill $bg="#e0f2fe" $color="#075985" title={pendientes.map(summarizeSanction).join(', ')}>
                      {pendientes.length} {t('tournaments.pending', 'pendiente(s)')}
                    </Pill>
                  )}
                </SanctionRow>
              );
            })}
          </div>
        )}
        </TabPanel>
      )}
    </Modal>
  );
}
