// Modal de creación / edición de un análisis de rival.
// Renderiza dinámicamente las preguntas de la plantilla activa y soporta
// los 6 tipos: select, text, players, formation, graphic, video.
// - graphic: abre TacticalSnapshotModal y guarda {imageBase64, elements, fieldType}
// - video:   simple file input (FileReader → dataUrl). Versión web simplificada.
// - players: lista editable de {nombre, observacion}.
// - formation: modal con chips de ALINEACIONES.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdAdd,
  MdClose,
  MdDelete,
  MdShield,
  MdVideocam,
  MdGridOn,
  MdBrush,
  MdCheckCircle,
  MdPlayCircle,
  MdMovieFilter,
  MdImage,
} from 'react-icons/md';

import {
  createRivalAnalysis,
  updateRivalAnalysis,
} from '@/store/slices/rivalAnalysis/rivalAnalysisThunks';
import { createRival, fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import {
  Button,
  Input,
  TextArea,
  Field,
  Label,
  Stack,
  Row,
  Muted,
  ErrorText,
} from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import { getVideoById, saveTacticalVideo } from '@/utils/api';
import api from '@/api/client';
import VideoPoster from '@/components/shared/VideoPoster';
import ImageCropper from '@/components/season/ImageCropper';
import { showMissingFieldsToast } from '@/utils/validationToast';
import TacticalSnapshotModal from './TacticalSnapshotModal';
import TacticalVideoRecorderModal from './TacticalVideoRecorderModal';
import { renameRivalAnalysisFolder } from './videoFolderHelpers';
import {
  ALINEACIONES,
  getIconComponent,
  getQuestionText,
  resolveOptionLabel,
  partitionAnswers,
  buildDynamicAnswers,
  normalizeFormation,
  getFormationShort,
} from './rivalAnalysisData';

// ---------- VideoPreviewThumb component ----------
function VideoPreviewThumb({ value, fallback, playSize, alt, onOpen }) {
  const [posterUrl, setPosterUrl] = useState(value?.thumbnailUrl || value?.thumbnail || '');

  const captureFrame = async (videoUrl) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'auto';
    return new Promise((resolve) => {
      video.addEventListener('loadeddata', () => {
        video.currentTime = 0.1;
      });
      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
        video.remove();
      });
      video.addEventListener('error', () => resolve(''));
    });
  };

  useEffect(() => {
    if (posterUrl || !value?.videoId) return;
    getVideoById(value.videoId).then(async (data) => {
      const thumb = data?.video?.thumbnailUrl || data?.video?.thumbnail || data?.video?.poster;
      if (thumb) {
        setPosterUrl(thumb);
        return;
      }
      const url = await resolvePlayableVideoUrl(value.videoId);
      if (url) {
        const frame = await captureFrame(url);
        if (frame) setPosterUrl(frame);
      }
    }).catch(() => {});
  }, [value?.videoId, posterUrl]);

  return (
    <VideoThumb type="button" onClick={onOpen}>
      <VideoPoster
        video={value?.videoId ? { ...value, thumbnailUrl: posterUrl } : null}
        src={value?.url || ''}
        poster={posterUrl}
        fallback={fallback}
        playSize={playSize}
        style={{ minHeight: 160 }}
        alt={alt}
      />
    </VideoThumb>
  );
}

// ---------- styles ----------
const QBlock = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  @media (max-width: 600px) {
    padding: 12px;
  }
`;

const QHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const QIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const QTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Pill = styled.button`
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
  min-width: 0;

  @media (max-width: 600px) {
    flex: 1 1 calc(50% - 6px);
    padding: 8px 10px;
    text-align: center;
  }
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const PlayerRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: flex-start;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 8px;
  min-width: 0;

  @media (max-width: 600px) {
    gap: 8px;
    padding: 10px;

    > button {
      width: 40px;
      min-width: 40px;
      padding-left: 0;
      padding-right: 0;
    }
  }
`;

const SnapshotPreview = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  min-height: 120px;

  img {
    max-width: 100%;
    max-height: 240px;
    border-radius: 6px;
  }
`;

// Caja clickable para previsualizar el vídeo guardado: muestra el primer
// frame (poster nativo del <video preload="metadata">) con un overlay
// "play" en el centro. Al click, abre el reproductor en un modal.
const VideoThumb = styled.button`
  position: relative;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 0;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  min-height: 160px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;

  video {
    pointer-events: none;
    max-width: 100%;
    max-height: 240px;
    border-radius: 6px;
  }
`;

const RivalOption = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $selected }) =>
    $selected ? `${theme.colors.primary}11` : theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  width: 100%;
  text-align: left;
  min-width: 0;
`;

const RivalTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  background: ${({ theme }) => theme.colors.inputBg};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  text-align: left;
  color: ${({ theme, $empty }) => ($empty ? theme.colors.textMuted : theme.colors.text)};
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const NativeSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-family: inherit;
  outline: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:focus-visible {
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const RivalEscudoSm = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`;

const ImagePicker = styled.label`
  width: 84px;
  height: 84px;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  input {
    display: none;
  }
`;

// ---------- helpers ----------
function PlayersEditor({ value, onChange, t }) {
  const players = Array.isArray(value) ? value : [];

  const addPlayer = () => {
    onChange([...players, { nombre: '', observacion: '' }]);
  };

  const updatePlayer = (idx, patch) => {
    onChange(players.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removePlayer = (idx) => {
    onChange(players.filter((_, i) => i !== idx));
  };

  return (
    <Stack $gap={6}>
      {players.map((p, i) => (
        <PlayerRow key={i}>
          <Stack $gap={4} style={{ flex: 1 }}>
            <Input
              value={p.nombre || ''}
              onChange={(e) => updatePlayer(i, { nombre: e.target.value })}
              placeholder={t('rivalAnalysis.players.namePlaceholder', 'Nombre')}
            />
            <Input
              value={p.observacion || ''}
              onChange={(e) => updatePlayer(i, { observacion: e.target.value })}
              placeholder={t('rivalAnalysis.players.notePlaceholder', 'Observación')}
            />
          </Stack>
          <Button $variant="ghost" type="button" onClick={() => removePlayer(i)}>
            <MdDelete size={16} />
          </Button>
        </PlayerRow>
      ))}
      <Button $variant="secondary" type="button" onClick={addPlayer}>
        <Row $gap={6}>
          <MdAdd size={16} />
          {t('rivalAnalysis.players.add', 'Añadir jugador')}
        </Row>
      </Button>
    </Stack>
  );
}

// ---------- component ----------
export default function AnalysisFormModal({
  open,
  onClose,
  editing, // null o el rivalAnalysis a editar
  selectedTeam,
  userId,
  rivals = [],
  activeTemplate, // plantilla a usar
  userTemplates = [],
  onSaved,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const persistedCustomAnswersRef = useRef({});
  const [videoQuestionId, setVideoQuestionId] = useState(null);

  const existingAnalyses = useSelector((s) => s.rivalAnalysis.rivalAnalyses || []);

  const [rival, setRival] = useState('');
  const [rivalId, setRivalId] = useState('');
  const [rivalEscudo, setRivalEscudo] = useState('');
  const [showRivalPicker, setShowRivalPicker] = useState(false);
  const [rivalSearch, setRivalSearch] = useState('');
  const [showCreateRival, setShowCreateRival] = useState(false);
  const [newRivalName, setNewRivalName] = useState('');
  const [newRivalEscudo, setNewRivalEscudo] = useState('');
  const [cropperSrc, setCropperSrc] = useState(null);
  const [creatingRival, setCreatingRival] = useState(false);

  const [dynamicAnswers, setDynamicAnswers] = useState({});
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [formationQuestionId, setFormationQuestionId] = useState(null);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [snapshotQuestionId, setSnapshotQuestionId] = useState(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [videoRecorderQuestionId, setVideoRecorderQuestionId] = useState(null);
  const [videoRecorderQuestionText, setVideoRecorderQuestionText] = useState('');
  const [videoViewerUrl, setVideoViewerUrl] = useState('');
  const [videoViewerLoading, setVideoViewerLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingVideos, setUploadingVideos] = useState({});

  // hidratar al abrir
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setRival(editing.rival || '');
      setRivalId(editing.rivalId || '');
      setRivalEscudo(editing.rivalEscudo || '');
      setSelectedTemplateId(editing.templateId || activeTemplate?._id || userTemplates[0]?._id || '');
      setDynamicAnswers(buildDynamicAnswers(editing));
      persistedCustomAnswersRef.current = editing.customAnswers || {};
    } else {
      setRival('');
      setRivalId('');
      setRivalEscudo('');
      setSelectedTemplateId(activeTemplate?._id || userTemplates[0]?._id || '');
      setDynamicAnswers({});
      persistedCustomAnswersRef.current = {};
    }
    setError('');
    setShowRivalPicker(false);
    setShowCreateRival(false);
    setRivalSearch('');
    setNewRivalName('');
    setNewRivalEscudo('');
    setCropperSrc(null);
  }, [open, editing, activeTemplate, userTemplates]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return activeTemplate || userTemplates[0] || null;
    return (
      userTemplates.find((tpl) => tpl._id === selectedTemplateId) ||
      (activeTemplate?._id === selectedTemplateId ? activeTemplate : null) ||
      activeTemplate ||
      null
    );
  }, [selectedTemplateId, userTemplates, activeTemplate]);

  const questions = useMemo(() => {
    const list = selectedTemplate?.questions || [];
    return [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [selectedTemplate]);

  const filteredRivals = useMemo(() => {
    const q = rivalSearch.trim().toLowerCase();
    if (!q) return rivals;
    return rivals.filter((r) => (r.nombre || '').toLowerCase().includes(q));
  }, [rivals, rivalSearch]);

  const buildSavePayload = (answers = dynamicAnswers) => {
    const { topLevel, customAnswers } = partitionAnswers(answers);
    const data = {
      rival: rival.trim(),
      rivalId: rivalId || undefined,
      rivalEscudo: rivalEscudo || '',
      equipo: selectedTeam._id,
      usuario: userId,
      templateId: selectedTemplate?._id,
      ...topLevel,
      customAnswers,
    };
    if (data.alineacion) {
      data.alineacion = normalizeFormation(data.alineacion);
    }
    return data;
  };

  const setAnswer = (qid, value) => {
    setDynamicAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const syncRivalVideoFolders = async (answers = dynamicAnswers) => {
    const folderIds = new Set();
    Object.values(answers || {}).forEach((answer) => {
      const folderId = answer?.rivalFolder || answer?.folderId;
      if (folderId) folderIds.add(folderId);
    });
    await Promise.all(
      Array.from(folderIds).map((folderId) => renameRivalAnalysisFolder(folderId, rival))
    );
  };

  // --- handlers
  const handlePickRival = (r) => {
    setRival(r.nombre || '');
    setRivalId(r._id || '');
    setRivalEscudo(r.escudo || '');
    setShowRivalPicker(false);
  };

  const handleCreateRivalImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCropperSrc(URL.createObjectURL(file));
  };

  const openCreateRival = () => {
    setNewRivalName(rivalSearch.trim());
    setNewRivalEscudo('');
    setShowCreateRival(true);
  };

  const handleCreateRival = async () => {
    if (!newRivalName.trim()) {
      toast.error(t('rivals.nameRequired', 'El nombre es obligatorio'));
      return;
    }
    if (!selectedTeam?._id) {
      toast.error(t('rivals.noTeamSelected', 'No hay equipo seleccionado'));
      return;
    }

    setCreatingRival(true);
    try {
      const created = await dispatch(createRival({
        nombre: newRivalName.trim(),
        escudo: newRivalEscudo || '',
        equipo: selectedTeam._id,
        usuario: userId,
      })).unwrap();
      await dispatch(fetchRivalsByTeam({ teamId: selectedTeam._id }));
      handlePickRival(created);
      setShowCreateRival(false);
      setNewRivalName('');
      setNewRivalEscudo('');
      setRivalSearch('');
      toast.success(t('rivals.createSuccess', 'Rival creado correctamente'));
    } catch (err) {
      toast.error(err?.message || t('rivals.saveError', 'No se pudo guardar el rival'));
    } finally {
      setCreatingRival(false);
    }
  };

  const openFormationPicker = (qid) => {
    setFormationQuestionId(qid);
    setShowFormationModal(true);
  };

  const pickFormation = (formation) => {
    if (formationQuestionId) {
      setAnswer(formationQuestionId, formation);
    }
    setShowFormationModal(false);
    setFormationQuestionId(null);
  };

  const openSnapshot = (qid) => {
    setSnapshotQuestionId(qid);
    setShowSnapshot(true);
  };

  const handleSnapshotSave = (payload) => {
    if (snapshotQuestionId) {
      setAnswer(snapshotQuestionId, payload);
    }
    setShowSnapshot(false);
    setSnapshotQuestionId(null);
  };

  const triggerVideoUpload = (qid) => {
    setVideoQuestionId(qid);
    fileInputRef.current?.click();
  };

  const openVideoRecorder = (qid) => {
    const q = questions.find((x) => x.id === qid);
    setVideoRecorderQuestionId(qid);
    setVideoRecorderQuestionText(q ? getQuestionText(q, t) : '');
    setShowVideoRecorder(true);
  };

  const handleVideoRecorded = async (videoId, meta = {}) => {
    if (!videoRecorderQuestionId || !videoId) return;

    const qid = videoRecorderQuestionId;
    const rivalFolder = meta?.rivalFolder || meta?.folderId || null;
    const videoAnswer = { videoId, rivalFolder };
    const nextAnswers = { ...dynamicAnswers, [qid]: videoAnswer };

    setDynamicAnswers(nextAnswers);

    if (!editing?._id) {
      toast.success(
        t('rivalAnalysis.form.videoSavedSuccess', 'Vídeo guardado correctamente')
      );
      return;
    }

    try {
      setSaving(true);
      const { topLevel, customAnswers } = partitionAnswers({ [qid]: videoAnswer });
      const partialData = { ...topLevel };
      if (Object.keys(customAnswers).length > 0) {
        partialData.customAnswers = {
          ...persistedCustomAnswersRef.current,
          ...customAnswers,
        };
      }
      await dispatch(updateRivalAnalysis({ id: editing._id, data: partialData })).unwrap();
      if (partialData.customAnswers) {
        persistedCustomAnswersRef.current = partialData.customAnswers;
      }
      onSaved?.();
      toast.success(
        t('rivalAnalysis.form.videoSavedSuccess', 'Vídeo guardado correctamente')
      );
    } catch (err) {
      const msg =
        err?.message ||
        t('rivalAnalysis.form.videoSaveError', 'Error al guardar el vídeo');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openVideoViewer = async (videoId) => {
    if (!videoId) return;
    setVideoViewerUrl('');
    setVideoViewerLoading(true);
    try {
      const url = await resolvePlayableVideoUrl(videoId);
      if (url) setVideoViewerUrl(url);
    } catch (err) {
      toast.error(err?.message || t('rivalAnalysis.form.videoLoadError', 'No se pudo cargar el vídeo'));
    } finally {
      setVideoViewerLoading(false);
    }
  };

  const handleVideoRecorderError = (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      t('rivalAnalysis.form.videoSaveError', 'Error al guardar el vídeo');
    toast.error(msg);
  };

  const uploadVideoFile = async (file, qid) => {
    setUploadingVideos((prev) => ({ ...prev, [qid]: true }));
    try {
      const contentType = file.type || 'video/mp4';
      const uploadResponse = await api.post('/video/proxy-upload', file, {
        timeout: 180000,
        headers: { 'Content-Type': contentType },
        transformRequest: [(data) => data],
      });
      const r2Key = uploadResponse.data?.r2Key;
      if (!r2Key) {
        throw new Error(t('rivalAnalysis.video.uploadFailed', 'No se pudo subir el archivo de vídeo'));
      }
      const saveResponse = await saveTacticalVideo({
        title: file.name || 'Video subido',
        r2Key: r2Key,
      });
      const savedVideo = saveResponse.data?.video || saveResponse.video;
      if (!savedVideo?._id) {
        throw new Error(t('rivalAnalysis.video.saveFailed', 'No se pudo registrar el vídeo en el sistema'));
      }
      setAnswer(qid, {
        videoId: savedVideo._id,
        url: savedVideo.videoUrl,
      });
      toast.success(t('rivalAnalysis.video.uploadSuccess', 'Vídeo subido y guardado correctamente'));
    } catch (err) {
      console.error('Error uploading video:', err);
      const msg = err?.response?.data?.message || err?.message || t('rivalAnalysis.video.uploadError', 'Error al subir el vídeo');
      toast.error(msg);
    } finally {
      setUploadingVideos((prev) => ({ ...prev, [qid]: false }));
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !videoQuestionId) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('rivalAnalysis.video.tooLarge', 'El vídeo es demasiado grande (máx 50MB)'));
      return;
    }
    uploadVideoFile(file, videoQuestionId);
  };

  const handleSave = async () => {
    if (!rivalId) {
      showMissingFieldsToast(t, [t('rivalAnalysis.form.rival', 'Rival')]);
      return;
    }
    if (!selectedTeam?._id) {
      toast.error(t('rivalAnalysis.form.noTeam', 'No hay equipo seleccionado'));
      return;
    }
    if (!selectedTemplate?._id) {
      showMissingFieldsToast(t, [t('rivalAnalysis.form.template', 'Plantilla')]);
      return;
    }
    // validar duplicado
    const dup = existingAnalyses.find(
      (a) =>
        (a.rivalId || '') === rivalId &&
        (!editing || a._id !== editing._id)
    );
    if (dup) {
      setError(t('rivalAnalysis.form.duplicate', 'Ya existe un análisis para este rival'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = buildSavePayload(dynamicAnswers);
      if (editing) {
        await dispatch(updateRivalAnalysis({ id: editing._id, data })).unwrap();
        await syncRivalVideoFolders(dynamicAnswers);
        toast.success(t('rivalAnalysis.form.updateSuccess', 'Análisis actualizado'));
      } else {
        await dispatch(createRivalAnalysis(data)).unwrap();
        await syncRivalVideoFolders(dynamicAnswers);
        toast.success(t('rivalAnalysis.form.createSuccess', 'Análisis creado'));
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg = err?.message || t('common.error', 'Error');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // --- render question by type
  const renderQuestion = (q) => {
    const Icon = getIconComponent(q.icon);
    const value = dynamicAnswers[q.id];

    let body = null;
    if (q.type === 'select') {
      body = (
        <PillRow>
          {(q.options || []).map((opt) => (
            <Pill
              key={opt.key}
              type="button"
              $active={value === opt.key}
              onClick={() => setAnswer(q.id, value === opt.key ? '' : opt.key)}
            >
              {resolveOptionLabel(opt, t)}
            </Pill>
          ))}
        </PillRow>
      );
    } else if (q.type === 'text') {
      const isLong = q.id === 'observaciones';
      body = isLong ? (
        <TextArea
          rows={3}
          value={value || ''}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        />
      ) : (
        <Input value={value || ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
      );
    } else if (q.type === 'players') {
      body = (
        <PlayersEditor value={value} onChange={(v) => setAnswer(q.id, v)} t={t} />
      );
    } else if (q.type === 'formation') {
      const display = value ? getFormationShort(normalizeFormation(value)) : '';
      body = (
        <Row $gap={8}>
          <Button $variant="secondary" type="button" onClick={() => openFormationPicker(q.id)}>
            <Row $gap={6}>
              <MdGridOn size={16} />
              {display ||
                t('rivalAnalysis.form.pickFormation', 'Elegir formación')}
            </Row>
          </Button>
          {value && (
            <Button $variant="ghost" type="button" onClick={() => setAnswer(q.id, '')}>
              <MdClose size={14} />
            </Button>
          )}
        </Row>
      );
    } else if (q.type === 'graphic') {
      body = (
        <Stack $gap={6}>
          {value?.imageBase64 ? (
            <SnapshotPreview>
              <img src={value.imageBase64} alt="snapshot" />
            </SnapshotPreview>
          ) : (
            <SnapshotPreview>
              <Muted>{t('rivalAnalysis.form.noSnapshot', 'Sin gráfico')}</Muted>
            </SnapshotPreview>
          )}
          <Row $gap={6}>
            <Button $variant="secondary" type="button" onClick={() => openSnapshot(q.id)}>
              <Row $gap={6}>
                <MdBrush size={16} />
                {value?.imageBase64
                  ? t('rivalAnalysis.form.editGraphic', 'Editar gráfico')
                  : t('rivalAnalysis.form.addGraphic', 'Crear gráfico')}
              </Row>
            </Button>
            {value?.imageBase64 && (
              <Button $variant="ghost" type="button" onClick={() => setAnswer(q.id, null)}>
                <MdDelete size={14} />
              </Button>
            )}
          </Row>
        </Stack>
      );
    } else if (q.type === 'video') {
      const isUploading = !!uploadingVideos[q.id];
      const hasVideoId = !!value?.videoId;
      const hasInlineUrl = !!value?.url;
      const hasAny = hasVideoId || hasInlineUrl;
      const playUrl = hasInlineUrl ? value.url : '';
      body = (
        <Stack $gap={6}>
          {isUploading ? (
            <SnapshotPreview>
              <Muted>{t('rivalAnalysis.video.uploadingText', 'Subiendo vídeo a la nube...')}</Muted>
            </SnapshotPreview>
          ) : hasAny ? (
            <VideoPreviewThumb
              value={value}
              fallback={<MdMovieFilter size={48} color={theme.colors.textMuted} aria-hidden="true" />}
              playSize={56}
              alt={getQuestionText(q, t)}
              onOpen={() => hasVideoId ? openVideoViewer(value.videoId) : setVideoViewerUrl(playUrl)}
            />
          ) : (
            <SnapshotPreview>
              <Muted>{t('rivalAnalysis.form.noVideo', 'Sin vídeo')}</Muted>
            </SnapshotPreview>
          )}
          <Row $gap={6}>
            <Button $variant="secondary" type="button" onClick={() => triggerVideoUpload(q.id)} disabled={isUploading}>
              <Row $gap={6}>
                <MdVideocam size={16} />
                {hasAny
                  ? t('rivalAnalysis.form.changeVideo', 'Cambiar vídeo')
                  : t('rivalAnalysis.form.uploadVideo', 'Subir vídeo')}
              </Row>
            </Button>
            <Button $variant="secondary" type="button" onClick={() => openVideoRecorder(q.id)} disabled={isUploading}>
              <Row $gap={6}>
                <MdMovieFilter size={16} />
                {hasVideoId
                  ? t('rivalAnalysis.form.recordAgain', 'Regrabar pizarra')
                  : t('rivalAnalysis.form.recordFromBoard', 'Grabar desde pizarra')}
              </Row>
            </Button>
            {hasAny && (
              <Button $variant="ghost" type="button" onClick={() => setAnswer(q.id, null)} disabled={isUploading}>
                <MdDelete size={14} />
              </Button>
            )}
          </Row>
        </Stack>
      );
    }

    return (
      <QBlock key={q.id}>
        <QHead>
          <QIcon $color={q.iconColor || '#3578e5'}>
            <Icon size={18} />
          </QIcon>
          <QTitle>{getQuestionText(q, t)}</QTitle>
        </QHead>
        {body}
      </QBlock>
    );
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={saving || Object.values(uploadingVideos).some(Boolean) ? undefined : onClose}
        title={
          editing
            ? t('rivalAnalysis.form.editTitle', 'Editar análisis')
            : t('rivalAnalysis.form.createTitle', 'Nuevo análisis')
        }
        width={FORM_MODAL_WIDTH}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={onClose} disabled={saving || Object.values(uploadingVideos).some(Boolean)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleSave} disabled={saving || Object.values(uploadingVideos).some(Boolean)}>
              {saving ? t('common.saving', 'Guardando…') : Object.values(uploadingVideos).some(Boolean) ? t('rivalAnalysis.video.uploading', 'Subiendo vídeo…') : t('common.save', 'Guardar')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={14}>
          {/* Selector de rival */}
          <Field>
            <Label>{t('rivalAnalysis.form.rival', 'Rival')}</Label>
            <RivalTrigger
              type="button"
              $empty={!rival}
              onClick={() => setShowRivalPicker(true)}
            >
              <RivalEscudoSm>
                {rivalEscudo ? (
                  <img src={rivalEscudo} alt="escudo" />
                ) : (
                  <MdShield size={18} color={theme.colors.textMuted} />
                )}
              </RivalEscudoSm>
              <span style={{ flex: 1 }}>
                {rival || t('rivalAnalysis.form.rivalPlaceholder', 'Selecciona un rival')}
              </span>
              <MdShield size={18} color={theme.colors.textMuted} />
            </RivalTrigger>
            {error && <ErrorText>{error}</ErrorText>}
          </Field>

          <Field>
            <Label>{t('rivalAnalysis.form.template', 'Plantilla')}</Label>
            <NativeSelect
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              {userTemplates.length === 0 && !activeTemplate && (
                <option value="">{t('rivalAnalysis.form.noTemplateOption', 'Sin plantillas')}</option>
              )}
              {activeTemplate && !userTemplates.some((tpl) => tpl._id === activeTemplate._id) && (
                <option value={activeTemplate._id}>{activeTemplate.isRecommended ? t('rivalAnalysis.template.recommendedTemplate', 'Plantilla Recomendada') : (activeTemplate.name || activeTemplate.nombre || t('rivalAnalysis.form.activeTemplate', 'Plantilla activa'))}</option>
              )}
              {userTemplates.map((tpl) => (
                <option key={tpl._id} value={tpl._id}>
                  {tpl.isRecommended ? t('rivalAnalysis.template.recommendedTemplate', 'Plantilla Recomendada') : (tpl.name || tpl.nombre || t('rivalAnalysis.form.unnamedTemplate', 'Plantilla sin nombre'))}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {!selectedTemplate && (
            <Muted>
              {t(
                'rivalAnalysis.form.noTemplate',
                'No hay plantilla disponible. Crea una plantilla para añadir preguntas.'
              )}
            </Muted>
          )}

          {questions.map(renderQuestion)}

          {/* Aviso si no hay pregunta de alineacion en plantilla pero hay valor manual */}
          {!questions.some((q) => q.id === 'alineacion') && (
            <QBlock>
              <QHead>
                <QIcon $color="#3578e5">
                  <MdGridOn size={18} />
                </QIcon>
                <QTitle>{t('rivalAnalysis.fields.alineacion', 'Alineación')}</QTitle>
              </QHead>
              <Row $gap={8}>
                <Button
                  $variant="secondary"
                  type="button"
                  onClick={() => openFormationPicker('alineacion')}
                >
                  <Row $gap={6}>
                    <MdGridOn size={16} />
                    {dynamicAnswers.alineacion
                      ? getFormationShort(normalizeFormation(dynamicAnswers.alineacion))
                      : t('rivalAnalysis.form.pickFormation', 'Elegir formación')}
                  </Row>
                </Button>
                {dynamicAnswers.alineacion && (
                  <Button
                    $variant="ghost"
                    type="button"
                    onClick={() => setAnswer('alineacion', '')}
                  >
                    <MdClose size={14} />
                  </Button>
                )}
              </Row>
            </QBlock>
          )}
        </Stack>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          style={{ display: 'none' }}
        />
      </Modal>

      {/* Picker de rival */}
      <Modal
        open={showRivalPicker}
        onClose={() => setShowRivalPicker(false)}
        title={t('rivalAnalysis.form.pickRivalTitle', 'Elegir rival')}
        width={460}
        footer={
          <Row style={{ justifyContent: 'space-between', width: '100%' }}>
            <Muted>{filteredRivals.length} / {rivals.length}</Muted>
            <Button type="button" onClick={openCreateRival}>
              <MdAdd /> {t('matchSheet.newRival', 'Nuevo rival')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={10}>
          <Input
            value={rivalSearch}
            onChange={(e) => setRivalSearch(e.target.value)}
            placeholder={t('common.search', 'Buscar…')}
            autoFocus
          />
          {filteredRivals.length === 0 ? (
            <Muted>{t('rivalAnalysis.form.noRivals', 'Sin rivales')}</Muted>
          ) : (
            <Stack $gap={6}>
              {filteredRivals.map((r) => (
                <RivalOption
                  key={r._id}
                  type="button"
                  $selected={r._id === rivalId}
                  onClick={() => handlePickRival(r)}
                >
                  <RivalEscudoSm>
                    {r.escudo ? (
                      <img src={r.escudo} alt={r.nombre} />
                    ) : (
                      <MdShield size={16} color={theme.colors.textMuted} />
                    )}
                  </RivalEscudoSm>
                  <span style={{ flex: 1 }}>{r.nombre}</span>
                  {r._id === rivalId && <MdCheckCircle size={18} color={theme.colors.success} />}
                </RivalOption>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>

      <Modal
        open={showCreateRival}
        onClose={() => setShowCreateRival(false)}
        title={t('matchSheet.newRival', 'Nuevo rival')}
        width={FORM_MODAL_WIDTH}
        footer={
          <Row $gap={8}>
            <Button type="button" $variant="ghost" onClick={() => setShowCreateRival(false)}>
              <MdClose /> {t('common.cancel', 'Cancelar')}
            </Button>
            <Button type="button" onClick={handleCreateRival} disabled={creatingRival}>
              {creatingRival ? t('common.saving', 'Guardando…') : t('common.create', 'Crear')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={12}>
          <Row $gap={12}>
            <ImagePicker>
              {newRivalEscudo ? (
                <img src={newRivalEscudo} alt="" />
              ) : (
                <MdImage size={28} color={theme.colors.textMuted} />
              )}
              <input type="file" accept="image/*" onChange={handleCreateRivalImage} />
            </ImagePicker>
            <Field style={{ flex: 1, marginBottom: 0 }}>
              <Label>{t('matchSheet.rivalName', 'Nombre')}</Label>
              <Input
                value={newRivalName}
                onChange={(e) => setNewRivalName(e.target.value)}
                placeholder={t('rivals.namePlaceholder', 'Nombre del rival')}
                autoFocus
              />
              <Muted>{t('rivalAnalysis.form.createRivalHelp', 'El rival se creará en tu lista y quedará seleccionado para este análisis.')}</Muted>
            </Field>
          </Row>
        </Stack>
      </Modal>

      {cropperSrc ? (
        <ImageCropper
          src={cropperSrc}
          title={t('rivals.adjustShield', 'Ajustar escudo')}
          onConfirm={(dataUrl) => {
            setNewRivalEscudo(dataUrl);
            setCropperSrc(null);
          }}
          onCancel={() => setCropperSrc(null)}
        />
      ) : null}

      {/* Picker de formación */}
      <Modal
        open={showFormationModal}
        onClose={() => {
          setShowFormationModal(false);
          setFormationQuestionId(null);
        }}
        title={t('rivalAnalysis.form.pickFormation', 'Elegir formación')}
        width={420}
      >
        <PillRow>
          {ALINEACIONES.map((f) => (
            <Pill
              key={f}
              type="button"
              $active={
                formationQuestionId &&
                normalizeFormation(dynamicAnswers[formationQuestionId]) === f
              }
              onClick={() => pickFormation(f)}
            >
              {getFormationShort(f)}
            </Pill>
          ))}
        </PillRow>
      </Modal>

      {/* Snapshot táctico (Field vendor real, montado como overlay) */}
      <TacticalSnapshotModal
        open={showSnapshot}
        onClose={() => {
          setShowSnapshot(false);
          setSnapshotQuestionId(null);
        }}
        onSave={handleSnapshotSave}
        initialPlayers={
          snapshotQuestionId ? dynamicAnswers[snapshotQuestionId]?.elements : undefined
        }
        initialFieldType={
          snapshotQuestionId
            ? dynamicAnswers[snapshotQuestionId]?.fieldType || 'full'
            : 'full'
        }
        title={t('rivalAnalysis.form.tacticalBoard', 'Pizarra táctica')}
      />

      {/* Grabador de vídeo táctico (Field en modo sandbox + autoOpenVideoRecorder) */}
      <TacticalVideoRecorderModal
        open={showVideoRecorder}
        onClose={() => {
          setShowVideoRecorder(false);
          setVideoRecorderQuestionId(null);
          setVideoRecorderQuestionText('');
        }}
        onSaved={handleVideoRecorded}
        onError={handleVideoRecorderError}
        rivalName={rival}
        questionText={videoRecorderQuestionText}
        title={t('rivalAnalysis.form.recordTacticalVideo', 'Grabar vídeo táctico')}
      />

      {/* Reproductor del vídeo guardado: se abre al pulsar la miniatura */}
      <Modal
        open={!!videoViewerUrl || videoViewerLoading}
        onClose={() => { setVideoViewerUrl(''); setVideoViewerLoading(false); }}
        title={t('rivalAnalysis.form.videoPreview', 'Vídeo')}
        width={760}
      >
        {videoViewerLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: theme.colors.textSecondary }}>
            {t('rivalAnalysis.form.loadingVideo', 'Generando vídeo…')}
          </div>
        ) : videoViewerUrl ? (
          <video
            key={videoViewerUrl}
            src={videoViewerUrl}
            controls
            autoPlay
            style={{ width: '100%', maxHeight: '70vh', borderRadius: 6 }}
          />
        ) : null}
      </Modal>
    </>
  );
}
