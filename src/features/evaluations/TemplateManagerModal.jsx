import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdAdd,
  MdArrowBack,
  MdDelete,
  MdEdit,
  MdStar,
  MdCheckCircle,
  MdClose,
} from 'react-icons/md';

import {
  createTemplate,
  createTemplateFromRecommended,
  setDefaultTemplate,
  updateTemplate,
  deleteTemplate,
  addQuestionToTemplate,
  updateQuestionInTemplate,
  removeQuestionFromTemplate,
} from '@/store/slices/evaluations/evaluationsSlice';
import Modal, { FORM_MODAL_WIDTH } from '@/ui/Modal';
import {
  Button,
  Input,
  TextArea,
  Select,
  Field,
  Label,
  Stack,
  Row,
  Muted,
  ErrorText,
} from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';
import useSupervision from '@/hooks/useSupervision';
import CanMutate from '@/components/shared/CanMutate';

import {
  QUESTION_TYPES,
  AVAILABLE_ICONS,
  getIconComponent,
  resolveOptionLabel,
} from './evaluationsData';

// ---------- styles ----------
const TemplateCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  @media (max-width: 600px) {
    padding: 12px;
  }
`;

const TemplateHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;

  @media (max-width: 600px) {
    align-items: flex-start;
    flex-direction: column;

    > * {
      width: 100%;
      min-width: 0;
    }
  }
`;

const TemplateName = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
  overflow-wrap: anywhere;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $tone }) =>
    $tone === 'default' ? '#dcfce7' : $tone === 'rec' ? '#fef3c7' : '#e0e7ff'};
  color: ${({ $tone }) =>
    $tone === 'default' ? '#166534' : $tone === 'rec' ? '#92400e' : '#3730a3'};
`;

const DashedBtn = styled.button`
  width: 100%;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  text-align: center;
  transition: background 150ms ease;
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }
`;

const QuestionCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;

  @media (max-width: 600px) {
    padding: 12px;
    gap: 10px;
  }
`;

const IconBox = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-right: 6px;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`;

const Chip = styled.span`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
`;

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const TypeCard = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 2px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $selected }) =>
    $selected ? (theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : theme.colors.surface};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.text)};
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  min-width: 0;
  text-align: left;
  transition: all 150ms ease;
`;

const IconPickerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const IconPickerBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
`;

const PickerCheck = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const OptionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 13px;
  gap: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export default function TemplateManagerModal({ open, onClose }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const templates = useSelector((s) => s.evaluations.templates || []);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // create-template form
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateScope, setNewTemplateScope] = useState('POR_JUGADOR');
  const [baseTemplateId, setBaseTemplateId] = useState('');
  const [createFromRecommended, setCreateFromRecommended] = useState(true);

  // edit-template-name form
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editTemplateNameVal, setEditTemplateNameVal] = useState('');

  // question form
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('rating10');
  const [qIcon, setQIcon] = useState('analytics');
  const [qIconColor, setQIconColor] = useState('#3b82f6');
  const [qOptions, setQOptions] = useState([]);
  const [qOptionInput, setQOptionInput] = useState('');
  const [qError, setQError] = useState('');

  useEffect(() => {
    if (selectedTemplate?._id) {
      const fresh = templates.find((tt) => tt._id === selectedTemplate._id);
      if (fresh && fresh !== selectedTemplate) setSelectedTemplate(fresh);
    }
  }, [templates, selectedTemplate]);

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQText('');
    setQType('rating10');
    setQIcon('analytics');
    setQIconColor('#3b82f6');
    setQOptions([]);
    setQOptionInput('');
    setQError('');
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setShowCreateModal(false);
    setShowQuestionModal(false);
    resetQuestionForm();
    onClose?.();
  };

  const { canMutate, isDemo } = useSupervision();

  // ---------- templates ----------
  const handleCreateTemplate = () => {
    if (!canMutate && isDemo) {
      toast.error(t('subscription.availableWithSubscription', 'Disponible solo con suscripción'));
      return;
    }
    if (!newTemplateName.trim()) {
      toast.error(t('evaluations.template.nameRequired', 'Introduce un nombre para la plantilla'));
      return;
    }
    if (createFromRecommended) {
      const targetBase = baseTemplateId || templates.find((t) => t.isRecommended)?._id || templates[0]?._id;
      dispatch(
        createTemplateFromRecommended({
          name: newTemplateName.trim(),
          baseTemplateId: targetBase,
          scope: newTemplateScope,
        })
      );
    } else {
      dispatch(
        createTemplate({
          name: newTemplateName.trim(),
          scope: newTemplateScope,
          questions: [],
        })
      );
    }
    toast.success(t('evaluations.template.createSuccess', 'Plantilla creada con éxito'));
    setShowCreateModal(false);
    setNewTemplateName('');
    setCreateFromRecommended(true);
  };

  const handleOpenEditName = (template) => {
    setEditTemplateNameVal(template.name);
    setShowEditNameModal(true);
  };

  const handleSaveTemplateName = () => {
    if (!editTemplateNameVal.trim()) {
      toast.error(t('evaluations.template.nameRequired', 'Introduce un nombre'));
      return;
    }
    dispatch(
      updateTemplate({
        id: selectedTemplate._id,
        data: { name: editTemplateNameVal.trim() },
      })
    );
    toast.success(t('evaluations.template.updateSuccess', 'Plantilla actualizada'));
    setShowEditNameModal(false);
  };

  const handleSetDefault = (template) => {
    dispatch(setDefaultTemplate(template._id));
    toast.success(t('evaluations.template.setDefaultSuccess', 'Plantilla activa actualizada'));
  };

  const handleDeleteTemplate = async (template) => {
    const ok = await confirmAction(
      t('evaluations.template.deleteConfirm', '¿Eliminar la plantilla "{{name}}"?', {
        name: template.name,
      })
    );
    if (!ok) return;
    dispatch(deleteTemplate(template._id));
    toast.success(t('evaluations.template.deleteSuccess', 'Plantilla eliminada'));
    if (selectedTemplate?._id === template._id) setSelectedTemplate(null);
  };

  // ---------- questions ----------
  const openCreateQuestion = () => {
    resetQuestionForm();
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question) => {
    setEditingQuestion(question);
    setQText(question.questionText || '');
    setQType(question.type || 'rating10');
    setQIcon(question.icon || 'analytics');
    setQIconColor(question.iconColor || '#3b82f6');
    setQOptions(Array.isArray(question.options) ? [...question.options] : []);
    setQOptionInput('');
    setQError('');
    setShowQuestionModal(true);
  };

  const handleAddOption = () => {
    const v = qOptionInput.trim();
    if (!v) return;
    const key = v.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    setQOptions((prev) => [...prev, { key, label: v }]);
    setQOptionInput('');
  };

  const handleRemoveOption = (i) => {
    setQOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSaveQuestion = () => {
    if (!qText.trim()) {
      setQError(t('evaluations.template.questionTextRequired', 'El texto de la pregunta es obligatorio'));
      return;
    }
    if ((qType === 'select' || qType === 'multiSelect') && qOptions.length === 0) {
      setQError(t('evaluations.template.optionsRequired', 'Añade al menos una opción para esta pregunta'));
      return;
    }
    if (!selectedTemplate?._id) return;

    setQError('');
    const question = {
      questionText: qText.trim(),
      type: qType,
      icon: qIcon,
      iconColor: qIconColor,
      options: qType === 'select' || qType === 'multiSelect' ? qOptions : [],
    };

    if (editingQuestion) {
      dispatch(
        updateQuestionInTemplate({
          templateId: selectedTemplate._id,
          questionId: editingQuestion.id,
          question,
        })
      );
      toast.success(t('evaluations.template.questionUpdated', 'Pregunta actualizada'));
    } else {
      dispatch(
        addQuestionToTemplate({ templateId: selectedTemplate._id, question })
      );
      toast.success(t('evaluations.template.questionAdded', 'Pregunta añadida'));
    }
    setShowQuestionModal(false);
    resetQuestionForm();
  };

  const handleRemoveQuestion = async (question) => {
    const ok = await confirmAction(
      t('evaluations.template.removeQuestionConfirm', '¿Eliminar esta pregunta?')
    );
    if (!ok) return;
    dispatch(
      removeQuestionFromTemplate({
        templateId: selectedTemplate._id,
        questionId: question.id,
      })
    );
    toast.success(t('evaluations.template.questionRemoved', 'Pregunta eliminada'));
  };

  // ---------- render ----------
  const renderList = () => (
    <Stack $gap={12}>
      {templates.map((tpl) => (
        <TemplateCard key={tpl._id}>
          <TemplateHead>
            <TemplateName>
              {tpl.name}
              {tpl.isDefault && (
                <Badge $tone="default">
                  <MdCheckCircle size={12} />
                  {t('evaluations.template.default', 'Activa / Predeterminada')}
                </Badge>
              )}
              {tpl.isRecommended && (
                <Badge $tone="rec">
                  <MdStar size={12} />
                  {t('evaluations.template.recommended', 'Recomendada')}
                </Badge>
              )}
              <Badge $tone="info">
                {tpl.scope === 'GENERAL' ? 'General / Equipo' : 'Por Jugador'}
              </Badge>
            </TemplateName>
            <Row $gap={6}>
              {!tpl.isDefault && (
                <Button $variant="ghost" onClick={() => handleSetDefault(tpl)}>
                  {t('evaluations.template.setDefault', 'Activar')}
                </Button>
              )}
              <Button $variant="secondary" onClick={() => setSelectedTemplate(tpl)}>
                {t('common.open', 'Editar Preguntas')}
              </Button>
              {!tpl.isRecommended && (
                <Button $variant="danger" onClick={() => handleDeleteTemplate(tpl)}>
                  <MdDelete size={16} />
                </Button>
              )}
            </Row>
          </TemplateHead>
          <Muted style={{ fontSize: 13 }}>
            {(tpl.questions?.length || 0)} {t('evaluations.template.questionsCount', 'preguntas configuradas')}
          </Muted>
        </TemplateCard>
      ))}
      <CanMutate>
        <DashedBtn type="button" onClick={() => setShowCreateModal(true)}>
          <MdAdd size={18} />
          {t('evaluations.template.create', 'Crear Nueva Plantilla Personalizada')}
        </DashedBtn>
      </CanMutate>
    </Stack>
  );

  const renderDetail = () => {
    const tpl = selectedTemplate;
    const questions = [...(tpl.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const readonly = !!tpl.isRecommended;

    return (
      <Stack $gap={12}>
        <Row $gap={8}>
          <Button $variant="ghost" onClick={() => setSelectedTemplate(null)}>
            <MdArrowBack size={18} />
            {t('common.back', 'Volver al listado')}
          </Button>
          <TemplateName>
            {tpl.name}
            {!tpl.isRecommended && (
              <Button $variant="ghost" onClick={() => handleOpenEditName(tpl)} style={{ padding: 4 }}>
                <MdEdit size={16} />
              </Button>
            )}
            {tpl.isRecommended && (
              <Badge $tone="rec">
                <MdStar size={12} />
                {t('evaluations.template.recommended', 'Recomendada')}
              </Badge>
            )}
          </TemplateName>
        </Row>

        {questions.length === 0 && (
          <Muted style={{ textAlign: 'center', padding: '24px 0' }}>
            {t('evaluations.template.noQuestions', 'Esta plantilla no tiene preguntas aún. Añade la primera.')}
          </Muted>
        )}

        <Stack $gap={8}>
          {questions.map((q, idx) => {
            const Icon = getIconComponent(q.icon);
            const qTypeLabel = QUESTION_TYPES.find((t) => t.key === q.type)?.label || q.type;
            return (
              <QuestionCard key={q.id || idx}>
                <IconBox $color={q.iconColor || '#3b82f6'}>
                  <Icon size={20} />
                </IconBox>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {idx + 1}. {q.questionText}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <TypeBadge>{qTypeLabel}</TypeBadge>
                  </div>
                  {(q.type === 'select' || q.type === 'multiSelect') && q.options?.length > 0 && (
                    <ChipRow>
                      {q.options.map((opt, i) => (
                        <Chip key={i}>{resolveOptionLabel(opt)}</Chip>
                      ))}
                    </ChipRow>
                  )}
                </div>
                {!readonly && (
                  <Row $gap={4}>
                    <Button $variant="ghost" onClick={() => openEditQuestion(q)}>
                      <MdEdit size={16} />
                    </Button>
                    <Button $variant="ghost" onClick={() => handleRemoveQuestion(q)}>
                      <MdDelete size={16} />
                    </Button>
                  </Row>
                )}
              </QuestionCard>
            );
          })}
        </Stack>

        {!readonly && (
          <DashedBtn type="button" onClick={openCreateQuestion}>
            <MdAdd size={18} />
            {t('evaluations.template.addQuestion', 'Añadir Pregunta')}
          </DashedBtn>
        )}
        {readonly && (
          <Muted style={{ fontStyle: 'italic', fontSize: 13 }}>
            {t(
              'evaluations.template.readonlyNotice',
              'Esta plantilla de sistema es de solo lectura. Puedes crear una copia propia para modificar sus preguntas.'
            )}
          </Muted>
        )}
      </Stack>
    );
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={t('evaluations.template.title', 'Gestionar Plantillas de Evaluación')}
        width={FORM_MODAL_WIDTH}
      >
        {selectedTemplate ? renderDetail() : renderList()}
      </Modal>

      {/* Create template Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('evaluations.template.createTitle', 'Nueva Plantilla de Evaluación')}
        width={FORM_MODAL_WIDTH}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleCreateTemplate}>
              {t('common.create', 'Crear Plantilla')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={14}>
          <Field>
            <Label>{t('evaluations.template.name', 'Nombre de la Plantilla')}</Label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder={t('evaluations.template.namePlaceholder', 'Ej: Evaluación de Rendimiento Semanal')}
              autoFocus
            />
          </Field>
          <Field>
            <Label>{t('evaluations.template.scope', 'Ámbito de Aplicación')}</Label>
            <Row $gap={12}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="radio"
                  name="tplScope"
                  checked={newTemplateScope === 'POR_JUGADOR'}
                  onChange={() => setNewTemplateScope('POR_JUGADOR')}
                />
                Por Jugador (Individual)
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="radio"
                  name="tplScope"
                  checked={newTemplateScope === 'GENERAL'}
                  onChange={() => setNewTemplateScope('GENERAL')}
                />
                General (Equipo / Sesión)
              </label>
            </Row>
          </Field>
          <Field>
            <Label>{t('evaluations.template.basedOn', 'Punto de partida')}</Label>
            <Stack $gap={8}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="radio"
                  checked={createFromRecommended}
                  onChange={() => setCreateFromRecommended(true)}
                />
                Copiar desde una plantilla existente
              </label>
              {createFromRecommended && (
                <div style={{ marginLeft: 24 }}>
                  <Select
                    value={baseTemplateId}
                    onChange={(e) => setBaseTemplateId(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.questions?.length || 0} preguntas)
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="radio"
                  checked={!createFromRecommended}
                  onChange={() => setCreateFromRecommended(false)}
                />
                Empezar desde cero (sin preguntas)
              </label>
            </Stack>
          </Field>
        </Stack>
      </Modal>

      {/* Edit template name Modal */}
      <Modal
        open={showEditNameModal}
        onClose={() => setShowEditNameModal(false)}
        title={t('evaluations.template.editNameTitle', 'Editar nombre de plantilla')}
        width={FORM_MODAL_WIDTH}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={() => setShowEditNameModal(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleSaveTemplateName}>
              {t('common.save', 'Guardar')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={12}>
          <Field>
            <Label>{t('evaluations.template.name', 'Nombre')}</Label>
            <Input
              value={editTemplateNameVal}
              onChange={(e) => setEditTemplateNameVal(e.target.value)}
              autoFocus
            />
          </Field>
        </Stack>
      </Modal>

      {/* Question editor Modal */}
      <Modal
        open={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          resetQuestionForm();
        }}
        title={
          editingQuestion
            ? t('evaluations.template.editQuestion', 'Editar Pregunta')
            : t('evaluations.template.addQuestion', 'Añadir Nueva Pregunta')
        }
        width={FORM_MODAL_WIDTH}
        footer={
          <Row $gap={8}>
            <Button
              $variant="secondary"
              onClick={() => {
                setShowQuestionModal(false);
                resetQuestionForm();
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleSaveQuestion}>
              {t('common.save', 'Guardar Pregunta')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={14}>
          <Field>
            <Label>{t('evaluations.template.questionText', 'Pregunta / Enunciado')}</Label>
            <TextArea
              rows={2}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Ej: ¿Cómo evaluas su nivel de concentración en el partido?"
              autoFocus
            />
            {qError && <ErrorText>{qError}</ErrorText>}
          </Field>

          <Field>
            <Label>{t('evaluations.template.questionType', 'Tipo de Respuesta')}</Label>
            <TypeGrid>
              {QUESTION_TYPES.map((qt) => {
                const Icon = qt.icon;
                const selected = qType === qt.key;
                return (
                  <TypeCard
                    key={qt.key}
                    type="button"
                    $selected={selected}
                    onClick={() => setQType(qt.key)}
                  >
                    <Icon size={20} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{qt.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>{qt.description}</div>
                    </div>
                  </TypeCard>
                );
              })}
            </TypeGrid>
          </Field>

          {(qType === 'select' || qType === 'multiSelect') && (
            <Field>
              <Label>Opciones de respuesta</Label>
              <Stack $gap={6}>
                {qOptions.map((opt, i) => (
                  <OptionRow key={i}>
                    <span>{resolveOptionLabel(opt)}</span>
                    <Button $variant="ghost" onClick={() => handleRemoveOption(i)} style={{ padding: 2 }}>
                      <MdClose size={16} />
                    </Button>
                  </OptionRow>
                ))}
                <Row $gap={8} style={{ marginTop: 4 }}>
                  <Input
                    value={qOptionInput}
                    onChange={(e) => setQOptionInput(e.target.value)}
                    placeholder="Escribe una opción y pulsa Añadir"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button $variant="secondary" type="button" onClick={handleAddOption}>
                    Añadir
                  </Button>
                </Row>
              </Stack>
            </Field>
          )}

          <Field>
            <Label>Icono Personalizado</Label>
            <IconPickerRow>
              {AVAILABLE_ICONS.map((ic) => {
                const IconComp = ic.component;
                const isSelected = qIcon === ic.name;
                return (
                  <IconPickerBtn
                    key={ic.name}
                    type="button"
                    $color={ic.color}
                    $selected={isSelected}
                    onClick={() => {
                      setQIcon(ic.name);
                      setQIconColor(ic.color);
                    }}
                  >
                    <IconComp size={18} />
                    {isSelected && (
                      <PickerCheck>
                        <MdCheckCircle size={12} />
                      </PickerCheck>
                    )}
                  </IconPickerBtn>
                );
              })}
            </IconPickerRow>
          </Field>
        </Stack>
      </Modal>
    </>
  );
}
