// Página Metodología de Porteros — portada de
// xtramys-source/src/components/pages/goalkeeperMethodology/goalkeeperMethodology.js
// Mismo patrón que Methodology (selector + editable) pero estructura plana de planes (3/4/5 días).
import { useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { MdLock, MdAdd, MdDelete, MdEdit, MdPictureAsPdf, MdSportsHandball } from 'react-icons/md';
import { generateGoalkeeperMethodologyPdf } from './pdf';
import useSupervision from '../../hooks/useSupervision';

import {
  getDefaultGoalkeeperMethodologyData,
  getPlanLabel,
  getIntensityColor,
  GK_GRADIENT,
  GK_PRIMARY_COLOR,
} from './goalkeeperMethodologyData';
import {
  getGkMethodologies,
  createGkMethodology,
  updateGkMethodology,
  deleteGkMethodology,
} from '../../api/nutritionMethodology';
import { Button, Input, Stack, Row, Muted, TextArea } from '../../ui/primitives';
import SectionHeader from '../../ui/SectionHeader';
import Modal from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { confirmAction } from '../../ui/confirm';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ReadOnlyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #fff8e1;
  color: #ff9800;
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
  border: 1px solid ${({ theme, $active }) => ($active ? GK_PRIMARY_COLOR : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? GK_PRIMARY_COLOR : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  font-size: 13px;
  cursor: pointer;
`;

const PlanCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
`;

const PlanHeader = styled.div`
  width: 100%;
  text-align: left;
  background: linear-gradient(90deg, ${GK_GRADIENT[0]} 0%, ${GK_GRADIENT[1]} 100%);
  color: #fff;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
`;

const PlanBody = styled.div`
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
`;

const Day = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px;
`;

const DayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const DayLabel = styled.div`
  background: ${GK_PRIMARY_COLOR};
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
`;

const IntensityPill = styled.span`
  background: ${({ $color }) => $color};
  color: #fff;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
`;

const Field = styled.div`
  font-size: 12px;
  margin: 2px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  span { color: ${({ theme }) => theme.colors.text}; font-weight: 600; }
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

function AddPlanModal({ open, onClose, onSave }) {
  const { t } = useTranslation();
  const [daysStr, setDaysStr] = useState('5');
  useEffect(() => { if (open) setDaysStr('5'); }, [open]);
  const handleSave = () => {
    const n = parseInt(daysStr, 10);
    if (isNaN(n) || n < 1) {
      toast?.error?.(t('common.daysRequired', 'Mínimo 1 día')) || alert(t('common.daysRequired', 'Mínimo 1 día'));
      return;
    }
    if (n > 7) {
      toast?.error?.(t('common.maxDays', 'Máximo 7 días')) || alert(t('common.maxDays', 'Máximo 7 días'));
      return;
    }
    onSave(Math.min(n, 7));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('goalkeeperMethodology.addTrainingPlan', 'Añadir plan de entrenamiento')}
      width={400}
      footer={
        <>
          <Button $variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
          <Button onClick={handleSave}>{t('common.add', 'Añadir')}</Button>
        </>
      }
    >
      <Stack>
        <Muted>{t('goalkeeperMethodology.daysPerWeekLabel', 'Días por semana')}</Muted>
        <Input
          type="number"
          min={1}
          max={7}
          value={daysStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d+$/.test(v)) {
              const num = parseInt(v, 10);
              if (!isNaN(num) && num > 7) return;
              setDaysStr(v);
            }
          }}
        />
      </Stack>
    </Modal>
  );
}

function EditDayModal({ open, onClose, day, onSave }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(day);
  useEffect(() => { if (open) setDraft(day); }, [open, day]);
  if (!draft) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('goalkeeperMethodology.editDay', 'Editar día')}
      width={520}
      footer={
        <>
          <Button $variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
          <Button onClick={() => onSave(draft)}>{t('common.save', 'Guardar')}</Button>
        </>
      }
    >
      <Stack $gap={10}>
        <Input
          placeholder={t('goalkeeperMethodology.dayLabel', 'Etiqueta (+1, -2, ...)')}
          value={draft.day_label || ''}
          onChange={(e) => setDraft({ ...draft, day_label: e.target.value })}
        />
        <Input
          placeholder={t('goalkeeperMethodology.mainObjective', 'Objetivo principal')}
          value={draft.main_objective || ''}
          onChange={(e) => setDraft({ ...draft, main_objective: e.target.value })}
        />
        <TextArea
          placeholder={t('goalkeeperMethodology.practicalContent', 'Contenido práctico')}
          value={draft.practical_content || ''}
          onChange={(e) => setDraft({ ...draft, practical_content: e.target.value })}
        />
        <Input
          placeholder={t('goalkeeperMethodology.intensity', 'Intensidad')}
          value={draft.intensity || ''}
          onChange={(e) => setDraft({ ...draft, intensity: e.target.value })}
        />
      </Stack>
    </Modal>
  );
}

const OptionCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
  border: 2px solid ${p => p.$active ? p.theme?.colors?.primary || '#2563eb' : p.theme?.colors?.border || '#e2e8f0'};
  background: ${p => p.$active ? (p.theme?.colors?.primary || '#2563eb') + '0d' : p.theme?.colors?.surface || '#fff'};
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: ${p => p.theme?.colors?.primary || '#2563eb'}; }
`;

const OptionDot = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${p => p.$active ? p.theme?.colors?.primary || '#2563eb' : p.theme?.colors?.textMuted || '#94a3b8'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  &::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$active ? p.theme?.colors?.primary || '#2563eb' : 'transparent'};
  }
`;

const OptionText = styled.div`
  flex: 1;
`;

const OptionTitle = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${p => p.theme?.colors?.text || '#1e293b'};
  margin-bottom: 4px;
`;

const OptionDesc = styled.div`
  font-size: 13px;
  color: ${p => p.theme?.colors?.textMuted || '#64748b'};
  line-height: 1.4;
`;

function CreateModal({ open, onClose, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [mode, setMode] = useState('scratch');
  useEffect(() => { if (open) { setName(''); setMode('scratch'); } }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('goalkeeperMethodology.newMethodology', 'Nueva metodología')}
      width={460}
      footer={
        <>
          <Button $variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
          <Button disabled={!name.trim()} onClick={() => onSave(name.trim(), mode === 'recommended')}>
            {t('common.create', 'Crear')}
          </Button>
        </>
      }
    >
      <Stack>
        <Input
          autoFocus
          placeholder={t('goalkeeperMethodology.namePlaceholder', 'Nombre')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Muted style={{ marginTop: 4 }}>{t('goalkeeperMethodology.howToCreate', '¿Cómo quieres crear la nueva metodología?')}</Muted>
        <OptionCard $active={mode === 'scratch'} onClick={() => setMode('scratch')}>
          <OptionDot $active={mode === 'scratch'} />
          <OptionText>
            <OptionTitle>{t('goalkeeperMethodology.fromScratch', 'Desde cero')}</OptionTitle>
            <OptionDesc>{t('goalkeeperMethodology.emptyInfoText', 'Se creará una metodología vacía con los planes base para que la rellenes.')}</OptionDesc>
          </OptionText>
        </OptionCard>
        <OptionCard $active={mode === 'recommended'} onClick={() => setMode('recommended')}>
          <OptionDot $active={mode === 'recommended'} />
          <OptionText>
            <OptionTitle>{t('goalkeeperMethodology.basedOnRecommended', 'Basada en la recomendada')}</OptionTitle>
            <OptionDesc>{t('goalkeeperMethodology.copyInfoText', 'Se copiará toda la estructura de la metodología recomendada para que puedas editarla.')}</OptionDesc>
          </OptionText>
        </OptionCard>
      </Stack>
    </Modal>
  );
}

export default function GoalkeeperMethodology() {
  const { t } = useTranslation();
  const theme = useTheme();
  const userId = useSelector((s) => s.usuario.user?._id);
  const { canMutate } = useSupervision();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('recommended');
  const [expanded, setExpanded] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [planCreating, setPlanCreating] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await getGkMethodologies(userId);
        if (alive) setList(data || []);
      } catch (e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId]);

  const isEditable = selectedId !== 'recommended' && canMutate;
  const current = useMemo(() => {
    if (!isEditable) return getDefaultGoalkeeperMethodologyData(t);
    const m = list.find((x) => x._id === selectedId);
    return m ? { plans: m.plans || {}, metadata: m.metadata } : getDefaultGoalkeeperMethodologyData(t);
  }, [selectedId, list, isEditable, t]);

  const persist = async (newPlans) => {
    if (!isEditable) return;
    const m = list.find((x) => x._id === selectedId);
    if (!m) return;
    try {
      const { data } = await updateGkMethodology(selectedId, { ...m, plans: newPlans });
      setList((p) => p.map((x) => (x._id === selectedId ? data : x)));
    } catch (e) {
      console.error(e);
      toast.error(t('common.errorSaving', 'Error guardando'));
    }
  };

  const handleCreate = async (name, fromRec) => {
    try {
      const base = fromRec
        ? JSON.parse(JSON.stringify(getDefaultGoalkeeperMethodologyData(t)))
        : { metadata: { version: '1.0' }, plans: {} };
      const { data } = await createGkMethodology({
        user: userId,
        name,
        isCustom: true,
        metadata: base.metadata,
        plans: base.plans,
      });
      setList((p) => [...p, data]);
      setSelectedId(data._id);
      setCreateOpen(false);
      toast.success(t('common.created', 'Creado'));
    } catch (e) {
      console.error(e);
      toast.error(t('common.errorCreating', 'No se pudo crear'));
    }
  };

  const handleDelete = async () => {
    if (!isEditable) return;
    const ok = await confirmAction(t('goalkeeperMethodology.confirmDeleteMethodology', '¿Eliminar metodología?'));
    if (!ok) return;
    try {
      await deleteGkMethodology(selectedId);
      setList((p) => p.filter((x) => x._id !== selectedId));
      setSelectedId('recommended');
    } catch (e) { console.error(e); }
  };

  const handleSaveDay = async (planKey, dayIndex, day) => {
    const m = list.find((x) => x._id === selectedId);
    if (!m) return;
    const plans = JSON.parse(JSON.stringify(m.plans || {}));
    if (!plans[planKey]) plans[planKey] = [];
    plans[planKey][dayIndex] = day;
    await persist(plans);
    setEditTarget(null);
  };

  const handleAddPlan = async (days) => {
    if (!isEditable) return;
    const planKey = `${days}_days`;
    const m = list.find((x) => x._id === selectedId);
    if (!m) return;
    const plans = JSON.parse(JSON.stringify(m.plans || {}));
    if (plans[planKey]) {
      toast.error(t('methodology.planAlreadyExists', 'El plan ya existe'));
      return;
    }
    plans[planKey] = Array.from({ length: days }, (_, i) => ({
      day_label: '',
      day_number: i + 1,
      main_objective: '',
      practical_content: '',
      intensity: '',
    }));
    await persist(plans);
    setPlanCreating(false);
  };

  const handleAddDay = async (planKey) => {
    const m = list.find((x) => x._id === selectedId);
    if (!m) return;
    const plans = JSON.parse(JSON.stringify(m.plans || {}));
    if (!plans[planKey]) plans[planKey] = [];
    plans[planKey].push({
      day_label: '',
      day_number: plans[planKey].length + 1,
      main_objective: '',
      practical_content: '',
      intensity: '',
    });
    await persist(plans);
  };

  const handleDeleteDay = async (planKey, dayIndex) => {
    const ok = await confirmAction(t('common.confirmDelete', '¿Eliminar?'));
    if (!ok) return;
    const m = list.find((x) => x._id === selectedId);
    if (!m) return;
    const plans = JSON.parse(JSON.stringify(m.plans || {}));
    plans[planKey].splice(dayIndex, 1);
    plans[planKey].forEach((d, i) => { d.day_number = i + 1; });
    await persist(plans);
  };

  if (loading) return <Container><Muted>{t('common.loading', 'Cargando...')}</Muted></Container>;

  return (
    <Container>
      <SectionHeader
        title={t('goalkeeperMethodology.title', 'Metodología de Porteros')}
        subtitle={t('sectionHeaders.goalkeeperMethodology', 'Planifica microciclos y tareas específicas para porteros.')}
        icon={MdSportsHandball}
        meta={!isEditable ? <ReadOnlyBadge><MdLock size={12} /> {t('methodology.readOnly', 'Solo lectura')}</ReadOnlyBadge> : null}
      />

      <SelectorRow>
        <Chip $active={selectedId === 'recommended'} onClick={() => setSelectedId('recommended')}>
          ⭐ {t('methodology.recommended', 'Recomendada')}
        </Chip>
        {list.map((m) => (
          <Chip key={m._id} $active={selectedId === m._id} onClick={() => setSelectedId(m._id)}>{m.name}</Chip>
        ))}
        {canMutate && <Chip onClick={() => setCreateOpen(true)}><MdAdd /> {t('common.new', 'Nueva')}</Chip>}
        {isEditable && <Chip onClick={handleDelete} style={{ color: '#ef4444', borderColor: '#ef4444' }}><MdDelete /> {t('common.delete', 'Eliminar')}</Chip>}
      </SelectorRow>

      {Object.entries(current.plans || {}).length === 0 && isEditable && (
        <div style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 12, border: '2px dashed ' + (theme?.colors?.border || '#e2e8f0'), background: theme?.colors?.backgroundAlt || '#f8fafc' }}>
          <MdAdd size={32} style={{ color: theme?.colors?.textMuted || '#94a3b8', marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: theme?.colors?.text || '#1e293b' }}>
            {t('goalkeeperMethodology.noPlans', 'Aún no hay planes de entrenamiento')}
          </p>
          <p style={{ margin: '6px 0 16px', fontSize: 13, color: theme?.colors?.textMuted || '#64748b' }}>
            {t('goalkeeperMethodology.addPlanHint', 'Crea un plan con los días de entrenamiento por semana')}
          </p>
          <Button onClick={() => setPlanCreating(true)}>
            <MdAdd /> {t('goalkeeperMethodology.addTrainingPlan', 'Añadir plan de entrenamiento')}
          </Button>
        </div>
      )}

      {Object.entries(current.plans || {}).map(([planKey, days]) => {
        const isOpen = expanded[planKey] !== false;
        return (
          <PlanCard key={planKey}>
            <PlanHeader onClick={() => setExpanded((e) => ({ ...e, [planKey]: !isOpen }))}>
              <span>{getPlanLabel(planKey, t)}</span>
              <Row $gap={6}>
                <IconBtn
                  onClick={(e) => { e.stopPropagation(); generateGoalkeeperMethodologyPdf(planKey, days, t); }}
                  title={t('common.exportPdf', 'Exportar PDF')}
                ><MdPictureAsPdf /></IconBtn>
                {isEditable && (
                  <IconBtn onClick={(e) => { e.stopPropagation(); handleAddDay(planKey); }}><MdAdd /></IconBtn>
                )}
              </Row>
            </PlanHeader>
            {isOpen && (
              <PlanBody>
                {days.map((d, i) => (
                  <Day key={i}>
                    <DayHeader>
                      <DayLabel>{d.day_label || `D${d.day_number}`}</DayLabel>
                      {d.intensity && <IntensityPill $color={getIntensityColor(d.intensity, t)}>{d.intensity}</IntensityPill>}
                    </DayHeader>
                    {d.main_objective && (
                      <Field><span>{t('goalkeeperMethodology.mainObjective', 'Objetivo')}: </span>{d.main_objective}</Field>
                    )}
                    {d.practical_content && (
                      <Field style={{ whiteSpace: 'pre-wrap' }}><span>{t('goalkeeperMethodology.practicalContent', 'Contenido')}: </span>{d.practical_content}</Field>
                    )}
                    {isEditable && (
                      <Row $gap={6} style={{ marginTop: 8, justifyContent: 'flex-end' }}>
                        <IconBtn onClick={() => setEditTarget({ planKey, dayIndex: i, day: d })}><MdEdit /></IconBtn>
                        <IconBtn $danger onClick={() => handleDeleteDay(planKey, i)}><MdDelete /></IconBtn>
                      </Row>
                    )}
                  </Day>
                ))}
              </PlanBody>
            )}
          </PlanCard>
        );
      })}

      {isEditable && Object.entries(current.plans || {}).length > 0 && (
        <Button $variant="secondary" onClick={() => setPlanCreating(true)} style={{ alignSelf: 'flex-start' }}>
          <MdAdd /> {t('goalkeeperMethodology.addTrainingPlan', 'Añadir plan de entrenamiento')}
        </Button>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      <AddPlanModal open={planCreating} onClose={() => setPlanCreating(false)} onSave={handleAddPlan} />
      <EditDayModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        day={editTarget?.day}
        onSave={(day) => handleSaveDay(editTarget.planKey, editTarget.dayIndex, day)}
      />
    </Container>
  );
}
