// Modal de detalle (read-only) de un análisis de rival.
// Muestra todas las respuestas según la plantilla y ofrece Edit/Delete/PDF.
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import {
  MdClose,
  MdDelete,
  MdEdit,
  MdPictureAsPdf,
  MdShield,
} from 'react-icons/md';

import { deleteRivalAnalysis } from '@/store/slices/rivalAnalysis/rivalAnalysisThunks';
import Modal from '@/ui/Modal';
import { Button, Row, Stack, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';

import {
  KNOWN_FIELDS,
  getIconComponent,
  getQuestionText,
  resolveOptionLabel,
  normalizeFormation,
  getFormationShort,
  translateEnum,
} from './rivalAnalysisData';
import { generateRivalAnalysisPdf } from './pdf';

// ---------- styles ----------
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const EscudoBox = styled.div`
  width: 64px;
  height: 64px;
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

const QBlock = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const QHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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
`;

const QTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const Value = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-wrap;
`;

const NoValue = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-style: italic;
`;

const Chip = styled.span`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  margin-right: 4px;
`;

const PlayerRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 4px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: 0;
  }
`;

// ---------- helpers ----------
function getAnswerValue(analysis, q) {
  if (KNOWN_FIELDS.includes(q.id)) return analysis[q.id];
  return analysis.customAnswers?.[q.id];
}

// ---------- component ----------
export default function AnalysisDetailModal({
  open,
  onClose,
  analysis,
  template,
  selectedTeam,
  onEdit,
  onDeleted,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

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

  const questions = template?.questions
    ? [...template.questions].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  const renderValue = (q) => {
    const v = getAnswerValue(analysis, q);
    const isEmpty =
      v == null ||
      v === '' ||
      (Array.isArray(v) && v.length === 0) ||
      (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

    if (isEmpty) {
      return <NoValue>{t('rivalAnalysis.pdf.noInfo', 'Sin información')}</NoValue>;
    }

    if (q.type === 'select') {
      const opt = q.options?.find((o) => o.key === v);
      return <Value>{opt ? resolveOptionLabel(opt, t) : translateEnum(v, t)}</Value>;
    }
    if (q.type === 'formation') {
      return <Chip>{getFormationShort(normalizeFormation(v))}</Chip>;
    }
    if (q.type === 'players') {
      return (
        <Stack $gap={2}>
          {v.map((p, i) => (
            <PlayerRow key={i}>
              <strong>{p.nombre || p.name || ''}</strong>
              {p.observacion && (
                <span style={{ color: '#64748b', fontSize: 12 }}>{p.observacion}</span>
              )}
            </PlayerRow>
          ))}
        </Stack>
      );
    }
    if (q.type === 'graphic') {
      if (v.imageBase64) {
        return (
          <img
            src={v.imageBase64}
            alt="snapshot"
            style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 6 }}
          />
        );
      }
      return <NoValue>{t('rivalAnalysis.pdf.noInfo', 'Sin información')}</NoValue>;
    }
    if (q.type === 'video') {
      if (v.url) {
        return (
          <video
            src={v.url}
            controls
            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6 }}
          />
        );
      }
      return <Chip>{t('rivalAnalysis.actions.videoSaved', 'Vídeo guardado')}</Chip>;
    }
    return <Value>{translateEnum(v, t)}</Value>;
  };

  const formation = normalizeFormation(analysis.alineacion);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('rivalAnalysis.detail.title', 'Detalle del análisis')}
      width={760}
      footer={
        <Row $gap={8}>
          <Button $variant="secondary" onClick={onClose}>
            <Row $gap={6}>
              <MdClose size={16} />
              {t('common.close', 'Cerrar')}
            </Row>
          </Button>
          <Button $variant="ghost" onClick={handlePdf}>
            <Row $gap={6}>
              <MdPictureAsPdf size={16} />
              {t('common.pdf', 'PDF')}
            </Row>
          </Button>
          <Button $variant="danger" onClick={handleDelete}>
            <Row $gap={6}>
              <MdDelete size={16} />
              {t('common.delete', 'Eliminar')}
            </Row>
          </Button>
          <Button $variant="primary" onClick={() => onEdit?.(analysis)}>
            <Row $gap={6}>
              <MdEdit size={16} />
              {t('common.edit', 'Editar')}
            </Row>
          </Button>
        </Row>
      }
    >
      <Stack $gap={14}>
        <Header>
          <EscudoBox>
            {analysis.rivalEscudo ? (
              <img src={analysis.rivalEscudo} alt={analysis.rival} />
            ) : (
              <MdShield size={32} color="#94a3b8" />
            )}
          </EscudoBox>
          <Stack $gap={4}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{analysis.rival}</div>
            {formation && <Chip>{formation}</Chip>}
            {selectedTeam?.nombre && <Muted>{selectedTeam.nombre}</Muted>}
          </Stack>
        </Header>

        {questions.length === 0 ? (
          <Muted>{t('rivalAnalysis.detail.noQuestions', 'Sin preguntas en la plantilla')}</Muted>
        ) : (
          questions.map((q) => {
            const Icon = getIconComponent(q.icon);
            return (
              <QBlock key={q.id}>
                <QHead>
                  <QIcon $color={q.iconColor || '#3578e5'}>
                    <Icon size={18} />
                  </QIcon>
                  <QTitle>{getQuestionText(q, t)}</QTitle>
                </QHead>
                {renderValue(q)}
              </QBlock>
            );
          })
        )}
      </Stack>
    </Modal>
  );
}
