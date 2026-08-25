// Modal de detalle (read-only) de un análisis de rival.
// Paridad funcional con misterdata-source/src/components/pages/rivalAnalysis/
// rivalAnalysisList.js (renderDynamicQuestions / renderLegacyQuestions /
// renderOrphanedCustomAnswers / sección Observaciones / players cards /
// stats row / video play+download).
//
// Estructura visual (top → bottom):
//   1. Header "Análisis del Rival" (en Modal title) + botones PDF/Edit/Delete/Close.
//   2. Card grande con título del rival (icono analytics).
//   3. Stats row: Equipo seleccionado (verde) + Rival (rojo).
//   4. Formación (chip) si existe.
//   5. Card "Análisis Táctico": preguntas dinámicas (template) o legacy.
//   6. Players destacados (estrella amarilla) + débiles (rojo).
//   7. Observaciones (azul).
//   8. Orphaned customAnswers: videos/graphics no cubiertos por la plantilla.
//   9. Video viewer modal (con descarga directa).
//
// Notas:
// - Para análisis "viejos" sin templateId, mostramos preguntas q1..q11 + q12.
// - Para análisis nuevos con template, recorremos template.questions ordenadas.
// - Los videos resuelven primero la URL real guardada en R2 o un job
//   regenerado antes de reproducir/descargar.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import {
  MdClose,
  MdDelete,
  MdEdit,
  MdPictureAsPdf,
  MdShield,
  MdAnalytics,
  MdSportsSoccer,
  MdGridOn,
  MdFlag,
  MdStar,
  MdTrendingDown,
  MdNoteAlt,
  MdVideocam,
  MdBrush,
  MdPlayCircle,
  MdDownload,
  MdArrowForward,
  MdLocalFireDepartment,
  MdCallSplit,
  MdHeight,
  MdPeople,
  MdSwapHoriz,
  MdShieldMoon,
  MdBackHand,
  MdSwapVert,
  MdPersonSearch,
} from 'react-icons/md';

import { deleteRivalAnalysis } from '@/store/slices/rivalAnalysis/rivalAnalysisThunks';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { downloadResolvedVideo, resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import { getVideoById } from '@/utils/api';
import VideoPoster from '@/components/shared/VideoPoster';
import {
  KNOWN_FIELDS,
  getIconComponent,
  getQuestionText,
  resolveOptionLabel,
  normalizeFormation,
  translateEnum,
} from './rivalAnalysisData';
import { generateRivalAnalysisPdf } from './pdf';

const sanitizeVideoQuestionName = (value) =>
  String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------- VideoBlock component ----------
function VideoBlock({ videoId, inlineUrl, label, poster, onPlay, onDownload, t }) {
  const [meta, setMeta] = useState({ posterUrl: poster || '', videoName: '', resolvedUrl: '' });

  const captureFrame = async (videoUrl) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'auto';
    return new Promise((resolve) => {
      video.addEventListener('loadeddata', () => { video.currentTime = 0.1; });
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
    if (!videoId) {
      if (inlineUrl) {
        setMeta((m) => ({ ...m, resolvedUrl: inlineUrl }));
      }
      return;
    }
    getVideoById(videoId).then(async (data) => {
      const thumb = data?.video?.thumbnailUrl || data?.video?.thumbnail || data?.video?.poster;
      const name = data?.video?.name || '';
      
      let directUrl = '';
      try {
        directUrl = await resolvePlayableVideoUrl(videoId, { objectUrl: false });
      } catch (err) {
        console.error('Error resolving video url for UI', err);
      }

      let posterUrl = thumb;
      if (!posterUrl) {
        const url = await resolvePlayableVideoUrl(videoId);
        if (url) {
          const frame = await captureFrame(url);
          if (frame) posterUrl = frame;
        }
      }
      
      setMeta({ posterUrl: posterUrl || '', videoName: name, resolvedUrl: directUrl });
    }).catch(async () => {
      let directUrl = '';
      try {
        directUrl = await resolvePlayableVideoUrl(videoId, { objectUrl: false });
      } catch (err) {
        console.error('Error resolving fallback video url for UI', err);
      }
      setMeta((m) => ({
        ...m,
        resolvedUrl: directUrl || inlineUrl || '',
        videoName: label || '',
      }));
    });
  }, [videoId, inlineUrl]);

  const displayPoster = meta.posterUrl || poster || '';
  const displayName = meta.videoName || label;

  return (
    <QBlock>
      <AnswerSlot $stack>
        <VideoPreviewButton
          type="button"
          onClick={() => onPlay(videoId, inlineUrl)}
        >
          <VideoPoster
            video={videoId ? { videoId, thumbnailUrl: displayPoster } : null}
            src={inlineUrl || ''}
            poster={displayPoster}
            playSize={54}
            alt={label}
          />
        </VideoPreviewButton>
        {videoId ? (
          <VideoActions>
            <VideoBtn type="button" onClick={() => onPlay(videoId)}>
              <MdPlayCircle size={16} />
              {t('rivalAnalysis.actions.playVideo', 'Reproducir')}
            </VideoBtn>
            <VideoBtn type="button" $variant="download" onClick={() => onDownload(videoId, displayName)}>
              <MdDownload size={16} />
              {t('rivalAnalysis.actions.saveToGallery', 'Descargar')}
            </VideoBtn>
          </VideoActions>
        ) : null}
      </AnswerSlot>
    </QBlock>
  );
}



// ---------- styles ----------
const HeaderCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  min-width: 0;

  @media (max-width: 600px) {
    align-items: flex-start;
    padding: 12px;
  }
`;

const RivalTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  min-width: 0;
  overflow-wrap: anywhere;

  @media (max-width: 600px) {
    font-size: 16px;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radius.md};
  min-width: 0;
`;

const StatValue = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;

  @media (max-width: 600px) {
    padding: 12px;
  }
`;

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const QBlock = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const QHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const QIcon = styled.div`
  width: 28px;
  height: 28px;
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
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Value = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-wrap;
  padding-left: 36px;
  overflow-wrap: anywhere;

  @media (max-width: 600px) {
    padding-left: 0;
  }
`;

const NoValue = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-style: italic;
  font-size: 13px;
  padding-left: 36px;

  @media (max-width: 600px) {
    padding-left: 0;
  }
`;

const AnswerSlot = styled.div`
  padding-left: 36px;
  min-width: 0;

  ${({ $stack }) =>
    $stack
      ? `
    display: flex;
    flex-direction: column;
    gap: 8px;
  `
      : ''}

  @media (max-width: 600px) {
    padding-left: 0;
  }
`;

const Chip = styled.span`
  background: #eef2ff;
  color: #3949ab;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
`;

const PlayerItem = styled.div`
  background: ${({ $danger, theme }) =>
    $danger ? '#fef2f2' : theme.colors.backgroundAlt};
  border-left: 4px solid ${({ $accent }) => $accent};
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  margin-bottom: 6px;
  min-width: 0;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PlayerName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ $danger }) => ($danger ? '#dc2626' : 'inherit')};
  overflow-wrap: anywhere;
`;

const PlayerObs = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
  overflow-wrap: anywhere;
`;

const ImageBox = styled.img`
  max-width: 100%;
  max-height: 320px;
  border-radius: 6px;
  display: block;
  margin-top: 4px;
  cursor: zoom-in;
`;

const VideoActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const VideoPreviewButton = styled.button`
  width: min(100%, 360px);
  aspect-ratio: 16 / 9;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  cursor: pointer;
  background: #0f172a;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  max-width: 100%;

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const VideoBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ $variant }) => ($variant === 'download' ? '#059669' : '#3578e5')};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  min-width: 0;

  &:hover {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const VideoPlayer = styled.video`
  width: 100%;
  max-width: 100%;
  max-height: 70vh;
  border-radius: 6px;
  background: #000;
`;

// ---------- helpers ----------
function getAnswerValue(analysis, q) {
  if (KNOWN_FIELDS.includes(q.id)) return analysis[q.id];
  return analysis.customAnswers?.[q.id];
}

function isEmptyAnswer(v) {
  return (
    v == null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.keys(v).length === 0 &&
      !v.imageBase64 &&
      !v.videoId &&
      !v.url)
  );
}

// Mapeo de iconos para preguntas legacy q1..q12 (port misterdata).
const LEGACY_QUESTIONS = [
  { id: 'ladoDebilSalidaBalon', key: 'rivalAnalysis.questions.q1', icon: MdArrowForward, color: '#6366f1', translate: true },
  { id: 'generanPeligroPorDonde', key: 'rivalAnalysis.questions.q2', icon: MdLocalFireDepartment, color: '#ef4444', translate: true },
  { id: 'combinativoDirecto', key: 'rivalAnalysis.questions.q3', icon: MdCallSplit, color: '#10b981', translate: true },
  { id: 'pressingAltura', key: 'rivalAnalysis.questions.q4', icon: MdHeight, color: '#f59e0b', translate: true },
  { id: 'pressingPuntas', key: 'rivalAnalysis.questions.q5', icon: MdPeople, color: '#8b5cf6' },
  { id: 'pressingSaltanLineas', key: 'rivalAnalysis.questions.q6', icon: MdSwapHoriz, color: '#06b6d4' },
  { id: 'ortjDefendiendo', key: 'rivalAnalysis.questions.q7', icon: MdShieldMoon, color: '#14b8a6' },
  { id: 'zonaSaquePortero', key: 'rivalAnalysis.questions.q10', icon: MdBackHand, color: '#ec4899' },
  { id: 'cambioSistemaDerrota', key: 'rivalAnalysis.questions.q11', icon: MdSwapVert, color: '#f97316' },
];

// ---------- component ----------
export default function AnalysisDetailModal({
  open,
  onClose,
  analysis,
  template,
  selectedTeam,
  onEdit,
  onDeleted,
  canMutate,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Estado para el modal de visualización de video (un solo player a la vez).
  const [videoModalUrl, setVideoModalUrl] = useState(null);
  const [videoModalLoading, setVideoModalLoading] = useState(false);
  // Estado para zoom de imagen.
  const [imgZoomUrl, setImgZoomUrl] = useState(null);

  const templateQuestions = useMemo(() => {
    if (!template?.questions) return [];
    return [...template.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [template]);

  if (!open || !analysis) return null;

  const handleDelete = async () => {
    const ok = await confirmAction(
      t('rivalAnalysis.detail.deleteConfirm', '¿Eliminar el análisis de "{{name}}"?', {
        name: analysis.rival,
      })
    );
    if (!ok) return;
    try {
      await dispatch(deleteRivalAnalysis(analysis._id)).unwrap();
      toast.success(t('rivalAnalysis.detail.deleteSuccess', 'Análisis eliminado'));
      onDeleted?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.message || t('common.error', 'Error'));
    }
  };

  const handlePdf = () => {
    generateRivalAnalysisPdf(analysis, template, t, selectedTeam);
  };

  const openScouting = () => {
    const params = new URLSearchParams();
    if (analysis?._id) params.set('rivalAnalysis', analysis._id);
    if (analysis?.rival) params.set('rival', analysis.rival);
    const rivalId = analysis?.rivalId?._id || analysis?.rivalId;
    if (rivalId) params.set('rivalId', rivalId);
    navigate(`/scouting?${params.toString()}`);
    onClose?.();
  };

  const handlePlayVideo = async (videoId) => {
    if (!videoId) return;
    setVideoModalUrl(null);
    setVideoModalLoading(true);
    try {
      const url = await resolvePlayableVideoUrl(videoId);
      if (url) setVideoModalUrl(url);
    } catch (err) {
      toast.error(err?.message || t('rivalAnalysis.actions.videoLoadError', 'No se pudo cargar el vídeo'));
    } finally {
      setVideoModalLoading(false);
    }
  };

  const handleDownloadVideo = async (videoId, videoName) => {
    if (!videoId) return;
    try {
      toast.success(t('myVideos.downloadingStarted', 'Preparando el video para guardarlo...'));
      const cleanName = sanitizeVideoQuestionName(videoName) || t('rivalAnalysis.video', 'video');
      const name = cleanName.toLowerCase().endsWith('.mp4')
        ? cleanName.slice(0, -4)
        : cleanName;
      await downloadResolvedVideo(videoId, name);
      toast.success(t('myVideos.downloadStarted', 'Video guardado en la galeria.'));
    } catch (err) {
      toast.error(t('myVideos.downloadError', 'No se pudo guardar el video. Intentalo de nuevo.'));
    }
  };

  // -------- Render helpers --------

  const renderQuestionAnswer = (questionText, answer, IconCmp, iconColor, translate = false) => {
    const hasValue = answer !== undefined && answer !== null && String(answer).trim() !== '';
    const display = hasValue ? (translate ? translateEnum(answer, t) : answer) : null;
    return (
      <QBlock key={questionText}>
        <QHead>
          <QIcon $color={iconColor || '#3578e5'}>
            <IconCmp size={16} />
          </QIcon>
          <QTitle>{questionText}</QTitle>
        </QHead>
        {hasValue ? (
          <Value>{display}</Value>
        ) : (
          <NoValue>{t('rivalAnalysis.noAnswer', 'Sin respuesta')}</NoValue>
        )}
      </QBlock>
    );
  };

  const renderGraphicBlock = (label, IconCmp, color, imageBase64, key) => (
    <QBlock key={key}>
      <QHead>
        <QIcon $color={color || '#3578e5'}>
          <IconCmp size={16} />
        </QIcon>
        <QTitle>{label}</QTitle>
      </QHead>
      <AnswerSlot>
        <ImageBox
          src={imageBase64}
          alt={label}
          onClick={() => setImgZoomUrl(imageBase64)}
        />
      </AnswerSlot>
    </QBlock>
  );

  const renderVideoBlock = (label, IconCmp, color, value, key) => {
    const videoId = value?.videoId;
    const inlineUrl = value?.url;
    return (
      <React.Fragment key={key}>
        <QHead>
          <QIcon $color={color || '#3578e5'}>
            <IconCmp size={16} />
          </QIcon>
          <QTitle>{label}</QTitle>
        </QHead>
        <VideoBlock
          videoId={videoId}
          inlineUrl={inlineUrl}
          label={label}
          poster={value?.thumbnailUrl || value?.thumbnail}
          onPlay={(id, url) => (id ? handlePlayVideo(id) : url ? setVideoModalUrl(url) : null)}
          onDownload={handleDownloadVideo}
          t={t}
        />
      </React.Fragment>
    );
  };

  // Render preguntas dinámicas (template). Devuelve {nodes, coveredKeys}.
  const renderDynamicQuestions = () => {
    if (!templateQuestions.length) return null;
    const coveredKeys = templateQuestions.map((q) => q.id);
    const nodes = templateQuestions.map((q) => {
      const answer = getAnswerValue(analysis, q);
      const Icon = getIconComponent(q.icon);
      const color = q.iconColor || '#3578e5';
      const qText = getQuestionText(q, t);

      // players
      if (q.type === 'players') {
        if (!answer || !Array.isArray(answer) || answer.length === 0) {
          return renderQuestionAnswer(qText, null, Icon, color);
        }
        return (
          <QBlock key={q.id}>
            <QHead>
              <QIcon $color={color}>
                <Icon size={16} />
              </QIcon>
              <QTitle>
                {qText} ({answer.length})
              </QTitle>
            </QHead>
            <AnswerSlot>
              {answer.map((p, i) => (
                <PlayerItem key={i} $accent={color}>
                  <PlayerName>{getPlayerFullName(p) || p.nombre || p.name || t('player.player', 'Jugador')}</PlayerName>
                  {p.observacion && <PlayerObs>{p.observacion}</PlayerObs>}
                </PlayerItem>
              ))}
            </AnswerSlot>
          </QBlock>
        );
      }

      // formation
      if (q.type === 'formation') {
        return renderQuestionAnswer(
          qText,
          answer ? normalizeFormation(answer) : null,
          Icon,
          color
        );
      }

      // select
      if (q.type === 'select' || q.type === 'multiselect') {
        if (isEmptyAnswer(answer)) {
          return renderQuestionAnswer(qText, null, Icon, color);
        }
        const values = q.type === 'multiselect' ? (Array.isArray(answer) ? answer : [answer]) : [answer];
        const labels = values.map((value) => {
          const opt = q.options?.find((o) => o.key === value);
          return opt ? resolveOptionLabel(opt, t) : translateEnum(value, t) || value;
        });
        return renderQuestionAnswer(qText, labels.join(', '), Icon, color);
      }

      // graphic
      if (q.type === 'graphic') {
        let g = answer;
        if (!g?.imageBase64 && analysis.customAnswers) {
          const found = Object.entries(analysis.customAnswers).find(
            ([k, v]) => v?.imageBase64 && !coveredKeys.includes(k)
          );
          if (found) {
            g = found[1];
            coveredKeys.push(found[0]);
          }
        }
        if (!g?.imageBase64) return renderQuestionAnswer(qText, null, Icon, color);
        return renderGraphicBlock(qText, Icon, color, g.imageBase64, q.id);
      }

      // video
      if (q.type === 'video') {
        let v = answer;
        if (!v?.videoId && !v?.url && analysis.customAnswers) {
          const found = Object.entries(analysis.customAnswers).find(
            ([k, val]) => (val?.videoId || val?.url) && !coveredKeys.includes(k)
          );
          if (found) {
            v = found[1];
            coveredKeys.push(found[0]);
          }
        }
        if (!v?.videoId && !v?.url) return renderQuestionAnswer(qText, null, Icon, color);
        return renderVideoBlock(qText, Icon, color, v, q.id);
      }

      // text por defecto
      return renderQuestionAnswer(qText, isEmptyAnswer(answer) ? null : answer, Icon, color);
    });

    // Orphaned customAnswers: graphics/videos no cubiertos por la plantilla.
    const orphans = [];
    if (analysis.customAnswers) {
      Object.entries(analysis.customAnswers).forEach(([k, v]) => {
        if (coveredKeys.includes(k)) return;
        if (v?.videoId || v?.url) {
          orphans.push(
            renderVideoBlock(
              t('rivalAnalysis.actions.video', 'Vídeo'),
              MdVideocam,
              '#3578e5',
              v,
              `orphan-${k}`
            )
          );
        } else if (v?.imageBase64) {
          orphans.push(
            renderGraphicBlock(
              t('rivalAnalysis.actions.graphic', 'Gráfico'),
              MdBrush,
              '#3578e5',
              v.imageBase64,
              `orphan-${k}`
            )
          );
        }
      });
    }

    return [...nodes, ...orphans];
  };

  // Render preguntas legacy (análisis sin template).
  const renderLegacyQuestions = () => (
    <>
      {LEGACY_QUESTIONS.map((lq) =>
        renderQuestionAnswer(
          t(lq.key, lq.id),
          analysis[lq.id],
          lq.icon,
          lq.color,
          lq.translate
        )
      )}
    </>
  );

  const formation = normalizeFormation(analysis.alineacion);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('rivalAnalysis.title', 'Análisis del Rival')}
      width={820}
      footer={
        <Row style={{ justifyContent: 'space-between', width: '100%' }}>
          {canMutate !== false && (
            <Button $variant="danger" onClick={handleDelete}>
              <MdDelete size={16} />
              {t('common.delete', 'Eliminar')}
            </Button>
          )}
          <Row $gap={8}>
            <Button $variant="ghost" onClick={onClose}>
              <MdClose size={16} />
              {t('common.close', 'Cerrar')}
            </Button>
            <Button $variant="secondary" onClick={handlePdf}>
              <MdPictureAsPdf size={16} />
              {t('common.pdf', 'PDF')}
            </Button>
            <Button $variant="secondary" onClick={openScouting}>
              <MdPersonSearch size={16} />
              Scouting
            </Button>
            {canMutate !== false && (
              <Button $variant="primary" onClick={() => onEdit?.(analysis)}>
                <MdEdit size={16} />
                {t('common.edit', 'Editar')}
              </Button>
            )}
          </Row>
        </Row>
      }
    >
      <Stack $gap={14}>
        {/* 1. Card grande con título del rival */}
        <HeaderCard>
          {analysis.rivalEscudo ? (
            <img
              src={analysis.rivalEscudo}
              alt={analysis.rival}
              style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: '50%' }}
            />
          ) : (
            <MdAnalytics size={32} color={theme.colors.primary || '#3578e5'} />
          )}
          <RivalTitle>{analysis.rival}</RivalTitle>
        </HeaderCard>

        {/* 2. Stats row */}
        <StatsRow>
          {selectedTeam?.nombre && (
            <StatCard $accent="#2e7d32">
              <MdShield size={20} color="#2e7d32" />
              <div>
                <StatValue>{selectedTeam.nombre}</StatValue>
                <StatLabel>{t('matchSheet.fields.team', 'Equipo')}</StatLabel>
              </div>
            </StatCard>
          )}
          {analysis.rival && (
            <StatCard $accent="#d32f2f">
              <MdFlag size={20} color="#d32f2f" />
              <div>
                <StatValue>{analysis.rival}</StatValue>
                <StatLabel>{t('rivalAnalysis.fields.rival', 'Rival')}</StatLabel>
              </div>
            </StatCard>
          )}
        </StatsRow>

        {/* 3. Formación */}
        {formation && (
          <SectionCard>
            <SectionHead>
              <MdGridOn size={18} color="#FF9800" />
              {t('matchSheet.fields.rivalFormation', 'Formación rival')}
            </SectionHead>
            <Chip>{formation}</Chip>
          </SectionCard>
        )}

        {/* 4. Análisis Táctico */}
        <SectionCard>
          <SectionHead>
            <MdSportsSoccer size={18} color="#3578e5" />
            {t('rivalAnalysis.tacticalAnalysis', 'Análisis táctico')}
          </SectionHead>
          <Stack $gap={8}>
            {templateQuestions.length > 0
              ? renderDynamicQuestions()
              : renderLegacyQuestions()}
          </Stack>
        </SectionCard>

        {/* 5. Players destacados (solo si NO está cubierto por template players-question
            con id 'jugadoresDestacados'). En misterdata se muestra siempre que exista,
            replicamos ese comportamiento solo para legacy: cuando hay template, ya
            se renderiza dentro de las preguntas si la plantilla incluye 'players'. */}
        {templateQuestions.length === 0 &&
          analysis.jugadoresDestacados &&
          analysis.jugadoresDestacados.length > 0 && (
            <SectionCard>
              <SectionHead>
                <MdStar size={18} color="#FFC107" />
                {t('rivalAnalysis.questions.q8', 'Jugadores destacados')} (
                {analysis.jugadoresDestacados.length})
              </SectionHead>
              <div>
                {analysis.jugadoresDestacados.map((p, i) => (
                  <PlayerItem key={i} $accent="#FFC107">
                    <PlayerName>{getPlayerFullName(p) || t('player.player', 'Jugador')}</PlayerName>
                    {p.observacion && <PlayerObs>{p.observacion}</PlayerObs>}
                  </PlayerItem>
                ))}
              </div>
            </SectionCard>
          )}

        {/* 6. Players débiles */}
        {templateQuestions.length === 0 &&
          analysis.jugadoresDebiles &&
          analysis.jugadoresDebiles.length > 0 && (
            <SectionCard>
              <SectionHead>
                <MdTrendingDown size={18} color="#ef4444" />
                {t('rivalAnalysis.questions.q9', 'Jugadores débiles')} (
                {analysis.jugadoresDebiles.length})
              </SectionHead>
              <div>
                {analysis.jugadoresDebiles.map((p, i) => (
                  <PlayerItem key={i} $accent="#ef4444" $danger>
                    <PlayerName $danger>{getPlayerFullName(p) || t('player.player', 'Jugador')}</PlayerName>
                    {p.observacion && <PlayerObs>{p.observacion}</PlayerObs>}
                  </PlayerItem>
                ))}
              </div>
            </SectionCard>
          )}

        {/* 7. Observaciones (legacy, q12) */}
        {templateQuestions.length === 0 && analysis.observaciones && (
          <SectionCard>
            <SectionHead>
              <MdNoteAlt size={18} color="#2196F3" />
              {t('rivalAnalysis.questions.q12', 'Observaciones')}
            </SectionHead>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>
              {analysis.observaciones}
            </div>
          </SectionCard>
        )}

        {/* 8. Si no hay template, también mostramos orphaned customAnswers */}
        {templateQuestions.length === 0 &&
          analysis.customAnswers &&
          Object.entries(analysis.customAnswers).map(([k, v]) => {
            if (v?.videoId || v?.url) {
              return (
                <SectionCard key={k}>
                  {renderVideoBlock(
                    t('rivalAnalysis.actions.video', 'Vídeo'),
                    MdVideocam,
                    '#3578e5',
                    v
                  )}
                </SectionCard>
              );
            }
            if (v?.imageBase64) {
              return (
                <SectionCard key={k}>
                  {renderGraphicBlock(
                    t('rivalAnalysis.actions.graphic', 'Gráfico'),
                    MdBrush,
                    '#3578e5',
                    v.imageBase64
                  )}
                </SectionCard>
              );
            }
            return null;
          })}

        {!templateQuestions.length &&
          LEGACY_QUESTIONS.every((lq) => isEmptyAnswer(analysis[lq.id])) &&
          !analysis.observaciones &&
          !(analysis.jugadoresDestacados?.length) &&
          !(analysis.jugadoresDebiles?.length) && (
            <Muted>
              {t('rivalAnalysis.detail.noQuestions', 'Sin información disponible')}
            </Muted>
          )}
      </Stack>

      {/* Video viewer modal */}
      <Modal
        open={!!videoModalUrl || videoModalLoading}
        onClose={() => { setVideoModalUrl(null); setVideoModalLoading(false); }}
        title={t('rivalAnalysis.actions.playVideo', 'Reproducir vídeo')}
        width={900}
      >
        {videoModalLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: theme.colors.textSecondary }}>
            {t('rivalAnalysis.actions.loadingVideo', 'Cargando vídeo…')}
          </div>
        ) : videoModalUrl ? (
          <VideoPlayer key={videoModalUrl} src={videoModalUrl} controls autoPlay preload="metadata" />
        ) : null}
      </Modal>

      {/* Image zoom modal */}
      <Modal
        open={!!imgZoomUrl}
        onClose={() => setImgZoomUrl(null)}
        title={t('rivalAnalysis.actions.graphic', 'Gráfico')}
        width={900}
      >
        {imgZoomUrl && (
          <img
            src={imgZoomUrl}
            alt="zoom"
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        )}
      </Modal>
    </Modal>
  );
}
