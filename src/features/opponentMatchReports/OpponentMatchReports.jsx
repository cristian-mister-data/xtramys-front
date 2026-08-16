import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MdAdd,
  MdEvent,
  MdFilterList,
  MdFlag,
  MdLocationOn,
  MdSearch,
  MdVisibility,
} from 'react-icons/md';
import {
  createOpponentMatchReport,
  deleteOpponentMatchReport,
  getOpponentMatchReports,
  updateOpponentMatchReport,
} from '@/api/opponentMatchReport';
import { getTournamentsByTeam } from '@/api/tournament';
import { getRivalsByTeam } from '@/api/rival';
import { Badge, Button, Input } from '@/ui/primitives';
import { confirmAction } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import OpponentMatchReportFormModal from './OpponentMatchReportFormModal';
import OpponentMatchReportDetailModal from './OpponentMatchReportDetailModal';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  min-height: 100%;

  @media (max-width: 600px) { padding: 12px; gap: 12px; }
`;

const Intro = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.mode === 'dark' ? 'linear-gradient(135deg, rgba(37,99,235,.13), rgba(15,23,42,.15))' : 'linear-gradient(135deg, #eff6ff, #f8fafc)'};

  h2 { margin: 0 0 5px; color: ${({ theme }) => theme.colors.text}; font-size: 17px; }
  p { margin: 0; max-width: 720px; color: ${({ theme }) => theme.colors.textSecondary}; font-size: 13px; line-height: 1.5; }

  @media (max-width: 680px) { flex-direction: column; button { width: 100%; } }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Search = styled.label`
  flex: 1;
  min-width: 220px;
  position: relative;
  display: flex;
  align-items: center;

  svg { position: absolute; left: 12px; color: ${({ theme }) => theme.colors.textMuted}; pointer-events: none; }
  input { padding-left: 38px; }

  @media (max-width: 540px) { min-width: 100%; }
`;

const Select = styled.select`
  min-height: 42px;
  padding: 9px 34px 9px 12px;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 13px;
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.borderFocus}; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const Count = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  white-space: nowrap;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
  @media (max-width: 420px) { grid-template-columns: 1fr; }
`;

const ReportCard = styled.button`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  text-align: left;
  cursor: pointer;
  transition: transform .12s ease, border-color .12s ease, box-shadow .12s ease;

  &:hover { transform: translateY(-2px); border-color: ${({ theme }) => theme.colors.primary}; box-shadow: ${({ theme }) => theme.shadows.md}; }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Matchup = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;

  strong { font-size: 14px; overflow-wrap: anywhere; }
  strong:last-child { text-align: right; }
`;

const Score = styled.span`
  min-width: 62px;
  padding: 7px 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 18px;
  font-weight: 900;
  text-align: center;
  white-space: nowrap;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 11px;
  span { display: inline-flex; align-items: center; gap: 4px; }
`;

const Focus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 12px;
  font-weight: 700;
`;

const State = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 260px;
  padding: 32px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  svg { color: ${({ theme }) => theme.colors.primary}; }
  h3 { margin: 0; color: ${({ theme }) => theme.colors.text}; font-size: 16px; }
  p { margin: 0; max-width: 460px; font-size: 13px; line-height: 1.5; }
`;

export default function OpponentMatchReports({ selectedTeam, canMutate }) {
  const { t, i18n } = useTranslation();
  const [reports, setReports] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [rivals, setRivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    if (!selectedTeam?._id) return;
    try {
      setLoading(true);
      const [reportsResponse, tournamentsResponse, rivalsResponse] = await Promise.all([
        getOpponentMatchReports(selectedTeam._id),
        getTournamentsByTeam(selectedTeam._id),
        getRivalsByTeam(selectedTeam._id),
      ]);
      setReports(reportsResponse.data || []);
      setTournaments(tournamentsResponse.data || []);
      setRivals(rivalsResponse.data || []);
    } catch (error) {
      toast.error(error.message || t('opponentMatch.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [selectedTeam?._id, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const create = () => { setEditing(null); setFormOpen(true); };
    window.addEventListener('opponent-reports:create', create);
    return () => window.removeEventListener('opponent-reports:create', create);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (status !== 'all' && report.status !== status) return false;
      if (!normalizedQuery) return true;
      return [report.teamA?.name, report.teamB?.name, report.competitionName, report.tournamentId?.nombre, report.venue]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [reports, query, status]);

  const save = async (payload, id) => {
    const response = id ? await updateOpponentMatchReport(id, payload) : await createOpponentMatchReport(payload);
    const saved = response.data;
    setReports((current) => id
      ? current.map((report) => report._id === id ? saved : report)
      : [saved, ...current]);
    setViewing((current) => current?._id === id ? saved : current);
    toast.success(t(id ? 'opponentMatch.success.updated' : 'opponentMatch.success.created'));
  };

  const edit = (report) => {
    setViewing(null);
    setEditing(report);
    setFormOpen(true);
  };

  const remove = async (report) => {
    const confirmed = await confirmAction(
      t('opponentMatch.confirmDelete', { match: `${report.teamA.name} – ${report.teamB.name}` }),
      { title: t('opponentMatch.confirmDeleteTitle'), destructive: true },
    );
    if (!confirmed) return;
    try {
      await deleteOpponentMatchReport(report._id);
      setReports((current) => current.filter((item) => item._id !== report._id));
      setViewing(null);
      toast.success(t('opponentMatch.success.deleted'));
    } catch (error) {
      toast.error(error.message || t('opponentMatch.errors.delete'));
    }
  };

  const formatDate = (value) => value
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value))
    : t('opponentMatch.noDate');
  const focusName = (report) => report.focusTeam === 'A'
    ? report.teamA.name
    : report.focusTeam === 'B' ? report.teamB.name : t('opponentMatch.bothTeams');

  return (
    <Container>
      <Intro>
        <div>
          <h2>{t('opponentMatch.introTitle')}</h2>
          <p>{t('opponentMatch.intro')}</p>
        </div>
      </Intro>

      <Toolbar>
        <Search>
          <MdSearch aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('opponentMatch.searchPlaceholder')} aria-label={t('opponentMatch.searchLabel')} />
        </Search>
        <MdFilterList aria-hidden="true" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t('opponentMatch.statusFilter')}>
          <option value="all">{t('common.all')}</option>
          <option value="draft">{t('opponentMatch.status.draft')}</option>
          <option value="completed">{t('opponentMatch.status.completed')}</option>
        </Select>
        <Count>{t('opponentMatch.reportCount', { count: filtered.length })}</Count>
      </Toolbar>

      {loading ? (
        <State role="status"><MdVisibility size={40} aria-hidden="true" /><p>{t('opponentMatch.loading')}</p></State>
      ) : filtered.length === 0 ? (
        <State>
          <MdVisibility size={46} aria-hidden="true" />
          <h3>{reports.length ? t('opponentMatch.noResults') : t('opponentMatch.emptyTitle')}</h3>
          <p>{reports.length ? t('opponentMatch.noResultsHint') : t('opponentMatch.emptyDescription')}</p>
          {!reports.length && canMutate && <Button type="button" $variant="primary" onClick={() => setFormOpen(true)}><MdAdd aria-hidden="true" /> {t('opponentMatch.actions.createFirst')}</Button>}
        </State>
      ) : (
        <Grid>
          {filtered.map((report) => {
            const competition = report.tournamentId?.nombre || report.competitionName || t(`opponentMatch.competitionTypes.${report.competitionType || 'other'}`);
            return (
              <ReportCard type="button" key={report._id} onClick={() => setViewing(report)} aria-label={t('opponentMatch.openReport', { home: report.teamA.name, away: report.teamB.name })}>
                <CardTop>
                  <Badge $tone={report.status === 'completed' ? 'success' : 'warning'}>{t(`opponentMatch.status.${report.status}`)}</Badge>
                  <span aria-label={t('opponentMatch.fields.watchedVia')}>{t(`opponentMatch.watchedVia.${report.watchedVia || 'other'}`)}</span>
                </CardTop>
                <Matchup>
                  <strong>{report.teamA.name}</strong>
                  <Score>{report.teamA.score ?? '–'} : {report.teamB.score ?? '–'}</Score>
                  <strong>{report.teamB.name}</strong>
                </Matchup>
                <Meta>
                  <span><MdEvent aria-hidden="true" /> {formatDate(report.dateTime)}</span>
                  <span><MdFlag aria-hidden="true" /> {competition}</span>
                  {report.venue && <span><MdLocationOn aria-hidden="true" /> {report.venue}</span>}
                </Meta>
                <Focus><MdVisibility aria-hidden="true" /> {t('opponentMatch.focus')}: {focusName(report)}</Focus>
              </ReportCard>
            );
          })}
        </Grid>
      )}

      <OpponentMatchReportFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        report={editing}
        selectedTeam={selectedTeam}
        tournaments={tournaments}
        rivals={rivals}
        onSave={save}
      />
      <OpponentMatchReportDetailModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        report={viewing}
        canMutate={canMutate}
        onEdit={edit}
        onDelete={remove}
      />
    </Container>
  );
}
