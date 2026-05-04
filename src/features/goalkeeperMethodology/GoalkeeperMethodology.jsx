// Página Metodología de Porteros — portada de
// xtramys-source/src/components/pages/goalkeeperMethodology/goalkeeperMethodology.js
// Mismo patrón que Methodology (selector + editable) pero estructura plana de planes (3/4/5 días).
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { MdLock, MdAdd, MdDelete, MdEdit, MdPictureAsPdf } from 'react-icons/md';
import { generateGoalkeeperMethodologyPdf } from './pdf';

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
import { PageHeader, PageTitle, Button, Input, Stack, Row, Muted, TextArea } from '../../ui/primitives';
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

const PlanHeader = styled.button`
  width: 100%;
  text-align: left;
  border: 0;
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

function CreateModal({ open, onClose, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [fromRec, setFromRec] = useState(false);
  useEffect(() => { if (open) { setName(''); setFromRec(false); } }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('goalkeeperMethodology.newMethodology', 'Nueva metodología')}
      width={460}
      footer={
        <>
          <Button $variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</Button>
          <Button disabled={!name.trim()} onClick={() => onSave(name.trim(), fromRec)}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={fromRec} onChange={(e) => setFromRec(e.target.checked)} />
          {t('goalkeeperMethodology.basedOnRecommended', 'Basada en la recomendada')}
        </label>
      </Stack>
    </Modal>
  );
}

export default function GoalkeeperMethodology() {
  const { t } = useTranslation();
  const userId = useSelector((s) => s.usuario.user?._id);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('recommended');
  const [expanded, setExpanded] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

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

  const isEditable = selectedId !== 'recommended';
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
    const ok = await confirmAction(t('goalkeeperMethodology.confirmDelete', '¿Eliminar metodología?'));
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
      <PageHeader>
        <Row $gap={10}>
          <PageTitle>{t('goalkeeperMethodology.title', 'Metodología de Porteros')}</PageTitle>
          {!isEditable && <ReadOnlyBadge><MdLock size={12} /> {t('methodology.readOnly', 'Solo lectura')}</ReadOnlyBadge>}
        </Row>
      </PageHeader>

      <SelectorRow>
        <Chip $active={selectedId === 'recommended'} onClick={() => setSelectedId('recommended')}>
          ⭐ {t('methodology.recommended', 'Recomendada')}
        </Chip>
        {list.map((m) => (
          <Chip key={m._id} $active={selectedId === m._id} onClick={() => setSelectedId(m._id)}>{m.name}</Chip>
        ))}
        <Chip onClick={() => setCreateOpen(true)}><MdAdd /> {t('common.new', 'Nueva')}</Chip>
        {isEditable && <Chip onClick={handleDelete} style={{ color: '#ef4444', borderColor: '#ef4444' }}><MdDelete /> {t('common.delete', 'Eliminar')}</Chip>}
      </SelectorRow>

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

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      <EditDayModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        day={editTarget?.day}
        onSave={(day) => handleSaveDay(editTarget.planKey, editTarget.dayIndex, day)}
      />
    </Container>
  );
}
