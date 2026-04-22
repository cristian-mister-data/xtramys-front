import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Button, Field, Input, Label, Row, Stack, ErrorText, Muted } from '@/ui/primitives';

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Badge = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BadgeImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
`;

const Name = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const Cat = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 13px;
`;

const StatLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Warn = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 13px;
`;

export default function TeamDetailModal({
  open,
  onClose,
  team,
  onEdit,
  onDelete,
  deleting,
}) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

  if (!team) return null;

  const handleConfirm = () => {
    if (text.trim() !== (team.nombre || '').trim()) {
      setError(t('team.deleteConfirmationMismatch', 'El nombre no coincide'));
      return;
    }
    setError(null);
    onDelete();
  };

  const close = () => {
    setConfirmOpen(false);
    setText('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('season.teamDetails', 'Detalles del equipo')}
      width={520}
    >
      <Stack $gap={16}>
        <Header>
          <Badge>
            {team.escudo ? <BadgeImg src={team.escudo} alt="escudo" /> : '⚽'}
          </Badge>
          <Info>
            <Name>{team.nombre}</Name>
            <Cat>{team.categoriaCustom || team.categoria || team.categoriaKey}</Cat>
          </Info>
        </Header>

        <Row $gap={8} $wrap>
          <Stat style={{ flex: 1 }}>
            <StatLabel>{t('team.timePerHalf', 'Tiempo por parte')}</StatLabel>
            <strong>{team.tiempoPorParte || 45} min</strong>
          </Stat>
          <Stat style={{ flex: 1 }}>
            <StatLabel>{t('team.playersPerTeam', 'Jugadores')}</StatLabel>
            <strong>{team.jugadoresPorEquipo || 11}</strong>
          </Stat>
        </Row>

        {!confirmOpen ? (
          <Row $gap={8} style={{ justifyContent: 'space-between' }}>
            <Button $variant="danger" onClick={() => setConfirmOpen(true)}>
              {t('team.delete', 'Eliminar equipo')}
            </Button>
            <Row $gap={8}>
              <Button $variant="secondary" onClick={close}>
                {t('common.close', 'Cerrar')}
              </Button>
              <Button onClick={onEdit}>{t('team.editTeam', 'Editar')}</Button>
            </Row>
          </Row>
        ) : (
          <Stack $gap={10}>
            <Warn>
              <strong>{t('team.deleteWarningTitle', '¿Eliminar definitivamente?')}</strong>
              <div style={{ marginTop: 6 }}>
                {t('team.deleteWarningMessage', 'Esta acción eliminará permanentemente el equipo y todos sus datos asociados.')}
              </div>
            </Warn>
            <Field>
              <Label>
                {t('team.deleteConfirmationLabel', 'Escribe el nombre del equipo para confirmar')}
              </Label>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={team.nombre}
              />
              <Muted>{team.nombre}</Muted>
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <Row $gap={8} style={{ justifyContent: 'flex-end' }}>
              <Button
                $variant="secondary"
                onClick={() => { setConfirmOpen(false); setText(''); setError(null); }}
                disabled={deleting}
              >
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button
                $variant="danger"
                onClick={handleConfirm}
                disabled={deleting || !text}
              >
                {deleting ? '...' : t('team.deleteConfirm', 'Eliminar')}
              </Button>
            </Row>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
