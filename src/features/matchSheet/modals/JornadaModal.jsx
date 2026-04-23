import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  @media (max-width: 480px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Cell = styled.button`
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ $active, theme }) => $active ? theme.colors.onPrimary : theme.colors.text};
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ $active, theme }) => $active ? theme.colors.primaryHover : theme.colors.primarySoft};
    color: ${({ $active, theme }) => $active ? theme.colors.onPrimary : theme.colors.primarySoftText};
  }
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

export default function JornadaModal({ open, onClose, value, onChange, max = 40 }) {
  const { t } = useTranslation();
  const cells = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <Modal open={open} onClose={onClose} title={t('matchSheet.selectMatchday', 'Selecciona jornada')} width={420}>
      <Grid>
        {cells.map((n) => (
          <Cell
            key={n}
            type="button"
            $active={value === n}
            onClick={() => {
              onChange?.(n);
              onClose?.();
            }}
          >
            {n}
          </Cell>
        ))}
      </Grid>
    </Modal>
  );
}
