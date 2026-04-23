import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Stack } from '@/ui/primitives';

const Option = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  text-align: left;
  &:hover { background: ${({ theme }) => theme.colors.background}; transform: translateY(-1px); }
`;

const Icon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $tone, theme }) =>
    theme.colors[$tone === 'success' ? 'successSoft' : 'infoSoft']};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const Body = styled.div`
  flex: 1;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
`;

const Sub = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

export default function AddEventModal({ open, onClose, onPickMatch, onPickSession }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t('season.newEvent', '¿Qué quieres añadir?')} width={460}>
      <Stack style={{ gap: 10 }}>
        <Option type="button" onClick={onPickMatch}>
          <Icon $tone="info">⚽</Icon>
          <Body>
            <Title>{t('matchSheet.create', 'Nuevo partido')}</Title>
            <Sub>{t('matchSheet.createSub', 'Programa un partido amistoso o de competición')}</Sub>
          </Body>
        </Option>
        <Option type="button" onClick={onPickSession}>
          <Icon $tone="success">🏃</Icon>
          <Body>
            <Title>{t('session.create', 'Nuevo entrenamiento')}</Title>
            <Sub>{t('session.createSub', 'Planifica una sesión de entrenamiento')}</Sub>
          </Body>
        </Option>
      </Stack>
    </Modal>
  );
}
