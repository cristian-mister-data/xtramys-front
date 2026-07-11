import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdHome, MdFlight, MdLocationOn, MdAdd, MdDelete, MdPictureAsPdf,
  MdGroups, MdSportsSoccer, MdEdit,
} from 'react-icons/md';
import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import {
  Button, Field, Label, Input, Row, Stack, ErrorText, TextArea, Muted,
} from '@/ui/primitives';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchTournamentSanctions, fetchTournamentsByTeam } from '@/store/slices/tournament/tournamentThunks';
import { ALINEACIONES_BY_PLAYER_COUNT, getDefaultFormation } from '@/features/matchSheet/formations';
import LineupEditor from '@/features/matchSheet/LineupEditor';
import RivalSelector from '@/features/matchSheet/RivalSelector';
import PlayerSelectionModal from '@/features/matchSheet/modals/PlayerSelectionModal';
import JornadaModal from '@/features/matchSheet/modals/JornadaModal';
import { generateMatchSheetPDF, generateLineupPDF, generateCallUpPDF } from '@/features/matchSheet/pdf';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { KitPreview } from '@/components/shared/KitDesigner';
import { normalizeKits, normalizeRivalKits } from '@/utils/kits';

const EMPTY = [];

const Section = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 14px;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: #1a237e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  border-bottom: 2px solid #1a237e;
  padding-bottom: 6px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Chip = styled.button`
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? '#1a237e' : '#ddd')};
  background: ${({ $active }) => ($active ? '#1a237e' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#333')};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 10px;
  font-size: 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Counter = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  button {
    width: 30px; height: 30px; border-radius: 8px;
    background: #f1f5f9; border: 1px solid #e2e8f0;
    cursor: pointer; font-size: 16px; font-weight: 800;
  }
  .value { min-width: 36px; text-align: center; font-size: 18px; font-weight: 800; color: #1a237e; }
`;

const ScoreRow = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 14px;
  padding: 10px; border-radius: 12px; background: #fafafa;
  .crest { width: 48px; height: 48px; border-radius: 8px; background: #eee; object-fit: cover; }
  .vs { font-size: 18px; font-weight: 800; color: #888; }
`;

const EventRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 6px; background: #fafafa; border-radius: 8px;
`;

const SmallInput = styled(Input)`
  max-width: 70px;
`;

const ListEmpty = styled(Muted)`
  font-size: 12px; padding: 8px; text-align: center;
`;

const isoToLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function computeResultado(gf, gc) {
  if (gf > gc) return 'Victoria';
  if (gf < gc) return 'Derrota';
  return 'Empate';
}

function buildEmpty(playerCount = 11, timePerHalf = 45) {
  return {
    rival: '', rivalId: null, rivalEscudo: null,
    ubicacion: 'local', jornada: null,
    fechaHora: new Date().toISOString(),
    resultado: 'Empate',
    golesFavor: 0, golesContra: 0,
    tiempoPorParte: timePerHalf,
    jugadoresPorEquipo: playerCount,
    alineacion: getDefaultFormation(playerCount), alineacionRival: '',
    notasEntrenador: '',
    competicion: 'liga', torneoId: null,
    descuentoPrimerTiempo: 0, descuentoSegundoTiempo: 0,
    convocados: [], noConvocados: [],
    alineacionTitulares: [], alineacionSuplentes: [],
    goles: [], golesRival: [],
    tarjetasAmarillas: [], tarjetasRojas: [], cambios: [],
    partidoUrl: '',
    equipacionPropiaKey: 'first', equipacionRivalKey: 'first',
    equipacionPropia: null, equipacionRival: null,
    equipacionPorteroPropia: null, equipacionPorteroRival: null,
    rivalEquipaciones: null,
  };
}

export default function MatchSheetFormModal({
  open,
  mode = 'create',
  match = null,
  defaultDate = null,
  loading = false,
  onClose,
  onSubmit,
  onDelete,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const tournaments = useSelector((s) => s.tournament?.tournaments ?? EMPTY);
  const players = useSelector((s) => s.player?.players ?? EMPTY);
  const sanctions = useSelector((s) => s.tournament?.sanctions ?? EMPTY);
  const team = useSelector((s) => s.team?.teams?.find((e) => e.seleccionado) || null);
  const teamId = team?._id;

  const [form, setForm] = useState(() => buildEmpty(match?.jugadoresPorEquipo || team?.jugadoresPorEquipo || 11, match?.tiempoPorParte || team?.tiempoPorParte || 45));
  const [error, setError] = useState('');
  const [playerCount, setPlayerCount] = useState(() => match?.jugadoresPorEquipo || team?.jugadoresPorEquipo || 11);

  // Modals
  const [callupModal, setCallupModal] = useState(false);
  const [noCallupModal, setNoCallupModal] = useState(false);
  const [jornadaModal, setJornadaModal] = useState(false);
  const [scorerModal, setScorerModal] = useState(null); // { type: 'goal'|'yellow'|'red'|'changeOut'|'changeIn', index }
  const [pdfMenu, setPdfMenu] = useState(false);

  // Load players when modal opens
  useEffect(() => {
    if (open && teamId) dispatch(fetchJugadoresEquipo({ team: teamId }));
  }, [open, teamId, dispatch]);

  useEffect(() => {
    if (open && teamId) dispatch(fetchTournamentsByTeam(teamId));
  }, [open, teamId, dispatch]);

  useEffect(() => {
    if (form.torneoId && form.competicion === 'torneo') {
      dispatch(fetchTournamentSanctions(form.torneoId));
    }
  }, [form.torneoId, form.competicion, dispatch]);

  const sanctionedPlayerIds = useMemo(
    () => sanctions.filter((s) => s.sancionado).map((s) => s.playerId),
    [sanctions]
  );

  useEffect(() => {
    if (!open) return;
    const initialPlayerCount = match?.jugadoresPorEquipo || team?.jugadoresPorEquipo || 11;
    const initialTimePerHalf = match?.tiempoPorParte || team?.tiempoPorParte || 45;
    setPlayerCount(initialPlayerCount);
    if (mode === 'edit' && match) {
      setForm({
        ...buildEmpty(initialPlayerCount, initialTimePerHalf),
        ...match,
        tiempoPorParte: initialTimePerHalf,
        jugadoresPorEquipo: initialPlayerCount,
        alineacion: match.alineacion || getDefaultFormation(initialPlayerCount),
        torneoId: match.torneoId?._id || match.torneoId || null,
        rivalId: match.rivalId?._id || match.rivalId || null,
        rivalEquipaciones: match.rivalId?.equipaciones || null,
        fechaHora: match.fechaHora || new Date().toISOString(),
      });
    } else {
      const teamKits = normalizeKits(team?.equipaciones);
      setForm({
        ...buildEmpty(initialPlayerCount, initialTimePerHalf),
        fechaHora: defaultDate || new Date().toISOString(),
        equipacionPropia: teamKits.first,
        equipacionPorteroPropia: teamKits.goalkeeperFirst,
      });
    }
    setError('');
  }, [open, mode, match, defaultDate, team?.jugadoresPorEquipo, team?.tiempoPorParte]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const selectOwnKit = (key) => {
    const kits = normalizeKits(team?.equipaciones);
    update({ equipacionPropiaKey: key, equipacionPropia: kits[key], equipacionPorteroPropia: kits[key === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'] });
  };
  const selectRivalKit = (key, source = form.rivalEquipaciones) => {
    const kits = normalizeRivalKits(source);
    update({ equipacionRivalKey: key, equipacionRival: kits[key], equipacionPorteroRival: kits[key === 'second' ? 'goalkeeperSecond' : 'goalkeeperFirst'] });
  };

  // Auto resultado
  useEffect(() => {
    update({ resultado: computeResultado(form.golesFavor || 0, form.golesContra || 0) });
  }, [form.golesFavor, form.golesContra]);

  const formationOptions = useMemo(
    () => ALINEACIONES_BY_PLAYER_COUNT[playerCount] || [],
    [playerCount]
  );

  // Auto-update suplentes when convocados changes
  const handleConvocadosChange = (ids) => {
    const noCallups = form.noConvocados.filter((id) => !ids.includes(id));
    const titulares = form.alineacionTitulares.filter((id) => ids.includes(id));
    const suplentes = ids.filter((id) => !titulares.includes(id));
    update({ convocados: ids, noConvocados: noCallups, alineacionTitulares: titulares, alineacionSuplentes: suplentes });
  };

  const handleNoCallupsChange = (ids) => {
    const callups = form.convocados.filter((id) => !ids.includes(id));
    update({ noConvocados: ids, convocados: callups });
  };

  const handleLineupChange = ({ titulares, suplentes }) => {
    update({ alineacionTitulares: titulares, alineacionSuplentes: suplentes });
  };

  // ---------- Event helpers ----------
  const addGoal = () => update({ goles: [...form.goles, { jugador: null, asistente: null, minuto: 0, tipo: 'normal' }] });
  const removeGoal = (i) => update({ goles: form.goles.filter((_, k) => k !== i) });
  const updateGoal = (i, patch) => update({ goles: form.goles.map((g, k) => (k === i ? { ...g, ...patch } : g)) });

  const addRivalGoal = () => update({ golesRival: [...(form.golesRival || []), { minuto: 0 }] });
  const removeRivalGoal = (i) => update({ golesRival: form.golesRival.filter((_, k) => k !== i) });
  const updateRivalGoal = (i, patch) => update({ golesRival: form.golesRival.map((g, k) => (k === i ? { ...g, ...patch } : g)) });

  const addYellow = () => update({ tarjetasAmarillas: [...form.tarjetasAmarillas, { jugador: null, minuto: 0, motivo: '' }] });
  const removeYellow = (i) => update({ tarjetasAmarillas: form.tarjetasAmarillas.filter((_, k) => k !== i) });
  const updateYellow = (i, patch) => update({ tarjetasAmarillas: form.tarjetasAmarillas.map((c, k) => (k === i ? { ...c, ...patch } : c)) });

  const addRed = () => update({ tarjetasRojas: [...form.tarjetasRojas, { jugador: null, minuto: 0, motivo: '' }] });
  const removeRed = (i) => update({ tarjetasRojas: form.tarjetasRojas.filter((_, k) => k !== i) });
  const updateRed = (i, patch) => update({ tarjetasRojas: form.tarjetasRojas.map((c, k) => (k === i ? { ...c, ...patch } : c)) });

  const addChange = () => update({ cambios: [...form.cambios, { minuto: 0, sale: null, entra: null }] });
  const removeChange = (i) => update({ cambios: form.cambios.filter((_, k) => k !== i) });
  const updateChange = (i, patch) => update({ cambios: form.cambios.map((c, k) => (k === i ? { ...c, ...patch } : c)) });

  const playerLabel = (id) => {
    const p = players.find((x) => x._id === id);
    return p ? `${p.dorsal ?? '?'} · ${getPlayerFullName(p)}` : t('matchSheet.selectPlayer', 'Selecciona...');
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    setError('');
    if (!form.rival?.trim()) return setError(t('matchSheet.rivalRequired', 'El rival es obligatorio'));
    if (!form.fechaHora) return setError(t('matchSheet.dateRequired', 'La fecha es obligatoria'));
    if (form.competicion === 'torneo' && !form.torneoId) return setError(t('matchSheet.tournamentRequired', 'Selecciona un torneo'));
    onSubmit?.({ ...form, tiempoPorParte: team?.tiempoPorParte || form.tiempoPorParte || 45, jugadoresPorEquipo: playerCount });
  };

  const handlePDF = (kind) => {
    setPdfMenu(false);
    if (kind === 'full') generateMatchSheetPDF(form, players, team, t);
    if (kind === 'lineup') generateLineupPDF(form, players, team, {}, t);
    if (kind === 'callup') generateCallUpPDF(form, players, team, {}, t);
  };

  const callupPlayers = useMemo(
    () => players.filter((p) => form.convocados.includes(p._id) || form.alineacionSuplentes.includes(p._id) || form.alineacionTitulares.includes(p._id)),
    [players, form.convocados, form.alineacionSuplentes, form.alineacionTitulares]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? t('matchSheet.edit', 'Editar partido') : t('matchSheet.create', 'Nuevo partido')}
      width={FORM_MODAL_WIDTH}
      footer={
        <Row style={{ justifyContent: 'space-between', width: '100%' }}>
          <Row $gap={6}>
            {mode === 'edit' ? (
              <Button type="button" $variant="danger" onClick={() => onDelete?.(match)}>
                <MdDelete /> {t('common.delete', 'Eliminar')}
              </Button>
            ) : null}
            {mode === 'edit' ? (
              <div style={{ position: 'relative' }}>
                <Button type="button" $variant="ghost" onClick={() => setPdfMenu(!pdfMenu)}>
                  <MdPictureAsPdf /> PDF
                </Button>
                {pdfMenu ? (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                    background: '#fff', border: '1px solid #ddd', borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 180,
                  }}>
                    <button type="button" onClick={() => handlePDF('full')} style={pdfBtnStyle}>{t('matchSheet.pdf.fullSheet', 'Ficha completa')}</button>
                    <button type="button" onClick={() => handlePDF('lineup')} style={pdfBtnStyle}>{t('matchSheet.pdf.lineup', 'Alineación')}</button>
                    <button type="button" onClick={() => handlePDF('callup')} style={pdfBtnStyle}>{t('matchSheet.pdf.callup', 'Convocatoria')}</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Row>
          <Row $gap={8}>
            <Button type="button" $variant="ghost" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? t('common.saving', 'Guardando...') : (mode === 'edit' ? t('common.save', 'Guardar') : t('common.create', 'Crear'))}
            </Button>
          </Row>
        </Row>
      }
    >
      <Stack $gap={0}>
        {/* SECTION 1: Match data */}
        <Section>
          <SectionHead><MdSportsSoccer /> {t('matchSheet.section.match', 'Datos del partido')}</SectionHead>

          <ScoreRow>
            {team?.escudo ? <img className="crest" src={team.escudo} alt="" /> : <div className="crest" />}
            <Counter>
              <button type="button" onClick={() => update({ golesFavor: Math.max(0, (form.golesFavor || 0) - 1) })}>−</button>
              <div className="value">{form.golesFavor ?? 0}</div>
              <button type="button" onClick={() => update({ golesFavor: (form.golesFavor || 0) + 1 })}>+</button>
            </Counter>
            <span className="vs">–</span>
            <Counter>
              <button type="button" onClick={() => update({ golesContra: Math.max(0, (form.golesContra || 0) - 1) })}>−</button>
              <div className="value">{form.golesContra ?? 0}</div>
              <button type="button" onClick={() => update({ golesContra: (form.golesContra || 0) + 1 })}>+</button>
            </Counter>
            {form.rivalEscudo ? <img className="crest" src={form.rivalEscudo} alt="" /> : <div className="crest" />}
          </ScoreRow>

          <Grid style={{ marginTop: 12 }}>
            <Field>
              <Label>{t('matchSheet.fields.rival', 'Rival')}</Label>
              <RivalSelector
                selectedRivalId={form.rivalId}
                selectedRivalName={form.rival}
                selectedRivalCrest={form.rivalEscudo}
                teamId={teamId}
                onSelect={(payload) => {
                  const kits = normalizeRivalKits(payload.rivalEquipaciones);
                  update({ ...payload, equipacionRivalKey: 'first', equipacionRival: kits.first, equipacionPorteroRival: kits.goalkeeperFirst });
                }}
              />
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.ownKit', 'Equipación propia')}</Label>
              <ChipRow>
                {['first', 'second'].map((key) => <Chip key={key} type="button" $active={form.equipacionPropiaKey === key} onClick={() => selectOwnKit(key)}>
                  <KitPreview kit={normalizeKits(team?.equipaciones)[key]} />
                  {t(`kits.${key}`, key === 'first' ? 'Primera' : 'Segunda')}
                </Chip>)}
              </ChipRow>
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.rivalKit', 'Equipación rival')}</Label>
              <ChipRow>
                {['first', 'second'].map((key) => <Chip key={key} type="button" $active={form.equipacionRivalKey === key} onClick={() => selectRivalKit(key)}>
                  <KitPreview kit={normalizeRivalKits(form.rivalEquipaciones)[key]} />
                  {t(`kits.${key}`, key === 'first' ? 'Primera' : 'Segunda')}
                </Chip>)}
              </ChipRow>
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.dateTime', 'Fecha y hora')}</Label>
              <Input
                type="datetime-local"
                value={isoToLocal(form.fechaHora)}
                onChange={(e) => update({ fechaHora: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.location', 'Ubicación')}</Label>
              <ChipRow>
                {[
                  { v: 'local', icon: <MdHome />, label: t('matchSheet.local', 'Local') },
                  { v: 'visitante', icon: <MdFlight />, label: t('matchSheet.visitor', 'Visitante') },
                  { v: 'neutral', icon: <MdLocationOn />, label: t('matchSheet.neutral', 'Neutral') },
                ].map((opt) => (
                  <Chip key={opt.v} type="button" $active={form.ubicacion === opt.v} onClick={() => update({ ubicacion: opt.v })}>
                    {opt.icon} {opt.label}
                  </Chip>
                ))}
              </ChipRow>
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.competition', 'Competición')}</Label>
              <ChipRow>
                {['liga', 'torneo', 'amistoso'].map((c) => (
                  <Chip key={c} type="button" $active={form.competicion === c} onClick={() => update({ competicion: c, torneoId: c === 'torneo' ? form.torneoId : null })}>
                    {t(`matchSheet.${c}`, c)}
                  </Chip>
                ))}
              </ChipRow>
            </Field>
            {form.competicion === 'torneo' ? (
              <Field style={{ gridColumn: '1 / -1' }}>
                <Label>{t('matchSheet.fields.tournament', 'Torneo')}</Label>
                <Select value={form.torneoId || ''} onChange={(e) => update({ torneoId: e.target.value || null })}>
                  <option value="">{t('matchSheet.tournamentNone', '— Selecciona torneo —')}</option>
                  {tournaments.map((tr) => (
                    <option key={tr._id} value={tr._id}>{tr.nombre}</option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field>
              <Label>{t('matchSheet.fields.matchday', 'Jornada')}</Label>
              <Button type="button" $variant="ghost" onClick={() => setJornadaModal(true)}>
                {form.jornada ? `J${form.jornada}` : t('matchSheet.selectMatchday', 'Selecciona')}
              </Button>
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.playerCount', 'Modalidad')}</Label>
              <ChipRow>
                {[7, 8, 11].map((n) => (
                  <Chip key={n} type="button" $active={playerCount === n} onClick={() => {
                    setPlayerCount(n);
                    update({ jugadoresPorEquipo: n, alineacion: getDefaultFormation(n) });
                  }}>F{n}</Chip>
                ))}
              </ChipRow>
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.formation', 'Alineación propia')}</Label>
              <Select value={form.alineacion || ''} onChange={(e) => update({ alineacion: e.target.value })}>
                {formationOptions.map((f) => (<option key={f} value={f}>{f}</option>))}
              </Select>
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.rivalFormation', 'Alineación rival')}</Label>
              <Input value={form.alineacionRival || ''} onChange={(e) => update({ alineacionRival: e.target.value })} placeholder="1-4-4-2" />
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.extraTime1', 'Descuento 1ºT (min)')}</Label>
              <Counter>
                <button type="button" onClick={() => update({ descuentoPrimerTiempo: Math.max(0, (form.descuentoPrimerTiempo || 0) - 1) })}>−</button>
                <div className="value">{form.descuentoPrimerTiempo || 0}</div>
                <button type="button" onClick={() => update({ descuentoPrimerTiempo: Math.min(15, (form.descuentoPrimerTiempo || 0) + 1) })}>+</button>
              </Counter>
            </Field>
            <Field>
              <Label>{t('matchSheet.fields.extraTime2', 'Descuento 2ºT (min)')}</Label>
              <Counter>
                <button type="button" onClick={() => update({ descuentoSegundoTiempo: Math.max(0, (form.descuentoSegundoTiempo || 0) - 1) })}>−</button>
                <div className="value">{form.descuentoSegundoTiempo || 0}</div>
                <button type="button" onClick={() => update({ descuentoSegundoTiempo: Math.min(15, (form.descuentoSegundoTiempo || 0) + 1) })}>+</button>
              </Counter>
            </Field>
          </Grid>
        </Section>

        {/* SECTION 2: Callup + Lineup */}
        <Section>
          <SectionHead><MdGroups /> {t('matchSheet.section.callup', 'Convocatoria y alineación')}</SectionHead>
          <Row $gap={8} style={{ marginBottom: 12, flexWrap: 'wrap' }}>
            <Button type="button" $variant="ghost" onClick={() => setCallupModal(true)}>
              {t('matchSheet.callups', 'Convocados')} ({form.convocados.length})
            </Button>
            <Button type="button" $variant="ghost" onClick={() => setNoCallupModal(true)}>
              {t('matchSheet.notCalledUp', 'No convocados')} ({form.noConvocados.length})
            </Button>
          </Row>
          {form.convocados.length === 0 ? (
            <Muted>{t('matchSheet.selectCallupsFirst', 'Selecciona los convocados para empezar la alineación')}</Muted>
          ) : (
            <LineupEditor
              players={players}
              convocadosIds={form.convocados}
              titularesIds={form.alineacionTitulares}
              suplentesIds={form.alineacionSuplentes}
              playerCount={playerCount}
              formation={form.alineacion}
              onChange={handleLineupChange}
            />
          )}
        </Section>

        {/* SECTION 3: Events */}
        <Section>
          <SectionHead><MdSportsSoccer /> {t('matchSheet.section.events', 'Eventos del partido')}</SectionHead>

          {/* Goles */}
          <div style={{ marginBottom: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Label>{t('matchSheet.fields.goalsFor', 'Goles')} ({form.goles.length})</Label>
              <Button type="button" $variant="ghost" onClick={addGoal} disabled={!callupPlayers.length}><MdAdd /> {t('common.add', 'Añadir')}</Button>
            </Row>
            <Stack $gap={6}>
              {form.goles.length === 0 ? <ListEmpty>{t('common.empty', 'Sin datos')}</ListEmpty> : null}
              {form.goles.map((g, i) => (
                <EventRow key={i}>
                  <SmallInput type="number" min="0" max="120" value={g.minuto} onChange={(e) => updateGoal(i, { minuto: parseInt(e.target.value, 10) || 0 })} />
                  <Button type="button" $variant="ghost" style={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => setScorerModal({ type: 'goal', index: i })}>
                    {playerLabel(g.jugador)}
                  </Button>
                  <Select style={{ maxWidth: 110 }} value={g.tipo || 'normal'} onChange={(e) => updateGoal(i, { tipo: e.target.value })}>
                    <option value="normal">{t('matchSheet.goalNormal', 'Normal')}</option>
                    <option value="penalti">{t('matchSheet.goalPenalty', 'Penalti')}</option>
                    <option value="falta">{t('matchSheet.goalFK', 'Falta')}</option>
                    <option value="propia">{t('matchSheet.goalOwn', 'En propia')}</option>
                  </Select>
                  <Button type="button" $variant="danger" onClick={() => removeGoal(i)}><MdDelete /></Button>
                </EventRow>
              ))}
            </Stack>
          </div>

          {/* Goles rival */}
          <div style={{ marginBottom: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Label>{t('matchSheet.fields.goalsAgainst', 'Goles rival')} ({(form.golesRival || []).length})</Label>
              <Button type="button" $variant="ghost" onClick={addRivalGoal}><MdAdd /> {t('common.add', 'Añadir')}</Button>
            </Row>
            <Stack $gap={6}>
              {(form.golesRival || []).length === 0 ? <ListEmpty>{t('common.empty', 'Sin datos')}</ListEmpty> : null}
              {(form.golesRival || []).map((g, i) => (
                <EventRow key={i}>
                  <SmallInput type="number" min="0" max="120" value={g.minuto} onChange={(e) => updateRivalGoal(i, { minuto: parseInt(e.target.value, 10) || 0 })} />
                  <span style={{ flex: 1, fontSize: 12, color: '#888' }}>{t('matchSheet.fields.goalsAgainst', 'Gol rival')}</span>
                  <Button type="button" $variant="danger" onClick={() => removeRivalGoal(i)}><MdDelete /></Button>
                </EventRow>
              ))}
            </Stack>
          </div>

          {/* Yellow */}
          <div style={{ marginBottom: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Label>🟨 {t('matchSheet.fields.yellowCards', 'Amarillas')} ({form.tarjetasAmarillas.length})</Label>
              <Button type="button" $variant="ghost" onClick={addYellow} disabled={!callupPlayers.length}><MdAdd /> {t('common.add', 'Añadir')}</Button>
            </Row>
            <Stack $gap={6}>
              {form.tarjetasAmarillas.length === 0 ? <ListEmpty>{t('common.empty', 'Sin datos')}</ListEmpty> : null}
              {form.tarjetasAmarillas.map((c, i) => (
                <EventRow key={i}>
                  <SmallInput type="number" min="0" max="120" value={c.minuto} onChange={(e) => updateYellow(i, { minuto: parseInt(e.target.value, 10) || 0 })} />
                  <Button type="button" $variant="ghost" style={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => setScorerModal({ type: 'yellow', index: i })}>
                    {playerLabel(c.jugador)}
                  </Button>
                  <Input style={{ maxWidth: 140 }} placeholder={t('matchSheet.fields.reason', 'Motivo')} value={c.motivo || ''} onChange={(e) => updateYellow(i, { motivo: e.target.value })} />
                  <Button type="button" $variant="danger" onClick={() => removeYellow(i)}><MdDelete /></Button>
                </EventRow>
              ))}
            </Stack>
          </div>

          {/* Red */}
          <div style={{ marginBottom: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Label>🟥 {t('matchSheet.fields.redCards', 'Rojas')} ({form.tarjetasRojas.length})</Label>
              <Button type="button" $variant="ghost" onClick={addRed} disabled={!callupPlayers.length}><MdAdd /> {t('common.add', 'Añadir')}</Button>
            </Row>
            <Stack $gap={6}>
              {form.tarjetasRojas.length === 0 ? <ListEmpty>{t('common.empty', 'Sin datos')}</ListEmpty> : null}
              {form.tarjetasRojas.map((c, i) => (
                <EventRow key={i}>
                  <SmallInput type="number" min="0" max="120" value={c.minuto} onChange={(e) => updateRed(i, { minuto: parseInt(e.target.value, 10) || 0 })} />
                  <Button type="button" $variant="ghost" style={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => setScorerModal({ type: 'red', index: i })}>
                    {playerLabel(c.jugador)}
                  </Button>
                  <Input style={{ maxWidth: 140 }} placeholder={t('matchSheet.fields.reason', 'Motivo')} value={c.motivo || ''} onChange={(e) => updateRed(i, { motivo: e.target.value })} />
                  <Button type="button" $variant="danger" onClick={() => removeRed(i)}><MdDelete /></Button>
                </EventRow>
              ))}
            </Stack>
          </div>

          {/* Cambios */}
          <div>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Label>🔁 {t('matchSheet.fields.changes', 'Cambios')} ({form.cambios.length})</Label>
              <Button type="button" $variant="ghost" onClick={addChange} disabled={!callupPlayers.length}><MdAdd /> {t('common.add', 'Añadir')}</Button>
            </Row>
            <Stack $gap={6}>
              {form.cambios.length === 0 ? <ListEmpty>{t('common.empty', 'Sin datos')}</ListEmpty> : null}
              {form.cambios.map((c, i) => (
                <EventRow key={i}>
                  <SmallInput type="number" min="0" max="120" value={c.minuto} onChange={(e) => updateChange(i, { minuto: parseInt(e.target.value, 10) || 0 })} />
                  <Button type="button" $variant="ghost" style={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => setScorerModal({ type: 'changeOut', index: i })}>
                    ↓ {playerLabel(c.sale)}
                  </Button>
                  <Button type="button" $variant="ghost" style={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => setScorerModal({ type: 'changeIn', index: i })}>
                    ↑ {playerLabel(c.entra)}
                  </Button>
                  <Button type="button" $variant="danger" onClick={() => removeChange(i)}><MdDelete /></Button>
                </EventRow>
              ))}
            </Stack>
          </div>
        </Section>

        {/* SECTION 4: Notes */}
        <Section>
          <SectionHead><MdEdit /> {t('matchSheet.section.notes', 'Notas del entrenador')}</SectionHead>
          <TextArea
            rows={4}
            value={form.notasEntrenador || ''}
            onChange={(e) => update({ notasEntrenador: e.target.value })}
            placeholder={t('matchSheet.notesPlaceholder', 'Observaciones, análisis...')}
          />
          <Field>
            <Label>{t('matchSheet.fields.matchLink', 'Enlace del partido')}</Label>
            <Input
              type="url"
              value={form.partidoUrl || ''}
              onChange={(e) => update({ partidoUrl: e.target.value })}
              placeholder="https://..."
            />
          </Field>
        </Section>

        {error ? <ErrorText>{error}</ErrorText> : null}
      </Stack>

      {/* Sub-modals */}
      <PlayerSelectionModal
        open={callupModal}
        onClose={() => setCallupModal(false)}
        players={players}
        selectedIds={form.convocados}
        excludeIds={form.noConvocados}
        onConfirm={handleConvocadosChange}
        title={t('matchSheet.callups', 'Convocados')}
        sanctionedPlayerIds={sanctionedPlayerIds}
      />
      <PlayerSelectionModal
        open={noCallupModal}
        onClose={() => setNoCallupModal(false)}
        players={players}
        selectedIds={form.noConvocados}
        excludeIds={form.convocados}
        onConfirm={handleNoCallupsChange}
        title={t('matchSheet.notCalledUp', 'No convocados')}
        sanctionedPlayerIds={sanctionedPlayerIds}
      />
      <JornadaModal
        open={jornadaModal}
        onClose={() => setJornadaModal(false)}
        value={form.jornada}
        onChange={(v) => update({ jornada: v })}
      />
      <PlayerSelectionModal
        open={!!scorerModal}
        onClose={() => setScorerModal(null)}
        players={callupPlayers}
        multi={false}
        title={t('matchSheet.selectPlayer', 'Selecciona jugador')}
        onConfirm={(ids) => {
          const id = ids[0];
          if (!scorerModal) return;
          const { type, index } = scorerModal;
          if (type === 'goal') updateGoal(index, { jugador: id });
          if (type === 'yellow') updateYellow(index, { jugador: id });
          if (type === 'red') updateRed(index, { jugador: id });
          if (type === 'changeOut') updateChange(index, { sale: id });
          if (type === 'changeIn') updateChange(index, { entra: id });
        }}
      />
    </Modal>
  );
}

const pdfBtnStyle = {
  display: 'block', width: '100%', padding: '8px 12px',
  background: 'transparent', border: 'none', textAlign: 'left',
  fontSize: 13, cursor: 'pointer',
};
