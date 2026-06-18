// Modal para gestionar plantillas de Rival Analysis (CRUD plantillas + preguntas).
// Adapta misterdata-source/src/components/pages/rivalAnalysis/RivalAnalysisTemplateManager.js
// a React DOM usando los thunks ya migrados.
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
  fetchUserTemplates,
  fetchRecommendedQuestions,
  createTemplate,
  createTemplateFromRecommended,
  setTemplateAsDefault,
  deleteTemplate,
  addQuestionToTemplate,
  updateQuestionInTemplate,
  removeQuestionFromTemplate,
} from '@/store/slices/rivalAnalysis/rivalAnalysisThunks';
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
import { confirmAction } from '@/ui/confirm';

import {
  QUESTION_TYPES,
  AVAILABLE_ICONS,
  getIconComponent,
  getQuestionText,
  resolveOptionLabel,
} from './rivalAnalysisData';

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
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
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
    $selected ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $selected }) => ($selected ? '#fff' : theme.colors.text)};
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  min-width: 0;
  text-align: left;
`;

const IconPickerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const IconPickerBtn = styled.button`
  width: 42px;
  height: 42px;
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

  @media (max-width: 600px) {
    align-items: flex-start;
  }
`;

// ---------- component ----------
export default function TemplateManagerModal({ open, onClose, userId }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const userTemplates = useSelector((s) => s.rivalAnalysis.userTemplates || []);
  const templateLoading = useSelector((s) => s.rivalAnalysis.templateLoading);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // create-template form
  const [newTemplateName, setNewTemplateName] = useState('');
  const [createFromRecommended, setCreateFromRecommended] = useState(true);
  const [creating, setCreating] = useState(false);

  // question form
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('text');
  const [qIcon, setQIcon] = useState('help-circle');
  const [qIconColor, setQIconColor] = useState('#3578e5');
  const [qOptions, setQOptions] = useState([]);
  const [qOptionInput, setQOptionInput] = useState('');
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError] = useState('');

  useEffect(() => {
    if (open && userId) {
      dispatch(fetchUserTemplates(userId));
      dispatch(fetchRecommendedQuestions());
    }
  }, [open, userId, dispatch]);

  // Refresca selectedTemplate cuando cambia userTemplates (tras add/edit/remove question)
  useEffect(() => {
    if (selectedTemplate?._id) {
      const fresh = userTemplates.find((tt) => tt._id === selectedTemplate._id);
      if (fresh && fresh !== selectedTemplate) setSelectedTemplate(fresh);
    }
  }, [userTemplates, selectedTemplate]);

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQText('');
    setQType('text');
    setQIcon('help-circle');
    setQIconColor('#3578e5');
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

  // ---------- templates ----------
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error(t('rivalAnalysis.template.nameRequired', 'Introduce un nombre'));
      return;
    }
    setCreating(true);
    try {
      const payload = { name: newTemplateName.trim(), userId };
      if (createFromRecommended) {
        await dispatch(createTemplateFromRecommended(payload)).unwrap();
      } else {
        await dispatch(createTemplate(payload)).unwrap();
      }
      toast.success(t('rivalAnalysis.template.createSuccess', 'Plantilla creada'));
      setShowCreateModal(false);
      setNewTemplateName('');
      setCreateFromRecommended(true);
    } catch (err) {
      toast.error(err?.message || t('common.error', 'Error'));
    } finally {
      setCreating(false);
    }
  };

  const handleSetDefault = async (template) => {
    try {
      await dispatch(setTemplateAsDefault(template._id)).unwrap();
      toast.success(t('rivalAnalysis.template.setDefaultSuccess', 'Plantilla activa actualizada'));
    } catch (err) {
      toast.error(err?.message || t('common.error', 'Error'));
    }
  };

  const handleDeleteTemplate = async (template) => {
    const ok = await confirmAction(
      t('rivalAnalysis.template.deleteConfirm', '¿Eliminar la plantilla "{{name}}"?', {
        name: template.name,
      })
    );
    if (!ok) return;
    try {
      await dispatch(deleteTemplate(template._id)).unwrap();
      toast.success(t('rivalAnalysis.template.deleteSuccess', 'Plantilla eliminada'));
      if (selectedTemplate?._id === template._id) setSelectedTemplate(null);
    } catch (err) {
      toast.error(err?.message || t('common.error', 'Error'));
    }
  };

  // ---------- questions ----------
  const openCreateQuestion = () => {
    resetQuestionForm();
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question) => {
    setEditingQuestion(question);
    setQText(getQuestionText(question, t));
    setQType(question.type || 'text');
    setQIcon(question.icon || 'help-circle');
    setQIconColor(question.iconColor || '#3578e5');
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

  const handleSaveQuestion = async () => {
    if (!qText.trim()) {
      setQError(t('rivalAnalysis.template.questionTextRequired', 'El texto es obligatorio'));
      return;
    }
    if (qType === 'select' && qOptions.length === 0) {
      setQError(t('rivalAnalysis.template.optionsRequired', 'Añade al menos una opción'));
      return;
    }
    if (!selectedTemplate?._id) return;

    setQSaving(true);
    setQError('');
    const question = {
      questionText: qText.trim(),
      type: qType,
      icon: qIcon,
      iconColor: qIconColor,
      options: qType === 'select' ? qOptions : [],
      category: qType === 'players' ? 'players' : 'tactical',
    };
    try {
      if (editingQuestion) {
        const updated = await dispatch(
          updateQuestionInTemplate({
            templateId: selectedTemplate._id,
            questionId: editingQuestion.id,
            question,
          })
        ).unwrap();
        setSelectedTemplate(updated);
        toast.success(t('rivalAnalysis.template.questionUpdated', 'Pregunta actualizada'));
      } else {
        const updated = await dispatch(
          addQuestionToTemplate({ templateId: selectedTemplate._id, question })
        ).unwrap();
        setSelectedTemplate(updated);
        toast.success(t('rivalAnalysis.template.questionAdded', 'Pregunta añadida'));
      }
      setShowQuestionModal(false);
      resetQuestionForm();
    } catch (err) {
      toast.error(err?.message || t('common.error', 'Error'));
    } finally {
      setQSaving(false);
    }
  };

  const handleRemoveQuestion = async (question) => {
    const ok = await confirmAction(
      t('rivalAnalysis.template.removeQuestionConfirm', '¿Eliminar esta pregunta?')
    );
    if (!ok) return;
    try {
      const updated = await dispatch(
        removeQuestionFromTemplate({
          templateId: selectedTemplate._id,
          questionId: question.id,
        })
      ).unwrap();
      setSelectedTemplate(updated);
      toast.success(t('rivalAnalysis.template.questionRemoved', 'Pregunta eliminada'));
    } catch (err) {
      toast.error(err?.message || t('common.error', 'Error'));
    }
  };

  // ---------- render ----------
  const renderList = () => (
    <Stack $gap={10}>
      {userTemplates.length === 0 && (
        <Muted>{t('rivalAnalysis.template.empty', 'Aún no tienes plantillas')}</Muted>
      )}
      {userTemplates.map((tpl) => (
        <TemplateCard key={tpl._id}>
          <TemplateHead>
            <TemplateName>
              {tpl.name}
              {tpl.isDefault && (
                <Badge $tone="default">
                  <MdCheckCircle size={12} />
                  {t('rivalAnalysis.template.default', 'Activa')}
                </Badge>
              )}
              {tpl.isRecommended && (
                <Badge $tone="rec">
                  <MdStar size={12} />
                  {t('rivalAnalysis.template.recommended', 'Recomendada')}
                </Badge>
              )}
            </TemplateName>
            <Row $gap={6}>
              {!tpl.isDefault && (
                <Button $variant="ghost" onClick={() => handleSetDefault(tpl)}>
                  {t('rivalAnalysis.template.setDefault', 'Activar')}
                </Button>
              )}
              <Button $variant="secondary" onClick={() => setSelectedTemplate(tpl)}>
                {t('common.open', 'Abrir')}
              </Button>
              {!tpl.isRecommended && (
                <Button $variant="danger" onClick={() => handleDeleteTemplate(tpl)}>
                  <MdDelete size={16} />
                </Button>
              )}
            </Row>
          </TemplateHead>
          <Muted>
            {(tpl.questions?.length || 0)}{' '}
            {t('rivalAnalysis.template.questionsCount', 'preguntas')}
          </Muted>
        </TemplateCard>
      ))}
      <DashedBtn type="button" onClick={() => setShowCreateModal(true)}>
        <MdAdd size={18} />
        {t('rivalAnalysis.template.create', 'Crear plantilla')}
      </DashedBtn>
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
          </Button>
          <TemplateName>
            {tpl.name}
            {tpl.isRecommended && (
              <Badge $tone="rec">
                <MdStar size={12} />
                {t('rivalAnalysis.template.recommended', 'Recomendada')}
              </Badge>
            )}
          </TemplateName>
        </Row>

        {questions.length === 0 && (
          <Muted>{t('rivalAnalysis.template.noQuestions', 'Sin preguntas')}</Muted>
        )}

        <Stack $gap={8}>
          {questions.map((q, idx) => {
            const Icon = getIconComponent(q.icon);
            return (
              <QuestionCard key={q.id || idx}>
                <IconBox $color={q.iconColor || '#3578e5'}>
                  <Icon size={20} />
                </IconBox>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {idx + 1}. {getQuestionText(q, t)}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <TypeBadge>{q.type}</TypeBadge>
                  </div>
                  {q.type === 'select' && q.options?.length > 0 && (
                    <ChipRow>
                      {q.options.map((opt, i) => (
                        <Chip key={i}>{resolveOptionLabel(opt, t)}</Chip>
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
            {t('rivalAnalysis.template.addQuestion', 'Añadir pregunta')}
          </DashedBtn>
        )}
        {readonly && (
          <Muted>
            {t(
              'rivalAnalysis.template.readonlyNotice',
              'Esta plantilla es de solo lectura. Crea una propia para personalizarla.'
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
        title={t('rivalAnalysis.template.title', 'Gestionar plantillas')}
        width={FORM_MODAL_WIDTH}
      >
        {templateLoading ? (
          <Muted>{t('common.loading', 'Cargando…')}</Muted>
        ) : selectedTemplate ? (
          renderDetail()
        ) : (
          renderList()
        )}
      </Modal>

      {/* Create template */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('rivalAnalysis.template.createTitle', 'Nueva plantilla')}
        width={FORM_MODAL_WIDTH}
        footer={
          <Row $gap={8}>
            <Button $variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleCreateTemplate} disabled={creating}>
              {creating ? t('common.saving', 'Guardando…') : t('common.create', 'Crear')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={12}>
          <Field>
            <Label>{t('rivalAnalysis.template.name', 'Nombre')}</Label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder={t('rivalAnalysis.template.namePlaceholder', 'Mi plantilla')}
              autoFocus
            />
          </Field>
          <Field>
            <Label>{t('rivalAnalysis.template.basedOn', 'Punto de partida')}</Label>
            <Stack $gap={6}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={createFromRecommended}
                  onChange={() => setCreateFromRecommended(true)}
                />
                {t('rivalAnalysis.template.fromRecommended', 'Copiar plantilla recomendada')}
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!createFromRecommended}
                  onChange={() => setCreateFromRecommended(false)}
                />
                {t('rivalAnalysis.template.fromScratch', 'Empezar desde cero')}
              </label>
            </Stack>
          </Field>
        </Stack>
      </Modal>

      {/* Question editor */}
      <Modal
        open={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          resetQuestionForm();
        }}
        title={
          editingQuestion
            ? t('rivalAnalysis.template.editQuestion', 'Editar pregunta')
            : t('rivalAnalysis.template.addQuestion', 'Añadir pregunta')
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
              disabled={qSaving}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button $variant="primary" onClick={handleSaveQuestion} disabled={qSaving}>
              {qSaving ? t('common.saving', 'Guardando…') : t('common.save', 'Guardar')}
            </Button>
          </Row>
        }
      >
        <Stack $gap={14}>
          <Field>
            <Label>{t('rivalAnalysis.template.questionText', 'Texto de la pregunta')}</Label>
            <TextArea
              rows={3}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder={t(
                'rivalAnalysis.template.questionTextPlaceholder',
                '¿Cómo defienden a balón parado?'
              )}
            />
            {qError && <ErrorText>{qError}</ErrorText>}
          </Field>

          <Field>
            <Label>{t('rivalAnalysis.template.questionType', 'Tipo de respuesta')}</Label>
            <TypeGrid>
              {QUESTION_TYPES.map((qt) => {
                const Icon = qt.icon;
                return (
                  <TypeCard
                    key={qt.key}
                    type="button"
                    $selected={qType === qt.key}
                    onClick={() => setQType(qt.key)}
                  >
                    <Icon size={18} />
                    {t(qt.labelKey, qt.fallback)}
                  </TypeCard>
                );
              })}
            </TypeGrid>
          </Field>

          {qType === 'select' && (
            <Field>
              <Label>{t('rivalAnalysis.template.options', 'Opciones')}</Label>
              <Row $gap={6}>
                <Input
                  value={qOptionInput}
                  onChange={(e) => setQOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder={t(
                    'rivalAnalysis.template.optionPlaceholder',
                    'Ej: Izquierda, Centro, Derecha…'
                  )}
                />
                <Button $variant="primary" type="button" onClick={handleAddOption}>
                  <MdAdd size={16} />
                </Button>
              </Row>
              <Stack $gap={4} style={{ marginTop: 8 }}>
                {qOptions.map((opt, i) => (
                  <OptionRow key={i}>
                    <span>{opt.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
                    >
                      <MdClose size={14} />
                    </button>
                  </OptionRow>
                ))}
              </Stack>
            </Field>
          )}

          <Field>
            <Label>{t('rivalAnalysis.template.icon', 'Icono')}</Label>
            <IconPickerRow>
              {AVAILABLE_ICONS.map((it) => {
                const Icon = it.component;
                const selected = qIcon === it.name;
                return (
                  <IconPickerBtn
                    key={it.name}
                    type="button"
                    $color={it.color}
                    $selected={selected}
                    onClick={() => {
                      setQIcon(it.name);
                      setQIconColor(it.color);
                    }}
                  >
                    <Icon size={20} />
                    {selected && <PickerCheck>✓</PickerCheck>}
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
