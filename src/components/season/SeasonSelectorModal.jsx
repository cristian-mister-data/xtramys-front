import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Button } from '@/ui/primitives';
import { formatSeasonYear } from './seasonHelpers';

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Item = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) => $active ? '#eff6ff' : theme.colors.surface};
  cursor: pointer;
  text-align: left;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Year = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text};
`;

const Sub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Empty = styled.div`
  text-align: center;
  padding: 24px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
`;

const Footer = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
`;

export default function SeasonSelectorModal({
  open,
  onClose,
  seasons,
  currentSeason,
  onSelect,
  onCreateNew,
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t('season.selectSeason', 'Seleccionar Temporada')} width={520}>
      <List>
        {seasons && seasons.length > 0 ? (
          seasons.map((s) => {
            const active = currentSeason?._id === s._id;
            return (
              <Item key={s._id} $active={active} onClick={() => onSelect(s)}>
                <Info>
                  <Year $active={active}>{formatSeasonYear(s.año)}</Year>
                  <Sub>{s.nombre || t('season.season', 'Temporada')}</Sub>
                </Info>
                {active && <span style={{ color: '#2563eb' }}>✓</span>}
              </Item>
            );
          })
        ) : (
          <Empty>{t('season.noSeasonsAvailable', 'No hay temporadas disponibles')}</Empty>
        )}
      </List>
      <Footer>
        <Button onClick={onCreateNew}>+ {t('season.createNewSeason', 'Crear nueva temporada')}</Button>
      </Footer>
    </Modal>
  );
}
