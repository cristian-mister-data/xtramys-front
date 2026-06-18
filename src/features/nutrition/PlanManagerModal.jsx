// Modal de gestión de planes de nutrición personalizados.
// Lista los planes existentes con acciones: seleccionar / editar / duplicar / eliminar.
// También ofrece crear un plan a partir del recomendado o desde cero.
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  MdCheckCircle,
  MdEdit,
  MdContentCopy,
  MdDelete,
  MdAdd,
  MdLayers,
  MdAutoAwesome,
} from 'react-icons/md';
import Modal, { FORM_MODAL_WIDTH } from '../../ui/Modal';
import { Button, Stack, Row, Muted } from '../../ui/primitives';

const ModeRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  width: 100%;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? `${theme.colors.primary}10` : theme.colors.surface)};
  cursor: pointer;
  text-align: left;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Name = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Actions = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
`;

const IconBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 6px 8px;
  cursor: pointer;
  color: ${({ $danger, theme }) => ($danger ? theme.colors.error : theme.colors.text)};
  display: inline-flex;
  align-items: center;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Divider = styled.div`
  border-top: 1px dashed ${({ theme }) => theme.colors.border};
  margin: 8px 0;
`;

export default function PlanManagerModal({
  open,
  onClose,
  plans,
  selectedPlanId,
  viewMode,
  onSelectRecommended,
  onSelectPlan,
  onEditPlan,
  onDuplicatePlan,
  onDeletePlan,
  onCreateFromRecommended,
  onCreateEmpty,
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('nutrition.modeSelector.title', 'Mis planes de nutrición')}
      width={FORM_MODAL_WIDTH}
    >
      <Stack $gap={8}>
        <ModeRow $active={viewMode === 'recommended'} onClick={onSelectRecommended}>
          <MdAutoAwesome size={22} color="#3949ab" />
          <div>
            <Name>{t('nutrition.modeSelector.recommended', 'Plan recomendado')}</Name>
            <Muted>{t('nutrition.modeSelector.recommendedHint', 'Plantillas predefinidas')}</Muted>
          </div>
          {viewMode === 'recommended' && <MdCheckCircle size={22} color="#10b981" style={{ marginLeft: 'auto' }} />}
        </ModeRow>

        {plans.length > 0 && <Divider />}

        {plans.map((p) => {
          const active = viewMode === 'custom' && selectedPlanId === p._id;
          return (
            <ModeRow key={p._id} $active={active} onClick={() => onSelectPlan(p._id)}>
              <MdLayers size={22} color="#1a237e" />
              <div>
                <Name>{p.name || t('nutrition.titles.myNutritionalPlan')}</Name>
                <Muted>{t('nutrition.modeSelector.customHint', 'Personalizado')}</Muted>
              </div>
              <Actions onClick={(e) => e.stopPropagation()}>
                <IconBtn title={t('common.edit', 'Editar')} onClick={() => onEditPlan(p)}>
                  <MdEdit size={16} />
                </IconBtn>
                <IconBtn title={t('common.duplicate', 'Duplicar')} onClick={() => onDuplicatePlan(p)}>
                  <MdContentCopy size={16} />
                </IconBtn>
                <IconBtn $danger title={t('common.delete', 'Eliminar')} onClick={() => onDeletePlan(p)}>
                  <MdDelete size={16} />
                </IconBtn>
              </Actions>
              {active && <MdCheckCircle size={22} color="#10b981" style={{ marginLeft: 8 }} />}
            </ModeRow>
          );
        })}

        <Divider />

        <Row $gap={8} $wrap>
          <Button onClick={onCreateFromRecommended}>
            <MdAdd size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t('nutrition.modeSelector.createFromRecommended', 'Crear desde recomendado')}
          </Button>
          <Button $variant="secondary" onClick={onCreateEmpty}>
            <MdAdd size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t('nutrition.modeSelector.createEmpty', 'Crear plan vacío')}
          </Button>
        </Row>
      </Stack>
    </Modal>
  );
}
