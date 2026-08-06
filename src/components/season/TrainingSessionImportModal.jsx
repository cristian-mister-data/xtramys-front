import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MdAdd,
  MdAutoFixHigh,
  MdCheckCircle,
  MdDeleteOutline,
  MdImage,
  MdPictureAsPdf,
  MdUploadFile,
} from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, ErrorText, Input, Label, Muted, TextArea } from '@/ui/primitives';
import { analyzeSessionPdf } from '@/api/session';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { fileToBase64 } from './seasonHelpers';

const Shell = styled.div`display: grid; gap: 16px; @media (max-width: 600px) { gap: 12px; }`;
const Hero = styled.div`
  display: flex; gap: 14px; align-items: flex-start; padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 14px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`;
const HeroIcon = styled.div`
  width: 44px; height: 44px; flex: 0 0 auto; display: grid; place-items: center;
  border-radius: 12px; color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primarySoft};
`;
const Steps = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const Step = styled.span`
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 700;
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : theme.colors.backgroundAlt)};
`;
const Picker = styled.label`
  min-height: 150px; display: grid; place-items: center; gap: 8px; padding: 24px;
  border: 2px dashed ${({ theme }) => theme.colors.primary}; border-radius: 16px;
  background: ${({ theme }) => theme.colors.primarySoft}; color: ${({ theme }) => theme.colors.primarySoftText};
  font-weight: 800; text-align: center; cursor: pointer;
`;
const HiddenInput = styled.input`position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;`;
const FileRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 12px 14px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px;
  min-width: 0; word-break: break-word;
  @media (max-width: 600px) { align-items: flex-start; flex-wrap: wrap; padding: 10px 12px; }
`;
const Warning = styled.div`
  padding: 10px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5;
  color: ${({ theme }) => theme.colors.warningSoftText}; background: ${({ theme }) => theme.colors.warningSoft};
`;
const Review = styled.div`display: grid; grid-template-columns: 245px minmax(0, 1fr); gap: 16px; @media (max-width: 760px) { grid-template-columns: 1fr; }`;
const SessionList = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const SessionButton = styled.button`
  width: 100%; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 9px;
  padding: 11px; border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: 11px; background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : theme.colors.surface)};
  color: ${({ theme }) => theme.colors.text}; text-align: left; cursor: pointer;
`;
const SessionPanel = styled.div`display: grid; gap: 14px; min-width: 0;`;
const Card = styled.section`
  display: grid; gap: 12px; padding: 14px; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 13px; background: ${({ theme }) => theme.colors.surface};
`;
const CardTitle = styled.h3`margin: 0; font-size: 14px; color: ${({ theme }) => theme.colors.text};`;
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(${({ $columns = 2 }) => $columns}, minmax(0, 1fr)); gap: 10px;
  @media (max-width: 680px) { grid-template-columns: 1fr; }
`;
const Field = styled.div`display: grid; gap: 5px; min-width: 0;`;
const Exercise = styled.article`
  display: grid; grid-template-columns: 165px minmax(0, 1fr); gap: 13px; padding: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px;
  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;
const ExerciseImage = styled.div`
  min-height: 120px; border-radius: 10px; overflow: hidden; display: grid; place-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border}; background: ${({ theme }) => theme.colors.backgroundAlt};
  img { width: 100%; height: 100%; max-height: 180px; object-fit: contain; }
`;
const ExerciseFields = styled.div`display: grid; gap: 9px; min-width: 0;`;
const MiniActions = styled.div`display: flex; gap: 6px; flex-wrap: wrap;`;
const MiniButton = styled.button`
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 8px; border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border}; background: ${({ theme }) => theme.colors.surface};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.error : theme.colors.textSecondary)}; font-size: 11px; cursor: pointer;
`;
const PlayerGrid = styled.div`display: flex; flex-wrap: wrap; gap: 7px; max-height: 150px; overflow: auto;`;
const PlayerChip = styled.button`
  padding: 7px 10px; border-radius: 999px; font-size: 12px; cursor: pointer;
  border: 1px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  color: ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.textSecondary)};
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primarySoft : theme.colors.surface)};
`;
const todayValue = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const fileSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const normalizedName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nextExercise = () => ({ id: `manual-${Date.now()}`, name: '', description: '', objective: '', materials: '', duration: '', durationMinutes: 0, restMinutes: 0, dimensions: '', playerCount: 0, image: '', sourcePage: null });

export default function TrainingSessionImportModal({ open, players = [], onClose, onImport, loading = false }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState('');
  const [draft, setDraft] = useState(null);
  const [activeId, setActiveId] = useState('');
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null); setFileData(''); setDraft(null); setActiveId(''); setError(''); setAnalyzing(false);
  }, [open]);

  const activeSession = draft?.sessions.find((session) => session.id === activeId) || draft?.sessions[0];
  const selectedCount = draft?.sessions.filter((session) => session.selected).length || 0;
  const availablePlayers = useMemo(() => players.filter((player) => player.activo !== false), [players]);

  const updateSession = (id, changes) => setDraft((current) => ({
    ...current,
    sessions: current.sessions.map((session) => session.id === id ? { ...session, ...changes } : session),
  }));

  const updateExercise = (sessionId, exerciseId, changes) => setDraft((current) => ({
    ...current,
    sessions: current.sessions.map((session) => session.id !== sessionId ? session : {
      ...session,
      exercises: session.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, ...changes } : exercise),
    }),
  }));

  const chooseFile = async (event) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (!next) return;
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') return setError(t('session.pdfOnly', 'Selecciona un archivo PDF.'));
    if (next.size > 25 * 1024 * 1024) return setError(t('session.pdfTooLarge', 'El PDF no puede superar los 25 MB.'));
    setError(''); setFile(next); setFileData(''); setDraft(null);
    try {
      setFileData(await fileToBase64(next));
    } catch {
      setFile(null);
      setError(t('session.pdfReadError', 'No se pudo leer el PDF seleccionado.'));
    }
  };

  const analyze = async () => {
    if (!file || !fileData) return setError(t('session.pdfRequired', 'Selecciona un PDF.'));
    setAnalyzing(true); setError('');
    try {
      const response = await analyzeSessionPdf({ fileData, filename: file.name });
      const sessions = (response.data.sessions || []).map((session) => {
        const recognizedNames = normalizedName((session.playerNames || []).join(' '));
        const detectedPlayerIds = availablePlayers.filter((player) => recognizedNames.includes(normalizedName(getPlayerFullName(player)))).map((player) => String(player._id));
        return { ...session, date: session.date || todayValue(), playerIds: session.playerIds?.length ? session.playerIds : detectedPlayerIds };
      });
      setDraft({ ...response.data, sessions });
      setActiveId(sessions[0]?.id || '');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || t('session.importPdfError', 'No se pudo interpretar el PDF.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async () => {
    const sessions = draft.sessions.filter((session) => session.selected);
    if (!sessions.length) return setError(t('session.importSelectSession', 'Selecciona al menos una sesión.'));
    if (sessions.some((session) => !session.date)) return setError(t('session.importDateRequired', 'Revisa la fecha de todas las sesiones seleccionadas.'));
    if (sessions.some((session) => !session.exercises.length || session.exercises.some((exercise) => !exercise.name.trim()))) return setError(t('session.importExerciseRequired', 'Todos los ejercicios deben tener nombre.'));
    setError('');
    try {
      await onImport({ fileData, filename: file.name, sessions });
    } catch (saveError) {
      setError(saveError?.message || t('session.importSaveError', 'No se pudieron guardar las sesiones importadas.'));
    }
  };

  const footer = !draft ? (
    <>
      <Button $variant="ghost" onClick={onClose} disabled={analyzing}>{t('common.cancel', 'Cancelar')}</Button>
      <Button onClick={analyze} disabled={!file || !fileData || analyzing}><MdAutoFixHigh />{analyzing ? t('session.importAnalyzing', 'Leyendo y reconociendo el PDF...') : t('session.importAnalyze', 'Analizar PDF')}</Button>
    </>
  ) : (
    <>
      <Button $variant="ghost" onClick={onClose} disabled={loading}>{t('common.cancel', 'Cancelar')}</Button>
      <Button onClick={submit} disabled={loading || !selectedCount}><MdCheckCircle />{loading ? t('common.saving', 'Guardando...') : t('session.importSaveSessions', 'Guardar {{count}} sesiones', { count: selectedCount })}</Button>
    </>
  );

  return (
    <Modal open={open} onClose={analyzing || loading ? undefined : onClose} title={t('session.importPdfTitle', 'Importar sesión desde PDF')} width={1120} footer={footer}>
      <Shell>
        <Hero>
          <HeroIcon><MdAutoFixHigh size={25} /></HeroIcon>
          <div><strong>{t('session.importPdfSubtitle', 'Convierte el PDF en sesiones y ejercicios editables')}</strong><Muted style={{ display: 'block', marginTop: 5 }}>{t('session.importPdfHint', 'Extraemos el texto directamente y usamos OCR solo cuando el documento está escaneado. Nada se guarda hasta que lo confirmes.')}</Muted></div>
        </Hero>
        <Steps>
          <Step $active={!draft}><MdPictureAsPdf />1. {t('session.importStepUpload', 'Subir PDF')}</Step>
          <Step $active={analyzing}><MdAutoFixHigh />2. {t('session.importStepAnalyze', 'Analizar')}</Step>
          <Step $active={Boolean(draft)}><MdCheckCircle />3. {t('session.importStepReview', 'Revisar y guardar')}</Step>
        </Steps>

        {!draft ? (
          <>
            <Picker htmlFor="training-session-import-file"><div><MdUploadFile size={34} /><div>{file ? t('session.changePdf', 'Cambiar PDF') : t('session.importChoosePdf', 'Seleccionar sesión o microciclo en PDF')}</div><Muted>{t('session.importFormatsHint', 'PDF con texto o escaneado · máximo 25 MB')}</Muted></div><HiddenInput id="training-session-import-file" type="file" accept="application/pdf,.pdf" onChange={chooseFile} /></Picker>
            {file && <FileRow><span>{file.name}</span><Muted>{fileSize(file.size)}</Muted></FileRow>}
            {error && <ErrorText role="alert">{error}</ErrorText>}
          </>
        ) : (
          <>
            <FileRow><span><strong>{draft.source.filename}</strong><Muted style={{ display: 'block' }}>{draft.source.pageCount} {t('session.importPages', 'páginas')} · {draft.source.extraction === 'ocr' ? 'OCR' : draft.source.extraction === 'mixed' ? 'Texto + OCR' : t('session.importEmbeddedText', 'Texto integrado')}</Muted></span><Button $variant="secondary" onClick={() => { setDraft(null); setFile(null); setFileData(''); }}>{t('session.importAnotherPdf', 'Elegir otro PDF')}</Button></FileRow>
            {draft.warnings?.map((warning) => <Warning key={warning}>{warning}</Warning>)}
            <Review>
              <SessionList>
                <CardTitle>{t('session.importDetectedSessions', 'Sesiones detectadas')} ({draft.sessions.length})</CardTitle>
                {draft.sessions.map((session) => <SessionButton key={session.id} type="button" $active={activeSession?.id === session.id} onClick={() => setActiveId(session.id)}><input type="checkbox" checked={session.selected} onClick={(event) => event.stopPropagation()} onChange={(event) => updateSession(session.id, { selected: event.target.checked })} aria-label={t('session.importSelectSession', 'Seleccionar sesión')} /><span><strong>{session.title}</strong><Muted style={{ display: 'block' }}>{session.exercises.length} {t('session.exercises', 'ejercicios')}</Muted></span><MdCheckCircle color={session.selected ? '#16a34a' : '#94a3b8'} /></SessionButton>)}
              </SessionList>

              {activeSession && <SessionPanel>
                <Card>
                  <CardTitle>{t('session.importSessionData', 'Datos de la sesión')}</CardTitle>
                  <Grid $columns={2}><Field><Label>{t('common.title', 'Título')}</Label><Input value={activeSession.title} onChange={(event) => updateSession(activeSession.id, { title: event.target.value })} /></Field><Field><Label>{t('session.dateLabel', 'Fecha')}</Label><Input type="date" value={activeSession.date} onChange={(event) => updateSession(activeSession.id, { date: event.target.value })} /></Field></Grid>
                  <Grid $columns={3}><Field><Label>{t('session.startTime', 'Hora de inicio')}</Label><Input type="time" value={activeSession.startTime || ''} onChange={(event) => updateSession(activeSession.id, { startTime: event.target.value })} /></Field><Field><Label>{t('session.endTime', 'Hora de fin')}</Label><Input type="time" value={activeSession.endTime || ''} onChange={(event) => updateSession(activeSession.id, { endTime: event.target.value })} /></Field><Field><Label>{t('session.location', 'Lugar')}</Label><Input value={activeSession.location || ''} onChange={(event) => updateSession(activeSession.id, { location: event.target.value })} /></Field></Grid>
                  <Grid $columns={2}><Field><Label>{t('exercise.material', 'Material')}</Label><Input value={activeSession.materials || ''} onChange={(event) => updateSession(activeSession.id, { materials: event.target.value })} /></Field><Field><Label>{t('session.duration', 'Duración estimada')}</Label><Input type="number" min="0" value={activeSession.durationMinutes || ''} onChange={(event) => updateSession(activeSession.id, { durationMinutes: Number(event.target.value) || 0 })} /></Field></Grid>
                  <Field><Label>{t('common.observations', 'Observaciones')}</Label><TextArea value={activeSession.observations || ''} onChange={(event) => updateSession(activeSession.id, { observations: event.target.value })} /></Field>
                </Card>

                <Card>
                  <CardTitle>{t('session.players', 'Jugadores')} ({activeSession.playerIds?.length || 0})</CardTitle>
                  <Muted>{t('session.importPlayersHint', 'Selecciona los jugadores que participaron. Si el PDF incluye nombres reconocibles podrás revisarlos aquí.')}</Muted>
                  <PlayerGrid>{availablePlayers.map((player) => { const id = String(player._id); const selected = activeSession.playerIds?.includes(id); return <PlayerChip key={id} type="button" $selected={selected} onClick={() => updateSession(activeSession.id, { playerIds: selected ? activeSession.playerIds.filter((item) => item !== id) : [...(activeSession.playerIds || []), id] })}>{getPlayerFullName(player)}</PlayerChip>; })}</PlayerGrid>
                </Card>

                <Card>
                  <FileRow><div><CardTitle>{t('session.exercises', 'Ejercicios')} ({activeSession.exercises.length})</CardTitle><Muted>{t('session.importExercisesHint', 'Revisa texto, tiempos e imágenes antes de guardar.')}</Muted></div><Button $variant="secondary" onClick={() => updateSession(activeSession.id, { exercises: [...activeSession.exercises, nextExercise()] })}><MdAdd />{t('exercise.add', 'Añadir')}</Button></FileRow>
                  {activeSession.exercises.map((exercise, index) => <Exercise key={exercise.id}>
                    <div><ExerciseImage>{exercise.image ? <img src={exercise.image} alt="" /> : <MdImage size={34} />}</ExerciseImage><MiniActions><MiniButton as="label"><MdImage />{exercise.image ? t('common.change', 'Cambiar') : t('common.add', 'Añadir')}<HiddenInput type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const imageFile = event.target.files?.[0]; event.target.value = ''; if (imageFile) updateExercise(activeSession.id, exercise.id, { image: await fileToBase64(imageFile) }); }} /></MiniButton>{exercise.image && <MiniButton type="button" onClick={() => updateExercise(activeSession.id, exercise.id, { image: '' })}>{t('common.remove', 'Quitar')}</MiniButton>}<MiniButton type="button" $danger onClick={() => updateSession(activeSession.id, { exercises: activeSession.exercises.filter((item) => item.id !== exercise.id) })}><MdDeleteOutline />{t('common.delete', 'Eliminar')}</MiniButton></MiniActions></div>
                    <ExerciseFields><Field><Label>{index + 1}. {t('exercise.name', 'Nombre')}</Label><Input value={exercise.name} onChange={(event) => updateExercise(activeSession.id, exercise.id, { name: event.target.value })} /></Field><Field><Label>{t('exercise.description', 'Descripción')}</Label><TextArea value={exercise.description || ''} onChange={(event) => updateExercise(activeSession.id, exercise.id, { description: event.target.value })} /></Field><Grid $columns={2}><Field><Label>{t('exercise.objective', 'Objetivo')}</Label><TextArea value={exercise.objective || ''} onChange={(event) => updateExercise(activeSession.id, exercise.id, { objective: event.target.value })} /></Field><Field><Label>{t('exercise.material', 'Material')}</Label><TextArea value={exercise.materials || ''} onChange={(event) => updateExercise(activeSession.id, exercise.id, { materials: event.target.value })} /></Field></Grid><Grid $columns={4}><Field><Label>{t('exercise.duration', 'Tiempo')}</Label><Input value={exercise.duration || ''} onChange={(event) => updateExercise(activeSession.id, exercise.id, { duration: event.target.value })} /></Field><Field><Label>{t('session.restMinutes', 'Descanso (min)')}</Label><Input type="number" min="0" step="0.5" value={exercise.restMinutes || ''} onChange={(event) => updateExercise(activeSession.id, exercise.id, { restMinutes: Number(event.target.value) || 0 })} /></Field><Field><Label>{t('exercise.dimensions', 'Dimensiones')}</Label><Input value={exercise.dimensions || ''} onChange={(event) => updateExercise(activeSession.id, exercise.id, { dimensions: event.target.value })} /></Field><Field><Label>{t('exercise.players', 'Jugadores')}</Label><Input type="number" min="0" value={exercise.playerCount || ''} onChange={(event) => updateExercise(activeSession.id, exercise.id, { playerCount: Number(event.target.value) || 0 })} /></Field></Grid></ExerciseFields>
                  </Exercise>)}
                </Card>
              </SessionPanel>}
            </Review>
            {error && <ErrorText role="alert">{error}</ErrorText>}
          </>
        )}
      </Shell>
    </Modal>
  );
}
