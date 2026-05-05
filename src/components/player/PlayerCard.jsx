import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  getPositionColor,
  getPositionIcon,
  getPlayerFullName,
  getPlayerInitials,
  translatePosition,
} from './playerHelpers';

// ====== LIST CARD ======
const ListWrap = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  text-align: left;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  cursor: pointer;
  transition: transform 0.05s, box-shadow 0.15s;
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  @media (max-width: 600px) {
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
  }
`;

const Stripe = styled.div`
  width: 4px;
  align-self: stretch;
  border-radius: 2px;
  background: ${({ $colors }) => `linear-gradient(180deg, ${$colors[0]}, ${$colors[1]})`};
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $colors }) => `${$colors[0]}22`};
  color: ${({ $colors }) => $colors[1]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  overflow: hidden;
  flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }

  @media (max-width: 600px) {
    width: 42px;
    height: 42px;
    font-size: 14px;
  }
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;

  @media (max-width: 600px) {
    gap: 5px;
  }
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $bg, theme }) => $bg || theme.colors.backgroundAlt};
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 600px) {
    font-size: 10.5px;
    padding: 4px 7px;
    max-width: 100%;
  }
`;

// ====== GRID CARD ======
const GridWrap = styled.button`
  display: flex;
  flex-direction: column;
  width: 100%;
  text-align: left;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  transition: transform 0.05s, box-shadow 0.15s;
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const GridHeader = styled.div`
  height: 90px;
  background: ${({ $colors }) => `linear-gradient(135deg, ${$colors[0]}, ${$colors[1]})`};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  @media (max-width: 600px) {
    height: 76px;
  }
`;

const GridAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: ${({ $colors }) => $colors[1]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 22px;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.5);
  img { width: 100%; height: 100%; object-fit: cover; }

  @media (max-width: 600px) {
    width: 54px;
    height: 54px;
    font-size: 18px;
  }
`;

const GridBody = styled.div`
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 600px) {
    padding: 9px;
  }
`;

const GridName = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const GridStats = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

export default function PlayerCard({ player, viewMode = 'list', onClick }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = getPositionColor(player.posicion);
  const icon = getPositionIcon(player.posicion);
  const positionLabel = translatePosition(player.posicion, t);
  const isDark = theme.mode === 'dark';
  // Position tints adapted per theme: in dark mode use a stronger tint and the
  // lighter color shade for legible text; in light mode keep the soft tint.
  const posBg = isDark ? `${colors[0]}33` : `${colors[0]}22`;
  const posText = isDark ? colors[0] : colors[1];

  if (viewMode === 'grid') {
    return (
      <GridWrap onClick={onClick} type="button">
        <GridHeader $colors={colors}>
          <GridAvatar $colors={colors}>
            {player.foto ? <img src={player.foto} alt="" /> : getPlayerInitials(player)}
          </GridAvatar>
        </GridHeader>
        <GridBody>
          <GridName>{getPlayerFullName(player)}</GridName>
          <GridStats>
            <Tag $bg={theme.colors.primarySoft} $color={theme.colors.primarySoftText}>#{player.dorsal ?? '-'}</Tag>
            {player.edad ? <Tag>{player.edad} {t('player.yearsOld', 'años')}</Tag> : null}
          </GridStats>
          <Tag $bg={posBg} $color={posText}>{icon} {positionLabel}</Tag>
          {player.extra ? <Tag $bg={theme.colors.warningSoft} $color={theme.colors.warningSoftText}>⭐ {t('player.extra', 'Extra')}</Tag> : null}
        </GridBody>
      </GridWrap>
    );
  }

  return (
    <ListWrap onClick={onClick} type="button">
      <Stripe $colors={colors} />
      <Avatar $colors={colors}>
        {player.foto ? <img src={player.foto} alt="" /> : getPlayerInitials(player)}
      </Avatar>
      <Body>
        <Name>{getPlayerFullName(player)}</Name>
        <Tags>
          {player.extra ? <Tag $bg={theme.colors.warningSoft} $color={theme.colors.warningSoftText}>⭐ {t('player.extra', 'Extra')}</Tag> : null}
          <Tag $bg={posBg} $color={posText}>{icon} {positionLabel}</Tag>
          <Tag>👕 #{player.dorsal ?? '-'}</Tag>
          {player.edad ? <Tag $bg={theme.colors.warningSoft} $color={theme.colors.warningSoftText}>📅 {player.edad} {t('player.yearsOld', 'años')}</Tag> : null}
          {player.altura ? <Tag>📏 {player.altura} cm</Tag> : null}
        </Tags>
      </Body>
    </ListWrap>
  );
}
