import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { tournamentTypeInfo, formatDateShort } from './tournamentHelpers';

const Card = styled.button`
  display: flex;
  width: 100%;
  text-align: left;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  transition: transform 0.05s, box-shadow 0.15s;
  &:hover { transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows.md}; }
`;

const Stripe = styled.div`
  width: 6px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const Body = styled.div`
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TypeIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $color }) => `${$color}22`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const Type = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const Badge = styled.span`
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ $active }) => $active ? '#dcfce7' : '#f1f5f9'};
  color: ${({ $active }) => $active ? '#166534' : '#475569'};
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Desc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export default function TournamentCard({ tournament, matchCount = 0, onClick }) {
  const { t, i18n } = useTranslation();
  const tipo = tournamentTypeInfo(tournament.tipo);
  const color = tournament.color || tipo.color;
  const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';

  return (
    <Card onClick={onClick} type="button">
      <Stripe $color={color} />
      <Body>
        <Top>
          <TypeIcon $color={color}>{tipo.icon}</TypeIcon>
          <Info>
            <Name>{tournament.nombre}</Name>
            <Type>{t(tipo.labelKey, tipo.value)}</Type>
          </Info>
          <Badge $active={tournament.estado === 'activo'}>
            {tournament.estado === 'activo'
              ? t('tournaments.active', 'Activo')
              : t('tournaments.finished', 'Finalizado')}
          </Badge>
        </Top>
        <Meta>
          {(tournament.fechaInicio || tournament.fechaFin) && (
            <span>
              📅 {formatDateShort(tournament.fechaInicio, locale)}
              {tournament.fechaInicio && tournament.fechaFin ? ' → ' : ''}
              {formatDateShort(tournament.fechaFin, locale)}
            </span>
          )}
          <span>
            ⚽ {matchCount}{' '}
            {matchCount === 1
              ? t('tournaments.match', 'partido')
              : t('tournaments.matches', 'partidos')}
          </span>
        </Meta>
        {tournament.descripcion ? <Desc>{tournament.descripcion}</Desc> : null}
      </Body>
    </Card>
  );
}
