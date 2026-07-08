import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaWhatsapp } from 'react-icons/fa';
import { MdContentCopy, MdGroups, MdOpenInNew } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Button, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';

export const XTRAMYS_COMMUNITY_URL = 'https://chat.whatsapp.com/GWeYRmBJ7pP4VzkR4ZKhax';

const seenKey = (userId) => `xtramys.communityInvite.seen.${userId || 'anonymous'}`;

const InvitePanel = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: start;
  padding: ${({ $compact }) => ($compact ? '18px' : '4px')};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ $compact, theme }) => ($compact ? theme.colors.surfaceAlt : 'transparent')};
  border: ${({ $compact, theme }) => ($compact ? `1px solid ${theme.colors.border}` : '0')};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const IconBox = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #075e54;
  box-shadow: 0 10px 22px rgba(7, 94, 84, 0.24);
`;

const Content = styled.div`
  min-width: 0;
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.successSoftText};
  background: ${({ theme }) => theme.colors.successSoft};
  border-radius: ${({ theme }) => theme.radius.full};
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
`;

const Title = styled.h3`
  margin: 0 0 6px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ $compact }) => ($compact ? '16px' : '20px')};
  line-height: 1.25;
`;

const Text = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.55;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;

  > a,
  > button {
    min-height: 42px;
  }

  @media (max-width: 600px) {
    > a,
    > button {
      flex: 1 1 180px;
    }
  }
`;

const PrimaryLink = styled(Button).attrs({ as: 'a' })`
  text-decoration: none;
  background: #075e54;
  color: #ffffff;

  &:hover {
    background: #064e46;
    text-decoration: none;
  }
`;

const LinkText = styled(Muted)`
  display: block;
  margin-top: 12px;
  word-break: break-all;
`;

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}

export function XtramysCommunityCard({ compact = false }) {
  const { t } = useTranslation();

  const handleCopy = async () => {
    try {
      await copyText(XTRAMYS_COMMUNITY_URL);
      toast.success(t('community.copySuccess', 'Enlace copiado'));
    } catch (error) {
      toast.error(t('community.copyError', 'No se pudo copiar el enlace'));
    }
  };

  return (
    <InvitePanel $compact={compact}>
      <IconBox aria-hidden="true">
        <FaWhatsapp size={30} />
      </IconBox>
      <Content>
        <Eyebrow><MdGroups size={16} /> {t('community.eyebrow', 'Comunidad Xtramys')}</Eyebrow>
        <Title $compact={compact}>{t('community.title', 'Unete a la comunidad de Xtramys')}</Title>
        <Text>
          {t('community.description', 'Comparte dudas, mejoras y experiencias con otros entrenadores que usan Xtramys.')}
        </Text>
        <Actions>
          <PrimaryLink
            href={XTRAMYS_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('community.joinAria', 'Abrir la comunidad de Xtramys en WhatsApp')}
          >
            <FaWhatsapp size={18} />
            {t('community.join', 'Unirme')}
            <MdOpenInNew size={16} aria-hidden="true" />
          </PrimaryLink>
          <Button type="button" $variant="secondary" onClick={handleCopy}>
            <MdContentCopy size={18} />
            {t('community.copy', 'Copiar enlace')}
          </Button>
        </Actions>
        {!compact ? <LinkText>{XTRAMYS_COMMUNITY_URL}</LinkText> : null}
      </Content>
    </InvitePanel>
  );
}

export default function XtramysCommunityInvite({ userId }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      if (!window.localStorage.getItem(seenKey(userId))) setOpen(true);
    } catch (error) {
      setOpen(true);
    }
  }, [userId]);

  const close = () => {
    try {
      window.localStorage.setItem(seenKey(userId), 'true');
    } catch (error) {
      // ponytail: localStorage can fail in private mode; the profile card still exposes the link.
    }
    setOpen(false);
  };

  if (!userId) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('community.modalTitle', 'Comunidad Xtramys')}
      width={560}
      footer={
        <Button type="button" $variant="ghost" onClick={close}>
          {t('community.close', 'Cerrar')}
        </Button>
      }
    >
      <XtramysCommunityCard />
    </Modal>
  );
}
