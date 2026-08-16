import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdArrowBack, MdArrowForward, MdDeleteOutline, MdSave } from 'react-icons/md';
import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import { Button, Input, Label, TextArea } from '@/ui/primitives';
import { confirmAction } from '@/ui/confirm';
import { ALINEACIONES } from '@/features/rivalAnalysis/rivalAnalysisData';

const STEPS = ['match', 'lineups', 'tactics', 'setPieces'];
const STAT_FIELDS = ['possession', 'shots', 'shotsOnTarget', 'corners', 'fouls', 'offsides'];
const TACTICAL_FIELDS = ['inPossession', 'outOfPossession', 'transitions', 'pressing', 'keyPlayers', 'strengths', 'weaknesses'];
const SET_PIECE_FIELDS = ['corners', 'freeKicks', 'throwIns', 'penalties'];

const emptyStats = () => Object.fromEntries(STAT_FIELDS.map((key) => [key, '']));
const emptyTactics = () => Object.fromEntries(TACTICAL_FIELDS.map((key) => [key, '']));
const emptySetPieces = () => Object.fromEntries(SET_PIECE_FIELDS.map((key) => [key, '']));
const emptyLineupRows = (count = 11) => Array.from({ length: count }, () => ({ number: '', name: '' }));
const emptyTeam = () => ({ name: '', rivalId: null, shield: '', formation: '', coach: '', lineupRows: emptyLineupRows(), score: '', halfTimeScore: '' });

const emptyForm = () => ({
  teamA: emptyTeam(),
  teamB: emptyTeam(),
  focusTeam: 'BOTH',
  dateTime: '',
  venue: '',
  watchedVia: 'live',
  tournamentId: '',
  competitionType: 'league',
  competitionName: '',
  stage: '',
  statsA: emptyStats(),
  statsB: emptyStats(),
  tacticsA: emptyTactics(),
  tacticsB: emptyTactics(),
  setPiecesA: emptySetPieces(),
  setPiecesB: emptySetPieces(),
  events: [],
  summary: '',
  gamePlan: '',
  videoUrl: '',
  status: 'draft',
});

const toLocalDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toNumberOrNull = (value) => value === '' || value == null ? null : Number(value);
const toLines = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
const normalizeLineup = (value) => (Array.isArray(value) ? value : toLines(value))
  .map((player) => {
    if (typeof player === 'string') return player;
    const name = player?.name || player?.nombre || player?.player || '';
    const number = player?.number || player?.shirtNumber || player?.dorsal || '';
    return name ? `${number ? `${number}. ` : ''}${name}` : number;
  })
  .map((player) => String(player).trim())
  .filter(Boolean);
const parseLineupRows = (value) => {
  const rows = normalizeLineup(value).map((line) => {
    const match = line.match(/^\s*(\d{1,2})\s*[.)\-:]?\s*(.+)$/);
    return { number: match?.[1] || '', name: (match?.[2] || line).trim() };
  });
  return rows.length ? rows : emptyLineupRows();
};
const serializeLineup = (rows = []) => rows
  .map(({ number = '', name = '' }) => ({ number: String(number).trim(), name: String(name).trim() }))
  .filter(({ name }) => name)
  .map(({ number, name }) => number ? `${number}. ${name}` : name);

function fromReport(report) {
  if (!report) return emptyForm();
  const normalizeTeam = (team = {}) => ({
    name: team.name || '',
    rivalId: team.rivalId || null,
    shield: team.shield || '',
    formation: team.formation || '',
    coach: team.coach || '',
    lineupRows: parseLineupRows(
      Array.isArray(team.lineup) && team.lineup.length
        ? team.lineup
        : team.lineupText || team.alineacion || team.lineup,
    ),
    score: team.score ?? '',
    halfTimeScore: team.halfTimeScore ?? '',
  });
  const normalizeGroup = (source, keys) => Object.fromEntries(keys.map((key) => [key, source?.[key] ?? '']));
  return {
    ...emptyForm(),
    ...report,
    teamA: normalizeTeam(report.teamA),
    teamB: normalizeTeam(report.teamB),
    dateTime: toLocalDateTime(report.dateTime),
    tournamentId: report.tournamentId?._id || report.tournamentId || '',
    statsA: normalizeGroup(report.statsA, STAT_FIELDS),
    statsB: normalizeGroup(report.statsB, STAT_FIELDS),
    tacticsA: normalizeGroup(report.tacticsA, TACTICAL_FIELDS),
    tacticsB: normalizeGroup(report.tacticsB, TACTICAL_FIELDS),
    setPiecesA: normalizeGroup(report.setPiecesA, SET_PIECE_FIELDS),
    setPiecesB: normalizeGroup(report.setPiecesB, SET_PIECE_FIELDS),
    events: (report.events || []).map(({ minute = '', team = '', type = 'other', player = '', note = '' }) => ({ minute, team, type, player, note })),
  };
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Stepper = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 680px) {
    gap: 4px;
  }
`;

const StepButton = styled.button`
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active, $done }) => $active ? theme.colors.primarySoft : $done ? theme.colors.backgroundAlt : theme.colors.surface};
  color: ${({ theme, $active }) => $active ? theme.colors.primarySoftText : theme.colors.textSecondary};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }

  @media (max-width: 680px) {
    font-size: 0;
    min-height: 8px;
    padding: 0;
    border: 0;
    background: ${({ theme, $active, $done }) => $active || $done ? theme.colors.primary : theme.colors.border};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 2 }) => $columns}, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
`;

const TeamPanel = styled.section`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TeamTitle = styled.h3`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
`;

const LineupEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const LineupHeader = styled.div`
  display: grid;
  grid-template-columns: 28px 64px minmax(0, 1fr) 38px;
  gap: 7px;
  padding: 0 4px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
`;

const LineupRow = styled.div`
  display: grid;
  grid-template-columns: 28px 64px minmax(0, 1fr) 38px;
  gap: 7px;
  align-items: center;

  input { min-width: 0; }
`;

const LineupIndex = styled.span`
  display: grid;
  place-items: center;
  min-height: 38px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primarySoftText};
  font-size: 12px;
  font-weight: 800;
`;

const FocusGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

const FocusOption = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 8px;
  border: 1px solid ${({ theme, $checked }) => $checked ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $checked }) => $checked ? theme.colors.primarySoft : theme.colors.surface};
  color: ${({ theme, $checked }) => $checked ? theme.colors.primarySoftText : theme.colors.text};
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;

  input { position: absolute; opacity: 0; pointer-events: none; }
  &:focus-within { box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const Select = styled.select`
  width: 100%;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 14px;
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.borderFocus}; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const ScoreRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 50px 18px 50px 1fr;
  align-items: center;
  gap: 8px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;

  input { text-align: center; padding-inline: 4px; font-size: 18px; font-weight: 800; }

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) 44px 10px 44px minmax(0, 1fr);
    gap: 4px;
    font-size: 12px;
  }
`;

const StatsTable = styled.div`
  display: grid;
  grid-template-columns: minmax(90px, 1fr) 80px 80px;
  gap: 8px;
  align-items: center;

  > strong { color: ${({ theme }) => theme.colors.text}; font-size: 13px; text-align: center; }
  > span { color: ${({ theme }) => theme.colors.textSecondary}; font-size: 13px; }
  input { text-align: center; }
`;

const EventRow = styled.div`
  display: grid;
  grid-template-columns: 76px 100px 150px minmax(120px, 1fr) minmax(160px, 1.5fr) 38px;
  gap: 8px;
  align-items: center;

  @media (max-width: 900px) { grid-template-columns: 70px 88px 1fr 38px; }
  @media (max-width: 540px) { grid-template-columns: 62px 82px 1fr 38px; }

  .event-player, .event-note {
    @media (max-width: 900px) { grid-column: span 2; }
    @media (max-width: 540px) { grid-column: 1 / -1; }
  }
`;

const RemoveButton = styled.button`
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.error};
  cursor: pointer;
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const Help = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  line-height: 1.45;
`;

const ErrorBox = styled.div`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.errorSoft};
  color: ${({ theme }) => theme.colors.errorSoftText};
  font-size: 13px;
  font-weight: 600;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;

  > div { display: flex; gap: 8px; }
`;

export default function OpponentMatchReportFormModal({ open, onClose, report, selectedTeam, tournaments = [], rivals = [], onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(fromReport(report));
    setStep(0);
    setError('');
  }, [open, report]);

  const rivalNames = useMemo(() => rivals.map((rival) => rival.nombre).filter(Boolean), [rivals]);
  const update = (path, value) => {
    setForm((current) => {
      const next = structuredClone(current);
      const keys = path.split('.');
      let target = next;
      keys.slice(0, -1).forEach((key) => { target = target[key]; });
      target[keys.at(-1)] = value;
      return next;
    });
  };

  const updateTeamName = (side, name) => {
    const match = rivals.find((rival) => rival.nombre?.trim().toLowerCase() === name.trim().toLowerCase());
    setForm((current) => ({
      ...current,
      [side]: { ...current[side], name, rivalId: match?._id || null, shield: match?.escudo || '' },
    }));
  };

  const handleTournament = (id) => {
    const tournament = tournaments.find((item) => item._id === id);
    setForm((current) => ({
      ...current,
      tournamentId: id,
      competitionName: tournament ? tournament.nombre : current.competitionName,
      competitionType: tournament ? 'tournament' : current.competitionType,
    }));
  };

  const addEvent = () => setForm((current) => ({
    ...current,
    events: [...current.events, { minute: '', team: '', type: 'other', player: '', note: '' }],
  }));
  const updateEvent = (index, key, value) => setForm((current) => ({
    ...current,
    events: current.events.map((event, eventIndex) => eventIndex === index ? { ...event, [key]: value } : event),
  }));
  const removeEvent = async (index) => {
    const event = form.events[index];
    const label = [event?.minute, event?.player, event?.note].filter(Boolean).join(' · ') || t('opponentMatch.fields.eventType');
    const confirmed = await confirmAction(
      t('opponentMatch.confirmRemoveEvent', { event: label }),
      { title: t('opponentMatch.removeEventTitle'), destructive: true },
    );
    if (confirmed) setForm((current) => ({ ...current, events: current.events.filter((_, eventIndex) => eventIndex !== index) }));
  };
  const addLineupPlayer = (side) => update(`${side}.lineupRows`, [...form[side].lineupRows, { number: '', name: '' }]);
  const updateLineupPlayer = (side, index, key, value) => update(`${side}.lineupRows`, form[side].lineupRows.map((player, playerIndex) => playerIndex === index ? { ...player, [key]: value } : player));
  const removeLineupPlayer = async (side, index) => {
    const player = form[side].lineupRows[index];
    const name = player?.name?.trim() || t('opponentMatch.fields.playerName');
    const confirmed = await confirmAction(
      t('opponentMatch.confirmRemovePlayer', { name }),
      { title: t('opponentMatch.removePlayerTitle'), destructive: true },
    );
    if (confirmed) update(`${side}.lineupRows`, form[side].lineupRows.filter((_, playerIndex) => playerIndex !== index));
  };

  const validateMatch = () => {
    if (!form.teamA.name.trim() || !form.teamB.name.trim()) {
      setError(t('opponentMatch.validation.teamsRequired'));
      return false;
    }
    if (form.teamA.name.trim().toLowerCase() === form.teamB.name.trim().toLowerCase()) {
      setError(t('opponentMatch.validation.differentTeams'));
      return false;
    }
    setError('');
    return true;
  };

  const goNext = () => {
    if (step === 0 && !validateMatch()) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validateMatch()) { setStep(0); return; }
    const normalizeStats = (stats) => Object.fromEntries(STAT_FIELDS.map((key) => [key, toNumberOrNull(stats[key])]));
    const normalizeTeam = (team) => ({
      name: team.name.trim(),
      rivalId: team.rivalId || null,
      shield: team.shield || '',
      formation: team.formation,
      coach: team.coach.trim(),
      lineup: serializeLineup(team.lineupRows),
      score: toNumberOrNull(team.score),
      halfTimeScore: toNumberOrNull(team.halfTimeScore),
    });
    const payload = {
      ...form,
      team: selectedTeam._id,
      teamA: normalizeTeam(form.teamA),
      teamB: normalizeTeam(form.teamB),
      dateTime: form.dateTime ? new Date(form.dateTime).toISOString() : null,
      tournamentId: form.tournamentId || null,
      statsA: normalizeStats(form.statsA),
      statsB: normalizeStats(form.statsB),
      events: form.events.filter((item) => item.minute || item.player || item.note),
    };
    try {
      setSaving(true);
      setError('');
      await onSave(payload, report?._id);
      onClose();
    } catch (saveError) {
      setError(saveError.message || t('opponentMatch.errors.save'));
    } finally {
      setSaving(false);
    }
  };

  const teamName = (side) => form[side].name || t(`opponentMatch.${side}`);
  const stepLabel = (key) => t(`opponentMatch.steps.${key}`);

  const footer = (
    <Footer>
      <Button type="button" $variant="secondary" onClick={step === 0 ? onClose : () => setStep((current) => current - 1)} disabled={saving}>
        {step > 0 && <MdArrowBack aria-hidden="true" />}
        {step === 0 ? t('common.cancel') : t('opponentMatch.actions.back')}
      </Button>
      <div>
        {step < STEPS.length - 1 ? (
          <Button type="button" $variant="primary" onClick={goNext}>
            {t('opponentMatch.actions.next')} <MdArrowForward aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" form="opponent-match-report-form" $variant="primary" disabled={saving}>
            <MdSave aria-hidden="true" /> {saving ? t('common.saving') : t('common.save')}
          </Button>
        )}
      </div>
    </Footer>
  );

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={report ? t('opponentMatch.editTitle') : t('opponentMatch.createTitle')}
      width={FORM_MODAL_WIDTH}
      footer={footer}
    >
      <Form id="opponent-match-report-form" onSubmit={submit}>
        <Stepper aria-label={t('opponentMatch.formProgress')}>
          {STEPS.map((item, index) => (
            <li key={item}>
              <StepButton type="button" $active={step === index} $done={step > index} onClick={() => index === 0 || validateMatch() ? setStep(index) : null} aria-current={step === index ? 'step' : undefined}>
                {index + 1}. {stepLabel(item)}
              </StepButton>
            </li>
          ))}
        </Stepper>

        {error && <ErrorBox role="alert">{error}</ErrorBox>}

        {step === 0 && (
          <Section>
            <Grid>
              {['teamA', 'teamB'].map((side) => (
                <TeamPanel key={side}>
                  <TeamTitle>{t(`opponentMatch.${side}`)}</TeamTitle>
                  <Field>
                    <Label htmlFor={`${side}-name`}>{t('opponentMatch.fields.teamName')} *</Label>
                    <Input id={`${side}-name`} list="opponent-rivals" value={form[side].name} onChange={(event) => updateTeamName(side, event.target.value)} maxLength={120} required />
                  </Field>
                  <Field>
                    <Label htmlFor={`${side}-coach`}>{t('opponentMatch.fields.coach')}</Label>
                    <Input id={`${side}-coach`} value={form[side].coach} onChange={(event) => update(`${side}.coach`, event.target.value)} maxLength={120} />
                  </Field>
                </TeamPanel>
              ))}
            </Grid>
            <datalist id="opponent-rivals">{rivalNames.map((name) => <option key={name} value={name} />)}</datalist>

            <Field>
              <Label>{t('opponentMatch.fields.focusTeam')}</Label>
              <FocusGroup>
                {['A', 'B', 'BOTH'].map((value) => (
                  <FocusOption key={value} $checked={form.focusTeam === value}>
                    <input type="radio" name="focusTeam" value={value} checked={form.focusTeam === value} onChange={(event) => update('focusTeam', event.target.value)} />
                    {value === 'A' ? teamName('teamA') : value === 'B' ? teamName('teamB') : t('opponentMatch.bothTeams')}
                  </FocusOption>
                ))}
              </FocusGroup>
              <Help>{t('opponentMatch.fields.focusTeamHelp')}</Help>
            </Field>

            <Section>
              <SectionTitle>{t('opponentMatch.sections.matchContext')}</SectionTitle>
              <Grid $columns={3}>
                <Field>
                  <Label htmlFor="report-date">{t('opponentMatch.fields.dateTime')}</Label>
                  <Input id="report-date" type="datetime-local" value={form.dateTime} onChange={(event) => update('dateTime', event.target.value)} />
                </Field>
                <Field>
                  <Label htmlFor="report-venue">{t('opponentMatch.fields.venue')}</Label>
                  <Input id="report-venue" value={form.venue} onChange={(event) => update('venue', event.target.value)} maxLength={180} />
                </Field>
                <Field>
                  <Label htmlFor="report-watched-via">{t('opponentMatch.fields.watchedVia')}</Label>
                  <Select id="report-watched-via" value={form.watchedVia} onChange={(event) => update('watchedVia', event.target.value)}>
                    {['live', 'video', 'tv', 'other'].map((value) => <option key={value} value={value}>{t(`opponentMatch.watchedVia.${value}`)}</option>)}
                  </Select>
                </Field>
              </Grid>
              <Grid $columns={3}>
                <Field>
                  <Label htmlFor="report-tournament">{t('opponentMatch.fields.tournament')}</Label>
                  <Select id="report-tournament" value={form.tournamentId} onChange={(event) => handleTournament(event.target.value)}>
                    <option value="">{t('opponentMatch.manualCompetition')}</option>
                    {tournaments.map((tournament) => <option key={tournament._id} value={tournament._id}>{tournament.nombre}</option>)}
                  </Select>
                </Field>
                {!form.tournamentId && (
                  <Field>
                    <Label htmlFor="report-competition-type">{t('opponentMatch.fields.matchType')}</Label>
                    <Select id="report-competition-type" value={form.competitionType} onChange={(event) => update('competitionType', event.target.value)}>
                      {['league', 'cup', 'tournament', 'friendly', 'training', 'other'].map((value) => <option key={value} value={value}>{t(`opponentMatch.competitionTypes.${value}`)}</option>)}
                    </Select>
                  </Field>
                )}
                <Field>
                  <Label htmlFor="report-competition">{t('opponentMatch.fields.competitionName')}</Label>
                  <Input id="report-competition" value={form.competitionName} onChange={(event) => update('competitionName', event.target.value)} disabled={Boolean(form.tournamentId)} maxLength={160} placeholder={t('opponentMatch.placeholders.competition')} />
                </Field>
                <Field>
                  <Label htmlFor="report-stage">{t('opponentMatch.fields.stage')}</Label>
                  <Input id="report-stage" value={form.stage} onChange={(event) => update('stage', event.target.value)} maxLength={120} placeholder={t('opponentMatch.placeholders.stage')} />
                </Field>
              </Grid>
            </Section>

            <Section>
              <SectionTitle>{t('opponentMatch.sections.score')}</SectionTitle>
              <ScoreRow>
                <span>{teamName('teamA')}</span>
                <Input aria-label={t('opponentMatch.fields.teamScore', { team: teamName('teamA') })} type="number" min="0" max="99" value={form.teamA.score} onChange={(event) => update('teamA.score', event.target.value)} />
                <span>–</span>
                <Input aria-label={t('opponentMatch.fields.teamScore', { team: teamName('teamB') })} type="number" min="0" max="99" value={form.teamB.score} onChange={(event) => update('teamB.score', event.target.value)} />
                <span>{teamName('teamB')}</span>
              </ScoreRow>
              <Help>{t('opponentMatch.fields.halfTimeScore')}</Help>
              <ScoreRow>
                <span>{teamName('teamA')}</span>
                <Input aria-label={t('opponentMatch.fields.teamHalfTimeScore', { team: teamName('teamA') })} type="number" min="0" max="99" value={form.teamA.halfTimeScore} onChange={(event) => update('teamA.halfTimeScore', event.target.value)} />
                <span>–</span>
                <Input aria-label={t('opponentMatch.fields.teamHalfTimeScore', { team: teamName('teamB') })} type="number" min="0" max="99" value={form.teamB.halfTimeScore} onChange={(event) => update('teamB.halfTimeScore', event.target.value)} />
                <span>{teamName('teamB')}</span>
              </ScoreRow>
            </Section>
          </Section>
        )}

        {step === 1 && (
          <Section>
            <Grid>
              {['teamA', 'teamB'].map((side) => (
                <TeamPanel key={side}>
                  <TeamTitle>{teamName(side)}</TeamTitle>
                  <Field>
                    <Label htmlFor={`${side}-formation`}>{t('opponentMatch.fields.formation')}</Label>
                    <Select id={`${side}-formation`} value={form[side].formation} onChange={(event) => update(`${side}.formation`, event.target.value)}>
                      <option value="">{t('common.select')}</option>
                      {ALINEACIONES.map((formation) => <option key={formation} value={formation}>{formation}</option>)}
                    </Select>
                  </Field>
                  <Field>
                    <Label>{t('opponentMatch.fields.lineup')}</Label>
                    <LineupEditor aria-label={t('opponentMatch.fields.lineup')}>
                      <LineupHeader>
                        <span>#</span>
                        <span>{t('opponentMatch.fields.shirtNumber')}</span>
                        <span>{t('opponentMatch.fields.playerName')}</span>
                        <span />
                      </LineupHeader>
                      {form[side].lineupRows.map((player, index) => (
                        <LineupRow key={`${side}-lineup-${index}`}>
                          <LineupIndex aria-hidden="true">{index + 1}</LineupIndex>
                          <Input
                            aria-label={`${t('opponentMatch.fields.shirtNumber')} ${index + 1}`}
                            type="number"
                            min="1"
                            max="99"
                            inputMode="numeric"
                            value={player.number}
                            onChange={(event) => updateLineupPlayer(side, index, 'number', event.target.value)}
                            placeholder={t('opponentMatch.placeholders.shirtNumber')}
                          />
                          <Input
                            aria-label={`${t('opponentMatch.fields.playerName')} ${index + 1}`}
                            value={player.name}
                            onChange={(event) => updateLineupPlayer(side, index, 'name', event.target.value)}
                            placeholder={t('opponentMatch.placeholders.playerName')}
                            maxLength={160}
                          />
                          <RemoveButton type="button" onClick={() => removeLineupPlayer(side, index)} aria-label={`${t('opponentMatch.actions.removePlayer')} ${index + 1}`}><MdDeleteOutline aria-hidden="true" /></RemoveButton>
                        </LineupRow>
                      ))}
                      <Button type="button" $variant="secondary" onClick={() => addLineupPlayer(side)}><MdAdd aria-hidden="true" /> {t('opponentMatch.actions.addPlayer')}</Button>
                    </LineupEditor>
                    <Help>{t('opponentMatch.fields.lineupHelp')}</Help>
                  </Field>
                </TeamPanel>
              ))}
            </Grid>

            <Section>
              <SectionTitle>{t('opponentMatch.sections.stats')}</SectionTitle>
              <StatsTable>
                <span />
                <strong>{teamName('teamA')}</strong>
                <strong>{teamName('teamB')}</strong>
                {STAT_FIELDS.map((field) => [
                  <span key={`${field}-label`}>{t(`opponentMatch.stats.${field}`)}</span>,
                  <Input key={`${field}-a`} aria-label={`${t(`opponentMatch.stats.${field}`)} ${teamName('teamA')}`} type="number" min="0" max={field === 'possession' ? 100 : 999} value={form.statsA[field]} onChange={(event) => update(`statsA.${field}`, event.target.value)} />,
                  <Input key={`${field}-b`} aria-label={`${t(`opponentMatch.stats.${field}`)} ${teamName('teamB')}`} type="number" min="0" max={field === 'possession' ? 100 : 999} value={form.statsB[field]} onChange={(event) => update(`statsB.${field}`, event.target.value)} />,
                ])}
              </StatsTable>
            </Section>

            <Section>
              <TeamTitle>
                {t('opponentMatch.sections.timeline')}
                <Button type="button" $variant="secondary" onClick={addEvent}><MdAdd aria-hidden="true" /> {t('opponentMatch.actions.addEvent')}</Button>
              </TeamTitle>
              {form.events.length === 0 ? <Help>{t('opponentMatch.emptyTimeline')}</Help> : form.events.map((item, index) => (
                <EventRow key={index}>
                  <Input aria-label={t('opponentMatch.fields.minute')} value={item.minute} onChange={(event) => updateEvent(index, 'minute', event.target.value)} placeholder="45+2" maxLength={8} />
                  <Select aria-label={t('opponentMatch.fields.eventTeam')} value={item.team} onChange={(event) => updateEvent(index, 'team', event.target.value)}>
                    <option value="">–</option>
                    <option value="A">{teamName('teamA')}</option>
                    <option value="B">{teamName('teamB')}</option>
                  </Select>
                  <Select aria-label={t('opponentMatch.fields.eventType')} value={item.type} onChange={(event) => updateEvent(index, 'type', event.target.value)}>
                    {['goal', 'chance', 'card', 'substitution', 'injury', 'tactical', 'set_piece', 'other'].map((value) => <option key={value} value={value}>{t(`opponentMatch.eventTypes.${value}`)}</option>)}
                  </Select>
                  <Input className="event-player" aria-label={t('opponentMatch.fields.player')} value={item.player} onChange={(event) => updateEvent(index, 'player', event.target.value)} placeholder={t('opponentMatch.placeholders.player')} maxLength={120} />
                  <Input className="event-note" aria-label={t('opponentMatch.fields.eventNote')} value={item.note} onChange={(event) => updateEvent(index, 'note', event.target.value)} placeholder={t('opponentMatch.placeholders.eventNote')} maxLength={500} />
                  <RemoveButton type="button" onClick={() => removeEvent(index)} aria-label={t('opponentMatch.actions.removeEvent')}><MdDeleteOutline aria-hidden="true" /></RemoveButton>
                </EventRow>
              ))}
            </Section>
          </Section>
        )}

        {step === 2 && (
          <Grid>
            {['A', 'B'].map((letter) => {
              const side = `team${letter}`;
              const group = `tactics${letter}`;
              return (
                <TeamPanel key={letter}>
                  <TeamTitle>{teamName(side)}</TeamTitle>
                  {TACTICAL_FIELDS.map((field) => (
                    <Field key={field}>
                      <Label htmlFor={`${group}-${field}`}>{t(`opponentMatch.tactics.${field}`)}</Label>
                      <TextArea id={`${group}-${field}`} rows={field === 'keyPlayers' ? 2 : 3} value={form[group][field]} onChange={(event) => update(`${group}.${field}`, event.target.value)} placeholder={t(`opponentMatch.placeholders.tactics.${field}`)} />
                    </Field>
                  ))}
                </TeamPanel>
              );
            })}
          </Grid>
        )}

        {step === 3 && (
          <Section>
            <Grid>
              {['A', 'B'].map((letter) => {
                const side = `team${letter}`;
                const group = `setPieces${letter}`;
                return (
                  <TeamPanel key={letter}>
                    <TeamTitle>{t('opponentMatch.sections.setPiecesTeam', { team: teamName(side) })}</TeamTitle>
                    {SET_PIECE_FIELDS.map((field) => (
                      <Field key={field}>
                        <Label htmlFor={`${group}-${field}`}>{t(`opponentMatch.setPieces.${field}`)}</Label>
                        <TextArea id={`${group}-${field}`} rows={3} value={form[group][field]} onChange={(event) => update(`${group}.${field}`, event.target.value)} placeholder={t(`opponentMatch.placeholders.setPieces.${field}`)} />
                      </Field>
                    ))}
                  </TeamPanel>
                );
              })}
            </Grid>
            <Field>
              <Label htmlFor="report-summary">{t('opponentMatch.fields.summary')}</Label>
              <TextArea id="report-summary" rows={4} value={form.summary} onChange={(event) => update('summary', event.target.value)} placeholder={t('opponentMatch.placeholders.summary')} />
            </Field>
            <Field>
              <Label htmlFor="report-game-plan">{t('opponentMatch.fields.gamePlan')}</Label>
              <TextArea id="report-game-plan" rows={5} value={form.gamePlan} onChange={(event) => update('gamePlan', event.target.value)} placeholder={t('opponentMatch.placeholders.gamePlan')} />
            </Field>
            <Grid>
              <Field>
                <Label htmlFor="report-video">{t('opponentMatch.fields.videoUrl')}</Label>
                <Input id="report-video" type="url" value={form.videoUrl} onChange={(event) => update('videoUrl', event.target.value)} placeholder="https://" maxLength={2000} />
              </Field>
              <Field>
                <Label htmlFor="report-status">{t('opponentMatch.fields.status')}</Label>
                <Select id="report-status" value={form.status} onChange={(event) => update('status', event.target.value)}>
                  <option value="draft">{t('opponentMatch.status.draft')}</option>
                  <option value="completed">{t('opponentMatch.status.completed')}</option>
                </Select>
                <Help>{t('opponentMatch.fields.statusHelp')}</Help>
              </Field>
            </Grid>
          </Section>
        )}
      </Form>
    </Modal>
  );
}
