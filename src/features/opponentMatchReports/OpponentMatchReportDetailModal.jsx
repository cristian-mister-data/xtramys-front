import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MdDeleteOutline,
  MdEdit,
  MdEvent,
  MdFileDownload,
  MdFlag,
  MdLink,
  MdLocationOn,
  MdVisibility,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Badge, Button } from '@/ui/primitives';
import { generateOpponentMatchReportPdf } from './pdf';
import { toast } from '@/ui/toast';

const Hero = styled.section`
  padding: 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.mode === 'dark' ? 'linear-gradient(135deg, #172033, #111827)' : 'linear-gradient(135deg, #eff6ff, #f8fafc)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Scoreboard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 18px;

  @media (max-width: 560px) { gap: 8px; }
`;

const Team = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ $right }) => $right ? 'flex-start' : 'flex-end'};
  text-align: ${({ $right }) => $right ? 'left' : 'right'};
  gap: 5px;
  min-width: 0;

  strong { color: ${({ theme }) => theme.colors.text}; font-size: 17px; overflow-wrap: anywhere; }
  span { color: ${({ theme }) => theme.colors.textSecondary}; font-size: 12px; }

  @media (max-width: 560px) { strong { font-size: 14px; } }
`;

const Score = styled.div`
  font-size: 30px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: 3px;
  white-space: nowrap;

  @media (max-width: 560px) { font-size: 24px; }
`;

const Meta = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;

  span { display: inline-flex; align-items: center; gap: 5px; }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
`;

const Panel = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
`;

const TextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }
  strong { color: ${({ theme }) => theme.colors.textSecondary}; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  p { margin: 0; white-space: pre-wrap; color: ${({ theme }) => theme.colors.text}; font-size: 13px; line-height: 1.55; }
`;

const Lineup = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  columns: 2;
  column-gap: 24px;
  @media (max-width: 460px) { columns: 1; }
`;

const LineupItem = styled.li`
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  break-inside: avoid;
  min-height: 34px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
`;

const ShirtNumber = styled.span`
  display: grid;
  place-items: center;
  min-height: 26px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primarySoftText};
  font-size: 11px;
  font-weight: 800;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: 70px minmax(100px, 1fr) 70px;
  gap: 6px 12px;
  align-items: center;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};

  span:nth-child(3n + 2) { color: ${({ theme }) => theme.colors.textSecondary}; font-size: 12px; }
  strong { font-size: 14px; }
`;

const Timeline = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const TimelineItem = styled.li`
  display: grid;
  grid-template-columns: 50px 90px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  strong { color: ${({ theme }) => theme.colors.primary}; }

  @media (max-width: 500px) { grid-template-columns: 44px minmax(0, 1fr); span:last-child { grid-column: 1 / -1; } }
`;

const Link = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
`;

const Empty = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
`;

const hasValues = (object = {}) => Object.values(object).some((value) => value !== '' && value != null);
const score = (value) => value ?? '–';
const normalizeLineup = (team = {}) => (Array.isArray(team.lineup) && team.lineup.length
  ? team.lineup
  : String(team.lineupText || team.alineacion || team.lineup || '').split('\n'))
  .map((player) => {
    if (typeof player === 'string') return player;
    const name = player?.name || player?.nombre || player?.player || '';
    const number = player?.number || player?.shirtNumber || player?.dorsal || '';
    return name ? `${number ? `${number}. ` : ''}${name}` : number;
  })
  .map((player) => String(player).trim())
  .filter(Boolean);
const splitLineupPlayer = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^\s*(\d{1,2})\s*[.)\-:]?\s*(.+)$/);
  return { number: match?.[1] || '', name: (match?.[2] || text).trim() };
};

export default function OpponentMatchReportDetailModal({ open, onClose, report, canMutate = false, canEdit = canMutate, canDelete = canMutate, onEdit, onDelete }) {
  const { t, i18n } = useTranslation();
  const [exporting, setExporting] = useState(false);
  if (!report) return null;

  const date = report.dateTime ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.dateTime)) : '';
  const focusLabel = report.focusTeam === 'A' ? report.teamA.name : report.focusTeam === 'B' ? report.teamB.name : t('opponentMatch.bothTeams');
  const competition = report.tournamentId?.nombre || report.competitionName || t(`opponentMatch.competitionTypes.${report.competitionType || 'other'}`);
  const statsRows = ['possession', 'shots', 'shotsOnTarget', 'corners', 'fouls', 'offsides'];
  const tacticalRows = ['inPossession', 'outOfPossession', 'transitions', 'pressing', 'keyPlayers', 'strengths', 'weaknesses'];
  const setPieceRows = ['corners', 'freeKicks', 'throwIns', 'penalties'];

  const exportPdf = async () => {
    try {
      setExporting(true);
      await generateOpponentMatchReportPdf(report, t, i18n.language);
    } catch (error) {
      toast.error(error.message || t('opponentMatch.errors.pdf'));
    } finally {
      setExporting(false);
    }
  };

  const footer = (
    <>
      {canDelete && <Button type="button" $variant="danger" onClick={() => onDelete(report)}><MdDeleteOutline aria-hidden="true" /> {t('common.delete')}</Button>}
      <Button type="button" $variant="secondary" onClick={exportPdf} disabled={exporting}><MdFileDownload aria-hidden="true" /> {exporting ? t('pdfDialog.generating') : t('opponentMatch.actions.pdfShare')}</Button>
      {canEdit && <Button type="button" $variant="primary" onClick={() => onEdit(report)}><MdEdit aria-hidden="true" /> {t('common.edit')}</Button>}
    </>
  );

  const renderTextRows = (data, fields, prefix) => fields.filter((field) => data?.[field]).map((field) => (
    <TextBlock key={field}>
      <strong>{t(`opponentMatch.${prefix}.${field}`)}</strong>
      <p>{data[field]}</p>
    </TextBlock>
  ));

  return (
    <Modal open={open} onClose={onClose} title={t('opponentMatch.detailTitle')} width={980} footer={footer}>
      <Body>
        <Hero>
          <Scoreboard>
            <Team>
              <strong>{report.teamA.name}</strong>
              <span>{report.teamA.formation || t('opponentMatch.noFormation')}</span>
            </Team>
            <Score>{score(report.teamA.score)} : {score(report.teamB.score)}</Score>
            <Team $right>
              <strong>{report.teamB.name}</strong>
              <span>{report.teamB.formation || t('opponentMatch.noFormation')}</span>
            </Team>
          </Scoreboard>
          <Meta>
            <Badge $tone={report.status === 'completed' ? 'success' : 'warning'}>{t(`opponentMatch.status.${report.status}`)}</Badge>
            <span><MdVisibility aria-hidden="true" /> {t('opponentMatch.focus')}: {focusLabel}</span>
            {date && <span><MdEvent aria-hidden="true" /> {date}</span>}
            {competition && <span><MdFlag aria-hidden="true" /> {competition}{report.stage ? ` · ${report.stage}` : ''}</span>}
            {report.venue && <span><MdLocationOn aria-hidden="true" /> {report.venue}</span>}
          </Meta>
        </Hero>

        <Grid>
          {['A', 'B'].map((letter) => {
            const team = report[`team${letter}`];
            const lineup = normalizeLineup(team);
            return (
              <Section key={letter}>
                <SectionTitle>{t('opponentMatch.sections.lineupTeam', { team: team.name })}</SectionTitle>
                <Panel>
                  {team.coach && <TextBlock><strong>{t('opponentMatch.fields.coach')}</strong><p>{team.coach}</p></TextBlock>}
                  {lineup.length ? <Lineup>{lineup.map((player, index) => {
                    const parsed = splitLineupPlayer(player);
                    return <LineupItem key={`${player}-${index}`}><ShirtNumber>{parsed.number || '–'}</ShirtNumber><span>{parsed.name}</span></LineupItem>;
                  })}</Lineup> : <Empty>{t('opponentMatch.noLineup')}</Empty>}
                </Panel>
              </Section>
            );
          })}
        </Grid>

        {(hasValues(report.statsA) || hasValues(report.statsB)) && (
          <Section>
            <SectionTitle>{t('opponentMatch.sections.stats')}</SectionTitle>
            <Panel>
              <Stats>
                <strong>{report.teamA.name}</strong><span /><strong>{report.teamB.name}</strong>
                {statsRows.map((field) => [
                  <strong key={`${field}-a`}>{report.statsA?.[field] ?? '–'}{field === 'possession' && report.statsA?.[field] != null ? '%' : ''}</strong>,
                  <span key={`${field}-label`}>{t(`opponentMatch.stats.${field}`)}</span>,
                  <strong key={`${field}-b`}>{report.statsB?.[field] ?? '–'}{field === 'possession' && report.statsB?.[field] != null ? '%' : ''}</strong>,
                ])}
              </Stats>
            </Panel>
          </Section>
        )}

        {report.events?.length > 0 && (
          <Section>
            <SectionTitle>{t('opponentMatch.sections.timeline')}</SectionTitle>
            <Timeline>
              {report.events.map((event, index) => (
                <TimelineItem key={event._id || index}>
                  <strong>{event.minute ? `${event.minute}'` : '–'}</strong>
                  <span>{t(`opponentMatch.eventTypes.${event.type}`)}</span>
                  <span>{event.team ? `${event.team === 'A' ? report.teamA.name : report.teamB.name} · ` : ''}{event.player ? `${event.player} · ` : ''}{event.note}</span>
                </TimelineItem>
              ))}
            </Timeline>
          </Section>
        )}

        <Grid>
          {['A', 'B'].map((letter) => {
            const data = report[`tactics${letter}`];
            if (!hasValues(data)) return null;
            return (
              <Section key={letter}>
                <SectionTitle>{t('opponentMatch.sections.tacticsTeam', { team: report[`team${letter}`].name })}</SectionTitle>
                <Panel>{renderTextRows(data, tacticalRows, 'tactics')}</Panel>
              </Section>
            );
          })}
        </Grid>

        <Grid>
          {['A', 'B'].map((letter) => {
            const data = report[`setPieces${letter}`];
            if (!hasValues(data)) return null;
            return (
              <Section key={letter}>
                <SectionTitle>{t('opponentMatch.sections.setPiecesTeam', { team: report[`team${letter}`].name })}</SectionTitle>
                <Panel>{renderTextRows(data, setPieceRows, 'setPieces')}</Panel>
              </Section>
            );
          })}
        </Grid>

        {(report.summary || report.gamePlan) && (
          <Section>
            <SectionTitle>{t('opponentMatch.sections.conclusions')}</SectionTitle>
            <Panel>
              {report.summary && <TextBlock><strong>{t('opponentMatch.fields.summary')}</strong><p>{report.summary}</p></TextBlock>}
              {report.gamePlan && <TextBlock><strong>{t('opponentMatch.fields.gamePlan')}</strong><p>{report.gamePlan}</p></TextBlock>}
            </Panel>
          </Section>
        )}

        {report.videoUrl && <Link href={report.videoUrl} target="_blank" rel="noreferrer"><MdLink aria-hidden="true" /> {t('opponentMatch.actions.openVideo')}</Link>}
      </Body>
    </Modal>
  );
}
