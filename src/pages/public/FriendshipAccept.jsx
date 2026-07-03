import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { acceptFriendRequestByToken } from '@/api/notification';

const Shell = styled.main`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.colors.background};
`;
const Card = styled.section`
  max-width: 460px;
  width: 100%;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 24px;
  text-align: center;
`;

export default function FriendshipAccept() {
  const { t } = useTranslation();
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    acceptFriendRequestByToken(token).then(() => setStatus('ok')).catch(() => setStatus('error'));
  }, [token]);
  return (
    <Shell>
      <Card>
        <h1>{status === 'ok' ? t('friends.friendAcceptedTitle') : status === 'error' ? t('friends.friendAcceptError') : t('common.loading', 'Cargando...')}</h1>
        <p>{status === 'ok' ? t('friends.friendAcceptedDesc') : status === 'error' ? t('friends.tokenExpired') : ''}</p>
        <Link to="/app">{t('notifications.viewContent')}</Link>
      </Card>
    </Shell>
  );
}
