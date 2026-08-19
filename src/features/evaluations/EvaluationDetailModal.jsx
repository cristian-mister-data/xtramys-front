import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import {
  MdCalendarToday,
  MdStar,
  MdEdit,
  MdDelete,
  MdPictureAsPdf,
  MdShare,
} from 'react-icons/md';

import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import { Button, Stack, Row, Muted } from '@/ui/primitives';
import { deleteEvaluation } from '@/store/slices/evaluations/evaluationsSlice';
import { confirmAction } from '@/ui/confirm';
import { toast } from '@/ui/toast';
import { generateEvaluationPdf } from './pdf';
import CanMutate from '@/components/shared/CanMutate';

import {
  getIconComponent,
  getScoreColor,
  resolveOptionLabel,
} from './evaluationsData';

const HeaderBanner = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const PlayerBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  background-image: ${({ src }) => (src ? `url(${src})` : 'none')};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const ScoreBadge = styled.div`
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  padding: 6px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const AnswerCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const QuestionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconCircle = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ValueBox = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 10px 14px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const Chip = styled.span`
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
  margin-right: 6px;
  margin-bottom: 4px;
`;

export default function EvaluationDetailModal({
  open,
  onClose,
  evaluation,
  onEdit,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const templates = useSelector((s) => s.evaluations.templates || []);
  const players = useSelector((s) => s.player.players || []);

  if (!open || !evaluation) return null;

  const tpl = templates.find((t) => t._id === evaluation.templateId);
  const questions = tpl?.questions || [];
  const scoreColors = getScoreColor(evaluation.overallScore);

  const handleDelete = async () => {
    const ok = await confirmAction(
      t('evaluations.detail.deleteConfirm', '¿Eliminar esta evaluación?')
    );
    if (!ok) return;
    dispatch(deleteEvaluation(evaluation._id));
    toast.success(t('evaluations.detail.deleteSuccess', 'Evaluación eliminada'));
    onClose?.();
  };

  const handlePdf = async () => {
    try {
      await generateEvaluationPdf(evaluation, tpl, t);
    } catch (err) {
      console.error('Error generating evaluation PDF:', err);
      toast.error('Error al generar el PDF de la evaluación');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('evaluations.detail.title', 'Detalle de la Evaluación')}
      width={FORM_MODAL_WIDTH}
      footer={
        <Row $gap={8} style={{ justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
          <Row $gap={6}>
            <CanMutate>
              <Button $variant="danger" onClick={handleDelete}>
                <MdDelete size={16} />
                {t('common.delete', 'Eliminar')}
              </Button>
            </CanMutate>
            {onEdit && (
              <CanMutate>
                <Button
                  $variant="secondary"
                  onClick={() => {
                    onClose?.();
                    onEdit(evaluation);
                  }}
                >
                  <MdEdit size={16} />
                  {t('common.edit', 'Editar')}
                </Button>
              </CanMutate>
            )}
          </Row>
          <Row $gap={8}>
            <Button $variant="primary" onClick={handlePdf}>
              <MdPictureAsPdf size={16} />
              Descargar PDF / Compartir
            </Button>
            <Button $variant="secondary" onClick={onClose}>
              {t('common.close', 'Cerrar')}
            </Button>
          </Row>
        </Row>
      }
    >
      <Stack $gap={16}>
        {/* Banner header */}
        <HeaderBanner>
          <PlayerBadge>
            <Avatar src={evaluation.playerPhoto}>
              {!evaluation.playerPhoto && (evaluation.playerName?.[0] || 'E')}
            </Avatar>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {evaluation.playerName || 'General / Equipo'}
                {evaluation.playerDorsal ? ` (#${evaluation.playerDorsal})` : ''}
              </div>
              <Muted style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MdCalendarToday size={14} />
                  {evaluation.date}
                </span>
                <span>• {evaluation.templateName}</span>
              </Muted>
            </div>
          </PlayerBadge>

          {evaluation.overallScore !== null && evaluation.overallScore !== undefined && (
            <ScoreBadge $bg={scoreColors.bg} $color={scoreColors.color}>
              Nota: {evaluation.overallScore} / 10
            </ScoreBadge>
          )}
        </HeaderBanner>

        {/* Answers List */}
        <Stack $gap={10}>
          {questions.map((q, idx) => {
            const Icon = getIconComponent(q.icon);
            const val = evaluation.answers?.[q.id];

            return (
              <AnswerCard key={q.id || idx}>
                <QuestionRow>
                  <IconCircle $color={q.iconColor || '#3b82f6'}>
                    <Icon size={16} />
                  </IconCircle>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {idx + 1}. {q.questionText}
                  </div>
                </QuestionRow>

                <ValueBox>
                  {val === undefined || val === null || val === '' ? (
                    <Muted style={{ fontStyle: 'italic' }}>Sin responder</Muted>
                  ) : q.type === 'rating10' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: getScoreColor(val).color }}>
                        {val} / 10
                      </span>
                    </div>
                  ) : q.type === 'stars5' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <MdStar
                          key={s}
                          size={18}
                          style={{ opacity: s <= Number(val) ? 1 : 0.3 }}
                        />
                      ))}
                      <span style={{ color: 'inherit', marginLeft: 6, fontWeight: 600 }}>
                        ({val} / 5)
                      </span>
                    </div>
                  ) : q.type === 'boolean' ? (
                    <span style={{ fontWeight: 600, color: val ? '#10b981' : '#ef4444' }}>
                      {val ? 'Sí / Afirmativo' : 'No / Negativo'}
                    </span>
                  ) : q.type === 'select' ? (
                    <span>
                      {resolveOptionLabel(
                        (q.options || []).find(
                          (o) => (typeof o === 'object' ? o.key : o) === val
                        ) || val
                      )}
                    </span>
                  ) : q.type === 'multiSelect' ? (
                    <div>
                      {Array.isArray(val) && val.length > 0 ? (
                        val.map((k) => {
                          const matchedOpt = (q.options || []).find(
                            (o) => (typeof o === 'object' ? o.key : o) === k
                          );
                          return <Chip key={k}>{resolveOptionLabel(matchedOpt || k)}</Chip>;
                        })
                      ) : (
                        <Muted>Ninguna opción seleccionada</Muted>
                      )}
                    </div>
                  ) : q.type === 'player' ? (
                    (() => {
                      const matchedP = players.find((p) => p._id === val);
                      return matchedP
                        ? `${matchedP.nombre} ${matchedP.apellidos || matchedP.apellido || ''}`
                        : val;
                    })()
                  ) : (
                    <span>{val}</span>
                  )}
                </ValueBox>
              </AnswerCard>
            );
          })}
        </Stack>

        {evaluation.generalNotes && (
          <AnswerCard>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              Observaciones Generales Adicionales
            </div>
            <ValueBox style={{ whiteSpace: 'pre-wrap' }}>
              {evaluation.generalNotes}
            </ValueBox>
          </AnswerCard>
        )}
      </Stack>
    </Modal>
  );
}
