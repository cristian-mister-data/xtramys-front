import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { MdDelete, MdClose, MdBarChart, MdEdit } from 'react-icons/md';
import { Button, Row, Muted } from '@/ui/primitives';
import {
  getPositionColor,
  getPositionIcon,
  getPlayerFullName,
  getPlayerInitials,
  translatePosition,
} from './playerHelpers';
import { cdnUrl } from '@/config';

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $colors }) => `linear-gradient(135deg, ${$colors[0]}, ${$colors[1]})`};
  color: #fff;
`;

const Avatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: ${({ $colors }) => $colors[1]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 26px;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.5);
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const HeaderName = styled.div`
  font-size: 18px;
  font-weight: 700;
`;

const HeaderSub = styled.div`
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.92;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 16px;
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); }
`;

const Stat = styled.div`
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const FooterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  flex: 1;
  gap: 12px;

  @media (max-width: 600px) {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 8px;
  }
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const FooterButton = styled(Button)`
  @media (max-width: 600px) {
    width: 100%;
    justify-content: center;
    padding: 12px;
    font-size: 14px;
    height: auto;
  }
`;

export default function PlayerDetailModal({ open, player, onClose, onEdit, onDelete, onViewProfile }) {
  const { t } = useTranslation();
  if (!player) return null;
  const colors = getPositionColor(player.posicion);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={getPlayerFullName(player)}
      width={560}
      footer={
        <FooterContainer>
          {onDelete && (
            <FooterButton type="button" $variant="danger" onClick={() => onDelete(player)}>
              <MdDelete size={16} />
              {t('edition.delete', 'Eliminar')}
            </FooterButton>
          )}
          <ActionsGroup>
            <FooterButton type="button" $variant="ghost" onClick={onClose}>
              <MdClose size={16} />
              {t('common.close', 'Cerrar')}
            </FooterButton>
            {onViewProfile ? (
              <FooterButton type="button" $variant="secondary" onClick={() => onViewProfile(player)}>
                <MdBarChart size={16} />
                {t('player.viewProfile', 'Ver perfil')}
              </FooterButton>
            ) : null}
            {onEdit && (
              <FooterButton type="button" onClick={() => onEdit(player)}>
                <MdEdit size={16} />
                {t('edition.edit', 'Editar')}
              </FooterButton>
            )}
          </ActionsGroup>
        </FooterContainer>
      }
    >
      <Header $colors={colors}>
        <Avatar $colors={colors}>
          {player.foto ? <img src={cdnUrl(player.foto)} alt="" /> : getPlayerInitials(player)}
        </Avatar>
        <div>
          <HeaderName>{getPlayerFullName(player)}</HeaderName>
          <HeaderSub>
            {getPositionIcon(player.posicion)} {translatePosition(player.posicion, t)}
            {player.extra ? ` · ⭐ ${t('player.extra', 'Extra')}` : ''}
          </HeaderSub>
        </div>
      </Header>

      <Stats>
        <Stat>
          <StatValue>#{player.dorsal ?? '-'}</StatValue>
          <StatLabel>{t('player.dorsal', 'Dorsal')}</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{player.edad ?? '-'}</StatValue>
          <StatLabel>{t('player.age', 'Edad')}</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{player.altura ? `${player.altura}` : '-'}</StatValue>
          <StatLabel>{t('player.height', 'Altura')} (cm)</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{player.sexo || '-'}</StatValue>
          <StatLabel>{t('player.sex', 'Sexo')}</StatLabel>
        </Stat>
        <Stat style={{ gridColumn: 'span 2' }}>
          <StatValue>
            {player.fechaNacimiento
              ? new Date(player.fechaNacimiento).toLocaleDateString(undefined, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  timeZone: 'UTC',
                })
              : '-'}
          </StatValue>
          <StatLabel>{t('player.birthDate', 'Fecha de nacimiento')}</StatLabel>
        </Stat>
        <Stat style={{ gridColumn: 'span 2' }}>
          <StatValue>
            {player.pierna === 'right'
              ? t('player.footRight', 'Derecha')
              : player.pierna === 'left'
                ? t('player.footLeft', 'Izquierda')
                : player.pierna === 'both'
                  ? t('player.footBoth', 'Ambidiestro')
                  : '-'}
          </StatValue>
          <StatLabel>{t('player.preferredFoot', 'Pierna')}</StatLabel>
        </Stat>
      </Stats>

      <Muted style={{ display: 'block', marginTop: 16, fontSize: 12 }}>

      </Muted>
    </Modal>
  );
}
