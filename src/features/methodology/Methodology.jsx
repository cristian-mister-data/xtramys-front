// Página Metodología — portada de misterdata-source/src/components/pages/methodology/methodology.js
// Mantiene la misma lógica: lista de metodologías del usuario + plantilla recomendada (read-only),
// expansión de categorías, edición de días/planes para metodologías propias.
import { useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  MdLock,
  MdAdd,
  MdDelete,
  MdEdit,
  MdExpandMore,
  MdExpandLess,
  MdUnfoldMore,
  MdUnfoldLess,
  MdFolderOpen,
  MdPictureAsPdf,
} from 'react-icons/md';

import {
  getDefaultMethodologyData,
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  getDaysLabel,
  getCategoryStyles,
} from './methodologyData';
import {
  getMethodologies,
  createMethodology,
  updateMethodology,
  deleteMethodology,
} from '../../api/nutritionMethodology';
import { PageHeader, PageTitle, Button, Input, Stack, Row, Muted } from '../../ui/primitives';
import Modal from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { confirmAction } from '../../ui/confirm';
import { generateMethodologyPdf } from './pdf';

// ---------- helpers ----------
const getEmptyMethodologyStructure = () => ({
  metadata: { version: '4.0', description: 'Metodología personalizada' },
  categories: {},
});

// ---------- styles ----------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SavingBanner = styled.div`
  position: fixed;
  top: 80px;
  right: 24px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 13px;
  z-index: ${({ theme }) => theme.zIndex.toast};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const ReadOnlyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.colors.warningSoft};
  color: ${({ theme }) => theme.colors.warningSoftText};
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
`;

const SelectorRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background: ${({ theme }) => theme.colors.surface};
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  &:hover { opacity: 0.9; }
`;

const ExpandBar = styled.div`
  display: flex;
  gap: 8px;
`;

const CategoryCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const CategoryHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ $styles }) => $styles.headerBg};
  color: ${({ $styles }) => $styles.headerText};
  cursor: pointer;
  text-align: left;
  border: 0;
  /* En dark mode el fondo es un tinte suave sobre surface, así que conviene
     una separación inferior sutil con el body de la card. */
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CategoryName = styled.div`
  font-weight: 700;
  font-size: 15px;
  flex: 1;
`;

const CategoryBody = styled.div`
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PlanSection = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const PlanHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: 600;
  font-size: 13px;
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
  padding: 10px;
`;

const DayCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px;
  background: ${({ theme }) => theme.colors.surface};
  position: relative;
`;

const DayBadge = styled.div`
  background: ${({ $styles }) => $styles.badgeBg};
  color: ${({ $styles }) => $styles.badgeText};
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 6px;
`;

const DayRow = styled.div`
  font-size: 12px;
  margin: 2px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  span { color: ${({ theme }) => theme.colors.text}; font-weight: 600; }
`;

const OptionPill = styled.div`
  font-size: 11px;
  margin-top: 4px;
  padding: 6px 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.radius.sm};
  border-left: 3px solid ${({ $styles }) => $styles.optionBorder};
  color: ${({ theme }) => theme.colors.textSecondary};
  strong { color: ${({ $styles }) => $styles.accentText}; }
`;

const ConstraintText = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const DayActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
  justify-content: flex-end;
`;

const IconBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 4px 6px;
  cursor: pointer;
  color: ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.textSecondary)};
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Empty = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// ---------- subcomponents ----------
function MethodologySelector({ methodologies, selectedId, onSelect, onCreateNew, onDelete, isEditable }) {
  const { t } = useTranslation();
  return (
    <SelectorRow>
      <Chip $active={selectedId === 'recommended'} onClick={() => onSelect('recommended')}>
        ⭐ {t('methodology.recommended', 'Recomendada')}
      </Chip>
      {methodologies.map((m) => (
        <Chip key={m._id} $active={selectedId === m._id} onClick={() => onSelect(m._id)}>
          {m.name}
        </Chip>
      ))}
      <Chip onClick={onCreateNew} title={t('methodology.newMethodology', 'Nueva metodología')}>
        <MdAdd /> {t('methodology.newMethodology', 'Nueva')}
      </Chip>
      {isEditable && (
        <Chip onClick={onDelete} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
          <MdDelete /> {t('common.delete', 'Eliminar')}
        </Chip>
      )}
    </SelectorRow>
  );
}

function DayCardView({ day, styles, isEditable, onEdit, onDelete }) {
  const { t } = useTranslation();
  return (
    <DayCard>
      <DayBadge $styles={styles}>{t('methodology.dayNumber', { number: day.day_number })}</DayBadge>
      {day.orientation && (
        <DayRow>
          <span>{t('methodology.orientation', 'Orientación')}: </span>
          {day.orientation}
        </DayRow>
      )}
      {day.objective && (
        <DayRow>
          <span>{t('methodology.objective', 'Objetivo')}: </span>
          {day.objective}
        </DayRow>
      )}
      {day.dimensions && (
        <DayRow>
          <span>{t('methodology.dimensions', 'Dimensiones')}: </span>
          {day.dimensions}
        </DayRow>
      )}
      {day.game_situation && (
        <DayRow>
          <span>{t('methodology.gameSituation', 'Situación')}: </span>
          {day.game_situation}
        </DayRow>
      )}
      {day.main_part?.options?.length > 0 && (
        <>
          <DayRow style={{ marginTop: 6 }}>
            <span>{t('methodology.mainPart', 'Parte principal')}</span>
          </DayRow>
          {day.main_part.options.map((opt, i) => (
            <OptionPill key={i} $styles={styles}>
              <strong>{opt.tasks?.join(' / ')}</strong>
              {opt.constraint && <ConstraintText>{opt.constraint}</ConstraintText>}
            </OptionPill>
          ))}
        </>
      )}
      {isEditable && (
        <DayActions>
          <IconBtn onClick={onEdit} title={t('common.edit', 'Editar')}>
            <MdEdit />
          </IconBtn>
          <IconBtn onClick={onDelete} title={t('common.delete', 'Eliminar')} $danger>
            <MdDelete />
          </IconBtn>
        </DayActions>
      )}
    </DayCard>
  );
}

function EditDayModal({ open, onClose, day, onSave }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (open && day) {
      setDraft({
        ...day,
        main_part: day.main_part || { instruction: '', options: [] },
      });
    }
  }, [open, day]);

  if (!draft) return null;

  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const updateOption = (i, k, v) =>
    setDraft((d) => {
      const options = [...(d.main_part.options || [])];
      options[i] = { ...options[i], [k]: v };
      return { ...d, main_part: { ...d.main_part, options } };
    });
  const addOption = () =>
    setDraft((d) => ({
      ...d,
      main_part: {
        ...d.main_part,
        options: [...(d.main_part.options || []), { tasks: [], constraint: '' }],
      },
    }));
  const removeOption = (i) =>
    setDraft((d) => {
      const options = [...(d.main_part.options || [])];
      options.splice(i, 1);
      return { ...d, main_part: { ...d.main_part, options } };
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('methodology.editDay', 'Editar día')}
      width={620}
      footer={
        <>
          <Button $variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
          <Button onClick={() => onSave(draft)}>{t('common.save', 'Guardar')}</Button>
        </>
      }
    >
      <Stack $gap={10}>
        <Input
          placeholder={t('methodology.orientation', 'Orientación')}
          value={draft.orientation || ''}
          onChange={(e) => update('orientation', e.target.value)}
        />
        <Input
          placeholder={t('methodology.objective', 'Objetivo')}
          value={draft.objective || ''}
          onChange={(e) => update('objective', e.target.value)}
        />
        <Input
          placeholder={t('methodology.dimensions', 'Dimensiones')}
          value={draft.dimensions || ''}
          onChange={(e) => update('dimensions', e.target.value)}
        />
        <Input
          placeholder={t('methodology.gameSituation', 'Situación de juego')}
          value={draft.game_situation || ''}
          onChange={(e) => update('game_situation', e.target.value)}
        />
        <Input
          placeholder={t('methodology.instruction', 'Instrucción parte principal')}
          value={draft.main_part?.instruction || ''}
          onChange={(e) =>
            setDraft((d) => ({ ...d, main_part: { ...d.main_part, instruction: e.target.value } }))
          }
        />
        <div>
          <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <strong>{t('methodology.options', 'Opciones')}</strong>
            <Button $variant="ghost" onClick={addOption}><MdAdd /> {t('common.add', 'Añadir')}</Button>
          </Row>
          {(draft.main_part?.options || []).map((opt, i) => (
            <Stack key={i} $gap={6} style={{ marginBottom: 8 }}>
              <Input
                placeholder={t('methodology.tasks', 'Tareas (separadas por coma)')}
                value={(opt.tasks || []).join(', ')}
                onChange={(e) => updateOption(i, 'tasks', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
              />
              <Row $gap={6}>
                <Input
                  placeholder={t('methodology.constraint', 'Restricción')}
                  value={opt.constraint || ''}
                  onChange={(e) => updateOption(i, 'constraint', e.target.value)}
                />
                <IconBtn $danger onClick={() => removeOption(i)}><MdDelete /></IconBtn>
              </Row>
            </Stack>
          ))}
        </div>
      </Stack>
    </Modal>
  );
}

function AddPlanModal({ open, onClose, onSave }) {
  const { t } = useTranslation();
  const [days, setDays] = useState(2);
  useEffect(() => { if (open) setDays(2); }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('methodology.addPlan', 'Añadir plan')}
      width={400}
      footer={
        <>
          <Button $variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
          <Button onClick={() => onSave(`${days}_days_week`)}>{t('common.add', 'Añadir')}</Button>
        </>
      }
    >
      <Stack>
        <Muted>{t('methodology.daysPerWeekLabel', 'Días por semana')}</Muted>
        <Input
          type="number"
          min={1}
          max={7}
          value={days}
          onChange={(e) => setDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
        />
      </Stack>
    </Modal>
  );
}

function CreateMethodologyModal({ open, onClose, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [fromRecommended, setFromRecommended] = useState(false);
  useEffect(() => { if (open) { setName(''); setFromRecommended(false); } }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('methodology.newMethodology', 'Nueva metodología')}
      width={480}
      footer={
        <>
          <Button $variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
          <Button disabled={!name.trim()} onClick={() => onSave(name.trim(), fromRecommended)}>
            {t('common.create', 'Crear')}
          </Button>
        </>
      }
    >
      <Stack>
        <Input
          autoFocus
          placeholder={t('methodology.namePlaceholder', 'Nombre de la metodología')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={fromRecommended}
            onChange={(e) => setFromRecommended(e.target.checked)}
          />
          {t('methodology.basedOnRecommended', 'Basada en la recomendada')}
        </label>
      </Stack>
    </Modal>
  );
}

// ---------- main ----------
export default function Methodology() {
  const { t } = useTranslation();
  const theme = useTheme();
  const themeMode = theme?.mode || 'light';
  const user = useSelector((s) => s.usuario.user);
  const userId = user?._id;

  const [methodologies, setMethodologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState('recommended');
  const [expanded, setExpanded] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editDay, setEditDay] = useState(null); // { categoryKey, planKey, dayIndex, day }
  const [planTarget, setPlanTarget] = useState(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await getMethodologies(userId);
        if (alive) setMethodologies(data || []);
      } catch (e) {
        console.error('load methodologies', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const isEditable = selectedId !== 'recommended';
  const currentData = useMemo(() => {
    if (selectedId === 'recommended') return getDefaultMethodologyData(t);
    const custom = methodologies.find((m) => m._id === selectedId);
    return custom ? { categories: custom.categories || {}, metadata: custom.metadata } : getDefaultMethodologyData(t);
  }, [selectedId, methodologies, t]);

  const persist = async (updatedCategories) => {
    if (!isEditable) return;
    const m = methodologies.find((x) => x._id === selectedId);
    if (!m) return;
    setSaving(true);
    try {
      const { data } = await updateMethodology(selectedId, { ...m, categories: updatedCategories });
      setMethodologies((prev) => prev.map((x) => (x._id === selectedId ? data : x)));
    } catch (e) {
      console.error(e);
      toast.error(t('methodology.saveChangesError', 'Error guardando cambios'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (name, fromRecommended) => {
    try {
      const structure = fromRecommended
        ? JSON.parse(JSON.stringify(getDefaultMethodologyData(t)))
        : getEmptyMethodologyStructure();
      const { data } = await createMethodology({
        user: userId,
        name,
        isCustom: true,
        metadata: structure.metadata,
        categories: structure.categories,
      });
      setMethodologies((p) => [...p, data]);
      setSelectedId(data._id);
      setCreateOpen(false);
      toast.success(t('methodology.createSuccess', 'Metodología creada'));
    } catch (e) {
      console.error(e);
      toast.error(t('methodology.createError', 'No se pudo crear'));
    }
  };

  const handleDeleteMethodology = async () => {
    if (!isEditable) return;
    const ok = await confirmAction(t('methodology.confirmDeleteMethodology', '¿Eliminar metodología?'));
    if (!ok) return;
    try {
      await deleteMethodology(selectedId);
      setMethodologies((p) => p.filter((x) => x._id !== selectedId));
      setSelectedId('recommended');
      toast.success(t('methodology.deleteSuccess', 'Eliminada'));
    } catch (e) {
      console.error(e);
      toast.error(t('methodology.deleteError', 'No se pudo eliminar'));
    }
  };

  const handleSaveDay = async (updatedDay) => {
    if (!editDay) return;
    const m = methodologies.find((x) => x._id === selectedId);
    if (!m) return;
    const cats = JSON.parse(JSON.stringify(m.categories || {}));
    if (!cats[editDay.categoryKey]) cats[editDay.categoryKey] = { id: editDay.categoryKey, name: editDay.categoryKey, plans: {} };
    if (!cats[editDay.categoryKey].plans[editDay.planKey]) cats[editDay.categoryKey].plans[editDay.planKey] = [];
    cats[editDay.categoryKey].plans[editDay.planKey][editDay.dayIndex] = updatedDay;
    await persist(cats);
    setEditDay(null);
  };

  const handleDeleteDay = async (categoryKey, planKey, dayIndex) => {
    const ok = await confirmAction(t('methodology.confirmDeleteDay', '¿Eliminar día?'));
    if (!ok) return;
    const m = methodologies.find((x) => x._id === selectedId);
    if (!m) return;
    const cats = JSON.parse(JSON.stringify(m.categories));
    cats[categoryKey].plans[planKey].splice(dayIndex, 1);
    cats[categoryKey].plans[planKey].forEach((d, i) => { d.day_number = i + 1; });
    await persist(cats);
  };

  const handleAddDay = async (categoryKey, planKey) => {
    const m = methodologies.find((x) => x._id === selectedId);
    if (!m) return;
    const cats = JSON.parse(JSON.stringify(m.categories));
    const days = cats[categoryKey]?.plans[planKey] || [];
    days.push({ day_number: days.length + 1, orientation: '', objective: '', dimensions: '', game_situation: '', main_part: { instruction: '', options: [] } });
    cats[categoryKey].plans[planKey] = days;
    await persist(cats);
  };

  const handleAddPlan = async (planKey) => {
    if (!planTarget) return;
    const m = methodologies.find((x) => x._id === selectedId);
    if (!m) return;
    const cats = JSON.parse(JSON.stringify(m.categories || {}));
    if (!cats[planTarget]) cats[planTarget] = { id: planTarget, name: planTarget, plans: {} };
    if (!cats[planTarget].plans) cats[planTarget].plans = {};
    if (cats[planTarget].plans[planKey]) {
      toast.error(t('methodology.planAlreadyExists', 'El plan ya existe'));
      return;
    }
    cats[planTarget].plans[planKey] = [];
    await persist(cats);
    setPlanTarget(null);
  };

  const handleDeletePlan = async (categoryKey, planKey) => {
    const ok = await confirmAction(t('methodology.confirmDeletePlan', '¿Eliminar plan?'));
    if (!ok) return;
    const m = methodologies.find((x) => x._id === selectedId);
    if (!m) return;
    const cats = JSON.parse(JSON.stringify(m.categories));
    delete cats[categoryKey].plans[planKey];
    await persist(cats);
  };

  const expandAll = () => {
    const all = {};
    Object.keys(currentData.categories).forEach((k) => { all[k] = true; });
    setExpanded(all);
  };
  const collapseAll = () => setExpanded({});

  if (loading) {
    return <Container><Muted>{t('common.loading', 'Cargando...')}</Muted></Container>;
  }

  return (
    <Container>
      {saving && <SavingBanner>{t('methodology.saving', 'Guardando...')}</SavingBanner>}
      <PageHeader>
        <Row $gap={10}>
          <PageTitle>{t('methodology.title', 'Metodología')}</PageTitle>
          {!isEditable && (
            <ReadOnlyBadge><MdLock size={12} /> {t('methodology.readOnly', 'Solo lectura')}</ReadOnlyBadge>
          )}
        </Row>
      </PageHeader>

      <MethodologySelector
        methodologies={methodologies}
        selectedId={selectedId}
        onSelect={(id) => { setSelectedId(id); setExpanded({}); }}
        onCreateNew={() => setCreateOpen(true)}
        onDelete={handleDeleteMethodology}
        isEditable={isEditable}
      />

      <ExpandBar>
        <Button $variant="secondary" onClick={expandAll}><MdUnfoldMore /> {t('methodology.expandAll', 'Expandir todo')}</Button>
        <Button $variant="secondary" onClick={collapseAll}><MdUnfoldLess /> {t('methodology.collapseAll', 'Plegar todo')}</Button>
      </ExpandBar>

      {CATEGORY_ORDER.map((categoryKey) => {
        const cat = currentData.categories[categoryKey];
        if (!cat && !isEditable) return null;
        const data = cat || { id: categoryKey, name: categoryKey, plans: {} };
        const color = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.fundamentos;
        const styles = getCategoryStyles(color, themeMode);
        const isOpen = !!expanded[categoryKey];
        return (
          <CategoryCard key={categoryKey}>
            <CategoryHeader $styles={styles} onClick={() => setExpanded((e) => ({ ...e, [categoryKey]: !e[categoryKey] }))}>
              <CategoryName>{data.name}</CategoryName>
              {isOpen ? <MdExpandLess size={22} /> : <MdExpandMore size={22} />}
            </CategoryHeader>
            {isOpen && (
              <CategoryBody>
                {Object.entries(data.plans || {}).map(([planKey, days]) => (
                  <PlanSection key={planKey}>
                    <PlanHeader>
                      <span>{getDaysLabel(planKey, t)}</span>
                      <Row $gap={6}>
                        <IconBtn
                          onClick={() => generateMethodologyPdf(data.name, planKey, days, color.primary, t)}
                          title={t('common.exportPdf', 'Exportar PDF')}
                        ><MdPictureAsPdf /></IconBtn>
                        {isEditable && (
                          <>
                            <IconBtn onClick={() => handleAddDay(categoryKey, planKey)}><MdAdd /></IconBtn>
                            <IconBtn $danger onClick={() => handleDeletePlan(categoryKey, planKey)}><MdDelete /></IconBtn>
                          </>
                        )}
                      </Row>
                    </PlanHeader>
                    <DaysGrid>
                      {(days || []).map((day, i) => (
                        <DayCardView
                          key={i}
                          day={day}
                          styles={styles}
                          isEditable={isEditable}
                          onEdit={() => setEditDay({ categoryKey, planKey, dayIndex: i, day })}
                          onDelete={() => handleDeleteDay(categoryKey, planKey, i)}
                        />
                      ))}
                    </DaysGrid>
                  </PlanSection>
                ))}
                {isEditable && (
                  <Button $variant="ghost" onClick={() => setPlanTarget(categoryKey)}>
                    <MdAdd /> {t('methodology.addPlan', 'Añadir plan')}
                  </Button>
                )}
              </CategoryBody>
            )}
          </CategoryCard>
        );
      })}

      {Object.keys(currentData.categories).length === 0 && !isEditable && (
        <Empty>
          <MdFolderOpen size={56} />
          <div>{t('methodology.noMethodologyData', 'Sin datos de metodología')}</div>
        </Empty>
      )}

      <CreateMethodologyModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      <EditDayModal
        open={!!editDay}
        onClose={() => setEditDay(null)}
        day={editDay?.day}
        onSave={handleSaveDay}
      />
      <AddPlanModal open={!!planTarget} onClose={() => setPlanTarget(null)} onSave={handleAddPlan} />
    </Container>
  );
}
