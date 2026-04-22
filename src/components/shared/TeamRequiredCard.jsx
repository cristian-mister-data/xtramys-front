import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Card, Muted } from '@/ui/primitives';

const Wrap = styled(Card)`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 24px;
`;

const Cta = styled(Link)`
  display: inline-block;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  &:hover { background: ${({ theme }) => theme.colors.primaryLight}; }
`;

export default function TeamRequiredCard({ message }) {
  const { t } = useTranslation();
  return (
    <Wrap>
      <div style={{ fontSize: 36 }}>⚽</div>
      <strong>{t('common.noSelectedTeam', 'No tienes equipo seleccionado')}</strong>
      <Muted>
        {message || t('common.selectTeamFirst', 'Ve a Temporada y selecciona o crea un equipo para empezar.')}
      </Muted>
      <Cta to="/season">{t('menu.season', 'Ir a Temporada')}</Cta>
    </Wrap>
  );
}
