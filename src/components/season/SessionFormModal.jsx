import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MdAdd, MdArrowUpward, MdArrowDownward, MdDelete, MdGroups, MdImage, MdCheckCircle,
} from 'react-icons/md';

import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import {
  Button, Field, Label, Input, Row, Stack, ErrorText, TextArea, Muted,
} from '@/ui/primitives';
import { showMissingFieldsToast } from '@/utils/validationToast';
import { fetchEjerciciosUsuario, fetchGlobalExercises, fetchExerciseFoldersFlat } from '@/store/slices/exercise/exerciseThunks';
import PlayerSelectionModal from '@/features/matchSheet/modals/PlayerSelectionModal';
import ExerciseSelectorModal from '@/features/session/ExerciseSelectorModal';
import TeamAssignmentModal from '@/features/session/TeamAssignmentModal';
import { getPlayerFullName } from '@/utils/playerHelpers';

const Grid3 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const SectionCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 14px;
  background: ${({ theme }) => theme.colors.surface};
`;

const PlayerChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primarySoftText};
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
`;

const ToggleChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $sel, theme }) => ($sel ? theme.colors.warningSoft : theme.colors.surface)};
  color: ${({ $sel, theme }) => ($sel ? theme.colors.warningSoftText : theme.colors.text)};
  border: 1px solid ${({ $sel, theme }) => ($sel ? theme.colors.warning : theme.colors.border)};
  transition: background 0.15s ease, border-color 0.15s ease;
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const ExerciseRow = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  background: ${({ theme }) => theme.colors.surface};
`;

const ExHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Index = styled.div`
  width: 26px; height: 26px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
`;

const Thumb = styled.div`
  width: 44px; height: 44px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex; align-items: center; justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const ExBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ExName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const IconBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.backgroundAlt}; }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const WellnessRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
`;

const WellBtn = styled.button`
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 1px solid ${({ $sel, $color, theme }) => ($sel ? $color : theme.colors.border)};
  background: ${({ $sel, $color, theme }) => ($sel ? $color : theme.colors.surface)};
  color: ${({ $sel, theme }) => ($sel ? '#fff' : theme.colors.text)};
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s ease;
  &:hover { transform: scale(1.05); }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const wellnessColor = (n, theme) => {
  if (n <= 3) return theme.colors.error;
  if (n <= 5) return theme.colors.warning;
  if (n <= 7) return theme.colors.primary;
  return theme.colors.success;
};

const isoToDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const computeDuration = (h1, h2) => {
  if (!h1 || !h2) return null;
  const [a, b] = h1.split(':').map(Number);
  const [c, d] = h2.split(':').map(Number);
  if ([a, b, c, d].some((n) => Number.isNaN(n))) return null;
  const diff = (c * 60 + d) - (a * 60 + b);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
};

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

const folderIdOf = (folder) => (typeof folder === 'object' ? folder?._id || folder?.id : folder);
const cleanFolderName = (folder) => (folder?.displayName || folder?.nombre || '').replace(/^\s*└─\s*/, '').trim();
const buildFolderPath = (folder, folderById) => {
  const names = [];
  let current = folder;
  while (current) {
    const name = cleanFolderName(current);
    if (name) names.unshift(name);
    current = folderById.get(String(folderIdOf(current.parentFolder)));
  }
  return names.join(' / ');
};

// Hydrates exercises from session payload (supports both ejerciciosDetalle and legacy ejercicios + observaciones array)
function hydrateExercises(session) {
  const ids = [];
  const restMap = {};
  const obsMap = {};
  const teamsMap = {};

  if (Array.isArray(session?.ejerciciosDetalle) && session.ejerciciosDetalle.length > 0) {
    const sorted = [...session.ejerciciosDetalle].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );
    sorted.forEach((d) => {
      const exId = typeof d.ejercicio === 'object' ? d.ejercicio?._id : d.ejercicio;
      if (!exId) return;
      ids.push(exId);
      if (d.tiempoDescanso != null) restMap[exId] = d.tiempoDescanso;
      if (Array.isArray(d.teamAssignments)) teamsMap[exId] = d.teamAssignments;
    });
  } else if (Array.isArray(session?.ejercicios)) {
    session.ejercicios.forEach((e) => {
      if (typeof e === 'string') {
        ids.push(e);
      } else if (e?.ejercicio) {
        const exId = typeof e.ejercicio === 'object' ? e.ejercicio._id : e.ejercicio;
        if (exId) {
          ids.push(exId);
          if (e.tiempoDescanso != null) restMap[exId] = e.tiempoDescanso;
          if (Array.isArray(e.teamAssignments)) teamsMap[exId] = e.teamAssignments;
        }
      } else if (e?._id) {
        ids.push(e._id);
        if (Array.isArray(e.teamAssignments)) teamsMap[e._id] = e.teamAssignments;
  }

  return { ids, restMap, obsMap, teamsMap };
}

function getPlayerId(p) {
  return typeof p === 'object' ? p?._id : p;
}

export default function SessionFormModal({
  open,
  mode = 'create',
  session = null,
  defaultDate = null,
  loading = false,
  onClose,
  onSubmit,
  onDelete,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();

  const user = useSelector((s) => s.usuario.user);
  const userId = user?._id;
  const playersRaw = useSelector((s) => s.player.players);
  const exercisesRaw = useSelector((s) => s.exercise.exercises);
  const globalExercisesRaw = useSelector((s) => s.exercise.globalExercises);
  const foldersFlat = useSelector((s) => s.exercise.foldersFlat) || [];
  const players = useMemo(() => playersRaw || [], [playersRaw]);
  const exercises = useMemo(() => exercisesRaw || [], [exercisesRaw]);
  const globalExercises = useMemo(() => globalExercisesRaw || [], [globalExercisesRaw]);
  const selectableExercises = useMemo(() => {
    const map = new Map();
    const folderById = new Map(foldersFlat.map((folder) => [String(folder._id), folder]));
    [...exercises, ...globalExercises].filter(Boolean).forEach((exercise) => {
      const id = exercise._id || exercise.id;
      if (!id) return;
      const prev = map.get(String(id));
      const folderId = folderIdOf(exercise.folder);
      const folder = folderId ? (typeof exercise.folder === 'object' ? exercise.folder : folderById.get(String(folderId))) : null;
      map.set(String(id), {
        ...prev,
        ...exercise,
        folder: folder || exercise.folder,
        folderPathLabel: folder ? buildFolderPath(folder, folderById) : undefined,
        favorito: Boolean(prev?.favorito || exercise.favorito),
      });
    });
    return Array.from(map.values());
  }, [exercises, globalExercises, foldersFlat]);

  // Form state
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('17:00');
  const [horaFin, setHoraFin] = useState('18:30');
  const [observaciones, setObservaciones] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [extraPlayerIds, setExtraPlayerIds] = useState([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState([]);
  const [exerciseRest, setExerciseRest] = useState({});
  const [exerciseObs, setExerciseObs] = useState({});
  const [exerciseTeams, setExerciseTeams] = useState({});
  const [expectedWellness, setExpectedWellness] = useState(null);
  const [error, setError] = useState('');

  // Modal state
  const [playersModalOpen, setPlayersModalOpen] = useState(false);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [teamModalExId, setTeamModalExId] = useState(null);

  const rosterPlayers = useMemo(() => players.filter((p) => !p.extra), [players]);
  const extraPlayersAvailable = useMemo(() => players.filter((p) => p.extra === true), [players]);

  // Load exercises from API on open
  useEffect(() => {
    if (open && userId && exercises.length === 0) {
      dispatch(fetchEjerciciosUsuario({ user: userId }));
    }
    if (open && globalExercises.length === 0) {
      dispatch(fetchGlobalExercises({}));
    }
    if (open && userId && foldersFlat.length === 0) {
      dispatch(fetchExerciseFoldersFlat({ user: userId }));
    }
  }, [open, userId, exercises.length, globalExercises.length, foldersFlat.length, dispatch]);

  // Hydrate form when opening
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && session) {
      setFecha(isoToDate(session.fecha));
      setHoraInicio(session.horaInicio || '17:00');
      setHoraFin(session.horaFin || '18:30');
      setObservaciones(typeof session.observaciones === 'string'
        ? session.observaciones
        : normalizeTextValue(session.observacionesGenerales || ''));
      setSelectedPlayers((session.jugadores || []).map(getPlayerId).filter(Boolean));
      setExtraPlayerIds((session.jugadoresExtras || []).map(getPlayerId).filter(Boolean));
      const { ids, restMap, obsMap, teamsMap } = hydrateExercises(session);
      setSelectedExerciseIds(ids);
      setExerciseRest(restMap);
      setExerciseObs(obsMap);
      setExerciseTeams(teamsMap);
      setExpectedWellness(session.expectedWellness ?? null);
    } else {
      setFecha(defaultDate ? isoToDate(defaultDate) : isoToDate(new Date()));
      setHoraInicio('17:00');
      setHoraFin('18:30');
      setObservaciones('');
      setSelectedPlayers([]);
      setExtraPlayerIds([]);
      setSelectedExerciseIds([]);
      setExerciseRest({});
      setExerciseObs({});
      setExerciseTeams({});
      setExpectedWellness(null);
    }
    setError('');
  }, [open, mode, session, defaultDate]);

  const exerciseById = useMemo(() => {
    const m = new Map();
    selectableExercises.forEach((e) => m.set(e._id, e));
    return m;
  }, [selectableExercises]);

  const duration = useMemo(() => computeDuration(horaInicio, horaFin), [horaInicio, horaFin]);

  // ----- Exercise helpers -----
  const moveExercise = (idx, dir) => {
    setSelectedExerciseIds((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removeExercise = (id) => {
    setSelectedExerciseIds((prev) => prev.filter((x) => x !== id));
    setExerciseRest((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setExerciseObs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setExerciseTeams((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleExercisesPicked = (ids) => {
    // append new (preserve existing order)
    setSelectedExerciseIds((prev) => {
      const set = new Set(prev);
      const additions = ids.filter((x) => !set.has(x));
      return [...prev, ...additions];
    });
  };

  // ----- Players -----
  const toggleExtra = (id) => {
    setExtraPlayerIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // ----- Wellness -----
  const toggleWellness = (n) => {
    setExpectedWellness((prev) => (prev === n ? null : n));
  };

  // ----- Submit -----
  const handleSubmit = (e) => {
    e?.preventDefault?.();
    setError('');
    if (!fecha) {
      showMissingFieldsToast(t, [t('session.date', 'Fecha')]);
      return;
    }

    const ejerciciosDetalle = selectedExerciseIds.map((id, idx) => ({
      ejercicio: id,
      orden: idx,
      tiempoDescanso: Number(exerciseRest[id]) || 0,
      teamAssignments: exerciseTeams[id] || [],
    }));

    const observacionesArr = selectedExerciseIds
      .filter((id) => (exerciseObs[id] || '').trim())
      .map((id) => ({ ejercicioId: id, observacion: exerciseObs[id].trim() }));

    const payload = {
      fecha,
      horaInicio,
      horaFin,
      jugadores: selectedPlayers,
      jugadoresExtras: extraPlayerIds,
      ejercicios: selectedExerciseIds,
      ejerciciosDetalle,
      observaciones: observacionesArr.length > 0
        ? observacionesArr
        : (observaciones.trim() || ''),
      observacionesGenerales: observaciones.trim() || undefined,
      expectedWellness,
    };

    onSubmit?.(payload);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={mode === 'edit'
          ? t('session.edit', 'Editar entrenamiento')
          : t('session.create', 'Nuevo entrenamiento')}
        width={FORM_MODAL_WIDTH}
        footer={
          <Row style={{ justifyContent: 'space-between', width: '100%' }}>
            {mode === 'edit' ? (
              <Button type="button" $variant="danger" onClick={() => onDelete?.(session)}>
                <MdDelete /> {t('edition.delete', 'Eliminar')}
              </Button>
            ) : <span />}
            <Row style={{ gap: 8 }}>
              <Button type="button" $variant="ghost" onClick={onClose}>
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading
                  ? t('common.saving', 'Guardando...')
                  : (mode === 'edit' ? t('common.save', 'Guardar') : t('common.create', 'Crear'))}
              </Button>
            </Row>
          </Row>
        }
      >
        <form onSubmit={handleSubmit}>
          <Stack $gap={16}>
            {/* Date + time */}
            <SectionCard>
              <SectionTitle>{t('session.scheduleSection', 'Fecha y horario')}</SectionTitle>
              <Grid3>
                <Field>
                  <Label>{t('session.date', 'Fecha')}</Label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </Field>
                <Field>
                  <Label>{t('session.startTime', 'Inicio')}</Label>
                  <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                </Field>
                <Field>
                  <Label>{t('session.endTime', 'Fin')}</Label>
                  <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
                </Field>
              </Grid3>
              {duration && (
                <Muted style={{ marginTop: 8 }}>
                  {t('session.duration', 'Duración')}: <strong>{duration}</strong>
                </Muted>
              )}
            </SectionCard>

            {/* Players */}
            <SectionCard>
              <SectionTitle>{t('session.playersSection', 'Jugadores convocados')}</SectionTitle>
              <Button type="button" $variant="secondary" onClick={() => setPlayersModalOpen(true)}>
                <MdGroups /> {t('session.selectPlayers', 'Seleccionar jugadores')} ({selectedPlayers.length})
              </Button>
              {selectedPlayers.length > 0 && (
                <PlayerChips>
                  {selectedPlayers.slice(0, 12).map((id) => {
                    const p = rosterPlayers.find((x) => x._id === id);
                    if (!p) return null;
                    return <Chip key={id}>{p.dorsal ? `${p.dorsal} · ` : ''}{getPlayerFullName(p)}</Chip>;
                  })}
                  {selectedPlayers.length > 12 && <Chip>+{selectedPlayers.length - 12}</Chip>}
                </PlayerChips>
              )}

              {extraPlayersAvailable.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <SectionTitle>{t('session.extrasSection', 'Jugadores extras')}</SectionTitle>
                  <PlayerChips>
                    {extraPlayersAvailable.map((p) => {
                      const sel = extraPlayerIds.includes(p._id);
                      return (
                        <ToggleChip
                          type="button"
                          key={p._id}
                          $sel={sel}
                          onClick={() => toggleExtra(p._id)}
                        >
                          {sel ? <MdCheckCircle size={14} /> : null}
                          {getPlayerFullName(p)}
                        </ToggleChip>
                      );
                    })}
                  </PlayerChips>
                </div>
              )}
            </SectionCard>

            {/* Exercises */}
            <SectionCard>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <SectionTitle style={{ marginBottom: 0 }}>
                  {t('session.exercisesSection', 'Ejercicios')} ({selectedExerciseIds.length})
                </SectionTitle>
                <Button type="button" $variant="secondary" onClick={() => setExerciseModalOpen(true)}>
                  <MdAdd /> {t('session.addExercise', 'Añadir ejercicio')}
                </Button>
              </Row>

              {selectedExerciseIds.length === 0 ? (
                <Muted style={{ textAlign: 'center', padding: '16px 0' }}>
                  {t('session.noExercisesSelected', 'No hay ejercicios seleccionados')}
                </Muted>
              ) : (
                selectedExerciseIds.map((id, idx) => {
                  const ex = exerciseById.get(id);
                  const isLast = idx === selectedExerciseIds.length - 1;
                  const hasTeams = ex?.equipos > 0;
                  const teamsAssigned = (exerciseTeams[id] || []).some(
                    (t) => (t.players?.length || 0) + (t.extraPlayers?.length || 0) > 0,
                  );
                  return (
                    <ExerciseRow key={id}>
                      <ExHeader>
                        <Index>{idx + 1}</Index>
                        <Thumb>
                          {ex?.imagen ? <img src={ex.imagen} alt="" /> : <MdImage size={22} />}
                        </Thumb>
                        <ExBody>
                          <ExName>{ex?.nombre || t('session.unknownExercise', 'Ejercicio')}</ExName>
                          {(ex?.folderPathLabel || ex?.folder?.nombre) && <ExMeta>{ex.folderPathLabel || ex.folder.nombre}</ExMeta>}
                        </ExBody>
                        <Row $gap={4}>
                          <IconBtn type="button" disabled={idx === 0} onClick={() => moveExercise(idx, -1)} title={t('common.moveUp', 'Subir')}>
                            <MdArrowUpward size={16} />
                          </IconBtn>
                          <IconBtn type="button" disabled={isLast} onClick={() => moveExercise(idx, 1)} title={t('common.moveDown', 'Bajar')}>
                            <MdArrowDownward size={16} />
                          </IconBtn>
                          <IconBtn type="button" onClick={() => removeExercise(id)} title={t('common.remove', 'Eliminar')}>
                            <MdDelete size={16} />
                          </IconBtn>
                        </Row>
                      </ExHeader>

                      <Stack $gap={8} style={{ marginTop: 10 }}>
                        {!isLast && (
                          <Field>
                            <Label>{t('session.restMinutes', 'Descanso (min)')}</Label>
                            <Input
                              type="number"
                              min={0}
                              value={exerciseRest[id] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9]/g, '');
                                setExerciseRest((prev) => ({ ...prev, [id]: v === '' ? '' : Number(v) }));
                              }}
                              placeholder="0"
                              style={{ maxWidth: 120 }}
                            />
                          </Field>
                        )}

                        {hasTeams && (
                          <Button
                            type="button"
                            $variant={teamsAssigned ? 'primary' : 'secondary'}
                            onClick={() => setTeamModalExId(id)}
                            style={{ alignSelf: 'flex-start' }}
                          >
                            <MdGroups />
                            {teamsAssigned
                              ? t('session.teamsAssigned', 'Equipos asignados ✓')
                              : t('session.assignTeams', 'Asignar equipos')}
                          </Button>
                        )}

                        <Field>
                          <Label>{t('session.observation', 'Observación')}</Label>
                          <TextArea
                            rows={2}
                            value={exerciseObs[id] || ''}
                            onChange={(e) => setExerciseObs((prev) => ({ ...prev, [id]: e.target.value }))}
                            placeholder={t('session.observationPlaceholder', 'Notas sobre este ejercicio...')}
                          />
                        </Field>
                      </Stack>
                    </ExerciseRow>
                  );
                })
              )}
            </SectionCard>

            {/* General notes */}
            <SectionCard>
              <SectionTitle>{t('session.generalNotes', 'Observaciones generales')}</SectionTitle>
              <TextArea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder={t('session.notesPlaceholder', 'Notas generales del entrenamiento...')}
              />
            </SectionCard>

            {/* Wellness control */}
            <SectionCard>
              <SectionTitle>{t('session.wellnessSection', 'Control wellness esperado')}</SectionTitle>
              <Muted>
                {t('session.wellnessHelp', 'Selecciona el nivel de carga esperado (1 muy bajo - 10 muy alto)')}
              </Muted>
              <WellnessRow>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <WellBtn
                    key={n}
                    type="button"
                    $sel={expectedWellness === n}
                    $color={wellnessColor(n, theme)}
                    onClick={() => toggleWellness(n)}
                  >
                    {n}
                  </WellBtn>
                ))}
              </WellnessRow>
            </SectionCard>

            {error ? <ErrorText>{error}</ErrorText> : null}
          </Stack>
        </form>
      </Modal>

      {/* Sub-modals */}
      <PlayerSelectionModal
        open={playersModalOpen}
        onClose={() => setPlayersModalOpen(false)}
        players={rosterPlayers}
        selectedIds={selectedPlayers}
        onConfirm={(ids) => setSelectedPlayers(ids)}
        title={t('session.selectPlayers', 'Seleccionar jugadores')}
      />

      <ExerciseSelectorModal
        open={exerciseModalOpen}
        onClose={() => setExerciseModalOpen(false)}
        exercises={selectableExercises}
        selectedIds={selectedExerciseIds}
        onConfirm={handleExercisesPicked}
        excludeIds={selectedExerciseIds}
      />

      <TeamAssignmentModal
        open={!!teamModalExId}
        onClose={() => setTeamModalExId(null)}
        exercise={teamModalExId ? exerciseById.get(teamModalExId) : null}
        rosterPlayers={rosterPlayers.filter((p) => selectedPlayers.includes(p._id))}
        extraPlayers={extraPlayersAvailable.filter((p) => extraPlayerIds.includes(p._id))}
        initialAssignments={teamModalExId ? (exerciseTeams[teamModalExId] || []) : []}
        onConfirm={(assignments) => {
          setExerciseTeams((prev) => ({ ...prev, [teamModalExId]: assignments }));
        }}
      />
    </>
  );
}
