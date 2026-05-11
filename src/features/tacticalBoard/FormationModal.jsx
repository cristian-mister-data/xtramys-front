import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Button, Field, Label, Row } from '@/ui/primitives';
import { FORMATION_NAMES } from './formations';
import { MdOutlineSportsSoccer } from 'react-icons/md';

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const FormationList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 10px;
`;

const FormationBtn = styled.button`
  padding: 10px;
  border: 2px solid ${({ $sel, theme }) => ($sel ? theme.colors.primary : theme.colors.border)};
  background: ${({ $sel, theme }) => ($sel ? (theme.mode === 'dark' ? 'rgba(96,165,250,0.15)' : '#eff6ff') : theme.colors.surface)};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(96,165,250,0.1)' : '#f1f5f9')};
  }
`;

export default function FormationModal({ open, onClose, onApply, defaultCount = 11 }) {
  const { t } = useTranslation();
  const [count, setCount] = useState(defaultCount);
  const [formation, setFormation] = useState(null);
  const [target, setTarget] = useState('home');

  const names = FORMATION_NAMES[count] || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('tacticalBoard.applyFormation', 'Aplicar formación')}
      width={560}
      footer={
        <Row style={{ justifyContent: 'flex-end', width: '100%', gap: 8 }}>
          <Button type="button" $variant="ghost" onClick={onClose}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button
            type="button"
            disabled={!formation}
            onClick={() => {
              if (formation) {
                onApply?.({ count, name: formation, target });
                onClose?.();
              }
            }}
          >
            {t('common.apply', 'Aplicar')}
          </Button>
        </Row>
      }
    >
      <Row $gap={12} $wrap>
        <Field>
          <Label>{t('tacticalBoard.modality', 'Modalidad')}</Label>
          <Select value={count} onChange={(e) => { setCount(Number(e.target.value)); setFormation(null); }}>
            <option value={11}>F11</option>
            <option value={8}>F8</option>
            <option value={7}>F7</option>
          </Select>
        </Field>
        <Field>
          <Label>{t('tacticalBoard.team', 'Equipo')}</Label>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="home">{t('tacticalBoard.home', 'Local')}</option>
            <option value="away">{t('tacticalBoard.away', 'Rival')}</option>
          </Select>
        </Field>
      </Row>

      <FormationList>
        {names.map((n) => (
          <FormationBtn
            key={n}
            type="button"
            $sel={n === formation}
            onClick={() => setFormation(n)}
          >
            <MdOutlineSportsSoccer size={20} />
            {n}
          </FormationBtn>
        ))}
      </FormationList>
    </Modal>
  );
}
