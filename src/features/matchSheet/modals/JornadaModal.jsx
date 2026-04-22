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
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active }) => ($active ? '#1a237e' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : 'inherit')};
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  &:hover { border-color: #1a237e; }
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
